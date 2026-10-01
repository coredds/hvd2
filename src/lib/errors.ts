export function getErrorMessage(error: unknown): string {
  if (typeof error === 'object' && error !== null && 'message' in error &&
      typeof error.message === 'string' && error.message) return error.message
  return String(error)
}
