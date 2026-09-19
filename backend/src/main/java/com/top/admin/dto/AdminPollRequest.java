package com.top.admin.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Positive;

import java.time.Instant;
import java.util.List;

public record AdminPollRequest(
		@NotBlank String title,
		String description,
		// Only single-choice polls are currently supported end to end: VoteService
		// rejects any vote on a poll whose maxSelections != 1, and there is no
		// multi-select ballot/counter logic anywhere else. Restricting the
		// supported values here at admin creation time means an invalid poll
		// never gets published in the first place, instead of failing silently
		// for every voter later.
		@NotBlank @Pattern(regexp = "SINGLE|SLAM_DUNK", message = "unsupported poll type") String pollType,
		@Positive @Max(1) int maxSelections,
		@NotNull Instant startsAt,
		@NotNull Instant endsAt,
		@NotEmpty List<@Valid Option> options
) {
	public record Option(@NotBlank String name, String imageUrl, String team) {}
}
