import type { ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { colors, fonts, spacing } from '@/constants/theme';
import type { ExplanationSections } from '@/types/astra';

type ExplanationPanelProps = {
  explanation: ExplanationSections;
};

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {children}
    </View>
  );
}

export function ExplanationPanel({ explanation }: ExplanationPanelProps) {
  return (
    <View style={styles.wrapper}>
      <Section title="Observed">
        {explanation.observed.map((line) => (
          <Text key={line} style={styles.body}>
            {line}
          </Text>
        ))}
      </Section>
      <Section title="Calculated">
        {explanation.calculated.map((line) => (
          <Text key={line} style={styles.body}>
            {line}
          </Text>
        ))}
      </Section>
      <Section title="Possible interpretation">
        <Text style={styles.body}>{explanation.possibleInterpretation}</Text>
      </Section>
      <Section title="Suggested next step">
        <Text style={styles.body}>{explanation.suggestedNextStep}</Text>
      </Section>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    gap: spacing.sm,
  },
  section: {
    gap: spacing.xs / 2,
    paddingLeft: spacing.sm,
    borderLeftWidth: 2,
    borderLeftColor: colors.navy[600],
  },
  sectionTitle: {
    fontFamily: fonts.semibold,
    fontSize: 13,
    lineHeight: 18,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    color: colors.primary[300],
  },
  body: {
    fontFamily: fonts.regular,
    fontSize: 15,
    lineHeight: 22,
    color: colors.offWhite,
  },
});
