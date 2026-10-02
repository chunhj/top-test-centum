package com.top.vote;

import com.top.poll.domain.Poll;
import com.top.poll.domain.PollPhase;
import com.top.poll.domain.PollStatus;
import com.top.poll.repository.PollRepository;
import com.top.vote.dto.PollResultsResponse;
import com.top.vote.service.VoteResultService;
import com.top.vote.service.VoteStreamService;
import org.junit.jupiter.api.Test;

import java.time.Instant;
import java.util.Optional;

import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * Covers the fix for the missing "T-30 boundary" notification: previously
 * VoteStreamService only ever broadcast on a vote (publishAfterCommit), so a
 * poll that crossed the results-hiding boundary (or closed) while nobody
 * happened to be voting never told its already-connected SSE subscribers --
 * they kept seeing stale numbers. checkPhaseTransitions() now periodically
 * re-derives each subscribed poll's phase and broadcasts when it changes.
 */
class VoteStreamPhaseSweepTest {
	@Test
	void broadcastsWhenASubscribedPollCrossesIntoResultsHiddenWithoutAVote() {
		PollRepository pollRepository = mock(PollRepository.class);
		VoteResultService voteResultService = mock(VoteResultService.class);
		VoteStreamService streamService = new VoteStreamService(pollRepository, voteResultService);

		// First lookup (from subscribe()) sees a poll well inside the
		// "numbers visible" window; the second lookup (from the sweep) sees
		// the same poll now inside the T-30 "hide numbers" window.
		Poll beforeBoundary = pollWindow(-60, 90);
		Poll afterBoundary = pollWindow(-60, 10);
		// Chained thenReturn (same consecutive-stubbing behaviour) instead of the varargs overload,
		// which creates a generic Optional<Poll>[] and triggers an unchecked warning.
		when(pollRepository.findById(1L)).thenReturn(Optional.of(beforeBoundary)).thenReturn(Optional.of(afterBoundary));
		when(voteResultService.findResults(anyLong(), anyString()))
				.thenReturn(new PollResultsResponse(1L, PollPhase.LIVE_VISIBLE, false, 0L, null));
		when(voteResultService.loadSnapshot(1L))
				.thenReturn(new VoteResultService.ResultSnapshot(1L, PollPhase.RESULTS_HIDDEN, 0L, null));

		streamService.subscribe(1L, "voter-1");
		streamService.checkPhaseTransitions();

		verify(voteResultService, times(1)).loadSnapshot(1L);
	}

	@Test
	void doesNotBroadcastWhenTheSubscribedPollsPhaseHasNotChanged() {
		PollRepository pollRepository = mock(PollRepository.class);
		VoteResultService voteResultService = mock(VoteResultService.class);
		VoteStreamService streamService = new VoteStreamService(pollRepository, voteResultService);

		// Same LIVE_VISIBLE window on every lookup: nothing has changed.
		Poll unchanged = pollWindow(-60, 90);
		when(pollRepository.findById(1L)).thenReturn(Optional.of(unchanged));
		when(voteResultService.findResults(anyLong(), anyString()))
				.thenReturn(new PollResultsResponse(1L, PollPhase.LIVE_VISIBLE, false, 0L, null));

		streamService.subscribe(1L, "voter-1");
		streamService.checkPhaseTransitions();
		streamService.checkPhaseTransitions();

		verify(voteResultService, never()).loadSnapshot(anyLong());
	}

	private Poll pollWindow(long startMinutesFromNow, long endMinutesFromNow) {
		Poll poll = mock(Poll.class);
		Instant startsAt = Instant.now().plusSeconds(startMinutesFromNow * 60);
		Instant endsAt = Instant.now().plusSeconds(endMinutesFromNow * 60);
		when(poll.getStatus()).thenReturn(PollStatus.OPEN);
		when(poll.getStartsAt()).thenReturn(startsAt);
		when(poll.getEndsAt()).thenReturn(endsAt);
		return poll;
	}
}
