# HARNEX

[![npm version](https://img.shields.io/npm/v/%40runchr%2Fharnex)](https://www.npmjs.com/package/@runchr/harnex)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](./LICENSE)

English version: [README.md](./README.md)

HARNEX는 로컬 AI 스택을 위한 control-plane CLI입니다.  
OpenWork, PaperclipAI, OpenCode, Ollama를 대체하지 않고, 해당 스택을 안전하게 준비/검증/연동/정리합니다.

## 프로젝트 목적

로컬 AI 환경은 팀 단위로 재현하기가 어렵습니다.
- 머신/OS마다 설치 방식이 다름
- 기존 설치를 건드려 환경을 망가뜨릴 위험
- 팀 표준 setup 흐름 부재
- 앱 레이어(OpenWork/PaperclipAI)와 런타임 레이어(OpenCode/Ollama)가 섞여 관리됨

HARNEX는 이 문제를 다음 흐름으로 해결합니다.
- 현재 환경 감지(`doctor`)
- 누락 항목만 설치(`setup`, `install`)
- 앱/런타임 연결(`link`)
- 범위별 검증(`verify --scope`)
- 예측 가능한 제거(`uninstall`)

## HARNEX의 역할과 비역할

HARNEX의 역할:
- 로컬 AI 툴체인 오케스트레이션
- 비파괴적 setup 정책 강제
- shared/app 레이어 라이프사이클 관리

HARNEX의 비역할:
- 모델 런타임 자체 제공
- 코딩 에이전트 엔진 대체
- OpenWork/PaperclipAI 실행 엔진 대체

## 아키텍처

실행 경로(run-plane):

`User -> OpenWork -> OpenCode -> Ollama`  
`User -> PaperclipAI -> OpenCode -> Ollama`

관리 경로(control-plane):

`User -> HARNEX -> doctor/setup/init/install/link/verify/run/uninstall`

## 레이어 모델

- Shared layer: `opencode` + `ollama`
- App layer: `openwork` + `paperclipai`
- 최종 게이트: `verify --scope all`

## 패키지 구성

- `@runchr/harnex`: CLI 진입점 및 UX
- `@runchr/core`: 감지, 설정, 플랜, 커맨드 빌드
- `@runchr/shared`: 공통 타입 및 스키마
- `@runchr/openwork`: openwork preset placeholder
- `@runchr/paperclip`: paperclip preset placeholder

## 사전 요구사항

- Node.js 20+ (LTS 권장)
- `pnpm` 9+
- 지원 OS: macOS, Linux, Windows

## 빠른 시작 (Shared Layer만 사용하는 경우)

```bash
pnpm install
pnpm dev doctor
pnpm dev setup --yes
pnpm dev init
pnpm dev verify --scope shared
pnpm dev run --task "create api server"
```

## 빠른 시작 (App Layer까지 사용하는 경우)

```bash
pnpm install
pnpm dev doctor
pnpm dev setup --yes
pnpm dev init
pnpm dev install all
pnpm dev update all --yes
pnpm dev link openwork
pnpm dev link paperclipai
pnpm dev verify --scope all
pnpm dev run --task "create api server"
```

`pnpm dev`는 래퍼이므로 서브커맨드가 반드시 필요합니다.

```bash
# 올바른 예시
pnpm dev run --dry-run --task "health check"

# 잘못된 예시
pnpm dev --dry-run --task "health check"
```

## CLI 명령

- `harnex doctor`: 읽기 전용 환경 진단
- `harnex setup`: shared 레이어 누락 설치(`opencode`, `ollama`)
- `harnex init`: `.harnex/config.json`, `.harnex/apps.json`, 기본 profile 생성
- `harnex install <openwork|paperclipai|all>`: app 레이어 CLI 설치
- `harnex update <all|shared|apps|opencode|ollama|openwork|paperclipai>`: 설치된 구성요소 업데이트
- `harnex link <openwork|paperclipai>`: 앱 연동 상태 등록
- `harnex verify --scope <shared|apps|all>`: 범위별 준비 상태 검증
- `harnex run`: shared 설정 기반 OpenCode 실행
- `harnex uninstall <all|shared|apps|opencode|ollama|openwork|paperclipai>`: 구성요소 및 링크 제거

`doctor`는 기본적으로 종료코드 `0`을 반환합니다.  
CI처럼 실패 코드가 필요하면 `harnex doctor --strict`를 사용하세요.

## 트러블슈팅

- `pnpm dev doctor`에서 missing이 보여도 에러 코드가 안 나는 경우:
  정상입니다. 엄격 실패가 필요하면 `pnpm dev doctor --strict`를 사용하세요.
- `pnpm dev --dry-run ...`에서 unknown option 오류가 나는 경우:
  서브커맨드가 빠진 것입니다. `pnpm dev run --dry-run --task "..."`를 사용하세요.
- `verify --scope all`에서 `no linked apps (skip)`이 나오는 경우:
  app-layer 링크가 없는 상태입니다. `pnpm dev link openwork`, `pnpm dev link paperclipai`를 먼저 실행하세요.

## 제거 정책

`uninstall all`은 기존 설치까지 포함해, 알려진 제거 경로를 순차 시도합니다.

- OpenCode: `opencode uninstall --force` -> `npm uninstall -g opencode-ai` -> `brew uninstall opencode`
- Ollama(macOS): `brew services stop ollama` -> `brew uninstall ollama` -> `/Applications/Ollama.app`, `/usr/local/bin/ollama` 제거 시도
- Apps: `npm uninstall -g openwrk`, `npm uninstall -g paperclipai`

먼저 dry-run을 권장합니다.

```bash
pnpm dev uninstall all --dry-run
pnpm dev uninstall all --yes
```

## 크로스플랫폼 설치 전략

- `opencode`: `npm install -g opencode-ai` (기본 auto 경로)
- `ollama` on macOS: `brew install ollama`
- `ollama` on Linux: `curl -fsSL https://ollama.com/install.sh | sh`
- `ollama` on Windows: `winget install --id Ollama.Ollama -e`
- `openwork` (headless host): `npm install -g openwrk`
- `paperclipai`: `npm install -g paperclipai`

설치 방법 강제:

```bash
harnex setup --method <auto|brew|npm|winget|ollama-script>
```

## Desktop 설치 (선택)

기본은 CLI 흐름이며, Desktop은 필요 시 별도 설치합니다.

- Ollama Desktop
- macOS: https://ollama.com/download 또는 `brew install --cask ollama`
- Windows: https://ollama.com/download 또는 `winget install --id Ollama.Ollama -e`
- Linux: Desktop보다 CLI/server(`ollama serve`) 권장

- OpenCode UI
- OpenCode는 CLI 중심이며, UI가 필요하면 `opencode web` 사용

## 라이선스

[MIT](./LICENSE)
