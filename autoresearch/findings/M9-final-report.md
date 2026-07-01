# M9 — Final Synthesis and Product / Research Plan

Generated: 2026-07-01T02:24:22Z  
Milestone: M9  
Scope: synthesis of M0-M8; no product code changed in this tick.

## 1. Final recommendation

Proceed with a **no-network, auditability-first memory/context compression subsystem** for GLOSSOPETRAE, but do not position the first result as a raw token-ratio breakthrough.

The strongest validated contribution so far is a safe, inspectable pipeline for turning task/repo context into structured `MemoryArtifact` records with:

1. exact or provider-authoritative token-count provenance;
2. source spans and confidence tags;
3. deterministic redaction/audit checks;
4. downstream task scoring instead of compression-only scoring;
5. a narrow benign API/MCP surface separated from existing stealth/steganography-oriented GLOSSOPETRAE APIs.

The M6 pilot is decisive for framing: `memoryframe` had the best average downstream score and perfect audit/redaction scores, but expanded the short fixtures to ~1.916x raw tokens. `extractive_lines` had the best token ratio at 0.374, while `compact_json` and `local_jsonl_provider` remained strong baselines. Therefore the correct thesis is **auditable memory artifacts and safety-weighted context utility**, not “MemoryFrame always compresses best.”

## 2. Evidence chain by milestone

| Milestone | Main result | Decision carried into final plan |
|---|---|---|
| M0 stack map | Existing stack already has `TokenCompressor`, generated benchmark machinery, local Hermes memory-provider candidates, and GLOSSOPETRAE language/token tools. | Build from local repo evidence; treat current token counts as rough until M2/M6 exact counting exists. |
| M1 benchmark design | Compression must be evaluated as end-to-end utility: exact tokens, fidelity, downstream success, redaction, auditability, failure modes, and confidence intervals. | Every future claim needs machine-readable scorecards and per-stratum results, not token ratio alone. |
| M2 tokenizer plan | Token counting must be a pluggable `TokenCounter` oracle. `gpt-tokenizer` is the first local OpenAI-family path; provider counts/usage remain authoritative for chat envelopes and remote rows. | Implement exact local counts first; keep `TokenCompressor.estimateTokens()` as `confidence='estimate'` only. |
| M3 DSL design | The production compression language should be auditable `MemoryFrame`, not opaque glyph/conlang storage. Compact JSON remains an interchange/storage view. | Use MemoryFrame when source spans, decisions, constraints, and reviewability matter; compare honestly against JSON/extractive baselines. |
| M4 provider matrix | Memory providers are retrieval baselines and external-state substrates, not replacements for compression. Local retrieval is required; cloud/semantic/graph providers are opt-in. | Make local JSONL/FTS retrieval a first-class baseline before adding Mem0, Supermemory, Hindsight, Honcho, ByteRover, or OpenViking adapters. |
| M5 prototype plan | P0 should be no-network/no-secrets: TokenCounter, MemoryFrame, local provider, deterministic corpus/graders, JSONL results, markdown scorecard. | Start with small focused scripts and fixtures; add package scripts only after each test exists and passes. |
| M6 controlled pilot | Exact `gpt-tokenizer/model/gpt-4o` counts ran on S1/S2/S4 fixtures. MemoryFrame led downstream/audit/redaction but not token ratio; extractive lines minimized tokens. | Optimize MemoryFrame overhead, add executable-artifact handling, and keep compact JSON/retrieval/extractive baselines as peers. |
| M7 integration spec | Expose a narrow repo-local MCP server over a canonical native ESM API. Return structured `MemoryArtifact` results, not raw compressed strings. | Build `src/memory-compression/index.js` first; make MCP a thin adapter with six allowlisted tools, resources/prompts off, sampling disabled. |
| M8 safety review | The memory product must be a separate safe subsystem with path confinement, secret-path denial, canary redaction, forbidden-surface scans, untrusted-memory wrapping, and delete/forget gates. | Safety gates are prerequisites, not polish. Remote providers skip until deletion and data-boundary behavior are verified. |

## 3. Target product shape

```text
safe fixture / repo context
  -> pathPolicy + redaction + untrusted-data handling
  -> TokenCounter exact local counts
  -> candidate builders: extractive_lines | compact_json | MemoryFrame | local retrieval
  -> audit + deterministic graders
  -> MemoryArtifact[] with token counts, source spans, confidence, audit, scores
  -> native ESM API
  -> optional thin MCP server / safe Hermes skill docs
```

### Canonical API layer

Build a native ESM module first:

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

The MCP server should only adapt these functions to the six tool names from M7:

- `compress_context`
- `rehydrate_context`
- `audit_context`
- `query_local_memory`
- `score_memory_candidate`
- `run_memory_eval`

Do not make MCP the core implementation. Tests should be able to compare native and MCP outputs for deterministic inputs.

## 4. Build plan

### P0 — Safety and measurement foundation

File targets:

- `src/tokenization/TokenCounter.js`
- `src/tokenization/model-manifest.js`
- `src/tokenization/adapters/openai-gpt-tokenizer.js`
- `src/memory-compression/security/pathPolicy.js`
- `src/memory-compression/security/redaction.js`
- `src/memory-compression/security/forbiddenSurface.js`
- `src/memory-compression/security/untrustedMemory.js`
- `src/memory-compression/security/deletePolicy.js`
- `test-tokenization.mjs`
- `test-memory-security.mjs`

Exit gate:

- exact local token counts work for one OpenAI-family mapping;
- fake canaries redact with recall 1 in strict mode;
- forbidden production memory surfaces are not exported;
- path traversal, symlink escape, and secret-path fixtures fail closed;
- no test reads `.env`, key files, credential stores, browser profiles, or private messages.

### P1 — MemoryArtifact generators and local baseline

