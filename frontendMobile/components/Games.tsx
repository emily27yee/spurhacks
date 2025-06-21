import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Image,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useAuth } from '@/contexts/AuthContext';
import { useGroups } from '@/hooks/useGroups';
import { appwriteDatabase } from '@/lib/appwrite';
import { Colors } from '@/constants/Colors';
import { useColorScheme } from '@/hooks/useColorScheme';

interface GamesProps {
  selectedGroupId: string;
  onNavigateToCamera: () => void;
}

export default function Games({ selectedGroupId, onNavigateToCamera }: GamesProps) {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const { user } = useAuth();
  const { userGroups } = useGroups();
  
  const [groupPhotos, setGroupPhotos] = useState<Array<{id: string, userId: string, uri: string}>>([]);
  const [loading, setLoading] = useState(true);
  const [selectedVote, setSelectedVote] = useState<string>('');
  const [submitting, setSubmitting] = useState(false);
  const [votes, setVotes] = useState<Record<string, string>>({});
  const [userHasVoted, setUserHasVoted] = useState(false);

  const selectedGroup = userGroups.find(g => g.$id === selectedGroupId);

  useEffect(() => {
    if (selectedGroupId && user) {
      loadGameData();
    }
  }, [selectedGroupId, user]);

  const loadGameData = async () => {
    try {
      setLoading(true);
      
      const groupData = await appwriteDatabase.getGroupData(selectedGroupId);
      
      // Load Photos
      let todayData: Record<string, string> = {};
      if (groupData.todaydata) {
        try {
          todayData = JSON.parse(groupData.todaydata);
        } catch (e) { console.error('Error parsing todaydata:', e); }
      }
      
      const photos = [];
      for (const [userId, photoId] of Object.entries(todayData)) {
        const photoUrl = await appwriteDatabase.getPhotoUrl(photoId);
        photos.push({ id: photoId, userId: userId, uri: photoUrl });
      }
      setGroupPhotos(photos);

      // Load Votes
      let todayVotes: Record<string, string> = {};
      if (groupData.todayvotes) {
        try {
          todayVotes = JSON.parse(groupData.todayvotes);
        } catch (e) { console.error('Error parsing todayvotes:', e); }
      }
      setVotes(todayVotes);

      // Check if current user has voted
      if (user && todayVotes[user.$id]) {
        setUserHasVoted(true);
      } else {
        setUserHasVoted(false);
      }
      
    } catch (error) {
      console.error('Error loading game data:', error);
    } finally {
      setLoading(false);
    }
  };

  const hasUserTakenPhoto = (): boolean => {
    if (!user) return false;
    return groupPhotos.some(photo => photo.userId === user.$id);
  };

  const submitVote = async () => {
    if (!selectedVote || !user) return;
    
    try {
      setSubmitting(true);
      await appwriteDatabase.submitGroupVote(selectedGroupId, user.$id, selectedVote);
      Alert.alert('Success', 'Your vote has been submitted!');
      setUserHasVoted(true);
      setVotes(prev => ({...prev, [user.$id]: selectedVote}));
    } catch (error) {
      console.error('Error submitting vote:', error);
      Alert.alert('Error', 'Failed to submit vote. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const renderPhotoVoting = () => {
    if (groupPhotos.length === 0) {
      return (
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            No Photos to Vote On
          </Text>
          <Text style={[styles.infoText, { color: colors.tabIconDefault }]}>
            Once group members submit photos, you can vote here!
          </Text>
        </View>
      );
    }

    return (
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>
          Vote for Your Favorite Photo! 📸
        </Text>
        <Text style={[styles.activityPrompt, { color: colors.text }]}>
          Which photo do you like the most?
        </Text>
        
        <ScrollView style={styles.photosGrid}>
          {groupPhotos.map((photo) => (
            <TouchableOpacity
              key={photo.id}
              style={[
                styles.photoCard,
                { backgroundColor: colors.background, borderColor: colors.border },
                selectedVote === photo.id && { borderColor: colors.tint, borderWidth: 3 }
              ]}
              onPress={() => setSelectedVote(photo.id)}
            >
              <Image source={{ uri: photo.uri }} style={styles.photoImage} />
              {selectedVote === photo.id && (
                <View style={[styles.selectedOverlay, { backgroundColor: colors.tint }]}>
                  <Text style={[styles.selectedText, { color: colors.background }]}>✓</Text>
                </View>
              )}
            </TouchableOpacity>
          ))}
        </ScrollView>

        <TouchableOpacity
          style={[
            styles.button,
            { backgroundColor: selectedVote ? colors.tint : colors.tabIconDefault }
          ]}
          onPress={submitVote}
          disabled={!selectedVote || submitting}
        >
          {submitting ? (
            <ActivityIndicator color={colors.background} />
          ) : (
            <Text style={[styles.buttonText, { color: colors.background }]}>
              Submit Vote
            </Text>
          )}
        </TouchableOpacity>
      </View>
    );
  };

  const renderResults = () => {
    const voteCounts: Record<string, number> = {};
    groupPhotos.forEach(photo => {
      voteCounts[photo.id] = 0;
    });

    Object.values(votes).forEach(votedPhotoId => {
      if (voteCounts[votedPhotoId] !== undefined) {
        voteCounts[votedPhotoId]++;
      }
    });

    const sortedPhotos = [...groupPhotos].sort((a, b) => voteCounts[b.id] - voteCounts[a.id]);
    const totalVotes = Object.keys(votes).length;

    return (
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>
          🏆 Results Are In!
        </Text>
        <Text style={[styles.infoText, { color: colors.tabIconDefault, marginBottom: 20 }]}>
          {totalVotes} out of {selectedGroup?.memberCount || totalVotes} members have voted.
        </Text>
        
        <View style={styles.scrollContainer}>
          <ScrollView 
            style={styles.photosGrid}
            showsVerticalScrollIndicator={true}
            fadingEdgeLength={30}
          >
            {sortedPhotos.map((photo, index) => (
              <View key={photo.id} style={[styles.resultCard, { borderColor: colors.border }]}>
                <Image source={{ uri: photo.uri }} style={styles.photoImage} />
                <View style={[styles.voteResultBanner, { backgroundColor: colors.tint }]}>
                   <Text style={[styles.voteCountText, { color: colors.background }]}>
                     {(index === 0 && voteCounts[photo.id] > 0) ? '👑' : ''} {voteCounts[photo.id]} Vote(s)
                   </Text>
                </View>
              </View>
            ))}
          </ScrollView>
          {sortedPhotos.length > 1 && (
            <View style={[styles.scrollIndicator, { backgroundColor: colors.background }]}>
              <Text style={[styles.scrollIndicatorText, { color: colors.tabIconDefault }]}>
                ↓ Scroll for more photos
              </Text>
            </View>
          )}
        </View>
      </View>
    );
  };

  const renderTodaysPhotoSection = () => {
    if (hasUserTakenPhoto()) {
      return (
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            📸 Photo Submitted!
          </Text>
          <Text style={[styles.infoText, { color: colors.tabIconDefault }]}>
            Your photo is in the running!
          </Text>
        </View>
      );
    }

    return (
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>
          Take Today's Photo
        </Text>
        <Text style={[styles.photoPrompt, { color: colors.text }]}>
          Share a photo with your group! 📷
        </Text>
        
        <TouchableOpacity
          style={[styles.button, { backgroundColor: colors.tint }]}
          onPress={onNavigateToCamera}
        >
          <Text style={[styles.buttonText, { color: colors.background }]}>
            📷 Take Photo
          </Text>
        </TouchableOpacity>
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.tint} />
        <Text style={[styles.loadingText, { color: colors.text }]}>
          Loading game...
        </Text>
      </View>
    );
  }

  if (!selectedGroup) {
    return (
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>
          Select a Group
        </Text>
        <Text style={[styles.infoText, { color: colors.tabIconDefault }]}>
          Choose a group to start playing with photos!
        </Text>
      </View>
    );
  }

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Always show the photo section first */}
      {!hasUserTakenPhoto() ? (
        // If user hasn't taken photo, only show this section
        <>
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              📸 Take Your Photo First!
            </Text>
            <Text style={[styles.infoText, { color: colors.tabIconDefault, marginBottom: 20 }]}>
              You need to submit your photo before you can vote or see results.
            </Text>
            <Text style={[styles.photoPrompt, { color: colors.text }]}>
              Share a photo with your group! 📷
            </Text>
            
            <TouchableOpacity
              style={[styles.button, { backgroundColor: colors.tint }]}
              onPress={onNavigateToCamera}
            >
              <Text style={[styles.buttonText, { color: colors.background }]}>
                📷 Take Photo
              </Text>
            </TouchableOpacity>
          </View>
        </>
      ) : (
        // If user has taken photo, show voting/results
        <>
          {userHasVoted ? renderResults() : renderPhotoVoting()}
          {renderTodaysPhotoSection()}
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  section: {
    margin: 20,
    padding: 20,
    borderRadius: 15,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 15,
    textAlign: 'center',
  },
  activityPrompt: {
    fontSize: 16,
    marginBottom: 20,
    textAlign: 'center',
    fontStyle: 'italic',
  },
  photoPrompt: {
    fontSize: 18,
    marginBottom: 20,
    textAlign: 'center',
    fontWeight: '600',
  },
  button: {
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 15,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  photosGrid: {
    maxHeight: 320,
    marginBottom: 10,
  },
  photoCard: {
    borderRadius: 10,
    marginBottom: 15,
    borderWidth: 2,
    overflow: 'hidden',
    position: 'relative',
  },
  photoImage: {
    width: '100%',
    height: 200,
    resizeMode: 'cover',
  },
  selectedOverlay: {
    position: 'absolute',
    top: 10,
    right: 10,
    width: 30,
    height: 30,
    borderRadius: 15,
    justifyContent: 'center',
    alignItems: 'center',
  },
  selectedText: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  infoText: {
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 22,
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
  resultCard: {
    borderRadius: 10,
    marginBottom: 15,
    borderWidth: 2,
    overflow: 'hidden',
  },
  voteResultBanner: {
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 40,
  },
  voteCountText: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  scrollContainer: {
    position: 'relative',
  },
  scrollIndicator: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingVertical: 8,
    alignItems: 'center',
    opacity: 0.9,
  },
  scrollIndicatorText: {
    fontSize: 12,
    fontStyle: 'italic',
  },
}); 