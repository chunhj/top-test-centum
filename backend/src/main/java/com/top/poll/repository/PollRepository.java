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
}
