# TOP (Today's Opinion & Poll)
## 설계 및 개발 — DB / API / 기술 스택 / 배포 / 테스트

> 개발 전제: **React + Spring Boot + PostgreSQL** 기반의 실시간 투표 서비스를 2~3주 안에 1인 개발한다.  
> 구현 문서는 데이터 정합성, 동시성, 트랜잭션, 상태 전이, 실시간 전송, 배포/운영 관점의 구체적인 설계 방법을 다룬다.

---

# 1. 개발 목표 및 설계 원칙

이 프로젝트의 핵심은 화면 수를 늘리는 것이 아니라 아래 백엔드 문제를 직접 해결하는 것이다.

1. **한 사용자의 중복 투표를 DB 레벨에서 방지**
2. **재투표 시 기존 득표 감소 + 새 득표 증가를 하나의 트랜잭션으로 처리**
3. **동시 요청에서도 정확한 집계 유지**
4. **T-30 정책을 클라이언트가 아닌 서버에서 판정**
5. **SSE로 실시간 집계를 전달하되 T-30 진입 시 결과 데이터 전송 중단**
6. **중복 요청/재시도에 대한 멱등성 확보**
7. **Docker 기반 실행 환경과 AWS EC2 실제 배포**
8. **통합 테스트와 부하 테스트로 동작 검증**

---

# 2. 운영/배포 구현 범위

- PostgreSQL 데이터 영속화
- Redis 인기 투표 조회 Cache
- Docker 이미지 생성
- Docker Compose 실행
- Nginx Reverse Proxy
- AWS EC2 배포
- HTTPS 적용
- 환경변수/Secret 분리
- 로그 확인
- Health Check

---

# 3. 투표 상태 계산 설계

`LIVE_VISIBLE`, `LIVE_HIDDEN` 같은 값을 DB에 계속 덮어쓰는 방식보다:

- DB에는 `poll.status = SCHEDULED / OPEN / PAUSED / CLOSED`
- `starts_at`
- `ends_at`

을 저장하고, 요청 시 서버가 **현재 시각과 종료 시각 차이로 Phase를 계산**한다.

```text
status != OPEN             -> NOT_OPEN
now < starts_at            -> SCHEDULED
now >= ends_at             -> CLOSED
ends_at - now <= 30 min    -> RESULTS_HIDDEN
else                       -> LIVE_VISIBLE
```

이 방식은 스케줄러 실행 지연이나 서버 재시작 때문에 상태가 꼬이는 문제를 줄인다.

---

# 4. 투표 조회 API 설계

## 4.1 Endpoint

```http
GET /api/polls
GET /api/polls/{pollId}
```

## 4.2 응답 예시

```json
{
  "pollId": 10,
  "title": "당신의 최애 선수에게 한 표",
  "type": "SINGLE",
  "maxSelections": 1,
  "phase": "LIVE_VISIBLE",
  "voted": true,
  "mySelections": [1]
}
```

````md
## 4.3 투표 요청

사용자가 후보를 선택하면 Frontend는 Spring Boot에 투표 요청을 전송한다.

### 4.3.1 Endpoint

```http
POST /api/polls/{pollId}/votes
````

예:

```http
POST /api/polls/10/votes
```

URL의 `pollId`는 어떤 투표에 참여하는지를 나타낸다.

### 4.3.2 요청 데이터

단일 투표에서는 선택한 후보의 ID를 전송한다.

```json
{
  "optionId": 3
}
```

예를 들어:

```text
pollId = 10
optionId = 3
```

이라면 `10번 투표에서 3번 후보를 선택했다`는 의미이다.

후보 이름을 직접 전송하기보다 DB에서 후보를 식별하는 `optionId`를 전송한다.

전체 요청 흐름은 다음과 같다.

```text
사용자가 후보 클릭
        ↓
React
        ↓
POST /api/polls/{pollId}/votes
        ↓
Spring Boot
        ↓
투표 가능 여부 / Phase / 사용자 / 후보 검증
        ↓
