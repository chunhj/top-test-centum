package com.top.vote.repository;

import lombok.RequiredArgsConstructor;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.UUID;

@Repository
@RequiredArgsConstructor
public class IdempotencyRequestRepository {
	private final JdbcClient jdbcClient;

	public Long claim(String voterKey, long pollId, UUID idempotencyKey, String requestHash) {
		return jdbcClient.sql("""
				INSERT INTO idempotency_request (voter_key, poll_id, idempotency_key, request_hash)
				VALUES (:voterKey, :pollId, :idempotencyKey, :requestHash)
				ON CONFLICT (voter_key, poll_id, idempotency_key) DO NOTHING
				RETURNING id
				""")
				.param("voterKey", voterKey)
				.param("pollId", pollId)
				.param("idempotencyKey", idempotencyKey)
				.param("requestHash", requestHash)
				.query(Long.class)
				.optional()
				.orElse(null);
	}

	public Optional<StoredRequest> find(String voterKey, long pollId, UUID idempotencyKey) {
		return jdbcClient.sql("""
				SELECT request_hash,
				       (response_body ->> 'ballotId')::BIGINT AS ballot_id,
				       (response_body ->> 'optionId')::BIGINT AS option_id
				FROM idempotency_request
				WHERE voter_key = :voterKey
				  AND poll_id = :pollId
				  AND idempotency_key = :idempotencyKey
				  AND response_body IS NOT NULL
				""")
				.param("voterKey", voterKey)
				.param("pollId", pollId)
				.param("idempotencyKey", idempotencyKey)
				.query((resultSet, rowNumber) -> new StoredRequest(
						resultSet.getString("request_hash"),
						resultSet.getLong("ballot_id"),
						resultSet.getLong("option_id")))
				.optional();
	}

	public void complete(long requestId, long ballotId, long optionId) {
		int updated = jdbcClient.sql("""
				UPDATE idempotency_request
				SET response_body = jsonb_build_object('ballotId', :ballotId, 'optionId', :optionId)
				WHERE id = :requestId
				""")
				.param("requestId", requestId)
				.param("ballotId", ballotId)
				.param("optionId", optionId)
				.update();
		if (updated != 1) {
			throw new IllegalStateException("Idempotency request was not completed");
		}
	}

	public record StoredRequest(String requestHash, long ballotId, long optionId) {
	}
}
