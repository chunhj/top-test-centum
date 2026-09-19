# k6 부하 테스트 결과

측정일: 2026-09-19  
대상: 로컬 Spring Boot 1인스턴스 + PostgreSQL 17 컨테이너, Poll ID 1

실행은 공식 `grafana/k6` Docker 이미지에서 `BASE_URL=http://host.docker.internal:8080`으로 수행했다. 각 JSON 원본은 `results/`에 저장했다.

| 시나리오 | 부하 | TPS | HTTP p95 | HTTP 오류율 | 결과 |
|---|---:|---:|---:|---:|---|
| A. Poll Detail | 1,000 VU, VU당 1회 GET | 641.34 | 866.50 ms | 0% | 1,000 / 1,000 HTTP 200 |
| B. 동시 투표 | 500 VU, VU당 1회 POST | 85.59 | 5,338.59 ms | 0% | 500 / 500 HTTP 201 |
| C. SSE + 동시 투표 (재측정) | SSE 50명 유지 시도, 5초 뒤 투표 50명 | 해당 없음 | 136.63 ms (투표 50건) | 0% (투표 50건) | 50 / 50 HTTP 201 |

## 시나리오 C 상한선

- 2026-09-19 재측정에서 `SSE 50명 + 투표 50명`의 투표 50건은 모두 HTTP 201로 완료됐다. 이 실행은 `RUN_TAG=501901`로 이전 실행과 다른 익명 토큰·멱등성 키를 사용했다.
- 과거 `SSE 10명 + 투표 10명`은 투표 10건이 모두 약 30.08초 후 timeout됐으나, 두 실행은 서버 설정·상태를 통제해 비교한 실험이 아니므로 원인을 직접 비교하지 않는다.
- 현재 script는 장기 stream이 닫힌 뒤에만 SSE 200 check와 `sse_connected`를 기록하므로, 실제 SSE 연결 50건의 성공 수는 이 결과만으로 검증하지 못했다.
- PostgreSQL CPU와 Hikari pool 사용률은 50+50 실행에서 별도 metric으로 수집하지 못해 미검증이다. C의 136.63ms는 종료되지 않은 SSE 요청을 제외한 vote HTTP p95이며, 2.50 TPS도 전체 20초 실행 시간 기준이라 SSE 처리량이 아니다.

## 병목 판단

- A는 오류 없이 완료됐다.
- B는 모든 투표가 성공했지만 p95가 약 5.34초다. `VoteService.castVote()`가 Poll 행을 `PESSIMISTIC_WRITE`로 잠가 같은 Poll의 투표가 직렬화되는 기존 구조와 일치한다.
- 과거 10+10 timeout 당시 Hikari active connection 10개가 관찰됐지만, `pg_stat_activity`·Hikari metric이 없어 SSE 연결이 커넥션을 점유했다는 인과는 단정하지 않는다. 최신 50+50 투표는 모두 성공했다.

## 재실행

테스트 대상 Backend를 8080에 기동한 뒤 다음을 실행한다.

```powershell
docker run --rm --env BASE_URL=http://host.docker.internal:8080 --mount type=bind,source=$PWD\load-test,target=/scripts grafana/k6:latest run /scripts/scenario-a-poll-detail.js
docker run --rm --env BASE_URL=http://host.docker.internal:8080 --mount type=bind,source=$PWD\load-test,target=/scripts grafana/k6:latest run /scripts/scenario-b-vote.js
docker run --rm --env BASE_URL=http://host.docker.internal:8080 --env VUS=50 --env RUN_TAG=501901 --mount "type=bind,source=C:\mine\personal\poll-top-app\load-test,target=/scripts" grafana/k6:latest run /scripts/scenario-c-sse-and-vote.js
```

재실행 시 B는 token·idempotency key가 고정되어 있으므로 기존 DB에서 그대로 반복하면 201 replay가 실제 write 부하로 보일 수 있다. C는 매 실행마다 다른 6자리 16진 `RUN_TAG`를 전달해 key/token을 바꾼다.
