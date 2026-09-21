import http from 'k6/http';
import { check } from 'k6';
import { Counter } from 'k6/metrics';
import exec from 'k6/execution';

const baseUrl = __ENV.BASE_URL;
const pollId = Number(__ENV.POLL_ID || 1);
const runTag = __ENV.RUN_TAG;
const voterCount = Number(__ENV.VOTER_COUNT || 1000);
const voteConcurrency = Number(__ENV.VOTE_CONCURRENCY || 50);
const succeeded = new Counter('vote_success');

export const options = {
  scenarios: {
    votes: {
      executor: 'shared-iterations',
      vus: voteConcurrency,
      iterations: voterCount,
      maxDuration: '3m',
    },
  },
};

function tokenFor(vu) {
  return (`vote-${runTag}-${vu}`).replace(/[^A-Za-z0-9_-]/g, '').padEnd(43, 'A').slice(0, 43);
}

function idempotencyKeyFor(vu) {
  let hash = 0;
  for (const char of runTag) hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
  return `${hash.toString(16).padStart(8, '0')}-0000-4000-8000-${vu.toString(16).padStart(12, '0')}`;
}

export function setup() {
  const response = http.get(`${baseUrl}/api/polls/${pollId}`);
  if (response.status !== 200) throw new Error(`poll lookup failed: ${response.status}`);
  return JSON.parse(response.body).options.map((option) => option.optionId);
}

export default function (optionIds) {
	const voterIndex = exec.scenario.iterationInTest + 1;
  const optionId = optionIds[Math.floor(Math.random() * optionIds.length)];
  const response = http.post(`${baseUrl}/api/polls/${pollId}/votes`, JSON.stringify({ optionId }), {
    headers: {
      'Content-Type': 'application/json',
      Cookie: `anonymous_token=${tokenFor(voterIndex)}`,
      'Idempotency-Key': idempotencyKeyFor(voterIndex),
    },
  });
  if (check(response, { 'vote is 201': (result) => result.status === 201 })) succeeded.add(1);
}
