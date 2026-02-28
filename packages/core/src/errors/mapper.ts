import { AppError, SystemError } from './types'

/**
 * A classifier function tests an unknown error and returns an AppError or null.
 */
export type ErrorClassifier = (error: unknown) => AppError | null

/**
 * Create a custom error mapper from an array of classifier functions.
 * Classifiers are tested in order; first non-null result wins.
 * Falls back to SystemError for unclassified errors.
 */
export function createErrorMapper(
  classifiers: ErrorClassifier[]
): (error: unknown) => AppError {
  return (error: unknown): AppError => {
    if (error instanceof AppError) return error

    for (const classify of classifiers) {
      const result = classify(error)
      if (result) return result
    }

    if (error instanceof Error) {
      return new SystemError(error.message, { cause: error })
    }
    return new SystemError(String(error))
  }
}
