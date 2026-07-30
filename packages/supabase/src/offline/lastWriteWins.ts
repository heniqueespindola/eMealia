export function resolveConflict(
  local:  { updated_at: string },
  remote: { updated_at: string }
): 'local' | 'remote' {
  return new Date(local.updated_at).getTime() >= new Date(remote.updated_at).getTime()
    ? 'local'
    : 'remote';
}
