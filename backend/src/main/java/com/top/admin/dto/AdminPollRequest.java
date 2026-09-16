package com.top.admin.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;

import java.time.Instant;
import java.util.List;

public record AdminPollRequest(
		@NotBlank String title,
		String description,
		@NotBlank String pollType,
		@Positive int maxSelections,
		@NotNull Instant startsAt,
		@NotNull Instant endsAt,
		@NotEmpty List<@Valid Option> options
) {
	public record Option(@NotBlank String name, String imageUrl, String team) {}
}
