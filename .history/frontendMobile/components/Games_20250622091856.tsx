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
  SafeAreaView,
} from 'react-native';
import { useAuth } from '@/contexts/AuthContext';
import { useGroups } from '@/hooks/useGroups';
import { appwriteDatabase } from '@/lib/appwrite';
import { Colors } from '@/constants/Colors';
import { useColorScheme } from '@/hooks/useColorScheme';
import WaitingForActivities from './WaitingForActivities';
import WaitingForResults from './WaitingForResults';

interface GamesProps {
  selectedGroupId: string;
  onNavigateToCamera: () => void;
}

type GameType = 'voting' | 'comment';

const ORANGE = '#E85D42';
const BEIGE = '#F5EFE6';

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
  const [showWaitingForActivities, setShowWaitingForActivities] = useState(false);
  const [showWaitingForResults, setShowWaitingForResults] = useState(false);
  const commentInputRef = useRef<TextInput>(null);

  const selectedGroup = userGroups.find(g => g.$id === selectedGroupId);

  useEffect(() => {
    if (selectedGroupId && user) {
      loadGameData();
      
      // Also check if any groups are ready for result release
      appwriteDatabase.checkAllGroupsForResultRelease().catch(error => {
        console.log('Note: Could not check groups for result release:', error);
      });
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

      // Detect game type
      const currentGameType = detectGameType();
      setGameType(currentGameType);
      
      // Only consider results released if:
      // 1. Activity is active
      // 2. releaseresults is true 
      // 3. There's actual comment/vote data for today
      let shouldShowResults = false;
      if (groupData.activityactive && groupData.releaseresults) {
        if (currentGameType === 'comment' && groupData.todaycomments && groupData.todaycomments !== '{}') {
          // For comments, check if all members have actually submitted comments
          try {
            const comments = JSON.parse(groupData.todaycomments);
            const memberObjects = JSON.parse(groupData.members || '[]');
            const allHaveComments = memberObjects.every((member: any) => {
              const userId = member.userId || member;
              return comments[userId]?.comment?.trim()?.length > 0;
            });
            shouldShowResults = allHaveComments;
            console.log('Comment game results check:', { allHaveComments, shouldShowResults });
          } catch (e) {
            console.error('Error checking comment completion:', e);
          }
        } else if (currentGameType === 'voting' && groupData.todayvotes && groupData.todayvotes !== '{}') {
          shouldShowResults = true;
        }
      }
      setResultsReleased(shouldShowResults);
      
      console.log('Timing status:', {
        isNewDay: newDay,
        activityActive: !!groupData.activityactive,
        resultsReleased: !!groupData.releaseresults,
        hasEmptyVotes,
        hasEmptyComments,
        shouldShowResults
      });
      
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

      // Check if we should show waiting screens
      if (!newDay && !groupData.activityactive) {
        // Photos submitted but activity not active yet
        setShowWaitingForActivities(true);
        setShowWaitingForResults(false);
      } else {
        setShowWaitingForActivities(false);
        
        // Check if user has completed activity but results not released
        if (groupData.activityactive && !groupData.releaseresults) {
          let userCompleted = false;
          if (currentGameType === 'voting') {
            let todayVotes: Record<string, string> = {};
            if (groupData.todayvotes) {
              try {
                todayVotes = JSON.parse(groupData.todayvotes);
                userCompleted = user ? !!todayVotes[user.$id] : false;
              } catch (e) {
                console.error('Error parsing todayvotes for waiting check:', e);
              }
            }
          } else {
            let todayComments: Record<string, { assignedPhotoId: string, comment: string }> = {};
            if (groupData.todaycomments) {
              try {
                todayComments = JSON.parse(groupData.todaycomments);
                userCompleted = user ? !!(todayComments[user.$id]?.comment?.trim()) : false;
                
                // Debug logging
                console.log('Checking if should show waiting screen:');
                console.log('- User completed:', userCompleted);
                console.log('- Results released:', groupData.releaseresults);
                console.log('- Activity active:', groupData.activityactive);
                console.log('- User comment data:', user ? todayComments[user.$id] : 'no user');
              } catch (e) {
                console.error('Error parsing todaycomments for waiting check:', e);
              }
            }
          }
          
          if (userCompleted) {
            setShowWaitingForResults(true);
          } else {
            // Only set to false if we're not already showing waiting screen
            // This prevents the screen from switching away when loadGameData is called while waiting
            if (!showWaitingForResults) {
              setShowWaitingForResults(false);
            }
          }
        } else {
          setShowWaitingForResults(false);
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
      setUserHasVoted(true);
      setVotes(prev => ({...prev, [user.$id]: selectedVote}));
      // Show waiting screen until all members have voted
      setShowWaitingForResults(true);
      // Ensure results are not shown prematurely
      setResultsReleased(false);
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
      setUserHasCommented(true);
      setComments(prev => ({...prev, [user.$id]: { assignedPhotoId, comment: commentText }}));
      // Show waiting screen until all members have commented
      setShowWaitingForResults(true);
      // Ensure results are not shown prematurely
      setResultsReleased(false);
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
            !selectedVote && { opacity: 0.5 }
          ]}
          onPress={submitVote}
          disabled={!selectedVote || submitting}
        >
          {submitting ? (
            <ActivityIndicator color="#1C1C1C" />
          ) : (
            <Text style={styles.buttonText}>
              submit vote
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
        <SafeAreaView style={styles.gameContainer}>
          {/* <View style={styles.topScribble} /> */}
          <ScrollView contentContainerStyle={styles.gameContentWrapper}>
            <Text style={styles.gamePromptLabel}>ERROR</Text>
            <Text style={styles.gamePromptText}>database setup required</Text>
            <Text style={styles.gameDetailText}>
              the comment game requires a database field that hasn't been added yet. please add 'todaycomments' field to your appwrite database and restart the app.
            </Text>
          </ScrollView>
        </SafeAreaView>
      );
    }
    
    if (!assignedPhotoId || assignedPhotoId === 'waiting-for-all') {
      const membersWithPhotos = groupPhotos.length;
      const totalMembers = selectedGroup?.memberCount || 4;
      const waitingFor = totalMembers - membersWithPhotos;
      
      return (
        <SafeAreaView style={styles.gameContainer}>
          {/* <View style={styles.topScribble} /> */}
          <ScrollView contentContainerStyle={styles.gameContentWrapper}>
            <Text style={styles.gamePromptLabel}>STATUS</Text>
            <Text style={styles.gamePromptText}>waiting for all photos</Text>
            <Text style={styles.gameDetailText}>
              {membersWithPhotos} out of {totalMembers} members have submitted photos. we need {waitingFor} more photo{waitingFor !== 1 ? 's' : ''} before the comment game can begin.
            </Text>
          </ScrollView>
        </SafeAreaView>
      );
    }
    
    if (!assignedPhoto) {
      return (
        <SafeAreaView style={styles.gameContainer}>
          {/* <View style={styles.topScribble} /> */}
          <View style={styles.gameLoadingContainer}>
            <ActivityIndicator size="large" color={ORANGE} />
            <Text style={styles.gameLoadingText}>loading your photo...</Text>
          </View>
        </SafeAreaView>
      );
    }

    return (
      <SafeAreaView style={styles.gameContainer}>
        {/* <View style={styles.topScribble} /> */}
        <KeyboardAvoidingView 
          style={{ flex: 1 }} 
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <View style={styles.gameContentWrapper}>
                      <Text style={styles.gamePromptLabel}>CAPTION</Text>
          <Text style={styles.gamePromptText}>what do you think is happening?</Text>
            
            <View style={styles.gamePhotoContainer}>
              <Image source={{ uri: assignedPhoto.uri }} style={styles.gamePhoto} />
            </View>

            <View style={styles.gameInputContainer}>
              <TextInput
                ref={commentInputRef}
                style={styles.gameCommentInput}
                placeholder="write your comment here..."
                placeholderTextColor="rgba(28, 28, 28, 0.5)"
                value={commentText}
                onChangeText={setCommentText}
                multiline={true}
                maxLength={200}
              />
              <Text style={styles.gameCharacterCount}>
                {commentText.length}/200
              </Text>
            </View>

            <TouchableOpacity
              style={[
                styles.gameButton,
                !commentText.trim() && { opacity: 1 }
              ]}
              onPress={submitComment}
              disabled={!commentText.trim() || submitting}
            >
              {submitting ? (
                <ActivityIndicator color="#1C1C1C" />
              ) : (
                <Text style={styles.gameButtonText}>submit caption →</Text>
              )}
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
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
    const winnerVotes = sortedPhotos.length > 0 ? voteCounts[sortedPhotos[0].id] : 0;

    return (
      <View style={styles.resultsContainer}>
        {/* Orange scribble decoration */}
        <View style={styles.topScribble} />
        
        <View style={styles.resultsContent}>
          {/* Header */}
          <Text style={styles.resultsLabel}>RESULTS</Text>
          <Text style={styles.resultsTitle}>voting complete!</Text>
          
          {/* Winner section */}
          {sortedPhotos.length > 0 && winnerVotes > 0 && (
            <View style={styles.winnerSection}>
              <Text style={styles.winnerText}>winner</Text>
              <View style={styles.winnerPhotoContainer}>
                <Image source={{ uri: sortedPhotos[0].uri }} style={styles.winnerPhoto} />
                <View style={styles.winnerBadge}>
                  <Text style={styles.winnerBadgeText}>👑 {winnerVotes} votes</Text>
                </View>
              </View>
            </View>
          )}
          
          {/* All results */}
          <View style={styles.allResultsSection}>
            <Text style={styles.allResultsTitle}>all photos</Text>
            <ScrollView 
              style={styles.resultsScrollView}
              showsVerticalScrollIndicator={false}
            >
              {sortedPhotos.map((photo, index) => (
                <View key={photo.id} style={styles.resultPhotoCard}>
                  <Image source={{ uri: photo.uri }} style={styles.resultPhoto} />
                  <View style={styles.resultVoteInfo}>
                    <Text style={styles.resultVoteCount}>
                      {index === 0 && voteCounts[photo.id] > 0 ? <Text>👑 </Text> : null}
                      {voteCounts[photo.id]} <Text>{voteCounts[photo.id] === 1 ? 'vote' : 'votes'}</Text>
                    </Text>
                  </View>
                </View>
              ))}
            </ScrollView>
          </View>
          
          {/* Stats */}
          <View style={styles.statsSection}>
            <Text style={styles.statsText}>
              {totalVotes} of {selectedGroup?.memberCount || totalVotes} members voted
            </Text>
          </View>
        </View>
      </View>
    );
  };

  const renderCommentResults = () => {
    // Count only captions that are non-empty strings
    const totalCaptions = Object.values(comments).filter(c => c.comment && c.comment.trim().length > 0).length;
    
    return (
      <View style={styles.resultsContainer}>
        <View style={styles.resultsContent}>
          {/* Header */}
          <Text style={styles.resultsLabel}>RESULTS</Text>
          <Text style={styles.resultsTitle}>captions revealed!</Text>
          
          {/* Photos with captions */}
          <ScrollView 
            style={styles.resultsScrollView}
            showsVerticalScrollIndicator={false}
          >
            {groupPhotos.map((photo) => {
              // Find all captions for this photo
              const photoCaptions = Object.entries(comments).filter(
                ([_, comment]) => comment.assignedPhotoId === photo.id && comment.comment && comment.comment.trim().length > 0
              );
              
              return (
                <View key={photo.id} style={styles.commentResultContainer}>
                  <Image source={{ uri: photo.uri }} style={styles.commentResultPhoto} />
                  
                  {photoCaptions.length > 0 ? (
                    <View style={styles.commentsList}>
                      {photoCaptions.map(([userId, comment], index) => (
                        <View key={userId} style={styles.commentResultBubble}>
                          <Text style={styles.commentResultText}>
                            <Text>"</Text>{comment.comment}<Text>"</Text>
                          </Text>
                        </View>
                      ))}
                    </View>
                  ) : (
                    <View style={styles.noCommentsResult}>
                      <Text style={styles.noCommentsResultText}>
                        no captions for this photo
                      </Text>
                    </View>
                  )}
                </View>
              );
            })}
          </ScrollView>
          
          {/* Stats */}
          <View style={styles.statsSection}>
            <Text style={styles.statsText}>
              {totalCaptions} of {selectedGroup?.memberCount || totalCaptions} members captioned
            </Text>
          </View>
        </View>
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
        <View style={styles.submittedContainer}>
          <Text style={styles.submittedText}>
            📸 Photo Submitted!
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
          style={styles.button}
          onPress={onNavigateToCamera}
        >
          <Text style={styles.buttonText}>
            📷 take photo
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

  // Show waiting screens if needed
  if (showWaitingForActivities) {
    return (
      <WaitingForActivities 
        selectedGroupId={selectedGroupId}
        onActivityReady={() => {
          setShowWaitingForActivities(false);
          loadGameData(); // Reload to get updated activity status
        }}
      />
    );
  }

  if (!loading && activityActive && !resultsReleased) {
    const userDone = (gameType === 'comment' && userHasCommented) || (gameType === 'voting' && userHasVoted);
    if (userDone) {
      return (
        <WaitingForResults
          selectedGroupId={selectedGroupId}
          gameType={gameType}
          onResultsReady={() => {
            // Mark results as released locally and fetch fresh data once
            setResultsReleased(true);
            loadGameData();
          }}
        />
      );
    }
  }

  return (
    <ScrollView style={[styles.container, { backgroundColor: BEIGE }]}>
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
                  style={styles.button}
                  onPress={onNavigateToCamera}
                >
                  <Text style={styles.buttonText}>
                    📷 take photo
                  </Text>
                </TouchableOpacity>
              </View>
            </>
          ) : (
            // If user has taken photo, check if they can see results or should play game
            <>
              {gameType === 'voting' ? (
                userHasVoted ? (
                  resultsReleased ? (
                    renderVoteResults()
                  ) : (
                    <WaitingForResults 
                      selectedGroupId={selectedGroupId}
                      gameType={gameType}
                      onResultsReady={() => {
                        loadGameData();
                      }}
                    />
                  )
                ) : renderPhotoVoting()
              ) : (
                userHasCommented ? (
                  resultsReleased ? (
                    renderCommentResults()
                  ) : (
                    <WaitingForResults 
                      selectedGroupId={selectedGroupId}
                      gameType={gameType}
                      onResultsReady={() => {
                        loadGameData();
                      }}
                    />
                  )
                ) : renderCommentGame()
              )}
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
    backgroundColor: BEIGE,
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
    backgroundColor: '#F7C52D', // Yellow background to match app design
    paddingVertical: 18,
    paddingHorizontal: 24,
    borderRadius: 16,
    alignItems: 'center',
    marginTop: 15,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 8,
    borderWidth: 2,
    borderColor: '#E85D42', // Orange border
  },
  buttonText: {
    fontSize: 17,
    fontWeight: '700',
    color: '#1C1C1C', // Dark text
    textTransform: 'lowercase',
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
  gameContainer: {
    flex: 1,
    backgroundColor: BEIGE,
  },
  topScribble: {
    position: 'absolute',
    top: 60,
    right: 30,
    width: 120,
    height: 40,
    borderWidth: 5,
    borderColor: ORANGE,
    transform: [{ rotate: '15deg' }],
  },
  gameContentWrapper: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingTop: 120,
    paddingBottom: 40,
    justifyContent: 'center',
  },
  gamePromptLabel: {
    fontSize: 20,
    fontWeight: '700',
    color: ORANGE,
    marginBottom: 6,
    textTransform: 'uppercase',
  },
  gamePromptText: {
    fontSize: 28,
    fontWeight: '700',
    lineHeight: 32,
    color: '#1C1C1C',
    marginBottom: 24,
    textTransform: 'lowercase',
  },
  gameDetailText: {
    fontSize: 16,
    color: '#1C1C1C',
    lineHeight: 22,
    textAlign: 'center',
  },
  gameLoadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  gameLoadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#1C1C1C',
    textTransform: 'lowercase',
  },
  gamePhotoContainer: {
    alignItems: 'center',
    marginBottom: 20,
  },
  gamePhoto: {
    width: '85%',
    aspectRatio: 1.2,
    borderRadius: 15,
    resizeMode: 'cover',
  },
  gameInputContainer: {
    marginBottom: 16,
  },
  gameCommentInput: {
    backgroundColor: 'white',
    borderWidth: 2,
    borderColor: 'rgba(28, 28, 28, 0.1)',
    borderRadius: 16,
    padding: 12,
    paddingTop: 12,
    fontSize: 16,
    color: '#1C1C1C',
    textAlignVertical: 'top',
    minHeight: 80,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  gameButton: {
    backgroundColor: ORANGE, // Yellow background to match app design
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 16,
    paddingVertical: 18,
    paddingHorizontal: 24,
    marginTop: 8,
    borderWidth: 2,
    borderColor: '#E85D42', // Orange border
  },
  gameButtonText: {
    fontSize: 17,
    fontWeight: '700',
    color: '#FFFFFF', // Dark text instead of white
    textTransform: 'lowercase',
  },
  gameCharacterCount: {
    fontSize: 12,
    textAlign: 'right',
    marginTop: 6,
    color: 'rgba(28, 28, 28, 0.6)',
  },
  submittedContainer: {
    backgroundColor: '#1C1C1C',
    padding: 20,
    borderRadius: 15,
    margin: 20,
    alignItems: 'center',
  },
  submittedText: {
    color: 'white',
    fontSize: 18,
    fontWeight: '600',
  },
  // New Results Page Styles
  resultsContainer: {
    flex: 1,
    backgroundColor: BEIGE,
  },
  resultsContent: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 80,
    paddingBottom: 20,
  },
  resultsLabel: {
    fontSize: 20,
    fontWeight: '700',
    color: ORANGE,
    marginBottom: 6,
    textTransform: 'uppercase',
  },
  resultsTitle: {
    fontSize: 28,
    fontWeight: '700',
    lineHeight: 32,
    color: '#1C1C1C',
    marginBottom: 32,
    textTransform: 'lowercase',
  },
  winnerSection: {
    alignItems: 'center',
    marginBottom: 32,
  },
  winnerText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1C1C1C',
    marginBottom: 16,
    textTransform: 'lowercase',
  },
  winnerPhotoContainer: {
    position: 'relative',
    alignItems: 'center',
  },
  winnerPhoto: {
    width: 200,
    height: 200,
    borderRadius: 20,
    resizeMode: 'cover',
  },
  winnerBadge: {
    position: 'absolute',
    bottom: -10,
    backgroundColor: ORANGE,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 5,
  },
  winnerBadgeText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
    textTransform: 'lowercase',
  },
  allResultsSection: {
    flex: 1,
    marginBottom: 20,
  },
  allResultsTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1C1C1C',
    marginBottom: 16,
    textTransform: 'lowercase',
  },
  resultsScrollView: {
    flex: 1,
  },
  resultPhotoCard: {
    marginBottom: 16,
    borderRadius: 15,
    overflow: 'hidden',
    backgroundColor: 'white',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  resultPhoto: {
    width: '100%',
    aspectRatio: 1,
    resizeMode: 'cover',
  },
  resultVoteInfo: {
    padding: 12,
    backgroundColor: 'white',
  },
  resultVoteCount: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1C1C1C',
    textAlign: 'center',
    textTransform: 'lowercase',
  },
  commentResultContainer: {
    marginBottom: 24,
    borderRadius: 15,
    overflow: 'hidden',
    backgroundColor: 'white',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  commentResultPhoto: {
    width: '100%',
    aspectRatio: 1,
    resizeMode: 'cover',
  },
  commentsList: {
    padding: 16,
  },
  commentResultBubble: {
    backgroundColor: '#F8F8F8',
    padding: 12,
    borderRadius: 12,
    marginBottom: 8,
    borderLeftWidth: 3,
    borderLeftColor: ORANGE,
  },
  commentResultText: {
    fontSize: 15,
    color: '#1C1C1C',
    lineHeight: 20,
    fontStyle: 'italic',
  },
  noCommentsResult: {
    padding: 20,
    alignItems: 'center',
  },
  noCommentsResultText: {
    fontSize: 14,
    color: 'rgba(28, 28, 28, 0.6)',
    fontStyle: 'italic',
    textTransform: 'lowercase',
  },
  statsSection: {
    alignItems: 'center',
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(28, 28, 28, 0.1)',
  },
  statsText: {
    fontSize: 14,
    color: 'rgba(28, 28, 28, 0.7)',
    textTransform: 'lowercase',
  },
}); 