package com.top.common.security;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.security.crypto.factory.PasswordEncoderFactories;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.HttpStatusEntryPoint;
import org.springframework.security.web.util.matcher.RequestMatcher;

@Configuration
public class SecurityConfig {
	@Bean
	SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
		// Spring now serves the app on the public port itself (no Nginx in front), so actuator
		// endpoints must stay reachable only from inside the container/host (e.g. load-test metrics).
		RequestMatcher externalActuator = request -> request.getRequestURI().startsWith("/actuator")
				&& !isLoopback(request.getRemoteAddr());
		return http.csrf(csrf -> csrf.disable())
				.authorizeHttpRequests(auth -> auth.requestMatchers("/api/admin/**").hasRole("ADMIN")
						.requestMatchers(externalActuator).denyAll()
						.anyRequest().permitAll())
				.httpBasic(basic -> basic.authenticationEntryPoint(new HttpStatusEntryPoint(HttpStatus.UNAUTHORIZED))).build();
	}

	private static boolean isLoopback(String address) {
		return "127.0.0.1".equals(address) || "::1".equals(address) || "0:0:0:0:0:0:0:1".equals(address);
	}

	@Bean
	PasswordEncoder passwordEncoder() {
		return PasswordEncoderFactories.createDelegatingPasswordEncoder();
	}

	@Bean
	UserDetailsService userDetailsService(JdbcClient jdbcClient) {
		return username -> jdbcClient.sql("SELECT id, email, password_hash, role FROM member WHERE email = :username")
				.param("username", username)
				.query((resultSet, rowNumber) -> new AuthenticatedMember(
						resultSet.getLong("id"),
						resultSet.getString("email"),
						resultSet.getString("password_hash"),
						resultSet.getString("role")))
				.optional()
				.orElseThrow(() -> new UsernameNotFoundException(username));
	}
}
