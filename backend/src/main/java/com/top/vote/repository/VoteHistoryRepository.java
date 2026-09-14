package com.top.vote.repository;

import com.top.vote.domain.VoteHistory;
import org.springframework.data.jpa.repository.JpaRepository;

public interface VoteHistoryRepository extends JpaRepository<VoteHistory, Long> {
}
