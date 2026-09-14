package com.top.vote.controller;

import com.top.auth.AnonymousVoterFilter;
import com.top.vote.dto.PollResultsResponse;
import com.top.vote.service.VoteResultService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestAttribute;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/polls/{pollId}/results")
@RequiredArgsConstructor
public class VoteResultController {
	private final VoteResultService voteResultService;

	@GetMapping
	public PollResultsResponse findResults(@PathVariable long pollId,
			@RequestAttribute(AnonymousVoterFilter.VOTER_KEY_ATTRIBUTE) String voterKey) {
		return voteResultService.findResults(pollId, voterKey);
	}
}
