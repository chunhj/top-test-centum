package com.top.vote.service;

import com.top.poll.domain.Poll;
import com.top.poll.domain.PollPhase;
import com.top.poll.repository.PollRepository;
import com.top.vote.dto.PollResultsResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;
import java.io.IOException;
import java.time.Instant;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.CopyOnWriteArrayList;

@Service
@RequiredArgsConstructor
public class VoteStreamService {
 private final PollRepository pollRepository;
 private final VoteResultService voteResultService;
 private final ConcurrentHashMap<Long, CopyOnWriteArrayList<Subscription>> subscriptions = new ConcurrentHashMap<>();
 public SseEmitter subscribe(long pollId, String voterKey) {
  Poll poll = pollRepository.findById(pollId).orElseThrow();
  SseEmitter emitter = new SseEmitter(30 * 60 * 1000L);
  Subscription sub = new Subscription(emitter, voterKey);
  subscriptions.computeIfAbsent(pollId, ignored -> new CopyOnWriteArrayList<>()).add(sub);
  Runnable remove = () -> subscriptions.getOrDefault(pollId, new CopyOnWriteArrayList<>()).remove(sub);
  emitter.onCompletion(remove); emitter.onTimeout(remove); emitter.onError(error -> remove.run());
  try { PollPhase phase = PollPhase.at(poll, Instant.now()); if (phase == PollPhase.RESULTS_HIDDEN) sendPhase(emitter, phase); else sendResult(emitter, pollId, voterKey); }
  catch (IOException e) { emitter.completeWithError(e); }
  return emitter;
 }
 public void publishAfterCommit(long pollId) {
  subscriptions.getOrDefault(pollId, new CopyOnWriteArrayList<>()).forEach(sub -> { try { PollResultsResponse r = voteResultService.findResults(pollId, sub.voterKey()); if (r.phase() == PollPhase.RESULTS_HIDDEN) sendPhase(sub.emitter(), r.phase()); else if (r.results() != null) sendResult(sub.emitter(), r); } catch (Exception e) { sub.emitter().completeWithError(e); } });
 }
 private void sendResult(SseEmitter e, long id, String key) throws IOException { sendResult(e, voteResultService.findResults(id, key)); }
 private void sendResult(SseEmitter e, PollResultsResponse r) throws IOException { e.send(SseEmitter.event().name("vote-result").data(r)); }
 private void sendPhase(SseEmitter e, PollPhase p) throws IOException { e.send(SseEmitter.event().name("phase-changed").data(new PhaseChanged(p))); }
 private record Subscription(SseEmitter emitter, String voterKey) {}
 private record PhaseChanged(PollPhase phase) {}
}
