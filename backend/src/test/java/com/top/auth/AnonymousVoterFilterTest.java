package com.top.auth;

import jakarta.servlet.http.Cookie;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;

import java.util.concurrent.atomic.AtomicReference;

import static org.assertj.core.api.Assertions.assertThat;

class AnonymousVoterFilterTest {
	private final AnonymousVoterFilter filter = new AnonymousVoterFilter("0123456789abcdef0123456789abcdef");

	@Test
	void issuesSecureCookieAndDerivesStableNonRawVoterKey() throws Exception {
		MockHttpServletRequest firstRequest = new MockHttpServletRequest("GET", "/api/polls");
		MockHttpServletResponse firstResponse = new MockHttpServletResponse();
		AtomicReference<String> firstVoterKey = new AtomicReference<>();

		filter.doFilter(firstRequest, firstResponse,
				(request, response) -> firstVoterKey.set((String) request.getAttribute(AnonymousVoterFilter.VOTER_KEY_ATTRIBUTE)));

		String setCookie = firstResponse.getHeader("Set-Cookie");
		String token = setCookie.substring(setCookie.indexOf('=') + 1, setCookie.indexOf(';'));
		assertThat(setCookie).contains("HttpOnly", "Secure", "SameSite=Lax", "Path=/");
		assertThat(firstVoterKey.get()).hasSize(64).doesNotContain(token);

		MockHttpServletRequest nextRequest = new MockHttpServletRequest("GET", "/api/polls/1");
		nextRequest.setCookies(new Cookie(AnonymousVoterFilter.COOKIE_NAME, token));
		MockHttpServletResponse nextResponse = new MockHttpServletResponse();
		AtomicReference<String> nextVoterKey = new AtomicReference<>();

		filter.doFilter(nextRequest, nextResponse,
				(request, response) -> nextVoterKey.set((String) request.getAttribute(AnonymousVoterFilter.VOTER_KEY_ATTRIBUTE)));

		assertThat(nextResponse.getHeader("Set-Cookie")).isNull();
		assertThat(nextVoterKey.get()).isEqualTo(firstVoterKey.get());
	}
}
