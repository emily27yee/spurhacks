import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Image,
  TextInput,
  Alert,
  ActivityIndicator,
  Modal,
} from 'react-native';
import { useAuth } from '@/contexts/AuthContext';
import { useGroups } from '@/hooks/useGroups';
import { appwriteDatabase } from '@/lib/appwrite';
import { Colors } from '@/constants/Colors';
import { useColorScheme } from '@/hooks/useColorScheme';

// Game types and data
type GameType = 'voting' | 'comment';

interface GamePrompt {
  id: string;
  type: GameType;
  photoPrompt: string;
  activityPrompt: string;
  dayOffset: number; // 0 for today, 1 for tomorrow, etc.
}

interface GameActivity {
  id: string;
  groupId: string;
  gamePromptId: string;
  photos: Array<{
    id: string;
    userId: string;
    uri: string;
    timestamp: string;
  }>;
  userActivities: Record<string, {
    completed: boolean;
    vote?: string; // photo ID for voting games
    comment?: string; // comment for comment games
    assignedPhotoId?: string; // for comment games
  }>;
  status: 'waiting_for_photos' | 'waiting_for_activities' | 'completed';
  resultsAvailable: boolean;
}

// Predefined game prompts with 2-day cycles
const GAME_PROMPTS: GamePrompt[] = [
  // Week 1
  {
    id: 'lunch_raccoon',
    type: 'voting',
    photoPrompt: 'Take a photo of your lunch 🍽️',
    activityPrompt: 'Vote on which meal would be better suited to feed a raccoon',
    dayOffset: 0,
  },
  {
    id: 'dumb_purchase',
    type: 'voting',
    photoPrompt: 'Upload a photo of something you really want to buy right now 💸',
    activityPrompt: 'Vote on which would be the dumbest purchase',
    dayOffset: 1,
  },
  {
    id: 'funny_pose',
    type: 'comment',
    photoPrompt: 'Take a photo of yourself in a funny pose 🤪',
    activityPrompt: 'What is this person doing?',
    dayOffset: 2,
  },
  {
    id: 'cartoon_weapon',
    type: 'comment',
    photoPrompt: 'Take a photo of something in your room that could be used as a weapon in a cartoon ⚔️',
    activityPrompt: 'Who would be most likely to use that weapon in a cartoon?',
    dayOffset: 3,
  },
  // Add more prompts as needed...
];

const getTodaysGamePrompt = (): GamePrompt => {
  const dayOfYear = Math.floor((Date.now() - new Date(new Date().getFullYear(), 0, 0).getTime()) / (1000 * 60 * 60 * 24));
  return GAME_PROMPTS[dayOfYear % GAME_PROMPTS.length];
};

const getYesterdaysGamePrompt = (): GamePrompt => {
  const dayOfYear = Math.floor((Date.now() - new Date(new Date().getFullYear(), 0, 0).getTime()) / (1000 * 60 * 60 * 24)) - 1;
  return GAME_PROMPTS[Math.max(0, dayOfYear) % GAME_PROMPTS.length];
};

interface GamesProps {
  selectedGroupId: string;
  onNavigateToCamera: () => void;
}