PostgreSQL에 투표 저장 및 집계 반영
        ↓
Commit
        ↓
투표 결과 응답
```

투표 요청마다 중복 요청 방지를 위한 `Idempotency-Key`를 HTTP Header에 함께 전송한다.

```http
Idempotency-Key: <UUID>
```

서버는 동일한 `Idempotency-Key`의 요청이 다시 들어오면 투표를 다시 처리하지 않고 기존 처리 결과를 반환한다.


---

# 5. 중복 투표 방지

## 5.1 회원

회원 사용자는 다음 Unique Constraint로 방지한다.

```sql
UNIQUE (poll_id, member_id)
```

## 5.2 비회원

로그인을 강제하지 않는 투표의 경우 브라우저 최초 방문 시 서버가 익명 식별 토큰을 발급한다.

권장:

```text
HttpOnly
Secure
SameSite=Lax
```

Cookie에 원문 식별자를 저장하고 DB에는 해시값을 저장한다.

```text
anonymous_token
        ↓ SHA-256/HMAC
voter_key
```

DB 제약:

```sql
UNIQUE (poll_id, voter_key)
```

---

# 6. 투표/재투표 트랜잭션

재투표는 이 프로젝트에서 가장 중요한 백엔드 기능 중 하나다.

예:

```text
기존 선택: 강백호
새 선택: 정대만
```

서버에서는 다음을 하나의 트랜잭션으로 수행한다.

```text
1. ballot 조회
2. 현재 Phase 재검증
3. 기존 후보 count -1
4. 신규 후보 count +1
5. ballot_selection 변경
6. vote_history 저장
7. commit
8. commit 성공 후 SSE 이벤트 전송
```

하나라도 실패하면 전부 Rollback 한다.
실시간 결과 SSE 이벤트는 DB Transaction의 Commit이 성공한 이후에 전송한다.
Rollback된 변경 사항이 클라이언트에 전달되지 않도록 한다.

### Spring 예시 구조

```java
@Transactional
public VoteResult changeVote(ChangeVoteCommand command) {
    // poll 검증
    // phase 검증
    // ballot 조회
    // 기존 selection 제거
    // 새로운 selection 저장
    // 집계 변경
    // history 저장
    
    // 트랜잭션 Commit 성공 후 SSE 전송 이벤트 처리
    
    return result;
}
```

---

# 7. 동시 투표 상황의 정확한 집계

## 7.1 피해야 할 방식

```text
현재 count 조회
Java에서 +1
다시 save
```

동시에 많은 요청이 들어오면 Lost Update가 발생할 수 있다.

## 7.2 권장 방식

PostgreSQL에서 직접 원자적 UPDATE 수행:

```sql
UPDATE poll_option_counter
SET vote_count = vote_count + 1
WHERE option_id = :optionId;
```

재투표는:

```sql
UPDATE poll_option_counter
SET vote_count = vote_count - 1
WHERE option_id = :oldOptionId;

