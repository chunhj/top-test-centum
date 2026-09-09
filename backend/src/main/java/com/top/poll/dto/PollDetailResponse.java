package com.top.poll.dto;

import com.top.poll.domain.Poll;
import com.top.poll.domain.PollStatus;

import java.time.Instant;
import java.util.List;

public record PollDetailResponse(
        Long pollId,
        String title,
        String description,
        String type,
        int maxSelections,
        PollStatus status,
        Instant startsAt,
        Instant endsAt,
        List<OptionResponse> options
) {
    public static PollDetailResponse from(Poll poll) {
        return new PollDetailResponse(
                poll.getId(),
                poll.getTitle(),
                poll.getDescription(),
                poll.getPollType(),
                poll.getMaxSelections(),
                poll.getStatus(),
                poll.getStartsAt(),
                poll.getEndsAt(),
                poll.getOptions().stream().map(OptionResponse::from).toList()
        );
    }
}
