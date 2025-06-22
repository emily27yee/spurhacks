import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Alert,
  TouchableOpacity,
  ScrollView,
  Modal,
  ActivityIndicator,
  SafeAreaView,
  Image,
} from 'react-native';
import { CameraView, CameraType, useCameraPermissions } from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system';
import { useAuth } from '@/contexts/AuthContext';
import { useGroups } from '@/hooks/useGroups';
import { appwriteDatabase } from '@/lib/appwrite';
import { Colors } from '@/constants/Colors';
import { useColorScheme } from '@/hooks/useColorScheme';
import { useLocalSearchParams, router } from 'expo-router';
import NavigationButtons from '@/components/NavigationButtons';

// Daily prompts (hardcoded for now)
const DAILY_PROMPTS = [
  "Share your morning coffee ☕",
  "Show us your workspace 💻",
  "Capture a moment of joy 😊",
  "Your favorite view 🌅",
  "Something that made you smile 😄",
  "Your lunch today 🍽️",
  "A random act of kindness 💕",
  "Your pet or a cute animal 🐕",
  "Something creative you made 🎨",
  "Your evening sunset 🌇"
];



const getTodaysPrompt = () => {
  const dayOfYear = Math.floor((Date.now() - new Date(new Date().getFullYear(), 0, 0).getTime()) / (1000 * 60 * 60 * 24));
  // return DAILY_PROMPTS[dayOfYear % DAILY_PROMPTS.length];
  return "An object that could be a cartoon weapon in a cartoon",
};



