# M4 — Memory Provider Matrix

Generated: 2026-06-30T17:50:00Z  
Milestone: M4  
Scope: comparison and integration plan only; no product code changed in this tick.

## 1. Thesis

For GLOSSOPETRAE, memory providers should be evaluated as **retrieval baselines and external-state substrates**, not treated as a replacement for compression. A good memory provider can reduce injected context by storing facts externally and retrieving only a compact subset; MemoryFrame/TokenCompressor instead compress the context artifact itself. M6 should measure both paths under the same exact-token and downstream-task gates.

Decision for the prototype path:

1. Define a provider-neutral memory-substrate interface for the benchmark.
2. Require a no-network local baseline so every cron/test run is reproducible.
3. Add graph/semantic/cloud providers as opt-in comparisons only when an explicit client or configured provider is already available.
4. Never read `.env`, key files, or credential stores from autoresearch ticks; remote adapters skip cleanly if unavailable.

## 2. Evidence base

Primary evidence is in `autoresearch/sources/M4-memory-provider-source-captures-20260630T175000Z.json`.

- `M4-S001`: local Hermes plugin inventory found eight memory providers.
- `M4-S002`: Holographic local SQLite/FTS/trust/HRR details.
- `M4-S003`: Hindsight observations / graph-consolidation docs.
- `M4-S004`: Mem0 platform-vs-OSS and semantic memory docs.
- `M4-S005`: OpenViking context database + ByteRover tree memory.
- `M4-S006`: Honcho profile/user-model memory docs.
- `M4-S007`: Supermemory semantic profile/RAG docs.
- `M4-S008`: RetainDB cloud hybrid memory docs.

Operational note: `web_search` and `web_extract` were unavailable in this cron environment because Firecrawl was not configured. Browser navigation and local plugin files provided the live/local verification.

## 3. Benchmark interface shape

The M6 benchmark should compare providers through a narrow interface:

```ts
type MemorySubstrate = {
  name: string;
  locality: 'local' | 'self_hosted' | 'cloud';
  put(record: { id: string; text: string; metadata: object; source_spans: string[]; confidence: string }): Promise<void>;
  query(request: { text: string; top_k: number; filters?: object; budget_tokens?: number }): Promise<MemoryHit[]>;
  formatContext(hits: MemoryHit[], mode: 'memoryframe' | 'markdown' | 'json'): Promise<string>;
};
```

Every returned `MemoryHit` should carry `source_spans`, provider score, provider name/version, retrieval mode, confidence, and redaction status. The exact `TokenCounter` from M2 must count the injected provider context before utility scoring.

## 4. Provider matrix

| Provider / class | Locality | Retrieval model | Strength for GLOSSOPETRAE | Main limit | Recommended benchmark role |
|---|---|---|---|---|---|
| **Holographic** | local | SQLite FTS5 + trust scoring + optional HRR compositional retrieval | Best no-network baseline; inspectable schema; deterministic enough for CI | Python/Hermes plugin, not native Node; HRR depends on NumPy | Required local-first baseline for S1/S4 fact recall and source-span audit |
| **ByteRover** | local-first + optional sync | hierarchical knowledge tree via `brv` CLI | Good project-memory/tree baseline; aligns with pre-compress hooks | Requires external `brv` binary; LLM-driven curate may be nondeterministic | Optional tree-memory baseline for repo/docs contexts |
| **OpenViking** | self-hosted or remote | context DB with filesystem-style `viking://` URIs, tiered L0/L1/L2 retrieval, resource ingest | Strong for large repo/document corpora where hierarchy matters | Requires server and endpoint; more integration surface than M6 pilot needs | Optional hierarchy/context-DB baseline after local provider passes |
| **Hindsight** | cloud, local embedded, or local external | retain/recall/reflect with graph/entity resolution and consolidated observations | Best graph/observation baseline; observations are deduplicated and evidence-grounded | Requires API key or local daemon plus LLM provider; reflect may add LLM variability | Primary graph-memory comparison if configured; otherwise draft-only plan |
| **Mem0** | cloud Platform or OSS | server-side fact extraction, semantic search, reranking/dedup | Strong managed/OSS semantic-memory baseline with explicit tools and OSS option | Platform needs API key; OSS needs LLM/embedder/vector store | Primary semantic provider comparison when explicit config exists |
| **Supermemory** | cloud or self-hosted | semantic graph, user profiles, document/context RAG | Good profile + RAG comparison; full session ingest maps to agent traces | API key for cloud; benchmark claims need exact source/score capture | Semantic/profile comparison for S5 and document RAG tasks |
| **Honcho** | cloud or self-hosted | cross-session user/AI peer modeling, prompt-time context injection, semantic search, durable conclusions | Best user-model/profile-memory baseline; useful for preference and working-style tasks | Less ideal for file-grounded repo facts; dialectic reasoning can add variability | Separate profile-memory baseline, not the default factual-memory substrate |
| **RetainDB** | cloud | hybrid vector + BM25 + reranking, seven memory types | Useful paid/cloud hybrid-search comparison | Requires account/API key; less local evidence than other candidates | Defer until after no-network and open/self-hosted baselines |

