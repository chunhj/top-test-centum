# CODE_SUMMARY.md — TOP

> 현재 Repository의 실제 구현 상태를 빠르게 파악하기 위한 요약 문서다.
> 계획이 아니라 **실제로 구현된 내용만** 기록한다.
> 의미 있는 기능 완료나 구조 변경 시 갱신하며, 가능하면 150줄 이하로 유지한다.

## 1. 현재 상태

- Frontend와 Backend 기본 골격 생성 완료
- PostgreSQL/JPA/Flyway 설정과 Poll/PollOption 조회 기능 구현
- PostgreSQL 17.11에서 Spring Boot 기동, Flyway V1/V2 적용, Hibernate schema 검증 완료
- Poll 목록/상세 API와 오류 응답의 실제 HTTP 동작 확인
- Redis 7 연동과 진행 중 투표 목록 Cache Hit/Miss 동작 확인
- React에서 Poll 목록/상세 API를 TanStack Query로 연결하고 반응형 사용자 화면 구현
- `AGENTS.md`에 개발 규칙, 기술 스택, 핵심 정책이 정의되어 있음
- `ROADMAP.md`에 구현 순서, 단계별 범위와 완료 기준이 정의되어 있음
- 상세 요구사항/설계/UI 시안은 `docs/`에 별도 보관 예정

## 2. Repository 구조

현재 기준:

```text
top/
├─ AGENTS.md
├─ CODE_SUMMARY.md
├─ ROADMAP.md
├─ frontend/
│  ├─ src/
│  │  ├─ App.tsx
│  │  ├─ App.test.tsx
│  │  ├─ index.css
│  │  ├─ main.tsx
│  │  └─ pollApi.ts
│  ├─ index.html
│  ├─ package.json
│  └─ vite.config.ts
├─ backend/
│  ├─ gradle/wrapper/
│  ├─ src/main/java/com/top/BackendApplication.java
│  ├─ src/main/java/com/top/poll/ (controller/service/domain/repository/dto)
│  ├─ src/main/java/com/top/common/exception/
│  ├─ src/main/resources/db/migration/
│  ├─ src/main/resources/application.properties
│  ├─ src/test/java/com/top/BackendApplicationTests.java
│  ├─ src/test/java/com/top/poll/PollApiTest.java
│  ├─ src/test/java/com/top/poll/PollCacheTest.java
│  ├─ build.gradle
│  └─ settings.gradle
└─ docs/
   ├─ requirements.md
   ├─ technical-design.md
   └─ mockups/
      ├─ web-mockup.html
      └─ mobile-mockup.html
```

## 3. 실제 구현된 주요 흐름

- React Router의 `/`에서 투표 목록, `/polls/:pollId`에서 후보를 포함한 투표 상세를 조회
- TanStack Query가 Poll 목록/상세의 로딩, 성공, 오류 서버 상태를 관리
- API 응답 데이터만 화면에 표시하며 mockup의 가짜 후보/득표/타이머 로직은 사용하지 않음
- Spring Boot 애플리케이션이 내장 Tomcat으로 기동됨
- `GET /api/polls`: Redis Cache Hit이면 캐시 반환, Miss이면 DB에서 `OPEN` 투표를 생성일 역순 조회 후 캐시 저장
- `GET /api/polls/{pollId}`: 투표 상세와 표시 순서 기준 후보 목록 조회
- 없는 투표는 HTTP 404와 `POLL_NOT_FOUND` 오류 코드 반환

## 4. 코드에 반영된 주요 결정

- Frontend: React 19, TypeScript 6, Vite 8
- Frontend API 개발 요청은 Vite proxy로 `127.0.0.1:8080` Backend에 전달
- React Router로 목록/상세 경로를 분리하고 TanStack Query로 서버 상태를 관리
- 후보 조회 화면은 투표 동작 없이 표시만 하며 실제 투표는 후속 단계에서 구현
- Backend: Java 21, Spring Boot 4.1.1, Gradle 9.7.1
- Backend는 Spring Web MVC, Spring Data JPA/Redis를 사용
- JPA, PostgreSQL Driver, Spring Boot Flyway Starter/PostgreSQL 모듈 포함
- DB 접속 정보는 `SPRING_DATASOURCE_*` 환경변수로만 주입
- Hibernate schema 자동 생성은 사용하지 않고 `ddl-auto=validate` 적용
- Poll/PollOption Schema는 Flyway V2로 관리하며 시간 범위와 상태를 DB 제약으로 보호
- 목록 조회에는 후보를 불러오지 않고 상세 조회에서만 EntityGraph로 후보를 함께 조회
- 진행 중 투표 목록 캐시는 Spring Cache/Redis를 재사용하고 기본 TTL은 60초이며 환경변수로 변경 가능
- Phase/사용자 투표 여부/Security는 해당 구현 단계에서 추가

## 5. 실제 성공한 실행 / 테스트 명령

```bash
cd frontend
npm run build
npm test
npm run lint
npm run dev -- --host 127.0.0.1

cd backend
./gradlew test
./gradlew bootRun --args="--server.address=127.0.0.1"
./gradlew clean test
$env:REDIS_INTEGRATION_TEST='true'; ./gradlew test --tests com.top.poll.PollCacheTest --tests com.top.poll.PollApiTest
```

- Frontend production build 성공, Vitest 목록/상세 API 화면 테스트 2개 성공, Oxlint 성공
- Vite 개발 서버 `/`, `/polls/1`: HTTP 200 확인
- Backend: 8080 포트 기동 확인 (`/`는 도메인 엔드포인트가 없어 HTTP 404)
- PostgreSQL 17.11 임시 DB에서 Flyway V1/V2 적용 성공
- 임시 PostgreSQL 17/Redis 7에서 Backend 전체 테스트 6개 성공
- Cache Hit/Miss와 PostgreSQL 조회 fallback, 실제 Redis 저장/조회 포함 관련 테스트 5개 성공
- 실제 HTTP 검증: 목록/상세 200, 없는 투표 404 + `POLL_NOT_FOUND`
- `git diff --check` 성공

## 6. 미완성 항목 / 다음 작업

### 현재 다음 작업

- `ROADMAP.md` 14. 비회원 익명 Cookie 설계

이 항목에는 실제로 다음에 수행할 단계 **1개만** 기록한다. 세부 구현 순서와 각 단계의 범위/완료 기준은 `ROADMAP.md`를 따른다.

## 7. 갱신 규칙

다음 경우에만 이 문서를 갱신한다.

- 의미 있는 기능 하나가 완료됨
- Repository 구조가 크게 변경됨
- API / DB / 아키텍처의 중요한 결정이 실제 코드에 반영됨
- 실행 또는 테스트 결과가 새로 검증됨
- 다음 작업 우선순위가 실제 구현 상태에 따라 변경됨

다음 경우에는 갱신하지 않아도 된다.

- 오타 수정
- 변수명 변경
- 사소한 UI 조정
- 작은 리팩터링
- 계획만 세운 상태

**계획을 구현 완료로 기록하지 않는다.**
