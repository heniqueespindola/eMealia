import { useState } from 'react';
import { View, Text } from 'react-native';
import { CameraView, useCameraPermissions, type BarcodeScanningResult } from 'expo-camera';
import { Button } from '@/components/ui/Button';
import { colors, fonts, spacing } from '@/constants/theme';

interface BarcodeScannerProps {
  onScanned: (barcode: string) => void;
  onClose:   () => void;
}

export function BarcodeScanner({ onScanned, onClose }: BarcodeScannerProps) {
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);

  function handleBarcodeScanned(result: BarcodeScanningResult) {
    if (scanned) return;
    setScanned(true);
    onScanned(result.data);
  }

  if (!permission?.granted) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.bgDark, alignItems: 'center', justifyContent: 'center', padding: spacing.lg }}>
        <Text style={{ fontFamily: fonts.regular, fontSize: 15, color: colors.textInverted, textAlign: 'center', marginBottom: spacing.md }}>
          Precisamos de acesso à câmara para ler códigos de barras.
        </Text>
        <Button label="Permitir câmara" onPress={requestPermission} />
        <View style={{ marginTop: spacing.md }}>
          <Button label="Cancelar" variant="outline" onPress={onClose} />
        </View>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.bgDark }}>
      <CameraView
        style={{ flex: 1 }}
        barcodeScannerSettings={{ barcodeTypes: ['ean13', 'ean8', 'upc_a'] }}
        onBarcodeScanned={handleBarcodeScanned}
      />
      <View style={{ padding: spacing.lg }}>
        <Button label="Cancelar" variant="outline" onPress={onClose} />
      </View>
    </View>
  );
}
