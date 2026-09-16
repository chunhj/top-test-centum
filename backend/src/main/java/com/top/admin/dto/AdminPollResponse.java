package com.top.admin.dto;

import com.top.poll.domain.Poll;
import com.top.poll.domain.PollPhase;
import com.top.poll.domain.PollStatus;

import java.time.Instant;

public record AdminPollResponse(
		long pollId, String title, PollStatus status, PollPhase phase,
		long participantCount, Instant startsAt, Instant endsAt
) {
	public static AdminPollResponse from(Poll poll, long participantCount) {
		return new AdminPollResponse(poll.getId(), poll.getTitle(), poll.getStatus(),
				PollPhase.at(poll, Instant.now()), participantCount, poll.getStartsAt(), poll.getEndsAt());
	}
}
