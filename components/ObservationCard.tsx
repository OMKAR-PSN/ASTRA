import { useEffect, useState } from 'react';
import type { LucideIcon } from 'lucide-react-native';
import { StyleSheet, Text, View } from 'react-native';

import { Surface } from '@/components/Surface';
import { colors, fonts } from '@/constants/theme';
import { formatTimestamp } from '@/lib/format';
import type { ReadingStatus } from '@/lib/readingTiles';

type Props = { label: string; value: string; unit?: string; baseline?: string; status: ReadingStatus; measuredAt?: string; Icon: LucideIcon };
const labels = { baseline: 'Near demo baseline', difference: 'Differs from demo baseline', recorded: 'Self-reported', missing: 'Missing reading' };

export function ObservationCard({ label, value, unit, baseline, status, measuredAt, Icon }: Props) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 60000);
    return () => clearInterval(timer);
  }, []);
  const stale = measuredAt && now - Date.parse(measuredAt) > 86400000;
  return (
    <Surface style={styles.card}>
      <View style={styles.top}><Text style={styles.label}>{label}</Text><Icon size={20} color={colors.primary[400]} /></View>
      <View style={styles.reading}><Text style={[styles.value, (status === 'missing' || value.length > 7) && styles.smallValue]}>{value}</Text>{unit && status !== 'missing' ? <Text style={styles.unit}>{unit}</Text> : null}</View>
      <Text style={styles.meta}>{measuredAt ? formatTimestamp(measuredAt) : 'Awaiting first observation'}</Text>
      <View style={styles.footer}>
        <Text style={[styles.status, status === 'difference' && { color: colors.accent[400] }]}>{labels[status]}</Text>
        <Text style={styles.meta}>{baseline ? `Synthetic baseline · ${baseline}` : 'Manual entry · Synthetic demo'}</Text>
        {stale ? <Text style={styles.warning}>Older than 24 h · Demo freshness rule</Text> : null}
      </View>
    </Surface>
  );
}
const styles = StyleSheet.create({
  card: { flex: 1, gap: 10, padding: 16 },
  top: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  label: { fontFamily: fonts.semibold, fontSize: 12, lineHeight: 18, color: colors.slate[300], textTransform: 'uppercase', flex: 1, letterSpacing: 0.4 },
  reading: { flexDirection: 'row', alignItems: 'baseline', flexWrap: 'wrap', gap: 6 },
  value: { fontFamily: fonts.mono, fontSize: 30, lineHeight: 40, color: colors.offWhite, fontVariant: ['tabular-nums'] },
  smallValue: { fontSize: 22, lineHeight: 32 },
  unit: { fontFamily: fonts.mono, fontSize: 12, color: colors.slate[300] },
  meta: { fontFamily: fonts.regular, fontSize: 12, lineHeight: 18, color: colors.slate[300] },
  footer: { marginTop: 'auto', borderTopWidth: 1, borderColor: colors.navy[600], paddingTop: 10, gap: 4 },
  status: { fontFamily: fonts.semibold, fontSize: 12, lineHeight: 18, color: colors.secondary[400] },
  warning: { fontFamily: fonts.regular, fontSize: 12, lineHeight: 18, color: colors.accent[400] },
});
