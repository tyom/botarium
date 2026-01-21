/**
 * Electron entry point for Botarium
 * In dev mode: spawns Bun with TypeScript backend
 * In production: spawns compiled backend binary
 */

import {
  app,
  BrowserWindow,
  ipcMain,
  safeStorage,
  screen,
  dialog,
  Menu,
} from 'electron'
import { omit } from 'es-toolkit'
import path from 'path'
import fs from 'fs'
import net from 'net'
import { spawn } from 'child_process'
import { fileURLToPath } from 'url'
import {
  electronLogger,
  backendLogger,
  emulatorProcLogger,
  botProcLogger,
} from './electron-logger.js'
import {
  getModelTiers,
  clearModelCache,
  validateApiKey,
} from './model-fetcher.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Emulator configuration
const EMULATOR_PORT = 7557
const EMULATOR_URL = `http://localhost:${EMULATOR_PORT}`

// Check if running from bundled dist/electron.cjs (packaged) vs electron.js (dev)
const isRunningFromDist =
  __filename.endsWith('.cjs') || __dirname.endsWith('dist')

// Set app name for consistent userData path (~/Library/Application Support/Botarium/)
// This must be set before any app.getPath() calls
app.setName('Botarium')

// Disable Autofill feature to suppress DevTools protocol errors
app.commandLine.appendSwitch('disable-features', 'AutofillServerCommunication')

let mainWindow = null
let emulatorProcess = null
let botProcesses = new Map() // Map<botName, { process }>
let logsPanelChecked = false

// Paths - adjust based on whether running from root (dev) or dist folder (bundled)
const useDevServer = process.env.VITE_DEV === '1'

// In dev mode, web app is at ../ui/dist, in packaged mode it's at dist/
const webAppDir = isRunningFromDist
  ? __dirname
  : path.join(__dirname, '..', 'ui', 'dist')
const builtFile = path.join(webAppDir, 'index.html')
const preloadPath = isRunningFromDist
  ? path.join(__dirname, 'preload.cjs')
  : path.join(__dirname, 'dist', 'preload.cjs')
const settingsPath = path.join(app.getPath('userData'), 'settings.json')
// Assets are at root level in both dev and packaged app
const assetsDir = isRunningFromDist
  ? path.join(__dirname, '..', 'assets')
  : path.join(__dirname, 'assets')
const iconPath = path.join(
  assetsDir,
  app.isPackaged ? 'icon.png' : 'icon-dev.png'
)

/**
 * Get sensitive fields to encrypt from schema or naming convention
 * @param {Record<string, unknown>} settings
 * @returns {string[]}
 */
function getSensitiveFields(settings) {
  const schema = settings._schema?.settings || {}

  // Get fields marked as secret in schema
  const sensitiveFromSchema = Object.entries(schema)
    .filter(([, s]) => s.type === 'secret')
    .map(([key]) => key)

  // Fallback: naming convention for fields not in schema
  const sensitiveByConvention = Object.keys(settings).filter(
    (k) =>
      !k.startsWith('_') &&
      (k.endsWith('_key') || k.endsWith('_token') || k.endsWith('_secret'))
  )

  return [...new Set([...sensitiveFromSchema, ...sensitiveByConvention])]
}

// Path to persist keychain explanation state (so we only show it once after install)
const keychainExplainedPath = path.join(
  app.getPath('userData'),
  '.keychain-explained'
)

// Check if we've already shown the keychain explanation
function hasShownKeychainExplanation() {
  try {
    return fs.existsSync(keychainExplainedPath)
  } catch {
    return false
  }
}

// Mark that we've shown the keychain explanation
function markKeychainExplanationShown() {
  try {
    fs.mkdirSync(path.dirname(keychainExplainedPath), { recursive: true })
    fs.writeFileSync(keychainExplainedPath, new Date().toISOString())
  } catch (err) {
    electronLogger.warn({ err }, 'Failed to save keychain explanation state')
  }
}

// Show explanation before keychain prompt appears (only in packaged app, only once)
function showKeychainExplanation() {
  if (!app.isPackaged || hasShownKeychainExplanation()) return

  dialog.showMessageBoxSync({
    type: 'info',
    title: 'Keychain Access Required',
    message: 'Botarium uses macOS Keychain to securely store your API keys.',
    detail:
      'You may see a system prompt asking for your password. This is normal and ensures your credentials are encrypted.\n\nClick "Always Allow" to avoid this prompt in the future.',
    buttons: ['OK'],
  })

  markKeychainExplanationShown()
}

