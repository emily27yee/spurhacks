import React from 'react';
import { Link, Stack, useRouter } from 'expo-router';
import { StyleSheet, Platform, TouchableOpacity, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { Colors } from '@/constants/Colors';
import { useColorScheme } from '@/hooks/useColorScheme';

export default function NotFoundScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  
  return (
    <SafeAreaView
      style={{ flex: 1, backgroundColor: colors.background }}
      edges={['top', 'left', 'right']}>
      <Stack.Screen options={{ headerShown: false }} />
      
      {/* Custom Top Bar */}
      <View style={[
        styles.topBar,
        {
          backgroundColor: colors.background,
          paddingTop: insets.top + (Platform.OS === 'android' ? 30 : 0), // Extra padding on Android
          height: 60 + insets.top + (Platform.OS === 'android' ? 30 : 0), // Ensure the bar height accounts for extra padding
          borderBottomColor: colors.border,
        },
      ]}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <ThemedText style={[styles.backButtonText, { color: colors.tint }]}>
            ← Back
          </ThemedText>
        </TouchableOpacity>
        <ThemedText style={[styles.topBarTitle, { color: colors.text }]}>
          Oops!
        </ThemedText>
        <View style={styles.placeholder} />
      </View>
      <ThemedView style={styles.container}>
        <ThemedText type="title">This screen does not exist.</ThemedText>
        <Link href="/" style={styles.link}>
          <ThemedText type="link">Go to home screen!</ThemedText>
        </Link>
      </ThemedView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  topBar: {
    height: 60,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 10,
    borderBottomWidth: 1,
  },
  backButton: {
    padding: 8,
    minWidth: 80,
  },
  backButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  topBarTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  placeholder: {
    width: 80, // Same width as back button for centering
  },
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  link: {
    marginTop: 15,
    paddingVertical: 15,
  },
});
