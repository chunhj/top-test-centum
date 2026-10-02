package com.top.auth;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpHeaders;
import org.springframework.http.ResponseCookie;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.security.GeneralSecurityException;
import java.security.SecureRandom;
import java.util.Base64;
import java.util.HexFormat;

@Component
public class AnonymousVoterFilter extends OncePerRequestFilter {
	public static final String VOTER_KEY_ATTRIBUTE = "voterKey";
	static final String COOKIE_NAME = "anonymous_token";
	private static final SecureRandom RANDOM = new SecureRandom();
	private final byte[] secret;
	// Browsers drop Secure cookies received over plain HTTP (except localhost), which would make every
	// request look like a new voter. Keep true in production (HTTPS); only disable for HTTP LAN testing.
	private final boolean cookieSecure;

	public AnonymousVoterFilter(@Value("${anonymous.voter.secret}") String secret,
			@Value("${anonymous.cookie.secure:true}") boolean cookieSecure) {
		if (secret.getBytes(StandardCharsets.UTF_8).length < 32) {
			throw new IllegalArgumentException("ANONYMOUS_VOTER_SECRET must be at least 32 bytes");
		}
		this.secret = secret.getBytes(StandardCharsets.UTF_8);
		this.cookieSecure = cookieSecure;
	}

	@Override
	protected boolean shouldNotFilter(HttpServletRequest request) {
		return !request.getRequestURI().startsWith("/api/");
	}

	@Override
	protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain chain)
			throws ServletException, IOException {
		String token = findToken(request);
		if (token == null) {
			token = newToken();
			response.addHeader(HttpHeaders.SET_COOKIE, ResponseCookie.from(COOKIE_NAME, token)
					.httpOnly(true).secure(cookieSecure).sameSite("Lax").path("/").build().toString());
		}
		request.setAttribute(VOTER_KEY_ATTRIBUTE, voterKey(token));
		chain.doFilter(request, response);
	}

	private String findToken(HttpServletRequest request) {
		if (request.getCookies() == null) {
			return null;
		}
		for (Cookie cookie : request.getCookies()) {
			if (COOKIE_NAME.equals(cookie.getName()) && cookie.getValue().matches("[A-Za-z0-9_-]{43}")) {
				return cookie.getValue();
			}
		}
		return null;
	}

	private String newToken() {
		byte[] bytes = new byte[32];
		RANDOM.nextBytes(bytes);
		return Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
	}

	private String voterKey(String token) {
		try {
			Mac mac = Mac.getInstance("HmacSHA256");
			mac.init(new SecretKeySpec(secret, "HmacSHA256"));
			return HexFormat.of().formatHex(mac.doFinal(token.getBytes(StandardCharsets.UTF_8)));
		} catch (GeneralSecurityException e) {
			throw new IllegalStateException("HMAC-SHA256 is unavailable", e);
		}
	}
}
