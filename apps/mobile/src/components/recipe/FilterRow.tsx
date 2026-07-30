import { View } from 'react-native';
import { Pill } from '@/components/ui/Pill';
import { useTranslation } from '@/hooks/useTranslation';
import { FILTROS_DIETETICOS } from '@emealia/config';
import type { FiltroDietetico } from '@emealia/types';

interface FilterRowProps {
  filtrosSelecionados: FiltroDietetico[];
  onToggle: (f: FiltroDietetico) => void;
}

export function FilterRow({ filtrosSelecionados, onToggle }: FilterRowProps) {
  const { t } = useTranslation();
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
      {FILTROS_DIETETICOS.map((f) => (
        <Pill
          key={f.value}
          label={t(`config.filtros.${f.value}`)}
          selected={filtrosSelecionados.includes(f.value)}
          onPress={() => onToggle(f.value)}
        />
      ))}
    </View>
  );
}
