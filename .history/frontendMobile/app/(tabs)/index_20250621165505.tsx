import React, { useEffect } from 'react';
import { SafeAreaView } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';

import Games from '@/components/Games';

// Index page now simply redirects to the camera screen.
export default function HomeRedirect() {
  const params = useLocalSearchParams() as Record<string, string | undefined>;

  // If we received a request to show games, render the Games component instead of redirecting.
  if (params.showGames === 'true' && params.groupId) {
    return (
      <SafeAreaView style={{ flex: 1 }}>
        <Games
          selectedGroupId={params.groupId as string}
          onNavigateToCamera={() => router.push('/camera')}
        />
      </SafeAreaView>
    );
  }

  // Otherwise, immediately redirect to the camera screen.
  useEffect(() => {
    router.replace('/camera');
  }, []);

  return null;
} 