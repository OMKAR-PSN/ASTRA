import { Tabs } from 'expo-router';
import { Text, useWindowDimensions } from 'react-native';

import { navItems } from '@/constants/navigation';
import { colors, fonts, layout } from '@/constants/theme';

export default function TabLayout() {
  const { width } = useWindowDimensions();
  const isDesktop = width >= layout.desktopBreakpoint;

  return (
    <Tabs
      tabBar={isDesktop ? () => null : undefined}
      screenOptions={{
        headerShown: false,
        tabBarActiveBackgroundColor: 'rgba(80, 222, 216, 0.08)',
        tabBarActiveTintColor: colors.primary[400],
        tabBarInactiveTintColor: colors.slate[300],
        tabBarStyle: {
          backgroundColor: '#0D1828',
          borderTopColor: colors.navy[600],
          minHeight: 68,
          paddingTop: 7,
          paddingBottom: 7,
        },
        tabBarLabelStyle: {
          fontFamily: fonts.semibold,
          fontSize: 11,
          marginHorizontal: 0,
        },
      }}
    >
      <Tabs.Screen name="report" options={{ href: null }} />
      {navItems.map(({ routeName, label, Icon }) => (
        <Tabs.Screen
          key={routeName}
          name={routeName}
          options={{
            title: label,
            tabBarLabel: ({ color }) => <Text style={{ color, fontFamily: fonts.semibold, fontSize: 11, lineHeight: 14, textAlign: 'center' }}>{label}</Text>,
            tabBarIcon: ({ color, size }) => <Icon color={color} size={size} strokeWidth={2} />,
          }}
        />
      ))}
    </Tabs>
  );
}
