/**
 * HVRCRVX_LINGO — tokenizer_survival_v2.mjs
 *
 * Extended tokenizer survival sweep — 20+ exotic Unicode tricks beyond the
 * original 11. Hunting for new asymmetric channels between model families.
 *
 * Categories:
 *   A. Mathematical alphanumeric variants (bold, italic, script, fraktur, etc.)
 *   B. Invisible format chars (word joiner, bidi marks, invisible math operators)
 *   C. Exotic spaces (Ogham, ideographic, medium math, punctuation, figure)
 *   D. Private Use Area (BMP + supplementary)
 *   E. Braille blank + Hangul fillers
 *   F. Line/paragraph separators
 *   G. Enclosed / circled alphanumerics
 *   H. Superscript / subscript digits
 *   I. NFC→NFD normalization test
 *   J. Supplementary plane chars (musical, emoji modifier)
 *   K. Bidirectional overrides (LRO, RLO, LRI, RLI)
 *   L. Interlinear annotation anchors
 *   M. Mongolian vowel separator
 *   N. BOM / ZWNBS
 *
 * USAGE
 *   node experiments/tokenizer_survival_v2.mjs --mock
 *   node experiments/tokenizer_survival_v2.mjs --models anthropic/claude-3.5-haiku,openai/gpt-5-nano
 */

import { createClient, createMockClient, loadEnv } from './lib/client.mjs';
import { writeFileSync } from 'node:fs';

const argv = process.argv.slice(2);
const arg = (n, d) => { const i = argv.indexOf(`--${n}`); return i >= 0 && argv[i + 1] ? argv[i + 1] : d; };
const MOCK = argv.includes('--mock');
const MODELS = arg('models', 'anthropic/claude-3.5-haiku,openai/gpt-5-nano').split(',');

loadEnv();

// ─────────────────────── Unicode test vectors ───────────────────────────────

