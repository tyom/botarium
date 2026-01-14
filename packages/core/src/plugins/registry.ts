import type { BotariumPlugin, PluginRegistry } from './types'

/**
 * Create a plugin registry
 */
export function createPluginRegistry(): PluginRegistry {
  const plugins = new Map<string, BotariumPlugin>()

  return {
    register(plugin: BotariumPlugin): void {
      if (plugins.has(plugin.name)) {
        throw new Error(`Plugin "${plugin.name}" is already registered`)
      }
      plugins.set(plugin.name, plugin)
    },

    get(name: string): BotariumPlugin | undefined {
      return plugins.get(name)
    },

    getAll(): BotariumPlugin[] {
      return Array.from(plugins.values())
    },

    has(name: string): boolean {
      return plugins.has(name)
    },
  }
}
