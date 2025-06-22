import React, { useState, useEffect } from 'react';
import { SafeAreaView, View, TouchableOpacity, ActivityIndicator, StyleSheet } from 'react-native';
import { router } from 'expo-router';

import WaitingForActivities from '@/components/WaitingForActivities';
import { useAuth } from '@/contexts/AuthContext';
import { useGroups } from '@/hooks/useGroups';
import { ThemedText } from '@/components/ThemedText';

const ORANGE = '#E85D42';

export default function WaitingForActivitiesPage() {
  const { user } = useAuth();
  const { userGroups, isLoading } = useGroups();
  const [groupId, setGroupId] = useState<string | null>(null);

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

  const handleBack = () => router.replace('/camera');

  if (!groupId) {
    return (
      <SafeAreaView style={styles.loadingContainer}> 
        <ActivityIndicator size="large" color={ORANGE} />
        <ThemedText style={styles.loadingText}>waiting for your photo upload...</ThemedText>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <WaitingForActivities selectedGroupId={groupId} onActivityReady={handleActivityReady} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5EFE6',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F5EFE6',
  },
  loadingText: {
    marginTop: 12,
    color: '#1C1C1C',
    fontSize: 16,
    textTransform: 'lowercase',
  },
}); 