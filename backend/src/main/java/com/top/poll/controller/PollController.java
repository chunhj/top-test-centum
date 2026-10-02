package com.top.poll.controller;

import com.top.poll.dto.PollDetailResponse;
import com.top.poll.dto.PollListItemResponse;
import com.top.poll.dto.PollSummaryResponse;
import com.top.poll.service.PollParticipantService;
import com.top.poll.service.PollService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/polls")
@RequiredArgsConstructor
public class PollController {
	private final PollService pollService;
	private final PollParticipantService participantService;

	@GetMapping
	public List<PollListItemResponse> findOpenPolls() {
		// The poll list comes from the "popularPolls" cache; participant counts are always live and are
		// loaded for all listed polls in one query (instead of one /results call per card on the client).
		List<PollSummaryResponse> polls = pollService.findOpenPolls();
		Map<Long, Long> counts = participantService.countByPollIds(polls.stream().map(PollSummaryResponse::pollId).toList());
		return polls.stream()
				.map(poll -> PollListItemResponse.from(poll, counts.getOrDefault(poll.pollId(), 0L)))
				.toList();
	}

	@GetMapping("/{pollId}")
	public PollDetailResponse findPoll(@PathVariable long pollId) {
		return pollService.findPoll(pollId);
	}
}
