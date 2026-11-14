import { Tabs } from 'expo-router';
import { useWindowDimensions } from 'react-native';

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
        tabBarActiveTintColor: colors.primary[400],
        tabBarInactiveTintColor: colors.slate[300],
        tabBarStyle: {
          backgroundColor: colors.navy[950],
          borderTopColor: colors.navy[600],
        },
        tabBarLabelStyle: {
          fontFamily: fonts.semibold,
          fontSize: 11,
        },
      }}
    >
      {navItems.map(({ routeName, label, Icon }) => (
        <Tabs.Screen
          key={routeName}
          name={routeName}
          options={{
            title: label,
            tabBarIcon: ({ color, size }) => <Icon color={color} size={size} strokeWidth={2} />,
          }}
        />
      ))}
    </Tabs>
  );
}
