package com.top.common.config;

import org.springframework.context.annotation.Configuration;
import org.springframework.scheduling.annotation.EnableScheduling;

/**
 * Enables VoteStreamService's scheduled latest-result fan-out and phase sweep.
 * The phase sweep also notifies subscribers when a poll crosses a boundary
 * (such as T-30) without a vote being cast at that moment.
 */
@Configuration
@EnableScheduling
public class AsyncConfig {
}
