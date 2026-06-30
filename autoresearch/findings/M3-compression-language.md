# M3 — Compression Language / DSL Design

Generated: 2026-06-30T15:41:06Z  
Milestone: M3  
Scope: design only; no product code changed in this tick.

## 1. Design thesis

GLOSSOPETRAE should not make the first memory-compression language an opaque conlang or glyph skin. The production candidate should be a small, auditable, line-oriented DSL — **MemoryFrame** — that preserves facts, source spans, decisions, constraints, and next actions with explicit confidence tags. Generated languages and CodeSkin remain valuable as benchmark/evaluation strata, but production memory should be inspectable by a human reviewer and mechanically traceable to source.

The core principle is:

```text
raw context
  -> extract typed facts + decisions + constraints + actions
  -> encode as MemoryFrame lines with source spans and confidence
  -> count with TokenCounter from M2
  -> rehydrate into natural language or task state
  -> grade with M1 downstream tasks + audit checks
```

## 2. Local evidence and constraints

- `src/modules/TokenCompressor.js:10-14` frames compression as minimizing token count while preserving semantic fidelity; `src/modules/TokenCompressor.js:22-24` and `src/modules/TokenCompressor.js:213-220` confirm current counts are heuristic.
- `src/modules/TokenCompressor.js:528-604` already contains useful transformations — abbreviation, telegraphic deletion, symbol substitution, structured formatting, deduplication — but it does not emit source-span or confidence metadata.
- `src/modules/CodeForge.js:4-19` provides deterministic generated programming languages with an interpreter oracle; `src/modules/CodeSkin.js:4-13` is explicitly a benign measurement instrument for machine-usability vs human-legibility, not an operationalization target.
- `bench/README.md:14-25` states the benchmark pattern: seed-generated tasks, no contamination, no human labels, tunable difficulty, and infinite fresh items.
- `autoresearch/findings/M1-benchmark-design.md:92-132` requires safety and auditability metrics; `autoresearch/findings/M2-tokenizer-plan.md:44-52` requires exact/provider-authoritative token-count provenance.

## 3. Source capture / local probe

Local probe file: `autoresearch/sources/M3-dsl-local-probe-20260630T154106Z.json`

This probe used the existing `TokenCompressor.estimateTokens(profile='gpt')` only as a **design heuristic**. It is not a publishable exact-token result.

| Representation | Chars | Estimated GPT tokens | Interpretation |
|---|---:|---:|---|
| Raw paragraph | 712 | 205 | Most readable; worst budget use. |
| Compact JSON | 360 | 97 | Shortest in this probe, but weak for source-span review and hand editing. |
| MemoryFrame DSL | 461 | 133 | Costs more than JSON, but keeps typed fact/action/source structure. |

Decision from the probe: implement MemoryFrame as the primary human-auditable format and expose JSON export as a storage/interchange view. Do not claim compression ratios until M2's exact `TokenCounter` exists.

## 4. MemoryFrame DSL v0.1

### 4.1 Goals

MemoryFrame must preserve:

1. **entities** — people, repos, files, milestones, modules, models, providers;
2. **facts** — claims that affect future decisions;
3. **decisions** — chosen directions and why alternatives were rejected;
4. **constraints** — safety, privacy, token-count, evaluation, and implementation limits;
5. **actions** — next steps with owner / milestone / dependency;
6. **sources** — file paths, line ranges, captured URLs, run IDs, or generated benchmark seeds;
7. **confidence** — `verified`, `draft`, or `estimate` exactly matching the state finding schema.

Non-goals for v0.1:

- no hidden payloads;
- no secret retention;
- no opaque glyph/conlang-only storage;
- no provider-specific token-ratio claims without exact TokenCounter provenance.

### 4.2 Concrete syntax

Line-oriented syntax keeps diffs, streaming, and partial parsing simple.

```ebnf
frame        := header line*
header       := "@mem" ws kv+
line         := entity | fact | decision | constraint | action | link | note
entity       := "E" ws id ws kv+
fact         := "F" ws id ws claim ws attrs
decision     := "D" ws id ws claim ws attrs
constraint   := "C" ws id ws claim ws attrs
action       := "A" ws id ws claim ws attrs
link         := "L" ws src_id ws target_id ws attrs
note         := "N" ws free_text
attrs        := kv*
kv           := key "=" value
id           := /[A-Za-z][A-Za-z0-9_.-]*/
claim        := backtick_text | compact_text
value        := bare | quoted | list | backtick_text
list         := "[" value ("," value)* "]"
```

