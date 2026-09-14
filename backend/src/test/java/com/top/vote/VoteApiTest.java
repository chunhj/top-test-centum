package com.top.vote;

import com.top.common.exception.ApiExceptionHandler;
import com.top.poll.domain.Poll;
import com.top.poll.domain.PollOption;
import com.top.poll.domain.PollStatus;
import com.top.poll.repository.PollRepository;
import com.top.vote.controller.VoteController;
import com.top.vote.domain.Ballot;
import com.top.vote.domain.BallotSelection;
import com.top.vote.repository.BallotRepository;
import com.top.vote.repository.IdempotencyRequestRepository;
import com.top.vote.repository.PollOptionCounterRepository;
import com.top.vote.repository.VoteHistoryRepository;
import com.top.vote.service.VoteService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import java.util.concurrent.atomic.AtomicReference;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.inOrder;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;
import static org.springframework.test.web.servlet.setup.MockMvcBuilders.standaloneSetup;

class VoteApiTest {
	private PollRepository pollRepository;
	private BallotRepository ballotRepository;
	private IdempotencyRequestRepository idempotencyRequestRepository;
	private PollOptionCounterRepository counterRepository;
	private VoteHistoryRepository voteHistoryRepository;
	private MockMvc mvc;

	@BeforeEach
	void setUp() {
		pollRepository = mock(PollRepository.class);
		ballotRepository = mock(BallotRepository.class);
		idempotencyRequestRepository = mock(IdempotencyRequestRepository.class);
		counterRepository = mock(PollOptionCounterRepository.class);
		voteHistoryRepository = mock(VoteHistoryRepository.class);
		when(idempotencyRequestRepository.claim(anyString(), anyLong(), any(UUID.class), anyString()))
				.thenReturn(11L);
		mvc = standaloneSetup(new VoteController(
				new VoteService(pollRepository, ballotRepository, idempotencyRequestRepository,
						counterRepository, voteHistoryRepository)))
				.setControllerAdvice(new ApiExceptionHandler())
				.build();
	}

	@Test
	void storesSingleVoteInsideT30() throws Exception {
		PollOption option = option(3L);
		Poll poll = poll(PollStatus.OPEN, option);
		when(poll.getEndsAt()).thenReturn(Instant.now().plus(29, ChronoUnit.MINUTES));
		when(pollRepository.findById(1L)).thenReturn(Optional.of(poll));
		Ballot saved = mock(Ballot.class);
		when(saved.getId()).thenReturn(7L);
		when(ballotRepository.saveAndFlush(any(Ballot.class))).thenReturn(saved);

		mvc.perform(post("/api/polls/1/votes")
					.requestAttr("voterKey", "a".repeat(64))
					.header("Idempotency-Key", UUID.randomUUID())
					.contentType(MediaType.APPLICATION_JSON)
					.content("{\"optionId\":3}"))
				.andExpect(status().isCreated())
				.andExpect(jsonPath("$.ballotId").value(7))
				.andExpect(jsonPath("$.optionId").value(3));
		verify(idempotencyRequestRepository).complete(11L, 7L, 3L);
		verify(counterRepository).adjust(3L, 1);
	}

	@Test
	void rejectsVoteAfterEndTime() throws Exception {
		Poll poll = poll(PollStatus.OPEN, option(3L));
		when(poll.getEndsAt()).thenReturn(Instant.now().minusSeconds(1));
		when(pollRepository.findById(1L)).thenReturn(Optional.of(poll));

		mvc.perform(post("/api/polls/1/votes")
					.requestAttr("voterKey", "a".repeat(64))
					.header("Idempotency-Key", UUID.randomUUID())
					.contentType(MediaType.APPLICATION_JSON)
					.content("{\"optionId\":3}"))
				.andExpect(status().isConflict())
				.andExpect(jsonPath("$.code").value("POLL_CLOSED"));
		verifyNoInteractions(ballotRepository);
	}