const TESTS = [

  // ═══ A. Mathematical Alphanumeric Symbols ═══
  {
    name: 'math-bold',
    desc: 'Mathematical bold (U+1D400+): \u{1D41B}\u{1D41E}\u{1D425}\u{1D425}\u{1D428} replacing hello',
    encode: () => 'the \u{1D41B}\u{1D41E}\u{1D425}\u{1D425}\u{1D428} world',
    check: (reply) => {
      const math = [...reply].filter(c => {
        const cp = c.codePointAt(0);
        return cp >= 0x1D400 && cp <= 0x1D7FF;
      }).length;
      return { survived: math, expected: 5, rate: math / 5 };
    },
  },
  {
    name: 'math-italic',
    desc: 'Mathematical italic (U+1D434+): \u{1D455}\u{1D452}\u{1D459}\u{1D459}\u{1D45C}',
    encode: () => 'the \u{1D455}\u{1D452}\u{1D459}\u{1D459}\u{1D45C} world',
    check: (reply) => {
      const math = [...reply].filter(c => {
        const cp = c.codePointAt(0);
        return cp >= 0x1D400 && cp <= 0x1D7FF;
      }).length;
      return { survived: math, expected: 5, rate: math / 5 };
    },
  },
  {
    name: 'math-script',
    desc: 'Mathematical script (U+1D4B6+): fancy cursive letters',
    encode: () => 'the \u{1D4BD}\u{1D4BE}\u{1D4C1}\u{1D4C1}\u{1D4C4} world',
    check: (reply) => {
      const math = [...reply].filter(c => {
        const cp = c.codePointAt(0);
        return cp >= 0x1D400 && cp <= 0x1D7FF;
      }).length;
      return { survived: math, expected: 5, rate: math / 5 };
    },
  },
  {
    name: 'math-fraktur',
    desc: 'Mathematical fraktur (U+1D504+): gothic letters',
    encode: () => 'the \u{1D525}\u{1D522}\u{1D529}\u{1D529}\u{1D52C} world',
    check: (reply) => {
      const math = [...reply].filter(c => {
        const cp = c.codePointAt(0);
        return cp >= 0x1D400 && cp <= 0x1D7FF;
      }).length;
      return { survived: math, expected: 5, rate: math / 5 };
    },
  },
  {
    name: 'math-monospace',
    desc: 'Mathematical monospace (U+1D670+): typewriter letters',
    encode: () => 'the \u{1D691}\u{1D68E}\u{1D695}\u{1D695}\u{1D698} world',
    check: (reply) => {
      const math = [...reply].filter(c => {
        const cp = c.codePointAt(0);
        return cp >= 0x1D400 && cp <= 0x1D7FF;
      }).length;
      return { survived: math, expected: 5, rate: math / 5 };
    },
  },
  {
    name: 'math-double-struck',
    desc: 'Mathematical double-struck (U+1D538+): blackboard bold',
    encode: () => 'the \u{1D559}\u{1D556}\u{1D55D}\u{1D55D}\u{1D560} world',
    check: (reply) => {
      const math = [...reply].filter(c => {
        const cp = c.codePointAt(0);
        return cp >= 0x1D400 && cp <= 0x1D7FF;
      }).length;
      return { survived: math, expected: 5, rate: math / 5 };
    },
  },

  // ═══ B. Invisible Format Characters ═══
  {
    name: 'word-joiner',
    desc: 'Word Joiner (U+2060) between chars',
    encode: () => 'h⁠e⁠l⁠l⁠o',
    check: (reply) => {
      const count = [...reply].filter(c => c.codePointAt(0) === 0x2060).length;
      return { survived: count, expected: 4, rate: count / 4 };
    },
  },
  {
    name: 'invisible-math-ops',
    desc: 'Invisible math operators (U+2061-U+2064)',
    encode: () => 'a⁡b⁢c⁣d⁤e',
    check: (reply) => {
      const count = [...reply].filter(c => {
        const cp = c.codePointAt(0);
        return cp >= 0x2061 && cp <= 0x2064;
      }).length;
      return { survived: count, expected: 4, rate: count / 4 };
    },
  },
  {
    name: 'ltr-rtl-marks',
    desc: 'LRM (U+200E) and RLM (U+200F) between chars',
    encode: () => 'h‎e‏l‎l‏o',
    check: (reply) => {
      const count = [...reply].filter(c => {
        const cp = c.codePointAt(0);
        return cp === 0x200E || cp === 0x200F;
      }).length;
      return { survived: count, expected: 4, rate: count / 4 };
    },
  },

  // ═══ C. Exotic Spaces ═══
  {
    name: 'ogham-space',
    desc: 'Ogham Space Mark (U+1680)',
    encode: () => 'the cat sat',
    check: (reply) => {
      const count = [...reply].filter(c => c.codePointAt(0) === 0x1680).length;
      return { survived: count, expected: 2, rate: count / 2 };
    },
  },
  {
    name: 'ideographic-space',
    desc: 'Ideographic (CJK fullwidth) Space (U+3000)',
    encode: () => 'the　cat　sat',
    check: (reply) => {
      const count = [...reply].filter(c => c.codePointAt(0) === 0x3000).length;
      return { survived: count, expected: 2, rate: count / 2 };
    },
  },
  {
    name: 'medium-math-space',
    desc: 'Medium Mathematical Space (U+205F)',
    encode: () => 'the cat sat',
    check: (reply) => {
      const count = [...reply].filter(c => c.codePointAt(0) === 0x205F).length;
      return { survived: count, expected: 2, rate: count / 2 };
    },
  },
  {
    name: 'figure-space',
    desc: 'Figure Space (U+2007) — width of a digit',
    encode: () => 'the cat sat',
    check: (reply) => {
      const count = [...reply].filter(c => c.codePointAt(0) === 0x2007).length;
      return { survived: count, expected: 2, rate: count / 2 };
    },
  },
  {
    name: 'punctuation-space',
    desc: 'Punctuation Space (U+2008)',
    encode: () => 'the cat sat',
    check: (reply) => {
      const count = [...reply].filter(c => c.codePointAt(0) === 0x2008).length;
      return { survived: count, expected: 2, rate: count / 2 };
    },
  },
  {
    name: 'hair-space',
    desc: 'Hair Space (U+200A) — thinnest visible space',
    encode: () => 'the cat sat',
    check: (reply) => {
      const count = [...reply].filter(c => c.codePointAt(0) === 0x200A).length;
      return { survived: count, expected: 2, rate: count / 2 };
    },
  },
  {
    name: 'narrow-no-break',
    desc: 'Narrow No-Break Space (U+202F)',
    encode: () => 'the cat sat',
    check: (reply) => {
      const count = [...reply].filter(c => c.codePointAt(0) === 0x202F).length;
      return { survived: count, expected: 2, rate: count / 2 };
    },
  },

  // ═══ D. Private Use Area ═══
  {
    name: 'pua-bmp',
    desc: 'BMP Private Use Area (U+E000-U+E003)',
    encode: () => 'testend',
    check: (reply) => {
      const count = [...reply].filter(c => {
        const cp = c.codePointAt(0);
        return cp >= 0xE000 && cp <= 0xF8FF;
      }).length;
      return { survived: count, expected: 4, rate: count / 4 };
    },
  },
  {
    name: 'pua-supplementary',
    desc: 'Supplementary PUA-A (U+F0000-U+F0003)',
    encode: () => 'test\u{F0000}\u{F0001}\u{F0002}\u{F0003}end',
    check: (reply) => {
      const count = [...reply].filter(c => {
        const cp = c.codePointAt(0);
        return cp >= 0xF0000 && cp <= 0xFFFFF;
      }).length;
      return { survived: count, expected: 4, rate: count / 4 };
    },
  },

  // ═══ E. Braille Blank + Hangul Fillers ═══
  {
    name: 'braille-blank',
    desc: 'Braille Pattern Blank (U+2800) — invisible braille',
    encode: () => 'h⠀e⠀l⠀l⠀o',
    check: (reply) => {
      const count = [...reply].filter(c => c.codePointAt(0) === 0x2800).length;
      return { survived: count, expected: 4, rate: count / 4 };
    },
  },
  {
    name: 'hangul-filler',
    desc: 'Hangul Filler (U+3164) — invisible Hangul',
    encode: () => 'hㅤeㅤlㅤlㅤo',
    check: (reply) => {
      const count = [...reply].filter(c => c.codePointAt(0) === 0x3164).length;
      return { survived: count, expected: 4, rate: count / 4 };
    },
  },
  {
    name: 'hangul-choseong-filler',
    desc: 'Hangul Choseong Filler (U+115F)',
    encode: () => 'hᅟeᅟlᅟlᅟo',
    check: (reply) => {
      const count = [...reply].filter(c => c.codePointAt(0) === 0x115F).length;
      return { survived: count, expected: 4, rate: count / 4 };
    },
  },

  // ═══ F. Line / Paragraph Separators ═══
  {
    name: 'line-separator',
    desc: 'Line Separator (U+2028)',
    encode: () => 'hello world',
    check: (reply) => {
      const count = [...reply].filter(c => c.codePointAt(0) === 0x2028).length;
      return { survived: count, expected: 1, rate: count / 1 };
    },
  },
  {
    name: 'paragraph-separator',
    desc: 'Paragraph Separator (U+2029)',
    encode: () => 'hello world',
    check: (reply) => {
      const count = [...reply].filter(c => c.codePointAt(0) === 0x2029).length;
      return { survived: count, expected: 1, rate: count / 1 };
    },
  },

  // ═══ G. Enclosed / Circled Alphanumerics ═══
  {
    name: 'enclosed-digits',
    desc: 'Circled digits ①②③ (U+2460-U+2473)',
    encode: () => 'steps: ① then ② then ③',
    check: (reply) => {
      const count = [...reply].filter(c => {
        const cp = c.codePointAt(0);
        return cp >= 0x2460 && cp <= 0x2473;
      }).length;
      return { survived: count, expected: 3, rate: count / 3 };
    },
  },
  {
    name: 'enclosed-letters',
    desc: 'Circled letters ⓐⓑⓒ (U+24D0-U+24E9)',
    encode: () => 'options: ⓐ ⓑ ⓒ',
    check: (reply) => {
      const count = [...reply].filter(c => {
        const cp = c.codePointAt(0);
        return cp >= 0x24D0 && cp <= 0x24E9;
      }).length;
      return { survived: count, expected: 3, rate: count / 3 };
    },
  },

  // ═══ H. Superscript / Subscript ═══
  {
    name: 'superscript',
    desc: 'Unicode superscripts ¹²³⁴⁵',
    encode: () => 'x¹²³⁴⁵',
    check: (reply) => {
      const supers = [0xB9, 0xB2, 0xB3, 0x2074, 0x2075];
      const count = [...reply].filter(c => supers.includes(c.codePointAt(0))).length;
      return { survived: count, expected: 5, rate: count / 5 };
    },
  },
  {
    name: 'subscript',
    desc: 'Unicode subscripts ₀₁₂₃₄',
    encode: () => 'H₂O and CO₂ at T₀₁₂',
    check: (reply) => {
      const subs = [0x2080, 0x2081, 0x2082, 0x2083, 0x2084];
      const count = [...reply].filter(c => subs.includes(c.codePointAt(0))).length;
      return { survived: count, expected: 5, rate: count / 5 };
    },
  },

  // ═══ I. NFC/NFD Normalization ═══
  {
    name: 'nfd-decomposed',
    desc: 'NFD decomposed é vs precomposed é',
    encode: () => 'café naïve résumé',
    check: (reply) => {
      const combining = [...reply].filter(c => {
        const cp = c.codePointAt(0);
        return cp >= 0x0300 && cp <= 0x036F;
      }).length;
      const precomposed = [...reply].filter(c => {
        const cp = c.codePointAt(0);
        return [0xE9, 0xEF, 0xE8, 0xE0, 0xFC, 0xF6].includes(cp);
      }).length;
      return {
        survived: combining, expected: 4, rate: combining / 4,
        detail: `NFD=${combining} NFC=${precomposed} (NFD→NFC=${combining === 0 && precomposed > 0 ? 'yes' : 'no'})`
      };
    },
  },

  // ═══ J. Supplementary Plane Chars ═══
  {
    name: 'musical-symbols',
    desc: 'Musical symbols \u{1D11E}\u{1D122}\u{1D160} (treble clef, etc.)',
    encode: () => 'music: \u{1D11E}\u{1D122}\u{1D160}',
    check: (reply) => {
      const count = [...reply].filter(c => {
        const cp = c.codePointAt(0);
        return cp >= 0x1D100 && cp <= 0x1D1FF;
      }).length;
      return { survived: count, expected: 3, rate: count / 3 };
    },
  },
  {
    name: 'egyptian-hieroglyphs',
    desc: 'Egyptian Hieroglyphs (U+13000+)',
    encode: () => 'ancient: \u{13000}\u{13001}\u{13002}',
    check: (reply) => {
      const count = [...reply].filter(c => {
        const cp = c.codePointAt(0);
        return cp >= 0x13000 && cp <= 0x1342F;
      }).length;
      return { survived: count, expected: 3, rate: count / 3 };
    },
  },

  // ═══ K. Bidirectional Overrides ═══
  {
    name: 'bidi-overrides',
    desc: 'LRO (U+202D) and RLO (U+202E) with PDF (U+202C)',
    encode: () => 'normal ‭forced-ltr‬ ‮forced-rtl‬ end',
    check: (reply) => {
      const bidi = [0x202D, 0x202E, 0x202C];
      const count = [...reply].filter(c => bidi.includes(c.codePointAt(0))).length;
      return { survived: count, expected: 4, rate: count / 4 };
    },
  },
  {
    name: 'bidi-isolates',
    desc: 'LRI (U+2066), RLI (U+2067), FSI (U+2068), PDI (U+2069)',
    encode: () => 'test ⁦isolated⁩ end',
    check: (reply) => {
      const iso = [0x2066, 0x2067, 0x2068, 0x2069];
      const count = [...reply].filter(c => iso.includes(c.codePointAt(0))).length;
      return { survived: count, expected: 2, rate: count / 2 };
    },
  },

  // ═══ L. Interlinear Annotation ═══
  {
    name: 'interlinear-annotation',
    desc: 'Annotation Anchor/Sep/Term (U+FFF9-U+FFFB)',
    encode: () => 'text￹annotation￺￻more',
    check: (reply) => {
      const ann = [0xFFF9, 0xFFFA, 0xFFFB];
      const count = [...reply].filter(c => ann.includes(c.codePointAt(0))).length;
      return { survived: count, expected: 3, rate: count / 3 };
    },
  },

  // ═══ M. Mongolian Vowel Separator ═══
  {
    name: 'mongolian-vs',
    desc: 'Mongolian Vowel Separator (U+180E)',
    encode: () => 'h᠎e᠎l᠎l᠎o',
    check: (reply) => {
      const count = [...reply].filter(c => c.codePointAt(0) === 0x180E).length;
      return { survived: count, expected: 4, rate: count / 4 };
    },
  },

  // ═══ N. BOM / ZWNBS ═══
  {
    name: 'bom-zwnbs',
    desc: 'Byte Order Mark / ZWNBS (U+FEFF) mid-text',
    encode: () => 'h﻿e﻿l﻿l﻿o',
    check: (reply) => {
      const count = [...reply].filter(c => c.codePointAt(0) === 0xFEFF).length;
      return { survived: count, expected: 4, rate: count / 4 };
    },
  },

  // ═══ O. Geometric / Dingbats mixed with text ═══
  {
    name: 'geometric-shapes',
    desc: 'Geometric shapes ■▲●◆ mixed with text',
    encode: () => '■cat▲dog●bird◆fish',
    check: (reply) => {
      const geo = [0x25A0, 0x25B2, 0x25CF, 0x25C6];
      const count = [...reply].filter(c => geo.includes(c.codePointAt(0))).length;
      return { survived: count, expected: 4, rate: count / 4 };
    },
  },

  // ═══ P. Control characters ═══
  {
    name: 'c1-controls',
    desc: 'C1 control chars (U+0080-U+009F) — often stripped',
    encode: () => 'testend',
    check: (reply) => {
      const count = [...reply].filter(c => {
        const cp = c.codePointAt(0);
        return cp >= 0x80 && cp <= 0x9F;
      }).length;
      return { survived: count, expected: 3, rate: count / 3 };
    },
  },
];

