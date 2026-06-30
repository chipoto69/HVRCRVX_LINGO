# M2 — Exact Tokenizer Integration Plan

Generated: 2026-06-30T13:34:57Z  
Milestone: M2  
Scope: exact tokenizer and provider-counting plan; no product code changed in this tick.

## 1. Integration thesis

GLOSSOPETRAE should treat token counting as a pluggable **measurement oracle**, not as a heuristic embedded inside `TokenCompressor`. The current estimator is useful for hill-climbing exploration, but publishable memory-compression results need exact or provider-authoritative counts with an explicit confidence tag.

The core design is:

```text
compression candidate
  -> TokenCounter.count(text|message, { provider, model, mode })
  -> TokenCountResult { input_tokens, source, confidence, cached_tokens?, notes? }
  -> benchmark metrics + optimizer objective
```

The existing `TokenCompressor.estimateTokens()` remains available only as `confidence=estimate` fallback. Any benchmark row using that fallback must be excluded from `verified` token-ratio claims.

## 2. Local evidence and constraints

- `package.json:1-10` shows the repo is currently zero-dependency and ESM-only (`"type":"module"`). Exact tokenization must either add a small optional dependency set or isolate provider-specific packages behind lazy imports.
- `src/modules/TokenCompressor.js:22-24` says tokenizer profiles are rough BPE vocabulary models.
- `src/modules/TokenCompressor.js:213-220` defines `estimateTokens(text, profileKey)` as an estimated BPE token count.
- `src/modules/TokenCompressor.js:322-349`, `375-386`, and `491-504` show token counts drive analysis/comparison and hill-climbing candidate selection. Replacing the counting backend changes optimizer behavior, so the implementation needs determinism tests.
- `autoresearch/findings/M1-benchmark-design.md:100-109` makes exact input/compressed/rehydrated token counts a blocking requirement for M1's benchmark metrics.

## 3. Live source capture used

Source capture file: `autoresearch/sources/M2-tokenizer-source-captures-20260630T133457Z.json`

Verified source notes:

- `M2-S001`: OpenAI `tiktoken` README verifies `tiktoken` as a fast BPE tokenizer for OpenAI models and shows `get_encoding("o200k_base")` plus `encoding_for_model("gpt-4o")`.
- `M2-S002`: npm registry verifies `gpt-tokenizer` 3.4.0 as a pure JavaScript BPE tokenizer for GPT-2/3/4 and OpenAI models, including GPT-4o keywords.
- `M2-S003`: npm registry verifies `@dqbd/tiktoken` 1.0.22 as JS/WASM bindings for `tiktoken`.
- `M2-S004`: Anthropic docs verify `messages.count_tokens(...)` and show an `input_tokens` response for active Claude models.
- `M2-S005`: Google Gemini docs verify `count_tokens` preflight and response `usage` fields for input/output/thought/cache/tool/total tokens.
- `M2-S006`: Mistral docs verify `mistral-common` as the tokenizer implementation reference and distinguish SentencePiece vs tiktoken-based tokenizer generations.
- `M2-S007`: OpenAI prompt-caching docs verify post-call `usage` fields including `prompt_tokens`, `total_tokens`, and `prompt_tokens_details.cached_tokens`.

## 4. Token counter source-of-truth hierarchy

| Rank | Source type | Use when | Confidence | Notes |
|---:|---|---|---|---|
| 1 | Provider preflight count endpoint | Anthropic and Gemini support preflight token counting for full request structures | `verified` | Best for chat envelopes, tools, system prompts, multimodal payloads, and provider-side hidden overhead. |
| 2 | Official or provider-referenced local tokenizer | OpenAI `tiktoken`; Mistral `mistral-common`; open-weight HF tokenizers with model tokenizer files | `verified` if model mapping pinned | Fast and deterministic; may still miss provider chat-envelope overhead unless wrapped exactly. |
| 3 | Maintained JS implementation of same tokenizer family | `gpt-tokenizer` or `@dqbd/tiktoken` for OpenAI-style BPE in Node | `verified` after golden vectors pass | Best fit for this ESM/Node repo; avoid loading all encodings eagerly. |
| 4 | Post-call usage accounting | OpenAI/Anthropic/Gemini/Mistral response `usage` after actual model calls | `verified` for that call | Required for audit rows and caching; not enough for preflight optimizer loops because it costs a model call. |
| 5 | Current `TokenCompressor.estimateTokens()` profiles | No exact provider/tokenizer available | `estimate` | Keep for offline search only; never publish exact compression ratios from this. |

## 5. Recommended tokenizer adapters

### 5.1 OpenAI-family adapter

Primary implementation target for the local benchmark:

```js
// src/tokenization/adapters/openai-gpt-tokenizer.js
import { encode, encodeChat } from 'gpt-tokenizer/model/gpt-4o';

export function countOpenAIText(text) {
  return { input_tokens: encode(text).length, source: 'gpt-tokenizer:gpt-4o', confidence: 'verified' };
}
```

