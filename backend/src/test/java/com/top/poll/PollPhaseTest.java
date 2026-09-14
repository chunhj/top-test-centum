package com.top.poll;

import com.top.poll.domain.Poll;
import com.top.poll.domain.PollPhase;
import com.top.poll.domain.PollStatus;
import org.junit.jupiter.api.Test;

import java.time.Instant;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

class PollPhaseTest {
	private static final Instant START = Instant.parse("2026-09-12T00:00:00Z");
	private static final Instant END = Instant.parse("2026-09-12T02:00:00Z");

	@Test
	void calculatesServerPhaseIncludingExactT30Boundary() {
		Poll poll = poll(PollStatus.OPEN);

		assertEquals(PollPhase.SCHEDULED, PollPhase.at(poll, START.minusNanos(1)));
		assertEquals(PollPhase.LIVE_VISIBLE, PollPhase.at(poll, START));
		assertEquals(PollPhase.LIVE_VISIBLE, PollPhase.at(poll, END.minusSeconds(1800).minusNanos(1)));
		assertEquals(PollPhase.RESULTS_HIDDEN, PollPhase.at(poll, END.minusSeconds(1800)));
		assertEquals(PollPhase.RESULTS_HIDDEN, PollPhase.at(poll, END.minusNanos(1)));
		assertEquals(PollPhase.CLOSED, PollPhase.at(poll, END));
		assertEquals(PollPhase.NOT_OPEN, PollPhase.at(poll(PollStatus.PAUSED), START));
		assertEquals(PollPhase.NOT_OPEN, PollPhase.at(poll(PollStatus.SCHEDULED), START));
		assertEquals(PollPhase.CLOSED, PollPhase.at(poll(PollStatus.CLOSED), START));
	}

	private Poll poll(PollStatus status) {
		Poll poll = mock(Poll.class);
		when(poll.getStatus()).thenReturn(status);
		when(poll.getStartsAt()).thenReturn(START);
		when(poll.getEndsAt()).thenReturn(END);
		return poll;
	}
}
