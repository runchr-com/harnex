# HARNEX

[![npm version](https://img.shields.io/npm/v/%40runchr%2Fharnex)](https://www.npmjs.com/package/@runchr/harnex)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](./LICENSE)

Korean version: [README_KO.md](./README_KO.md)

HARNEX is a control-plane CLI for local AI stacks.  
It does not try to replace OpenWork, PaperclipAI, OpenCode, or Ollama.  
It prepares, verifies, links, and cleans that stack in a consistent way.

## Project Purpose

Local AI environments are often hard to share and reproduce:
- Setup differs by machine and OS.
- Existing installs can be accidentally broken.
- Teams struggle to agree on one safe setup flow.
- App-layer tools (OpenWork/PaperclipAI) and runtime tools (OpenCode/Ollama) get mixed together.

HARNEX exists to solve that by providing one explicit workflow:
- detect what already exists
- install only what is missing
- link app layer to shared runtime layer
- verify readiness by scope
- uninstall in a predictable and reversible way

## What HARNEX Is (And Is Not)

HARNEX is:
- A setup and orchestration CLI for local AI tooling.
- A policy layer for non-destructive setup and explicit verification.
- A control plane for shared layer + app layer lifecycle.

HARNEX is not:
- A model runtime.
- A coding agent engine.
- A replacement for OpenWork or PaperclipAI execution.

## Architecture

Run-plane:

`User -> OpenWork -> OpenCode -> Ollama`  
`User -> PaperclipAI -> OpenCode -> Ollama`

Control-plane:

`User -> HARNEX -> doctor/setup/init/install/link/verify/run/uninstall`

## Layer Model

- Shared layer: `opencode` + `ollama`
- App layer: `openwork` + `paperclipai`
- Integration gate: `verify --scope all`

## Packages

- `@runchr/harnex`: CLI entrypoint and command UX
- `@runchr/core`: internal core module package (monorepo only)
- `@runchr/shared`: internal shared types/schemas (monorepo only)
- `@runchr/openwork`: internal placeholder package (monorepo only)
- `@runchr/paperclip`: internal placeholder package (monorepo only)

Public npm package: `@runchr/harnex` only.

## Prerequisites

- Node.js 20+ (LTS recommended)
- `pnpm` 9+
- Supported OS: macOS, Linux, Windows

## Quick Start (Shared Layer Only)

```bash
pnpm install
pnpm dev doctor
pnpm dev setup --yes
pnpm dev init
pnpm dev verify --scope shared
pnpm dev run --task "create api server"
```

## Try Without Global Install (npx)

```bash
npx @runchr/harnex doctor
npx @runchr/harnex setup --yes
npx @runchr/harnex verify --scope shared
npx @runchr/harnex uninstall all --dry-run
```

For one-off usage, `npx` is convenient.  
For repeated local development, this repository workflow (`pnpm dev ...`) is recommended.

## Quick Start (With App Layer)

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

`pnpm dev` is a wrapper, so always provide a subcommand:

```bash
# correct
pnpm dev run --dry-run --task "health check"

# wrong (missing subcommand)
pnpm dev --dry-run --task "health check"
```

## CLI Commands

- `harnex doctor`: read-only environment diagnostics
- `harnex setup`: install missing shared-layer dependencies (`opencode`, `ollama`)
- `harnex init`: create `.harnex/config.json`, `.harnex/apps.json`, and default profile
- `harnex install <openwork|paperclipai|all>`: install app-layer CLIs
- `harnex update <all|shared|apps|opencode|ollama|openwork|paperclipai>`: update installed components
- `harnex link <openwork|paperclipai>`: register linked app in `.harnex/apps.json`
- `harnex verify --scope <shared|apps|all>`: readiness checks by scope
- `harnex run`: run OpenCode with resolved shared config
- `harnex uninstall <all|shared|apps|opencode|ollama|openwork|paperclipai>`: remove installed components and links

`doctor` returns exit code `0` by default for screen-based diagnostics.  
Use `harnex doctor --strict` when you want failure exit codes (for CI).

## Install vs Link (Important)

`install` and `link` are intentionally different:

- `harnex install openwork` / `harnex install paperclipai`
  - Installs the app CLI binary on your machine (global tool install).
- `harnex link openwork` / `harnex link paperclipai`
  - Registers that app for the current project in `.harnex/apps.json`.
  - No package installation happens here.

Typical flow:

```bash
harnex install all
harnex link openwork
harnex link paperclipai
harnex verify --scope apps
```

## Troubleshooting

- `pnpm dev doctor` shows missing dependencies but no error code:
  This is expected. Use `pnpm dev doctor --strict` for CI-style failure codes.
- `unknown option '--dry-run'` from `pnpm dev`:
  You missed a subcommand. Use `pnpm dev run --dry-run --task "..."`.
- `verify --scope all` passes with `no linked apps (skip)`:
  Link app-layer tools first: `pnpm dev link openwork` and/or `pnpm dev link paperclipai`.

## Uninstall Policy

`uninstall all` attempts all known uninstall paths, including pre-existing installs.

- OpenCode: `opencode uninstall --force` -> `npm uninstall -g opencode-ai` -> `brew uninstall opencode`
- Ollama (macOS): `brew services stop ollama` -> `brew uninstall ollama` -> remove `/Applications/Ollama.app` and `/usr/local/bin/ollama`
- Apps: `npm uninstall -g openwrk`, `npm uninstall -g paperclipai`

Use `--dry-run` first:

```bash
pnpm dev uninstall all --dry-run
pnpm dev uninstall all --yes
```

## Cross-Platform Install Strategy

- `opencode`: `npm install -g opencode-ai` (default auto path)
- `ollama` on macOS: `brew install ollama`
- `ollama` on Linux: `curl -fsSL https://ollama.com/install.sh | sh`
- `ollama` on Windows: `winget install --id Ollama.Ollama -e`
- `openwork` (headless host): `npm install -g openwrk`
- `paperclipai`: `npm install -g paperclipai`

You can force setup method with:

```bash
harnex setup --method <auto|brew|npm|winget|ollama-script>
```

## Optional Desktop Setup

HARNEX defaults to CLI workflows. Install desktop tools only if needed.

- Ollama Desktop
- macOS: https://ollama.com/download or `brew install --cask ollama`
- Windows: https://ollama.com/download or `winget install --id Ollama.Ollama -e`
- Linux: prefer CLI/server (`ollama serve`)

- OpenCode UI
- OpenCode is CLI-first; for UI workflows, use `opencode web`.

## License

[MIT](./LICENSE)
