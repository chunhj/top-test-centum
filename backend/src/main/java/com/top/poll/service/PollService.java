package com.top.poll.service;

import com.top.poll.domain.PollStatus;
import com.top.poll.dto.PollDetailResponse;
import com.top.poll.dto.PollSummaryResponse;
import com.top.poll.repository.PollRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;

import static org.springframework.http.HttpStatus.NOT_FOUND;

@Service
@Transactional(readOnly = true)
@RequiredArgsConstructor
public class PollService {
    private final PollRepository pollRepository;

    @Cacheable("popularPolls")
    public List<PollSummaryResponse> findOpenPolls() {
        return pollRepository.findAllByStatusOrderByCreatedAtDesc(PollStatus.OPEN)
				.stream()
                .map(PollSummaryResponse::from)
                .toList();
    }

    public PollDetailResponse findPoll(long pollId) {
        return pollRepository.findById(pollId)
                .map(PollDetailResponse::from)
                .orElseThrow(() -> new ResponseStatusException(NOT_FOUND, "POLL_NOT_FOUND"));
    }
}
