import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { updateProfile } from '@emealia/supabase';
import { calcularObjectivosDiarios } from '@emealia/config';
import { useProfileStore } from '@/stores/profileStore';
import type { MacroGoalsInput } from '@emealia/types';

export function useMacroGoals(userId: string | undefined) {
  const [saving, setSaving] = useState(false);

  async function guardarObjectivos(input: MacroGoalsInput) {
    if (!userId) return false;
    setSaving(true);
    const metas = calcularObjectivosDiarios(input);
    const { data, error } = await updateProfile(supabase!, userId, { ...input, ...metas });
    setSaving(false);
    if (error) { console.error('[useMacroGoals] updateProfile falhou:', error); return false; }
    if (data) useProfileStore.getState().setProfile(data);
    return true;
  }

  return { guardarObjectivos, saving };
}
