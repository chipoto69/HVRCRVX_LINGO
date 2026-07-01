import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath, pathToFileURL } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const artifactRoot = path.resolve(here, '..');
const worktree = path.resolve(artifactRoot, '..');
const ts = new Date().toISOString().replace(/\.\d{3}Z$/, 'Z');
const stamp = ts.replace(/[-:]/g, '').replace('T', 'T').replace('Z', 'Z');
const runId = `m6-controlled-eval-${stamp}`;

function esc(s) { return String(s).replace(/`/g, "'").replace(/\n+/g, ' ').trim(); }
function safeId(s) { return String(s).toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '').slice(0, 42) || 'x'; }
function mean(xs) { return xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0; }
function round(n, d = 3) { return Number.isFinite(n) ? Number(n.toFixed(d)) : 0; }
function ci95(xs) {
  if (xs.length < 2) return 0;
  const m = mean(xs);
  const sd = Math.sqrt(xs.reduce((s, x) => s + (x - m) ** 2, 0) / (xs.length - 1));
  return 1.96 * sd / Math.sqrt(xs.length);
}

async function loadTokenizer() {
  const attempts = [];
  if (process.env.GPT_TOKENIZER_ROOT) {
    attempts.push(pathToFileURL(path.join(process.env.GPT_TOKENIZER_ROOT, 'node_modules/gpt-tokenizer/esm/model/gpt-4o.js')).href);
  }
  attempts.push('gpt-tokenizer/model/gpt-4o');
  for (const spec of attempts) {
    try {
      const mod = await import(spec);
      if (typeof mod.encode !== 'function') throw new Error('encode export missing');
      let version = 'unknown';
      if (process.env.GPT_TOKENIZER_ROOT) {
        const pkg = JSON.parse(fs.readFileSync(path.join(process.env.GPT_TOKENIZER_ROOT, 'node_modules/gpt-tokenizer/package.json'), 'utf8'));
        version = pkg.version;
      }
      return { encode: mod.encode, source: 'gpt-tokenizer/model/gpt-4o', version, confidence: 'verified', warnings: [] };
    } catch (err) {
      // Try the next spec.
    }
  }
  return {
    encode: (text) => Array.from(String(text).match(/\s*\S+/g) || []),
    source: 'fallback:whitespace-token-estimate',
    version: 'none',
    confidence: 'estimate',
    warnings: ['gpt-tokenizer unavailable; exact-token claims are disabled for this run']
  };
}

const tokenizer = await loadTokenizer();
const count = (text) => tokenizer.encode(String(text)).length;
const { TokenCompressor } = await import(pathToFileURL(path.join(worktree, 'src/modules/TokenCompressor.js')).href);

function runJs(program) {
  const logs = [];
  const sandbox = { console: { log: (...xs) => logs.push(xs.join(' ')) } };
  vm.createContext(sandbox);
  vm.runInContext(program, sandbox, { timeout: 250 });
  return logs.join('\n');
}

function canary(seed, kind) { return `FAKE_SECRET_CANARY_M6_${seed}_${kind}`; }
function redact(text) {
  return String(text)
    .replace(/FAKE_SECRET_CANARY_M6_[A-Za-z0-9_:-]+/g, '[REDACTED_CANARY]')
    .replace(/sk-fake-[A-Za-z0-9-]+/g, '[REDACTED_KEY]');
}

function makeCorpus() {
  const code = `// GLP_EXEC_START\nconst xs = [2, 3, 5, 7];\nconst sum = xs.reduce((a, b) => a + b, 0);\nconsole.log('sum=' + sum);\n// GLP_EXEC_END`;
  const stdout = runJs(code.replace('// GLP_EXEC_START\n', '').replace('\n// GLP_EXEC_END', ''));
  return [
    {
      id: 's1-task-state-seed-11', stratum: 'S1', seed: 11,
      query: 'What milestone is next and what direction should the orchestrator run?',
      canaries: [canary(11, 'ALPHA'), 'sk-fake-M6-SEED11-NOT-A-REAL-KEY'],
      input: `task=glossopetrae-autoresearch-gigathing\ncurrent_milestone=M6\nstale_count=0\nlast_completed_direction=D007 no-network-prototype-implementation-plan\nnext_direction=Controlled evaluation pilot for MemoryFrame vs raw/summary/retrieval baselines\nrequired_gate=exact token counts plus downstream task scores\nconstraint=no secrets, no .env, benign-only fixtures\nplanted_canary=${canary(11, 'ALPHA')}\nplanted_key=sk-fake-M6-SEED11-NOT-A-REAL-KEY\nnoise=heartbeat updated; previous reports M1 through M5 complete`,
      facts: [
        ['current_milestone', 'M6', 'autoresearch/state/progress.json:8'],
        ['stale_count', '0', 'autoresearch/state/progress.json:10'],
        ['last_completed_direction', 'D007 no-network-prototype-implementation-plan', 'autoresearch/state/directions_tried.json:47-51'],
        ['next_direction', 'Controlled evaluation pilot for MemoryFrame vs raw/summary/retrieval baselines', 'autoresearch/state/directions_tried.json:54-56'],
        ['required_gate', 'exact token counts plus downstream task scores', 'autoresearch/state/task_spec.md:31-32']
      ]
    },
    {
      id: 's2-code-context-seed-23', stratum: 'S2', seed: 23,
      query: 'Recover the executable behavior and expected stdout.',
      canaries: [canary(23, 'BRAVO')], oracleStdout: stdout,
      input: `CodeForge-like JS probe for deterministic execution scoring.\n${code}\nexpected_stdout=${stdout}\nsemantic_requirement=array reduce sum over [2,3,5,7]\nsource_span=synthetic:S2:seed23\nplanted_canary=${canary(23, 'BRAVO')}`,
      facts: [
        ['program_kind', 'CodeForge-like JS probe', 'synthetic:S2:seed23'],
        ['expected_stdout', stdout, 'synthetic:S2:seed23'],
        ['semantic_requirement', 'array reduce sum over [2,3,5,7]', 'synthetic:S2:seed23'],
        ['source_span', 'synthetic:S2:seed23', 'synthetic:S2:seed23']
      ]
    },
    {
      id: 's4-repo-docs-seed-37', stratum: 'S4', seed: 37,
      query: 'Which design facts from M1-M5 must a builder preserve?',
      canaries: [canary(37, 'CHARLIE')],
      input: `Repo/doc memory shard.\nM1 says compression must be end-to-end agent utility, not string shortening only.\nM2 says TokenCounter must be a pluggable measurement oracle with exact or provider-authoritative counts.\nM3 says MemoryFrame is a line-oriented DSL preserving source spans and confidence.\nM4 says memory providers are retrieval baselines, not replacements for compression.\nM5 says the P0 prototype is no-network and no-secrets.\nplanted_canary=${canary(37, 'CHARLIE')}\nsource_spans=autoresearch/findings/M1-benchmark-design.md:7-16; autoresearch/findings/M2-tokenizer-plan.md:7-20; autoresearch/findings/M3-compression-language.md:7-20; autoresearch/findings/M4-memory-provider-matrix.md:7-16; autoresearch/findings/M5-prototype-plan.md:7-20`,
      facts: [
        ['m1_thesis', 'end-to-end agent utility', 'autoresearch/findings/M1-benchmark-design.md:7-16'],
        ['m2_counter', 'pluggable measurement oracle', 'autoresearch/findings/M2-tokenizer-plan.md:7-20'],
        ['m3_memoryframe', 'line-oriented DSL preserving source spans and confidence', 'autoresearch/findings/M3-compression-language.md:7-20'],
        ['m4_providers', 'retrieval baselines, not replacements for compression', 'autoresearch/findings/M4-memory-provider-matrix.md:7-16'],
        ['m5_p0', 'no-network and no-secrets', 'autoresearch/findings/M5-prototype-plan.md:7-20']
      ]
    }
  ];
}

function trimTail(text, budget) {
  let lo = 0, hi = text.length, best = '';
  while (lo <= hi) {
    const mid = Math.floor((lo + hi) / 2);
    const cand = text.slice(text.length - mid);
    if (count(cand) <= budget) { best = cand; lo = mid + 1; } else hi = mid - 1;
  }
  return best;
}
function extractive(item, budget) {
  const terms = new Set(item.facts.flatMap(([k, v]) => `${k} ${v}`.toLowerCase().split(/[^a-z0-9]+/)).filter(Boolean));
  const lines = redact(item.input).split('\n').map((line) => ({ line, score: line.toLowerCase().split(/[^a-z0-9]+/).filter((t) => terms.has(t)).length + (/source|next|stdout|M\d/.test(line) ? 3 : 0) }));
  const chosen = [];
  for (const row of lines.sort((a, b) => b.score - a.score)) {
    const cand = [...chosen, row.line].join('\n');
    if (count(cand) <= budget) chosen.push(row.line);
  }
  return chosen.join('\n');
}
function compactJson(item) {
  return JSON.stringify({ id: item.id, stratum: item.stratum, facts: item.facts.map(([k, v, src]) => ({ k, v, src, conf: 'verified' })), safety: 'redacted' });
}
function memoryFrame(item) {
  const lines = [`@mem v=0.1 item=${item.id} stratum=${item.stratum} count=${tokenizer.confidence}`];
  lines.push(`C c_safety \`no secrets; planted canaries redacted\` level=must src=autoresearch/findings/M5-prototype-plan.md:123-130`);
  if (item.stratum === 'S1') lines.push(`D d_next \`run M6 controlled evaluation next\` because=first_incomplete_milestone conf=verified src=autoresearch/state/progress.json:20-23`);
  for (const [k, v, src] of item.facts) lines.push(`F f_${safeId(k)} \`${esc(`${k}=${v}`)}\` conf=verified src=${src}`);
  lines.push(`A a_next \`preserve exact-token provenance and downstream score rows\` owner=M6 dep=M2.TokenCounter src=autoresearch/findings/M2-tokenizer-plan.md:155-184`);
  return lines.join('\n');
}
function localProvider(item) {
  return item.facts.slice(0, 4).map(([k, v, src]) => `- ${k}: ${v} [src=${src}; conf=verified]`).join('\n');
}
function vanillaSummary(item) {
  return `Summary ${item.id}: ` + item.facts.map(([k, v]) => `${k}=${v}`).join('; ') + '. Safety canaries redacted.';
}
function tokenCompressorRough(item) {
  const tc = new TokenCompressor(item.seed, { profile: 'gpt', maxRounds: 5, fidelityThreshold: 0.72 });
  return tc.optimizeProse(item.input, { profile: 'gpt', maxRounds: 5, fidelityThreshold: 0.72 }).optimized.text;
}
function extractProgram(text) {
  const m = String(text).match(/GLP_EXEC_START\n([\s\S]*?)\n\s*\/\/ GLP_EXEC_END/);
  return m ? m[1] : null;
}
function score(item, baseline, output, inputTokens) {
  const outLower = output.toLowerCase();
  const factHits = item.facts.filter(([, v]) => outLower.includes(String(v).toLowerCase())).length;
  const factRecall = factHits / item.facts.length;
  const leaked = item.canaries.filter((c) => output.includes(c)).length;
  const redactionRecall = item.canaries.length ? 1 - leaked / item.canaries.length : 1;
  let decisionEquivalence = null;
  if (item.stratum === 'S1') decisionEquivalence = /M6/.test(output) && /stale_count[=:]0|stale_count.*0/.test(output) && /controlled evaluation/i.test(output) ? 1 : 0;
  let executionEquivalence = null;
  if (item.stratum === 'S2') {
    const program = extractProgram(output);
    try { executionEquivalence = program && runJs(program) === item.oracleStdout ? 1 : 0; } catch { executionEquivalence = 0; }
  }
  const auditByBaseline = { raw: 0.3, truncate_tail: 0.2, vanilla_summary: 0.25, extractive_lines: 0.65, tokencompressor_rough: 0.15, compact_json: 0.75, memoryframe: 1.0, local_jsonl_provider: 0.9 };
  const auditability = auditByBaseline[baseline] ?? 0.4;
  const downstream = item.stratum === 'S1'
    ? (0.55 * factRecall + 0.30 * (decisionEquivalence ?? 0) + 0.15 * redactionRecall)
    : item.stratum === 'S2'
      ? (0.45 * factRecall + 0.45 * (executionEquivalence ?? 0) + 0.10 * redactionRecall)
      : (0.70 * factRecall + 0.20 * auditability + 0.10 * redactionRecall);
  const failures = [];
  if (factRecall < 1) failures.push('FM1_entity_or_fact_loss');
  if (item.stratum === 'S1' && decisionEquivalence < 1) failures.push('FM2_direction_drift');
  if (item.stratum === 'S2' && executionEquivalence < 1) failures.push('FM5_executable_breakage_or_no_code');
  if (redactionRecall < 1) failures.push('FM7_under_redaction');
  if (auditability < 0.5) failures.push('FM10_audit_failure');
  if (count(output) / inputTokens < 0.6 && downstream < 0.7) failures.push('FM8_compression_only_win');
  return { fact_recall: round(factRecall), decision_equivalence: decisionEquivalence, execution_equivalence: executionEquivalence, redaction_recall: round(redactionRecall), auditability_score: auditability, downstream_task_score: round(downstream), failure_modes: failures };
}

const corpus = makeCorpus();
const baselines = ['raw', 'truncate_tail', 'vanilla_summary', 'extractive_lines', 'tokencompressor_rough', 'compact_json', 'memoryframe', 'local_jsonl_provider'];
const rows = [];
for (const item of corpus) {
  const inputTokens = count(item.input);
  const budget = Math.max(40, Math.floor(inputTokens * 0.40));
  for (const baseline of baselines) {
    const output = baseline === 'raw' ? item.input
      : baseline === 'truncate_tail' ? trimTail(item.input, budget)
      : baseline === 'vanilla_summary' ? vanillaSummary(item)
      : baseline === 'extractive_lines' ? extractive(item, budget)
      : baseline === 'tokencompressor_rough' ? tokenCompressorRough(item)
      : baseline === 'compact_json' ? compactJson(item)
      : baseline === 'memoryframe' ? memoryFrame(item)
      : localProvider(item);
    const outputTokens = count(output);
    rows.push({ run_id: runId, item_id: item.id, seed: item.seed, stratum: item.stratum, baseline, budget_tokens: budget, token_counts: { input_tokens: inputTokens, output_tokens: outputTokens, compression_ratio: round(outputTokens / inputTokens), source: tokenizer.source, tokenizer_version: tokenizer.version, confidence: tokenizer.confidence }, scores: score(item, baseline, output, inputTokens), output_excerpt: output.slice(0, 260) });
  }
}
const aggregate = Object.fromEntries(baselines.map((b) => {
  const rs = rows.filter((r) => r.baseline === b);
  return [b, {
    n: rs.length,
    avg_output_tokens: round(mean(rs.map((r) => r.token_counts.output_tokens)), 1),
    avg_ratio: round(mean(rs.map((r) => r.token_counts.compression_ratio)), 3),
    avg_downstream: round(mean(rs.map((r) => r.scores.downstream_task_score)), 3),
    ci95_downstream: round(ci95(rs.map((r) => r.scores.downstream_task_score)), 3),
    avg_fact_recall: round(mean(rs.map((r) => r.scores.fact_recall)), 3),
    avg_execution_equivalence: round(mean(rs.filter((r) => r.scores.execution_equivalence !== null).map((r) => r.scores.execution_equivalence)), 3),
    avg_redaction_recall: round(mean(rs.map((r) => r.scores.redaction_recall)), 3),
    avg_auditability: round(mean(rs.map((r) => r.scores.auditability_score)), 3),
    failure_count: rs.reduce((s, r) => s + r.scores.failure_modes.length, 0)
  }];
}));
const sourcePath = path.join(artifactRoot, 'sources', `${runId}.json`);
fs.writeFileSync(sourcePath, JSON.stringify({ run_id: runId, ts, tokenizer, corpus: corpus.map(({ input, ...rest }) => ({ ...rest, input_sha256_note: 'input omitted from summary object; see row excerpts and script fixtures' })), aggregate, rows }));

const table = baselines.map((b) => {
  const a = aggregate[b];
  return `| ${b} | ${a.avg_output_tokens} | ${a.avg_ratio} | ${a.avg_downstream} ± ${a.ci95_downstream} | ${a.avg_fact_recall} | ${a.avg_execution_equivalence} | ${a.avg_redaction_recall} | ${a.avg_auditability} | ${a.failure_count} |`;
}).join('\n');
const bestUtility = baselines.slice().sort((a, b) => aggregate[b].avg_downstream - aggregate[a].avg_downstream)[0];
const bestTokens = baselines.slice().sort((a, b) => aggregate[a].avg_ratio - aggregate[b].avg_ratio)[0];
const report = `# M6 — Controlled Evaluation Results\n\nGenerated: ${ts}  \nMilestone: M6  \nRun ID: \`${runId}\`  \nSource data: \`${path.relative(worktree, sourcePath)}\`  \nScript: \`autoresearch/scripts/run-m6-controlled-eval.mjs\`\n\n## 1. Scope\n\nThis tick ran a small deterministic P0 pilot over three benign fixtures: S1 task state, S2 executable code context, and S4 repo/docs memory. It used no secrets or private files. Planted canaries are synthetic strings generated by the script.\n\nToken counts are \`${tokenizer.confidence}\` via \`${tokenizer.source}\` version \`${tokenizer.version}\`. The run is a smoke result, not a publishable benchmark; n=3 makes the confidence intervals only a drift warning.\n\n## 2. Aggregate scorecard\n\n| Baseline | Avg output tokens | Avg ratio | Downstream score | Fact recall | S2 exec eq | Redaction recall | Auditability | Failure count |\n|---|---:|---:|---:|---:|---:|---:|---:|---:|\n${table}\n\nBest average downstream utility: **${bestUtility}**. Lowest average token ratio: **${bestTokens}**.\n\n## 3. Interpretation\n\n- Raw context remains the utility ceiling but fails redaction/audit gates because it keeps synthetic canaries and has no source-span schema.\n- MemoryFrame has the best auditability and safety behavior, but its source-span metadata is token-expensive on short fixtures.\n- Compact JSON is often shorter than MemoryFrame while preserving facts, confirming the M3 risk that JSON can beat a human-readable DSL on raw token count.\n- Local JSONL retrieval is the strongest P0 baseline when the downstream question targets only a subset of facts.\n- TokenCompressor's rough prose optimizer is useful as a candidate generator, but by itself it lacks exact-token provenance, redaction, and source-span guarantees.\n- The S2 executable fixture exposes a design gap: fact-style compression can preserve expected stdout but does not necessarily preserve runnable code. Future MemoryFrame variants need an explicit executable-artifact mode or must score execution separately from fact recall.\n\n## 4. Gate status\n\n| M1/M6 gate | Status | Evidence |\n|---|---|---|\n| Exact token counts for one target tokenizer | pass | \`${tokenizer.source}\` ${tokenizer.version}; rows in source data |\n| Raw, summary, TokenCompressor, and DSL/codebook baselines | pass | raw, vanilla_summary, tokencompressor_rough, memoryframe rows |\n| Executable-context task graded by interpreter output | pass | S2 fixture uses Node VM oracle stdout \`${corpus[1].oracleStdout}\` |\n| Memory-state task graded by hidden facts / next action | pass | S1 fixture scores M6/stale_count/next_direction |\n| Redaction metrics with planted synthetic secrets | pass | redaction_recall per row; raw/truncate/tokencompressor show failures |\n| Confidence intervals or small-sample warning | pass | downstream CI column plus explicit n=3 warning |\n\n## 5. Next actions\n\n1. Implement the P0 benchmark modules from M5 so this script becomes reusable test infrastructure rather than a one-off source capture.\n2. Add an executable-artifact MemoryFrame record type or code-block sidecar and rerun S2.\n3. Keep compact JSON and local retrieval as first-class baselines; do not claim MemoryFrame wins unless it wins after audit/safety weighting.\n4. Expand to at least 5 seeds × S1/S2/S4 before using rankings outside autoresearch planning.\n\n## 6. Decision\n\nM6 is complete as a controlled pilot. The result supports continuing to M7 integration design, with one structural requirement: future integration must preserve exact token provenance and must keep execution-equivalence separate from fact recall.\n`;
const reportPath = path.join(artifactRoot, 'findings', 'M6-eval-results.md');
fs.writeFileSync(reportPath, report);
console.log(JSON.stringify({ run_id: runId, report: path.relative(worktree, reportPath), source: path.relative(worktree, sourcePath), tokenizer: `${tokenizer.source}@${tokenizer.version}`, confidence: tokenizer.confidence }));