	@Test
	void rejectsOptionFromAnotherPoll() throws Exception {
		Poll poll = poll(PollStatus.OPEN, option(2L));
		when(pollRepository.findById(1L)).thenReturn(Optional.of(poll));

		mvc.perform(post("/api/polls/1/votes")
					.requestAttr("voterKey", "a".repeat(64))
					.header("Idempotency-Key", UUID.randomUUID())
					.contentType(MediaType.APPLICATION_JSON)
					.content("{\"optionId\":3}"))
				.andExpect(status().isBadRequest())
				.andExpect(jsonPath("$.code").value("INVALID_POLL_OPTION"));
	}

	@Test
	void rejectsPausedPoll() throws Exception {
		Poll poll = poll(PollStatus.PAUSED, option(3L));
		when(pollRepository.findById(1L)).thenReturn(Optional.of(poll));

		mvc.perform(post("/api/polls/1/votes")
					.requestAttr("voterKey", "a".repeat(64))
					.header("Idempotency-Key", UUID.randomUUID())
					.contentType(MediaType.APPLICATION_JSON)
					.content("{\"optionId\":3}"))
				.andExpect(status().isConflict())
				.andExpect(jsonPath("$.code").value("POLL_PAUSED"));
	}

	@Test
	void translatesDatabaseDuplicateToApiError() throws Exception {
		PollOption option = option(3L);
		Poll poll = poll(PollStatus.OPEN, option);
		when(pollRepository.findById(1L)).thenReturn(Optional.of(poll));
		when(ballotRepository.saveAndFlush(any(Ballot.class)))
				.thenThrow(new DataIntegrityViolationException("uq_ballot_poll_voter"));

		mvc.perform(post("/api/polls/1/votes")
					.requestAttr("voterKey", "a".repeat(64))
					.header("Idempotency-Key", UUID.randomUUID())
					.contentType(MediaType.APPLICATION_JSON)
					.content("{\"optionId\":3}"))
				.andExpect(status().isConflict())
				.andExpect(jsonPath("$.code").value("DUPLICATE_VOTE"));
	}

	@Test
	void returnsStoredResponseForSameIdempotencyRequest() throws Exception {
		UUID key = UUID.randomUUID();
		Poll poll = poll(PollStatus.OPEN, option(3L));
		AtomicReference<String> requestHash = new AtomicReference<>();
		when(pollRepository.findById(1L)).thenReturn(Optional.of(poll));
		when(idempotencyRequestRepository.claim(anyString(), anyLong(), any(UUID.class), anyString()))
				.thenAnswer(invocation -> {
					requestHash.set(invocation.getArgument(3, String.class));
					return null;
				});
		when(idempotencyRequestRepository.find(anyString(), anyLong(), any(UUID.class)))
				.thenAnswer(invocation -> Optional.of(
						new IdempotencyRequestRepository.StoredRequest(requestHash.get(), 7L, 3L)));

		mvc.perform(post("/api/polls/1/votes")
					.requestAttr("voterKey", "a".repeat(64))
					.header("Idempotency-Key", key)
					.contentType(MediaType.APPLICATION_JSON)
					.content("{\"optionId\":3}"))
				.andExpect(status().isCreated())
				.andExpect(jsonPath("$.ballotId").value(7))
				.andExpect(jsonPath("$.optionId").value(3));
		verify(ballotRepository, never()).saveAndFlush(any(Ballot.class));
	}

