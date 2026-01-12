import type { BotboxPlugin, PluginRegistry } from './types'

/**
 * Create a plugin registry
 */
export function createPluginRegistry(): PluginRegistry {
  const plugins = new Map<string, BotboxPlugin>()

  return {
    register(plugin: BotboxPlugin): void {
      if (plugins.has(plugin.name)) {
        throw new Error(`Plugin "${plugin.name}" is already registered`)
      }
      plugins.set(plugin.name, plugin)
    },

    get(name: string): BotboxPlugin | undefined {
      return plugins.get(name)
    },

    getAll(): BotboxPlugin[] {
      return Array.from(plugins.values())
    },

    has(name: string): boolean {
      return plugins.has(name)
    },
  }
}