Rationale:

- Pure JS is easiest for this ESM repo and avoids WASM initialization complexity in smoke tests.
- The adapter can map `gpt-4o`, `gpt-5`, and compatible models to `o200k_base`-style encodings when the package supports them.
- `@dqbd/tiktoken` should remain the secondary adapter for cross-checking golden vectors and for models where WASM bindings expose a closer tiktoken mapping.

Provider-accounting fallback:

- For OpenAI API runs, record `usage.prompt_tokens`, `usage.completion_tokens`, `usage.total_tokens`, and `usage.prompt_tokens_details.cached_tokens` from the real response.
- If local count and provider `usage.prompt_tokens` differ beyond an allowed envelope-overhead tolerance, mark the row `provider_usage_override=true` and use provider usage in reports.

### 5.2 Anthropic Claude adapter

Primary implementation target:

```js
// src/tokenization/adapters/anthropic-count-tokens.js
export async function countAnthropicMessage(client, request) {
  const r = await client.messages.count_tokens(request);
  return { input_tokens: r.input_tokens, source: 'anthropic:messages.count_tokens', confidence: 'verified' };
}
```

Provider-accounting fallback:

- Use `messages.count_tokens` for preflight when a client and key are intentionally provided.
- When keys are unavailable, tests must skip remote counts rather than reading `.env` or secret stores.
- For real generation rows, persist provider `usage` alongside preflight counts to detect tool/system-envelope drift.

### 5.3 Gemini adapter

Primary implementation target:

```js
// src/tokenization/adapters/gemini-count-tokens.js
export async function countGemini(client, model, contents) {
  const r = await client.models.countTokens({ model, contents });
  return { input_tokens: r.totalTokens ?? r.total_tokens, source: 'gemini:count_tokens', confidence: 'verified' };
}
```

Provider-accounting fallback:

- Use response `usage` for total input/output/thought/cache/tool/total tokens on actual interactions.
- Keep multimodal counts provider-authoritative only; do not estimate image/audio/document tokenization locally.

### 5.4 Mistral adapter

Primary implementation target:

- Use `mistral-common` as the source-of-truth tokenizer family when the benchmark adds Python or a service bridge.
- If a pure Node path is required, implement Mistral as `remote/provider usage only` until a maintained Node binding is selected.

Provider-accounting fallback:

- Record response usage from actual Mistral calls.
- Treat SentencePiece vs V3-Tekken/tiktoken model mapping as part of the model manifest; a mismatch should fail validation rather than silently count with the wrong tokenizer.

### 5.5 Open-weight / Hugging Face adapter

Primary implementation target:

- For local or open-weight models, load `tokenizer.json` through `@huggingface/tokenizers` or a lightweight bridge.
- Pin the tokenizer asset hash in the benchmark manifest so token counts remain reproducible.

Provider-accounting fallback:

- If a hosted provider wraps an open model with its own chat template, use provider usage for the final row even when the base tokenizer is known.

## 6. Proposed file-level implementation targets

No code was modified in this tick. The recommended implementation diff for M5 is:

| File | Action | Acceptance criteria |
|---|---|---|
| `src/tokenization/TokenCounter.js` | New core interface and registry | Exposes `countText`, `countMessages`, `compareCounts`, and returns normalized `TokenCountResult`. |
| `src/tokenization/model-manifest.js` | New provider/model mapping | Maps model patterns to adapter, encoding, envelope policy, and confidence. |
| `src/tokenization/adapters/openai-gpt-tokenizer.js` | New local OpenAI-family adapter | Golden vectors pass for `o200k_base`/GPT-4o sample strings. |
| `src/tokenization/adapters/tiktoken-wasm.js` | Optional secondary OpenAI adapter | Lazy-loads WASM and cross-checks `gpt-tokenizer`. |
| `src/tokenization/adapters/anthropic-count-tokens.js` | Optional remote adapter | Skips cleanly unless an explicit client is supplied. |
| `src/tokenization/adapters/gemini-count-tokens.js` | Optional remote adapter | Skips cleanly unless an explicit client is supplied. |
| `src/tokenization/adapters/hf-tokenizers.js` | Optional local open-model adapter | Loads pinned tokenizer files only from explicit test fixtures. |
| `src/modules/TokenCompressor.js` | Inject counter dependency | Existing `estimateTokens` remains, but optimizer can use exact counts through async or precomputed candidate scoring. |
| `bench/memory-compression-bench.mjs` | New benchmark runner | Emits exact token metrics from M1 with confidence tags. |
| `test-tokenization.mjs` | New smoke/golden tests | No network by default; remote tests opt-in with provided clients. |

## 7. Normalized result schema

