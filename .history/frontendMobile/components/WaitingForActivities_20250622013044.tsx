import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
  Image,
  SafeAreaView,
} from 'react-native';
import { useAuth } from '@/contexts/AuthContext';
import { appwriteDatabase, appwriteConfig, databases } from '@/lib/appwrite';
import { Colors } from '@/constants/Colors';
import { useColorScheme } from '@/hooks/useColorScheme';

const ORANGE = '#E85D42';

interface WaitingForActivitiesProps {
  selectedGroupId: string;
  onActivityReady: () => void;
}

export default function WaitingForActivities({ selectedGroupId, onActivityReady }: WaitingForActivitiesProps) {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const { user } = useAuth();
  
  const [groupPhotos, setGroupPhotos] = useState<Array<{id: string, userId: string, uri: string}>>([]);
  const [loading, setLoading] = useState(true);
  const [totalMembers, setTotalMembers] = useState(0);
  const [submittedCount, setSubmittedCount] = useState(0);
  const photoUrlCacheRef = useRef<Record<string, string>>({});

  useEffect(() => {
    let interval: any;
    
    const checkActivityStatus = async () => {
      try {
        const groupData = await appwriteDatabase.getGroupData(selectedGroupId);
        
        // Parse today's data to count submissions
        let todayData: Record<string, string> = {};
        if (groupData.todaydata) {
          try {
            todayData = JSON.parse(groupData.todaydata);
          } catch (e) { 
            console.error('Error parsing todaydata:', e); 
          }
        }

        // Parse group members to get total count
        let groupMembers: any[] = [];
        if (groupData.members) {
          try {
            groupMembers = JSON.parse(groupData.members);
          } catch (e) {
            console.error('Error parsing group members:', e);
          }
        }

        const memberCount = groupMembers.length;
        const photoCount = Object.keys(todayData).length;
        
        setTotalMembers(memberCount);
        setSubmittedCount(photoCount);

        // Load photos for display - only fetch URLs for new photos
        const photos = [];
        
        for (const [userId, photoId] of Object.entries(todayData)) {
          let photoUrl = photoUrlCacheRef.current[photoId];
          
          if (!photoUrl) {
            // Only fetch URL if we don't have it cached
            try {
              photoUrl = await appwriteDatabase.getPhotoUrl(photoId);
              photoUrlCacheRef.current[photoId] = photoUrl;
              console.log('Fetched new photo URL for:', photoId);
            } catch (error) {
              console.error('Error loading photo:', error);
              continue;
            }
          }
          
          photos.push({ id: photoId, userId: userId, uri: photoUrl });
        }
        
        setGroupPhotos(photos);

        // Check if activity is ready (all members have submitted photos)
        if (photoCount >= memberCount && memberCount > 0) {
          // All photos submitted, check if activity is active
          if (groupData.activityactive) {
            onActivityReady();
            return;
          } else {
            // All photos submitted but activity not active yet - activate it
            try {
              await databases.updateDocument(
                appwriteConfig.databaseId,
                appwriteConfig.groupDataCollectionId,
                selectedGroupId,
                { activityactive: true }
              );
              console.log('Activated activity for group:', selectedGroupId);
              onActivityReady();
              return;
            } catch (error) {
              console.error('Error activating activity:', error);
            }
          }
        }
        
        setLoading(false);
      } catch (error) {
        console.error('Error checking activity status:', error);
        setLoading(false);
      }
    };

    // Initial check
    checkActivityStatus();

    // Poll every 5 seconds
    interval = setInterval(checkActivityStatus, 5000);

    return () => {
      if (interval) {
        clearInterval(interval);
      }
    };
  }, [selectedGroupId, onActivityReady]);

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.tint} />
          <Text style={styles.loadingText}>Checking activity status...</Text>
        </View>
      </SafeAreaView>
    );
  }

  const allPhotosSubmitted = submittedCount >= totalMembers && totalMembers > 0;

  return (
    <SafeAreaView style={styles.container}>
      {/* Decorative scribble */}
      <View style={styles.topScribble} />
      
      {/* Top image */}
      <Image 
        source={require('@/assets/images/img2.png')} 
        style={styles.topImage}
        resizeMode="contain"
      />

      <ScrollView contentContainerStyle={styles.contentWrapper}>
        {/* Label */}
        <Text style={styles.promptLabel}>STATUS</Text>
        {/* Main prompt text */}
        <Text style={styles.promptText}>
          {allPhotosSubmitted
            ? 'waiting for game to start'
            : 'Digging through the dumpster'}
        </Text>

        {/* Photos grid (only show if >0) */}
        {groupPhotos.length > 0 && (
          <View style={styles.photosGridWrapper}>
            <View style={styles.photosGrid}>
              {groupPhotos.map((photo) => (
                <Image key={photo.id} source={{ uri: photo.uri }} style={styles.photoThumb} />
              ))}
              {Array.from({ length: totalMembers - submittedCount }).map((_, idx) => (
                <View key={`ph-${idx}`} style={styles.photoPlaceholder} />
              ))}
            </View>
          </View>
        )}

        {/* Progress section */}
        <View style={styles.progressContainer}>
          <View style={styles.progressBarBg}>
            <View
              style={[styles.progressBarFill, { width: `${totalMembers > 0 ? (submittedCount / totalMembers) * 100 : 0}%` }]}
            />
          </View>
          <Text style={styles.progressText}>
            {totalMembers > 0 ? Math.round((submittedCount / totalMembers) * 100) : 0}% complete
          </Text>
        </View>

        {/* What's happening */}
        <View style={styles.statusContainer}>
          <Text style={styles.statusTitle}>
            {allPhotosSubmitted ? '🎮 get ready!' : '⏰ hang tight!'}
          </Text>
          <Text style={styles.statusText}>
            {allPhotosSubmitted 
              ? 'all photos are in! the game activity will begin automatically once it\'s time to play!'
              : 'we\'re waiting for everyone to submit their photos. the activity will start once all photos are in!'
            }
          </Text>
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5EFE6',
  },
  topScribble: {
    position: 'absolute',
    top: 60,
    right: 30,
    width: 0,
    height: 0,
    borderWidth: 0,
    borderColor: '#E85D42',
    transform: [{ rotate: '15deg' }],
  },
  topImage: {
    position: 'absolute',
    top: 50,
    left: -140,
    // right: 0,
    height: 220,
    zIndex: 1,
  },
  contentWrapper: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 32,
    paddingTop: 180, // Add top padding to accommodate the image
    paddingBottom: 40,
  },
  promptLabel: {
    fontSize: 24,
    fontWeight: '700',
    color: '#E85D42',
    marginBottom: 8,
    textAlign: 'left',
    textTransform: 'uppercase',
  },
  promptText: {
    fontSize: 36,
    fontWeight: '700',
    lineHeight: 42,
    color: '#1C1C1C',
    marginBottom: 48,
    textTransform: 'lowercase',
  },
  progressContainer: {
    marginBottom: 20,
    marginTop: 20,
    alignSelf: 'center',
    width: '90%',
  },
  progressBarBg: {
    height: 12,
    borderRadius: 6,
    backgroundColor: 'rgba(0,0,0,0.1)',
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#E85D42',
  },
  progressText: {
    marginTop: 8,
    textAlign: 'center',
    color: '#1C1C1C',
    fontWeight: '600',
    textTransform: 'lowercase',
  },
  photosGridWrapper: {
    alignItems: 'center',
  },
  photosLabel: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
    color: '#1C1C1C',
    textTransform: 'lowercase',
  },
  photosGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    justifyContent: 'center',
  },
  photoThumb: {
    width: 70,
    height: 70,
    borderRadius: 12,
  },
  photoPlaceholder: {
    width: 70,
    height: 70,
    borderRadius: 12,
    backgroundColor: 'rgba(0,0,0,0.05)',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#1C1C1C',
  },
  statusContainer: {
    marginBottom: 20,
  },
  statusTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1C1C1C',
    marginBottom: 8,
    marginTop: 16,
    textTransform: 'lowercase',
  },
  statusText: {
    fontSize: 16,
    color: '#1C1C1C',
    lineHeight: 22,
  },
  infoContainer: {
    marginBottom: 20,
  },
  infoText: {
    fontSize: 16,
    color: '#1C1C1C',
    textAlign: 'center',
    fontStyle: 'italic',
    opacity: 0.7,
  },
}); 