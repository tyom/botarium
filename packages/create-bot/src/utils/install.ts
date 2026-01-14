import pc from 'picocolors'

export interface InstallResult {
  success: boolean
  error?: string
}

/**
 * Install dependencies in the target directory using bun.
 */
export async function installDependencies(targetDir: string): Promise<InstallResult> {
  const proc = Bun.spawn(['bun', 'install'], {
    cwd: targetDir,
    stdout: 'pipe',
    stderr: 'pipe',
  })

  const exitCode = await proc.exited

  if (exitCode !== 0) {
    const stderr = await new Response(proc.stderr).text()
    return { success: false, error: stderr }
  }

  return { success: true }
}

/**
 * Install dependencies and print status messages.
 */
export async function installDependenciesWithOutput(targetDir: string): Promise<boolean> {
  console.log()
  console.log(pc.cyan('Installing dependencies...'))

  const result = await installDependencies(targetDir)

  if (!result.success) {
    console.error(pc.red('Failed to install dependencies'))
    if (result.error) {
      console.error(result.error)
    }
    return false
  }

  console.log(pc.green('Dependencies installed!'))
  return true
}
