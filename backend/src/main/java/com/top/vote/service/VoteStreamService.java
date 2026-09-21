package com.top.vote.service;

import com.top.poll.domain.Poll;
import com.top.poll.domain.PollPhase;
import com.top.poll.repository.PollRepository;
import com.top.vote.dto.PollResultsResponse;
import lombok.RequiredArgsConstructor;
import io.micrometer.core.instrument.Gauge;
import io.micrometer.core.instrument.MeterRegistry;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.io.IOException;
import java.time.Instant;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.CopyOnWriteArrayList;

@Service
@RequiredArgsConstructor
public class VoteStreamService {
	/** How often {@link #checkPhaseTransitions()} re-checks each subscribed poll's phase. */
	private static final long PHASE_CHECK_INTERVAL_MS = 15_000L;

	private final PollRepository pollRepository;
	private final VoteResultService voteResultService;
	private final ConcurrentHashMap<Long, CopyOnWriteArrayList<Subscription>> subscriptions = new ConcurrentHashMap<>();
	private final ConcurrentHashMap.KeySetView<Long, Boolean> pendingBroadcasts = ConcurrentHashMap.newKeySet();
	/** Last phase broadcast to a poll's subscribers, used by {@link #checkPhaseTransitions()} to detect a crossing. */
	private final ConcurrentHashMap<Long, PollPhase> lastKnownPhase = new ConcurrentHashMap<>();

	@Autowired
	void registerMetrics(MeterRegistry meterRegistry) {
		Gauge.builder("top.sse.connections.active", this, VoteStreamService::activeConnectionCount)
				.description("Current live SSE subscriptions")
				.register(meterRegistry);
	}

	double activeConnectionCount() {
		return subscriptions.values().stream().mapToInt(CopyOnWriteArrayList::size).sum();
	}

	public SseEmitter subscribe(long pollId, String voterKey) {
		Poll poll = pollRepository.findById(pollId).orElseThrow();
		SseEmitter emitter = new SseEmitter(30 * 60 * 1000L);
		Subscription subscription = new Subscription(emitter, voterKey, System.nanoTime());
		subscriptions.computeIfAbsent(pollId, ignored -> new CopyOnWriteArrayList<>()).add(subscription);

		Runnable remove = () -> subscriptions.getOrDefault(pollId, new CopyOnWriteArrayList<>()).remove(subscription);
		emitter.onCompletion(remove);
		emitter.onTimeout(remove);
		emitter.onError(error -> remove.run());

		PollPhase phase = PollPhase.at(poll, Instant.now());
		// Seed the baseline phase this poll is subscribed at, so the periodic
		// sweep below only reacts to phases that change *after* this point.
		lastKnownPhase.putIfAbsent(pollId, phase);

		try {
			if (phase == PollPhase.RESULTS_HIDDEN) {
				sendPhase(emitter, phase);
			} else {
				sendResult(emitter, pollId, voterKey);
			}
		} catch (IOException exception) {
			emitter.completeWithError(exception);
		}
		return emitter;
	}

	/**
	 * Notifies every subscriber of {@code pollId} about the vote that was just
	 * committed. Only marks the poll dirty: a short scheduled sweep coalesces a
	 * burst of votes into one latest-result broadcast, so the HTTP response never
	 * waits for fan-out and the executor cannot be flooded with redundant work.
	 */
	public void publishAfterCommit(long pollId) {
		pendingBroadcasts.add(pollId);
	}

	@Scheduled(fixedDelay = 100L)
	public void flushPendingBroadcasts() {
		for (Long pollId : pendingBroadcasts) {
			if (!pendingBroadcasts.remove(pollId)) {
				continue;
			}
			PollPhase phase = currentPhaseOrNull(pollId);
			if (phase != null) {
				lastKnownPhase.put(pollId, phase);
			}
			broadcast(pollId);
		}
	}

	/**
	 * Periodically checks every poll with at least one live SSE subscriber for
	 * a phase boundary crossing that no vote happened to trigger.
	 * {@link #publishAfterCommit} only fires when a vote is cast, so a poll
	 * that crosses the T-30 "hide results" boundary (or closes) while nobody
	 * is actively voting never told already-connected clients: they kept
	 * showing stale numbers until either someone else voted or their 5-second
	 * polling fallback happened to catch up. This sweep detects the phase
	 * change itself -- independent of voting activity -- and broadcasts it.
	 *
	 * A periodic sweep (rather than scheduling a one-shot task per poll at
	 * creation/start time) is used deliberately: it needs no bookkeeping to
	 * survive an application restart, since it simply re-derives each
	 * subscribed poll's current phase from its stored start/end time on every
	 * tick instead of relying on a timer that was registered in memory.
	 */
	@Scheduled(fixedDelay = PHASE_CHECK_INTERVAL_MS)
	public void checkPhaseTransitions() {
		for (Long pollId : subscriptions.keySet()) {
			CopyOnWriteArrayList<Subscription> subscribers = subscriptions.get(pollId);
			if (subscribers == null || subscribers.isEmpty()) {
				subscriptions.remove(pollId, subscribers);
				lastKnownPhase.remove(pollId);
				continue;
			}
			for (Subscription subscription : subscribers) {
				if (System.nanoTime() - subscription.connectedAtNanos()
						< TimeUnit.MILLISECONDS.toNanos(PHASE_CHECK_INTERVAL_MS)) {
					continue;
				}
				try {
					subscription.emitter().send(SseEmitter.event().comment("keepalive"));
				} catch (IOException exception) {
					subscription.emitter().completeWithError(exception);
					subscribers.remove(subscription);
				}
			}

			PollPhase phase = currentPhaseOrNull(pollId);
			if (phase == null) {
				continue;
			}
			PollPhase previous = lastKnownPhase.put(pollId, phase);
			if (previous != phase) {
				broadcast(pollId);
			}
		}
	}

	private PollPhase currentPhaseOrNull(long pollId) {
		return pollRepository.findById(pollId)
				.map(poll -> PollPhase.at(poll, Instant.now()))
				.orElse(null);
	}

	private void broadcast(long pollId) {
		CopyOnWriteArrayList<Subscription> subscribers = subscriptions.get(pollId);
		if (subscribers == null || subscribers.isEmpty()) {
			return;
		}

		VoteResultService.ResultSnapshot snapshot = voteResultService.loadSnapshot(pollId);
		for (Subscription subscription : subscribers) {
			try {
				if (snapshot.phase() == PollPhase.RESULTS_HIDDEN) {
					sendPhase(subscription.emitter(), snapshot.phase());
					continue;
				}
				PollResultsResponse result = voteResultService.toResponse(snapshot, subscription.voterKey());
				if (result.results() != null) {
					sendResult(subscription.emitter(), result);
				}
			} catch (Exception exception) {
				subscription.emitter().completeWithError(exception);
			}
		}
	}

	private void sendResult(SseEmitter emitter, long pollId, String voterKey) throws IOException {
		sendResult(emitter, voteResultService.findResults(pollId, voterKey));
	}

	private void sendResult(SseEmitter emitter, PollResultsResponse result) throws IOException {
		emitter.send(SseEmitter.event().name("vote-result").data(result));
	}

	private void sendPhase(SseEmitter emitter, PollPhase phase) throws IOException {
		emitter.send(SseEmitter.event().name("phase-changed").data(new PhaseChanged(phase)));
	}

	private record Subscription(SseEmitter emitter, String voterKey, long connectedAtNanos) {
	}

	private record PhaseChanged(PollPhase phase) {
	}
}
