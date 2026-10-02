package com.top.poll.dto;

import com.top.poll.domain.PollStatus;

import java.time.Instant;

/**
 * Public poll list item: the cached {@link PollSummaryResponse} plus a live participant count.
 * The count is attached per request (not stored in the "popularPolls" cache) so it never goes stale
 * with the cache TTL, and the cached record's serialized shape stays unchanged.
 */
public record PollListItemResponse(
		Long pollId,
		String title,
		String type,
		int maxSelections,
		PollStatus status,
		Instant startsAt,
		Instant endsAt,
		long participantCount
) {
	public static PollListItemResponse from(PollSummaryResponse poll, long participantCount) {
		return new PollListItemResponse(poll.pollId(), poll.title(), poll.type(), poll.maxSelections(),
				poll.status(), poll.startsAt(), poll.endsAt(), participantCount);
	}
}
