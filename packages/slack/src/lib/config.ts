/**
 * Slack Emulator server configuration
 */

export const DEFAULT_EMULATOR_PORT = 7557

export function getEmulatorPort(): number {
  return parseInt(process.env.PORT ?? String(DEFAULT_EMULATOR_PORT), 10)
}

export function getEmulatorUrl(port: number = getEmulatorPort()): string {
  return `http://localhost:${port}`
}

export function getEmulatorWsUrl(port: number = getEmulatorPort()): string {
  return `ws://localhost:${port}/ws/socket-mode`
}