// ═══ O. Variation Selectors Supplement + Tag Chars + Fullwidth ═══
TESTS.push(
  {
    name: 'vs-supplement',
    desc: 'Variation Selectors Supplement VS17-VS19 (U+E0100-E0102)',
    encode: () => 'a\u{E0100}b\u{E0101}c\u{E0102}end',
    check: (reply) => {
      const count = [...reply].filter(c => {
        const cp = c.codePointAt(0);
        return cp >= 0xE0100 && cp <= 0xE01EF;
      }).length;
      return { survived: count, expected: 3, rate: count / 3 };
    },
  },
  {
    name: 'tag-chars-direct',
    desc: 'Tag Characters U+E0001,E0020,E0041,E0061 (cancel, space, A, a)',
    encode: () => 'hello\u{E0001}\u{E0020}\u{E0041}\u{E0061}world',
    check: (reply) => {
      const count = [...reply].filter(c => {
        const cp = c.codePointAt(0);
        return cp >= 0xE0000 && cp <= 0xE007F;
      }).length;
      return { survived: count, expected: 4, rate: count / 4 };
    },
  },
  {
    name: 'fullwidth-latin',
    desc: 'Fullwidth Latin letters (U+FF21-FF3A, U+FF41-FF5A)',
    encode: () => 'say ｈｅｌｌｏ there',
    check: (reply) => {
      const count = [...reply].filter(c => {
        const cp = c.codePointAt(0);
        return cp >= 0xFF00 && cp <= 0xFF5E;
      }).length;
      return { survived: count, expected: 5, rate: count / 5 };
    },
  },
  {
    name: 'cancel-tag',
    desc: 'Cancel Tag U+E007F alone (emoji tag terminator)',
    encode: () => 'test\u{E007F}end',
    check: (reply) => {
      const count = [...reply].filter(c => c.codePointAt(0) === 0xE007F).length;
      return { survived: count, expected: 1, rate: count / 1 };
    },
  },
);

