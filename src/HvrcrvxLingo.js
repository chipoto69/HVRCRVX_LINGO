/**
 * HVRCRVX_LINGO public API alias.
 *
 * The original engine class remains in `Glossopetrae.js` for internal
 * compatibility with the existing test harnesses and historical research
 * artifacts. New integrations can import `HvrcrvxLingo` from this file.
 */

export {
  Glossopetrae as HvrcrvxLingo,
  Glossopetrae,
  PRESETS,
  LANGUAGE_ATTRIBUTES,
  DEAD_LANGUAGES,
  CodeForge,
  CodeSkin,
  AudioForge,
  EvolutionEngine,
} from './Glossopetrae.js';