UPDATE poll_option_counter
SET vote_count = vote_count + 1
WHERE option_id = :newOptionId;
```

두 UPDATE는 동일 트랜잭션에서 처리한다.

### Deadlock 방지

두 개 이상의 option row를 갱신할 경우 항상 `option_id ASC` 순서로 Lock/Update하여 잠금 순서를 통일한다.

---

# 8. 멱등성 처리

사용자가 투표 버튼을 빠르게 연속 클릭하거나 모바일 네트워크에서 요청이 재전송될 수 있다.

클라이언트는 투표 요청마다:

```http
Idempotency-Key: <UUID>
```

를 전송한다.

서버는 다음을 저장한다.

```text
idempotency_request
- key
- voter_key
- poll_id
- request_hash
- response_body
- created_at
```

Unique Constraint:

```sql
UNIQUE (voter_key, poll_id, idempotency_key)
```

같은 요청이 다시 오면 투표를 두 번 처리하지 않고 기존 응답을 반환한다.

---

# 9. SSE 기반 실시간 집계

## 9.1 선택 이유

이 서비스는 주로:

```text
Server -> Client
```

방향의 실시간 데이터 전달이 필요하다.

사용자가 서버로 지속적으로 메시지를 보내는 채팅 서비스가 아니기 때문에 MVP에서는 WebSocket보다 **SSE(Server-Sent Events)** 가 더 단순하고 적합하다.

## 9.2 Endpoint

```http
GET /api/polls/{pollId}/stream
Content-Type: text/event-stream
```

### Event 예시

```text
event: vote-result
data: {
  "pollId": 10,
  "totalVotes": 85433,
  "results": [...]
}
```

---

# 10. T-30 결과 비공개 + SSE 전환

종료 30분 전부터는 단순히 UI만 숨기면 안 된다.

다음 API 자체에서 결과 숫자를 반환하지 않아야 한다.

```http
GET /api/polls/{id}/results
GET /api/polls/{id}/stream
```

T-30 진입 시 SSE에는 마지막으로:

```text
event: phase-changed
data: {
  "phase": "RESULTS_HIDDEN"
}
```

를 전달하고, 이후 득표 수 데이터 전송을 중단한다.

즉 DevTools Network를 확인하더라도 숫자를 볼 수 없어야 한다.

---

# 11. 관리자 기능

## 관리자 인증

Spring Security 기반 인증을 사용한다.

역할:

```text
ROLE_USER
ROLE_ADMIN
```

관리 기능 Endpoint:

```http
POST   /api/admin/polls
PATCH  /api/admin/polls/{id}
POST   /api/admin/polls/{id}/start
POST   /api/admin/polls/{id}/pause
POST   /api/admin/polls/{id}/resume
POST   /api/admin/polls/{id}/close
GET    /api/admin/polls
```

모든 상태 변경은 서버에서 현재 상태, 관리자 권한, 시간, 허용 가능한 transition을 다시 검사한다.

---



# 12. 권장 DB 모델

```text
member
 ├─ id                 # 회원 고유 ID
 ├─ email              # 로그인 이메일
 ├─ password_hash      # 암호화된 비밀번호
 └─ role               # 회원 권한 (USER / ADMIN)

poll
 ├─ id                 # 투표 고유 ID
 ├─ owner_id           # 투표 생성자 ID (관리자 / member.id 참조)
 ├─ title              # 투표 제목
 ├─ description        # 투표 설명
 ├─ poll_type          # 투표 유형 (단일 / 듀오 조합)
 ├─ max_selections     # 최대 선택 가능 후보 수
 ├─ status             # 투표 운영 상태 (SCHEDULED / OPEN / PAUSED / CLOSED)
 ├─ starts_at          # 투표 시작 일시
 ├─ ends_at            # 투표 종료 일시
 └─ created_at         # 투표 생성 일시

poll_option
 ├─ id                 # 후보 고유 ID
 ├─ poll_id            # 소속 투표 ID (poll.id 참조)
 ├─ name               # 후보 이름
 ├─ image_url          # 후보 이미지 주소
 ├─ team               # 후보 소속 / 팀 정보
 └─ display_order      # 후보 화면 표시 순서

ballot
 ├─ id                 # 투표 참여 기록(Ballot) 고유 ID
 ├─ poll_id            # 참여한 투표 ID
 ├─ member_id nullable # 회원 투표자 ID (member.id 참조)
 ├─ voter_key nullable # 비회원 투표자 식별값
 ├─ created_at         # 최초 투표 일시
 └─ updated_at         # 마지막 투표/재투표 일시

ballot_selection
 ├─ ballot_id          # 투표 참여 기록 ID (ballot.id 참조)
 └─ option_id          # 실제 선택한 후보 ID (poll_option.id 참조)

poll_option_counter
 ├─ option_id          # 집계 대상 후보 ID
 └─ vote_count         # 해당 후보의 현재 득표 수

