package com.top.poll.domain;

import jakarta.persistence.*;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Entity
@Table(name = "poll_option")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class PollOption {
	@Id
	@GeneratedValue(strategy = GenerationType.IDENTITY)
	private Long id;

	@ManyToOne(fetch = FetchType.LAZY, optional = false)
	@JoinColumn(name = "poll_id", nullable = false)
	private Poll poll;

	@Column(nullable = false, length = 100)
	private String name;

	@Column(columnDefinition = "text")
	private String imageUrl;

	@Column(length = 100)
	private String team;

	@Column(nullable = false)
	private int displayOrder;

	PollOption(Poll poll, String name, String imageUrl, String team, int displayOrder) {
		this.poll = poll;
		this.name = name;
		this.imageUrl = imageUrl;
		this.team = team;
		this.displayOrder = displayOrder;
	}

	void update(String name, String imageUrl, String team, int displayOrder) {
		this.name = name;
		this.imageUrl = imageUrl;
		this.team = team;
		this.displayOrder = displayOrder;
	}

}