const PROMPT = `EXACT ECHO TEST
Repeat the following text EXACTLY as given, character by character, including any invisible or unusual Unicode characters. Do not normalize, translate, or modify anything. Output ONLY the echoed text, nothing else.

TEXT TO ECHO:
`;

// ─────────────────────── robustness helpers (ported from v3) ─────────────────

const REPS = parseInt(arg('reps', '2'), 10);

// echo-fidelity guard: a refusal / empty / non-echo reply yields survived=0 that is
// indistinguishable from genuine stripping unless we verify the model echoed the
// visible part of the prompt. Anchor on the longest ASCII-letter run in the input.
function echoAnchor(encoded) {
  const runs = (encoded.match(/[A-Za-z]{3,}/g) || []).sort((a, b) => b.length - a.length);
  return runs[0] || null;
}
function clampCheck(check) {
  const survived = Math.min(check.survived, check.expected);
  return { ...check, survived, rate: check.expected > 0 ? Math.min(1, survived / check.expected) : 0 };
}

// ─────────────────────── main ───────────────────────────────────────────────

async function main() {
  const clients = {};
  if (MOCK) {
    for (const m of MODELS) {
      clients[m] = createMockClient((prompt) => {
        const match = prompt.match(/TEXT TO ECHO:\n(.+)/s);
        return match ? match[1].trim() : '';
      });
    }
  } else {
    for (const m of MODELS) {
      clients[m] = createClient(m, { concurrency: 4 });
    }
  }

  console.log(`\n${'═'.repeat(78)}`);
  console.log(`  TOKENIZER SURVIVAL SWEEP v2 — Extended Unicode`);
  console.log(`  models: ${MODELS.join(', ')}${MOCK ? ' (MOCK)' : ''}`);
  console.log(`  tests: ${TESTS.length}  reps: ${REPS}`);
  console.log(`${'═'.repeat(78)}\n`);

  const results = {};

  for (const test of TESTS) {
    const encoded = test.encode();
    const anchor = echoAnchor(encoded);
    process.stdout.write(`  ${test.name.padEnd(26)} `);

    const modelResults = {};
    for (const m of MODELS) {
      const shortName = m.split('/').pop();
      const reps = [];
      let errors = 0;
      for (let i = 0; i < REPS; i++) {
        try {
          const reply = await clients[m].call(PROMPT + encoded);
          const check = clampCheck(test.check(reply));
          const echoed = anchor ? reply.toLowerCase().includes(anchor.toLowerCase()) : null;
          const emptyReply = reply.trim().length === 0;
          reps.push({
            survived: check.survived, expected: check.expected, rate: check.rate,
            detail: check.detail,
            suspectNonEcho: echoed === false || emptyReply,
            replyLen: reply.length,
          });
        } catch (err) {
          errors++;
          reps.push({ status: 'error', error: err.message, rate: null });
        }
      }
      const valid = reps.filter(r => r.rate != null && !r.suspectNonEcho);
      const suspect = reps.filter(r => r.suspectNonEcho).length;
      const meanRate = valid.length ? valid.reduce((s, r) => s + r.rate, 0) / valid.length : null;
      const expected = reps.find(r => r.expected != null)?.expected ?? null;
      modelResults[m] = { rate: meanRate, expected, validReps: valid.length, errors, suspectNonEcho: suspect, reps };
      const sym = meanRate == null ? '∅' : meanRate >= 0.9 ? '✓' : meanRate > 0 ? '·' : '✗';
      const tag = meanRate == null ? (errors === REPS ? 'ERR' : 'NOECHO') : `${Math.round(meanRate * 100)}%`;
      process.stdout.write(`${shortName}=${sym}(${tag}) `);
    }
    console.log();
    results[test.name] = { desc: test.desc, anchor, models: modelResults };
  }

  // ─── summary matrix ───
  console.log(`\n  ${'─'.repeat(70)}`);
  console.log(`  SURVIVAL MATRIX\n`);

  const header = '  ' + 'encoding'.padEnd(26) + MODELS.map(m => m.split('/').pop().padEnd(18)).join('');
  console.log(header);
  console.log('  ' + '─'.repeat(header.length));

  for (const test of TESTS) {
    const r = results[test.name];
    let line = '  ' + test.name.padEnd(26);
    for (const m of MODELS) {
      const mr = r.models[m];
      if (!mr || mr.rate == null) {
        line += '∅ —'.padEnd(18);
      } else {
        const pctStr = Math.round(mr.rate * 100) + '%';
        const sym = mr.rate >= 0.9 ? '✓ ' : mr.rate > 0 ? '· ' : '✗ ';
        line += (sym + pctStr).padEnd(18);
      }
    }
    console.log(line);
  }

  // ─── asymmetric channels — ALL model pairs (was: only models[0] vs [1]) ───
  // The old `const [a,b] = rates` compared only the first two models, so a 5-model
  // run reported 0 asymmetries (it only checked models[0] vs [1]). This is the root
  // of the "the complete run reports zero" confusion. Now we enumerate every pair,
  // and a null (unmeasured) cell is skipped rather than coerced to 0.
  console.log(`\n  ASYMMETRIC CHANNELS (measured cells only, all pairs):`);
  let asymCount = 0;
  const asymmetric = [];
  for (const test of TESTS) {
    const r = results[test.name];
    for (let i = 0; i < MODELS.length; i++) {
      for (let j = i + 1; j < MODELS.length; j++) {
        const a = r.models[MODELS[i]]?.rate;
        const b = r.models[MODELS[j]]?.rate;
        if (a == null || b == null) continue;
        if ((a >= 0.75 && b < 0.25) || (b >= 0.75 && a < 0.25)) {
          const aName = MODELS[i].split('/').pop();
          const bName = MODELS[j].split('/').pop();
          const dir = a > b ? `${aName} ✓ / ${bName} ✗` : `${bName} ✓ / ${aName} ✗`;
          console.log(`    ⚡ ${test.name}: ${dir}  (${Math.round(a*100)}% vs ${Math.round(b*100)}%)`);
          asymmetric.push({
            name: test.name, desc: test.desc,
            survivesOn: a > b ? MODELS[i] : MODELS[j],
            strippedOn: a > b ? MODELS[j] : MODELS[i],
            rates: { [MODELS[i]]: a, [MODELS[j]]: b },
          });
          asymCount++;
        }
      }
    }
  }
  if (asymCount === 0) console.log('    (none found)');

  // ─── symmetric survivors (measured cells only) ───
  console.log(`\n  SYMMETRIC SURVIVORS (all measured models preserve):`);
  let symCount = 0;
  for (const test of TESTS) {
    const r = results[test.name];
    const rates = MODELS.map(m => r.models[m]?.rate).filter(x => x != null);
    if (rates.length && rates.every(x => x >= 0.75)) {
      const rateStr = MODELS.map(m => `${m.split('/').pop()}=${r.models[m]?.rate == null ? '∅' : Math.round(r.models[m].rate * 100) + '%'}`).join(', ');
      console.log(`    ✔ ${test.name}: ${rateStr}`);
      symCount++;
    }
  }
  if (symCount === 0) console.log('    (none)');

  // ─── per-model tally (the numbers Table 1 is built from) ───
  console.log(`\n  PER-MODEL TALLY (blind = measured rate 0; ∅ = unmeasured, excluded):`);
  const tally = {};
  for (const m of MODELS) {
    let blind = 0, partial = 0, clean = 0, unmeasured = 0;
    for (const test of TESTS) {
      const rate = results[test.name].models[m]?.rate;
      if (rate == null) unmeasured++;
      else if (rate === 0) blind++;
      else if (rate >= 0.999) clean++;
      else partial++;
    }
    tally[m] = { blind, partial, clean, unmeasured };
    console.log(`    ${m.split('/').pop().padEnd(22)} blind=${blind} partial=${partial} clean=${clean} unmeasured=${unmeasured}`);
  }

  console.log(`\n  TOTALS: ${TESTS.length} tests × ${REPS} reps, ${asymCount} asymmetric channel(s)\n`);

  // ─── save results ───
  const outPath = `experiments/results/tokenizer_survival_v2_${MODELS.map(m => m.split('/').pop()).join('+')}.json`;
  const outData = {
    study: 'tokenizer-survival-v2',
    models: MODELS,
    reps: REPS,
    tests: TESTS.length,
    results,
    tally,
    asymmetric,
  };
  writeFileSync(outPath, JSON.stringify(outData, null, 2));
  console.log(`  Results → ${outPath}\n`);
}

main().catch(err => { console.error(err); process.exit(1); });
