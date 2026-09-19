import http from 'k6/http';
import { check } from 'k6';

const baseUrl = __ENV.BASE_URL || 'http://127.0.0.1:8080';

export const options = {
  scenarios: {
    poll_detail: { executor: 'per-vu-iterations', vus: 1000, iterations: 1, maxDuration: '1m' },
  },
};

export default function () {
  const response = http.get(`${baseUrl}/api/polls/1`);
  check(response, { 'poll detail is 200': (result) => result.status === 200 });
}
