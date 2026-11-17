import { useEffect, useRef } from 'react';
import { Platform, View, type ViewInstance } from 'react-native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useFonts } from 'expo-font';
import * as SplashScreen from 'expo-splash-screen';
import { Inter_400Regular, Inter_600SemiBold, Inter_700Bold } from '@expo-google-fonts/inter';

import { PrivacyShield } from '@/components/PrivacyShield';
import { PresentationSession } from '@/state/PresentationSession';
import { PrivacyShieldProvider, usePrivacyShield } from '@/state/PrivacyShieldProvider';
import { VoiceGuidanceProvider } from '@/state/VoiceGuidanceProvider';
import { useFrameworkReady } from '@/hooks/useFrameworkReady';

SplashScreen.preventAutoHideAsync();

function AppShell() {
  const shield = usePrivacyShield();
  const shellRef = useRef<ViewInstance>(null);

  useEffect(() => {
    if (Platform.OS !== 'web' || !shellRef.current) return;
    const node = shellRef.current as unknown as HTMLElement;
    if (shield.active) node.setAttribute('inert', '');
    else node.removeAttribute('inert');
    return () => node.removeAttribute('inert');
  }, [shield.active]);

  return (
    <View style={{ flex: 1 }}>
      <View
        ref={shellRef}
        testID="app-shell"
        style={{ flex: 1 }}
        aria-hidden={shield.active || undefined}
        accessibilityElementsHidden={shield.active}
        importantForAccessibility={shield.active ? 'no-hide-descendants' : 'auto'}
      >
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="identify" />
          <Stack.Screen name="guided-check-in" />
          <Stack.Screen name="journey" />
          <Stack.Screen name="replay" />
          <Stack.Screen name="knowledge" />
          <Stack.Screen name="knowledge/[cardId]" />
          <Stack.Screen name="voice-settings" />
          <Stack.Screen name="privacy" />
          <Stack.Screen name="personal" />
          <Stack.Screen name="crew-summary" />
          <Stack.Screen name="+not-found" />
        </Stack>
      </View>
      {shield.active ? <PrivacyShield /> : null}
      <StatusBar style="light" />
    </View>
  );
}

export default function RootLayout() {
  useFrameworkReady();

  const [fontsLoaded, fontError] = useFonts({
    'Inter-Regular': Inter_400Regular,
    'Inter-SemiBold': Inter_600SemiBold,
    'Inter-Bold': Inter_700Bold,
  });

  useEffect(() => {
    if (fontsLoaded || fontError) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded, fontError]);

  if (!fontsLoaded && !fontError) {
    return null;
  }

  return (
    <PresentationSession>
      <VoiceGuidanceProvider>
        <PrivacyShieldProvider>
          <AppShell />
        </PrivacyShieldProvider>
      </VoiceGuidanceProvider>
    </PresentationSession>
  );
}
