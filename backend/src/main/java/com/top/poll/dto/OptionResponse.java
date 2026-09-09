package com.top.poll.dto;

import com.top.poll.domain.PollOption;

public record OptionResponse(
        Long optionId,
        String name,
        String imageUrl,
        String team
) {
    static OptionResponse from(PollOption option) {
        return new OptionResponse(
                option.getId(),
                option.getName(),
                option.getImageUrl(),
                option.getTeam()
        );
    }
}