vote_history
 ├─ id                 # 재투표 이력 고유 ID
 ├─ ballot_id          # 어떤 투표 참여 기록에서 변경됐는지
 ├─ before_selection   # 변경 전 선택 후보 ID 또는 후보 ID 목록
 ├─ after_selection    # 변경 후 선택 후보 ID 또는 후보 ID 목록
 └─ created_at         # 변경 일시

idempotency_request
 ├─ id                 # 요청 처리 기록 고유 ID
 ├─ voter_key          # 요청한 투표자 식별값
 ├─ poll_id            # 대상 투표 ID
 ├─ idempotency_key    # 중복 요청 판별용 고유 키
 ├─ request_hash       # 동일 키의 요청 내용 비교용 해시값
 └─ created_at         # 요청 최초 처리 일시

```

---

# 13. 핵심 DB 제약조건

```sql
UNIQUE (poll_id, member_id)
UNIQUE (poll_id, voter_key)
UNIQUE (ballot_id, option_id)
UNIQUE (voter_key, poll_id, idempotency_key)
CHECK (vote_count >= 0)
```

PostgreSQL의 Partial Unique Index를 활용하면 `member_id IS NOT NULL`, `voter_key IS NOT NULL` 조건을 더 명확하게 분리할 수 있다.

---

# 14. 권장 기술 스택

## 14.1 Frontend

|분야|권장 기술|사용 목적|
|---|---|---|
|Framework|**React**|SPA UI|
|Language|**TypeScript**|타입 안정성|
|Build|**Vite**|빠른 개발/빌드|
|Routing|React Router|페이지 이동|
|Server State|**TanStack Query**|API cache / loading / invalidation|
|HTTP|Fetch 또는 Axios|REST API|
|Realtime|Browser EventSource|SSE|
|Styling|CSS Modules 또는 일반 CSS|1인 개발 단순화|
|Test|Vitest + React Testing Library|컴포넌트 테스트|

Redux를 먼저 도입하기보다는 서버 상태는 TanStack Query, 로컬 UI 상태는 `useState`/`useReducer`로 단순하게 시작한다.

## 14.2 Backend

|분야|권장 기술|사용 목적|
|---|---|---|
|Language|**Java 21**|Spring Boot 기반|
|Framework|**Spring Boot**|REST API|
|Security|Spring Security|관리자 인증/인가|
|ORM|Spring Data JPA|기본 CRUD / Domain persistence|
|Query|JPQL + DTO Projection|고정 조건 JOIN / 득표수·순위 등 집계 조회 / 필요한 데이터만 DTO 조회|
|Dynamic Query|QueryDSL|동적 검색 조건 / 관리자 검색·필터링 / 동적 정렬 및 Pagination|
|DB Migration|**Flyway**|스키마 버전 관리|
|Realtime|Spring MVC `SseEmitter`|SSE|
|Validation|Bean Validation|요청 검증|
|Test|JUnit 5|단위/통합 테스트|
|DB Integration Test|**Testcontainers**|실제 PostgreSQL 테스트|
|Docs|Spring REST Docs 또는 OpenAPI|API 문서|
|Monitoring|Spring Boot Actuator|Health / Metrics|

### 중요한 방향

조회 특성에 따라 Spring Data JPA, JPQL, QueryDSL의 역할을 구분한다.

- **Spring Data JPA**
    - 기본 CRUD
    - 단순 조건 조회
    - Entity 저장 및 Domain Persistence
    - 투표 저장 및 참여 여부 조회
- **JPQL + DTO Projection**
    - JOIN이 포함된 고정 조건 조회
    - 후보별 득표수 및 순위 집계
    - `COUNT`, `GROUP BY`, `ORDER BY` 등을 이용한 결과 조회
    - 화면에 필요한 데이터만 DTO 형태로 조회
- **QueryDSL**
    - 동적 검색 조건
    - 여러 검색 조건이 선택적으로 조합되는 조회
    - 관리자 투표 검색 및 필터링
    - 동적 정렬 및 Pagination이 필요한 관리자 조회
- **고부하 조회 최적화**
    - Redis Cache: 반복 조회가 많은 데이터 캐싱
    - DB Index: 검색 및 조회 성능 개선
    - Pagination: 대량 데이터의 조회 범위 제한
    - 필요한 경우 조회 쿼리 및 집계 구조 최적화

QueryDSL로 모든 조회를 구현할 수도 있지만, 단순 조회까지 QueryDSL을 적용하면 불필요한 코드와 설정 복잡도가 증가할 수 있다. 따라서 기본 CRUD와 단순 조회는 Spring Data JPA를 사용하고, 조건이 고정된 JOIN 및 집계 조회는 JPQL과 DTO Projection을 사용한다. 여러 검색 조건이 선택적으로 조합되는 관리자 검색 및 필터링에는 QueryDSL을 적용한다.

또한 반복 조회가 많거나 대량 데이터를 처리하는 조회는 특정 조회 기술에 의존하기보다 Redis Cache, DB Index, Pagination, 쿼리 및 집계 구조 최적화 등을 통해 별도로 성능을 개선한다.

## 14.3 Database

**PostgreSQL**

선택 이유:

- Transaction
- Row Lock
- 강력한 Constraint
- Partial Index
- `ON CONFLICT`
- JSONB
- 집계 Query
- 동시성 제어

## 14.4 Infrastructure / Deployment

|영역|권장|
|---|---|
|Cloud|**AWS EC2**|
|Container|**Docker**|
|Orchestration|Docker Compose|
|Reverse Proxy|Nginx|
|HTTPS|Let's Encrypt / Certbot|
|DB|PostgreSQL Docker Container|
|DB Storage|EBS Volume|
|Image Storage|S3 선택|
|Logs|Docker logs + Actuator, 이후 CloudWatch 확장|
|CI/CD|GitHub Actions 선택|

---

# 15. 배포 구조

2~3주 프로젝트에서는 Kubernetes까지 도입하지 않는다.

```text
Internet
   |
   v
