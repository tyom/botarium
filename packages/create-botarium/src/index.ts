export { scaffold, type ScaffoldOptions, type FeatureName } from './scaffold'
export {
  BOT_TEMPLATES,
  AI_PROVIDERS,
  interpolate,
  createTemplateVars,
  isInterpolatable,
  toPascalCase,
  toPackageName,
  type BotTemplate,
  type AiProvider,
  type TemplateVars,
} from './utils/template'
export {
  validateBotName,
  validateBotNameForPrompts,
  checkTargetDirectory,
  type ValidationResult,
  type DirectoryCheck,
} from './utils/validate'
