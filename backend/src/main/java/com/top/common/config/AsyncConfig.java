package com.top.common.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.scheduling.annotation.EnableAsync;
import org.springframework.scheduling.annotation.EnableScheduling;
import org.springframework.scheduling.concurrent.ThreadPoolTaskExecutor;

import java.util.concurrent.Executor;

/**
 * Background-task infrastructure:
 * - Dedicated, bounded executor for VoteStreamService's SSE fan-out
 *   (VoteStreamService.publishAfterCommit), so broadcasting a vote result to
 *   a poll's subscribers never runs on the HTTP request thread that just
 *   committed the vote, and a burst of votes cannot spin up unbounded
 *   threads.
 * - @EnableScheduling for VoteStreamService.checkPhaseTransitions(), the
 *   periodic sweep that notifies subscribers about a poll crossing a phase
 *   boundary (e.g. the T-30 "hide results" cutoff) even when nobody happens
 *   to be voting right at that moment.
 */
@Configuration
@EnableAsync
@EnableScheduling
public class AsyncConfig {
	@Bean("sseFanOutExecutor")
	Executor sseFanOutExecutor() {
		ThreadPoolTaskExecutor executor = new ThreadPoolTaskExecutor();
		executor.setCorePoolSize(4);
		executor.setMaxPoolSize(16);
		executor.setQueueCapacity(500);
		executor.setThreadNamePrefix("sse-fanout-");
		executor.initialize();
		return executor;
	}
}
