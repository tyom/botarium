import { describe, expect, test, beforeEach, afterEach } from 'bun:test'
import fs from 'fs'
import path from 'path'
import os from 'os'
import { scaffold, type ScaffoldOptions } from './scaffold'

function createTempDir(): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'botarium-scaffold-'))
}

function cleanup(dir: string): void {
  if (fs.existsSync(dir)) {
    fs.rmSync(dir, { recursive: true })
  }
}

describe('scaffold', () => {
  let tmpDir: string
  let targetDir: string

  beforeEach(() => {
    tmpDir = createTempDir()
    targetDir = path.join(tmpDir, 'test-bot')
  })

  afterEach(() => {
    cleanup(tmpDir)
  })

  function opts(overrides?: Partial<ScaffoldOptions>): ScaffoldOptions {
    return {
      botName: 'test-bot',
      template: 'slack',
      useAi: false,
      useObservability: false,
      useResilience: false,
      targetDir,
      ...overrides,
    }
  }

  test('scaffolds base-only bot', async () => {
    const result = await scaffold(opts())

    expect(result).toBe(targetDir)
    expect(fs.existsSync(path.join(targetDir, 'package.json'))).toBe(true)
    expect(fs.existsSync(path.join(targetDir, 'src/app.ts'))).toBe(true)
    expect(fs.existsSync(path.join(targetDir, 'src/setup.ts'))).toBe(true)
    expect(fs.existsSync(path.join(targetDir, 'src/listeners/index.ts'))).toBe(
      true
    )

    // AI files should NOT exist
    expect(fs.existsSync(path.join(targetDir, 'src/ai'))).toBe(false)
    expect(fs.existsSync(path.join(targetDir, 'src/utils/reactions.ts'))).toBe(
      false
    )
  })

  test('scaffolds bot with AI feature', async () => {
    const result = await scaffold(opts({ useAi: true }))

    expect(result).toBe(targetDir)

    // AI files should exist
    expect(fs.existsSync(path.join(targetDir, 'src/ai/agent.ts'))).toBe(true)
    expect(fs.existsSync(path.join(targetDir, 'src/ai/router.ts'))).toBe(true)
    expect(fs.existsSync(path.join(targetDir, 'src/ai/tools/example.ts'))).toBe(
      true
    )
    expect(fs.existsSync(path.join(targetDir, 'src/utils/reactions.ts'))).toBe(
      true
    )

    // AI deps should be in package.json
    const pkg = JSON.parse(
      fs.readFileSync(path.join(targetDir, 'package.json'), 'utf-8')
    )
    expect(pkg.dependencies.ai).toBeDefined()
    expect(pkg.dependencies['@ai-sdk/openai']).toBeDefined()
  })

  test('scaffolds bot with all features', async () => {
    const result = await scaffold(
      opts({ useAi: true, useObservability: true, useResilience: true })
    )

    expect(result).toBe(targetDir)

    // All feature deps should be present
    const pkg = JSON.parse(
      fs.readFileSync(path.join(targetDir, 'package.json'), 'utf-8')
    )
    expect(pkg.dependencies.ai).toBeDefined()
    expect(pkg.dependencies['@botarium/observability']).toBeDefined()
    expect(pkg.dependencies['@botarium/resilience']).toBeDefined()

    // Combination files should have been applied
    // app.ts should have both AI and observability (from ai+observability combo)
    const appContent = fs.readFileSync(
      path.join(targetDir, 'src/app.ts'),
      'utf-8'
    )
    expect(appContent).toContain('reloadSettings')
    expect(appContent).toContain('getHealthResponse')

    // setup.ts should have observability+resilience combo
    const setupContent = fs.readFileSync(
      path.join(targetDir, 'src/setup.ts'),
      'utf-8'
    )
    expect(setupContent).toContain('@botarium/observability')
    expect(setupContent).toContain('@botarium/resilience')
    expect(setupContent).toContain('breakerRegistry')
  })

  test('applies variable interpolation', async () => {
    await scaffold(opts())

    const pkg = JSON.parse(
      fs.readFileSync(path.join(targetDir, 'package.json'), 'utf-8')
    )
    expect(pkg.name).toBe('test-bot')
    expect(pkg.description).toBe('test-bot Slack bot')

    const configContent = fs.readFileSync(
      path.join(targetDir, 'config.yaml'),
      'utf-8'
    )
    expect(configContent).toContain('TestBot')
    expect(configContent).toContain('test-bot')
  })

  test('creates .env from .env.example', async () => {
    await scaffold(opts())

    expect(fs.existsSync(path.join(targetDir, '.env'))).toBe(true)
    expect(fs.existsSync(path.join(targetDir, '.env.example'))).toBe(true)

    const envContent = fs.readFileSync(path.join(targetDir, '.env'), 'utf-8')
    expect(envContent).toContain('SLACK_BOT_TOKEN')
  })

  test('merges feature dependencies into package.json', async () => {
    await scaffold(opts({ useObservability: true, useResilience: true }))

    const pkg = JSON.parse(
      fs.readFileSync(path.join(targetDir, 'package.json'), 'utf-8')
    )
    expect(pkg.dependencies['@botarium/observability']).toBe('workspace:*')
    expect(pkg.dependencies['@botarium/resilience']).toBe('workspace:*')

    // AI deps should NOT be present
    expect(pkg.dependencies.ai).toBeUndefined()
  })

  test('throws when template not found', async () => {
    expect(
      scaffold(opts({ template: 'nonexistent' as never }))
    ).rejects.toThrow('Template not found')
  })

  test('overwrites existing directory when overwrite is true', async () => {
    // Create target with a marker file
    fs.mkdirSync(targetDir, { recursive: true })
    fs.writeFileSync(path.join(targetDir, 'marker.txt'), 'old')

    await scaffold(opts({ overwrite: true }))

    // Marker file should be gone (directory was replaced)
    expect(fs.existsSync(path.join(targetDir, 'marker.txt'))).toBe(false)
    // New files should exist
    expect(fs.existsSync(path.join(targetDir, 'package.json'))).toBe(true)
  })
})
