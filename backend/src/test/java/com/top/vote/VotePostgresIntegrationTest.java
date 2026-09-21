package com.top.vote;

import com.top.vote.service.VoteResultService;
import com.top.vote.service.VoteService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.server.LocalServerPort;
import org.springframework.dao.DataAccessException;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.web.server.ResponseStatusException;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;

import java.io.BufferedReader;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.util.ArrayList;
import java.util.Base64;
import java.util.List;
import java.util.UUID;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.Executors;
import java.util.concurrent.TimeUnit;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

@Testcontainers
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT, properties = {
		"anonymous.voter.secret=0123456789abcdef0123456789abcdef",
		"spring.cache.type=none",
		"server.shutdown=immediate",
		"spring.flyway.placeholders.adminSeedPassword=test-admin-password"
})
class VotePostgresIntegrationTest {
	@Container
	static final PostgreSQLContainer<?> POSTGRES = new PostgreSQLContainer<>("postgres:17-alpine");

	@DynamicPropertySource
	static void database(DynamicPropertyRegistry registry) {
		registry.add("spring.datasource.url", POSTGRES::getJdbcUrl);
		registry.add("spring.datasource.username", POSTGRES::getUsername);
		registry.add("spring.datasource.password", POSTGRES::getPassword);
	}

	@Autowired
	VoteService voteService;
	@Autowired
	VoteResultService voteResultService;
	@Autowired
	JdbcClient jdbc;
	@LocalServerPort
	int port;

	long pollId;
	List<Long> optionIds;

	@BeforeEach
	void resetDatabase() {
		jdbc.sql("""
				TRUNCATE vote_history, idempotency_request, ballot_selection, ballot,
				         poll_option_counter, poll_option, poll, member RESTART IDENTITY CASCADE
				""").update();
		jdbc.sql("INSERT INTO member(id, email, password_hash, role) VALUES (1, 'owner', '{noop}test', 'ADMIN')")
				.update();
		pollId = jdbc.sql("""
				INSERT INTO poll(owner_id, title, poll_type, max_selections, status, starts_at, ends_at)
				VALUES (1, 'integration', 'SINGLE', 1, 'OPEN', clock_timestamp() - interval '1 hour',
				        clock_timestamp() + interval '2 hours') RETURNING id
				""").query(Long.class).single();
		optionIds = new ArrayList<>();
		for (int order = 1; order <= 2; order++) {
			long optionId = jdbc.sql("""
					INSERT INTO poll_option(poll_id, name, team, display_order)
					VALUES (:pollId, :name, :team, :displayOrder) RETURNING id
					""").param("pollId", pollId).param("name", "option-" + order)
					.param("team", "team · P" + order).param("displayOrder", order)
					.query(Long.class).single();
			optionIds.add(optionId);
			jdbc.sql("INSERT INTO poll_option_counter(option_id) VALUES (:optionId)")
					.param("optionId", optionId).update();
		}
	}

	@Test
	void preservesVoteIntegrityAcrossDuplicateIdempotencyRevoteAndRollback() throws Exception {
		String voter = voter(1);
		UUID firstKey = UUID.randomUUID();
		var first = voteService.castVote(pollId, optionIds.get(0), voter, firstKey);
		assertEquals(1, counter(optionIds.get(0)));

		var replay = voteService.castVote(pollId, optionIds.get(0), voter, firstKey);
		assertEquals(first.ballotId(), replay.ballotId());
		assertEquals(1, counter(optionIds.get(0)));
		assertThrows(DataAccessException.class, () -> jdbc.sql("""
				INSERT INTO ballot(poll_id, voter_key) VALUES (:pollId, :voterKey)
				""").param("pollId", pollId).param("voterKey", voter).update());

		voteService.castVote(pollId, optionIds.get(1), voter, UUID.randomUUID());
		assertEquals(0, counter(optionIds.get(0)));
		assertEquals(1, counter(optionIds.get(1)));
		assertEquals(1, count("vote_history"));

		jdbc.sql("""
				CREATE OR REPLACE FUNCTION reject_vote_history() RETURNS trigger LANGUAGE plpgsql AS $$
				BEGIN RAISE EXCEPTION 'forced history failure'; END $$
				""").update();
		jdbc.sql(
				"CREATE TRIGGER reject_vote_history BEFORE INSERT ON vote_history FOR EACH ROW EXECUTE FUNCTION reject_vote_history()")
				.update();
		UUID failedKey = UUID.randomUUID();
		assertThrows(RuntimeException.class,
				() -> voteService.castVote(pollId, optionIds.get(0), voter, failedKey));
		jdbc.sql("DROP TRIGGER reject_vote_history ON vote_history").update();

		assertEquals(optionIds.get(1), selectedOption(voter));
		assertEquals(0, counter(optionIds.get(0)));
		assertEquals(1, counter(optionIds.get(1)));
		assertEquals(1, count("vote_history"));
		assertEquals(0L, jdbc.sql("SELECT count(*) FROM idempotency_request WHERE idempotency_key=:key")
				.param("key", failedKey).query(Long.class).single());
	}