AWS EC2
   |
   +-----------------------------+
   | Docker Compose              |
   |                             |
   |  Nginx                      |
   |   ├─ /       -> React       |
   |   └─ /api    -> Spring Boot |
   |                 ├─> Redis   |
   |                 └─> PostgreSQL
   +-----------------------------+
```

React Build 결과를 Nginx 이미지가 직접 서빙하면 실서비스 구성은 `nginx + backend + postgres + redis` 4개 Container로 구성할 수 있다.

---

# 16. AWS EC2 배포 구성

Security Group 최소 포트:

```text
22   SSH        관리자 IP만
80   HTTP       공개
443  HTTPS      공개
```

PostgreSQL `5432`는 외부에 공개하지 않고 Docker 내부 Network에서 Backend만 접근한다.

환경 변수:

```text
SPRING_DATASOURCE_URL
SPRING_DATASOURCE_USERNAME
SPRING_DATASOURCE_PASSWORD
JWT_SECRET
COOKIE_SECRET
CORS_ALLOWED_ORIGINS
```

Repository에 실제 Secret을 Commit하지 않는다.

---

# 17. Docker 전략

## Spring Boot

```text
Gradle Build Image
      ↓
JRE Runtime Image
```

Multi-stage Dockerfile을 사용한다.

## React

```text
Node Build
   ↓
Nginx Static Image
```

## Docker Compose

```yaml
services:
  nginx:
  backend:
  postgres:
  redis:
