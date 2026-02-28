// =============================================================================
// Result Types
// =============================================================================

export type ToolSuccess<T = Record<string, unknown>> = { success: true } & T
export type ToolError = { success: false; error: string }
export type ToolResult<T = Record<string, unknown>> = ToolSuccess<T> | ToolError

// =============================================================================
// Result Helpers
// =============================================================================

export function success<T extends Record<string, unknown>>(
  data: T
): ToolSuccess<T> {
  return { success: true, ...data }
}

export function failure(error: string): ToolError {
  return { success: false, error }
}
