import React, { useEffect } from 'react';
import { View, StyleSheet, Animated } from 'react-native';
import { router } from 'expo-router';
import { VideoView, useVideoPlayer } from 'expo-video';
import { ThemedText } from '@/components/ThemedText';

export default function SplashScreen() {
  const fadeAnim = new Animated.Value(0);
  const player = useVideoPlayer(require('@/assets/images/dumpster.mp4'), (player) => {
    player.muted = true;
    player.loop = true;
    player.play();
  });

  useEffect(() => {
    // Fade in animation
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 500,
      useNativeDriver: true,
    }).start();

    // Wait for animation to play then redirect
    const redirectTimer = setTimeout(() => {
      router.replace('/(tabs)');
    }, 4000); // Adjust time as needed

    return () => {
      // player.pause(); // This was causing a crash on unmount
      clearTimeout(redirectTimer);
    }
  }, [player]);

  return (
    <View style={styles.container}>
      <Animated.View style={[styles.content, { opacity: fadeAnim }]}>
        <VideoView
          style={styles.dumpsterVideo}
          player={player}
          contentFit="contain"
          allowsFullscreen={false}
        />
        <ThemedText style={styles.welcomeText}>
          Welcome to the Dump! 🔥
        </ThemedText>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8f5ee',
  },
  content: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  dumpsterVideo: {
    width: 250,
    height: 250,
    marginBottom: 30,
  },
  welcomeText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1C1C1C',
    textAlign: 'center',
  },
}); 