Recommended tags:

| Tag | Meaning | Required attrs |
|---|---|---|
| `E` | entity or object | `type`, `src` |
| `F` | factual claim | `conf`, `src` |
| `D` | decision | `because`, `conf`, `src` |
| `C` | constraint / invariant | `level`, `src` |
| `A` | next action | `owner`, `dep`, `src` |
| `L` | relationship / edge | `rel`, `conf`, `src` |
| `N` | non-load-bearing note | none, but should be rare |

### 4.3 Example

```text
@mem v=0.1 task=glossopetrae ms=M3 model=gpt-family count=estimate
E tokcmp type=module src=src/modules/TokenCompressor.js:1-24
F f_tokcmp_rough `TokenCompressor counts are heuristic BPE estimates` conf=verified src=src/modules/TokenCompressor.js:22-24
F f_m2_counter `publishable ratios need TokenCounter provenance` conf=verified src=autoresearch/findings/M2-tokenizer-plan.md:44-52
D d_m3_primary `use auditable MemoryFrame before opaque conlang surfaces` because=auditability+source_spans conf=verified src=autoresearch/findings/M3-compression-language.md:1-999
C c_safety `no secrets and no operational covert-channel payloads` level=must src=autoresearch/state/task_spec.md:45-46
A a_m5 `implement parser+rehydrator+golden roundtrip tests` owner=M5 dep=M2.TokenCounter src=autoresearch/findings/M3-compression-language.md
```

## 5. Codebook options

| Option | Description | Best use | Risk | M3 verdict |
|---|---|---|---|---|
| Fixed ASCII mnemonics | Stable tags like `F`, `D`, `C`, `A`, `src`, `conf` | Human-auditable production memory | Some token overhead | **Primary** |
| Project-local aliases | Short aliases for frequent entities: `tokcmp`, `membench`, `cf`, `cs` | Repo/task memory | Alias drift | **Use with manifest** |
| Seeded GLOSSOPETRAE lexemes | Deterministic generated words for entity/relation codes | Benchmark stratum S3 and stress tests | Token fragmentation + audit cost | **Evaluation only in v0.1** |
| CodeSkin/glyph surfaces | Bijective opaque token surfaces | Human-legibility vs machine-usability experiments | Human review failure | **Do not use for production memory** |
| Binary/base encodings | Dense storage for machine-only transport | Internal cache snapshots | Not inspectable; poor diffs | **Defer** |
| JSON object rows | Machine interchange and DB storage | Persistence, APIs, validation | Verbose punctuation or weak readability depending style | **Secondary export** |

The first implementation should use fixed ASCII mnemonics plus a manifest-pinned alias table:

```json
{
  "version": "memoryframe-codebook-0.1",
  "aliases": {
    "tokcmp": "src/modules/TokenCompressor.js",
    "membench": "autoresearch/findings/M1-benchmark-design.md",
    "tcounter": "src/tokenization/TokenCounter.js"
  }
}
```

Every alias must resolve deterministically and must not shadow a different entity within the same run.

## 6. Compression / rehydration algorithm

### 6.1 Encode

1. Redact first: remove or replace secrets, private strings, and planted canaries before compression.
2. Segment context into candidate facts, decisions, constraints, actions, and source spans.
3. Deduplicate by `(normalized_claim, source_span)` and preserve the newest decision if conflicts exist.
4. Assign stable IDs (`f001`, `d001`, etc.) and confidence.
5. Emit MemoryFrame lines sorted by load-bearing priority: constraints, decisions, facts, actions, links, notes.
6. Count tokens with M2 `TokenCounter`; if only heuristic counts are available, tag the whole frame `count=estimate`.

### 6.2 Rehydrate

1. Parse each line with strict schema validation.
2. Resolve aliases through the codebook manifest.
3. Expand into one of two views:
   - `state-view`: JSON suitable for benchmark/task-state injection;
   - `narrative-view`: concise natural language with citations.
4. Preserve `src`, `conf`, and `because` fields in both views.
5. Fail closed if a mandatory constraint or source pointer is missing.

### 6.3 Optimize

Use `TokenCompressor` transformations only inside the encoder as candidate generators, not as the final authority:

