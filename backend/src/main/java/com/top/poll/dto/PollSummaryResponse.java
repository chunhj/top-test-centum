package com.top.poll.dto;

import com.top.poll.domain.Poll;
import com.top.poll.domain.PollStatus;

import java.time.Instant;
import java.io.Serializable;

public record PollSummaryResponse(
        Long pollId,
        String title,
        String type,
        int maxSelections,
        PollStatus status,
        Instant startsAt,
        Instant endsAt
) implements Serializable {
    public static PollSummaryResponse from(Poll poll) {
        return new PollSummaryResponse(
                poll.getId(),
                poll.getTitle(),
                poll.getPollType(),
                poll.getMaxSelections(),
                poll.getStatus(),
                poll.getStartsAt(),
                poll.getEndsAt());
    }
}
