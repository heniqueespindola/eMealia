export function getAuthErrorMessage(error: unknown): string {
  const message = error && typeof error === 'object' && 'message' in error
    ? String((error as { message: unknown }).message)
    : '';

  if (message.includes('Invalid login credentials')) return 'errors.authInvalidCredentials';
  if (message.includes('User already registered')) return 'errors.authEmailTaken';
  if (message.includes('Password should be at least')) return 'errors.authWeakPassword';
  if (message.includes('Unable to validate email address')) return 'errors.authInvalidEmail';
  return 'errors.authGeneric';
}