	@Test
	void hidesNumbersInsideT30AndBlocksVotesAfterCloseWhileShowingFinalResults() throws Exception {
		jdbc.sql("UPDATE poll SET ends_at=clock_timestamp() + interval '20 minutes' WHERE id=:id")
				.param("id", pollId).update();
		String voter = voter(2);
		voteService.castVote(pollId, optionIds.get(0), voter, UUID.randomUUID());
		var hidden = voteResultService.findResults(pollId, voter);
		String hiddenJson = HttpClient.newHttpClient().send(
				HttpRequest.newBuilder(uri("/api/polls/" + pollId + "/results")).GET().build(),
				HttpResponse.BodyHandlers.ofString()).body();
		assertEquals("RESULTS_HIDDEN", hidden.phase().name());
		assertTrue(hiddenJson.contains("\"participantCount\":1"));
		assertFalse(hiddenJson.contains("voteCount"));

		jdbc.sql("UPDATE poll SET ends_at=clock_timestamp() - interval '1 second' WHERE id=:id")
				.param("id", pollId).update();
		ResponseStatusException closed = assertThrows(ResponseStatusException.class,
				() -> voteService.castVote(pollId, optionIds.get(1), voter(3), UUID.randomUUID()));
		assertEquals("POLL_CLOSED", closed.getReason());
		var finalResult = voteResultService.findResults(pollId, voter(99));
		assertEquals(1L, finalResult.participantCount());
		assertNotNull(finalResult.results());
		assertEquals(1L, finalResult.results().getFirst().voteCount());
	}

	@Test
	void keepsCountersEqualToSuccessfulConcurrentVotesAndRevotes() throws Exception {
		List<String> voters = java.util.stream.IntStream.range(0, 20).mapToObj(this::voter).toList();
		runConcurrently(voters.stream()
				.map(voter -> (Runnable) () -> voteService.castVote(pollId, optionIds.get(0), voter, UUID.randomUUID()))
				.toList());
		assertEquals(20, counter(optionIds.get(0)));
		assertEquals(20, selectionCount());

		runConcurrently(voters.stream()
				.map(voter -> (Runnable) () -> voteService.castVote(pollId, optionIds.get(1), voter, UUID.randomUUID()))
				.toList());
		assertEquals(0, counter(optionIds.get(0)));
		assertEquals(20, counter(optionIds.get(1)));
		assertEquals(20, selectionCount());
	}

