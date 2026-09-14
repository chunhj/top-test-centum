package com.top.vote;

import com.top.common.exception.ApiExceptionHandler;
import com.top.poll.domain.Poll;
import com.top.poll.domain.PollStatus;
import com.top.poll.repository.PollRepository;
import com.top.vote.controller.VoteResultController;
import com.top.vote.repository.BallotRepository;
import com.top.vote.repository.PollOptionCounterRepository;
import com.top.vote.service.VoteResultService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.test.web.servlet.MockMvc;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.Optional;

import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;
import static org.springframework.test.web.servlet.setup.MockMvcBuilders.standaloneSetup;

class VoteResultApiTest {
	private static final String VOTER_KEY = "a".repeat(64);

	private PollRepository pollRepository;
	private BallotRepository ballotRepository;
	private PollOptionCounterRepository counterRepository;
	private MockMvc mvc;

	@BeforeEach
	void setUp() {
		pollRepository = mock(PollRepository.class);
		ballotRepository = mock(BallotRepository.class);
		counterRepository = mock(PollOptionCounterRepository.class);
		mvc = standaloneSetup(new VoteResultController(
				new VoteResultService(pollRepository, ballotRepository, counterRepository)))
				.setControllerAdvice(new ApiExceptionHandler())
				.build();
	}

	@Test
	void omitsNumbersInsideT30EvenAfterVoting() throws Exception {
		Poll poll = poll(PollStatus.OPEN, 29);
		when(pollRepository.findById(1L)).thenReturn(Optional.of(poll));
		when(ballotRepository.existsByPollIdAndVoterKey(1L, VOTER_KEY)).thenReturn(true);

		mvc.perform(get("/api/polls/1/results").requestAttr("voterKey", VOTER_KEY))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.phase").value("RESULTS_HIDDEN"))
				.andExpect(jsonPath("$.voted").value(true))
				.andExpect(jsonPath("$.results").doesNotExist())
				.andExpect(jsonPath("$..voteCount").doesNotExist())
				.andExpect(jsonPath("$..percentage").doesNotExist());
		verify(counterRepository, never()).findResults(1L);
	}

	@Test
	void returnsLiveNumbersOnlyAfterVoting() throws Exception {
		Poll poll = poll(PollStatus.OPEN, 60);
		when(pollRepository.findById(1L)).thenReturn(Optional.of(poll));
		when(ballotRepository.existsByPollIdAndVoterKey(1L, VOTER_KEY)).thenReturn(false, true);
		when(ballotRepository.countByPollId(1L)).thenReturn(31L);
		when(counterRepository.findResults(1L)).thenReturn(List.of(
				new PollOptionCounterRepository.OptionResult(3L, 4L, new BigDecimal("80.0"))));

		mvc.perform(get("/api/polls/1/results").requestAttr("voterKey", VOTER_KEY))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.phase").value("LIVE_VISIBLE"))
				.andExpect(jsonPath("$.voted").value(false))
				.andExpect(jsonPath("$.participantCount").value(31))
				.andExpect(jsonPath("$.results").doesNotExist());

		mvc.perform(get("/api/polls/1/results").requestAttr("voterKey", VOTER_KEY))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.voted").value(true))
				.andExpect(jsonPath("$.results[0].voteCount").value(4));
		verify(counterRepository, times(1)).findResults(1L);
	}

	@Test
	void returnsNumbersAfterClosing() throws Exception {
		Poll poll = poll(PollStatus.CLOSED, 60);
		when(pollRepository.findById(1L)).thenReturn(Optional.of(poll));
		when(counterRepository.findResults(1L)).thenReturn(List.of(
				new PollOptionCounterRepository.OptionResult(3L, 4L, new BigDecimal("80.0"))));

		mvc.perform(get("/api/polls/1/results").requestAttr("voterKey", VOTER_KEY))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.phase").value("CLOSED"))
				.andExpect(jsonPath("$.results[0].voteCount").value(4))
				.andExpect(jsonPath("$.results[0].percentage").value(80.0));
	}

	private Poll poll(PollStatus status, long minutesUntilEnd) {
		Poll poll = mock(Poll.class);
		when(poll.getStatus()).thenReturn(status);
		when(poll.getStartsAt()).thenReturn(Instant.now().minus(1, ChronoUnit.HOURS));
		when(poll.getEndsAt()).thenReturn(Instant.now().plus(minutesUntilEnd, ChronoUnit.MINUTES));
		return poll;
	}
}
