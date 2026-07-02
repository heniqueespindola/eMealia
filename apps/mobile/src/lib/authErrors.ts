export function getAuthErrorMessage(error: unknown): string {
  const message = error && typeof error === 'object' && 'message' in error
    ? String((error as { message: unknown }).message)
    : '';

  if (message.includes('Invalid login credentials')) return 'Email ou password incorretos.';
  if (message.includes('User already registered')) return 'Este email já está registado.';
  if (message.includes('Password should be at least')) return 'A password deve ter pelo menos 6 caracteres.';
  if (message.includes('Unable to validate email address')) return 'Introduz um email válido.';
  return message || 'Ocorreu um erro. Tenta novamente.';
}