```

DB는 named volume 또는 EBS mount를 사용한다.

---

# 18. 테스트 전략

## 18.1 Unit Test

- Phase 계산
- T-30 판정
- 관리자 상태 transition

## 18.2 Integration Test

**Testcontainers + 실제 PostgreSQL**

```text
중복 ballot 생성 -> Unique Constraint 실패
재투표 -> 기존 -1 / 신규 +1
트랜잭션 중 오류 -> 전체 rollback
T-30 -> result API 숫자 미반환
```

## 18.3 동시성 테스트

예:

```text
100 Thread
동시에 같은 후보에 투표
```

검증:

```text
요청 성공 수 == vote_count 증가량
```

재투표도 동시 요청 테스트를 작성한다.

---

# 19. 부하 테스트

**k6** 권장.

### Scenario A

```text
1,000 VU
Poll Detail 조회
```

### Scenario B

```text
500 VU
동시에 투표
```

### Scenario C

```text
SSE 연결 500개 유지
+
동시 투표
```

측정:

- TPS
- p95 latency
- Error Rate
- DB CPU
- Connection Pool
- SSE 연결 수

목표는 "대규모 서비스라고 주장"하는 것이 아니라 **어떤 부하에서 병목이 발생했고, 어떤 방식으로 개선했는지 수치로 설명**하는 것이다.

---

# 20. Backend 성능 개선 포인트

## Connection Pool

HikariCP 기본 사용. 부하 테스트 후 `maximumPoolSize`, `connectionTimeout` 조정 근거를 기록한다.

## Index

```sql
INDEX poll(status, ends_at)
INDEX ballot(poll_id)
INDEX ballot_selection(option_id)
```

## N+1 방지

Poll + Options 조회 시 Fetch Join, EntityGraph, Projection 등을 선택적으로 사용한다.

---

# 21. Redis 도입 여부

## 초기 구현

Redis를 프로젝트 초기부터 도입한다.
Redis는 PostgreSQL과 같은 디스크 기반 저장소와 달리 메모리(RAM)에 데이터를 저장하므로 빠르게 데이터에 접근할 수 있다.
TOP 서비스에서는 조회가 자주 발생하는 **인기 투표 목록을 빠르게 제공하기 위한 Cache 용도**로 Redis를 우선 사용한다.

## MVP(Minimum Viable Product)

초기에는 Redis의 활용 범위를 크게 확장하지 않고 다음 기능만 구현한다.

- 인기 투표 목록 조회 Cache
- 일정 시간 동안 조회 결과를 Redis에 저장
- Cache에 데이터가 있으면 Redis에서 조회
- Cache에 데이터가 없으면 PostgreSQL에서 조회 후 Redis에 저장

```text
인기 투표 조회 요청
        ↓
Redis Cache 확인
   ↓          ↓
있음        없음
 ↓            ↓
Redis 반환   PostgreSQL 조회
              ↓
         Redis에 Cache 저장
              ↓
             반환
```

이를 통해 자주 조회되는 데이터를 매번 PostgreSQL에서 조회하지 않고 Redis에서 빠르게 반환하도록 한다.

## 확장 기능

추후 필요에 따라 Redis를 다음 용도로 확장할 수 있다.

- SSE Fan-out
- Rate Limit
- 서버 다중 인스턴스 환경의 데이터 공유
- 실시간 순위 Cache

초기 구현에서는 인기 투표 조회 Cache에 집중하여 Redis의 기본적인 캐싱 구조를 경험하는 것을 목표로 한다.

---

# 22. 개발 역량을 높일 수 있는 핵심 기능

## Priority A — 반드시 구현

1. **DB Unique Constraint 기반 중복 투표 방지** — 데이터 정합성 / DB 설계
2. **재투표 Transaction** — ACID / Rollback / 일관성
3. **T-30 서버 상태 판정** — Domain Rule / 시간 기반 상태 전이
4. **동시 투표 정확한 집계** — Concurrency / Atomic Update / Lock
5. **SSE** — 실시간 서버 Push / Connection 관리
6. **Redis 인기 투표 조회 Cache** — 조회 성능 개선 / Cache 기본 구조
7. **결과 비공개 전환** — API 보안 / 상태 기반 Response 제어
8. **Docker + EC2** — 실제 배포 / Linux / Network / Reverse Proxy

## Priority B — 완성도 향상

8. **Idempotency** — 네트워크 재시도 대응
9. **Testcontainers** — PostgreSQL 통합 테스트
10. **k6 부하 테스트** — 병목 분석 / 성능 측정

## Priority C — 시간이 남으면

- Rate Limiting
- GitHub Actions CI/CD
- CloudWatch
- S3 이미지 업로드
- 관리자 통계 Dashboard
- 다중 Spring Boot Instance

---

# 23. 구현하지 않는 것을 권장하는 기능

## Kubernetes

현재 핵심 목표는 투표 도메인의 정합성과 동시성이다. EC2 + Docker Compose만으로도 충분히 배포 역량을 보여줄 수 있다.

## Kafka

현재 규모에서는 과도하다. SSE 이벤트 전달은 Spring Application Event 수준으로 시작하고 실제 병목이 확인될 때 Message Broker를 고려한다.

## Microservice

Poll / Vote / Member 서비스를 분리하지 않는다. 1인 단기 프로젝트에서는 **잘 설계된 Modular Monolith**가 더 적절하다.

---

# 24. 권장 Backend 구조

Package By Feature 권장:

```text
com.top
 ├─ auth
 ├─ poll
 │   ├─ controller
 │   ├─ service
 │   ├─ domain
 │   ├─ repository
 │   └─ dto
 ├─ vote
 │   ├─ controller
 │   ├─ service
 │   ├─ domain
 │   ├─ repository
 │   └─ event
 ├─ admin
 └─ common
     ├─ config
     ├─ exception
     └─ security
