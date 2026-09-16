package com.top.admin.controller;

import com.top.admin.dto.AdminPollPageResponse;
import com.top.admin.dto.AdminPollRequest;
import com.top.admin.dto.AdminPollResponse;
import com.top.admin.dto.AdminPollUpdateRequest;
import com.top.admin.service.AdminPollService;
import com.top.poll.domain.PollStatus;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/admin/polls")
@RequiredArgsConstructor
public class AdminPollController {
	private final AdminPollService service;

	@GetMapping
	public AdminPollPageResponse find(@RequestParam(required = false) String keyword,
			@RequestParam(required = false) PollStatus status,
			@RequestParam(defaultValue = "createdAt") String sort,
			@RequestParam(defaultValue = "0") int page,
			@RequestParam(defaultValue = "20") int size) {
		return service.find(keyword, status, sort, page, size);
	}

	@PostMapping
	@ResponseStatus(HttpStatus.CREATED)
	public AdminPollResponse create(@Valid @RequestBody AdminPollRequest request) {
		return service.create(request);
	}

	@PatchMapping("/{pollId}")
	public AdminPollResponse update(@PathVariable long pollId, @Valid @RequestBody AdminPollUpdateRequest request) {
		return service.update(pollId, request);
	}

	@PostMapping("/{pollId}/{action:start|pause|resume|close}")
	public AdminPollResponse transition(@PathVariable long pollId, @PathVariable String action) {
		return service.transition(pollId, action);
	}
}
