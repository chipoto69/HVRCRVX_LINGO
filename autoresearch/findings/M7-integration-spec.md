# M7 — MCP / Tool / Plugin Integration Spec

Generated: 2026-06-30T22:07:17Z  
Milestone: M7  
Scope: integration specification only; no product code changed in this tick.  
Source capture: `autoresearch/sources/M7-integration-source-captures-20260630T220717Z.json`

## 1. Decision

Expose the GLOSSOPETRAE memory-compression prototype through a **small, allowlisted MCP server** first, not by expanding the existing agent-communication skill surface. MCP is the right first production boundary because Hermes already discovers stdio/HTTP MCP tools, registers them as normal tools, and supports per-server tool filtering. The current GLOSSOPETRAE skill and quickstart emphasize stealth/steganography APIs; those must stay out of the memory-compression tool surface.

The integration target is a benign memory/context service:

```text
Hermes / AI app
  -> MCP tool call or native library call
  -> TokenCounter + MemoryFrame + local MemorySubstrate
  -> MemoryArtifact with exact token provenance, source spans, audit gates
  -> downstream prompt/context injection or benchmark scorecard
```

## 2. Evidence base

| Evidence | Integration implication |
|---|---|
| Hermes MCP docs show stdio/HTTP servers, startup discovery, tool registration, utility wrappers, and per-server filtering (`M7-S001`, `M7-S003`, `M7-S004`). | Implement a repo-local stdio MCP server before any cloud service. |
| Hermes MCP safe-use docs recommend allowlists, narrow server scope, and disabling unused utilities for sensitive systems (`M7-S002`). | Use `tools.include`; set `resources:false`, `prompts:false`; keep the server rooted to this repo/result directory. |
| Native MCP reference says stdio subprocesses inherit a filtered environment and secrets are excluded unless explicitly passed (`M7-S004`). | Do not pass env secrets; remote provider clients remain opt-in and caller-injected. |
| Native MCP reference says sampling is enabled by default (`M7-S004`). | Set `sampling: { enabled: false }` for the memory server so an untrusted server cannot ask the LLM to continue tool loops. |
| GLOSSOPETRAE is private ESM with `npm run test` and `autoresearch:validate`; `TokenCompressor` is re-exported (`M7-S005`). | The MCP server can be a Node ESM entrypoint and reuse existing modules. |
| M2/M4/M6 require exact token provenance, source spans, local provider baselines, and separate execution scoring (`M7-S006`). | All tool results must carry `TokenCountResult`, source spans, audit status, and scoring-mode fields. |

## 3. MCP server boundary

Recommended server name: `glossopetrae_memory`.

Recommended registration shape for a future interactive/operator setup:

```yaml
mcp_servers:
  glossopetrae_memory:
    command: "node"
    args:
      - "/Users/filipdam/projects/parseltongue/GLOSSOPETRAE-worktrees/main-continue-20260630-084226/src/mcp/glossopetrae-memory-server.mjs"
      - "--root"
      - "/Users/filipdam/projects/parseltongue/GLOSSOPETRAE-worktrees/main-continue-20260630-084226"
      - "--readonly"
    timeout: 120
    connect_timeout: 30
    supports_parallel_tool_calls: false
    tools:
      include:
        - compress_context
        - rehydrate_context
        - audit_context
        - query_local_memory
        - score_memory_candidate
        - run_memory_eval
      resources: false
      prompts: false
    sampling:
      enabled: false
```

Notes:

1. `tools.include` uses original MCP tool names; Hermes will register them as `mcp_glossopetrae_memory_compress_context`, etc.
2. `--readonly` means the server may read explicitly supplied files under the repo root and write only benchmark/report outputs to configured result directories when a tool requests it.
3. No `env` secrets are passed. Remote provider adapters are not part of this first MCP surface.
4. Do not create or modify this config from cron; this section is an operator-ready spec for later setup.

## 4. Tool contract

### 4.1 `compress_context`

Purpose: turn benign task/repo/context text into one or more auditable compressed artifacts.

Input:

