package com.top.vote.domain;

import jakarta.persistence.*;
import lombok.AccessLevel;
import lombok.NoArgsConstructor;

@Entity
@Table(name = "vote_history")
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class VoteHistory {
	@Id
	@GeneratedValue(strategy = GenerationType.IDENTITY)
	private Long id;

	@ManyToOne(fetch = FetchType.LAZY, optional = false)
	@JoinColumn(name = "ballot_id", nullable = false)
	private Ballot ballot;

	@Column(nullable = false)
	private Long beforeSelection;

	@Column(nullable = false)
	private Long afterSelection;

	public static VoteHistory changed(Ballot ballot, long beforeSelection, long afterSelection) {
		VoteHistory history = new VoteHistory();
		history.ballot = ballot;
		history.beforeSelection = beforeSelection;
		history.afterSelection = afterSelection;
		return history;
	}
}
