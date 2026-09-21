package com.top.vote;

import com.top.poll.domain.Poll;
import com.top.poll.domain.PollPhase;
import com.top.poll.domain.PollStatus;
import com.top.poll.repository.PollRepository;
import com.top.vote.service.VoteResultService;
import com.top.vote.service.VoteStreamService;
import org.junit.jupiter.api.Test;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.Optional;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

/**
 * Confirms that a vote burst is reduced to one latest-result fan-out.
 */
class VoteStreamAsyncFanOutTest {
	@Test
	void publishAfterCommitCoalescesPendingWork() {
			PollRepository pollRepository = mock(PollRepository.class);
			Poll poll = mock(Poll.class);
			when(poll.getStatus()).thenReturn(PollStatus.OPEN);
			when(poll.getStartsAt()).thenReturn(Instant.now().minus(1, ChronoUnit.HOURS));
			when(poll.getEndsAt()).thenReturn(Instant.now().plus(1, ChronoUnit.HOURS));
			when(pollRepository.findById(1L)).thenReturn(Optional.of(poll));

			VoteResultService voteResultService = mock(VoteResultService.class);
			when(voteResultService.findResults(anyLong(), anyString()))
					.thenReturn(new com.top.vote.dto.PollResultsResponse(1L, PollPhase.LIVE_VISIBLE, false, 0L, null));
			when(voteResultService.loadSnapshot(1L))
					.thenReturn(new VoteResultService.ResultSnapshot(1L, PollPhase.RESULTS_HIDDEN, 0L, null));
			VoteStreamService service = new VoteStreamService(pollRepository, voteResultService);
			service.subscribe(1L, "voter-async-check");

			service.publishAfterCommit(1L);
			service.publishAfterCommit(1L);
			verify(voteResultService, times(0)).loadSnapshot(1L);

			service.flushPendingBroadcasts();
			verify(voteResultService, times(1)).loadSnapshot(1L);
	}
}