// Encrypt sensitive fields using OS keychain
function encryptSensitiveFields(settings) {
  if (!safeStorage.isEncryptionAvailable()) {
    electronLogger.warn('Encryption not available, storing in plain text')
    return settings
  }

  const encrypted = { ...settings }
  const sensitiveFields = getSensitiveFields(settings)

  for (const field of sensitiveFields) {
    if (encrypted[field] && typeof encrypted[field] === 'string') {
      const buffer = safeStorage.encryptString(encrypted[field])
      encrypted[field] = buffer.toString('base64')
      encrypted[`${field}_encrypted`] = true
    }
  }
  return encrypted
}

// Decrypt sensitive fields
function decryptSensitiveFields(settings) {
  if (!settings) return null

  // Find all fields that have been encrypted (marked with _encrypted suffix)
  const encryptedFields = Object.keys(settings)
    .filter((k) => k.endsWith('_encrypted') && settings[k] === true)
    .map((k) => k.replace('_encrypted', ''))

  // Show explanation dialog before keychain prompt
  if (encryptedFields.length > 0) {
    showKeychainExplanation()
  }

  const decrypted = { ...settings }
  for (const field of encryptedFields) {
    if (decrypted[field]) {
      try {
        const buffer = Buffer.from(decrypted[field], 'base64')
        decrypted[field] = safeStorage.decryptString(buffer)
        delete decrypted[`${field}_encrypted`]
      } catch (err) {
        electronLogger.error({ err, field }, 'Failed to decrypt field')
        decrypted[field] = ''
      }
    }
  }
  return decrypted
}

/**
 * Find an available port by letting the OS assign one
 * Returns a Promise that resolves to an available port number
 */
function findAvailablePort() {
  return new Promise((resolve, reject) => {
    const server = net.createServer()
    server.unref()
    server.on('error', reject)
    server.listen(0, '127.0.0.1', () => {
      const address = server.address()
      const port = address.port
      server.close(() => resolve(port))
    })
  })
}

// Get emulator configuration for dev vs production
function getEmulatorConfig() {
  if (useDevServer) {
    // Dev mode: run the Slack plugin's server directly
    // The server/index.ts has `if (import.meta.main)` to run when executed directly
    const slackPackageDir = path.join(
      __dirname,
      '..',
      '..',
      'packages',
      'slack'
    )
    return {
      type: 'bun',
      bunPath: 'bun',
      script: path.join(slackPackageDir, 'src', 'server', 'index.ts'),
      cwd: slackPackageDir,
    }
  }

  // Production: use compiled binary
  const binaryName =
    process.platform === 'win32' ? 'slack-emulator.exe' : 'slack-emulator'
  const isPackaged = app.isPackaged
  const bundledBinary = isPackaged
    ? path.join(process.resourcesPath, binaryName)
    : path.join(__dirname, 'dist', binaryName)

  return {
    type: 'binary',
    path: bundledBinary,
  }
}

/**
 * Read bot manifest from dist/bots/manifest.json (generated by compile-bots.ts)
 * Returns array of { name, entry } objects
 */
function readBotsManifest() {
  const manifestPath = app.isPackaged
    ? path.join(process.resourcesPath, 'bots', 'manifest.json')
    : path.join(__dirname, 'dist', 'bots', 'manifest.json')

  if (!fs.existsSync(manifestPath)) {
    electronLogger.info('No bots manifest found - running in discovery mode')
    return []
  }

  try {
    const content = fs.readFileSync(manifestPath, 'utf-8')
    const manifest = JSON.parse(content)
    return manifest.bots ?? []
  } catch (err) {
    electronLogger.error({ err }, 'Failed to read bots manifest')
    return []
  }
}

/**
 * Get bot configurations for starting
 * Reads from manifest.json generated by compile-bots.ts
 * Returns configs for compiled binaries
 */
function getBotConfigs() {
  const botsManifest = readBotsManifest()
  const isPackaged = app.isPackaged

  electronLogger.info({ botsManifest, isPackaged }, 'getBotConfigs called')

  if (botsManifest.length === 0) {
    electronLogger.info('No bots in manifest')
    return []
  }

  // Use compiled binaries from manifest
  const botsDir = isPackaged
    ? path.join(process.resourcesPath, 'bots')
    : path.join(__dirname, 'dist', 'bots')

  return botsManifest
    .map((bot) => {
      const binaryPath = path.join(botsDir, bot.name)
      return {
        type: 'binary',
        path: binaryPath,
        name: bot.name,
      }
    })
    .filter((config) => fs.existsSync(config.path))
}

