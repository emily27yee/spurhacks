import React from 'react';
import { View, TouchableOpacity, Text, StyleSheet } from 'react-native';
import { router } from 'expo-router';

interface NavigationButtonsProps {
  style?: any;
  showProfileButton?: boolean;
  showGroupsButton?: boolean;
  showCameraButton?: boolean;
  position?: 'top' | 'bottom';
}

export default function NavigationButtons({ 
  style, 
  showProfileButton = true,
  showGroupsButton = true,
  showCameraButton = true,
  position = 'top'
}: NavigationButtonsProps) {
  
  const handleProfilePress = () => {
    console.log('Profile button pressed');
    router.push('/(tabs)/profile');
  };

  const handleGroupsPress = () => {
    console.log('Groups button pressed');
    router.push('/(tabs)/groups');
  };

  const handleCameraPress = () => {
    console.log('Camera button pressed');
    router.push('/(tabs)');
  };

  const containerStyle = position === 'top' ? styles.topContainer : styles.bottomContainer;

  return (
    <View style={[containerStyle, style]}>
      {showGroupsButton && (
        <TouchableOpacity style={styles.navButton} onPress={handleGroupsPress}>
          <Text style={styles.navButtonText}>👥</Text>
        </TouchableOpacity>
      )}
      
      {showCameraButton && (
        <TouchableOpacity style={styles.navButton} onPress={handleCameraPress}>
          <Text style={styles.navButtonText}>📷</Text>
        </TouchableOpacity>
      )}
      
      {showProfileButton && (
        <TouchableOpacity style={styles.navButton} onPress={handleProfilePress}>
          <Text style={styles.navButtonText}>👤</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  topContainer: {
    position: 'absolute',
    top: 60,
    left: 20,
    right: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    zIndex: 10,
  },
  bottomContainer: {
    position: 'absolute',
    bottom: 60,
    left: 20,
    right: 20,
    flexDirection: 'row',
    justifyContent: 'space-around',
    zIndex: 10,
  },
  navButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: 'rgba(245, 239, 230, 0.95)',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  navButtonText: {
    fontSize: 24,
  },
}); 