package com.top.vote;

import com.top.vote.service.VoteService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.condition.EnabledIfEnvironmentVariable;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.simple.JdbcClient;

import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.Executors;
import java.util.concurrent.TimeUnit;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

@SpringBootTest(properties = {
		"anonymous.voter.secret=0123456789abcdef0123456789abcdef",
		"spring.cache.type=none"
})
@EnabledIfEnvironmentVariable(named = "POSTGRES_CONCURRENCY_TEST", matches = "true")
class VoteConcurrencyTest {
	@Autowired
	private VoteService voteService;

	@Autowired
	private JdbcClient jdbcClient;

	@BeforeEach
	void cleanDatabase() {
		jdbcClient.sql("""
				TRUNCATE vote_history, idempotency_request, ballot_selection, ballot,
				         poll_option_counter, poll_option, poll RESTART IDENTITY CASCADE
				""").update();
	}

	@Test
	void keepsCountersConsistentDuringConcurrentVotesAndRevotes() throws Exception {
		long pollId = insertPoll();
		List<Long> optionIds = insertOptions(pollId);
		List<String> voters = java.util.stream.IntStream.range(0, 24)
				.mapToObj(index -> "%064d".formatted(index))
				.toList();

		runConcurrently(java.util.stream.IntStream.range(0, voters.size())
				.mapToObj(index -> vote(pollId, optionIds.get(index % optionIds.size()), voters.get(index)))
				.toList());
		assertCountersMatchSelections(optionIds);

		runConcurrently(java.util.stream.IntStream.range(0, voters.size())
				.mapToObj(index -> vote(pollId, optionIds.get((index + 1) % optionIds.size()), voters.get(index)))
				.toList());
		assertCountersMatchSelections(optionIds);

		List<Runnable> sameBallotRevotes = new ArrayList<>();
		for (int index = 0; index < 12; index++) {
			sameBallotRevotes.add(vote(pollId, optionIds.get(index % optionIds.size()), voters.getFirst()));
		}
		runConcurrently(sameBallotRevotes);
		assertCountersMatchSelections(optionIds);
	}

	private long insertPoll() {
		return jdbcClient.sql("""
				INSERT INTO poll (owner_id, title, poll_type, max_selections, status, starts_at, ends_at)
				VALUES (1, 'concurrency', 'SINGLE', 1, 'OPEN', CURRENT_TIMESTAMP - INTERVAL '1 hour',
				        CURRENT_TIMESTAMP + INTERVAL '1 hour')
				RETURNING id
				""").query(Long.class).single();
	}

	private List<Long> insertOptions(long pollId) {
		List<Long> optionIds = new ArrayList<>();
		for (int index = 0; index < 3; index++) {
			long optionId = jdbcClient.sql("""
					INSERT INTO poll_option (poll_id, name, display_order)
					VALUES (:pollId, :name, :displayOrder)
					RETURNING id
					""")
					.param("pollId", pollId)
					.param("name", "option-" + index)
					.param("displayOrder", index)
					.query(Long.class)
					.single();
			optionIds.add(optionId);
			jdbcClient.sql("INSERT INTO poll_option_counter (option_id) VALUES (:optionId)")
					.param("optionId", optionId)
					.update();
		}
		return optionIds;
	}

	private Runnable vote(long pollId, long optionId, String voterKey) {
		return () -> voteService.castVote(pollId, optionId, voterKey, UUID.randomUUID());
	}

	private void runConcurrently(List<Runnable> votes) throws Exception {
		CountDownLatch ready = new CountDownLatch(votes.size());
		CountDownLatch start = new CountDownLatch(1);
		try (var executor = Executors.newFixedThreadPool(votes.size())) {
			var futures = votes.stream().map(vote -> executor.submit(() -> {
				ready.countDown();
				start.await();
				vote.run();
				return null;
			})).toList();
			assertTrue(ready.await(5, TimeUnit.SECONDS));
			start.countDown();
			for (var future : futures) {
				future.get(20, TimeUnit.SECONDS);
			}
		}
	}

	private void assertCountersMatchSelections(List<Long> optionIds) {
		for (long optionId : optionIds) {
			long counter = jdbcClient.sql("SELECT vote_count FROM poll_option_counter WHERE option_id = :optionId")
					.param("optionId", optionId)
					.query(Long.class)
					.single();
			long selections = jdbcClient.sql("SELECT COUNT(*) FROM ballot_selection WHERE option_id = :optionId")
					.param("optionId", optionId)
					.query(Long.class)
					.single();
			assertEquals(selections, counter);
		}
	}
}
