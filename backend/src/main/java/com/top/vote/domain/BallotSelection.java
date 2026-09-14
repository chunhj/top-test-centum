package com.top.vote.domain;

import com.top.poll.domain.PollOption;
import jakarta.persistence.*;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Entity
@Table(name = "ballot_selection")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class BallotSelection {
	@Id
	@GeneratedValue(strategy = GenerationType.IDENTITY)
	private Long id;

	@OneToOne(fetch = FetchType.LAZY, optional = false)
	@JoinColumn(name = "ballot_id", nullable = false)
	private Ballot ballot;

	@ManyToOne(fetch = FetchType.LAZY, optional = false)
	@JoinColumn(name = "option_id", nullable = false)
	private PollOption option;

	BallotSelection(Ballot ballot, PollOption option) {
		this.ballot = ballot;
		this.option = option;
	}

	void changeOption(PollOption option) {
		this.option = option;
	}
}
