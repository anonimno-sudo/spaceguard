SPACEGuard — 간단 아키텍처 요약 (KO)

1) 목표
SPACEGuard는 Windows 데스크톱을 위한 방어 중심 모듈식 안티바이러스 애플리케이션입니다. UI는 Electron/Node, 핵심 탐지 엔진은 네이티브 C++/C# 모듈 및 Python 보조 분석 도구로 구성됩니다.

2) 주요 구성요소
- UI (Electron/Renderer): `index.html`, `renderer.js`, `i18n.js` — 다국어(TR/KO) 지원.
- 엔진 브리지: `engine_bridge.js` — Node 프로세스와 네이티브 보조 프로세스 간 IPC (JSON).
- 실시간 모니터링: `realtime_monitor.cpp` / `realtime_monitor.exe` — 파일 활동 캡처 (유저 모드: ReadDirectoryChangesW; 커널 모드 옵션: 필터 드라이버).
- 시그니처 스캐너: `scanner_core.cpp` / `signatures.json` — 간단한 JSON 시그니처 DB를 사용.
- 행동 및 스코어링: `behavior_engine.py`, `scoring_engine.js`, `ai_engine.py` — 이벤트 집계 및 위험 점수화.
- 격리 관리: `quarantine_manager.js` — 파일 격리 및 메타데이터 관리.
- 업데이트 관리자: `update_manager.js`, `config_signer.js`, `sg_master_public.pem` — 업데이트 검증 및 서명.
- 텔레메트리 및 로깅: `database.js`, `error.log` — 개인정보 보호 지침 준수.

3) 보안 규칙
- 최소 권한 원칙과 중요한 작업에 대한 관리자 권한 확인.
- 코드 서명: 모든 네이티브 바이너리 및 인스톨러 서명 권장.
- 업데이트 검증 및 무결성 검사.
- 텔레메트리 기본 비활성화 및 익명화.

4) 성능 목표
- 유휴 시 CPU 증가 < 2%.
- 스트리밍 스캔 및 병렬 처리.
- I/O 스로틀 및 파일 크기 제한.

5) 테스트 및 CI
- 단위 테스트: `quarantine_manager.test.js`, `engine_bridge.test.js`.
- 통합 테스트: `e2e/` 디렉터리.
- 퍼징 권장: yara 기반 테스트, fuzzing 도구 사용.
- CI: GitHub Actions / Azure Pipelines에 코드 서명 작업 구성.

6) 디렉터리 요약
- app/, engines/, libs/, docs/ (이 파일들).

7) 제약 사항
- 커널 드라이버, PPL 권한, 정식 인증서 등은 생산 배포에 추가 요구사항이 있습니다.

8) 다음 단계
- 간단한 시그니처 스캐너와 UI<->엔진 예제는 docs/에 포함되어 있습니다.
