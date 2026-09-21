import sse from 'k6/x/sse';
import { Counter } from 'k6/metrics';

const baseUrl = __ENV.BASE_URL;
const pollId = Number(__ENV.POLL_ID || 1);
const runTag = __ENV.RUN_TAG;
const sseVus = Number(__ENV.SSE_VUS || 500);

const opened = new Counter('sse_opened');
const events = new Counter('sse_events');
const errors = new Counter('sse_errors');

export const options = {
  scenarios: {
    connections: {
      executor: 'per-vu-iterations',
      vus: sseVus,
      iterations: 1,
      maxDuration: '5m',
      gracefulStop: '0s',
    },
  },
};

function tokenFor(vu) {
  return (`sse-${runTag}-${vu}`).replace(/[^A-Za-z0-9_-]/g, '').padEnd(43, 'A').slice(0, 43);
}

export default function () {
  sse.open(`${baseUrl}/api/polls/${pollId}/stream`, {
    headers: { Cookie: `anonymous_token=${tokenFor(__VU)}` },
  }, (client) => {
    client.on('open', () => opened.add(1));
    client.on('event', () => events.add(1));
    client.on('error', () => errors.add(1));
  });
}