File targets:

- `src/memoryframe/parseMemoryFrame.js`
- `src/memoryframe/emitMemoryFrame.js`
- `src/memoryframe/rehydrateMemoryFrame.js`
- `src/memoryframe/auditMemoryFrame.js`
- `autoresearch/bench/memory-providers/MemorySubstrate.mjs`
- `autoresearch/bench/memory-providers/local-jsonl-provider.mjs`
- `autoresearch/bench/compressors/extractive-lines.mjs`
- `autoresearch/bench/compressors/compact-json.mjs`
- `autoresearch/bench/compressors/memoryframe.mjs`
- `test-memoryframe.mjs`
- `test-memory-providers.mjs`

Exit gate:

- every artifact has token counts, source spans, confidence, audit object, and provenance;
- MemoryFrame parser rejects malformed load-bearing lines;
- local provider returns source-spanned hits and supports delete/purge;
- compact JSON and extractive lines are implemented as honest baseline peers.

### P2 — Reusable benchmark runner

File targets:

- `autoresearch/bench/memory-corpus.mjs`
- `autoresearch/bench/grade-memory.mjs`
- `autoresearch/bench/run-memory-bench.mjs`
- `autoresearch/bench/analyze-memory-bench.mjs`
- `test-memory-bench.mjs`

Exit gate:

- run at least 2 seeds x S1/S2/S4 locally under 60 seconds;
- emit item JSONL plus aggregate scorecard;
- score exact tokens, fact recall, decision equivalence, execution equivalence, redaction, auditability, and downstream task score;
- preserve the M6 warning that small pilots are not publishable rankings.

### P3 — Thin integration surface

File targets:

- `src/memory-compression/index.js`
- `src/memory-compression/schemas.js`
- `src/mcp/glossopetrae-memory-server.mjs`
- `src/mcp/tool-handlers/*.mjs`
- `skills/glossopetrae-memory/SKILL.md`
- `test-memory-compression-api.mjs`
- `test-mcp-memory-tools.mjs`

Exit gate:

- native API exports only the benign six functions;
- MCP `list_tools` exposes only the six benign tool names;
- MCP resources/prompts are disabled and sampling is disabled in operator config;
- focused tests pass before these scripts are folded into `npm run test`.

### P4 — External baselines and scale-up

Add only after P0-P3 are green:

- LLMLingua / LongLLMLingua / Selective Context comparison wrappers;
- optional Anthropic/Gemini provider count adapters with explicit injected clients;
- optional Hindsight graph, Mem0/Supermemory semantic, ByteRover/OpenViking hierarchy, and Honcho profile-memory baselines;
- 5+ seeds across S1/S2/S4 first, then S3/S5;
- confidence intervals narrow enough to support baseline ranking claims.

## 5. Research roadmap

1. **Optimize MemoryFrame overhead.** The initial DSL preserved auditability but was token-expensive on short fixtures. Test shorter source-span encodings, manifest-pinned aliases, and separate audit sidecars.
2. **Add executable-artifact mode.** M6 showed fact-style compression can remember expected stdout while failing execution equivalence. Add code-block sidecars or typed executable records before claiming code-context success.
3. **Define a safety-weighted objective.** Raw utility, token ratio, redaction, and auditability conflict. Publish a transparent objective such as `utility_per_token * audit_weight * redaction_gate` rather than hiding tradeoffs.
4. **Expand corpus strata.** P0 should stay S1/S2/S4; later add S3 conlang/DSL and S5 synthetic/redacted conversation memory.
5. **Compare retrieval against compression honestly.** If local retrieval beats MemoryFrame on utility per token, report that result and frame MemoryFrame as audit/source-span infrastructure.
6. **Verify external baselines live before citation.** LLMLingua and Selective Context were captured as relevant tracks, but final publication needs fresh primary source verification and pinned versions.

## 6. Risk register

| Risk | Why it matters | Mitigation |
|---|---|---|
| Token-count drift | Wrong model-tokenizer mapping invalidates ratios. | Model manifest, golden vectors, provider-usage reconciliation, confidence tags. |
| Benchmark overfit | Small deterministic pilots can overstate progress. | Seed expansion, per-stratum reporting, confidence intervals, hidden facts. |
| MemoryFrame token overhead | DSL may lose to JSON/retrieval on raw budget. | Treat JSON/retrieval/extractive as first-class baselines; optimize only after exact measurements. |
| Executable context loss | Fact recall can pass while runnable-code utility fails. | Separate `execution_equivalence` gate and executable-artifact records. |
| Secret or private data ingestion | File compression can become accidental exfiltration. | Path policy, secret-path denylist, fake canaries, size/file caps, no credential-store reads. |
| Unsafe existing API bleed-through | Current GLOSSOPETRAE skill surface contains non-memory language/stego functionality. | Separate `src/memory-compression/**`, separate safe skill docs, forbidden-surface tests. |
| Remote retention uncertainty | Cloud memory providers may store sanitized data without verified deletion. | Disable/skip remote adapters until delete/forget behavior is verified. |
| Prompt injection from memory rows | Retrieved text can look like instructions. | Wrap provider text as untrusted data and record audit notes; never promote it to system/tool instructions. |

## 7. Final verdict

**Go for P0 build, with constraints.**

The program has enough evidence to start implementation of a local memory-compression subsystem. The first release should be a benchmarkable developer prototype, not a user-facing remote memory product. The release claim should be:

> GLOSSOPETRAE can produce structured, auditable, redaction-aware memory artifacts and compare them against strong compression/retrieval baselines under exact token counts and downstream task gates.

The release claim should not be:

> MemoryFrame is the most token-efficient representation.

M9 is complete when this synthesis exists, final findings are appended, progress marks M9 complete, and the autoresearch validator passes.