// Settings management
function loadSettings() {
  electronLogger.debug({ settingsPath }, 'Loading settings')
  try {
    if (fs.existsSync(settingsPath)) {
      const data = fs.readFileSync(settingsPath, 'utf-8')
      const settings = JSON.parse(data)
      electronLogger.debug(
        { keys: Object.keys(settings).filter((k) => !k.startsWith('_')) },
        'Settings loaded from file'
      )
      const decrypted = decryptSensitiveFields(settings)
      // Log which fields were decrypted (without values)
      const decryptedFields = Object.keys(settings).filter(
        (k) => k.endsWith('_encrypted') && settings[k] === true
      )
      electronLogger.debug({ decryptedFields }, 'Decrypted sensitive fields')
      return decrypted
    }
    electronLogger.debug('No settings file found')
  } catch (err) {
    electronLogger.error({ err }, 'Failed to load settings')
  }
  return null
}

function saveSettings(settings) {
  electronLogger.debug(
    {
      settingsPath,
      keys: Object.keys(settings).filter((k) => !k.startsWith('_')),
    },
    'Saving settings'
  )
  try {
    fs.mkdirSync(path.dirname(settingsPath), { recursive: true })
    const encrypted = encryptSensitiveFields(settings)
    // Log which fields were encrypted (without values)
    const encryptedFields = Object.keys(encrypted).filter(
      (k) => k.endsWith('_encrypted') && encrypted[k] === true
    )
    electronLogger.debug({ encryptedFields }, 'Encrypted sensitive fields')
    fs.writeFileSync(settingsPath, JSON.stringify(encrypted, null, 2))
    electronLogger.info('Settings saved successfully')
  } catch (err) {
    electronLogger.error({ err }, 'Failed to save settings')
    throw err
  }
}

// Default models per provider (used when model_default isn't explicitly set)
// These should match the first model in each tier from the UI's MODEL_TIERS
const DEFAULT_MODELS = {
  openai: 'gpt-4o',
  anthropic: 'claude-sonnet-4-5',
  google: 'gemini-2.0-flash',
  openrouter: 'anthropic/claude-sonnet-4', // Valid OpenRouter model ID
}

// Convert settings to environment variables
function settingsToEnv(settings) {
  // Use app's userData folder for writable storage (not the read-only app bundle)
  const dataDir = path.join(app.getPath('userData'), 'data')

  // Track all vars injected by the emulator (from UI settings, not user's .env file)
  // This allows bots to distinguish between UI-derived env vars and actual .env overrides
  const injectedVars = []

  const env = {
    SLACK_API_URL: `http://localhost:${EMULATOR_PORT}/api`,
    DATA_DIR: dataDir,
  }

  // Don't merge bot-specific settings into global env
  // Bot-specific settings should only apply to their specific bot
  const flatSettings = { ...settings }
  delete flatSettings.app_settings

  // Fields that should never be in global env - they're bot-specific
  const NON_GLOBAL_FIELDS = new Set(['bot_name', 'bot_personality'])

  // Convert all settings to env vars using convention: snake_case -> UPPER_SNAKE_CASE
  for (const [key, value] of Object.entries(flatSettings)) {
    if (key.startsWith('_')) continue // Skip internal fields like _schema
    if (NON_GLOBAL_FIELDS.has(key)) continue // Skip bot-specific fields
    if (value === undefined || value === null || value === '') continue
    if (typeof value !== 'string' && typeof value !== 'number') continue

    // Convert snake_case to UPPER_SNAKE_CASE
    const envKey = key.toUpperCase()
    env[envKey] = String(value)
    injectedVars.push(envKey)
  }

  // Special handling: set provider-specific API key env var
  // Bots expect OPENAI_API_KEY, ANTHROPIC_API_KEY, GOOGLE_API_KEY, or OPENROUTER_API_KEY
  const provider = flatSettings.ai_provider
  const apiKey = flatSettings[`${provider}_api_key`]
  if (apiKey) {
    const keyMap = {
      openai: 'OPENAI_API_KEY',
      anthropic: 'ANTHROPIC_API_KEY',
      google: 'GOOGLE_API_KEY',
      openrouter: 'OPENROUTER_API_KEY',
    }
    if (keyMap[provider]) {
      env[keyMap[provider]] = apiKey
      injectedVars.push(keyMap[provider])
    }
  }

  // Check if a model ID is compatible with the selected provider
  // OpenRouter uses "org/model" format, others use simple names
  const isModelCompatibleWithProvider = (modelId, prov) => {
    if (!modelId || !prov) return false
    const hasSlash = modelId.includes('/')
    // OpenRouter models contain "/", other providers don't
    return prov === 'openrouter' ? hasSlash : !hasSlash
  }

  // Reset model to provider default if not set or incompatible with current provider
  // This handles the case where user switches providers (e.g., OpenRouter → OpenAI)
  // and the old model ID format is incompatible with the new provider
  if (provider && DEFAULT_MODELS[provider]) {
    if (!env.MODEL_DEFAULT || !isModelCompatibleWithProvider(env.MODEL_DEFAULT, provider)) {
      env.MODEL_DEFAULT = DEFAULT_MODELS[provider]
      // MODEL_DEFAULT might already be in injectedVars if it came from settings
      if (!injectedVars.includes('MODEL_DEFAULT')) {
        injectedVars.push('MODEL_DEFAULT')
      }
    }
    // Apply same logic to MODEL_FAST and MODEL_THINKING for consistency
    if (env.MODEL_FAST && !isModelCompatibleWithProvider(env.MODEL_FAST, provider)) {
      delete env.MODEL_FAST // Let the bot use its default
    }
    if (env.MODEL_THINKING && !isModelCompatibleWithProvider(env.MODEL_THINKING, provider)) {
      delete env.MODEL_THINKING // Let the bot use its default
    }
  }

  // Pass the list of injected vars to the bot so it can exclude them from envOverrides
  if (injectedVars.length > 0) {
    env._EMULATOR_INJECTED_VARS = injectedVars.join(',')
  }

  return env
}

