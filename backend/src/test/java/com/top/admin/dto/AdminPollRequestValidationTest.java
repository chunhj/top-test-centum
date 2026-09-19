package com.top.admin.dto;

import jakarta.validation.ConstraintViolation;
import jakarta.validation.Validation;
import jakarta.validation.Validator;
import jakarta.validation.ValidatorFactory;
import org.junit.jupiter.api.AfterAll;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.Test;

import java.time.Instant;
import java.util.List;
import java.util.Set;

import static org.junit.jupiter.api.Assertions.assertTrue;

/**
 * AdminPollRequest previously accepted any positive maxSelections and any
 * non-blank pollType. VoteService.castVote() hardcodes a rejection of any
 * poll whose maxSelections != 1, so an admin could create a poll (e.g.
 * maxSelections = 2) that publishes successfully but that nobody can ever
 * vote on. This locks that down at request-validation time instead.
 */
class AdminPollRequestValidationTest {
	private static ValidatorFactory factory;
	private static Validator validator;

	@BeforeAll
	static void setUp() {
		factory = Validation.buildDefaultValidatorFactory();
		validator = factory.getValidator();
	}

	@AfterAll
	static void tearDown() {
		factory.close();
	}

	@Test
	void acceptsSingleSelectionWithSupportedPollType() {
		Set<ConstraintViolation<AdminPollRequest>> violations = validator.validate(validRequest("SINGLE", 1));
		assertTrue(violations.isEmpty(), violations::toString);
	}

	@Test
	void rejectsMaxSelectionsGreaterThanOne() {
		Set<ConstraintViolation<AdminPollRequest>> violations = validator.validate(validRequest("SINGLE", 2));
		assertTrue(violations.stream().anyMatch(v -> v.getPropertyPath().toString().equals("maxSelections")));
	}

	@Test
	void rejectsUnsupportedPollType() {
		Set<ConstraintViolation<AdminPollRequest>> violations = validator.validate(validRequest("MULTI_SELECT", 1));
		assertTrue(violations.stream().anyMatch(v -> v.getPropertyPath().toString().equals("pollType")));
	}

	private AdminPollRequest validRequest(String pollType, int maxSelections) {
		return new AdminPollRequest("제목", "설명", pollType, maxSelections,
				Instant.now(), Instant.now().plusSeconds(3600),
				List.of(new AdminPollRequest.Option("옵션1", null, null)));
	}
}
