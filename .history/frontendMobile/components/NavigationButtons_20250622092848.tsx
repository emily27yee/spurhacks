import React from 'react';
import { View, TouchableOpacity, StyleSheet, Image} from 'react-native';
import { router } from 'expo-router';

interface NavigationButtonsProps {
  style?: any;
  showProfileButton?: boolean;
  showGroupsButton?: boolean;
  showCameraButton?: boolean;
  position?: 'top' | 'bottom';
}

const NavigationButtons = ({ 
  style, 
  showProfileButton = true,
  showGroupsButton = true,
  showCameraButton = true,
  position = 'top'
}: NavigationButtonsProps) => {
  
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
    router.push('/camera');
  };

  const containerStyle = position === 'top' ? styles.topContainer : styles.bottomContainer;

  return (
    <View style={[containerStyle, style]}>
      {showGroupsButton && (
        <TouchableOpacity style={styles.navButton} onPress={handleGroupsPress}>
          <Image 
            source={require('@/assets/images/groups-icon.png')} 
            style={styles.iconImage}
            resizeMode="contain"
          />
        </TouchableOpacity>
      )}

      {showCameraButton && (
        <TouchableOpacity style={styles.navButton} onPress={handleCameraPress}>
          <Image 
            source={require('@/assets/images/house-icon.png')} 
            style={styles.iconImage}
            resizeMode="contain"
          />
        </TouchableOpacity>
      )}

      {showProfileButton && (
        <TouchableOpacity style={styles.navButton} onPress={handleProfilePress}>
          <Image 
            source={require('@/assets/images/profile-icon.png')} 
            style={styles.iconImage}
            resizeMode="contain"
          />
        </TouchableOpacity>
      )}
    </View>
  );
}

export default React.memo(NavigationButtons);

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
    bottom: 40,
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
  iconImage: {
    width: 28,
    height: 28,
    tintColor: '#1C1C1C', // This will make the icons black
  },
});