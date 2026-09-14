package com.top.vote.service;

import com.top.poll.domain.Poll;
import com.top.poll.domain.PollPhase;
import com.top.poll.repository.PollRepository;
import com.top.vote.dto.PollResultsResponse;
import com.top.vote.repository.BallotRepository;
import com.top.vote.repository.PollOptionCounterRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.time.Instant;

import static org.springframework.http.HttpStatus.NOT_FOUND;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class VoteResultService {
	private final PollRepository pollRepository;
	private final BallotRepository ballotRepository;
	private final PollOptionCounterRepository counterRepository;

	public PollResultsResponse findResults(long pollId, String voterKey) {
		Poll poll = pollRepository.findById(pollId)
				.orElseThrow(() -> new ResponseStatusException(NOT_FOUND, "POLL_NOT_FOUND"));
		PollPhase phase = PollPhase.at(poll, Instant.now());
		boolean voted = ballotRepository.existsByPollIdAndVoterKey(pollId, voterKey);
		var results = phase == PollPhase.CLOSED || phase == PollPhase.LIVE_VISIBLE && voted
				? counterRepository.findResults(pollId).stream()
						.map(result -> new PollResultsResponse.OptionResult(
								result.optionId(), result.voteCount(), result.percentage()))
						.toList()
				: null;
		return new PollResultsResponse(pollId, phase, voted, ballotRepository.countByPollId(pollId), results);
	}
}
