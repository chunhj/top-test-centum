package com.top.admin.dto;

import org.springframework.data.domain.Page;

import java.util.List;

public record AdminPollPageResponse(List<AdminPollResponse> content, int page, int size, long totalElements, int totalPages) {
	public static AdminPollPageResponse from(Page<AdminPollResponse> page) {
		return new AdminPollPageResponse(page.getContent(), page.getNumber(), page.getSize(), page.getTotalElements(), page.getTotalPages());
	}
}
