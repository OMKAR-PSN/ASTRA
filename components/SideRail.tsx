import { usePathname, useRouter } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, fonts, layout, radius, spacing } from '@/constants/theme';
import { navItems } from '@/constants/navigation';

export function SideRail() {
  const pathname = usePathname();
  const router = useRouter();

  return (
    <View style={styles.rail}>
      <Text style={styles.brand}>ASTRA CARE</Text>
      <View style={styles.list}>
        {navItems.map(({ href, label, Icon }) => {
          const active = pathname === href;
          return (
            <Pressable
              key={href}
              accessibilityRole="link"
              accessibilityState={{ selected: active }}
              onPress={() => router.navigate(href)}
              style={({ pressed, hovered }) => [
                styles.item,
                active && styles.itemActive,
                (hovered || pressed) && !active && styles.itemHover,
              ]}
            >
              <Icon size={20} color={active ? colors.primary[400] : colors.slate[300]} strokeWidth={2} />
              <Text style={[styles.itemLabel, active && styles.itemLabelActive]}>{label}</Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  rail: {
    width: layout.railWidth,
    paddingTop: spacing.lg,
    paddingHorizontal: spacing.sm,
    borderRightWidth: 1,
    borderRightColor: colors.navy[600],
    backgroundColor: colors.navy[950],
    gap: spacing.md,
  },
  brand: {
    fontFamily: fonts.bold,
    fontSize: 16,
    lineHeight: 24,
    letterSpacing: 1.5,
    color: colors.offWhite,
    paddingHorizontal: spacing.xs,
  },
  list: {
    gap: spacing.xs,
  },
  item: {
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.xs,
    borderRadius: radius.md,
    borderLeftWidth: 3,
    borderLeftColor: 'transparent',
  },
  itemActive: {
    backgroundColor: colors.navy[700],
    borderLeftColor: colors.primary[400],
  },
  itemHover: {
    backgroundColor: colors.navy[800],
  },
  itemLabel: {
    fontFamily: fonts.regular,
    fontSize: 16,
    lineHeight: 24,
    color: colors.slate[300],
  },
  itemLabelActive: {
    fontFamily: fonts.semibold,
    color: colors.offWhite,
  },
});
