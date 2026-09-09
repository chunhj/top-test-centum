# TOP Development Roadmap

## 1. 사용 방법

이 문서는 TOP 프로젝트의 **구현 순서, 단계별 범위와 완료 기준**만 관리한다.

### 상태 관리 규칙

- 실제 구현 완료 여부는 `CODE_SUMMARY.md`와 현재 Repository 상태를 기준으로 판단한다.
- 이 문서에는 완료/미완료 상태를 기록하지 않는다.
- `CODE_SUMMARY.md`의 `현재 다음 작업`에 지정된 단계 **1개만** 수행한다.
- 이미 구현되고 검증된 작업은 반복하지 않는다.
- `CODE_SUMMARY.md`와 실제 코드가 다르면 실제 코드와 검증 결과를 기준으로 `CODE_SUMMARY.md`를 바로잡는다.
- 현재 단계가 완료되면 `CODE_SUMMARY.md`의 `현재 다음 작업`을 이 문서의 바로 다음 단계로 갱신한다.

작업 시작 시:

1. `AGENTS.md`를 확인한다.
2. `CODE_SUMMARY.md`에서 실제 현재 상태와 `현재 다음 작업`을 확인한다.
3. 이 문서에서 해당 단계의 범위와 완료 기준을 확인한다.
4. 현재 단계에 필요한 `docs/`와 기존 코드만 확인한다.
5. 구현 후 필요한 테스트/빌드/실행 검증을 수행한다.
6. 실제 검증된 내용만 `CODE_SUMMARY.md`에 반영한다.
7. `현재 다음 작업`을 바로 다음 단계로 갱신한 뒤 중단한다.

공통 원칙:

- 다음 단계의 기능을 미리 구현하지 않는다.
- 요구사항, API 계약, DB 제약, 기술 스택을 임의로 추가하거나 변경하지 않는다.
- 문서에 결정된 구현 방식은 그대로 적용한다.
- 문서와 기존 코드로 결정 가능한 사항은 다시 묻지 않는다.
- 세부 선택이 필요하면 요구사항과 설계를 바꾸지 않는 범위에서 가장 단순하고 적절한 방법을 사용한다.
- 관련 없는 리팩터링, 추상화, Dependency를 추가하지 않는다.
- 실행하지 못했거나 실패한 검증은 완료로 기록하지 않는다.
- 기획/설계/시안 원본은 별도 요청이 없는 한 수정하지 않는다.
- 문서 충돌, 필수 외부 접근정보 부족, 데이터 삭제 등 사용자 판단이 필요한 경우에만 질문한다.

단계 완료 후 보고:

1. 완료한 작업
2. 주요 기술적 결정과 이유
3. 실행한 테스트/검증과 결과
4. 미완료 또는 검증하지 못한 항목
5. 다음 단계 번호와 작업명

사용자가 `다음 단계 진행`, `계속`, 또는 특정 단계 진행을 명시하기 전에는 다음 번호의 구현을 시작하지 않는다.

## 2. Source of truth

| 구분 | 문서 |
|---|---|
| 서비스 요구사항 | `docs/requirements.md` |
| DB / API / 동시성 / 테스트 / 배포 설계 | `docs/technical-design.md` |
| UI / UX | `docs/mockups/*.html` |
| Agent 공통 규칙 / 구현 원칙 | `AGENTS.md` |
| 실제 구현 상태 | `CODE_SUMMARY.md` |

`requirements.md`, `technical-design.md`, mockup HTML은 구현 기준 자료이며 임의로 내용을 추가하거나 다른 설계로 바꾸지 않는다.

## 3. IDE / 모델

- 주 IDE: **VS Code**
- **Terra Light**: 단순 점검, 테스트 스크립트, 운영 설정 등 기계적인 작업
- **Sol Light**: 범위가 명확한 일반 구현
- **Sol Medium**: 트랜잭션, 동시성, 보안, 상태 전이, SSE 등 핵심 구현
- IntelliJ는 필요 시 사람이 Java 디버깅을 보조할 때만 사용한다.

---

# 4. 구현 단계

## 준비 단계

