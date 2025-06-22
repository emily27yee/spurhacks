import { useEffect } from 'react';
import { router } from 'expo-router';
import { View, ActivityIndicator } from 'react-native';

import { useAuth } from '@/contexts/AuthContext';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { useColorScheme } from '@/hooks/useColorScheme';
import { Colors } from '@/constants/Colors';

export default function Index() {
  const { isLoggedIn, isLoading } = useAuth();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  useEffect(() => {
    if (!isLoading) {
      if (isLoggedIn) {
        // User is authenticated, redirect to main app
        router.replace('/(tabs)/camera');
      } else {
        // User is not authenticated, redirect to login
        router.replace('/login');
      }
    }
  }, [isLoggedIn, isLoading]);

  // Show loading screen while checking authentication
  if (isLoading) {
    return (
      <ThemedView style={{ 
        flex: 1, 
        justifyContent: 'center', 
        alignItems: 'center',
        backgroundColor: colors.background 
      }}>
        <ThemedText style={{ fontSize: 48, marginBottom: 20 }}>📸</ThemedText>
        <ActivityIndicator size="large" color={colors.tint} />
        <ThemedText style={{ marginTop: 20, opacity: 0.7 }}>Loading Week Dump...</ThemedText>
      </ThemedView>
    );
  }

  // This should not render as useEffect will redirect
  return null;
} 