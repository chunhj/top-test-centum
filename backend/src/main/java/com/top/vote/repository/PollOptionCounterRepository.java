package com.top.vote.repository;

import lombok.RequiredArgsConstructor;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Repository;

import java.math.BigDecimal;
import java.util.List;

@Repository
@RequiredArgsConstructor
public class PollOptionCounterRepository {
	private final JdbcClient jdbcClient;

	public void initialize(List<Long> optionIds) {
		optionIds.forEach(optionId -> jdbcClient.sql("INSERT INTO poll_option_counter(option_id) VALUES (:optionId) ON CONFLICT DO NOTHING")
				.param("optionId", optionId).update());
	}

	public void adjust(long optionId, int delta) {
		int updated = jdbcClient.sql("""
				UPDATE poll_option_counter
				SET vote_count = vote_count + :delta
				WHERE option_id = :optionId
				  AND vote_count + :delta >= 0
				""")
				.param("optionId", optionId)
				.param("delta", delta)
				.update();
		if (updated != 1) {
			throw new IllegalStateException("Poll option counter could not be adjusted");
		}
	}

	public List<OptionResult> findResults(long pollId) {
		return jdbcClient.sql("""
				SELECT counter.option_id,
				       counter.vote_count,
				       CASE WHEN SUM(counter.vote_count) OVER () = 0 THEN 0
				            ELSE ROUND(counter.vote_count * 100.0 / SUM(counter.vote_count) OVER (), 1)
				       END AS percentage
				FROM poll_option_counter counter
				JOIN poll_option option ON option.id = counter.option_id
				WHERE option.poll_id = :pollId
				ORDER BY counter.vote_count DESC, option.display_order, counter.option_id
				""")
				.param("pollId", pollId)
				.query((resultSet, rowNumber) -> new OptionResult(
						resultSet.getLong("option_id"),
						resultSet.getLong("vote_count"),
						resultSet.getBigDecimal("percentage")))
				.list();
	}

	public record OptionResult(long optionId, long voteCount, BigDecimal percentage) {
	}
}