```ts
type CompressContextInput = {
  text?: string;
  file_paths?: string[];              // must be under allowed root; no .env/keychain/profile paths
  goal: string;                       // e.g. "next-action handoff", "repo fact recall"
  budget_tokens?: number;
  mode?: 'memoryframe' | 'compact_json' | 'extractive_lines' | 'auto';
  token_counter: { provider: 'openai' | 'generic'; model: string; allow_estimate?: boolean };
  redaction_policy?: 'strict' | 'benchmark_canaries_only';
};
```

Output: `MemoryArtifact[]` ranked by downstream/audit score, never just a raw string.

### 4.2 `rehydrate_context`

Purpose: expand a `MemoryArtifact` into model-ready context while preserving provenance.

Input:

```ts
type RehydrateContextInput = {
  artifact: MemoryArtifact;
  target: 'markdown' | 'messages' | 'state_json';
  include_audit_block?: boolean;
};
```

Output includes `text`, `messages?`, `token_counts`, `source_spans`, and warnings if provenance is incomplete.

### 4.3 `audit_context`

Purpose: parse and safety-check an artifact without changing it.

Checks:

- parse validity for MemoryFrame / compact JSON
- source-span coverage
- confidence tags
- redaction recall on synthetic canaries
- token-count confidence (`verified`, `draft`, `estimate`)
- forbidden API surface detection: stego/covert/hide/reveal methods must not appear in production memory artifacts
- prompt-injection hygiene: retrieved facts are data, not instructions

### 4.4 `query_local_memory`

Purpose: run the local deterministic provider baseline from M4/M5.

Input:

```ts
type QueryLocalMemoryInput = {
  corpus_id?: string;
  records?: Array<{ id: string; text: string; metadata?: object; source_spans: string[] }>;
  query: string;
  top_k?: number;
  budget_tokens?: number;
  format?: 'memoryframe' | 'markdown' | 'json';
};
```

Output: `MemoryHit[]` plus formatted context and exact/estimated token counts.

### 4.5 `score_memory_candidate`

Purpose: apply deterministic M1/M6 graders to a candidate artifact.

Output dimensions:

- `fact_recall`
- `fact_precision`
- `decision_equivalence`
- `execution_equivalence` (separate from fact recall)
- `redaction_recall`
- `auditability_score`
- `downstream_task_score`
- `failure_modes[]`

### 4.6 `run_memory_eval`

Purpose: bounded no-network benchmark run over synthetic/redacted fixtures only.

Input must cap `seeds`, `strata`, `baselines`, and runtime. Default should match the P0 shape: S1/S2/S4 with raw, truncate-tail, extractive-lines, compact JSON, MemoryFrame, and local JSONL provider baselines.

## 5. Canonical result schema

```ts
type MemoryArtifact = {
  version: 'glossopetrae.memory.v0.1';
  artifact_id: string;
  mode: 'memoryframe' | 'compact_json' | 'extractive_lines' | 'retrieval_context';
  text: string;
  token_counts: TokenCountResult;
  source_spans: string[];
  source_hashes?: Array<{ span: string; sha256: string }>;
  confidence: 'verified' | 'draft' | 'estimate';
  audit: {
    parse_valid: boolean;
    source_coverage: number;
    redaction_passed: boolean;
    forbidden_surface_passed: boolean;
    prompt_injection_notes: string[];
    warnings: string[];
  };
  scores?: {
    downstream_task_score?: number;
    fact_recall?: number;
    execution_equivalence?: number;
    auditability_score?: number;
    redaction_recall?: number;
  };
  provenance: {
    generator: string;
    generator_version: string;
    seed?: number;
    created_at: string;
    source_files?: string[];
    no_network: boolean;
  };
};
```

`TokenCountResult` should reuse the M2 fields: `input_tokens`, optional output/cache/tool/reasoning counts, provider, model, source, confidence, mode, tokenizer version, model-mapping version, and warnings.

## 6. Native library / app API

The same contracts should exist as a native ESM API so non-Hermes apps do not need MCP:

