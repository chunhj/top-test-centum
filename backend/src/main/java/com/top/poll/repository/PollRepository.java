package com.top.poll.repository;

import com.top.poll.domain.Poll;
import com.top.poll.domain.PollStatus;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;

import jakarta.persistence.LockModeType;

import java.util.List;
import java.util.Optional;

public interface PollRepository extends JpaRepository<Poll, Long> {
	List<Poll> findAllByStatusOrderByCreatedAtDesc(PollStatus status);

	@Override
	@EntityGraph(attributePaths = "options")
	Optional<Poll> findById(Long id);

	@Lock(LockModeType.PESSIMISTIC_WRITE)
	@EntityGraph(attributePaths = "options")
	@Query("select p from Poll p where p.id = :id")
	Optional<Poll> findByIdForUpdate(long id);

	/**
	 * Shared (non-exclusive) lock variant of {@link #findByIdForUpdate(long)},
	 * for readers that must be excluded from a concurrent admin transition()
	 * but must NOT be excluded from each other. Maps to PostgreSQL's
	 * {@code SELECT ... FOR SHARE}: any number of callers can hold this lock
	 * on the same Poll row at once, so concurrent votes on the same poll no
	 * longer serialize behind one another. It still blocks while a
	 * transition() (which takes {@link #findByIdForUpdate(long)}'s exclusive
	 * PESSIMISTIC_WRITE lock) is in flight, and a transition() still blocks
	 * until every in-flight vote holding this shared lock has committed -- so
	 * the vote/admin-transition TOCTOU protection is unchanged, only the
	 * vote-vs-vote serialization is removed.
	 */
	@Lock(LockModeType.PESSIMISTIC_READ)
	@EntityGraph(attributePaths = "options")
	@Query("select p from Poll p where p.id = :id")
	Optional<Poll> findByIdForShare(long id);
}