// Forward a log entry to the emulator's log stream
async function forwardLogToEmulator(log) {
  try {
    await fetch(`${EMULATOR_URL}/api/simulator/logs`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(log),
    })
  } catch {
    // Emulator not ready yet, ignore
  }
}

// Parse a log line - expects JSON from bot, falls back to text parsing for SDK logs
// Returns { level, module, msg, raw } or null
function parseLogLine(line, label) {
  // Try JSON first (bot logs in simulator mode)
  try {
    const log = JSON.parse(line)
    if (typeof log.level === 'number' && typeof log.time === 'number') {
      return {
        level: log.level,
        module: log.module || label,
        msg: log.msg || '',
        raw: log,
      }
    }
  } catch {
    // Not JSON
  }

  // Fallback: Slack SDK debug logs like "[DEBUG]  web-api:WebClient:0 ..."
  const match = line.match(/^\[(DEBUG|INFO|WARN|ERROR)\]\s+(.+)$/)
  if (match) {
    const [, levelStr, msg] = match
    const levelMap = { DEBUG: 20, INFO: 30, WARN: 40, ERROR: 50 }
    return {
      level: levelMap[levelStr] || 20,
      module: 'SlackSDK',
      msg: msg,
      raw: null,
    }
  }

  return null
}

// Log to console at appropriate level
function logAtLevel(procLogger, parsed, rawLine) {
  if (!parsed) {
    // Unknown format, log as debug
    procLogger.debug(rawLine)
    return
  }

  const childLogger = procLogger.child({ module: parsed.module })

  // Extract extra fields from raw log (exclude standard pino fields)
  const extras = parsed.raw
    ? omit(parsed.raw, ['level', 'time', 'msg', 'module', 'pid', 'hostname'])
    : {}

  // Log at appropriate level with extras
  if (parsed.level >= 50) {
    childLogger.error(extras, parsed.msg)
  } else if (parsed.level >= 40) {
    childLogger.warn(extras, parsed.msg)
  } else if (parsed.level >= 30) {
    childLogger.info(extras, parsed.msg)
  } else {
    childLogger.debug(extras, parsed.msg)
  }
}