```js
import {
  compressContext,
  rehydrateContext,
  auditContext,
  queryLocalMemory,
  scoreMemoryCandidate,
  runMemoryEval,
} from './src/memory-compression/index.js';
```

The MCP server should be a thin adapter over this API. That prevents the MCP schema from becoming the only implementation and keeps tests simple.

## 7. Hermes skill/plugin packaging

Current `skills/glossopetrae/SKILL.md` and `AGENT_QUICKSTART.md` are oriented toward language generation and agent communication. For memory compression, add a separate safe entrypoint rather than extending stealth examples:

- `skills/glossopetrae-memory/SKILL.md` or a new section titled **Memory Compression / Context Audit**.
- Document only benign APIs: compression, rehydration, audit, local retrieval, evaluation.
- Explicitly mark `forgeStealthLanguage`, `createSharedProtocol`, `stegoEncode`, `hide`, and `reveal` as **out of scope for production memory compression**.
- Include a minimum example that compresses a synthetic task-state fixture and shows token provenance/source spans.

A native Hermes plugin is optional after the MCP server works. If added, it should expose the same six tools and inherit the same allowlist/no-secret/no-covert boundaries.

## 8. Security boundaries

1. **No secrets**: server refuses `.env`, SSH keys, keychains, browser profiles, token caches, and arbitrary home-directory reads.
2. **Root confinement**: all file paths are resolved under an allowed root; symlink escapes fail closed.
3. **Synthetic-first eval**: `run_memory_eval` defaults to generated/redacted fixtures only.
4. **No remote calls by default**: provider token counters and semantic memory services skip unless an explicit client is passed by the hosting app.
5. **Untrusted memory**: retrieved provider text is data; rehydration must not convert it into tool instructions.
6. **No production covert channel surface**: stego/hidden-payload methods remain research/evaluation stressors only.
7. **Sampling disabled**: MCP `sampling/createMessage` is off for this server unless a future audited use case proves need.
8. **Utility wrappers disabled**: resources/prompts are off in the MCP config to avoid accidental exposure of extra server surfaces.

## 9. Implementation targets

| File | Action | Acceptance gate |
|---|---|---|
| `src/memory-compression/index.js` | Native ESM API over TokenCounter, MemoryFrame, local provider, graders | Exports the six functions above with no network by default |
| `src/memory-compression/schemas.js` | Runtime validation for inputs/results | Rejects missing source spans, invalid confidence, path escapes |
| `src/mcp/glossopetrae-memory-server.mjs` | MCP stdio server adapter | `list_tools` exposes only the six tool names |
| `src/mcp/tool-handlers/*.mjs` | Thin wrappers around native API | Unit tests compare MCP and native outputs byte-for-byte where deterministic |
| `skills/glossopetrae-memory/SKILL.md` | Safe Hermes skill docs | No stealth/stego examples; includes MemoryArtifact provenance example |
| `test-memory-compression-api.mjs` | Native API smoke tests | No network, no secrets, exact/estimate confidence asserted |
| `test-mcp-memory-tools.mjs` | MCP server tool-list and call tests | Server starts locally and tool schema is allowlisted |

Do not wire this into `npm run test` until the focused tests are stable; follow the M5 script staging rule.

## 10. Acceptance gates for M7 handoff

M7 is complete when this document exists and the next build milestone can implement from it. M8 should review the same boundary before any production exposure. The eventual build is acceptable only when:

- `compress_context` returns `MemoryArtifact`, not raw unproven text.
- Every artifact has token-count confidence and source spans.
- MCP config uses `tools.include`, `resources:false`, `prompts:false`, `sampling.enabled:false`.
- Tool tests prove no stealth/stego methods are exposed by the memory server.
- Path tests prove secret/key/profile paths are rejected.
- A no-network evaluation run reproduces the M6-style score dimensions.

## 11. Next action

Proceed to M8 with a privacy/security/redaction review focused on the M7 tool boundary: path confinement, fake-secret canaries, forbidden surface checks, prompt-injection handling, and delete/forget semantics for local and future provider-backed memories.
