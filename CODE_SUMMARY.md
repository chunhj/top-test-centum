# CODE_SUMMARY.md — TOP

> 현재 Repository의 실제 구현 상태를 빠르게 파악하기 위한 요약 문서다.
> 계획이 아니라 **실제로 구현된 내용만** 기록한다.
> 의미 있는 기능 완료나 구조 변경 시 갱신하며, 가능하면 150줄 이하로 유지한다.

## 1. 현재 상태

- Frontend와 Backend 기본 골격 생성 완료
- 도메인 기능은 아직 구현되지 않음
- `AGENTS.md`에 개발 규칙, 기술 스택, 핵심 정책, 구현 순서가 정의되어 있음
- 상세 요구사항/설계/UI 시안은 `docs/`에 별도 보관 예정

## 2. Repository 구조

현재 기준:

```text
top/
├─ AGENTS.md
├─ CODE_SUMMARY.md
├─ frontend/
│  ├─ src/
│  │  ├─ App.tsx
│  │  ├─ index.css
│  │  └─ main.tsx
│  ├─ index.html
│  ├─ package.json
│  └─ vite.config.ts
├─ backend/
│  ├─ gradle/wrapper/
│  ├─ src/main/java/com/top/BackendApplication.java
│  ├─ src/main/resources/application.properties
│  ├─ src/test/java/com/top/BackendApplicationTests.java
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

- React 애플리케이션이 `TOP` 기본 화면을 렌더링함
- Spring Boot 애플리케이션이 내장 Tomcat으로 기동됨
- Poll 등 도메인 흐름은 아직 없음

## 4. 코드에 반영된 주요 결정

- Frontend: React 19, TypeScript 6, Vite 8
- Backend: Java 21, Spring Boot 4.1.1, Gradle 9.7.1
- Backend는 기본 기동 확인에 필요한 Spring Web MVC만 포함
- JPA, Flyway, Security 등은 해당 구현 단계에서 추가

## 5. 실제 성공한 실행 / 테스트 명령

```bash
cd frontend
npm run build
npm run dev -- --host 127.0.0.1

cd backend
./gradlew test
./gradlew bootRun --args="--server.address=127.0.0.1"
```

- Frontend `/`: HTTP 200 확인
- Backend: 8080 포트 기동 확인 (`/`는 도메인 엔드포인트가 없어 HTTP 404)

## 6. 미완성 항목 / 다음 작업

현재 다음 작업:

1. PostgreSQL + Flyway 초기 구성
2. Poll / PollOption 기본 Schema 및 조회 API 구현
3. Redis 인기 투표 Cache
4. React와 Poll API 연결

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
