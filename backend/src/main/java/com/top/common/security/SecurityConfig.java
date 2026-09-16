package com.top.common.security;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.security.config.Customizer;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.core.userdetails.User;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.security.crypto.factory.PasswordEncoderFactories;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;

@Configuration
public class SecurityConfig {
	@Bean
	SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
		return http.csrf(csrf -> csrf.disable())
				.authorizeHttpRequests(auth -> auth.requestMatchers("/api/admin/**").hasRole("ADMIN").anyRequest().permitAll())
				.httpBasic(Customizer.withDefaults()).build();
	}

	@Bean
	PasswordEncoder passwordEncoder() {
		return PasswordEncoderFactories.createDelegatingPasswordEncoder();
	}

	@Bean
	UserDetailsService userDetailsService(JdbcClient jdbcClient) {
		return username -> jdbcClient.sql("SELECT email, password_hash, role FROM member WHERE email = :username")
				.param("username", username)
				.query((resultSet, rowNumber) -> User.withUsername(resultSet.getString("email"))
						.password(resultSet.getString("password_hash"))
						.roles(resultSet.getString("role")).build())
				.optional()
				.orElseThrow(() -> new UsernameNotFoundException(username));
	}
}
