import React, { useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { VideoView, useVideoPlayer } from 'expo-video';

export default function SplashScreen() {
  const player = useVideoPlayer(require('@/assets/images/dumpster.mp4'), (player) => {
    player.muted = true;
    player.loop = true;
    player.play();
  });

  useEffect(() => {
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
      <VideoView
        style={StyleSheet.absoluteFill}
        player={player}
        contentFit="fill"
        allowsFullscreen={false}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000', // Black background for video
  },
}); 