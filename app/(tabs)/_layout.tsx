import { Surface } from '@/components/Surface';
import { Tabs } from 'expo-router';
import { Platform, Text, useWindowDimensions, type ViewStyle } from 'react-native';

import { navItems } from '@/constants/navigation';
import { colors, fonts, layout, stitch } from '@/constants/theme';

export default function TabLayout() {
  const { width } = useWindowDimensions();
  const isDesktop = width >= layout.desktopBreakpoint;

  return (
    <Tabs
      tabBar={isDesktop ? () => null : undefined}
      screenOptions={{
        headerShown: false,
        tabBarHideOnKeyboard: true,
        tabBarBackground: () => <Surface variant="glass" padded={false} style={{ position: 'absolute', top: 0, bottom: 0, left: 0, right: 0, borderRadius: 20 }} />,
        tabBarActiveBackgroundColor: 'rgba(0, 214, 198, 0.12)',
        tabBarActiveTintColor: colors.primary[300],
        tabBarInactiveTintColor: colors.slate[400],
        tabBarItemStyle: { borderRadius: 14, marginVertical: 6, marginHorizontal: 2 },
        tabBarStyle: {
          position: 'absolute',
          bottom: 12, left: 12, right: 12,
          borderRadius: 20, overflow: 'hidden',
          backgroundColor: 'transparent',
          borderTopWidth: 1,
          borderTopColor: stitch.glassBorder,
          minHeight: 64,
          paddingTop: 4,
          paddingBottom: 4,
          ...(Platform.OS === 'web' ? { boxShadow: stitch.shadowSoft, position: 'fixed', zIndex: 40 } as unknown as ViewStyle : {}),
        },
        tabBarLabelStyle: {
          fontFamily: fonts.semibold,
          fontSize: 10,
          letterSpacing: 0.2,
          marginHorizontal: 0,
        },
      }}
    >
      <Tabs.Screen name="report" options={{ tabBarButton: () => null }} />
      {navItems.map(({ routeName, label, Icon }) => (
        <Tabs.Screen
          key={routeName}
          name={routeName}
          options={{
            title: label,
            tabBarLabel: ({ color }) => <Text style={{ color, fontFamily: fonts.semibold, fontSize: 10, lineHeight: 13, letterSpacing: 0.2, textAlign: 'center' }}>{label}</Text>,
            tabBarIcon: ({ color, size }) => <Icon color={color} size={size} strokeWidth={2} />,
          }}
        />
      ))}
    </Tabs>
  );
}
