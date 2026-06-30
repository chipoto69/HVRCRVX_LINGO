/**
 * HVRCRVX_LINGO Skill - Easy Import Entry Point
 *
 * Usage:
 *   import { HvrcrvxLingoSkill } from './src/skill/index.js';
 *   const lang = await HvrcrvxLingoSkill.forgeStealthLanguage();
 */

export {
  GlossopetraeSkill,
  GlossopetraeSkill as HvrcrvxLingoSkill,
  LanguageInterface,
  STEALTH_PRESETS,
  AGENT_TEMPLATES,
  default
} from './GlossopetraeSkill.js';
