import { Tabs } from 'expo-router';
import React from 'react';

import { HapticTab } from '@/components/HapticTab';
import { IconSymbol } from '@/components/ui/IconSymbol';

const ORANGE = '#E85D42';
const BEIGE = '#F5EFE6';

export default function TabLayout() {

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: ORANGE,
        tabBarInactiveTintColor: '#1C1C1C',
        headerShown: false,
        tabBarButton: HapticTab,
<<<<<<< HEAD
        tabBarBackground: TabBarBackground,
=======
        tabBarStyle: {
          backgroundColor: BEIGE,
          borderTopWidth: 0,
          elevation: 0,
          shadowOpacity: 0,
          height: Platform.OS === 'ios' ? 85 : 60,
          paddingBottom: Platform.OS === 'ios' ? 20 : 10,
          paddingTop: 10,
        },
>>>>>>> origin/main
      }}>
      <Tabs.Screen
        name="camera"
        options={{
<<<<<<< HEAD
          title: 'Game',
          tabBarIcon: ({ color }) => <IconSymbol size={28} name="camera.fill" color={color} />,
=======
          // Dashboard is deprecated; index simply redirects to camera.
          tabBarButton: () => null,
>>>>>>> origin/main
        }}
      />
      <Tabs.Screen
        name="groups"
        options={{
          title: 'Groups',
          tabBarIcon: ({ color }) => <IconSymbol size={28} name="person.2.fill" color={color} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'profile',
          tabBarIcon: ({ color }) => <IconSymbol size={24} name="person.circle.fill" color={color} />,
          tabBarLabelStyle: {
            fontSize: 12,
            fontWeight: '600',
            textTransform: 'lowercase',
          },
        }}
      />
    </Tabs>
  );
}
