package com.top.vote.dto;

import com.fasterxml.jackson.annotation.JsonInclude;
import com.top.poll.domain.PollPhase;

import java.math.BigDecimal;
import java.util.List;

/**
 * {@code myOptionId} is the requesting viewer's own current selection (null / omitted when they have
 * not voted). It is not an aggregate, so unlike {@code results} it is returned in every phase.
 */
@JsonInclude(JsonInclude.Include.NON_NULL)
public record PollResultsResponse(long pollId, PollPhase phase, boolean voted, Long participantCount,
		List<OptionResult> results, Long myOptionId) {
	/** Response without a viewer selection (kept for callers that don't have one). */
	public PollResultsResponse(long pollId, PollPhase phase, boolean voted, Long participantCount, List<OptionResult> results) {
		this(pollId, phase, voted, participantCount, results, null);
	}

	public record OptionResult(long optionId, long voteCount, BigDecimal percentage) {
	}
}
