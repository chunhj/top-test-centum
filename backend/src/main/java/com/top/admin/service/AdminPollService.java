package com.top.admin.service;

import com.top.admin.dto.AdminPollPageResponse;
import com.top.admin.dto.AdminPollRequest;
import com.top.admin.dto.AdminPollResponse;
import com.top.admin.dto.AdminPollUpdateRequest;
import com.top.admin.repository.AdminPollQueryRepository;
import com.top.poll.domain.Poll;
import com.top.poll.domain.PollStatus;
import com.top.poll.repository.PollRepository;
import com.top.vote.repository.PollOptionCounterRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.time.Instant;

import static org.springframework.http.HttpStatus.BAD_REQUEST;
import static org.springframework.http.HttpStatus.CONFLICT;
import static org.springframework.http.HttpStatus.NOT_FOUND;

@Service
@RequiredArgsConstructor
public class AdminPollService {
	private static final long ADMIN_OWNER_ID = 1L;
	private final PollRepository pollRepository;
	private final AdminPollQueryRepository queryRepository;
	private final PollOptionCounterRepository counterRepository;

	@Transactional(readOnly = true)
	public AdminPollPageResponse find(String keyword, PollStatus status, String sort, int page, int size) {
		return AdminPollPageResponse.from(queryRepository.find(ADMIN_OWNER_ID, keyword, status, sort,
				PageRequest.of(Math.max(page, 0), Math.min(Math.max(size, 1), 100))));
	}

	@Transactional
	@CacheEvict(value = "popularPolls", allEntries = true)
	public AdminPollResponse create(AdminPollRequest request) {
		validateRange(request.startsAt(), request.endsAt());
		Poll poll = Poll.schedule(ADMIN_OWNER_ID, request.title(), request.description(), request.pollType(),
				request.maxSelections(), request.startsAt(), request.endsAt());
		for (int index = 0; index < request.options().size(); index++) {
			var option = request.options().get(index);
			poll.addOption(option.name(), option.imageUrl(), option.team(), index + 1);
		}
		pollRepository.saveAndFlush(poll);
		counterRepository.initialize(poll.getOptions().stream().map(option -> option.getId()).toList());
		return AdminPollResponse.from(poll, 0);
	}

	@Transactional
	@CacheEvict(value = "popularPolls", allEntries = true)
	public AdminPollResponse update(long pollId, AdminPollUpdateRequest request) {
		validateRange(request.startsAt(), request.endsAt());
		Poll poll = ownedPollForUpdate(pollId);
		try {
			poll.update(request.title(), request.description(), request.startsAt(), request.endsAt());
		} catch (IllegalStateException exception) {
			throw new ResponseStatusException(CONFLICT, exception.getMessage());
		}
		return AdminPollResponse.from(poll, 0);
	}

	@Transactional
	@CacheEvict(value = "popularPolls", allEntries = true)
	public AdminPollResponse transition(long pollId, String action) {
		Poll poll = ownedPollForUpdate(pollId);
		try {
			switch (action) {
				case "start" -> poll.start(Instant.now());
				case "pause" -> poll.pause();
				case "resume" -> poll.resume(Instant.now());
				case "close" -> poll.close();
				default -> throw new ResponseStatusException(BAD_REQUEST, "INVALID_ADMIN_ACTION");
			}
		} catch (IllegalStateException exception) {
			throw new ResponseStatusException(CONFLICT, exception.getMessage());
		}
		return AdminPollResponse.from(poll, 0);
	}

	private Poll ownedPollForUpdate(long pollId) {
		Poll poll = pollRepository.findByIdForUpdate(pollId)
				.orElseThrow(() -> new ResponseStatusException(NOT_FOUND, "POLL_NOT_FOUND"));
		if (poll.getOwnerId() != ADMIN_OWNER_ID) throw new ResponseStatusException(NOT_FOUND, "POLL_NOT_FOUND");
		return poll;
	}

	private void validateRange(Instant startsAt, Instant endsAt) {
		if (!startsAt.isBefore(endsAt)) throw new ResponseStatusException(BAD_REQUEST, "INVALID_POLL_TIME_RANGE");
	}
}
