package com.top.admin.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

import java.time.Instant;

public record AdminPollUpdateRequest(
		@NotBlank String title,
		String description,
		@NotNull Instant startsAt,
		@NotNull Instant endsAt
) {}
