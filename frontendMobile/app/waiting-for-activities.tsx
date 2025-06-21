import React, { useState, useEffect } from 'react';
import { SafeAreaView, View, TouchableOpacity, ActivityIndicator, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import WaitingForActivities from '@/components/WaitingForActivities';
import { useAuth } from '@/contexts/AuthContext';
import { useGroups } from '@/hooks/useGroups';
import { ThemedText } from '@/components/ThemedText';
import { useColorScheme } from '@/hooks/useColorScheme';
import { Colors } from '@/constants/Colors';

export default function WaitingForActivitiesPage() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  const { user } = useAuth();
  const { userGroups, isLoading } = useGroups();
  const [groupId, setGroupId] = useState<string | null>(null);
  const insets = useSafeAreaInsets();

  useEffect(() => {
    if (!user || isLoading) return;

    // Find a group where the current user has already submitted today's photo
    const groupWithUpload = userGroups.find((g: any) => {
      try {
        const todayData = g.todaydata ? JSON.parse(g.todaydata) : {};
        return !!todayData[user.$id];
      } catch {
        return false;
      }
    });

    if (groupWithUpload) {
      setGroupId(groupWithUpload.$id);
    } else {
      // No upload found yet – stay on this page and wait
      setGroupId(null);
    }
  }, [user, userGroups, isLoading]);

  const handleActivityReady = () => {
    // Go to games for this specific group
    router.replace(`/(tabs)?showGames=true&groupId=${groupId}`);
  };

  const handleBack = () => router.replace('/(tabs)/camera');

  if (!groupId) {
    return (
      <SafeAreaView style={[styles.loadingContainer, { backgroundColor: colors.background }]}> 
        <ActivityIndicator size="large" color={colors.tint} />
        <ThemedText style={{ marginTop: 12, color: colors.text }}>Waiting for your photo upload...</ThemedText>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      {/* Header */}
      <View style={{
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 10,
        paddingTop: insets.top + 10,
        paddingBottom: 10,
      }}>
        <TouchableOpacity onPress={handleBack} style={styles.backBtn}>
          <ThemedText style={[styles.backText, { color: colors.tint }]}>← Back</ThemedText>
        </TouchableOpacity>
        <ThemedText style={styles.headerTitle}>Status</ThemedText>
        <View style={styles.backBtn} />
      </View>

      {/* Waiting component */}
      <WaitingForActivities selectedGroupId={groupId} onActivityReady={handleActivityReady} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 12,
  },
  backBtn: {
    width: 60,
    justifyContent: 'center',
    alignItems: 'flex-start',
  },
  backText: {
    fontSize: 16,
    fontWeight: '600',
  },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    fontSize: 20,
    fontWeight: 'bold',
  },
}); 