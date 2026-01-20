import pc from 'picocolors'

/**
 * CLI output helpers for consistent formatting.
 */

export function printHeader(title: string): void {
  console.log()
  console.log(pc.bold(pc.blue(title)))
  console.log()
}

export function printStatus(message: string): void {
  console.log()
  console.log(pc.cyan(message))
}

export function printCancelled(): void {
  console.log(pc.yellow('Cancelled'))
}

export function printSuccess(message: string): void {
  console.log()
  console.log(pc.bold(pc.green(message)))
  console.log()
}

export function printStep(step: number, instruction: string): void {
  console.log(pc.cyan(`  ${step}.`), instruction)
}

export function printCommand(command: string): void {
  console.log(pc.dim(`       ${command}`))
}

export function printEnvVar(name: string): void {
  console.log(pc.dim(`       - ${name}`))
}

export function printSectionHeader(title: string): void {
  console.log(`     ${title}`)
}

export function printBlankLine(): void {
  console.log()
}
