import type { ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { colors, fonts, radius, spacing } from '@/constants/theme';

type PanelProps = {
  title?: string;
  children: ReactNode;
};

export function Panel({ title, children }: PanelProps) {
  return (
    <View style={styles.panel}>
      {title ? <Text style={styles.title}>{title}</Text> : null}
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  panel: {
    backgroundColor: colors.navy[800],
    borderWidth: 1,
    borderColor: colors.navy[600],
    borderRadius: radius.lg,
    padding: spacing.sm,
    gap: spacing.sm,
  },
  title: {
    fontFamily: fonts.semibold,
    fontSize: 18,
    lineHeight: 22,
    color: colors.offWhite,
  },
});