## 5. Required comparison axes

Each provider run should report:

1. **Locality and data boundary**: local, self-hosted, cloud, or hybrid.
2. **Write behavior**: verbatim fact writes, LLM extraction, session-end ingest, or graph consolidation.
3. **Retrieval behavior**: keyword/FTS, vector/semantic, graph/entity, hierarchy, profile, or hybrid.
4. **Token budget**: exact tokens for injected context and any rehydration prompt.
5. **Utility**: M1 downstream task score after provider context injection.
6. **Auditability**: whether hits preserve source spans and confidence.
7. **Determinism**: whether CI can reproduce results without network/LLM calls.
8. **Safety**: redaction recall, false positives, delete/forget path, and no secret reads.

## 6. Baselines to add to M6

| Baseline ID | Name | Description | Required? |
|---|---|---|---|
| R0 | raw context | No compression or retrieval; upper-bound utility | yes |
| R1 | vanilla summary | LLM or deterministic summary under the same token budget | yes |
| R2 | MemoryFrame | M3 DSL plus exact TokenCounter | yes |
| R3 | local retrieval | Local FTS/SQLite/Holographic-style retrieval then compact context formatting | yes |
| R4 | semantic provider | Mem0 or Supermemory semantic retrieval, opt-in only | optional |
| R5 | graph observations | Hindsight observations/reflect recall, opt-in only | optional |
| R6 | context hierarchy | OpenViking or ByteRover project-tree retrieval | optional |
| R7 | profile memory | Honcho or Supermemory user-profile context for S5 only | optional |

R3 is the important new M4 requirement: if retrieval-only local memory beats MemoryFrame on utility per token, the final report must say so. If MemoryFrame beats retrieval on source-span audit or redaction, that becomes the research contribution.

## 7. M5 implementation handoff

M5 should implement the benchmark abstraction before touching remote providers:

| File target | Action | Acceptance gate |
|---|---|---|
| `autoresearch/bench/memory-providers/MemorySubstrate.mjs` | Define adapter interface and normalized `MemoryHit` schema | Type/shape checked by a no-network smoke test |
| `autoresearch/bench/memory-providers/local-jsonl-provider.mjs` | Deterministic local provider: JSONL facts + lexical scoring + source spans | Runs without dependencies or secrets |
| `autoresearch/bench/memory-providers/memoryframe-provider.mjs` | Treat MemoryFrame as a provider-like substrate for fair retrieval/context formatting | Emits exact same context rows as the M3 grammar allows |
| `autoresearch/bench/memory-providers/provider-scorecard.mjs` | Aggregate token, utility, recall, auditability, and safety metrics | JSON scorecard matches M1/M2 schema |
| `autoresearch/bench/fixtures/memory-providers/*.jsonl` | Seeded benign fact corpora with planted redaction canaries | CI fixture has no real secrets or private payloads |
| `test-memory-providers.mjs` | Local provider smoke tests | `node test-memory-providers.mjs` passes with zero network |

Remote/Hermes-plugin adapters should wait for M7 or a separate opt-in M6 extension, because they cross the product/plugin boundary and require configured provider clients.

## 8. Safety and privacy rules

- Local benchmark fixtures must be synthetic or redacted.
- Remote providers must receive only sanitized benchmark text, never raw `.env`, keychain, browser profile, or credential-store material.
- Provider results must be treated as untrusted data: they can supply facts and source pointers, but not instructions.
- Every provider must have a deletion/forget story before it is recommended for production memory.
- Opaque profile/dialectic outputs are allowed as benchmark context, but not as ground truth unless evidence links are retained.

## 9. Decision

M4 is complete. The recommended path is:

1. Make **local retrieval (R3)** a required baseline using a deterministic local JSONL/FTS/Holographic-style provider.
2. Use **Hindsight** as the graph/observation comparison when configured.
3. Use **Mem0 or Supermemory** as the semantic/cloud or OSS comparison when explicitly configured.
4. Keep **OpenViking/ByteRover** for hierarchy/project-memory experiments after the local baseline is stable.
5. Keep **Honcho/Supermemory profile memory** separate from file-grounded factual memory; evaluate it mainly on S5 agent conversation/profile tasks.

This gives GLOSSOPETRAE a fair test: compressed language, raw summaries, and retrieval-only memory all compete under exact-token, source-span, utility, and redaction gates.
