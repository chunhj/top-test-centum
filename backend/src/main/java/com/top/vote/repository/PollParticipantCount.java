package com.top.vote.repository;

/** Ballot (participant) count of one poll, produced by {@link BallotRepository#countParticipantsByPollIds}. */
public record PollParticipantCount(Long pollId, Long participantCount) {
}
