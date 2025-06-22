import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { Platform } from 'react-native';
import 'react-native-reanimated';

import { useColorScheme } from '@/hooks/useColorScheme';
import { AuthProvider } from '@/contexts/AuthContext';

// Prevent the splash screen from auto-hiding before asset loading is complete.
SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const [loaded] = useFonts({
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
  });

  useEffect(() => {
    if (loaded) {
      SplashScreen.hideAsync();
    }
  }, [loaded]);

  if (!loaded) {
    return null;
  }

  return (
    <AuthProvider>
      <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
        <Stack screenOptions={{ 
          headerShown: false,
        }}>
          <Stack.Screen name="login" />
          <Stack.Screen name="create-account" />
          <Stack.Screen name="splash" />
          <Stack.Screen name="camera" />
          <Stack.Screen name="photo-prompt" />
          <Stack.Screen name="waiting-for-activities" />
          <Stack.Screen name="(tabs)" />
        </Stack>
        <StatusBar 
          style="dark" 
          translucent={Platform.OS === 'android'} 
        />
      </ThemeProvider>
    </AuthProvider>
  );
}
