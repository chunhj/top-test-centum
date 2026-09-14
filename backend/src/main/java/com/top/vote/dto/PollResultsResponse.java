package com.top.vote.dto;

import com.fasterxml.jackson.annotation.JsonInclude;
import com.top.poll.domain.PollPhase;

import java.math.BigDecimal;
import java.util.List;

@JsonInclude(JsonInclude.Include.NON_NULL)
public record PollResultsResponse(long pollId, PollPhase phase, boolean voted, long participantCount, List<OptionResult> results) {
	public record OptionResult(long optionId, long voteCount, BigDecimal percentage) {
	}
}