	@Test
	void rejectsSameIdempotencyKeyWithDifferentPayload() throws Exception {
		UUID key = UUID.randomUUID();
		Poll poll = poll(PollStatus.OPEN, option(3L));
		when(pollRepository.findById(1L)).thenReturn(Optional.of(poll));
		when(idempotencyRequestRepository.claim(anyString(), anyLong(), any(UUID.class), anyString()))
				.thenReturn(null);
		when(idempotencyRequestRepository.find(anyString(), anyLong(), any(UUID.class)))
				.thenReturn(Optional.of(new IdempotencyRequestRepository.StoredRequest("different", 7L, 2L)));

		mvc.perform(post("/api/polls/1/votes")
					.requestAttr("voterKey", "a".repeat(64))
					.header("Idempotency-Key", key)
					.contentType(MediaType.APPLICATION_JSON)
					.content("{\"optionId\":3}"))
				.andExpect(status().isConflict())
				.andExpect(jsonPath("$.code").value("IDEMPOTENCY_CONFLICT"));
		verify(ballotRepository, never()).saveAndFlush(any(Ballot.class));
	}

	@Test
	void changesVoteAndWritesHistoryInCounterOrder() throws Exception {
		PollOption oldOption = option(2L);
		PollOption newOption = option(3L);
		Poll poll = poll(PollStatus.OPEN, newOption);
		Ballot ballot = mock(Ballot.class);
		BallotSelection selection = mock(BallotSelection.class);
		when(ballot.getId()).thenReturn(7L);
		when(ballot.getSelection()).thenReturn(selection);
		when(selection.getOption()).thenReturn(oldOption);
		when(pollRepository.findById(1L)).thenReturn(Optional.of(poll));
		when(ballotRepository.findByPollIdAndVoterKey(1L, "a".repeat(64)))
				.thenReturn(Optional.of(ballot));

		mvc.perform(post("/api/polls/1/votes")
					.requestAttr("voterKey", "a".repeat(64))
					.header("Idempotency-Key", UUID.randomUUID())
					.contentType(MediaType.APPLICATION_JSON)
					.content("{\"optionId\":3}"))
				.andExpect(status().isCreated())
				.andExpect(jsonPath("$.ballotId").value(7))
				.andExpect(jsonPath("$.optionId").value(3));

		var order = inOrder(counterRepository);
		order.verify(counterRepository).adjust(2L, -1);
		order.verify(counterRepository).adjust(3L, 1);
		verify(ballot).changeSelection(newOption);
		verify(voteHistoryRepository).save(any());
	}

	@Test
	void selectingSameOptionDoesNotChangeCountOrHistory() throws Exception {
		PollOption option = option(3L);
		Poll poll = poll(PollStatus.OPEN, option);
		Ballot ballot = mock(Ballot.class);
		BallotSelection selection = mock(BallotSelection.class);
		when(ballot.getId()).thenReturn(7L);
		when(ballot.getSelection()).thenReturn(selection);
		when(selection.getOption()).thenReturn(option);
		when(pollRepository.findById(1L)).thenReturn(Optional.of(poll));
		when(ballotRepository.findByPollIdAndVoterKey(1L, "a".repeat(64)))
				.thenReturn(Optional.of(ballot));

		mvc.perform(post("/api/polls/1/votes")
					.requestAttr("voterKey", "a".repeat(64))
					.header("Idempotency-Key", UUID.randomUUID())
					.contentType(MediaType.APPLICATION_JSON)
					.content("{\"optionId\":3}"))
				.andExpect(status().isCreated())
				.andExpect(jsonPath("$.optionId").value(3));

		verify(ballot, never()).changeSelection(any());
		verifyNoInteractions(counterRepository, voteHistoryRepository);
	}

	private Poll poll(PollStatus status, PollOption option) {
		Poll poll = mock(Poll.class);
		when(poll.getStatus()).thenReturn(status);
		when(poll.getStartsAt()).thenReturn(Instant.now().minus(1, ChronoUnit.HOURS));
		when(poll.getEndsAt()).thenReturn(Instant.now().plus(1, ChronoUnit.HOURS));
		when(poll.getMaxSelections()).thenReturn(1);
		when(poll.getOptions()).thenReturn(List.of(option));
		return poll;
	}

	private PollOption option(long id) {
		PollOption option = mock(PollOption.class);
		when(option.getId()).thenReturn(id);
		return option;
	}
}
