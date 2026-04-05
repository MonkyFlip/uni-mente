/**
 * Componente PaletteSelector — selector de paleta de color.
 *
 * Colócalo en la pantalla de Dashboard (inicio) de cada rol,
 * por ejemplo al final de la ScrollView.
 *
 * Uso:
 *   import { PaletteSelector } from '../../components/PaletteSelector';
 *   ...
 *   <PaletteSelector />
 */
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { PALETTES, PaletteKey, useTheme } from '../contexts/ThemeContext';

const PALETTE_KEYS = Object.keys(PALETTES) as PaletteKey[];

export function PaletteSelector() {
  const { palette, setPalette, colors } = useTheme();

  return (
    <View style={[styles.container, { backgroundColor: colors.navyCard, borderColor: colors.border }]}>
      <Text style={[styles.label, { color: colors.creamDim }]}>🎨 Paleta de color</Text>
      <View style={styles.row}>
        {PALETTE_KEYS.map(key => {
          const p = PALETTES[key];
          const isActive = palette === key;
          return (
            <TouchableOpacity
              key={key}
              style={[
                styles.chip,
                { borderColor: isActive ? p.teal : colors.border,
                  backgroundColor: isActive ? p.tealGlow : colors.navyHover },
              ]}
              onPress={() => setPalette(key)}
            >
              <View style={[styles.dot, { backgroundColor: p.teal }]} />
              <Text style={[styles.chipText, { color: isActive ? p.teal : colors.creamDim }]}>
                {p.name}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { borderRadius: 14, borderWidth: 1, padding: 16, gap: 12 },
  label:     { fontSize: 13, fontWeight: '600' },
  row:       { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip:      { flexDirection: 'row', alignItems: 'center', gap: 6,
               paddingHorizontal: 12, paddingVertical: 7,
               borderRadius: 20, borderWidth: 1.5 },
  dot:       { width: 10, height: 10, borderRadius: 5 },
  chipText:  { fontSize: 12, fontWeight: '600' },
});