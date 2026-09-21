# k6 부하 테스트 결과

측정일: 2026-09-20
대상: Docker Compose Nginx + Spring Boot 1인스턴스 + PostgreSQL 17 + Redis

## 측정 결과

| 시나리오 | 부하 | 처리량 | HTTP p95 | HTTP 오류율 | 결과 |
|---|---:|---:|---:|---:|---|
| A. Poll Detail | 1,000 VU, VU당 1회 GET | 641.34 req/s | 866.50 ms | 0% | 1,000 / 1,000 HTTP 200 |
| B. 동시 투표 | 500 VU, VU당 1회 POST | 85.59 req/s | 5,338.59 ms | 0% | 500 / 500 HTTP 201 |
| C. SSE + 투표 보완 | SSE 500명 유지 + 신규 1,000명, 동시 작업자 50명 | 200.37 vote/s | 564.68 ms | 0% | SSE 500 연결, 투표 1,000 / 1,000 HTTP 201 |

## 시나리오 C 보완 측정

- 실행 태그: `0920212142`
- SSE: `sse_opened=500`, 초기 event 수신 `500`, Backend active gauge `500`, 종료 후 gauge `0`
- 투표: 무작위 후보에 서로 다른 익명 토큰·멱등성 키로 1,000건 요청, 전부 HTTP 201
- 투표 latency: 평균 `243.67 ms`, 중앙값 `193.56 ms`, p90 `459.88 ms`, p95 `564.68 ms`, 최대 `1,336.16 ms`
- DB 정합성: ballot `150 → 1,150`, selection `1,150`, counter 합계 `1,150`
- PostgreSQL deadlock 증가: `0`
- 테스트 전 Poll 종료 시각을 PostgreSQL 서버 시간 기준 `현재 + 1시간`으로 변경했다.
- 테스트 데이터는 종료 후 삭제하지 않았다.

원본 결과:

- `results/scenario-c-sse-0920212142.json`
- `results/scenario-c-vote-0920212142.json`
- `results/scenario-c-metrics-0920212142.csv`

## 병목 계측

| 지표 | 관측값 |
|---|---:|
| SSE active | 500 |
| Hikari active / max | 9 / 10 |
| Hikari pending | 40 |
| PostgreSQL active | 5 |
| PostgreSQL 미획득 lock | 3 |
| PostgreSQL deadlock 증가 | 0 |

투표 요청 50개가 동시에 실행될 때 Hikari 대기 요청이 40개까지 증가했다. 현재 기본 pool 10개가 우선 병목이며, 같은 Poll 행 잠금 때문에 PostgreSQL 미획득 lock도 3개 관측됐다. 다만 1,000건이 오류 없이 약 5초 만에 끝났고 계측 표본도 2초 간격 1개뿐이므로, 로컬 단일 실행만으로 pool 크기를 변경하지 않는다. 서버급 환경에서 반복 측정할 때 Hikari pending과 DB CPU가 계속 높으면 그때 pool·Poll 잠금 범위를 함께 조정한다.

SSE fan-out은 투표마다 별도 작업을 큐에 쌓지 않고 100ms 동안 같은 Poll의 변경을 하나의 최신 결과 broadcast로 합친다. 최초 1,000 동시 작업자 실험에서 기존 bounded executor가 포화된 원인을 이 방식으로 제거했다.

## 재실행

Compose 서비스를 기동한 뒤 Repository 루트에서 실행한다.

```powershell
powershell -ExecutionPolicy Bypass -File .\load-test\run-scale-test.ps1
```

스크립트는 Compose의 실제 Nginx port와 frontend network를 찾고, Poll을 1시간 동안 열고, SSE 500 연결을 gauge로 확인한 뒤 1,000명 투표를 시작한다. 종료 시 임시 k6 container만 제거하며 PostgreSQL ballot은 유지한다.

## 주의

- 시나리오 C 최종 실행 직전 DB baseline은 150명이었다. 같은 작업 중 앞선 실행에서 더 큰 누적값이 관측됐지만 현재 PostgreSQL 로그에는 2026-09-20 12:20 UTC에 빈 schema에 Flyway를 다시 적용한 기록이 있다. 본 스크립트에는 DB/volume 삭제가 없으므로 초기화 원인은 이 측정만으로 확정하지 못했다.
- A/B는 이전 로컬 Docker-host 경계 측정값이고 C는 Compose 내부 network 측정값이므로 숫자를 직접 성능 회귀 비교로 사용하지 않는다.
