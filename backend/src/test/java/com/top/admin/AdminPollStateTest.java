package com.top.admin;

import com.top.poll.domain.Poll;
import com.top.poll.domain.PollStatus;
import org.junit.jupiter.api.Test;

import java.time.Instant;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;

class AdminPollStateTest {
	private static final Instant NOW = Instant.parse("2026-09-16T00:00:00Z");

	@Test
	void allowsOnlyScheduledOpenPausedOpenClosedFlow() {
		Poll poll = Poll.schedule(1, "투표", null, "SINGLE", 1, NOW.minusSeconds(1), NOW.plusSeconds(60));

		poll.start(NOW);
		assertEquals(PollStatus.OPEN, poll.getStatus());
		poll.pause();
		assertEquals(PollStatus.PAUSED, poll.getStatus());
		poll.resume(NOW);
		poll.close();
		assertEquals(PollStatus.CLOSED, poll.getStatus());
		assertThrows(IllegalStateException.class, () -> poll.start(NOW));
	}

	@Test
	void rejectsStartOutsideServerTimeWindow() {
		Poll poll = Poll.schedule(1, "투표", null, "SINGLE", 1, NOW.plusSeconds(1), NOW.plusSeconds(60));
		assertThrows(IllegalStateException.class, () -> poll.start(NOW));
	}
}
