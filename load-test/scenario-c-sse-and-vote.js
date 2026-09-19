import http from 'k6/http';
import { check } from 'k6';
import { Counter } from 'k6/metrics';

const baseUrl = __ENV.BASE_URL || 'http://127.0.0.1:8080';
const vus = Number(__ENV.VUS || 50);
const runTag = String(__ENV.RUN_TAG || '000000').replace(/[^0-9a-f]/gi, '').slice(0, 6).padEnd(6, '0');
const connectedSse = new Counter('sse_connected');

export const options = {
  scenarios: {
    keep_sse_connections: { executor: 'constant-vus', exec: 'holdSse', vus, duration: '20s', gracefulStop: '0s' },
    simultaneous_vote: { executor: 'per-vu-iterations', exec: 'castVote', vus, iterations: 1, startTime: '5s', maxDuration: '1m' },
  },
};

function voterToken() {
  const id = `${runTag}${__VU}`;
  return `${'B'.repeat(43 - id.length)}${id}`;
}

export function holdSse() {
  const response = http.get(`${baseUrl}/api/polls/1/stream`, { headers: { Cookie: `anonymous_token=${voterToken()}` }, timeout: '25s' });
  check(response, { 'SSE is 200': (result) => result.status === 200 });
  if (response.status === 200) connectedSse.add(1);
}

export function castVote() {
  const response = http.post(`${baseUrl}/api/polls/1/votes`, JSON.stringify({ optionId: 1 }), {
    headers: {
      'Content-Type': 'application/json',
      Cookie: `anonymous_token=${voterToken()}`,
      'Idempotency-Key': `10000000-0000-4000-8000-${runTag}${String(__VU).padStart(6, '0')}`,
    },
  });
  check(response, { 'vote is 201': (result) => result.status === 201 });
}
