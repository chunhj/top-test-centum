# CODE_SUMMARY.md — TOP

> 현재 Repository의 실제 구현 상태를 빠르게 파악하기 위한 요약 문서다.
> 계획이 아니라 **실제로 구현된 내용만** 기록한다.
> 의미 있는 기능 완료나 구조 변경 시 갱신하며, 가능하면 150줄 이하로 유지한다.

## 1. 현재 상태

- 프로젝트 준비 단계
- 실제 애플리케이션 코드는 아직 구현되지 않음
- `AGENTS.md`에 개발 규칙, 기술 스택, 핵심 정책, 구현 순서가 정의되어 있음
- 상세 요구사항/설계/UI 시안은 `docs/`에 별도 보관 예정

## 2. Repository 구조

현재 기준:

```text
top/
├─ AGENTS.md
├─ CODE_SUMMARY.md
└─ docs/
   ├─ requirements.md
   ├─ technical-design.md
   └─ mockups/
      ├─ web.html
      └─ mobile.html
```

`frontend/`, `backend/`는 실제 생성 후 이 문서에 반영한다.

## 3. 실제 구현된 주요 흐름

아직 없음.

구현 완료된 기능만 여기에 기록한다.

예:

```text
Poll 목록 조회
React -> GET /api/polls -> Spring Boot -> PostgreSQL -> Response
```

## 4. 코드에 반영된 주요 결정

현재 실제 코드에 반영된 결정은 없음.

구현 후 다음과 같은 항목만 기록한다.

- 실제 적용된 Package 구조
- 실제 적용된 DB Schema / Migration
- 실제 사용 중인 조회 방식
- 실제 적용된 Transaction / Concurrency 처리
- 실제 적용된 Cache / SSE 구조
- 설계 문서와 달라진 중요한 결정

## 5. 실제 성공한 실행 / 테스트 명령

아직 없음.

성공이 확인된 명령만 기록한다.

예:

```bash
./gradlew test
npm test
docker compose up -d
```

실행하지 않았거나 실패한 명령은 성공한 것으로 기록하지 않는다.

## 6. 미완성 항목 / 다음 작업

현재 다음 작업:

1. 개발 환경 확인
2. `frontend/` React + TypeScript + Vite 초기화
3. `backend/` Java 21 + Spring Boot + Gradle 초기화
4. PostgreSQL + Flyway 초기 구성
5. Poll / PollOption 기본 Schema 및 조회 API 구현

세부 구현 순서는 `AGENTS.md`를 따른다.

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