| 단계 | 작업 | 모델 |
|---:|---|---|
| 1 | 기존 Repository 골격 확인 | Terra Light |
| 2 | Codex CLI 설치 | Terra Light |
| 3 | VS Code Codex Extension 설치 | Terra Light |
| 4 | ChatGPT 계정 로그인 | Terra Light |
| 5 | VS Code에서 `top` Repository 루트 열기 | Terra Light |
| 6 | `docs/`, `docs/mockups/` 구조 준비 | Terra Light |
| 7 | 기획서 / 설계서 / HTML 시안 배치 | Terra Light |
| 8 | Agent가 현재 Repository 상태 확인 | Sol Light |
| 9 | Frontend / Backend 빌드·기동 상태 검증 | Sol Light |

준비 단계의 실제 완료 여부는 `CODE_SUMMARY.md`와 현재 Repository 상태를 기준으로 한다.

---

## 10. PostgreSQL + Flyway 초기 구성

**모델:** Sol Light

**작업:** Backend dependency/설정 확인 → PostgreSQL 연결 설정 → Flyway dependency와 migration 기반 → Secret 환경변수 분리 → 실제 연결/기동 또는 관련 테스트 검증.

**완료 기준:** Spring Boot PostgreSQL 기동 가능 · Flyway 정상 동작 · Secret 하드코딩 없음 · 검증 결과 `CODE_SUMMARY.md` 기록.

## 11. Poll / PollOption Schema + Poll GET API

**모델:** Sol Medium

**작업:** Flyway로 Poll/PollOption Schema → 문서 구조에 맞는 Poll 도메인 → `GET /api/polls` → `GET /api/polls/{pollId}` → 조회 테스트. Vote/SSE/관리자 기능은 구현하지 않는다.

**완료 기준:** Schema 생성 · 목록/상세 API 구현 · 관련 테스트 성공.

## 12. Redis 기본 연동 + 인기 투표 목록 Cache

**모델:** Sol Light

**작업:** Spring Data Redis 연결/설정 → 인기 투표 목록 Cache → Hit 시 Redis 반환 → Miss 시 PostgreSQL 조회 후 Redis 저장/반환. Redis를 SSE fan-out, Rate Limit, 실시간 순위 등으로 확대하지 않는다.

**완료 기준:** Redis 연결 · Cache Hit/Miss · PostgreSQL fallback · 다른 Redis 확장 기능 없음.

## 13. React Poll API 연결

**모델:** Sol Light

**작업:** Poll 목록/상세 API 연결 → TanStack Query로 서버 상태 관리 → 필요한 시안의 UI/UX 반영 → mockup의 가짜 데이터/집계 로직 제거 → 서버 응답을 화면 상태 기준으로 사용.

**완료 기준:** Poll 목록/상세 조회 · TanStack Query 사용 · 시안 기준 기본 사용자 화면 · Frontend build/test 성공.

## 14. 비회원 익명 Cookie 식별

**모델:** Sol Medium

**작업:** 서버 익명 식별 토큰 발급 → `HttpOnly`, `Secure`, `SameSite=Lax` → DB에는 원문 대신 SHA-256/HMAC 기반 `voter_key` 저장 → 로그인 강제 없이 식별 → 민감값 로그 노출 검증.

**완료 기준:** 익명 Cookie 발급 · 보안 속성 적용 · 원문 토큰 DB 저장 금지 · 익명 식별 가능 · 테스트 성공.

## 15. 단일 투표 POST + DB 중복 방지

**모델:** Sol Medium

**작업:** `POST /api/polls/{pollId}/votes` → `optionId` 검증 → Poll/Phase/투표자/후보 검증 → `ballot`, `ballot_selection` → DB Unique Constraint 기반 중복 참여 차단. Idempotency와 재투표는 아직 구현하지 않는다.

**완료 기준:** 단일 선택만 허용 · DB 제약 중복 차단 · 잘못된 후보/상태 거부 · 관련 테스트 성공.

## 16. Idempotency 구현

**모델:** Sol Medium

**작업:** `Idempotency-Key` 수신 → `idempotency_request`에 key + voter + poll + request hash + 생성 시각 저장 → 동일 요청 재시도 중복 반영 금지 → 동일 key + 다른 payload는 `IDEMPOTENCY_CONFLICT` → Unique Constraint.

