import http from 'k6/http';
import { check } from 'k6';

// Scenario C at design scale: SSE_VUS held connections + VOTE_VUS brand-new
// random voters, against the real Poll #1 (8 candidates). Every successful
// vote is a real, permanent DB write -- nothing here deletes or resets data.
const baseUrl = __ENV.BASE_URL || 'http://127.0.0.1:8080';
const pollId = Number(__ENV.POLL_ID || 1);
const sseVus = Number(__ENV.SSE_VUS || 500);
const voteVus = Number(__ENV.VOTE_VUS || 1000);
const runTag = __ENV.RUN_TAG || `${Date.now()}`;

export const options = {
  scenarios: {
    keep_sse_connections: {
      executor: 'constant-vus',
      exec: 'holdSse',
      vus: sseVus,
      duration: '40s',
      gracefulStop: '0s',
    },
    simultaneous_vote: {
      executor: 'per-vu-iterations',
      exec: 'castVote',
      vus: voteVus,
      iterations: 1,
      startTime: '15s',
      maxDuration: '2m',
    },
  },
};

// AnonymousVoterFilter requires the cookie value to match [A-Za-z0-9_-]{43}
function pad43(raw) {
  const cleaned = raw.replace(/[^A-Za-z0-9_-]/g, '');
  if (cleaned.length >= 43) return cleaned.slice(0, 43);
  return cleaned + 'A'.repeat(43 - cleaned.length);
}

function hex(n, len) {
  return (n >>> 0).toString(16).padStart(len, '0');
}

// Builds a syntactically valid UUID, unique per (runTag, vu), so re-running
// with a fresh RUN_TAG never replays a previous run's idempotent response.
function idempotencyKeyFor(vu) {
  let tagNum = 0;
  for (let i = 0; i < runTag.length; i++) tagNum = (tagNum * 31 + runTag.charCodeAt(i)) >>> 0;
  return `${hex(tagNum, 8)}-0000-4000-8000-${hex(vu, 11)}0`;
}

export function setup() {
  const res = http.get(`${baseUrl}/api/polls/${pollId}`);
  if (res.status !== 200) {
    throw new Error(`setup: GET /api/polls/${pollId} returned ${res.status}, body=${res.body}`);
  }
  const body = JSON.parse(res.body);
  const optionIds = body.options.map((o) => o.optionId);
  console.log(`setup: poll ${pollId} phase=${body.phase} status=${body.status} options=${JSON.stringify(optionIds)}`);
  return { optionIds };
}

export function holdSse() {
  const token = pad43(`sse-${runTag}-${__VU}`);
  const res = http.get(`${baseUrl}/api/polls/${pollId}/stream`, {
    headers: { Cookie: `anonymous_token=${token}` },
    timeout: '35s',
  });
  check(res, { 'SSE is 200': (r) => r.status === 200 });
}

export function castVote(data) {
  const optionIds = data.optionIds;
  // Real random pick among the 8 real candidates -- no option is favored.
  const choice = optionIds[Math.floor(Math.random() * optionIds.length)];
  const token = pad43(`vote-${runTag}-${__VU}`);
  const res = http.post(
    `${baseUrl}/api/polls/${pollId}/votes`,
    JSON.stringify({ optionId: choice }),
    {
      headers: {
        'Content-Type': 'application/json',
        Cookie: `anonymous_token=${token}`,
        'Idempotency-Key': idempotencyKeyFor(__VU),
      },
    }
  );
  check(res, { 'vote is 201': (r) => r.status === 201 });
}