	@Test
	void emitsCommittedVoteAndSendsNoOptionCountsForT30Sse() throws Exception {
		HttpClient client = HttpClient.newBuilder().connectTimeout(Duration.ofSeconds(5)).build();
		String token = Base64.getUrlEncoder().withoutPadding().encodeToString(new byte[32]);
		String cookie = "anonymous_token=" + token;
		HttpResponse<InputStream> stream = client
				.sendAsync(HttpRequest.newBuilder(uri("/api/polls/" + pollId + "/stream"))
						.header("Cookie", cookie).GET().build(), HttpResponse.BodyHandlers.ofInputStream())
				.get(5, TimeUnit.SECONDS);
		BufferedReader reader = new BufferedReader(new InputStreamReader(stream.body(), StandardCharsets.UTF_8));
		assertTrue(readEvent(reader).contains("event:vote-result"));

		HttpResponse<String> vote = client.send(HttpRequest.newBuilder(uri("/api/polls/" + pollId + "/votes"))
				.header("Cookie", cookie).header("Content-Type", "application/json")
				.header("Idempotency-Key", UUID.randomUUID().toString())
				.POST(HttpRequest.BodyPublishers.ofString("{\"optionId\":" + optionIds.get(0) + "}"))
				.build(), HttpResponse.BodyHandlers.ofString());
		assertEquals(201, vote.statusCode());
		String committedEvent = readEventWithTimeout(reader);
		assertTrue(committedEvent.contains("event:vote-result"));
		assertTrue(committedEvent.contains("\"voteCount\":1"));
		reader.close();

		jdbc.sql("UPDATE poll SET ends_at=clock_timestamp() + interval '20 minutes' WHERE id=:id")
				.param("id", pollId).update();
		HttpResponse<InputStream> hiddenStream = client.sendAsync(HttpRequest
				.newBuilder(uri("/api/polls/" + pollId + "/stream"))
				.header("Cookie",
						"anonymous_token=" + Base64.getUrlEncoder().withoutPadding().encodeToString(new byte[32]))
				.GET().build(), HttpResponse.BodyHandlers.ofInputStream()).get(5, TimeUnit.SECONDS);
		try (BufferedReader hiddenReader = new BufferedReader(
				new InputStreamReader(hiddenStream.body(), StandardCharsets.UTF_8))) {
			String hiddenEvent = readEventWithTimeout(hiddenReader);
			assertTrue(hiddenEvent.contains("event:phase-changed"));
			assertTrue(hiddenEvent.contains("RESULTS_HIDDEN"));
			assertFalse(hiddenEvent.contains("voteCount"));
		}
	}

	private URI uri(String path) {
		return URI.create("http://127.0.0.1:" + port + path);
	}

	private String readEventWithTimeout(BufferedReader reader) throws Exception {
		try (var executor = Executors.newVirtualThreadPerTaskExecutor()) {
			return executor.submit(() -> readEvent(reader)).get(5, TimeUnit.SECONDS);
		}
	}

	private String readEvent(BufferedReader reader) throws Exception {
		StringBuilder event = new StringBuilder();
		for (String line; (line = reader.readLine()) != null && !line.isBlank();)
			event.append(line).append('\n');
		return event.toString();
	}

	private void runConcurrently(List<Runnable> tasks) throws Exception {
		CountDownLatch ready = new CountDownLatch(tasks.size());
		CountDownLatch start = new CountDownLatch(1);
		try (var executor = Executors.newFixedThreadPool(tasks.size())) {
			var futures = tasks.stream().map(task -> executor.submit(() -> {
				ready.countDown();
				start.await();
				task.run();
				return null;
			})).toList();
			assertTrue(ready.await(5, TimeUnit.SECONDS));
			start.countDown();
			for (var future : futures)
				future.get(20, TimeUnit.SECONDS);
		}
	}

	private String voter(int number) {
		return "%064d".formatted(number + 1000);
	}

	private long counter(long optionId) {
		return jdbc.sql("SELECT vote_count FROM poll_option_counter WHERE option_id=:id")
				.param("id", optionId).query(Long.class).single();
	}

	private long selectedOption(String voter) {
		return jdbc.sql("""
				SELECT selection.option_id FROM ballot_selection selection
				JOIN ballot ON ballot.id=selection.ballot_id
				WHERE ballot.poll_id=:pollId AND ballot.voter_key=:voter
				""").param("pollId", pollId).param("voter", voter).query(Long.class).single();
	}

	private long count(String table) {
		return jdbc.sql("SELECT count(*) FROM " + table).query(Long.class).single();
	}

	private long selectionCount() {
		return count("ballot_selection");
	}
}