**완료 기준:** 동일 요청 중복 반영 0 · payload 충돌 처리 · DB Unique Constraint · 관련 테스트 성공.

## 17. 재투표 Transaction

**모델:** Sol Medium

**작업:** ballot 조회 → Poll/Phase 재검증 → 기존 후보 count -1 → 신규 후보 count +1 → selection 변경 → `vote_history` 저장을 하나의 Spring Transaction으로 처리. 같은 후보 재선택은 중복 증가시키지 않고 SSE는 아직 구현하지 않는다.

**완료 기준:** 한 Transaction · 기존 -1/신규 +1 · Selection 변경 · History 기록 · 중간 실패 전체 Rollback · 같은 후보 중복 증가 없음.

## 18. Atomic Counter + 동시성 안전성

**모델:** Sol Medium

**작업:** Java read-modify-save 금지 → PostgreSQL Atomic Update → 재투표 -1/+1 동일 Transaction → 여러 option row는 `option_id ASC` 등 일관된 순서 → `vote_count >= 0` → 동시 투표/재투표 테스트.

**완료 기준:** Atomic +1/-1 · Lost Update 방지 · Deadlock 위험 완화 · 동시 투표 및 재투표 정합성 테스트 성공.

## 19. T-30 서버 Phase 판정

**모델:** Sol Medium

**작업:** DB `status`, `starts_at`, `ends_at`과 서버 시간으로 Phase 계산 → 정확한 T-30 경계 → `RESULTS_HIDDEN`에서는 투표/재투표 허용하되 REST 숫자 결과 제거 → 종료 후 투표 차단 및 최종 결과 공개.

**완료 기준:** 서버 기준 Phase · 정확한 T-30 경계 · T-30 숫자 미전송 · T-30 투표/재투표 가능 · 마감 후 차단 · 테스트 성공.

## 20. SSE 실시간 결과

**모델:** Sol Medium

**작업:** Spring MVC `SseEmitter` → `GET /api/polls/{pollId}/stream` → DB Commit 성공 후 Event → T-30 진입 시 `phase-changed: RESULTS_HIDDEN` → 이후 숫자 Event 중단 → React `EventSource` → 재투표 결과 실시간 반영.

**완료 기준:** SSE 연결 · Commit 이후 전송 · React 실시간 반영 · T-30 phase 변경 · T-30 이후 숫자 Event 없음 · 관련 테스트 성공.

## 21. 관리자 + Spring Security + QueryDSL

**모델:** Sol Medium

**작업:** 관리자 인증/인가 → Poll 생성/수정 → 시작/일시정지/재개/마감 → 서버 상태 전이 재검증 → 본인 투표 목록/참여 수/상태 조회 → 관리자 동적 검색/필터/정렬/Pagination에만 QueryDSL → 관리자 시안 실제 API 연결.

**완료 기준:** 관리자 인증/인가 · 문서 Admin Endpoint · 상태 전이 서버 검증 · 필요한 QueryDSL · 관리자 화면 API 연결 · 테스트 성공.

## 22. Testcontainers 통합/정합성 테스트 완성

**모델:** Sol Medium

**필수 검증:** 중복 Ballot DB 차단 · 최초 투표 +1 · 재투표 기존 -1/신규 +1 · 중간 오류 전체 Rollback · 멱등성 재시도 · T-30 API 숫자 없음 · 마감 후 투표 차단/최종 결과 · 동시 투표 count 정합성 · 동시 재투표 정합성 · SSE Commit 이후 전송 · T-30 이후 SSE 숫자 없음.

**완료 기준:** 실제 PostgreSQL Testcontainers 기준 필수 통합/동시성/SSE 테스트 성공 · 실패를 테스트 삭제/완화로 숨기지 않음.

## 23. k6 부하 테스트

**모델:** Terra Light

**작업:** 문서의 Scenario A/B/C → Poll Detail 조회 부하 · 동시 투표 부하 · SSE 연결 유지 + 동시 투표 부하 → TPS/p95/Error Rate 및 확인 가능한 DB/Connection Pool/SSE 지표 기록. 임의 성능 목표나 Scenario는 추가하지 않는다.

