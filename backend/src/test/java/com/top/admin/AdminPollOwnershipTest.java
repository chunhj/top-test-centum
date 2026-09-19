package com.top.admin;

import com.top.admin.repository.AdminPollQueryRepository;
import com.top.admin.service.AdminPollService;
import com.top.common.security.AuthenticatedMember;
import com.top.poll.domain.Poll;
import com.top.poll.domain.PollStatus;
import com.top.poll.repository.PollRepository;
import com.top.vote.repository.PollOptionCounterRepository;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.data.domain.PageImpl;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.web.server.ResponseStatusException;

import java.time.Instant;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.http.HttpStatus.NOT_FOUND;

/**
 * Covers the fix for AdminPollService's owner scoping: it used to always
 * scope/authorize against a hardcoded ADMIN_OWNER_ID (1L) regardless of who
 * was actually authenticated, so a second admin account would see and be
 * able to manage the first admin's polls. AdminPollService now reads the
 * member id off the authenticated principal (AuthenticatedMember) via
 * SecurityContextHolder instead.
 */
class AdminPollOwnershipTest {
	private PollRepository pollRepository;
	private AdminPollQueryRepository queryRepository;
	private PollOptionCounterRepository counterRepository;
	private AdminPollService service;

	@BeforeEach
	void setUp() {
		pollRepository = mock(PollRepository.class);
		queryRepository = mock(AdminPollQueryRepository.class);
		counterRepository = mock(PollOptionCounterRepository.class);
		service = new AdminPollService(pollRepository, queryRepository, counterRepository);
		when(queryRepository.find(anyLong(), any(), any(), any(), any())).thenReturn(new PageImpl<>(List.of()));
	}

	@AfterEach
	void clearContext() {
		SecurityContextHolder.clearContext();
	}

	@Test
	void scopesQueryToTheAuthenticatedMemberId() {
		authenticateAs(42L);

		service.find(null, null, "createdAt", 0, 20);

		verify(queryRepository).find(eq(42L), eq(null), eq(null), eq("createdAt"), any());
	}

	@Test
	void rejectsTransitionOnAnotherMembersPoll() {
		authenticateAs(42L);
		Poll othersPoll = Poll.schedule(99L, "다른 관리자의 투표", null, "SINGLE", 1,
				Instant.now().minusSeconds(60), Instant.now().plusSeconds(600));
		when(pollRepository.findByIdForUpdate(1L)).thenReturn(Optional.of(othersPoll));

		ResponseStatusException exception = assertThrows(ResponseStatusException.class,
				() -> service.transition(1L, "close"));
		assertEquals(NOT_FOUND, exception.getStatusCode());
	}

	@Test
	void allowsTransitionOnOwnPoll() {
		authenticateAs(42L);
		Poll ownPoll = Poll.schedule(42L, "내 투표", null, "SINGLE", 1,
				Instant.now().minusSeconds(60), Instant.now().plusSeconds(600));
		ReflectionTestUtils.setField(ownPoll, "id", 1L);
		ownPoll.start(Instant.now());
		when(pollRepository.findByIdForUpdate(1L)).thenReturn(Optional.of(ownPoll));

		service.transition(1L, "close");

		assertEquals(PollStatus.CLOSED, ownPoll.getStatus());
	}

	private void authenticateAs(long memberId) {
		AuthenticatedMember principal = new AuthenticatedMember(memberId, "admin" + memberId, "hash", "ADMIN");
		SecurityContextHolder.getContext().setAuthentication(
				new UsernamePasswordAuthenticationToken(principal, null, principal.getAuthorities()));
	}
}