```ts
type TokenCountConfidence = 'verified' | 'draft' | 'estimate';

type TokenCountResult = {
  input_tokens: number;
  output_tokens?: number;
  total_tokens?: number;
  cached_tokens?: number;
  reasoning_tokens?: number;
  tool_tokens?: number;
  provider: 'openai' | 'anthropic' | 'gemini' | 'mistral' | 'hf' | 'generic';
  model: string;
  source: string;
  confidence: TokenCountConfidence;
  mode: 'text' | 'messages' | 'multimodal' | 'provider_usage';
  tokenizer_version?: string;
  model_mapping_version?: string;
  warnings: string[];
};
```

Rules:

1. `input_tokens` is required for every row.
2. `confidence='verified'` requires either a live provider count/usage result or a pinned local tokenizer with passing golden vectors.
3. `confidence='estimate'` is the only legal value for `TokenCompressor.estimateTokens()` output.
4. Multimodal payloads are provider-count-only until local modality tokenization is separately verified.
5. Cached-token fields must be recorded separately; cached tokens still count toward context-window occupancy but not necessarily the same billing/latency path.

## 8. Golden vectors and drift checks

Minimum golden vector suite:

| Case | Purpose |
|---|---|
| Plain ASCII sentence | Detect gross tokenizer mapping errors. |
| CodeForge program with punctuation and newlines | Match the benchmark's executable context shape. |
| JSON task state with repeated keys | Match Deli_AutoResearch memory state. |
| GLOSSOPETRAE generated lexicon with non-English symbols | Catch non-ASCII penalties and tokenizer fragmentation. |
| Chat request with system/user/tool schema | Detect envelope overhead and tool-count differences. |
| Long repeated prefix | Exercise prompt-cache accounting fields in provider usage rows. |

Drift policy:

- Store golden vector expected counts under `bench/fixtures/tokenizer-golden/*.json` with model, tokenizer package version, and capture date.
- On dependency updates, regenerate only after a deliberate `--update-tokenizer-goldens` flag.
- If local and provider counts disagree, prefer provider usage for published rows and keep the local count as a diagnostic field.

## 9. Benchmark integration sequence

1. **P0 — synchronous local text counts**: implement OpenAI-family exact text counts with `gpt-tokenizer`; keep `estimateTokens` unchanged.
2. **P1 — result schema**: add normalized `TokenCountResult` and update M1 metrics to emit `input_tokens_exact`, `compressed_tokens_exact`, `rehydrated_tokens_exact`, and confidence tags.
3. **P2 — optimizer injection**: let `TokenCompressor` accept a counter dependency. For async provider counters, pre-score candidate strings outside the hill-climber or run a bounded async candidate scorer.
4. **P3 — remote provider verification**: add opt-in Anthropic/Gemini preflight counters and OpenAI provider-usage reconciliation. Tests must skip without explicit clients; never inspect `.env`.
5. **P4 — open-model and Mistral coverage**: add HF tokenizer fixtures and decide whether Mistral uses a Python bridge to `mistral-common` or provider-usage-only rows.

## 10. Acceptance gates for M2 handoff

M2 is complete when this document exists and M5 can implement from it. M5 should not be considered complete until:

- `node test-tokenization.mjs` passes with zero network.
- `npm run test` still passes after adding dependencies and integration code.
- `node autoresearch/scripts/validate-autoresearch.mjs` passes.
- The M1 pilot benchmark can produce rows where `input_tokens_exact`, `compressed_tokens_exact`, and `rehydrated_tokens_exact` are populated with `confidence='verified'` for at least one OpenAI-family local model mapping.
- Remote provider adapters are explicitly opt-in and do not read secrets, `.env`, keychains, or credential stores.

## 11. Key risk register

| Risk | Impact | Mitigation |
|---|---|---|
| Wrong model-to-tokenizer mapping | Published compression ratios are invalid | Model manifest + golden vectors + provider-usage reconciliation. |
| Chat envelope overhead omitted | Text-only count underestimates real prompt cost | Separate `text` vs `messages` modes and provider preflight where available. |
| WASM dependency fragility | Node/browser tests become flaky | Use pure-JS adapter first; isolate WASM as optional cross-check. |
| Provider API drift | Counts change across model versions | Save model version, tokenizer package version, and capture timestamp in every row. |
| Secret leakage in remote tests | Unsafe cron behavior | Remote tests require injected clients and skip by default; no `.env` reads. |
| Optimizer becomes async and slow | Hill-climbing cost explodes | Use local exact counts for search; provider counts only for final candidates and audit rows. |

## 12. Decision

Use `gpt-tokenizer` as the first implementation dependency for local exact OpenAI-family counts, with `@dqbd/tiktoken` as optional cross-check. Provider-authoritative counts are required for Anthropic/Gemini request structures and for final audit rows. The rough profile estimator stays as an offline fallback but is explicitly demoted to `estimate` confidence.
