package com.top.vote;

import com.top.common.config.AsyncConfig;
import com.top.poll.domain.Poll;
import com.top.poll.domain.PollPhase;
import com.top.poll.domain.PollStatus;
import com.top.poll.repository.PollRepository;
import com.top.vote.service.VoteResultService;
import com.top.vote.service.VoteStreamService;
import org.junit.jupiter.api.Test;
import org.springframework.context.annotation.AnnotationConfigApplicationContext;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.Optional;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicReference;

import static org.junit.jupiter.api.Assertions.assertNotEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

/**
 * Confirms that VoteStreamService.publishAfterCommit() is genuinely
 * offloaded off the calling thread via @Async, not just structurally
 * refactored. A plain "new VoteStreamService(...)" unit test would call the
 * @Async method directly with no Spring AOP proxy involved, so it would
 * silently run synchronously even if the annotation were removed by
 * mistake -- this test goes through a real Spring context (with
 * AsyncConfig's @EnableAsync) so the proxy is actually in play.
 */
class VoteStreamAsyncFanOutTest {
	@Test
	void publishAfterCommitRunsOnTheDedicatedFanOutExecutorNotTheCallerThread() throws InterruptedException {
		try (AnnotationConfigApplicationContext context = new AnnotationConfigApplicationContext()) {
			context.register(AsyncConfig.class);

			PollRepository pollRepository = mock(PollRepository.class);
			Poll poll = mock(Poll.class);
			when(poll.getStatus()).thenReturn(PollStatus.OPEN);
			when(poll.getStartsAt()).thenReturn(Instant.now().minus(1, ChronoUnit.HOURS));
			when(poll.getEndsAt()).thenReturn(Instant.now().plus(1, ChronoUnit.HOURS));
			when(pollRepository.findById(1L)).thenReturn(Optional.of(poll));

			VoteResultService voteResultService = mock(VoteResultService.class);
			CountDownLatch executed = new CountDownLatch(1);
			AtomicReference<String> executingThreadName = new AtomicReference<>();
			when(voteResultService.loadSnapshot(1L)).thenAnswer(invocation -> {
				executingThreadName.set(Thread.currentThread().getName());
				executed.countDown();
				return new VoteResultService.ResultSnapshot(1L, PollPhase.RESULTS_HIDDEN, 0L, null);
			});

			context.registerBean(VoteStreamService.class,
					() -> new VoteStreamService(pollRepository, voteResultService));
			context.refresh();

			VoteStreamService service = context.getBean(VoteStreamService.class);
			service.subscribe(1L, "voter-async-check");

			String callerThreadName = Thread.currentThread().getName();
			service.publishAfterCommit(1L);

			assertTrue(executed.await(5, TimeUnit.SECONDS), "publishAfterCommit's work never ran");
			assertNotEquals(callerThreadName, executingThreadName.get(),
					"expected the fan-out to run off the calling thread, but it ran on: " + executingThreadName.get());
			assertTrue(executingThreadName.get().startsWith("sse-fanout-"),
					"expected the dedicated sseFanOutExecutor to run this, but got: " + executingThreadName.get());
		}
	}
}
