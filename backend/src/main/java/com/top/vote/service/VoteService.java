package com.top.vote.service;

import com.top.poll.domain.Poll;
import com.top.poll.domain.PollOption;
import com.top.poll.domain.PollPhase;
import com.top.poll.domain.PollStatus;
import com.top.poll.repository.PollRepository;
import com.top.vote.domain.Ballot;
import com.top.vote.domain.VoteHistory;
import com.top.vote.repository.BallotRepository;
import com.top.vote.repository.IdempotencyRequestRepository;
import com.top.vote.repository.PollOptionCounterRepository;
import com.top.vote.repository.VoteHistoryRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.time.Instant;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.util.HexFormat;
import java.util.UUID;

import static org.springframework.http.HttpStatus.*;

@Service
@RequiredArgsConstructor
public class VoteService {
	private final PollRepository pollRepository;
	private final BallotRepository ballotRepository;
	private final IdempotencyRequestRepository idempotencyRequestRepository;
	private final PollOptionCounterRepository counterRepository;
	private final VoteHistoryRepository voteHistoryRepository;

	@Transactional
	public VoteResult castVote(long pollId, Long optionId, String voterKey, UUID idempotencyKey) {
		if (voterKey == null || voterKey.isBlank()) {
			throw new ResponseStatusException(UNAUTHORIZED, "UNAUTHORIZED");
		}
		if (optionId == null) {
			throw new ResponseStatusException(BAD_REQUEST, "INVALID_SELECTION_COUNT");
		}

		Poll poll = pollRepository.findById(pollId)
				.orElseThrow(() -> new ResponseStatusException(NOT_FOUND, "POLL_NOT_FOUND"));
		String requestHash = requestHash(optionId);
		Long requestId = idempotencyRequestRepository.claim(voterKey, pollId, idempotencyKey, requestHash);
		if (requestId == null) {
			IdempotencyRequestRepository.StoredRequest stored = idempotencyRequestRepository
					.find(voterKey, pollId, idempotencyKey)
					.orElseThrow(() -> new IllegalStateException("Completed idempotency request was not found"));
			if (!stored.requestHash().equals(requestHash)) {
				throw new ResponseStatusException(CONFLICT, "IDEMPOTENCY_CONFLICT");
			}
			return new VoteResult(stored.ballotId(), stored.optionId());
		}

		validateOpen(poll);
		if (poll.getMaxSelections() != 1) {
			throw new ResponseStatusException(BAD_REQUEST, "INVALID_SELECTION_COUNT");
		}

		PollOption option = poll.getOptions().stream()
				.filter(candidate -> optionId.equals(candidate.getId()))
				.findFirst()
				.orElseThrow(() -> new ResponseStatusException(BAD_REQUEST, "INVALID_POLL_OPTION"));

		VoteResult result = ballotRepository.findByPollIdAndVoterKey(pollId, voterKey)
				.map(ballot -> changeVote(ballot, option))
				.orElseGet(() -> createVote(poll, option, voterKey));
		idempotencyRequestRepository.complete(requestId, result.ballotId(), result.optionId());
		return result;
	}

	private VoteResult createVote(Poll poll, PollOption option, String voterKey) {
		try {
			Ballot ballot = ballotRepository.saveAndFlush(Ballot.cast(poll, voterKey, option));
			counterRepository.adjust(option.getId(), 1);
			return new VoteResult(ballot.getId(), option.getId());
		} catch (DataIntegrityViolationException exception) {
			throw new ResponseStatusException(CONFLICT, "DUPLICATE_VOTE", exception);
		}
	}

	private VoteResult changeVote(Ballot ballot, PollOption newOption) {
		long oldOptionId = ballot.getSelection().getOption().getId();
		long newOptionId = newOption.getId();
		if (oldOptionId == newOptionId) {
			return new VoteResult(ballot.getId(), newOptionId);
		}

		adjustCountersInOrder(oldOptionId, newOptionId);
		ballot.changeSelection(newOption);
		voteHistoryRepository.save(VoteHistory.changed(ballot, oldOptionId, newOptionId));
		return new VoteResult(ballot.getId(), newOptionId);
	}

	private void adjustCountersInOrder(long oldOptionId, long newOptionId) {
		if (oldOptionId < newOptionId) {
			counterRepository.adjust(oldOptionId, -1);
			counterRepository.adjust(newOptionId, 1);
		} else {
			counterRepository.adjust(newOptionId, 1);
			counterRepository.adjust(oldOptionId, -1);
		}
	}

	private String requestHash(long optionId) {
		try {
			byte[] hash = MessageDigest.getInstance("SHA-256")
					.digest(Long.toString(optionId).getBytes(StandardCharsets.UTF_8));
			return HexFormat.of().formatHex(hash);
		} catch (NoSuchAlgorithmException exception) {
			throw new IllegalStateException("SHA-256 is unavailable", exception);
		}
	}

	private void validateOpen(Poll poll) {
		if (poll.getStatus() == PollStatus.PAUSED) {
			throw new ResponseStatusException(CONFLICT, "POLL_PAUSED");
		}
		PollPhase phase = PollPhase.at(poll, Instant.now());
		if (phase == PollPhase.CLOSED) {
			throw new ResponseStatusException(CONFLICT, "POLL_CLOSED");
		}
		if (!phase.allowsVoting()) {
			throw new ResponseStatusException(CONFLICT, "POLL_NOT_STARTED");
		}
	}

	public record VoteResult(long ballotId, long optionId) {
	}
}