// Spawn a process with common configuration
function spawnProcess(config, env, label, forwardLogs = false) {
  let proc
  let exited = false

  const procLogger = label === 'Emulator' ? emulatorProcLogger : botProcLogger

  // Exclude TERM_PROGRAM from child env so bot uses JSON output (not pretty-print)
  // This ensures parseLogLine() can parse the output correctly
  const childEnv = omit(process.env, ['TERM_PROGRAM'])

  if (config.type === 'bun') {
    procLogger.info(`Starting (dev): ${config.bunPath} ${config.script}`)
    proc = spawn(config.bunPath, ['run', config.script], {
      env: { ...childEnv, ...env },
      stdio: ['ignore', 'pipe', 'pipe'],
      cwd: config.cwd,
    })
  } else {
    procLogger.info(`Starting (prod): ${config.path}`)
    proc = spawn(config.path, [], {
      env: { ...childEnv, ...env },
      stdio: ['ignore', 'pipe', 'pipe'],
    })
  }

  // Track when process exits to avoid EPIPE errors
  proc.on('exit', () => {
    exited = true
  })

  // Handle stdout/stderr with error protection (prevents EPIPE crashes on shutdown)
  proc.stdout.on('data', (data) => {
    if (!exited) {
      try {
        const output = data.toString().trim()
        // Split by newlines in case multiple logs arrive at once
        const lines = output.split('\n')
        for (const line of lines) {
          if (line.trim()) {
            const parsed = parseLogLine(line.trim(), label)
            // Log at appropriate level based on parsed log level
            logAtLevel(procLogger, parsed, line.trim())
            // Forward JSON logs to emulator if enabled
            if (forwardLogs && parsed?.raw) {
              forwardLogToEmulator(parsed.raw)
            }
          }
        }
      } catch {
        // Ignore write errors during shutdown
      }
    }
  })

  proc.stderr.on('data', (data) => {
    if (!exited) {
      try {
        const output = data.toString().trim()
        const lines = output.split('\n')
        for (const line of lines) {
          if (line.trim()) {
            const parsed = parseLogLine(line.trim(), label)
            // Log at appropriate level (default to error for stderr)
            if (parsed) {
              logAtLevel(procLogger, parsed, line.trim())
            } else {
              procLogger.error(line.trim())
            }
            // Forward JSON logs to emulator if enabled
            if (forwardLogs && parsed?.raw) {
              forwardLogToEmulator(parsed.raw)
            }
          }
        }
      } catch {
        // Ignore write errors during shutdown
      }
    }
  })

  // Ignore stream errors (e.g., EPIPE when process exits)
  proc.stdout.on('error', () => {})
  proc.stderr.on('error', () => {})

  return proc
}

// Start a single bot process
function startBotProcess(botConfig, settingsEnv, botName, botPort) {
  const botEnv = { ...settingsEnv, PORT: String(botPort) }
  const proc = spawnProcess(botConfig, botEnv, `Bot:${botName}`, true)

  proc.on('error', (err) => {
    botProcLogger.error({ err, bot: botName }, 'Failed to start bot')
    if (mainWindow) {
      mainWindow.webContents.send(
        'backend:error',
        `Bot ${botName} error: ${err.message}`
      )
    }
  })

  proc.on('exit', (code, signal) => {
    botProcLogger.info(
      { bot: botName },
      `Exited: code=${code}, signal=${signal}`
    )
    botProcesses.delete(botName)
    if (code !== 0 && mainWindow) {
      mainWindow.webContents.send(
        'backend:error',
        `Bot ${botName} exited with code ${code}`
      )
    }
  })

  botProcesses.set(botName, { process: proc })
  return proc
}

// Backend process management - starts emulator then bots
async function startBackend(settings) {
  if (emulatorProcess || botProcesses.size > 0) {
    backendLogger.info('Backend already running')
    return
  }

  const settingsEnv = settingsToEnv(settings)
  const dataDir = path.join(app.getPath('userData'), 'data')

  // 1. Start emulator first
  const emulatorConfig = getEmulatorConfig()
  emulatorProcess = spawnProcess(
    emulatorConfig,
    { PORT: String(EMULATOR_PORT), DATA_DIR: dataDir },
    'Emulator'
  )

  emulatorProcess.on('error', (err) => {
    emulatorProcLogger.error({ err }, 'Failed to start emulator')
    if (mainWindow) {
      mainWindow.webContents.send(
        'backend:error',
        `Emulator error: ${err.message}`
      )
    }
  })

  emulatorProcess.on('exit', (code, signal) => {
    emulatorProcLogger.info(`Exited: code=${code}, signal=${signal}`)
    emulatorProcess = null
    if (code !== 0 && mainWindow) {
      mainWindow.webContents.send(
        'backend:error',
        `Emulator exited with code ${code}`
      )
    }
  })

  // Wait for emulator to be ready
  const emulatorReady = await waitForHealth(`${EMULATOR_URL}/health`)
  if (!emulatorReady) {
    emulatorProcLogger.error('Failed to start')
    if (emulatorProcess) {
      try {
        emulatorProcess.kill('SIGTERM')
      } catch {
        // Process might already be dead
      }
      emulatorProcess = null
    }
    return
  }
  emulatorProcLogger.info('Ready')

  // Push global settings to emulator so external bots can receive them on registration
  // Include app_settings so emulator can return bot-specific settings on registration
  try {
    const settingsPayload = {
      ...settingsEnv,
      _app_settings: settings.app_settings || {},
    }
    await fetch(`${EMULATOR_URL}/api/simulator/settings`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(settingsPayload),
    })
    electronLogger.debug('Pushed settings to emulator')
  } catch (err) {
    electronLogger.warn({ err }, 'Failed to push settings to emulator')
  }

  // 2. Start bots from bots.yaml configuration
  const botConfigs = getBotConfigs()
  const startedBots = botConfigs.map((b) => b.name)

  if (botConfigs.length > 0) {
    botProcLogger.info(`Starting ${botConfigs.length} bot(s) from bots.yaml`)
    for (const config of botConfigs) {
      // Find an available port for this bot
      const botPort = await findAvailablePort()
      botProcLogger.info(
        { bot: config.name, type: config.type, port: botPort },
        `Starting bot: ${config.name}`
      )
      startBotProcess(config, settingsEnv, config.name, botPort)
    }
  } else {
    botProcLogger.info(
      'No bots configured in bots.yaml - running in discovery mode'
    )
  }

  // Wait for at least one bot to connect (if we started any)
  if (botProcesses.size > 0) {
    const botConnected = await waitForBotConnection()
    if (botConnected) {
      botProcLogger.info('Bot(s) connected')
    } else {
      botProcLogger.warn('Bot(s) did not connect, but continuing anyway')
    }
  }

  // Always send ready - discovery mode allows external bots to connect
  if (mainWindow) {
    mainWindow.webContents.send('backend:ready', {
      startedBots,
      discoveryEnabled: true,
    })
  }
}

