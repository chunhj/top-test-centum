package com.top.poll.domain;

import jakarta.persistence.*;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;

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

	@OneToMany(mappedBy = "poll")
	@OrderBy("displayOrder ASC, id ASC")
	private List<PollOption> options = new ArrayList<>();

}
