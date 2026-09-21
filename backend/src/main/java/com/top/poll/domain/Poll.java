package com.top.poll.domain;

import jakarta.persistence.*;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.time.Instant;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;

@Entity
@Table(name = "poll")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class Poll {
	@Id
	@GeneratedValue(strategy = GenerationType.IDENTITY)
	private Long id;

	@Column(nullable = false)
	private Long ownerId;

	@Column(nullable = false, length = 200)
	private String title;

	@Column(columnDefinition = "text")
	private String description;

	@Column(nullable = false, length = 20)
	private String pollType;

	@Column(nullable = false)
	private int maxSelections;

	@Enumerated(EnumType.STRING)
	@Column(nullable = false, length = 20)
	private PollStatus status;

	@Column(nullable = false)
	private Instant startsAt;

	@Column(nullable = false)
	private Instant endsAt;

	@Column(nullable = false, insertable = false, updatable = false)
	private Instant createdAt;

	@OneToMany(mappedBy = "poll", cascade = CascadeType.ALL, orphanRemoval = true)
	@OrderBy("displayOrder ASC, id ASC")
	private List<PollOption> options = new ArrayList<>();

	public static Poll schedule(long ownerId, String title, String description, String pollType,
			int maxSelections, Instant startsAt, Instant endsAt) {
		Poll poll = new Poll();
		poll.ownerId = ownerId;
		poll.title = title;
		poll.description = description;
		poll.pollType = pollType;
		poll.maxSelections = maxSelections;
		poll.status = PollStatus.SCHEDULED;
		poll.startsAt = startsAt;
		poll.endsAt = endsAt;
		return poll;
	}

	public void addOption(String name, String imageUrl, String team, int displayOrder) {
		options.add(new PollOption(this, name, imageUrl, team, displayOrder));
	}

	public void update(String title, String description, Instant startsAt, Instant endsAt) {
		if (status != PollStatus.SCHEDULED) throw new IllegalStateException("POLL_NOT_EDITABLE");
		this.title = title;
		this.description = description;
		this.startsAt = startsAt;
		this.endsAt = endsAt;
	}

	/**
	 * Reconciles the option list against an admin edit's requested rows, matched
	 * by optionId. A row without an optionId is a new candidate (INSERT); an
	 * existing optionId present in the request is updated in place (UPDATE); an
	 * existing optionId missing from the request is removed (DELETE, via
	 * orphanRemoval). Only allowed while the poll hasn't gone live yet, so this
	 * never touches an option that could already carry votes.
	 */
	public void syncOptions(List<OptionUpsert> requestOptions) {
		if (status != PollStatus.SCHEDULED) throw new IllegalStateException("POLL_NOT_EDITABLE");

		Map<Long, PollOption> existingById = new HashMap<>();
		for (PollOption option : options) {
			if (option.getId() != null) existingById.put(option.getId(), option);
		}

		Set<Long> keepIds = new HashSet<>();
		for (OptionUpsert request : requestOptions) {
			if (request.optionId() != null) keepIds.add(request.optionId());
		}
		options.removeIf(option -> option.getId() != null && !keepIds.contains(option.getId()));

		int order = 1;
		for (OptionUpsert request : requestOptions) {
			if (request.optionId() != null) {
				PollOption existing = existingById.get(request.optionId());
				if (existing == null) throw new IllegalStateException("POLL_OPTION_NOT_FOUND");
				existing.update(request.name(), request.imageUrl(), request.team(), order);
			} else {
				addOption(request.name(), request.imageUrl(), request.team(), order);
			}
			order++;
		}
	}

	public record OptionUpsert(Long optionId, String name, String imageUrl, String team) {}

	public void start(Instant now) {
		if (status != PollStatus.SCHEDULED || now.isBefore(startsAt) || !now.isBefore(endsAt)) throw new IllegalStateException("INVALID_POLL_TRANSITION");
		status = PollStatus.OPEN;
	}

	public void pause() {
		if (status != PollStatus.OPEN) throw new IllegalStateException("INVALID_POLL_TRANSITION");
		status = PollStatus.PAUSED;
	}

	public void resume(Instant now) {
		if (status != PollStatus.PAUSED || now.isBefore(startsAt) || !now.isBefore(endsAt)) throw new IllegalStateException("INVALID_POLL_TRANSITION");
		status = PollStatus.OPEN;
	}

	public void close() {
		if (status == PollStatus.CLOSED) throw new IllegalStateException("INVALID_POLL_TRANSITION");
		status = PollStatus.CLOSED;
	}

}
