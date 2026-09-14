package com.top.vote.domain;

import com.top.poll.domain.Poll;
import com.top.poll.domain.PollOption;
import jakarta.persistence.*;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.time.Instant;

@Entity
@Table(name = "ballot")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class Ballot {
	@Id
	@GeneratedValue(strategy = GenerationType.IDENTITY)
	private Long id;

	@ManyToOne(fetch = FetchType.LAZY, optional = false)
	@JoinColumn(name = "poll_id", nullable = false)
	private Poll poll;

	@Column(nullable = false, length = 64)
	private String voterKey;

	@Column(nullable = false, insertable = false)
	private Instant updatedAt;

	@OneToOne(mappedBy = "ballot", cascade = CascadeType.PERSIST, optional = false)
	private BallotSelection selection;

	public static Ballot cast(Poll poll, String voterKey, PollOption option) {
		Ballot ballot = new Ballot();
		ballot.poll = poll;
		ballot.voterKey = voterKey;
		ballot.selection = new BallotSelection(ballot, option);
		return ballot;
	}

	public void changeSelection(PollOption option) {
		selection.changeOption(option);
		updatedAt = Instant.now();
	}
}
