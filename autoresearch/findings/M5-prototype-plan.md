# M5 — Prototype Implementation Plan

Generated: 2026-06-30T18:40:17Z  
Milestone: M5  
Scope: implementation plan and acceptance contract; no product code changed in this tick.

## 1. Prototype thesis

The first prototype should prove the full benchmark loop with **no network and no secrets** before adding remote model/provider integrations. That means implementing a minimal but real local pipeline:

```text
seeded corpus item
  -> baseline compressors + MemoryFrame encoder
  -> exact local TokenCounter for one OpenAI-family tokenizer
  -> local MemorySubstrate retrieval baseline
  -> deterministic graders
  -> JSONL item results + markdown scorecard
```

The prototype should answer one question: can a compact, auditable MemoryFrame context beat or match simple summaries/retrieval under exact-token, downstream-utility, and redaction gates?

## 2. Inputs from prior milestones

| Milestone | Prototype implication |
|---|---|
| M1 benchmark design | Build S1/S2/S4 pilot corpus first, with token, fidelity, utility, and safety metrics. |
| M2 tokenizer plan | Add a pluggable TokenCounter and exact OpenAI-family local counts before any published ratio. |
| M3 MemoryFrame DSL | Implement parser, emitter, rehydrator, audit gates, and fixtures for line-oriented typed memory. |
| M4 provider matrix | Add a deterministic local JSONL/lexical provider baseline before remote/Hermes plugin adapters. |

## 3. P0 prototype slice

P0 is intentionally narrow and should be finishable without credentials.

### Included strata

| Stratum | Included in P0? | Reason |
|---|---:|---|
| S1 Deli-style task state | yes | Directly matches autoresearch state files and decision logs. |
| S2 CodeForge/code context | yes | Gives deterministic interpreter-backed utility scoring. |
| S3 conlang/DSL context | no | Defer until parser/tokenizer basics are green. |
| S4 repo/docs context | yes | Tests practical file-grounded source-span memory. |
| S5 agent conversation memory | no | Defer until privacy/redaction fixtures are richer. |

### Included baselines

1. Raw context.
2. Truncate-tail under a token budget.
3. Deterministic extractive summary / salient lines.
4. MemoryFrame encode + rehydrate.
5. Local JSONL lexical retrieval provider formatted as markdown or MemoryFrame.

Remote baselines (LLMLingua, Mem0, Hindsight, Supermemory, provider token counts) are explicitly out of P0.

## 4. File-level implementation plan

### 4.1 Token counting

| File | Action | Acceptance criteria |
|---|---|---|
| `src/tokenization/TokenCounter.js` | Add registry and normalized result schema. | `countText(text,{provider:'openai',model:'gpt-4o'})` returns `{input_tokens, confidence:'verified'}` when exact adapter installed; estimator fallback returns `confidence:'estimate'`. |
| `src/tokenization/model-manifest.js` | Map model aliases to tokenizer adapters. | Manifest maps OpenAI-family aliases and rejects unknown model mappings unless fallback explicitly requested. |
| `src/tokenization/adapters/openai-gpt-tokenizer.js` | Add pure-JS OpenAI-family adapter. | Golden vector test passes without network. |
| `bench/fixtures/tokenizer-golden/openai-gpt4o.json` | Store sample strings and expected counts. | Test fails unless counts match fixture, unless run with explicit update flag. |
| `test-tokenization.mjs` | New smoke test. | Covers ASCII, JSON state, CodeForge-like program, non-ASCII GLOSSOPETRAE text, and unknown-model fallback. |

Dependency decision: add `gpt-tokenizer` first. Do not add remote SDKs in P0.

### 4.2 MemoryFrame

| File | Action | Acceptance criteria |
|---|---|---|
| `src/memoryframe/parseMemoryFrame.js` | Parse v0.1 line grammar. | Rejects malformed load-bearing lines, missing source spans, illegal confidence values, and duplicate IDs. |
| `src/memoryframe/emitMemoryFrame.js` | Emit deterministic lines from structured records. | Stable ordering: constraints, decisions, facts, actions, links, notes. |
| `src/memoryframe/rehydrateMemoryFrame.js` | Expand frames into state JSON and narrative markdown. | Preserves `src`, `conf`, `because`, and action dependencies in both views. |
| `src/memoryframe/auditMemoryFrame.js` | Run audit gates. | Reports parse/source/confidence/redaction/token-provenance results as a machine-readable object. |
| `bench/fixtures/memoryframe/s1-task-state.mf` | Add task-state fixture. | Hidden fact probes can recover milestone, tried direction, stale count, and next action. |
| `bench/fixtures/memoryframe/s4-repo-docs.mf` | Add repo-doc fixture. | Source-span coverage and narrative rehydration pass. |
| `test-memoryframe.mjs` | New test. | Parser, emitter, rehydrator, audit, alias collision, and planted-secret rejection pass. |

### 4.3 Local memory provider baseline

| File | Action | Acceptance criteria |
|---|---|---|
| `autoresearch/bench/memory-providers/MemorySubstrate.mjs` | Define provider interface and `MemoryHit` shape. | Local provider conforms and tests assert required fields. |
| `autoresearch/bench/memory-providers/local-jsonl-provider.mjs` | Deterministic JSONL lexical retrieval baseline. | No dependencies; scores by normalized term overlap; returns source spans. |
| `autoresearch/bench/memory-providers/memoryframe-provider.mjs` | Treat MemoryFrame as provider-like substrate. | Can query and format parsed MemoryFrame records into markdown or MemoryFrame context. |
| `autoresearch/bench/fixtures/memory-providers/synthetic-facts.jsonl` | Add benign fact corpus. | Contains planted fake-secret canaries only, no real secrets. |
| `test-memory-providers.mjs` | New no-network smoke test. | `put`, `query`, `formatContext`, budget trimming, and source-span preservation pass. |