export default function Games({ selectedGroupId, onNavigateToCamera }: GamesProps) {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const { user } = useAuth();
  const { userGroups } = useGroups();
  
  const [currentActivity, setCurrentActivity] = useState<GameActivity | null>(null);
  const [todaysActivity, setTodaysActivity] = useState<GameActivity | null>(null);
  const [loading, setLoading] = useState(true);
  const [vote, setVote] = useState<string>('');
  const [comment, setComment] = useState<string>('');
  const [showResults, setShowResults] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const todaysPrompt = getTodaysGamePrompt();
  const yesterdaysPrompt = getYesterdaysGamePrompt();

  const selectedGroup = userGroups.find(g => g.$id === selectedGroupId);

  useEffect(() => {
    if (selectedGroupId && user) {
      loadGameData();
    }
  }, [selectedGroupId, user]);
  const loadGameData = async () => {
    try {
      setLoading(true);
      
      console.log('Loading game data for:', {
        selectedGroupId,
        yesterdaysPrompt: yesterdaysPrompt.id,
        todaysPrompt: todaysPrompt.id
      });
      
      // Load yesterday's activity (if exists)
      const yesterdayActivity = await appwriteDatabase.getGameActivity(selectedGroupId, yesterdaysPrompt.id);
      console.log('Yesterday activity:', yesterdayActivity);
      setCurrentActivity(yesterdayActivity);
      
      // Load today's activity (if exists)
      const todayActivity = await appwriteDatabase.getGameActivity(selectedGroupId, todaysPrompt.id);
      console.log('Today activity:', todayActivity);
      setTodaysActivity(todayActivity);
      
    } catch (error) {
      console.error('Error loading game data:', error);
    } finally {
      setLoading(false);
    }
  };

  const hasUserCompletedActivity = (): boolean => {
    if (!currentActivity || !user) return false;
    return currentActivity.userActivities[user.$id]?.completed || false;
  };

  const hasUserTakenTodaysPhoto = (): boolean => {
    if (!todaysActivity || !user) return false;
    return todaysActivity.photos.some(p => p.userId === user.$id);
  };

  const canShowResults = (): boolean => {
    if (!currentActivity) return false;
    return currentActivity.resultsAvailable && hasUserCompletedActivity();
  };

  const submitVote = async (photoId: string) => {
    if (!currentActivity || !user) return;
    
    try {
      setSubmitting(true);
      await appwriteDatabase.submitGameVote(currentActivity.id, user.$id, photoId);
      await loadGameData();
      Alert.alert('Success', 'Your vote has been submitted!');
    } catch (error) {
      console.error('Error submitting vote:', error);
      Alert.alert('Error', 'Failed to submit vote. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const submitComment = async () => {
    if (!currentActivity || !user || !comment.trim()) return;
    
    try {
      setSubmitting(true);
      const assignedPhotoId = currentActivity.userActivities[user.$id]?.assignedPhotoId;
      if (!assignedPhotoId) {
        throw new Error('No photo assigned for commenting');
      }
      
      await appwriteDatabase.submitGameComment(currentActivity.id, user.$id, assignedPhotoId, comment.trim());
      await loadGameData();
      Alert.alert('Success', 'Your comment has been submitted!');
      setComment('');
    } catch (error) {
      console.error('Error submitting comment:', error);
      Alert.alert('Error', 'Failed to submit comment. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const renderActivitySection = () => {
    if (!currentActivity) {
      return (
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            No Activity Available
          </Text>
          <Text style={[styles.infoText, { color: colors.tabIconDefault }]}>
            Check back tomorrow for your first game activity!
          </Text>
        </View>
      );
    }

    if (hasUserCompletedActivity()) {
      if (canShowResults()) {
        return (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              🎉 Results Available!
            </Text>
            <TouchableOpacity
              style={[styles.button, { backgroundColor: colors.tint }]}
              onPress={() => setShowResults(true)}
            >
              <Text style={[styles.buttonText, { color: colors.background }]}>
                View Results
              </Text>
            </TouchableOpacity>
          </View>
        );
      } else {
        return (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              ⏳ Waiting for Others
            </Text>
            <Text style={[styles.infoText, { color: colors.tabIconDefault }]}>
              You've completed today's activity! Results will be available once everyone finishes.
            </Text>
          </View>
        );
      }
    }

    // Show activity based on game type
    if (yesterdaysPrompt.type === 'voting') {
      return renderVotingActivity();
    } else {
      return renderCommentActivity();
    }
  };

  const renderVotingActivity = () => {
    if (!currentActivity) return null;

    return (
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>
          Today's Activity
        </Text>
        <Text style={[styles.activityPrompt, { color: colors.text }]}>
          {yesterdaysPrompt.activityPrompt}
        </Text>
        
        <ScrollView style={styles.photosGrid}>
          {currentActivity.photos.map((photo) => (
            <TouchableOpacity
              key={photo.id}
              style={[
                styles.photoCard,
                { backgroundColor: colors.background, borderColor: colors.border },
                vote === photo.id && { borderColor: colors.tint, borderWidth: 3 }
              ]}
              onPress={() => setVote(photo.id)}
            >
              <Image source={{ uri: photo.uri }} style={styles.photoImage} />
              {vote === photo.id && (
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
            { backgroundColor: vote ? colors.tint : colors.tabIconDefault }
          ]}
          onPress={() => submitVote(vote)}
          disabled={!vote || submitting}
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
  const renderCommentActivity = () => {
    if (!currentActivity || !user) return null;

    const assignedPhotoId = currentActivity.userActivities[user.$id]?.assignedPhotoId;
    const assignedPhoto = currentActivity.photos.find(p => p.id === assignedPhotoId);

    console.log('Comment Activity Debug:', {
      userId: user.$id,
      userActivities: currentActivity.userActivities,
      assignedPhotoId,
      photosCount: currentActivity.photos.length,
      hasAssignedPhoto: !!assignedPhoto
    });

    if (!assignedPhoto) {
      return (
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            Loading Activity...
          </Text>
          <Text style={[styles.infoText, { color: colors.tabIconDefault }]}>
            {currentActivity.photos.length === 0 
              ? "Waiting for group members to submit photos..."
              : "Assigning photos to group members..."
            }
          </Text>
          {currentActivity.photos.length > 0 && (
            <TouchableOpacity
              style={[styles.button, { backgroundColor: colors.tint }]}
              onPress={loadGameData}
            >
              <Text style={[styles.buttonText, { color: colors.background }]}>
                Refresh
              </Text>
            </TouchableOpacity>
          )}
        </View>
      );
    }

    return (
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>
          Today's Activity
        </Text>
        <Text style={[styles.activityPrompt, { color: colors.text }]}>
          {yesterdaysPrompt.activityPrompt}
        </Text>
        
        <View style={styles.assignedPhotoContainer}>
          <Image source={{ uri: assignedPhoto.uri }} style={styles.assignedPhoto} />
        </View>

        <TextInput
          style={[styles.commentInput, { 
            color: colors.text, 
            borderColor: colors.border,
            backgroundColor: colors.background
          }]}
          placeholder="Write your comment here..."
          placeholderTextColor={colors.tabIconDefault}
          value={comment}
          onChangeText={setComment}
          multiline
          numberOfLines={3}
        />

        <TouchableOpacity
          style={[
            styles.button,
            { backgroundColor: comment.trim() ? colors.tint : colors.tabIconDefault }
          ]}
          onPress={submitComment}
          disabled={!comment.trim() || submitting}
        >
          {submitting ? (
            <ActivityIndicator color={colors.background} />
          ) : (
            <Text style={[styles.buttonText, { color: colors.background }]}>
              Submit Comment
            </Text>
          )}
        </TouchableOpacity>
      </View>
    );
  };

  const renderTodaysPhotoSection = () => {
    if (hasUserTakenTodaysPhoto()) {
      return (
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            📸 Photo Submitted!
          </Text>
          <Text style={[styles.infoText, { color: colors.tabIconDefault }]}>
            Come back tomorrow for the activity based on today's photos!
          </Text>
        </View>
      );
    }

    return (
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>
          Today's Photo Prompt
        </Text>
        <Text style={[styles.photoPrompt, { color: colors.text }]}>
          {todaysPrompt.photoPrompt}
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

  const renderResultsModal = () => {
    if (!currentActivity) return null;

    return (
      <Modal
        visible={showResults}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <View style={[styles.modalContainer, { backgroundColor: colors.background }]}>
          <View style={styles.modalHeader}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>
              🏆 Game Results
            </Text>
            <TouchableOpacity
              style={styles.closeButton}
              onPress={() => setShowResults(false)}
            >
              <Text style={[styles.closeButtonText, { color: colors.text }]}>✕</Text>
            </TouchableOpacity>
          </View>
          
          <ScrollView style={styles.resultsContent}>
            {yesterdaysPrompt.type === 'voting' ? (
              <Text style={[styles.resultsText, { color: colors.text }]}>
                Voting results would be displayed here...
              </Text>
            ) : (
              <Text style={[styles.resultsText, { color: colors.text }]}>
                Comments and photo reveals would be displayed here...
              </Text>
            )}
          </ScrollView>
        </View>
      </Modal>
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.tint} />
        <Text style={[styles.loadingText, { color: colors.text }]}>
          Loading games...
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
          Choose a group to start playing daily games!
        </Text>
      </View>
    );
  }

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.text }]}>
          Daily Games
        </Text>
        <Text style={[styles.groupName, { color: colors.tabIconDefault }]}>
          {selectedGroup.name}
        </Text>
      </View>

      {renderActivitySection()}
      
      {hasUserCompletedActivity() && renderTodaysPhotoSection()}

      {renderResultsModal()}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    padding: 20,
    alignItems: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  groupName: {
    fontSize: 16,
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
    maxHeight: 400,
    marginBottom: 20,
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
  assignedPhotoContainer: {
    alignItems: 'center',
    marginBottom: 20,
  },
  assignedPhoto: {
    width: 250,
    height: 250,
    borderRadius: 15,
    resizeMode: 'cover',
  },
  commentInput: {
    borderWidth: 1,
    borderRadius: 10,
    padding: 15,
    fontSize: 16,
    textAlignVertical: 'top',
    minHeight: 80,
    marginBottom: 10,
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
  modalContainer: {
    flex: 1,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  closeButton: {
    padding: 10,
  },
  closeButtonText: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  resultsContent: {
    flex: 1,
    padding: 20,
  },
  resultsText: {
    fontSize: 16,
    textAlign: 'center',
  },
});
