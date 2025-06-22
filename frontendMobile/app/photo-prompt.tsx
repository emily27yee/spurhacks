import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Dimensions, SafeAreaView } from 'react-native';
import { router } from 'expo-router';

import { useColorScheme } from '@/hooks/useColorScheme';
import { Colors } from '@/constants/Colors';
import NavigationButtons from '@/components/NavigationButtons';

const { width, height } = Dimensions.get('window');

export default function PhotoPromptScreen() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  const handleTakePhoto = () => {
    router.push('/camera');
  };

  const handleChooseFromLibrary = () => {
    router.push({ pathname: '/camera', params: { mode: 'library' } as any });
  };



  return (
    <SafeAreaView style={styles.container}>
             {/* Navigation Buttons */}
       <NavigationButtons position="bottom" />

      {/* Decorative scribble */}
      <View style={styles.topScribble} />

      {/* Prompt content */}
      <View style={styles.contentWrapper}>
        <Text style={styles.promptLabel}>PROMPT</Text>
        <Text style={styles.promptText}>take a photo{"\n"}without using{"\n"}your hands</Text>

        <View style={styles.buttonGroup}>
          <TouchableOpacity style={styles.button} onPress={handleTakePhoto}>
            <Text style={styles.buttonTitle}>take photo</Text>
            <Text style={styles.buttonArrow}>›</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.button} onPress={handleChooseFromLibrary}>
            <Text style={styles.buttonTitle}>choose from library</Text>
            <Text style={styles.buttonArrow}>›</Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5EFE6', // Beige background to match mock-up
  },
  topScribble: {
    position: 'absolute',
    top: height * 0.04,
    right: width * 0.06,
    width: 120,
    height: 40,
    borderWidth: 5,
    borderColor: '#E85D42',
    transform: [{ rotate: '15deg' }],
  },
  contentWrapper: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  promptLabel: {
    fontSize: 24,
    fontWeight: '700',
    color: '#E85D42',
    marginBottom: 8,
  },
  promptText: {
    fontSize: 36,
    fontWeight: '700',
    lineHeight: 42,
    color: '#1C1C1C',
    marginBottom: 48,
  },
  buttonGroup: {
    gap: 20,
  },
  button: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#F7C52D',
    borderRadius: 16,
    paddingVertical: 18,
    paddingHorizontal: 24,
  },
  buttonTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1C1C1C',
    textTransform: 'lowercase',
  },
  buttonArrow: {
    fontSize: 26,
    fontWeight: 'bold',
    color: '#1C1C1C',
  },
}); 