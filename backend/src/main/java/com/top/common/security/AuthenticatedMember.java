package com.top.common.security;

import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.UserDetails;

import java.util.Collection;
import java.util.List;

/**
 * UserDetails implementation carrying the authenticated member's numeric id.
 *
 * Spring Security's stock {@code User} (previously returned by
 * {@link org.springframework.security.core.userdetails.UserDetailsService})
 * only carries a username, password and authorities. Application code that
 * needs to know *which* member is logged in (e.g. to scope admin data to its
 * owner) had no way to get that id from the security context, so it fell
 * back to a hardcoded owner id. This type closes that gap.
 */
public class AuthenticatedMember implements UserDetails {
	private final long id;
	private final String username;
	private final String password;
	private final String role;

	public AuthenticatedMember(long id, String username, String password, String role) {
		this.id = id;
		this.username = username;
		this.password = password;
		this.role = role;
	}

	public long getId() {
		return id;
	}

	@Override
	public Collection<? extends GrantedAuthority> getAuthorities() {
		return List.of(new SimpleGrantedAuthority("ROLE_" + role));
	}

	@Override
	public String getPassword() {
		return password;
	}

	@Override
	public String getUsername() {
		return username;
	}
}
