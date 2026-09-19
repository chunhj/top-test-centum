package com.top.vote;

import com.top.poll.domain.Poll;
import com.top.poll.domain.PollPhase;
import com.top.poll.domain.PollStatus;
import com.top.poll.repository.PollRepository;
import com.top.vote.dto.PollResultsResponse;
import com.top.vote.service.VoteResultService;
import com.top.vote.service.VoteStreamService;
import org.junit.jupiter.api.Test;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * Covers the fix for VoteStreamService.publishAfterCommit(): it used to call
 * voteResultService.findResults(pollId, voterKey) once per connected
 * subscriber, so one vote triggered as many "poll lookup + counter
 * aggregation" DB round trips as there were live SSE connections on that
 * poll. It now loads the shared (subscriber-independent) parts exactly once
 * via loadSnapshot() and only repeats the cheap per-subscriber "has this
 * voter voted" check.
 */
class VoteStreamFanOutTest {
	private PollRepository pollRepository;
	private VoteResultService voteResultService;
	private VoteStreamService streamService;

	private void setUp(PollPhase phase) {
		pollRepository = mock(PollRepository.class);
		voteResultService = mock(VoteResultService.class);
		streamService = new VoteStreamService(pollRepository, voteResultService);

		Poll poll = poll();
		when(pollRepository.findById(1L)).thenReturn(Optional.of(poll));

		VoteResultService.ResultSnapshot snapshot = new VoteResultService.ResultSnapshot(
				1L, phase, 5L,
				phase == PollPhase.RESULTS_HIDDEN ? null : List.of(new PollResultsResponse.OptionResult(1L, 5L, null)));
		when(voteResultService.loadSnapshot(1L)).thenReturn(snapshot);
		when(voteResultService.toResponse(eq(snapshot), anyString())).thenAnswer(invocation -> {
			String voterKey = invocation.getArgument(1);
			boolean voted = !"unvoted".equals(voterKey);
			return new PollResultsResponse(1L, phase, voted, 5L,
					voted && phase != PollPhase.RESULTS_HIDDEN ? snapshot.optionResults() : null);
		});
		// subscribe()'s own initial push also calls findResults(); stub it so
		// subscribing doesn't blow up, but it is irrelevant to this test.
		when(voteResultService.findResults(anyLong(), anyString()))
				.thenReturn(new PollResultsResponse(1L, phase, false, 5L, null));
	}

	@Test
	void loadsTheSharedSnapshotOnceRegardlessOfSubscriberCount() {
		setUp(PollPhase.LIVE_VISIBLE);
		subscribeSilently("voter-1");
		subscribeSilently("voter-2");
		subscribeSilently("voter-3");

		streamService.publishAfterCommit(1L);

		verify(voteResultService, times(1)).loadSnapshot(1L);
		verify(voteResultService, times(3)).toResponse(org.mockito.ArgumentMatchers.any(), anyString());
	}

	@Test
	void skipsTheSnapshotEntirelyWhenNobodyIsSubscribed() {
		setUp(PollPhase.LIVE_VISIBLE);

		streamService.publishAfterCommit(1L);

		verify(voteResultService, times(0)).loadSnapshot(anyLong());
	}

	@Test
	void broadcastsPhaseChangedOnceEachWithoutTouchingCountersWhenResultsAreHidden() {
		setUp(PollPhase.RESULTS_HIDDEN);
		subscribeSilently("voter-1");
		subscribeSilently("voter-2");

		streamService.publishAfterCommit(1L);

		verify(voteResultService, times(1)).loadSnapshot(1L);
		verify(voteResultService, times(0)).toResponse(org.mockito.ArgumentMatchers.any(), anyString());
	}

	private void subscribeSilently(String voterKey) {
		SseEmitter emitter = streamService.subscribe(1L, voterKey);
		assertEquals(true, emitter != null);
	}

	private Poll poll() {
		Poll poll = mock(Poll.class);
		when(poll.getStatus()).thenReturn(PollStatus.OPEN);
		when(poll.getStartsAt()).thenReturn(Instant.now().minus(1, ChronoUnit.HOURS));
		when(poll.getEndsAt()).thenReturn(Instant.now().plus(1, ChronoUnit.HOURS));
		return poll;
	}
}
