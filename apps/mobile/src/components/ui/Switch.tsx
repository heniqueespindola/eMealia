import { Switch as RNSwitch } from 'react-native';
import { colors } from '@/constants/theme';

interface SwitchProps { value: boolean; onValueChange: (v: boolean) => void; }

export function Switch({ value, onValueChange }: SwitchProps) {
  return (
    <RNSwitch
      value={value}
      onValueChange={onValueChange}
      trackColor={{ false: colors.border, true: colors.primary }}
      thumbColor={colors.white}
    />
  );
}
