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
	private final PollOptionCounterRepository pollOptionCounterRepository;

	public PollResultsResponse findResults(long pollId, String voterKey) {
		Poll poll = pollRepository.findById(pollId)
				.orElseThrow(() -> new ResponseStatusException(NOT_FOUND, "POLL_NOT_FOUND"));
		PollPhase phase = PollPhase.at(poll, Instant.now());
		boolean hasVoted = ballotRepository.existsByPollIdAndVoterKey(pollId, voterKey);
		var optionResults = phase == PollPhase.CLOSED || phase == PollPhase.LIVE_VISIBLE && hasVoted
				? optionResults(pollId)
				: null;
		// The T-30 "hide results" phase is meant to keep the outcome from being
		// inferred until the poll closes. Vote counts were already withheld,
		// but participantCount leaked the same signal (how many people have
		// voted) regardless of phase, so it must be withheld too whenever
		// results are.
		Long participantCount = phase == PollPhase.RESULTS_HIDDEN ? null : ballotRepository.countByPollId(pollId);
		return new PollResultsResponse(pollId, phase, hasVoted, participantCount, optionResults);
	}

	/**
	 * Loads the parts of a poll's results that are the same for every viewer
	 * (phase, participant count, and the aggregated per-option counts, when the
	 * phase allows showing numbers at all). Callers that need to notify many
	 * subscribers about the same vote (VoteStreamService's SSE fan-out) load
	 * this once per vote and reuse it via {@link #toResponse}, instead of each
	 * subscriber re-running the poll lookup and counter aggregation queries
	 * that findResults() runs per caller.
	 */
	public ResultSnapshot loadSnapshot(long pollId) {
		Poll poll = pollRepository.findById(pollId)
				.orElseThrow(() -> new ResponseStatusException(NOT_FOUND, "POLL_NOT_FOUND"));
		PollPhase phase = PollPhase.at(poll, Instant.now());
		// Kept as the real count here (not nulled out): this snapshot is an
		// internal, shared representation reused across every subscriber by
		// toResponse(), which is where the RESULTS_HIDDEN visibility rule is
		// actually applied per viewer.
		long participantCount = ballotRepository.countByPollId(pollId);
		var optionResults = phase == PollPhase.CLOSED || phase == PollPhase.LIVE_VISIBLE
				? optionResults(pollId)
				: null;
		return new ResultSnapshot(pollId, phase, participantCount, optionResults);
	}

	/**
	 * Builds one viewer's response from a shared {@link ResultSnapshot}. Only
	 * the "have they voted" check is per-viewer; everything else is reused.
	 */
	public PollResultsResponse toResponse(ResultSnapshot snapshot, String voterKey) {
		boolean hasVoted = ballotRepository.existsByPollIdAndVoterKey(snapshot.pollId(), voterKey);
		boolean showResults = snapshot.phase() == PollPhase.CLOSED
				|| snapshot.phase() == PollPhase.LIVE_VISIBLE && hasVoted;
		Long participantCount = snapshot.phase() == PollPhase.RESULTS_HIDDEN ? null : snapshot.participantCount();
		return new PollResultsResponse(snapshot.pollId(), snapshot.phase(), hasVoted, participantCount,
				showResults ? snapshot.optionResults() : null);
	}

	private java.util.List<PollResultsResponse.OptionResult> optionResults(long pollId) {
		return pollOptionCounterRepository.findResults(pollId).stream()
				.map(result -> new PollResultsResponse.OptionResult(
						result.optionId(), result.voteCount(), result.percentage()))
				.toList();
	}

	public record ResultSnapshot(long pollId, PollPhase phase, long participantCount,
			java.util.List<PollResultsResponse.OptionResult> optionResults) {
	}
}
