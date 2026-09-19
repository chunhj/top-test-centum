import http from 'k6/http';
import { check } from 'k6';

const baseUrl = __ENV.BASE_URL || 'http://127.0.0.1:8080';

export const options = {
  scenarios: {
    simultaneous_vote: { executor: 'per-vu-iterations', vus: 500, iterations: 1, maxDuration: '1m' },
  },
};

function voterToken() {
  const id = String(__VU);
  return `${'A'.repeat(43 - id.length)}${id}`;
}

export default function () {
  const response = http.post(`${baseUrl}/api/polls/1/votes`, JSON.stringify({ optionId: 1 }), {
    headers: {
      'Content-Type': 'application/json',
      Cookie: `anonymous_token=${voterToken()}`,
      'Idempotency-Key': `00000000-0000-4000-8000-${String(__VU).padStart(12, '0')}`,
    },
  });
  check(response, { 'vote is 201': (result) => result.status === 201 });
}
