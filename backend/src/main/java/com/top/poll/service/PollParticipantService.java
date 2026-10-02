package com.top.poll.service;

import com.top.vote.repository.BallotRepository;
import com.top.vote.repository.PollParticipantCount;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Collection;
import java.util.Map;
import java.util.stream.Collectors;

@Service
@Transactional(readOnly = true)
@RequiredArgsConstructor
public class PollParticipantService {
	private final BallotRepository ballotRepository;

	/** Participant count per poll id, loaded with a single query. Polls without ballots are absent (treat as 0). */
	public Map<Long, Long> countByPollIds(Collection<Long> pollIds) {
		if (pollIds.isEmpty()) {
			return Map.of();
		}
		return ballotRepository.countParticipantsByPollIds(pollIds).stream()
				.collect(Collectors.toMap(PollParticipantCount::pollId, PollParticipantCount::participantCount));
	}
}
