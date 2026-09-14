package com.top.vote.repository;

import com.top.vote.domain.Ballot;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;

import jakarta.persistence.LockModeType;

import java.util.Optional;

public interface BallotRepository extends JpaRepository<Ballot, Long> {
	@Lock(LockModeType.PESSIMISTIC_WRITE)
	Optional<Ballot> findByPollIdAndVoterKey(long pollId, String voterKey);

	boolean existsByPollIdAndVoterKey(long pollId, String voterKey);

	long countByPollId(long pollId);
}
