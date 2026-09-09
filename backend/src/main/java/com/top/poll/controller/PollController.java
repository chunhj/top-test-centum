package com.top.poll.controller;

import com.top.poll.dto.PollDetailResponse;
import com.top.poll.dto.PollSummaryResponse;
import com.top.poll.service.PollService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/polls")
@RequiredArgsConstructor
public class PollController {
	private final PollService pollService;

	@GetMapping
	public List<PollSummaryResponse> findOpenPolls() {
		return pollService.findOpenPolls();
	}

	@GetMapping("/{pollId}")
	public PollDetailResponse findPoll(@PathVariable long pollId) {
		return pollService.findPoll(pollId);
	}
}
