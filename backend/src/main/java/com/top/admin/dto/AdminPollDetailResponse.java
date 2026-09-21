package com.top.admin.dto;

import com.top.poll.domain.Poll;
import com.top.poll.domain.PollStatus;

import java.time.Instant;
import java.util.List;

// Full poll detail for the admin edit screen, including each option's id so
// the client can tell the server which rows to UPDATE/DELETE vs INSERT.
public record AdminPollDetailResponse(
		long pollId,
		String title,
		String description,
		PollStatus status,
		Instant startsAt,
		Instant endsAt,
		List<Option> options
) {
	public record Option(long optionId, String name, String imageUrl, String team) {}

	public static AdminPollDetailResponse from(Poll poll) {
		return new AdminPollDetailResponse(
				poll.getId(),
				poll.getTitle(),
				poll.getDescription(),
				poll.getStatus(),
				poll.getStartsAt(),
				poll.getEndsAt(),
				poll.getOptions().stream()
						.map(option -> new Option(option.getId(), option.getName(), option.getImageUrl(), option.getTeam()))
						.toList()
		);
	}
}
