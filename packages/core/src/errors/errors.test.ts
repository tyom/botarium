import { describe, it, expect } from 'bun:test'
import {
  AppError,
  UserError,
  RateLimitError,
  ProviderError,
  ToolExecutionError,
  SystemError,
  createErrorMapper,
  formatUserError,
  getErrorMessage,
  type ErrorClassifier,
} from './index'

describe('Error Classes', () => {
  describe('UserError', () => {
    it('has correct code, httpStatus, and isRetryable', () => {
      const error = new UserError('bad input')
      expect(error.code).toBe('USER_ERROR')
      expect(error.httpStatus).toBe(400)
      expect(error.isRetryable).toBe(false)
    })

    it('stores detail and uses it as userMessage', () => {
      const error = new UserError('Please provide a valid URL')
      expect(error.detail).toBe('Please provide a valid URL')
      expect(error.userMessage()).toBe('Please provide a valid URL')
    })

    it('sets message with prefix', () => {
      const error = new UserError('bad input')
      expect(error.message).toBe('User error: bad input')
    })

    it('is an instance of AppError and Error', () => {
      const error = new UserError('test')
      expect(error).toBeInstanceOf(AppError)
      expect(error).toBeInstanceOf(Error)
    })

    it('preserves cause', () => {
      const cause = new Error('original')
      const error = new UserError('wrapped', { cause })
      expect(error.cause).toBe(cause)
    })
  })

  describe('RateLimitError', () => {
    it('has correct code, httpStatus, and isRetryable', () => {
      const error = new RateLimitError('openai')
      expect(error.code).toBe('RATE_LIMIT')
      expect(error.httpStatus).toBe(429)
      expect(error.isRetryable).toBe(true)
    })

    it('stores provider', () => {
      const error = new RateLimitError('anthropic')
      expect(error.provider).toBe('anthropic')
    })

    it('returns retry message with seconds when retryAfterMs provided', () => {
      const error = new RateLimitError('openai', { retryAfterMs: 5000 })
      expect(error.retryAfterMs).toBe(5000)
      expect(error.userMessage()).toContain('5 seconds')
    })

    it('returns generic retry message without retryAfterMs', () => {
      const error = new RateLimitError('openai')
      expect(error.userMessage()).toContain('Give me a moment')
    })
  })

  describe('ProviderError', () => {
    it('has correct defaults', () => {
      const error = new ProviderError('anthropic')
      expect(error.code).toBe('PROVIDER_ERROR')
      expect(error.httpStatus).toBe(502)
      expect(error.isRetryable).toBe(true)
      expect(error.provider).toBe('anthropic')
    })

    it('accepts custom httpStatus and isRetryable', () => {
      const error = new ProviderError('openai', {
        httpStatus: 503,
        isRetryable: false,
      })
      expect(error.httpStatus).toBe(503)
      expect(error.isRetryable).toBe(false)
    })

    it('returns user-friendly message', () => {
      const error = new ProviderError('test')
      expect(error.userMessage()).toContain('AI service')
    })
  })

  describe('ToolExecutionError', () => {
    it('has correct code, httpStatus, and isRetryable', () => {
      const error = new ToolExecutionError('search')
      expect(error.code).toBe('TOOL_ERROR')
      expect(error.httpStatus).toBe(500)
      expect(error.isRetryable).toBe(false)
    })

    it('stores toolName', () => {
      const error = new ToolExecutionError('github-search')
      expect(error.toolName).toBe('github-search')
    })

    it('returns user-friendly message', () => {
      const error = new ToolExecutionError('test')
      expect(error.userMessage()).toContain('tools')
    })
  })

  describe('SystemError', () => {
    it('has correct code, httpStatus, and isRetryable', () => {
      const error = new SystemError('unexpected failure')
      expect(error.code).toBe('SYSTEM_ERROR')
      expect(error.httpStatus).toBe(500)
      expect(error.isRetryable).toBe(false)
    })

    it('returns user-friendly message', () => {
      const error = new SystemError('db connection lost')
      expect(error.userMessage()).toContain('unexpected')
    })

    it('preserves cause', () => {
      const cause = new TypeError('null ref')
      const error = new SystemError('wrapped', { cause })
      expect(error.cause).toBe(cause)
    })
  })
})

