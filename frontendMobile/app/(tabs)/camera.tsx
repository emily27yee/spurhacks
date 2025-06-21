import React, { useState, useEffect } from 'react';
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
  return DAILY_PROMPTS[dayOfYear % DAILY_PROMPTS.length];
};

export default function CameraScreen() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const { user } = useAuth();
  const { userGroups, isLoading: groupsLoading } = useGroups();
  const [permission, requestPermission] = useCameraPermissions();
  const [cameraType, setCameraType] = useState<CameraType>('back');
  const [showCamera, setShowCamera] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [showGroupSelector, setShowGroupSelector] = useState(false);
  const [selectedGroups, setSelectedGroups] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [cameraRef, setCameraRef] = useState<any>(null);
  const [isTakenPhoto, setIsTakenPhoto] = useState(false);

  const todaysPrompt = getTodaysPrompt();

  const handleTakePhoto = async () => {
    if (!permission) {
      const permissionResult = await requestPermission();
      if (!permissionResult.granted) {
        Alert.alert("Permission Required", "Camera permission is required to take photos.");
        return;
      }
    }

    if (userGroups.length === 0) {
      Alert.alert(
        "Join a Group First",
        "You need to be part of a group to share photos. Go to your profile to join or create a group!"
      );
      return;
    }

    setShowCamera(true);
  };

  const handlePickImage = async () => {
    if (userGroups.length === 0) {
      Alert.alert(
        "Join a Group First",
        "You need to be part of a group to share photos. Go to your profile to join or create a group!"
      );
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      setSelectedImage(result.assets[0].uri);
      setIsTakenPhoto(false); // Mark as library photo, don't delete
      setShowGroupSelector(true);
    }
  };

  const takePicture = async () => {
    if (cameraRef) {
      const photo = await cameraRef.takePictureAsync({
        quality: 0.8,
      });
      
      // Save the photo to device storage
      const fileName = `photo_${Date.now()}.jpg`;
      const newPath = FileSystem.documentDirectory + fileName;
      
      try {
        await FileSystem.moveAsync({
          from: photo.uri,
          to: newPath,
        });
        
        setSelectedImage(newPath);
        setIsTakenPhoto(true); // Mark as taken photo for cleanup
        setShowCamera(false);
        setShowGroupSelector(true);
      } catch (error) {
        console.error('Error saving photo:', error);
        Alert.alert('Error', 'Failed to save photo. Please try again.');
      }
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
      await appwriteDatabase.uploadPhoto(
        selectedImage,
        user.$id,
        selectedGroups,
        todaysPrompt
      );

      // Clean up temporary photo if it was taken with the app
      if (isTakenPhoto && selectedImage) {
        await FileSystem.deleteAsync(selectedImage);
      }

      Alert.alert("Success", "Photo uploaded successfully!", [
        {
          text: "OK",
          onPress: () => {
            setSelectedImage(null);
            setSelectedGroups([]);
            setShowGroupSelector(false);
            setIsTakenPhoto(false);
          }
        }
      ]);
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
      backgroundColor: colors.background,
    },
    content: {
      flex: 1,
      padding: 20,
    },
    promptContainer: {
      backgroundColor: colors.tint,
      padding: 20,
      borderRadius: 15,
      marginBottom: 30,
      alignItems: 'center',
    },
    promptTitle: {
      fontSize: 18,
      fontWeight: 'bold',
      color: colors.background,
      marginBottom: 8,
    },
    promptText: {
      fontSize: 16,
      color: colors.background,
      textAlign: 'center',
    },
    buttonContainer: {
      gap: 15,
    },
    button: {
      backgroundColor: colors.tint,
      padding: 18,
      borderRadius: 12,
      alignItems: 'center',
    },
    buttonText: {
      color: colors.background,
      fontSize: 16,
      fontWeight: '600',
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
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      justifyContent: 'center',
      alignItems: 'center',
    },
    modalContent: {
      backgroundColor: colors.background,
      borderRadius: 20,
      padding: 20,
      width: '90%',
      maxHeight: '80%',
    },
    modalTitle: {
      fontSize: 20,
      fontWeight: 'bold',
      color: colors.text,
      marginBottom: 15,
      textAlign: 'center',
    },
    selectedImageContainer: {
      alignItems: 'center',
      marginBottom: 20,
    },
    selectedImage: {
      width: 200,
      height: 200,
      borderRadius: 15,
      marginBottom: 10,
    },
    groupsList: {
      maxHeight: 200,
      marginBottom: 20,
    },
    groupItem: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: 15,
      backgroundColor: colors.background,
      borderRadius: 10,
      marginBottom: 10,
      borderWidth: 1,
      borderColor: colors.border,
    },
    selectedGroupItem: {
      backgroundColor: colors.tint,
      borderColor: colors.tint,
    },
    groupText: {
      fontSize: 16,
      color: colors.text,
      marginLeft: 10,
    },
    selectedGroupText: {
      color: colors.background,
    },
    modalButtons: {
      flexDirection: 'row',
      gap: 10,
    },
    modalButton: {
      flex: 1,
      padding: 15,
      borderRadius: 10,
      alignItems: 'center',
    },
    cancelButton: {
      backgroundColor: colors.tabIconDefault,
    },
    uploadButton: {
      backgroundColor: colors.tint,
    },
    modalButtonText: {
      color: colors.background,
      fontSize: 16,
      fontWeight: '600',
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
        />
        <View style={styles.cameraControls}>
          <TouchableOpacity
            style={styles.closeButton}
            onPress={() => setShowCamera(false)}
          >
            <Text style={{ fontSize: 16, fontWeight: 'bold' }}>✕</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.cameraButton}
            onPress={takePicture}
          >
            <View style={{
              width: 50,
              height: 50,
              borderRadius: 25,
              backgroundColor: '#007AFF',
            }} />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.flipButton}
            onPress={() => setCameraType(current => current === 'back' ? 'front' : 'back')}
          >
            <Text style={{ fontSize: 16, fontWeight: 'bold' }}>🔄</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.content}>
        <View style={styles.promptContainer}>
          <Text style={styles.promptTitle}>Today's Prompt</Text>
          <Text style={styles.promptText}>{todaysPrompt}</Text>
        </View>

        <View style={styles.buttonContainer}>
          <TouchableOpacity
            style={[styles.button, userGroups.length === 0 && styles.disabledButton]}
            onPress={handleTakePhoto}
            disabled={userGroups.length === 0}
          >
            <Text style={styles.buttonText}>📸 Take Photo</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.button, userGroups.length === 0 && styles.disabledButton]}
            onPress={handlePickImage}
            disabled={userGroups.length === 0}
          >
            <Text style={styles.buttonText}>🖼️ Choose from Library</Text>
          </TouchableOpacity>
        </View>

        {userGroups.length === 0 && (
          <Text style={styles.noGroupsText}>
            Join or create a group in your profile to start sharing photos!
          </Text>
        )}
      </ScrollView>

      {/* Group Selection Modal */}
      <Modal
        visible={showGroupSelector}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowGroupSelector(false)}
      >
        <View style={styles.modal}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Select Groups to Share With</Text>
            
            {selectedImage && (
              <View style={styles.selectedImageContainer}>
                <Image source={{ uri: selectedImage }} style={styles.selectedImage} />
                <Text style={[styles.promptText, { color: colors.text }]}>
                  {todaysPrompt}
                </Text>
              </View>
            )}

            <ScrollView style={styles.groupsList}>
              {userGroups.map((group) => (
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
                    {selectedGroups.includes(group.$id) ? '✓' : '○'} {group.name}
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
                }}
              >
                <Text style={styles.modalButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.uploadButton]}
                onPress={handleUpload}
                disabled={uploading || selectedGroups.length === 0}
              >
                {uploading ? (
                  <ActivityIndicator color={colors.background} />
                ) : (
                  <Text style={styles.modalButtonText}>
                    Share ({selectedGroups.length})
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
} 