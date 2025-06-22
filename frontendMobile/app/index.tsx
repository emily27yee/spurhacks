import { useEffect } from 'react';
import { router } from 'expo-router';
import { View, ActivityIndicator, Image } from 'react-native';

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
        // User is authenticated, redirect to splash screen first
        router.replace('/splash');
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
        backgroundColor: '#F5EFE6' // Use the app's beige background
      }}>
        <Image 
          source={require('@/assets/images/dumpster-fire.gif')} 
          style={{ 
            width: 200, 
            height: 200, 
            marginBottom: 20 
          }} 
          resizeMode="contain"
        />
        <ActivityIndicator size="large" color="#E85D42" />
        <ThemedText style={{ 
          marginTop: 20, 
          opacity: 0.8, 
          fontSize: 18,
          fontWeight: '600',
          color: '#1C1C1C'
        }}>
          Loading Week Dump...
        </ThemedText>
      </ThemedView>
    );
  }

  // This should not render as useEffect will redirect
  return null;
} 