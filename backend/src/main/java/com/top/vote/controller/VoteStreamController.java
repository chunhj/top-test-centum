package com.top.vote.controller;
import com.top.auth.AnonymousVoterFilter;
import com.top.vote.service.VoteStreamService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;
@RestController
@RequestMapping("/api/polls/{pollId}/stream")
@RequiredArgsConstructor
public class VoteStreamController {
 private final VoteStreamService service;
 @GetMapping public SseEmitter stream(@PathVariable long pollId, @RequestAttribute(AnonymousVoterFilter.VOTER_KEY_ATTRIBUTE) String voterKey) { return service.subscribe(pollId, voterKey); }
}
