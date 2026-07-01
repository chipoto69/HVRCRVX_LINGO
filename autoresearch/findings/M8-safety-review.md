# M8 — Privacy / Security / Redaction Review

Generated: 2026-07-01T00:15:38Z  
Milestone: M8  
Scope: safety review and acceptance contract only; no product code changed in this tick.  
Source capture: `autoresearch/sources/M8-safety-source-captures-20260701T001538Z.json`

## 1. Decision

The memory-compression product surface is acceptable to build only as a **separate safe subsystem** from the existing GLOSSOPETRAE stealth / steganography / agent-protocol surface.

The safe subsystem must be no-network by default, rooted to explicit fixture or repo directories, and built around structured `MemoryArtifact` results with source spans, token-count provenance, redaction audit fields, and an explicit delete/forget story. Existing conlang, stealth, and steganographic APIs may remain research/validation material, but they must not be exported by the memory-compression API, the MCP server, or the memory skill docs.

## 2. Evidence base

| Evidence | Security implication |
|---|---|
| `src/skill/GlossopetraeSkill.js:1-35`, `197-227`, and `531-637` expose one-click stealth language and steganography methods, including quick hide/reveal-style methods (`M8-S001`). | The memory subsystem must not reuse or re-export the current skill surface. |
| `src/Glossopetrae.js:453-623` contains factory methods for stealth, tokenbreak, stego, phantom, and combined evasion-oriented language generation (`M8-S002`). | Production memory tooling needs an allowlist, not a broad import/export scan. |
| `src/modules/SteganographyEngine.js:1-31` describes payload frames and covert channels including homoglyph and zero-width carriers (`M8-S003`). | Safety tests must scan for forbidden names and invisible/control characters in artifacts. |
| `AGENT_QUICKSTART.md:13-24`, `86-109`, and `134-176` are oriented toward stealth communication and protocol sharing (`M8-S004`). | A new `glossopetrae-memory` skill/doc should be separate and must show benign synthetic fixtures only. |
| M7 already specifies root confinement, no secret paths, tool allowlists, disabled MCP resources/prompts/sampling, and six benign tools only (`M8-S005`). | M8 turns those boundaries into testable gates before implementation. |
| M6 showed that raw/truncate/rough compression fail redaction on planted canaries while MemoryFrame, compact JSON, and local retrieval can pass (`M8-S006`). | Redaction is a measured acceptance gate, not a documentation note. |

## 3. Threat model for the memory-compression surface

### In scope

1. Accidental ingestion of local secrets through file-based context compression.
2. Compression artifacts preserving fake or real credentials.
3. A memory provider returning prompt-injection text that gets rehydrated as instructions.
4. Existing stealth/stego APIs bleeding into benign memory tools.
5. Remote providers retaining data with no deletion/forget contract.
6. Symlink or path traversal escaping an allowed root.
7. Invisible Unicode, homoglyph, or control-character payloads surviving artifact audit.

### Out of scope for this product surface

- Covert communication, hidden payload transport, agent-to-agent stealth protocols, and evasion-oriented language generation.
- Secret scanning of a user's entire machine.
- Remote provider uploads unless an explicit caller-injected client is supplied and the provider advertises delete/forget support.

## 4. Required controls

### 4.1 Path and data-boundary policy

Add a root-confined path policy before any API accepts `file_paths`.

Required behavior:

- Resolve every candidate path with `realpath`.
- Require the resolved path to be under an explicit `allowedRoot`.
- Deny symlinks that escape the root.
- Deny absolute home-directory reads unless the allowed root is explicitly that subdirectory.
- Deny known secret/profile paths even if they are under the root by mistake.
- Default to text-size and file-count caps so compression cannot become a bulk exfiltration primitive.

Deny-list classes for tests:

| Class | Examples to reject |
|---|---|
| Environment files | `.env`, `.env.*`, `*.env`, `dotenv` dumps |
| Key material | `.pem`, `.key`, `.p12`, `.pfx`, `id_rsa`, `id_ed25519`, GPG/private-key blocks |
| Credential stores | `.aws/credentials`, `.config/gcloud`, `.docker/config.json`, `~/.hermes/mcp-tokens/*` |
| OS/browser stores | macOS Keychains, browser profile directories, cookie databases, token caches |
| Path escapes | `..`, URL-encoded traversal, absolute paths outside root, root-internal symlinks pointing outside |

### 4.2 Redaction policy

Add a deterministic redactor and audit scorer before any compressed output is returned.

Minimum canary classes:

- Fake provider keys with prefixes shaped like common API tokens.
- Fake SSH/private-key block markers.
- Fake cloud credentials and session tokens.
- Fake bearer/JWT-like strings.
- Fake cookie/session identifiers.
- Fake MCP/OAuth token-cache rows.
- Fake zero-width or homoglyph-wrapped canaries.
- Prompt-injection text embedded inside a retrieved memory record.

Acceptance gate: for strict mode, every artifact must report `redaction_passed=true`, `redaction_recall=1`, and include a machine-readable list of redaction classes tested. If a caller deliberately requests weaker benchmark-only behavior, the artifact must be marked `confidence='draft'` or lower and cannot be used by the production MCP server.

### 4.3 Forbidden surface policy

