import { StyleSheet, Text, View } from 'react-native';

import { formatTimestamp } from '@/lib/format';
import {
  getSymptomDisplayState,
  intensityLabel,
  locationLabel,
  sanitizeSymptomEntries,
  symptomStateLabel,
  typeLabel,
} from '@/lib/symptoms';
import { colors, fonts, radius, stitch, type as typography } from '@/constants/theme';
import type { SymptomEntry, SymptomStatus } from '@/types/astra';

type SymptomSummaryProps = {
  symptoms: string[];
  entries: SymptomEntry[] | undefined;
  status?: SymptomStatus;
  showTimestamps?: boolean;
  compact?: boolean;
  emptyLabel?: string;
};

export function SymptomSummary({
  symptoms,
  entries: rawEntries,
  status,
  showTimestamps = false,
  compact = false,
  emptyLabel,
}: SymptomSummaryProps) {
  const entries = sanitizeSymptomEntries(rawEntries);
  const state = getSymptomDisplayState({ symptoms, symptomEntries: entries, symptomStatus: status });
  const wordList = symptoms.filter((symptom) => symptom.trim() !== '');

  if (entries.length === 0 && wordList.length === 0) {
    return (
      <View style={[styles.state, compact && styles.stateCompact]}>
        <Text style={styles.stateText}>{emptyLabel ?? symptomStateLabel({ symptoms, symptomEntries: entries, symptomStatus: status })}</Text>
        {state === 'none' ? <Text style={styles.stateNote}>You explicitly reported no symptoms for this check-in.</Text> : null}
        {state === 'not-answered' ? <Text style={styles.stateNote}>This question was left unanswered.</Text> : null}
        {state === 'not-recorded' ? <Text style={styles.stateNote}>This older record did not store a structured symptom answer.</Text> : null}
      </View>
    );
  }

  return (
    <View style={styles.list} accessibilityRole="list">
      {entries.map((entry) => (
        <View key={entry.symptomEntryId} style={[styles.row, compact && styles.rowCompact]}>
          <View style={styles.dot} />
          <View style={styles.copy}>
            <View style={styles.headRow}>
              <Text style={styles.location}>{locationLabel(entry)}</Text>
              <Text style={styles.type}>{typeLabel(entry.symptomType)}</Text>
            </View>
            {entry.discomfortIntensity !== null ? (
              <Text style={styles.meta}>Noticeable: {entry.discomfortIntensity}/5 · {intensityLabel(entry.discomfortIntensity)}</Text>
            ) : null}
            {entry.symptomNote ? <Text style={styles.note}>“{entry.symptomNote}”</Text> : null}
            {showTimestamps ? <Text style={styles.time}>Recorded {formatTimestamp(entry.recordedAtUTC)}</Text> : null}
          </View>
        </View>
      ))}
      {wordList.length > 0 ? (
        <View style={[styles.row, compact && styles.rowCompact]}>
          <View style={styles.dot} />
          <View style={styles.copy}>
            <Text style={styles.location}>Also selected from the word list</Text>
            <Text style={styles.note}>{wordList.join(', ')}</Text>
          </View>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  list: { gap: 7 },
  row: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, padding: 10, borderRadius: radius.sm, borderWidth: 1, borderColor: stitch.glassBorder, backgroundColor: 'rgba(4, 16, 28, 0.48)' },
  rowCompact: { padding: 8 },
  dot: { width: 6, height: 6, borderRadius: 3, marginTop: 7, backgroundColor: colors.primary[400] },
  copy: { flex: 1, minWidth: 0, gap: 2 },
  headRow: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'baseline', gap: 8 },
  location: { fontFamily: fonts.semibold, fontSize: 12.5, lineHeight: 18, color: colors.offWhite },
  type: { ...typography.bodySmall, color: colors.primary[300] },
  meta: { ...typography.meta, color: colors.slate[400] },
  note: { ...typography.bodySmall, color: colors.slate[300] },
  time: { ...typography.monoSmall, color: colors.slate[500] },
  state: { padding: 10, borderRadius: radius.sm, borderWidth: 1, borderColor: stitch.glassBorder, backgroundColor: 'rgba(4, 16, 28, 0.44)', gap: 3 },
  stateCompact: { padding: 8 },
  stateText: { ...typography.bodySmall, color: colors.slate[200] },
  stateNote: { ...typography.meta, color: colors.slate[500] },
});
