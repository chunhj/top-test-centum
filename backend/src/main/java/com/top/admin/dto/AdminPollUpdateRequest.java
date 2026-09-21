package com.top.admin.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;

import java.time.Instant;
import java.util.List;

public record AdminPollUpdateRequest(
		@NotBlank String title,
		String description,
		@NotNull Instant startsAt,
		@NotNull Instant endsAt,
		@NotEmpty List<@Valid Option> options
) {
	// optionId null => new candidate (INSERT). optionId set => existing
	// candidate to UPDATE; any existing optionId left out of this list is
	// DELETEd. See Poll#syncOptions.
	public record Option(Long optionId, @NotBlank String name, String imageUrl, String team) {}
}
