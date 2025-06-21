import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
  Image,
} from 'react-native';
import { useAuth } from '@/contexts/AuthContext';
import { appwriteDatabase } from '@/lib/appwrite';
import { Colors } from '@/constants/Colors';
import { useColorScheme } from '@/hooks/useColorScheme';

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
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.tint} />
        <Text style={[styles.loadingText, { color: colors.text }]}>
          Checking activity status...
        </Text>
      </View>
    );
  }

  const allPhotosSubmitted = submittedCount >= totalMembers && totalMembers > 0;

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.section}>
        <Text style={[styles.title, { color: colors.text }]}>
          {allPhotosSubmitted ? '⏳ Waiting for Activities' : '📸 Waiting for Photos'}
        </Text>
        
        <Text style={[styles.subtitle, { color: colors.tabIconDefault }]}>
          {allPhotosSubmitted 
            ? 'All photos are in! The activity will start soon.'
            : `${submittedCount} of ${totalMembers} members have submitted their photos.`
          }
        </Text>

        {/* Progress indicator */}
        <View style={styles.progressContainer}>
          <View style={[styles.progressBar, { backgroundColor: colors.border }]}>
            <View 
              style={[
                styles.progressFill, 
                { 
                  backgroundColor: colors.tint,
                  width: `${totalMembers > 0 ? (submittedCount / totalMembers) * 100 : 0}%`
                }
              ]} 
            />
          </View>
          <Text style={[styles.progressText, { color: colors.tabIconDefault }]}>
            {totalMembers > 0 ? Math.round((submittedCount / totalMembers) * 100) : 0}% Complete
          </Text>
        </View>

        {/* Photos grid */}
        {groupPhotos.length > 0 && (
          <>
            <Text style={[styles.photosTitle, { color: colors.text }]}>
              Submitted Photos
            </Text>
            <View style={styles.photosGrid}>
              {groupPhotos.map((photo) => (
                <View key={photo.id} style={styles.photoContainer}>
                  <Image source={{ uri: photo.uri }} style={styles.photoImage} />
                  <View style={[styles.photoOverlay, { backgroundColor: colors.tint }]}>
                    <Text style={[styles.photoCheck, { color: colors.background }]}>✓</Text>
                  </View>
                </View>
              ))}
              
              {/* Placeholder for missing photos */}
              {Array.from({ length: totalMembers - submittedCount }).map((_, index) => (
                <View key={`placeholder-${index}`} style={[styles.photoPlaceholder, { borderColor: colors.border }]}>
                  <Text style={[styles.placeholderText, { color: colors.tabIconDefault }]}>
                    📷
                  </Text>
                </View>
              ))}
            </View>
          </>
        )}

        <View style={styles.messageContainer}>
          <Text style={[styles.messageTitle, { color: colors.text }]}>
            {allPhotosSubmitted ? '🎮 Get Ready!' : '⏰ Hang Tight!'}
          </Text>
          <Text style={[styles.messageText, { color: colors.tabIconDefault }]}>
            {allPhotosSubmitted 
              ? 'The game activity will begin automatically once it\'s time to play!'
              : 'We\'re waiting for everyone to submit their photos. The activity will start once all photos are in!'
            }
          </Text>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
  },
  section: {
    margin: 20,
    padding: 20,
    borderRadius: 15,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 30,
    lineHeight: 22,
  },
  progressContainer: {
    marginBottom: 30,
  },
  progressBar: {
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 8,
  },
  progressFill: {
    height: '100%',
    borderRadius: 4,
  },
  progressText: {
    textAlign: 'center',
    fontSize: 14,
    fontWeight: '600',
  },
  photosTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 15,
    textAlign: 'center',
  },
  photosGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 10,
    marginBottom: 30,
  },
  photoContainer: {
    position: 'relative',
    width: 80,
    height: 80,
    borderRadius: 12,
    overflow: 'hidden',
  },
  photoImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  photoOverlay: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  photoCheck: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  photoPlaceholder: {
    width: 80,
    height: 80,
    borderRadius: 12,
    borderWidth: 2,
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeholderText: {
    fontSize: 24,
    opacity: 0.5,
  },
  messageContainer: {
    alignItems: 'center',
  },
  messageTitle: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 10,
    textAlign: 'center',
  },
  messageText: {
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 22,
  },
}); 