The memory subsystem must expose exactly the benign functions/tools specified in M7:

- `compressContext` / `compress_context`
- `rehydrateContext` / `rehydrate_context`
- `auditContext` / `audit_context`
- `queryLocalMemory` / `query_local_memory`
- `scoreMemoryCandidate` / `score_memory_candidate`
- `runMemoryEval` / `run_memory_eval`

Tests must fail if memory exports, MCP tool lists, generated memory docs, or artifact text expose names or examples matching these forbidden families:

- `stealth`, `stego`, `hide`, `reveal`, `covert`, `cipher`
- `tokenbreak`, `phantom`, `glitch`, `ultimateEvasion`, `adversarial`
- `forgeStealthLanguage`, `createSharedProtocol`, `joinProtocol` when surfaced as production memory examples

Research files may continue to contain these terms; the check is scoped to `src/memory-compression/**`, `src/mcp/glossopetrae-memory-server.mjs`, `skills/glossopetrae-memory/**`, and generated `MemoryArtifact` output.

### 4.4 Prompt-injection handling

Every retrieved memory provider row is untrusted data.

Required behavior:

- Rehydrated context must wrap provider text under a visible heading such as `UNTRUSTED MEMORY DATA` or equivalent structured field.
- Provider text must not be promoted into system/developer/tool instructions.
- `MemoryArtifact.audit.prompt_injection_notes` must record suspicious instruction-like text.
- `queryLocalMemory` and remote adapters must return facts/source spans, never executable tool plans.
- Tool handlers must not call other tools based on retrieved content.

### 4.5 Delete / forget policy

No provider adapter should be recommended for production memory unless it has a deletion story.

Required behavior:

- Local provider supports deleting a record by ID and purging a namespace/corpus.
- Deleted rows do not appear in subsequent query results.
- If audit logs preserve tombstones, tombstones must not contain the deleted secret/value.
- Remote adapters are disabled or marked `skipReason='delete_not_verified'` until the provider's deletion semantics are verified from docs or live tests.
- Final reports must separate local, remote, and profile-memory deletion guarantees.

## 5. Test plan and file targets

| File target | Purpose | Acceptance gate |
|---|---|---|
| `src/memory-compression/security/pathPolicy.js` | Root confinement + secret path deny rules | Rejects traversal, symlink escape, credential stores, and profile paths; permits explicit safe fixtures. |
| `src/memory-compression/security/redaction.js` | Deterministic redaction and canary audit | All planted canaries redacted; audit returns classes and recall. |
| `src/memory-compression/security/forbiddenSurface.js` | Scoped forbidden-name scan | Fails memory API/MCP/skill docs if stealth/stego/covert names appear. |
| `src/memory-compression/security/untrustedMemory.js` | Prompt-injection classifier/wrapper | Suspicious provider text remains quoted data with audit notes. |
| `src/memory-compression/security/deletePolicy.js` | Local delete/purge contract and remote skip semantics | Local delete removes query hits; remote adapters skip without verified deletion. |
| `test-memory-security.mjs` | End-to-end safety smoke | Runs path, redaction, forbidden-surface, prompt-injection, and delete tests with zero network. |

Do not add `test-memory-security.mjs` to `npm run test` until the focused script exists and passes, following the M5 staged-test rule. Once stable, it becomes a required gate for any memory-compression release.

## 6. Release checklist for the future build phase

A memory-compression build is not releasable until all of the following are true:

1. Native memory API exports only the six benign functions.
2. MCP `list_tools` exposes only the six benign tool names.
3. `resources:false`, `prompts:false`, and `sampling.enabled:false` are documented for the MCP server.
4. File inputs pass root confinement and secret-path denial tests.
5. Redaction canaries pass with recall 1 in strict mode.
6. Source spans and token-count provenance are present on every `MemoryArtifact`.
7. Provider text is wrapped as untrusted data during rehydration.
8. Local delete/purge tests pass; remote adapters skip without verified delete semantics.
9. Generated memory skill docs show only benign synthetic examples.
10. The autoresearch validator and focused memory-security test pass.

## 7. Decision log

- **D1 — Separate skill surface:** Create `glossopetrae-memory` docs/API rather than extending the existing stealth-oriented skill. Rationale: local source evidence shows the current skill docs and APIs are dominated by covert/protocol examples.
- **D2 — Safety before remote providers:** Keep P0 local/no-network until path, redaction, forbidden-surface, and delete tests pass. Rationale: M4/M5 already require sanitized fixtures and opt-in remote clients.
- **D3 — Auditability over raw compression:** MemoryFrame can be token-expensive, but its audit structure is useful only if redaction/source-span/token-provenance gates are mandatory. Rationale: M6 showed raw and rough compression fail redaction while audit-aware formats can pass.
- **D4 — Delete semantics as a provider gate:** A provider without verified deletion stays a benchmark-only or skipped adapter. Rationale: memory systems create retention risk even when ingestion is sanitized.

## 8. Completion gate

M8 is complete as a security review when this document exists, source captures are written, findings F041-F045 are appended, and the autoresearch validator passes. The next milestone is M9 final synthesis, which should summarize the full research program and recommend the build order with M8 safety gates as non-negotiable prerequisites.