export default function CameraScreen() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const { user } = useAuth();
  const { userGroups, isLoading: groupsLoading, fetchUserGroups } = useGroups();
  const [permission, requestPermission] = useCameraPermissions();
  const [cameraType, setCameraType] = useState<CameraType>('back');
  const [showCamera, setShowCamera] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [showGroupSelector, setShowGroupSelector] = useState(false);
  const [selectedGroups, setSelectedGroups] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [cameraRef, setCameraRef] = useState<CameraView | null>(null);
  const [isTakenPhoto, setIsTakenPhoto] = useState(false);
  const [cameraReady, setCameraReady] = useState(false);

  // If the page is opened with ?mode=library, trigger the image picker automatically once.
  const { mode } = useLocalSearchParams<{ mode?: string }>();
  const hasAutoOpened = useRef(false);

  useEffect(() => {
    if (!hasAutoOpened.current && mode === 'library') {
      // Delay slightly to ensure the component has mounted and permissions are fetched
      setTimeout(() => {
        handlePickImage();
      }, 300);
      hasAutoOpened.current = true;
    }
  }, [mode]);

  const todaysPrompt = getTodaysPrompt();

  // Determine groups where user hasn't uploaded today
  const availableGroups = React.useMemo(() => {
    if (!user) return [] as any[];
    const filtered = userGroups.filter((g: any) => {
      try {
        const td = g.todaydata ? JSON.parse(g.todaydata) : {};
        const hasUploaded = !!td[user.$id];
        console.log(`Group ${g.name}: todaydata=${g.todaydata}, hasUploaded=${hasUploaded}`);
        return !hasUploaded;
      } catch {
        return true;
      }
    });
    console.log(`Available groups: ${filtered.length}/${userGroups.length}`);
    return filtered;
  }, [userGroups, user]);

  // Check if user should be redirected to waiting screen
  useEffect(() => {
    if (!groupsLoading && availableGroups.length === 0 && userGroups.length > 0) {
      // User has uploaded to all groups, redirect to waiting screen
      router.replace('/waiting-for-activities' as any);
    }
  }, [availableGroups, userGroups, groupsLoading]);
  const handleTakePhoto = async () => {
    if (!permission?.granted) {
      const permissionResult = await requestPermission();
      if (!permissionResult.granted) {
        Alert.alert("Permission Required", "Camera permission is required to take photos.");
        return;
      }
    }

    if (availableGroups.length === 0) {
      Alert.alert(
        "Join a Group First",
        "You need to be part of a group to share photos. Go to your profile to join or create a group!"
      );
      return;
    }

    setShowCamera(true);
  };

  const handlePickImage = async () => {
    if (availableGroups.length === 0) {
      Alert.alert(
        "Join a Group First",
        "You need to be part of a group to share photos. Go to your profile to join or create a group!"
      );
      return;
    }    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
      presentationStyle: ImagePicker.UIImagePickerPresentationStyle.AUTOMATIC,
    });

    if (!result.canceled && result.assets[0]) {
      setSelectedImage(result.assets[0].uri);
      setIsTakenPhoto(false); // Mark as library photo, don't delete
      setShowGroupSelector(true);
    }
  };
  const takePicture = async () => {
    if (cameraRef && cameraReady) {
      try {
        const photo = await cameraRef.takePictureAsync({
          quality: 0.8,
          base64: false,
          exif: false,
        });
        
        // Save the photo to device storage
        const fileName = `photo_${Date.now()}.jpg`;
        const newPath = FileSystem.documentDirectory + fileName;
          await FileSystem.moveAsync({
          from: photo.uri,
          to: newPath,
        });
        
        setSelectedImage(newPath);
        setIsTakenPhoto(true); // Mark as taken photo for cleanup
        setShowCamera(false);
        setShowGroupSelector(true);
      } catch (error) {
        console.error('Error taking/saving photo:', error);
        Alert.alert('Error', 'Failed to take photo. Please try again.');
      }
    } else {
      Alert.alert('Error', 'Camera is not ready. Please wait a moment and try again.');
    }
  };

  const handleGroupSelection = (groupId: string) => {
    setSelectedGroups(prev => 
      prev.includes(groupId) 
        ? prev.filter(id => id !== groupId)
        : [...prev, groupId]
    );
  };

  const handleUpload = async () => {
    if (!selectedImage || !user || selectedGroups.length === 0) {
      Alert.alert("Error", "Please select at least one group to share your photo with.");
      return;
    }

    setUploading(true);
    try {
      const result = await appwriteDatabase.uploadPhoto(
        selectedImage,
        user.$id,
        selectedGroups,
        todaysPrompt
      );      // Update todaydata for each selected group
      if (result.photoId) {
        await Promise.all(
          selectedGroups.map(async (gid) => {
            await appwriteDatabase.addPhotoToGroupTodayData(user.$id, gid, result.photoId);
          })
        );
      }

      // Clean up temporary photo if it was taken with the app
      if (isTakenPhoto && selectedImage) {
        await FileSystem.deleteAsync(selectedImage);
      }

      // Directly clean up and close modal without showing success alert
      setSelectedImage(null);
      setSelectedGroups([]);
      setShowGroupSelector(false);
      setIsTakenPhoto(false);
      fetchUserGroups(true);
    } catch (error) {
      console.error("Upload error:", error);
      Alert.alert("Error", "Failed to upload photo. Please try again.");
    } finally {
      setUploading(false);
    }
  };



  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: '#F5EFE6', // Beige background to match mock-up
    },

    topScribble: {
      position: 'absolute',
      top: 60,
      right: 30,
      width: 120,
      height: 40,
      borderWidth: 5,
      borderColor: '#E85D42',
      transform: [{ rotate: '15deg' }],
    },
    topRightImage: {
      position: 'absolute',
      top: -70,
      right: 0,
      width: 450, // Made smaller (approximately 30% reduction from typical size)
      height: 450,
    },
    contentWrapper: {
      flex: 1,
      justifyContent: 'center',
      paddingHorizontal: 32,
      paddingTop: 200, // Shift content down to avoid interfering with top right image
    },
    promptLabel: {
      fontSize: 24,
      fontWeight: '700',
      color: '#E85D42',
      marginBottom: 8,
    },
    promptText: {
      fontSize: 42,
      fontWeight: '700',
      lineHeight: 48,
      color: '#1C1C1C',
      marginBottom: -8,
    },
    buttonGroup: {
      gap: 20,
      marginTop: 30,
    },
    button: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      backgroundColor: '#F7C52D',
      borderRadius: 16,
      paddingVertical: 18,
      paddingHorizontal: 24,
      shadowColor: '#000',
      shadowOffset: {
        width: 0,
        height: 4,
      },
      shadowOpacity: 0.3,
      shadowRadius: 4,
      elevation: 8,
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
      color: '#1C1C1C'
    },
    disabledButton: {
      backgroundColor: colors.tabIconDefault,
    },
    camera: {
      flex: 1,
    },
    cameraContainer: {
      flex: 1,
    },
    cameraControls: {
      position: 'absolute',
      bottom: 50,
      left: 0,
      right: 0,
      flexDirection: 'row',
      justifyContent: 'space-around',
      alignItems: 'center',
      paddingHorizontal: 20,
    },
    cameraButton: {
      backgroundColor: 'white',
      width: 70,
      height: 70,
      borderRadius: 35,
      justifyContent: 'center',
      alignItems: 'center',
    },
    flipButton: {
      backgroundColor: 'rgba(255, 255, 255, 0.8)',
      padding: 15,
      borderRadius: 25,
    },
    closeButton: {
      backgroundColor: 'rgba(255, 255, 255, 0.8)',
      padding: 15,
      borderRadius: 25,
    },
    modal: {
      flex: 1,
      backgroundColor: 'rgba(28, 28, 28, 0.8)', // Darker overlay to match design
      justifyContent: 'center',
      alignItems: 'center',
    },
    modalContent: {
      backgroundColor: '#F5EFE6', // Beige background to match main design
      borderRadius: 24,
      padding: 24,
      width: '90%',
      maxHeight: '85%',
      shadowColor: '#000',
      shadowOffset: {
        width: 0,
        height: 8,
      },
      shadowOpacity: 0.4,
      shadowRadius: 12,
      elevation: 16,
      borderWidth: 3,
      borderColor: '#E85D42', // Orange border accent
    },
    modalTitle: {
      fontSize: 24,
      fontWeight: '700',
      color: '#E85D42', // Orange color like other headings
      marginBottom: 8,
      textAlign: 'center',
      textTransform: 'uppercase',
      letterSpacing: 1,
    },
    modalSubtitle: {
      fontSize: 16,
      fontWeight: '600',
      color: '#1C1C1C',
      marginBottom: 20,
      textAlign: 'center',
    },
    selectedImageContainer: {
      alignItems: 'center',
      marginBottom: 24,
    },
    selectedImage: {
      width: 260,
      height: 260,
      borderRadius: 20,
      marginBottom: 12,
      borderWidth: 4,
      borderColor: '#E85D42', // Orange border around image
      shadowColor: '#000',
      shadowOffset: {
        width: 0,
        height: 4,
      },
      shadowOpacity: 0.3,
      shadowRadius: 6,
      elevation: 8,
    },
    groupsList: {
      maxHeight: 220,
      marginBottom: 24,
    },
    groupItem: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: 16,
      backgroundColor: '#FFFFFF', // White background for contrast
      borderRadius: 16,
      marginBottom: 12,
      borderWidth: 2,
      borderColor: '#E85D42', // Orange border
      shadowColor: '#000',
      shadowOffset: {
        width: 0,
        height: 2,
      },
      shadowOpacity: 0.2,
      shadowRadius: 4,
      elevation: 4,
    },
    selectedGroupItem: {
      backgroundColor: '#F7C52D', // Yellow background when selected
      borderColor: '#E85D42', // Keep orange border
      borderWidth: 3, // Thicker border when selected
    },
    groupText: {
      fontSize: 17,
      fontWeight: '600',
      color: '#1C1C1C',
      marginLeft: 12,
    },
    selectedGroupText: {
      color: '#1C1C1C', // Keep dark text even when selected
      fontWeight: '700',
    },
    modalButtons: {
      flexDirection: 'row',
      gap: 16,
    },
    modalButton: {
      flex: 1,
      paddingVertical: 18,
      paddingHorizontal: 24,
      borderRadius: 16,
      alignItems: 'center',
      shadowColor: '#000',
      shadowOffset: {
        width: 0,
        height: 4,
      },
      shadowOpacity: 0.3,
      shadowRadius: 6,
      elevation: 8,
      borderWidth: 2,
    },
    cancelButton: {
      backgroundColor: '#FFFFFF', // White background
      borderColor: '#E85D42', // Orange border
    },
    uploadButton: {
      backgroundColor: '#F7C52D', // Yellow background to match main buttons
      borderColor: '#E85D42', // Orange border
    },
    modalButtonText: {
      fontSize: 17,
      fontWeight: '700',
      textTransform: 'lowercase',
    },
    cancelButtonText: {
      color: '#E85D42', // Orange text for cancel button
    },
    uploadButtonText: {
      color: '#1C1C1C', // Dark text for upload button
    },
    loadingContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
    },
    noGroupsText: {
      fontSize: 16,
      color: colors.tabIconDefault,
      textAlign: 'center',
      marginTop: 20,
    },
  });
  if (!permission) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.tint} />
          <Text style={[styles.noGroupsText, { marginTop: 10 }]}>
            Requesting camera permission...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!permission.granted) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <Text style={[styles.noGroupsText, { textAlign: 'center', fontSize: 18 }]}>
            Camera Permission Required
          </Text>
          <Text style={[styles.noGroupsText, { marginTop: 10 }]}>
            This app needs camera access to take photos for sharing with your groups.
          </Text>
          <TouchableOpacity
            style={[styles.button, { marginTop: 20, width: 200 }]}
            onPress={requestPermission}
          >
            <Text style={styles.buttonTitle}>Grant Permission</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  if (groupsLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.tint} />
          <Text style={[styles.noGroupsText, { marginTop: 10 }]}>
            Loading your groups...
          </Text>
        </View>
      </SafeAreaView>
    );
  }
  if (showCamera) {
    return (
      <View style={styles.cameraContainer}>
        <CameraView
          style={styles.camera}
          facing={cameraType}
          ref={setCameraRef}
          onCameraReady={() => setCameraReady(true)}
          onMountError={(error) => {
            console.error('Camera mount error:', error);
            Alert.alert('Camera Error', 'Failed to initialize camera. Please try again.');
            setShowCamera(false);
          }}
        />
        <View style={styles.cameraControls}>
          <TouchableOpacity
            style={styles.closeButton}
            onPress={() => {
              setShowCamera(false);
              setCameraReady(false);
            }}
          >
            <Text style={{ fontSize: 16, fontWeight: 'bold' }}>✕</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.cameraButton, !cameraReady && { opacity: 0.5 }]}
            onPress={takePicture}
            disabled={!cameraReady}
          >
            <View style={{
              width: 50,
              height: 50,
              borderRadius: 25,
              backgroundColor: cameraReady ? '#007AFF' : '#cccccc',
            }} />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.flipButton}
            onPress={() => setCameraType(current => current === 'back' ? 'front' : 'back')}
          >
            <Text style={{ fontSize: 16, fontWeight: 'bold' }}>🔄</Text>
          </TouchableOpacity>
        </View>
        {!cameraReady && (
          <View style={[styles.loadingContainer, { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.3)' }]}>
            <ActivityIndicator size="large" color="white" />
            <Text style={{ color: 'white', marginTop: 10 }}>Initializing camera...</Text>
          </View>
        )}
      </View>
    );
  }

    return (
    <>
      <SafeAreaView style={styles.container}>
        {/* Navigation Buttons */}
        <NavigationButtons position="bottom" />

        {/* Decorative scribble */}
        {/* <View style={styles.topScribble} /> */}
        
        {/* Top right image */}
        <Image 
          source={require('@/assets/images/img1.png')} 
          style={styles.topRightImage}
          resizeMode="contain"
        />

        {/* Prompt content */}
        <View style={styles.contentWrapper}>
          <Text style={styles.promptLabel}>PROMPT</Text>
          <Text style={styles.promptText}>{todaysPrompt}</Text>

          <View style={styles.buttonGroup}>
            <TouchableOpacity 
              style={[styles.button, availableGroups.length === 0 && styles.disabledButton]} 
              onPress={handleTakePhoto}
              disabled={availableGroups.length === 0}
            >
              <Text style={styles.buttonTitle}>take photo</Text>
              <Text style={styles.buttonArrow}>›</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.button, availableGroups.length === 0 && styles.disabledButton]} 
              onPress={handlePickImage}
              disabled={availableGroups.length === 0}
            >
              <Text style={styles.buttonTitle}>choose from library</Text>
              <Text style={styles.buttonArrow}>›</Text>
            </TouchableOpacity>
          </View>

          {availableGroups.length === 0 && (
            <Text style={styles.noGroupsText}>
              Join or create a group in your profile to start sharing photos!
            </Text>
          )}
        </View>
      </SafeAreaView>

      {/* Group Selection Modal */}
      <Modal
        visible={showGroupSelector}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowGroupSelector(false)}
      >
        <View style={styles.modal}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Share Photo</Text>
            <Text style={styles.modalSubtitle}>Select groups to share with</Text>
            
            {selectedImage && (
              <View style={styles.selectedImageContainer}>
                <Image source={{ uri: selectedImage }} style={styles.selectedImage} />
                <Text style={[styles.promptText, { color: '#1C1C1C', fontSize: 16, textAlign: 'center' }]}>
                  {todaysPrompt}
                </Text>
              </View>
            )}

            <ScrollView style={styles.groupsList}>
              {availableGroups.map((group) => (
                <TouchableOpacity
                  key={group.$id}
                  style={[
                    styles.groupItem,
                    selectedGroups.includes(group.$id) && styles.selectedGroupItem
                  ]}
                  onPress={() => handleGroupSelection(group.$id)}
                >
                  <Text style={[
                    styles.groupText,
                    selectedGroups.includes(group.$id) && styles.selectedGroupText
                  ]}>
                    <Text>{selectedGroups.includes(group.$id) ? '✓' : '○'}</Text> {group.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => {
                  // Clean up temporary photo if it was taken with the app
                  if (isTakenPhoto && selectedImage) {
                    FileSystem.deleteAsync(selectedImage).catch(error => {
                      console.log('Could not delete temporary photo:', error);
                    });
                  }
                  
                  setShowGroupSelector(false);
                  setSelectedImage(null);
                  setSelectedGroups([]);
                  setIsTakenPhoto(false);
                  fetchUserGroups(true);
                }}
              >
                <Text style={[styles.modalButtonText, styles.cancelButtonText]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.uploadButton]}
                onPress={handleUpload}
                disabled={uploading || selectedGroups.length === 0}
              >
                {uploading ? (
                  <ActivityIndicator color="#1C1C1C" />
                ) : (
                  <Text style={[styles.modalButtonText, styles.uploadButtonText]}>
                    Share ({selectedGroups.length})
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
} 