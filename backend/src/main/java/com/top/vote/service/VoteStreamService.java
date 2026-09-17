package com.top.vote.service;

import com.top.poll.domain.Poll;
import com.top.poll.domain.PollPhase;
import com.top.poll.repository.PollRepository;
import com.top.vote.dto.PollResultsResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.io.IOException;
import java.time.Instant;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.CopyOnWriteArrayList;

@Service
@RequiredArgsConstructor
public class VoteStreamService {
	private final PollRepository pollRepository;
	private final VoteResultService voteResultService;
	private final ConcurrentHashMap<Long, CopyOnWriteArrayList<Subscription>> subscriptions = new ConcurrentHashMap<>();

	public SseEmitter subscribe(long pollId, String voterKey) {
		Poll poll = pollRepository.findById(pollId).orElseThrow();
		SseEmitter emitter = new SseEmitter(30 * 60 * 1000L);
		Subscription subscription = new Subscription(emitter, voterKey);
		subscriptions.computeIfAbsent(pollId, ignored -> new CopyOnWriteArrayList<>()).add(subscription);

		Runnable remove = () -> subscriptions.getOrDefault(pollId, new CopyOnWriteArrayList<>()).remove(subscription);
		emitter.onCompletion(remove);
		emitter.onTimeout(remove);
		emitter.onError(error -> remove.run());

		try {
			PollPhase phase = PollPhase.at(poll, Instant.now());
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

	public void publishAfterCommit(long pollId) {
		subscriptions.getOrDefault(pollId, new CopyOnWriteArrayList<>()).forEach(subscription -> {
			try {
				PollResultsResponse result = voteResultService.findResults(pollId, subscription.voterKey());
				if (result.phase() == PollPhase.RESULTS_HIDDEN) {
					sendPhase(subscription.emitter(), result.phase());
				} else if (result.results() != null) {
					sendResult(subscription.emitter(), result);
				}
			} catch (Exception exception) {
				subscription.emitter().completeWithError(exception);
			}
		});
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

	private record Subscription(SseEmitter emitter, String voterKey) {
	}

	private record PhaseChanged(PollPhase phase) {
	}
}