```

Controller 중심 구조보다 Domain/Service가 정책을 갖도록 한다.

---

# 25. API 오류 코드 예시

```text
POLL_NOT_FOUND
POLL_NOT_STARTED
POLL_PAUSED
POLL_CLOSED
INVALID_SELECTION_COUNT
INVALID_POLL_OPTION
DUPLICATE_VOTE
IDEMPOTENCY_CONFLICT
UNAUTHORIZED
FORBIDDEN
```

HTTP Status만 반환하기보다 Frontend가 분기할 수 있는 Error Code를 함께 반환한다.

---

# 26. 운영 관점

## Health Check

```http
GET /actuator/health
```

## Logging

최소 로그:

```text
requestId
pollId
voterKey 일부 Masking
event
result
latency
```

익명 토큰 전체 값이나 비밀번호는 로그에 남기지 않는다.

---

# 27. 2~3주 개발 일정

## 1주차 — Core Backend

- Day 1~2: DB 모델링, Poll/Candidate, Flyway, 관리자 인증 기본, Redis 기본 연동
- Day 3~4: 단일 투표, 중복 방지, 익명 voter token, 재투표 Transaction
- Day 5~7: T-30, 동시성 안전한 집계, 단위/통합 테스트

## 2주차 — Full Stack + Realtime

- Day 8~9: React 화면 연결, Poll 목록/상세, 투표 UI
- Day 10~11: SSE, 실시간 집계, 결과 비공개 전환
- Day 12~13: 관리자 페이지 연결 및 UI 보완

## 3주차 — Deployment + Verification

- Day 15~16: Dockerfile, Docker Compose, Nginx
- Day 17: EC2 배포, HTTPS
- Day 18: Testcontainers 보완
- Day 19: k6 부하 테스트
- Day 20: 병목 개선
- Day 21: README, Architecture Diagram, ERD, 테스트 결과 정리

---

# 28. 최종 권장 기술 스택

```text
Frontend
React               → 사용자 화면(UI)을 만든다
TypeScript          → JavaScript 코드의 타입 오류를 줄인다
Vite                → React 개발과 배포용 빌드를 담당한다
React Router        → URL에 따라 화면을 전환한다
TanStack Query      → 서버에서 받아온 데이터를 React에서 관리한다
EventSource(SSE)    → 서버가 보내는 실시간 데이터를 브라우저에서 받는다

