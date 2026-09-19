package com.top.support;

import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.testcontainers.containers.PostgreSQLContainer;

/**
 * Shared Testcontainers PostgreSQL instance for tests that boot a full
 * Spring context against a real Postgres (a context-load smoke test, a
 * concurrency test, ...) and would otherwise fall back to whatever
 * {@code spring.datasource.*} resolves to locally -- i.e. a developer's own
 * Postgres instance.
 *
 * <p>The container is started once per test JVM ("singleton container"
 * pattern) instead of per test class: it is a plain static field started in
 * a static initializer, not a JUnit-managed {@code @Container} field, so
 * every subclass running in the same JVM shares one instance rather than
 * each paying for its own container. It is never stopped explicitly --
 * Testcontainers' Ryuk reaper container tears it down once the test JVM
 * exits, the same guarantee an {@code @Container}-managed instance gets.
 *
 * <p>{@code VotePostgresIntegrationTest} intentionally keeps its own
 * {@code @Container} instance instead of extending this class: it already
 * has a working, self-contained setup and there is no need to disturb it.
 * This base class exists for the tests that previously connected to
 * whatever local Postgres {@code spring.datasource.url} resolved to.
 */
public abstract class AbstractPostgresIntegrationTest {

	protected static final PostgreSQLContainer<?> POSTGRES = new PostgreSQLContainer<>("postgres:17-alpine");

	static {
		POSTGRES.start();
	}

	@DynamicPropertySource
	static void overridePostgresProperties(DynamicPropertyRegistry registry) {
		registry.add("spring.datasource.url", POSTGRES::getJdbcUrl);
		registry.add("spring.datasource.username", POSTGRES::getUsername);
		registry.add("spring.datasource.password", POSTGRES::getPassword);
	}
}
