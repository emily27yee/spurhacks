import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Image,
  Alert,
  ActivityIndicator,
  TextInput,
  KeyboardAvoidingView,
  Platform,
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

type GameType = 'voting' | 'comment';

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
  const [comments, setComments] = useState<Record<string, { assignedPhotoId: string, comment: string }>>({});
  const [userHasVoted, setUserHasVoted] = useState(false);
  const [userHasCommented, setUserHasCommented] = useState(false);
  const [commentText, setCommentText] = useState<string>('');
  const [gameType, setGameType] = useState<GameType>('voting');
  const [assignedPhotoId, setAssignedPhotoId] = useState<string>('');
  const [databaseFieldMissing, setDatabaseFieldMissing] = useState(false);
  const [activityActive, setActivityActive] = useState(false);
  const [resultsReleased, setResultsReleased] = useState(false);
  const [isNewDay, setIsNewDay] = useState(false);
  const commentInputRef = useRef<TextInput>(null);

  const selectedGroup = userGroups.find(g => g.$id === selectedGroupId);

  useEffect(() => {
    if (selectedGroupId && user) {
      loadGameData();
    }
  }, [selectedGroupId, user]);

  // Simple game type detection - alternate between voting and comment games
  // In production, this would be based on a schedule or game prompt system
  const detectGameType = (): GameType => {
    // Force comment game for testing
    return 'comment';
    // const today = new Date().getDay();
    // return today % 2 === 0 ? 'voting' : 'comment';
  };

  const loadGameData = async () => {
    try {
      setLoading(true);
      
      const groupData = await appwriteDatabase.getGroupData(selectedGroupId);
      
      // Check timing conditions
      const hasEmptyVotes = !groupData.todayvotes || groupData.todayvotes.trim() === '' || groupData.todayvotes === '{}';
      const hasEmptyComments = !groupData.todaycomments || groupData.todaycomments.trim() === '' || groupData.todaycomments === '{}';
      const newDay = hasEmptyVotes && hasEmptyComments;
      
      setIsNewDay(newDay);
      setActivityActive(!!groupData.activityactive);
      setResultsReleased(!!groupData.releaseresults);
      
      console.log('Timing status:', {
        isNewDay: newDay,
        activityActive: !!groupData.activityactive,
        resultsReleased: !!groupData.releaseresults,
        hasEmptyVotes,
        hasEmptyComments
      });
      
      // Detect game type
      const currentGameType = detectGameType();
      setGameType(currentGameType);
      
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

      if (currentGameType === 'voting') {
        // Load Votes
        setDatabaseFieldMissing(false); // Reset flag for voting games
        let todayVotes: Record<string, string> = {};
        if (groupData.todayvotes) {
          try {
            todayVotes = JSON.parse(groupData.todayvotes);
          } catch (e) { console.error('Error parsing todayvotes:', e); }
        }
        setVotes(todayVotes);
        setUserHasVoted(user ? !!todayVotes[user.$id] : false);
      } else {
        // Load Comments and assign photo
        let todayComments: Record<string, { assignedPhotoId: string, comment: string }> = {};
        console.log('Raw todaycomments from DB:', groupData.todaycomments);
        
        // Check if the field exists in the schema (not just if it has a value)
        if (groupData.hasOwnProperty('todaycomments')) {
          if (groupData.todaycomments) {
            try {
              todayComments = JSON.parse(groupData.todaycomments);
              console.log('Parsed todaycomments:', todayComments);
            } catch (e) { 
              console.error('Error parsing todaycomments:', e); 
              console.error('Raw value that failed to parse:', groupData.todaycomments);
              // If parsing fails, initialize with empty object
              todayComments = {};
            }
          } else {
            // Field exists but is empty/null - initialize with empty object
            console.log('todaycomments field is empty, initializing with empty object');
            todayComments = {};
          }
          setDatabaseFieldMissing(false);
        } else {
          console.log('No todaycomments field in groupData - please add this field to your groupdata collection in Appwrite');
          console.log('Field details: Name: todaycomments, Type: String, Size: ~5000');
          setDatabaseFieldMissing(true);
        }
        setComments(todayComments);
        
        if (user) {
          if (todayComments[user.$id] && todayComments[user.$id].comment && todayComments[user.$id].comment.trim()) {
            setUserHasCommented(true);
            setAssignedPhotoId(todayComments[user.$id].assignedPhotoId);
            console.log(`User ${user.$id} already commented on photo ${todayComments[user.$id].assignedPhotoId}`);
          } else if (todayComments[user.$id] && todayComments[user.$id].assignedPhotoId) {
            // User has an assignment but hasn't commented yet
            setUserHasCommented(false);
            setAssignedPhotoId(todayComments[user.$id].assignedPhotoId);
            console.log(`User ${user.$id} has assignment for photo ${todayComments[user.$id].assignedPhotoId} but hasn't commented yet`);
          } else {
            // Get group member IDs from the group data
            let groupMemberIds: string[] = [];
            if (groupData.members) {
              try {
                const memberObjects = JSON.parse(groupData.members);
                groupMemberIds = memberObjects.map((m: any) => m.userId);
              } catch (e) {
                console.error('Error parsing group members:', e);
              }
            }
            
            // Assign a photo to the user
            console.log(`Getting photo assignment for user ${user.$id}`);
            console.log(`Total photos: ${photos.length}/${groupMemberIds.length} members`);
            getAssignedPhotoForUser(photos, user.$id, groupMemberIds, todayComments, selectedGroupId)
              .then(assigned => {
                if (assigned) {
                  setAssignedPhotoId(assigned);
                } else {
                  setAssignedPhotoId('waiting-for-all');
                  console.log('Waiting for all group members to submit photos before assignment');
                }
              })
              .catch(error => {
                console.error('Error getting photo assignment:', error);
                setAssignedPhotoId('waiting-for-all');
              });
          }
        }
      }
      
    } catch (error) {
      console.error('Error loading game data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Generate a derangement - a permutation where no element is in its original position
  const generateDerangement = (arr: string[]): string[] => {
    const n = arr.length;
    if (n <= 1) return [];
    
    let result = [...arr];
    let attempts = 0;
    const maxAttempts = 1000; // Prevent infinite loops
    
    // Keep shuffling until we get a valid derangement
    while (attempts < maxAttempts) {
      // Fisher-Yates shuffle
      for (let i = n - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [result[i], result[j]] = [result[j], result[i]];
      }
      
      // Check if it's a valid derangement
      let isValid = true;
      for (let i = 0; i < n; i++) {
        if (result[i] === arr[i]) {
          isValid = false;
          break;
        }
      }
      
      if (isValid) return result;
      attempts++;
    }
    
    // Fallback: create a simple rotation if random approach fails
    console.log('Using rotation fallback for derangement');
    return [...arr.slice(1), arr[0]];
  };

  // Assign photos to all users at once using derangement
  const assignPhotosToAllUsers = async (
    photos: Array<{id: string, userId: string, uri: string}>,
    groupMembers: string[],
    existingAssignments: Record<string, { assignedPhotoId: string, comment: string }>,
    groupId: string
  ): Promise<Record<string, string>> => {
    // Get users who have submitted photos
    const usersWithPhotos = photos.map(p => p.userId);
    
    // If not all members have submitted photos, return existing assignments
    if (usersWithPhotos.length < groupMembers.length) {
      console.log(`Waiting for all members to submit photos. ${usersWithPhotos.length}/${groupMembers.length} submitted`);
      return Object.fromEntries(
        Object.entries(existingAssignments).map(([userId, data]) => [userId, data.assignedPhotoId])
          .filter(([_, photoId]) => photoId) // Filter out empty assignments
      );
    }
    
    // Check if we have assignments for users who submitted photos
    const existingValidAssignments = Object.entries(existingAssignments)
      .filter(([userId, data]) => usersWithPhotos.includes(userId) && data.assignedPhotoId)
      .length;
    
    if (existingValidAssignments >= usersWithPhotos.length) {
      console.log('All assignments already made');
      return Object.fromEntries(
        Object.entries(existingAssignments).map(([userId, data]) => [userId, data.assignedPhotoId])
          .filter(([_, photoId]) => photoId)
      );
    }
    
    // Create new assignments using derangement
    console.log('Creating photo assignments for all users');
    const shuffledUserIds = generateDerangement(usersWithPhotos);
    const assignments: Record<string, string> = {};
    
    usersWithPhotos.forEach((userId, index) => {
      const assignedUserId = shuffledUserIds[index];
      const assignedPhoto = photos.find(p => p.userId === assignedUserId);
      if (assignedPhoto) {
        assignments[userId] = assignedPhoto.id;
        console.log(`Assigned ${userId} to comment on photo from ${assignedUserId}`);
      }
    });
    
    // Save assignments to database
    try {
      await appwriteDatabase.savePhotoAssignments(groupId, assignments);
    } catch (error) {
      console.error('Failed to save assignments to database:', error);
    }
    
    return assignments;
  };

  const getAssignedPhotoForUser = async (
    photos: Array<{id: string, userId: string, uri: string}>,
    currentUserId: string,
    groupMembers: string[],
    existingComments: Record<string, { assignedPhotoId: string, comment: string }>,
    groupId: string
  ): Promise<string | null> => {
    const assignments = await assignPhotosToAllUsers(photos, groupMembers, existingComments, groupId);
    return assignments[currentUserId] || null;
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

  const submitComment = async () => {
    if (!commentText.trim() || !user || !assignedPhotoId) return;
    
    try {
      setSubmitting(true);
      await appwriteDatabase.submitGroupComment(selectedGroupId, user.$id, assignedPhotoId, commentText);
      Alert.alert('Success', 'Your comment has been submitted!');
      setUserHasCommented(true);
      setComments(prev => ({...prev, [user.$id]: { assignedPhotoId, comment: commentText }}));
    } catch (error) {
      console.error('Error submitting comment:', error);
      Alert.alert('Error', 'Failed to submit comment. Please try again.');
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

  const renderCommentGame = () => {
    const assignedPhoto = groupPhotos.find(p => p.id === assignedPhotoId);
    
    if (databaseFieldMissing) {
      return (
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            ⚠️ Database Setup Required
          </Text>
          <Text style={[styles.infoText, { color: colors.tabIconDefault, marginBottom: 15 }]}>
            The comment game requires a database field that hasn't been added yet.
          </Text>
          <View style={[styles.setupInstructions, { backgroundColor: colors.tint + '20', borderColor: colors.tint }]}>
            <Text style={[styles.setupText, { color: colors.text }]}>
              Please add this field to your Appwrite database:
            </Text>
            <Text style={[styles.setupCode, { color: colors.text }]}>
              Collection: groupdata{'\n'}
              Field Name: todaycomments{'\n'}
              Type: String{'\n'}
              Size: 5000 bytes
            </Text>
          </View>
          <Text style={[styles.infoText, { color: colors.tabIconDefault, marginTop: 15 }]}>
            After adding the field, restart the app to continue.
          </Text>
        </View>
      );
    }
    
    if (!assignedPhotoId || assignedPhotoId === 'waiting-for-all') {
      const membersWithPhotos = groupPhotos.length;
      const totalMembers = selectedGroup?.memberCount || 4;
      const waitingFor = totalMembers - membersWithPhotos;
      
      return (
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            ⏳ Waiting for All Photos
          </Text>
          <Text style={[styles.infoText, { color: colors.tabIconDefault, marginBottom: 20 }]}>
            {membersWithPhotos} out of {totalMembers} members have submitted photos.
          </Text>
          <Text style={[styles.infoText, { color: colors.tabIconDefault }]}>
            We need {waitingFor} more photo{waitingFor !== 1 ? 's' : ''} before the comment game can begin.
            Once everyone submits, you'll be assigned a photo to comment on!
          </Text>
          {membersWithPhotos >= 2 && (
            <TouchableOpacity
              style={[styles.button, { backgroundColor: colors.tabIconDefault, marginTop: 20 }]}
              onPress={() => setUserHasCommented(true)}
            >
              <Text style={[styles.buttonText, { color: colors.background }]}>
                View Current Comments
              </Text>
            </TouchableOpacity>
          )}
        </View>
      );
    }
    
    if (!assignedPhoto) {
      return (
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            Loading Your Photo...
          </Text>
          <Text style={[styles.infoText, { color: colors.tabIconDefault }]}>
            We're preparing your photo assignment. This should just take a moment!
          </Text>
        </View>
      );
    }

    return (
      <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            Today's Comment Game! 💭
          </Text>
          <Text style={[styles.activityPrompt, { color: colors.text }]}>
            What do you think is happening in this photo?
          </Text>
          
          <View style={styles.assignedPhotoContainer}>
            <Image source={{ uri: assignedPhoto.uri }} style={styles.assignedPhoto} />
          </View>

          <TextInput
            ref={commentInputRef}
            style={[styles.commentInput, { 
              color: colors.text, 
              borderColor: colors.border,
              backgroundColor: colorScheme === 'dark' ? '#1c1c1c' : '#ffffff' 
            }]}
            placeholder="Write your comment here..."
            placeholderTextColor={colors.tabIconDefault}
            value={commentText}
            onChangeText={(text) => {
              console.log('Comment text changed:', text);
              setCommentText(text);
            }}
            multiline={true}
            numberOfLines={4}
            maxLength={200}
            textAlignVertical="top"
            editable={true}
            autoCapitalize="sentences"
            autoCorrect={true}
          />
          
          <Text style={[styles.characterCount, { color: colors.tabIconDefault }]}>
            {commentText.length}/200
          </Text>

          <TouchableOpacity
            style={[
              styles.button,
              { backgroundColor: commentText.trim() ? colors.tint : colors.tabIconDefault }
            ]}
            onPress={submitComment}
            disabled={!commentText.trim() || submitting}
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

  const renderVoteResults = () => {
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
          🏆 Voting Results!
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
                     {(index === 0 && voteCounts[photo.id] > 0) ? '👑 ' : ''}{voteCounts[photo.id]} Vote(s)
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

  const renderCommentResults = () => {
    // Count only comments that are non-empty strings
    const totalComments = Object.values(comments).filter(c => c.comment && c.comment.trim().length > 0).length;

    return (
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>
          💭 Comment Game Results!
        </Text>
        <Text style={[styles.infoText, { color: colors.tabIconDefault, marginBottom: 20 }]}>
          {totalComments} out of {selectedGroup?.memberCount || totalComments} members have commented.
        </Text>
        
        <ScrollView style={styles.photosGrid} showsVerticalScrollIndicator={true}>
          {groupPhotos.map((photo) => {
            // Find all comments for this photo
            const photoComments = Object.entries(comments).filter(
              ([_, comment]) => comment.assignedPhotoId === photo.id && comment.comment && comment.comment.trim().length > 0
            );
            
            return (
              <View key={photo.id} style={[styles.commentResultCard, { borderColor: colors.border }]}>
                <Image source={{ uri: photo.uri }} style={styles.photoImage} />
                {photoComments.length > 0 ? (
                  <View style={styles.commentsContainer}>
                    {photoComments.map(([userId, comment], index) => (
                      <View key={userId} style={[styles.commentBubble, { backgroundColor: colors.tint + '20' }]}>
                        <Text style={[styles.commentText, { color: colors.text }]}>
                          "{comment.comment}"
                        </Text>
                      </View>
                    ))}
                  </View>
                ) : (
                  <View style={styles.noCommentsContainer}>
                    <Text style={[styles.noCommentsText, { color: colors.tabIconDefault }]}>
                      No comments yet
                    </Text>
                  </View>
                )}
              </View>
            );
          })}
        </ScrollView>
      </View>
    );
  };

  const renderActivityNotActive = () => {
    return (
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>
          ⏰ Activity Not Available Yet
        </Text>
        <Text style={[styles.infoText, { color: colors.tabIconDefault, marginBottom: 20 }]}>
          Today's activity hasn't started yet. Check back later when it's time to play!
        </Text>
        <Text style={[styles.infoText, { color: colors.tabIconDefault }]}>
          Activities are typically available during specific hours of the day.
        </Text>
      </View>
    );
  };

  const renderResultsNotReleased = () => {
    return (
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>
          ⏳ Results Coming Soon
        </Text>
        <Text style={[styles.infoText, { color: colors.tabIconDefault, marginBottom: 20 }]}>
          You've completed today's activity! Results will be available once the release time is reached.
        </Text>
        <Text style={[styles.infoText, { color: colors.tabIconDefault }]}>
          Keep checking back - results are worth the wait! 🎉
        </Text>
      </View>
    );
  };

  const renderNewDayWaiting = () => {
    return (
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>
          🌅 New Day, New Adventures!
        </Text>
        <Text style={[styles.infoText, { color: colors.tabIconDefault, marginBottom: 20 }]}>
          A fresh day has begun! Today's activity will be available soon.
        </Text>
        <Text style={[styles.infoText, { color: colors.tabIconDefault }]}>
          Get ready to share and play with your group! 📸
        </Text>
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
            Your photo is in today's game!
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
      {/* Check timing constraints first */}
      {isNewDay && !activityActive ? (
        // New day but activity not active yet
        renderNewDayWaiting()
      ) : !activityActive ? (
        // Activity not active (but not necessarily a new day)
        renderActivityNotActive()
      ) : (
        // Activity is active - proceed with normal flow
        <>
          {!hasUserTakenPhoto() ? (
            // If user hasn't taken photo, only show this section
            <>
              <View style={styles.section}>
                <Text style={[styles.sectionTitle, { color: colors.text }]}>
                  📸 Take Your Photo First!
                </Text>
                <Text style={[styles.infoText, { color: colors.tabIconDefault, marginBottom: 20 }]}>
                  You need to submit your photo before you can play today's game.
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
            // If user has taken photo, check if they can see results or should play game
            <>
              {gameType === 'voting' ? (
                userHasVoted ? (
                  resultsReleased ? renderVoteResults() : renderResultsNotReleased()
                ) : renderPhotoVoting()
              ) : (
                userHasCommented ? (
                  resultsReleased ? renderCommentResults() : renderResultsNotReleased()
                ) : renderCommentGame()
              )}
              {renderTodaysPhotoSection()}
            </>
          )}
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
  resultCard: {
    borderRadius: 10,
    marginBottom: 15,
    borderWidth: 2,
    overflow: 'hidden',
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
  assignedPhotoContainer: {
    alignItems: 'center',
    marginBottom: 20,
  },
  assignedPhoto: {
    width: '100%',
    height: 250,
    borderRadius: 15,
    resizeMode: 'cover',
  },
  commentInput: {
    borderWidth: 2,
    borderRadius: 10,
    padding: 15,
    paddingTop: 15,
    fontSize: 16,
    textAlignVertical: 'top',
    minHeight: 120,
    marginBottom: 5,
    elevation: 2,
  },
  characterCount: {
    fontSize: 12,
    textAlign: 'right',
    marginBottom: 10,
  },
  commentResultCard: {
    borderRadius: 10,
    marginBottom: 20,
    borderWidth: 2,
    overflow: 'hidden',
  },
  commentsContainer: {
    padding: 15,
  },
  commentBubble: {
    padding: 12,
    borderRadius: 10,
    marginBottom: 8,
  },
  commentText: {
    fontSize: 15,
    lineHeight: 20,
  },
  noCommentsContainer: {
    padding: 20,
    alignItems: 'center',
  },
  noCommentsText: {
    fontSize: 14,
    fontStyle: 'italic',
  },
  setupInstructions: {
    borderWidth: 1,
    borderRadius: 10,
    padding: 15,
    marginVertical: 10,
  },
  setupText: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 10,
  },
  setupCode: {
    fontSize: 14,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    lineHeight: 20,
  },
}); 