### 4.4 Benchmark runner

| File | Action | Acceptance criteria |
|---|---|---|
| `autoresearch/bench/memory-corpus.mjs` | Generate seeded S1/S2/S4 items. | Same seed produces byte-identical item and gold fact table. |
| `autoresearch/bench/compressors/raw.mjs` | Raw baseline adapter. | Emits full source and exact token count. |
| `autoresearch/bench/compressors/truncate-tail.mjs` | Tail truncation baseline. | Obeys token budget using TokenCounter. |
| `autoresearch/bench/compressors/extractive-lines.mjs` | Deterministic salient-lines baseline. | Ranks decision/source/action lines above low-signal logs. |
| `autoresearch/bench/compressors/memoryframe.mjs` | MemoryFrame baseline. | Encodes, audits, rehydrates, and returns exact counts. |
| `autoresearch/bench/grade-memory.mjs` | Fact/decision/execution/redaction graders. | Emits per-item utility and failure modes. |
| `autoresearch/bench/run-memory-bench.mjs` | Pilot runner. | Writes `autoresearch/results/<run_id>/items.jsonl` and `scorecard.json`. |
| `autoresearch/bench/analyze-memory-bench.mjs` | Markdown report. | Writes `REPORT.md` with per-baseline utility/tokens/audit/safety tables. |
| `test-memory-bench.mjs` | End-to-end smoke test. | Runs 2 seeds × S1/S2/S4 × 4 baselines under 60s locally. |

## 5. Package scripts

Add scripts only after the corresponding tests exist:

```json
{
  "scripts": {
    "autoresearch:validate": "node autoresearch/scripts/validate-autoresearch.mjs",
    "test:tokenization": "node test-tokenization.mjs",
    "test:memoryframe": "node test-memoryframe.mjs",
    "test:memory-providers": "node test-memory-providers.mjs",
    "test:memory-bench": "node test-memory-bench.mjs"
  }
}
```

Do not extend `npm run test` until the new tests are stable under the repo's normal runtime budget. Once stable, add them to the main suite.

## 6. Data and safety contracts

1. Fixtures must be synthetic, generated, or redacted.
2. P0 must not read `.env`, key files, credential stores, browser profiles, or private message exports.
3. Fake secrets/canaries should be generated in fixtures and must be removed by redaction checks.
4. Remote providers and remote token-count APIs must skip unless an explicit client object is passed by a caller.
5. Every output row must preserve `source_spans` or explicitly report `auditability_score=0`.
6. Generated conlang/glyph/covert-channel surfaces are excluded from P0 production memory; they remain benchmark stressors only.

## 7. Minimal result schema

```ts
type MemoryBenchItemResult = {
  run_id: string;
  seed: number;
  stratum: 'S1' | 'S2' | 'S4';
  baseline: 'raw' | 'truncate_tail' | 'extractive_lines' | 'memoryframe' | 'local_jsonl_provider';
  token_counts: {
    input_tokens: number;
    output_tokens: number;
    source: string;
    confidence: 'verified' | 'estimate';
  };
  scores: {
    fact_recall?: number;
    fact_precision?: number;
    decision_equivalence?: number;
    execution_equivalence?: number;
    redaction_recall?: number;
    auditability_score: number;
    downstream_task_score: number;
  };
  failure_modes: string[];
  source_spans: string[];
};
```

## 8. Implementation order

1. Add TokenCounter with local OpenAI-family exact counting and fallback estimator.
2. Add MemoryFrame parser/emitter/audit/rehydrate modules plus fixtures/tests.
3. Add local JSONL provider baseline.
4. Add seeded S1/S2/S4 corpus builders.
5. Add baseline compressor adapters.
6. Add graders and scorecard writer.
7. Run end-to-end smoke with 2 seeds.
8. Only then consider remote/provider adapters as opt-in extensions.

## 9. Definition of done for M5 implementation

M5 should be considered implemented only when all of the following pass:

- `node test-tokenization.mjs`
- `node test-memoryframe.mjs`
- `node test-memory-providers.mjs`
- `node test-memory-bench.mjs`
- `npm run autoresearch:validate`
- `npm run test`

Additionally, a pilot scorecard should exist under `autoresearch/results/` and show at least raw, truncate-tail, extractive-lines, MemoryFrame, and local-provider baselines on S1/S2/S4.

## 10. Risks and mitigations

| Risk | Impact | Mitigation |
|---|---|---|
| New tokenizer dependency breaks zero-dep simplicity | Install/runtime friction | Add only one dependency first; lazy-load adapters; keep estimator fallback. |
| Exact counts differ from provider billing | False confidence | Store source/confidence and reconcile against provider usage in later M6/M7. |
| MemoryFrame parser grows too complex | Debugging overhead | Keep v0.1 line grammar strict and small; reject ambiguous syntax. |
| Fixture secrets accidentally become real | Safety failure | Generate fake canaries programmatically; never source from env or private files. |
| Retrieval baseline beats MemoryFrame | Research thesis weakens | Treat honestly; the contribution may become auditability/source-span tradeoffs. |
| End-to-end smoke gets slow | CI friction | Start with 2 seeds and deterministic no-model graders. |

## 11. Decision

M5 is complete as an implementation plan. The next actual build should be a no-network P0 prototype centered on `TokenCounter`, `MemoryFrame`, a deterministic local JSONL provider, and a tiny seeded S1/S2/S4 benchmark runner. M6 should then run the controlled evaluation and decide whether MemoryFrame earns its token/audit cost versus simple summaries and retrieval-only baselines.
