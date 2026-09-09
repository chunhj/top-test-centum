package com.top.poll.repository;

import com.top.poll.domain.Poll;
import com.top.poll.domain.PollStatus;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface PollRepository extends JpaRepository<Poll, Long> {
	List<Poll> findAllByStatusOrderByCreatedAtDesc(PollStatus status);

	@Override
	@EntityGraph(attributePaths = "options")
	Optional<Poll> findById(Long id);
}