describe('createErrorMapper', () => {
  it('passes through AppError instances unchanged', () => {
    const mapper = createErrorMapper([])
    const original = new UserError('already classified')
    const result = mapper(original)
    expect(result).toBe(original)
  })

  it('uses first matching classifier', () => {
    const classifier: ErrorClassifier = (error) => {
      if (error instanceof TypeError) {
        return new UserError('type problem')
      }
      return null
    }
    const mapper = createErrorMapper([classifier])
    const result = mapper(new TypeError('bad type'))
    expect(result).toBeInstanceOf(UserError)
    expect((result as UserError).detail).toBe('type problem')
  })

  it('tries classifiers in order and uses first non-null', () => {
    const first: ErrorClassifier = () => null
    const second: ErrorClassifier = () => new ProviderError('matched')
    const third: ErrorClassifier = () => new UserError('should not reach')

    const mapper = createErrorMapper([first, second, third])
    const result = mapper(new Error('test'))
    expect(result).toBeInstanceOf(ProviderError)
    expect((result as ProviderError).provider).toBe('matched')
  })

  it('falls back to SystemError for unclassified Error instances', () => {
    const mapper = createErrorMapper([])
    const original = new Error('unclassified')
    const result = mapper(original)
    expect(result).toBeInstanceOf(SystemError)
    expect(result.message).toBe('unclassified')
    expect(result.cause).toBe(original)
  })

  it('falls back to SystemError with String coercion for non-Error unknowns', () => {
    const mapper = createErrorMapper([])
    const result = mapper(42)
    expect(result).toBeInstanceOf(SystemError)
    expect(result.message).toBe('42')
  })

  it('wraps string errors as SystemError', () => {
    const mapper = createErrorMapper([])
    const result = mapper('something broke')
    expect(result).toBeInstanceOf(SystemError)
    expect(result.message).toBe('something broke')
  })
})

describe('formatUserError', () => {
  it('returns userMessage without trace ref when no traceId', () => {
    const error = new SystemError('internal')
    const result = formatUserError(error)
    expect(result).toBe(error.userMessage())
    expect(result).not.toContain('ref:')
  })

  it('appends trace ref for SYSTEM_ERROR with traceId', () => {
    const error = new SystemError('internal')
    const result = formatUserError(error, 'abc12345-trace-id-67890xyz')
    expect(result).toContain('(ref: 67890xyz)')
  })

  it('appends trace ref for PROVIDER_ERROR with traceId', () => {
    const error = new ProviderError('openai')
    const result = formatUserError(error, 'trace-abcdefgh')
    expect(result).toContain('(ref: abcdefgh)')
  })

  it('does NOT append trace ref for USER_ERROR even with traceId', () => {
    const error = new UserError('bad input')
    const result = formatUserError(error, 'some-trace-id')
    expect(result).toBe('bad input')
    expect(result).not.toContain('ref:')
  })

  it('does NOT append trace ref for RATE_LIMIT even with traceId', () => {
    const error = new RateLimitError('openai')
    const result = formatUserError(error, 'some-trace-id')
    expect(result).not.toContain('ref:')
  })

  it('does NOT append trace ref for TOOL_ERROR even with traceId', () => {
    const error = new ToolExecutionError('search')
    const result = formatUserError(error, 'some-trace-id')
    expect(result).not.toContain('ref:')
  })
})

describe('getErrorMessage', () => {
  it('extracts message from Error instances', () => {
    expect(getErrorMessage(new Error('hello'))).toBe('hello')
  })

  it('returns string errors as-is', () => {
    expect(getErrorMessage('string error')).toBe('string error')
  })

  it('converts numbers to string', () => {
    expect(getErrorMessage(404)).toBe('404')
  })

  it('converts null to string', () => {
    expect(getErrorMessage(null)).toBe('null')
  })

  it('converts undefined to string', () => {
    expect(getErrorMessage(undefined)).toBe('undefined')
  })

  it('converts objects to string', () => {
    expect(getErrorMessage({ key: 'value' })).toBe('[object Object]')
  })

  it('extracts message from AppError subclasses', () => {
    const error = new UserError('bad input')
    expect(getErrorMessage(error)).toBe('User error: bad input')
  })
})