**완료 기준:** A/B/C 스크립트 · 실제 실행 결과 · 측정 수치 기록 · 실행하지 못한 지표는 미검증 표기.

## 24. Docker + Docker Compose + Nginx

**모델:** Sol Medium

**작업:** Spring Boot multi-stage Dockerfile → React build/Nginx static image → Compose `nginx`, `backend`, `postgres`, `redis` → `/` React · `/api` Spring Boot → PostgreSQL 5432 외부 비공개 → 전체 Compose 검증.

**완료 기준:** 4개 서비스 Compose · Frontend 정적 서빙 · `/api` Reverse Proxy · PostgreSQL 내부 Network · Compose build/up 성공.

## 25. AWS EC2 배포 + HTTPS

**모델:** Sol Medium

**작업:** EC2 Docker/Compose 배포 → Security Group에서 22 관리자 IP만, 80/443 공개, 5432 비공개 → Nginx → Let's Encrypt/Certbot HTTPS → 실제 외부 접속 검증.

**완료 기준:** 접근 정보가 있으면 EC2/HTTPS/`/`/`/api`/5432 비노출을 실제 검증. 접근 정보가 없으면 완료 처리하지 않고 Repository에서 준비 가능한 구성/명령과 미검증 항목만 기록.

## 26. Health Check / Logging / Secret 운영 확인

**모델:** Terra Light

**작업:** `/actuator/health` → 최소 로그의 requestId/pollId/masking voterKey/event/result/latency 확인 → 익명 Token 원문·비밀번호·JWT·DB Secret 로그 금지 → Secret Commit 여부 확인.

**완료 기준:** Health Check 정상 · 최소 로그 확인 · 민감정보 로그 없음 · 실제 Secret Commit 없음.

## 27. GitHub Actions CI/CD — 선택

**모델:** Terra Light

핵심 구현과 배포가 완료되고 시간이 남는 경우에만 문서의 Optional 범위에서 기존 Frontend/Backend build·test 흐름을 자동화한다. 문서 밖 배포 플랫폼/도구를 추가하지 않고 Secret은 GitHub Secret을 사용한다.

**완료 기준:** 미구현이어도 핵심 프로젝트 완료에 영향 없음 · 구현 시 기존 build/test 자동화 · Secret 하드코딩 없음.

## 28. 최종 완료 검증

**모델:** Sol Medium

새 기능을 추가하지 않고 `AGENTS.md`, `CODE_SUMMARY.md`, `requirements.md`, `technical-design.md`와 실제 코드/테스트를 대조한다.

검증 흐름:

```text
DB 중복 방지
→ 재투표 Transaction / Rollback
→ Atomic Counter / 동시성
→ 서버 Phase / T-30
→ SSE / 결과 비공개
→ 관리자 상태 전이
→ Testcontainers
→ k6
→ Docker / Compose / Nginx
→ EC2 / HTTPS / Health
```

**완료 기준:** 필수 요구사항과 실제 코드 일치 · 핵심 Backend 정합성 검증 · Frontend 실제 Backend/SSE 연결 · 필수 테스트 성공 · Docker 배포 구조 동작 · 외부 접근으로 미검증인 항목은 정확히 표시 · `CODE_SUMMARY.md`가 실제 Repository 상태와 일치.

---

# 5. 모델 선택 요약

| 단계 | 작업 | 모델 |
|---|---|---|
| 1~7 | 설치 / 폴더 / 파일 | Terra Light |
| 8~9 | Repository 상태 / 기본 검증 | Sol Light |
| 10 | PostgreSQL + Flyway | Sol Light |
| 11 | Poll Schema/API | Sol Medium |
| 12 | Redis Cache | Sol Light |
| 13 | React API 연결 | Sol Light |
| 14~22 | 익명 식별부터 핵심 정합성/SSE/Testcontainers | Sol Medium |
| 23 | k6 | Terra Light |
| 24~25 | Docker/Compose/Nginx, EC2/HTTPS | Sol Medium |
| 26 | Health/Logging | Terra Light |
| 27 | GitHub Actions 선택 | Terra Light |
| 28 | 최종 검증 | Sol Medium |