// Stop a single process
function stopProcess(proc, label) {
  return new Promise((resolve) => {
    if (!proc) {
      resolve()
      return
    }

    const procLogger = label === 'Emulator' ? emulatorProcLogger : botProcLogger
    proc.once('exit', () => {
      procLogger.info('Stopped')
      resolve()
    })

    try {
      proc.kill('SIGTERM')
    } catch {
      // Process might already be dead
      resolve()
    }

    // Force kill after timeout if still running
    setTimeout(() => {
      try {
        proc.kill('SIGKILL')
      } catch {
        // Already dead
      }
      resolve()
    }, 2000)
  })
}

async function stopBackend() {
  backendLogger.info('Stopping backend processes...')
  const promises = []

  // Stop all bot processes
  for (const [botName, { process: proc }] of botProcesses) {
    promises.push(stopProcess(proc, `Bot:${botName}`))
  }
  botProcesses.clear()

  if (emulatorProcess) {
    const proc = emulatorProcess
    emulatorProcess = null
    promises.push(stopProcess(proc, 'Emulator'))
  }

  await Promise.all(promises)
  backendLogger.info('All backend processes stopped')
}

// Generic health check with retries
async function waitForHealth(url, retries = 30, delay = 500) {
  for (let i = 0; i < retries; i++) {
    try {
      const response = await fetch(url)
      if (response.ok) {
        return true
      }
    } catch {
      // Not ready yet
    }
    await new Promise((r) => setTimeout(r, delay))
  }
  backendLogger.error(`Health check failed after ${retries * delay}ms: ${url}`)
  if (mainWindow) {
    mainWindow.webContents.send('backend:error', 'Backend failed to start')
  }
  return false
}

// Wait for bot to connect to emulator
async function waitForBotConnection(retries = 20, delay = 500) {
  for (let i = 0; i < retries; i++) {
    try {
      const response = await fetch(`${EMULATOR_URL}/health`)
      if (response.ok) {
        const data = await response.json()
        if (data.connected_bots > 0) {
          return true
        }
      }
    } catch {
      // Not ready yet
    }
    await new Promise((r) => setTimeout(r, delay))
  }
  botProcLogger.warn('Connection timeout - continuing anyway')
  return false
}