- abbreviation and symbol substitution may shorten claims;
- telegraphic deletion is allowed only if required entities and predicates remain;
- deduplication is allowed only with explicit `L rel=refers_to` backreferences;
- exact token acceptance/rejection waits for M2 `TokenCounter`.

## 7. Audit model

A MemoryFrame artifact is valid only if it passes all checks below.

| Check | Gate |
|---|---|
| Parse validity | Every non-note line parses against the v0.1 grammar. |
| Source coverage | Every `F`, `D`, `C`, and `A` line has at least one `src`. |
| Confidence legality | `conf` is one of `verified`, `draft`, `estimate`. |
| Secret safety | Redaction scanner finds no raw secrets, API keys, `.env` fragments, or planted canaries. |
| Round-trip fidelity | Rehydrated facts answer hidden fact probes from M1. |
| Decision fidelity | Rehydrated state preserves tried directions and stale/pivot reasons. |
| Token provenance | Token counts carry `provider`, `model`, `source`, and `confidence` from M2. |
| Human review | A reviewer can inspect the frame without executing generated code or decoding opaque glyphs. |

Audit score suggestion for M6:

```text
auditability_score = 0.35*source_coverage
                   + 0.25*roundtrip_fact_f1
                   + 0.20*decision_equivalence
                   + 0.10*token_provenance_valid
                   + 0.10*redaction_pass
```

## 8. Benchmark integration

Map MemoryFrame into M1 strata as follows:

| M1 stratum | MemoryFrame role |
|---|---|
| S1 Synthetic task state | Primary representation for `task_spec`, `progress`, `findings`, and logs. |
| S2 Code/program context | Store CodeForge specs and execution-relevant facts, not opaque code payloads. |
| S3 Conlang / DSL context | Test generated codebooks as an evaluation variant against MemoryFrame. |
| S4 Repo/docs context | Compress file-local facts with source spans. |
| S5 Agent conversation memory | Preserve decisions, blockers, user preferences, and next actions. |

Baselines for M6 should include: raw context, vanilla summary, compact JSON, extractive salient lines, TokenCompressor heuristic output, MemoryFrame, and retrieval-only memory-provider context.

## 9. File-level targets for M5

| File | Action | Acceptance criteria |
|---|---|---|
| `src/memoryframe/parseMemoryFrame.js` | New parser | Strict line parser with useful errors and no eval. |
| `src/memoryframe/emitMemoryFrame.js` | New emitter | Deterministic line ordering, stable IDs, manifest aliases. |
| `src/memoryframe/rehydrateMemoryFrame.js` | New rehydrator | Emits state-view JSON and narrative-view markdown. |
| `src/memoryframe/auditMemoryFrame.js` | New validator | Implements parse/source/confidence/redaction/token-provenance gates. |
| `bench/fixtures/memoryframe/*.mf` | New fixtures | At least one S1 and one S4 fixture with expected rehydration. |
| `test-memoryframe.mjs` | New test | Parser round-trip, alias resolution, redaction, and hidden fact probes pass. |

## 10. Risks and mitigations

| Risk | Impact | Mitigation |
|---|---|---|
| Over-compression loses causal reasons | Agent repeats bad directions | Mandatory `D because=` lines and decision-equivalence tests. |
| Alias drift corrupts entities | Wrong source/file/entity linked | Manifest-pinned aliases with collision checks. |
| JSON beats DSL on token count | DSL may not be worth it for short contexts | Measure exact tokens in M6; keep JSON export as baseline. |
| Opaque generated languages reduce reviewability | Safety and debugging failure | Restrict conlang/glyph surfaces to evaluation, not production memory. |
| Heuristic token counts mislead design | False compression wins | Use M2 TokenCounter for acceptance; tag heuristic probes as estimates. |
| Redaction drops useful facts | Utility loss | Report false positives and allow safe placeholders with source hashes. |

## 11. Decision

M3 is complete with this design. The recommended compression language is **MemoryFrame v0.1**: a typed, line-oriented, source-span-preserving DSL with fixed ASCII mnemonics, a manifest-pinned alias codebook, strict audit gates, and exact-token integration deferred to M2/M5. GLOSSOPETRAE generated languages, CodeForge, and CodeSkin should be used to create benchmark/evaluation pressure, not as the default production memory surface.
