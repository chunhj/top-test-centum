package com.top.poll.domain;

import java.time.Instant;
import java.time.temporal.ChronoUnit;

public enum PollPhase {
	NOT_OPEN, SCHEDULED, LIVE_VISIBLE, RESULTS_HIDDEN, CLOSED;

	public static PollPhase at(Poll poll, Instant now) {
		if (poll.getStatus() == PollStatus.CLOSED || !now.isBefore(poll.getEndsAt())) {
			return CLOSED;
		}
		if (poll.getStatus() != PollStatus.OPEN) {
			return NOT_OPEN;
		}
		if (now.isBefore(poll.getStartsAt())) {
			return SCHEDULED;
		}
		if (!now.isBefore(poll.getEndsAt().minus(30, ChronoUnit.MINUTES))) {
			return RESULTS_HIDDEN;
		}
		return LIVE_VISIBLE;
	}

	public boolean allowsVoting() {
		return this == LIVE_VISIBLE || this == RESULTS_HIDDEN;
	}
}