// IPC Handlers
function setupIpcHandlers() {
  ipcMain.handle('settings:load', () => {
    electronLogger.debug('IPC: settings:load called')
    const settings = loadSettings()
    electronLogger.debug(
      { hasSettings: !!settings, hasApiKey: !!settings?.openai_api_key },
      'IPC: settings:load returning'
    )
    return settings
  })

  ipcMain.handle('settings:save', async (_event, settings) => {
    electronLogger.debug(
      { hasApiKey: !!settings?.openai_api_key },
      'IPC: settings:save called'
    )

    // Check if API keys changed and clear model cache
    const oldSettings = loadSettings() || {}
    const apiKeyFields = [
      'openai_api_key',
      'anthropic_api_key',
      'google_api_key',
      'openrouter_api_key',
    ]
    for (const field of apiKeyFields) {
      if (oldSettings[field] !== settings[field]) {
        const provider = field.replace('_api_key', '')
        clearModelCache(provider)
        electronLogger.debug(
          { provider },
          'Cleared model cache due to API key change'
        )
      }
    }

    saveSettings(settings)
    // Restart backend with new settings
    await stopBackend()
    await startBackend(settings)
    electronLogger.debug('IPC: settings:save completed')
  })

  ipcMain.handle('backend:restart', async () => {
    const settings = loadSettings()
    if (settings) {
      await stopBackend()
      await startBackend(settings)
    }
  })

  ipcMain.handle('backend:status', () => {
    return {
      running: emulatorProcess !== null,
      emulatorRunning: emulatorProcess !== null,
      botCount: botProcesses.size,
      botNames: Array.from(botProcesses.keys()),
    }
  })

  // Sync logs panel state from renderer (when toggled via keyboard shortcut in web mode)
  ipcMain.on('logs-panel:state-changed', (_event, visible) => {
    updateLogsPanelMenuState(visible)
  })

  // Model tiers - fetch dynamic models from provider APIs
  // Accepts optional apiKeys to override saved settings (useful for validation before saving)
  ipcMain.handle('models:getTiers', async (_event, overrideApiKeys) => {
    const settings = loadSettings() || {}
    const apiKeys = {
      openai_api_key: settings.openai_api_key,
      anthropic_api_key: settings.anthropic_api_key,
      google_api_key: settings.google_api_key,
      openrouter_api_key: settings.openrouter_api_key,
      ...overrideApiKeys,
    }
    return getModelTiers(apiKeys)
  })

  // Clear model cache (when API keys change)
  ipcMain.handle('models:clearCache', async (_event, provider) => {
    clearModelCache(provider)
  })

  // Validate API key
  ipcMain.handle('models:validateKey', async (_event, provider, apiKey) => {
    return validateApiKey(provider, apiKey)
  })

  // Fetch bot config (proxied to avoid renderer CSP issues)
  // Bots register their config port with the emulator, so we query the emulator to get it
  // Includes retry logic since bot config server may not be immediately available
  ipcMain.handle('bot:fetchConfig', async (_event, botId) => {
    let configPort = null

    try {
      const botsResponse = await fetch(`${EMULATOR_URL}/api/simulator/bots`)
      if (botsResponse.ok) {
        const botsData = await botsResponse.json()
        const bot = botsData.bots?.find((b) => b.id === botId)
        if (bot?.configPort) {
          configPort = bot.configPort
          electronLogger.debug(
            { botId, configPort },
            'Found config port from emulator'
          )
        }
      }
    } catch (error) {
      electronLogger.debug(
        { error: error.message, botId },
        'Failed to query emulator for bot config port'
      )
    }

    if (!configPort) {
      electronLogger.debug(
        { botId },
        'Bot config port not found - bot may not have registered yet'
      )
      return null
    }

    const MAX_RETRIES = 10
    const RETRY_DELAY = 300

    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
      try {
        const response = await fetch(`http://127.0.0.1:${configPort}/config`)
        if (response.ok) {
          const data = await response.json()
          electronLogger.debug(
            { botId, configPort, attempt },
            'Bot config fetched successfully'
          )
          return data
        }
        electronLogger.debug(
          { status: response.status, attempt, botId },
          'Config server returned error'
        )
      } catch (error) {
        electronLogger.debug(
          { error: error.message, attempt, botId },
          'Config server not ready'
        )
      }

      if (attempt < MAX_RETRIES) {
        await new Promise((r) => setTimeout(r, RETRY_DELAY))
      }
    }

    electronLogger.debug({ botId }, 'Bot config not available after retries')
    return null
  })
}

