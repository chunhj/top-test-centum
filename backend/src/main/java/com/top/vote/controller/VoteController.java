package com.top.vote.controller;

import com.top.auth.AnonymousVoterFilter;
import com.top.vote.service.VoteService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

import static org.springframework.http.HttpStatus.CREATED;

@RestController
@RequestMapping("/api/polls/{pollId}/votes")
@RequiredArgsConstructor
public class VoteController {
	private final VoteService voteService;

	@PostMapping
	public ResponseEntity<VoteResponse> castVote(@PathVariable long pollId,
			@RequestAttribute(AnonymousVoterFilter.VOTER_KEY_ATTRIBUTE) String voterKey,
			@RequestHeader("Idempotency-Key") UUID idempotencyKey,
			@RequestBody VoteRequest request) {
		VoteService.VoteResult result = voteService.castVote(pollId, request.optionId(), voterKey, idempotencyKey);
		return ResponseEntity.status(CREATED).body(new VoteResponse(result.ballotId(), result.optionId()));
	}

	public record VoteRequest(Long optionId) {
	}

	public record VoteResponse(long ballotId, long optionId) {
	}
}
