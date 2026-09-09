package com.top.poll;

import com.top.common.exception.ApiExceptionHandler;
import com.top.poll.controller.PollController;
import com.top.poll.domain.Poll;
import com.top.poll.domain.PollOption;
import com.top.poll.domain.PollStatus;
import com.top.poll.repository.PollRepository;
import com.top.poll.service.PollService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.test.web.servlet.MockMvc;

import java.time.Instant;
import java.util.List;
import java.util.Optional;

import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;
import static org.springframework.test.web.servlet.setup.MockMvcBuilders.standaloneSetup;

class PollApiTest {
	private PollRepository repository;
	private MockMvc mvc;

	@BeforeEach
	void setUp() {
		repository = mock(PollRepository.class);
		mvc = standaloneSetup(new PollController(new PollService(repository)))
				.setControllerAdvice(new ApiExceptionHandler())
				.build();
	}

	@Test
	void returnsOpenPolls() throws Exception {
		Poll poll = poll(1L);
		when(repository.findAllByStatusOrderByCreatedAtDesc(PollStatus.OPEN)).thenReturn(List.of(poll));

		mvc.perform(get("/api/polls"))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$[0].pollId").value(1))
				.andExpect(jsonPath("$[0].title").value("오늘의 투표"))
				.andExpect(jsonPath("$[0].status").value("OPEN"));
	}

	@Test
	void returnsPollWithOptions() throws Exception {
		Poll poll = poll(1L);
		PollOption option = mock(PollOption.class);
		when(option.getId()).thenReturn(10L);
		when(option.getName()).thenReturn("후보 A");
		when(poll.getOptions()).thenReturn(List.of(option));
		when(repository.findById(1L)).thenReturn(Optional.of(poll));

		mvc.perform(get("/api/polls/1"))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.pollId").value(1))
				.andExpect(jsonPath("$.options[0].optionId").value(10))
				.andExpect(jsonPath("$.options[0].name").value("후보 A"));
	}

	@Test
	void returnsPollNotFoundCode() throws Exception {
		when(repository.findById(99L)).thenReturn(Optional.empty());

		mvc.perform(get("/api/polls/99"))
				.andExpect(status().isNotFound())
				.andExpect(jsonPath("$.code").value("POLL_NOT_FOUND"));
	}

	private Poll poll(long id) {
		Poll poll = mock(Poll.class);
		when(poll.getId()).thenReturn(id);
		when(poll.getTitle()).thenReturn("오늘의 투표");
		when(poll.getDescription()).thenReturn("설명");
		when(poll.getPollType()).thenReturn("SINGLE");
		when(poll.getMaxSelections()).thenReturn(1);
		when(poll.getStatus()).thenReturn(PollStatus.OPEN);
		when(poll.getStartsAt()).thenReturn(Instant.parse("2026-09-09T00:00:00Z"));
		when(poll.getEndsAt()).thenReturn(Instant.parse("2026-09-10T00:00:00Z"));
		when(poll.getOptions()).thenReturn(List.of());
		return poll;
	}
}