function createWindow() {
  // Calculate window size: 80% of screen, max 2048px width, 4:3 aspect ratio
  const display = screen.getPrimaryDisplay()
  const { width: screenWidth, height: screenHeight } = display.bounds
  const maxWidth = 2048
  const targetWidth = Math.min(Math.round(screenWidth * 0.8), maxWidth)
  const targetHeight = Math.round((targetWidth * 3) / 4)
  const finalHeight = Math.min(targetHeight, Math.round(screenHeight * 0.9))
  const finalWidth = Math.round((finalHeight * 4) / 3)

  // Center window on screen (accounting for menu bar on macOS)
  const menuBarHeight = screenHeight - display.workAreaSize.height
  const x = Math.round((screenWidth - finalWidth) / 2)
  const y = Math.round((screenHeight - finalHeight + menuBarHeight) / 2)

  mainWindow = new BrowserWindow({
    width: finalWidth,
    height: finalHeight,
    x,
    y,
    minWidth: 800,
    minHeight: 600,
    title: 'Botarium',
    icon: iconPath,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: preloadPath,
    },
    titleBarStyle: process.platform === 'darwin' ? 'hiddenInset' : 'default',
    backgroundColor: '#1a1d21',
  })

  if (useDevServer) {
    // Load from Vite dev server (for hot reload during development)
    mainWindow.loadURL('http://localhost:5173')
    // Dev tools can be opened manually with Cmd+Option+I (Mac) or Ctrl+Shift+I (Win/Linux)
  } else if (fs.existsSync(builtFile)) {
    // Load built files
    mainWindow.loadFile(builtFile)
  } else {
    // No built files found - show helpful message
    mainWindow.loadURL(`data:text/html,
      <html>
        <body style="font-family: system-ui; padding: 40px; background: #1a1d21; color: #d1d2d3;">
          <h1>Build Required</h1>
          <p>Run <code style="background: #333; padding: 4px 8px; border-radius: 4px;">bun run --filter @botarium/web build</code> first to build the web app.</p>
          <p style="color: #888; margin-top: 20px;">Or run <code style="background: #333; padding: 4px 8px; border-radius: 4px;">bun run dev:electron</code> to use the dev server.</p>
        </body>
      </html>
    `)
  }

  mainWindow.on('closed', () => {
    mainWindow = null
  })

  // Start backend if settings exist
  // Note: API keys are now bot-specific (in config.yaml), not global settings
  const settings = loadSettings()
  if (settings) {
    startBackend(settings)
  }
}

// Menu creation
function createApplicationMenu() {
  const isMac = process.platform === 'darwin'

  const template = [
    // App menu (macOS only)
    ...(isMac
      ? [
          {
            label: app.name,
            submenu: [
              { role: 'about' },
              { type: 'separator' },
              { role: 'services' },
              { type: 'separator' },
              { role: 'hide' },
              { role: 'hideOthers' },
              { role: 'unhide' },
              { type: 'separator' },
              { role: 'quit' },
            ],
          },
        ]
      : []),

    // File menu
    {
      label: 'File',
      submenu: [isMac ? { role: 'close' } : { role: 'quit' }],
    },

    // Edit menu
    {
      label: 'Edit',
      submenu: [
        { role: 'undo' },
        { role: 'redo' },
        { type: 'separator' },
        { role: 'cut' },
        { role: 'copy' },
        { role: 'paste' },
        { role: 'selectAll' },
      ],
    },

    // View menu
    {
      label: 'View',
      submenu: [
        { role: 'reload' },
        { role: 'forceReload' },
        { role: 'toggleDevTools' },
        { type: 'separator' },
        { role: 'resetZoom' },
        { role: 'zoomIn' },
        { role: 'zoomOut' },
        { type: 'separator' },
        { role: 'togglefullscreen' },
        { type: 'separator' },
        {
          id: 'toggle-logs-panel',
          label: 'Toggle Logs Panel',
          type: 'checkbox',
          checked: logsPanelChecked,
          accelerator: 'CmdOrCtrl+L',
          click: (menuItem) => {
            if (mainWindow) {
              logsPanelChecked = menuItem.checked
              mainWindow.webContents.send(
                'menu:toggle-logs-panel',
                menuItem.checked
              )
            }
          },
        },
      ],
    },

    // Window menu
    {
      label: 'Window',
      submenu: [
        { role: 'minimize' },
        { role: 'zoom' },
        ...(isMac
          ? [
              { type: 'separator' },
              { role: 'front' },
              { type: 'separator' },
              { role: 'window' },
            ]
          : [{ role: 'close' }]),
      ],
    },
  ]

  const menu = Menu.buildFromTemplate(template)
  Menu.setApplicationMenu(menu)
}

function updateLogsPanelMenuState(checked) {
  logsPanelChecked = checked
  const menu = Menu.getApplicationMenu()
  if (menu) {
    const menuItem = menu.getMenuItemById('toggle-logs-panel')
    if (menuItem) {
      menuItem.checked = checked
    }
  }
}

app.whenReady().then(() => {
  // Set dock icon on macOS (only in dev mode - packaged app uses bundled .icns)
  if (process.platform === 'darwin' && app.dock && !app.isPackaged) {
    app.dock.setIcon(iconPath)
  }
  createApplicationMenu()
  setupIpcHandlers()
  createWindow()
})

app.on('window-all-closed', async () => {
  await stopBackend()
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow()
  }
})

// Track if we're currently cleaning up to avoid double-cleanup
let isQuitting = false

app.on('before-quit', async (event) => {
  if (isQuitting) return // Already cleaning up

  // Prevent immediate quit
  event.preventDefault()
  isQuitting = true

  // Stop backend processes
  await stopBackend()

  // Now actually quit
  app.quit()
})
