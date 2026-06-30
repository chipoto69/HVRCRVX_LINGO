# HVRCRVX_LINGO — Partner Development Quickstart

HVRCRVX_LINGO is a zero-dependency static/Node research sandbox for procedural xenolinguistics: generated languages, translation/acquisition tests, divergence experiments, and covert-channel harnesses.

## Requirements

- Node.js 18+
- Python 3 (only for a quick local static server)
- Optional: `.env.local` with `OPENROUTER_API_KEY=...` for live model experiments

## Clone

```bash
git clone https://github.com/chipoto69/HVRCRVX_LINGO.git
cd HVRCRVX_LINGO
```

## Test

```bash
npm test
```

This runs the partner-safe Tier A suite:

- `test-smoke-edge-cases.mjs`
- `test-bench-integrity.mjs`
- `test-enthusiast.mjs`

`test-bench-integrity.mjs` can take about five minutes on this machine. If you wrap it in your own runner, allow at least 900 seconds.

## Local UI

```bash
python3 -m http.server 8754 --bind 127.0.0.1
```

Open:

- Engine UI: http://127.0.0.1:8754/index.html
- Article/read page: http://127.0.0.1:8754/read.html
- Paper: http://127.0.0.1:8754/PAPER.html
- Launch page: http://127.0.0.1:8754/launch.html

## API imports

New integrations can use the rebranded aliases:

```js
import { HvrcrvxLingo } from './src/HvrcrvxLingo.js';
import { HvrcrvxLingoSkill } from './src/skill/HvrcrvxLingoSkill.js';

const lang = HvrcrvxLingo.quick(42);
console.log(lang.translate('Hello world'));

const stealth = await HvrcrvxLingoSkill.forgeStealthLanguage('covert');
```

Legacy `Glossopetrae` / `GlossopetraeSkill` exports remain in place for internal compatibility with the existing tests and research artifacts.

## Live model experiments

Most files under `experiments/` call external model APIs. Do not run them unless `.env.local` is configured. Mock-safe example:

```bash
node experiments/tokenizer_survival_v2.mjs --mock --reps 1
```

## License and provenance

The project is distributed under AGPL-3.0. Keep `LICENSE` with any redistribution or partner handoff.