Backend
Java 21             → Spring Boot 백엔드 코드를 작성하는 언어
Spring Boot         → 서버의 실제 업무 로직과 API 처리
Spring Web MVC      → HTTP 요청·응답과 REST API 처리
Spring Security     → 로그인과 접근 권한 관리
Spring Data JPA     → Java 객체를 DB에 저장·조회하기 쉽게 한다
JPQL + DTO Projection → 필요한 데이터를 조건에 맞게 조회
QueryDSL            → 동적으로 변하는 조회 조건 처리
Bean Validation     → 서버로 들어온 요청 데이터가 올바른지 검사
SseEmitter          → Spring Boot에서 SSE 실시간 데이터 전송
Flyway              → DB 구조 변경 이력 관리
JUnit 5             → Java/Spring 코드 동작 테스트
Testcontainers      → 실제 PostgreSQL 환경으로 통합 테스트

Database
PostgreSQL          → 투표·후보·사용자·득표 수 등 실제 데이터 저장

Cache
Redis               → 자주 조회하는 데이터를 임시 저장해 빠르게 반환
Spring Data Redis   → Spring Boot에서 Redis를 쉽게 사용하게 해준다

Infra
AWS EC2             → 실제 서비스를 실행하는 클라우드 서버
Docker              → 프로그램과 실행 환경을 컨테이너로 포장
Docker Compose      → 여러 Docker 컨테이너를 함께 실행·관리
Nginx               → 외부 요청을 받아 React 또는 Spring Boot로 전달
Let's Encrypt       → HTTPS 통신에 필요한 인증서 발급

Performance / Test
k6                  → 많은 사용자의 요청을 만들어 부하 테스트
Spring Boot Actuator → 서버 상태와 기본 성능 정보 확인

Optional
GitHub Actions      → 테스트·빌드·배포 작업 자동화
AWS S3              → 이미지 같은 파일 저장
CloudWatch          → AWS 서버의 로그와 상태 모니터링
```

---

# 29. 포트폴리오에서 강조할 핵심

> React + Spring Boot + PostgreSQL 기반의 실시간 투표 서비스를 설계·개발했습니다.  
> 단순 투표 CRUD가 아니라 PostgreSQL Unique Constraint를 통한 중복 투표 방지,  
> 재투표 시 기존 득표 감소와 신규 득표 증가를 하나의 트랜잭션으로 처리하고,  
> 동시 투표 상황에서도 원자적 UPDATE를 사용해 정확한 집계를 유지했습니다.  
> 또한 마감 30분 전 결과 비공개 정책을 서버 시간 기준으로 판정하고 SSE 실시간 결과 스트림을 결과 공개 정책과 연동했습니다.  
> Redis를 이용해 인기 투표 목록 조회 Cache를 구현하고, Testcontainers와 k6로 정합성과 동시성을 검증한 뒤 Docker Compose 기반으로 AWS EC2에 실제 배포했습니다

---

# 30. 최종 구현 우선순위

```text
1. PostgreSQL + Flyway
   Poll / Candidate 테이블
↓
2. Spring Boot
   Poll 목록 / 상세 GET API
↓
3. Redis 기본 연동
   Spring Data Redis / 연결 설정
   Redis Container / Cache 설정
↓
4. 인기 투표 조회 Cache
   Cache Hit / Miss
   PostgreSQL 조회 후 Cache 저장
↓
5. React
   Poll API 연결
↓
6. 익명 Cookie 식별
↓
7. 단일 투표 POST
↓
8. DB 중복 방지
↓
9. Idempotency
↓
10. 재투표 Transaction
↓
11. Atomic +1 / -1
↓
12. T-30 서버 판정
↓
13. SSE
↓
14. 관리자 + QueryDSL
↓
15. Testcontainers
↓
16. k6
↓
17. Docker
↓
18. Nginx + AWS EC2 + HTTPS
↓
19. CI/CD (선택)
```

핵심은 기능 수를 늘리는 것이 아니라:

**중복 방지 → 트랜잭션 → 동시성 → 상태 전이 → 실시간 처리 → 테스트 → 배포**

의 흐름을 완성하는 것이다.