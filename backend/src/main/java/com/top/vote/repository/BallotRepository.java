package com.top.vote.repository;

import com.top.vote.domain.Ballot;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import jakarta.persistence.LockModeType;

import java.util.Collection;
import java.util.List;
import java.util.Optional;

public interface BallotRepository extends JpaRepository<Ballot, Long> {
	@Lock(LockModeType.PESSIMISTIC_WRITE)
	Optional<Ballot> findByPollIdAndVoterKey(long pollId, String voterKey);

	long countByPollId(long pollId);

	/** The option this voter currently has selected in the poll; empty when they have not voted. */
	@Query("select s.option.id from BallotSelection s where s.ballot.poll.id = :pollId and s.ballot.voterKey = :voterKey")
	Optional<Long> findSelectedOptionId(@Param("pollId") long pollId, @Param("voterKey") String voterKey);

	/** Participant counts for several polls in one query. Polls without any ballot are absent from the result. */
	@Query("select new com.top.vote.repository.PollParticipantCount(b.poll.id, count(b)) "
			+ "from Ballot b where b.poll.id in :pollIds group by b.poll.id")
	List<PollParticipantCount> countParticipantsByPollIds(@Param("pollIds") Collection<Long> pollIds);
}
