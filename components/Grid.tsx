import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import { spacing } from '@/constants/theme';

type GridProps = {
  children: ReactNode;
};

type GridItemProps = {
  wide?: boolean;
  children: ReactNode;
};

export function Grid({ children }: GridProps) {
  return <View style={styles.grid}>{children}</View>;
}

export function GridItem({ wide = false, children }: GridItemProps) {
  return <View style={[styles.item, wide && styles.itemWide]}>{children}</View>;
}

const styles = StyleSheet.create({
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  item: {
    flexBasis: 300,
    flexGrow: 1,
    flexShrink: 1,
    minWidth: 0,
  },
  itemWide: {
    flexBasis: '100%',
  },
});
