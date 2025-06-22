import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
  SafeAreaView,
} from 'react-native';
import { useAuth } from '@/contexts/AuthContext';
import { appwriteDatabase } from '@/lib/appwrite';
import { Colors } from '@/constants/Colors';
import { useColorScheme } from '@/hooks/useColorScheme';

const ORANGE = '#E85D42';

interface WaitingForResultsProps {
  selectedGroupId: string;
  gameType: 'voting' | 'comment';
  onResultsReady: () => void;
}

export default function WaitingForResults({ selectedGroupId, gameType, onResultsReady }: WaitingForResultsProps) {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const { user } = useAuth();
  
  const [loading, setLoading] = useState(true);
  const [totalMembers, setTotalMembers] = useState(0);
  const [completedCount, setCompletedCount] = useState(0);

  useEffect(() => {
    let interval: any;
    
    const checkResultsStatus = async () => {
      try {
        // First, check if results should be released for this group
        await appwriteDatabase.checkAndReleaseResults(selectedGroupId, gameType);
        
        const groupData = await appwriteDatabase.getGroupData(selectedGroupId);
        
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
        setTotalMembers(memberCount);

        // Count completed activities based on game type
        let completedActivities = 0;
        if (gameType === 'voting') {
          let todayVotes: Record<string, string> = {};
          if (groupData.todayvotes) {
            try {
              todayVotes = JSON.parse(groupData.todayvotes);
              completedActivities = Object.keys(todayVotes).length;
            } catch (e) {
              console.error('Error parsing todayvotes:', e);
            }
          }
        } else {
          let todayComments: Record<string, { assignedPhotoId: string, comment: string }> = {};
          if (groupData.todaycomments) {
            try {
              todayComments = JSON.parse(groupData.todaycomments);
              // Count members who have actually submitted a comment (not just assigned)
              completedActivities = groupMembers.filter(member => {
                const userComment = todayComments[member.userId];
                return userComment && userComment.comment && userComment.comment.trim().length > 0;
              }).length;
              
              console.log('Comment completion status:');
              console.log('- Total members:', memberCount);
              console.log('- Completed comments:', completedActivities);
              console.log('- Raw comments data:', todayComments);
            } catch (e) {
              console.error('Error parsing todaycomments:', e);
            }
          }
        }

        setCompletedCount(completedActivities);

        // Check if results are ready - only when ALL members have actually completed
        const allCompleted = completedActivities >= memberCount && memberCount > 0;
        
        // Double check the database flag AND actual completion
        if (groupData.releaseresults && allCompleted) {
          console.log('Results ready - all members completed and results released');
          onResultsReady();
          return;
        } else if (groupData.releaseresults && !allCompleted) {
          console.log('WARNING: Database says results released but not all members have completed');
          // Don't call onResultsReady - keep waiting
        }
        
        setLoading(false);
      } catch (error) {
        console.error('Error checking results status:', error);
        setLoading(false);
      }
    };

    // Initial check
    checkResultsStatus();

    // Poll every 5 seconds
    interval = setInterval(checkResultsStatus, 5000);

    return () => {
      if (interval) {
        clearInterval(interval);
      }
    };
  }, [selectedGroupId, gameType, onResultsReady]);

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={ORANGE} />
          <Text style={styles.loadingText}>checking results...</Text>
        </View>
      </SafeAreaView>
    );
  }

  const allActivitiesCompleted = completedCount >= totalMembers && totalMembers > 0;
  const activityName = gameType === 'voting' ? 'votes' : 'comments';

  return (
    <SafeAreaView style={styles.container}>
      {/* <View style={styles.topScribble} /> */}
      <ScrollView contentContainerStyle={styles.contentWrapper}>
        <Text style={styles.promptLabel}>STATUS</Text>
        <Text style={styles.promptText}>waiting for results</Text>

        <View style={styles.progressContainer}>
          <View style={styles.progressBarBg}>
            <View
              style={[styles.progressBarFill, { width: `${totalMembers > 0 ? (completedCount / totalMembers) * 100 : 0}%` }]}
            />
          </View>
          <Text style={styles.progressText}>{totalMembers > 0 ? Math.round((completedCount / totalMembers) * 100) : 0}% complete</Text>
        </View>

        {/* Activity Status */}
        <View style={styles.activityContainer}>
          <Text style={styles.activityTitle}>
            {allActivitiesCompleted ? '🎉 activity complete!' : '⏰ activity in progress'}
          </Text>
          <Text style={styles.activityText}>
            {allActivitiesCompleted 
              ? `all ${totalMembers} members have submitted their ${activityName}! results are being prepared.`
              : `${completedCount} of ${totalMembers} members have submitted their ${activityName}.`
            }
          </Text>
        </View>

        {/* Member Progress Indicator */}
        <View style={styles.membersContainer}>
          <Text style={styles.membersLabel}>member progress</Text>
          <View style={styles.membersGrid}>
            {Array.from({ length: totalMembers }).map((_, idx) => (
              <View 
                key={idx} 
                style={[
                  styles.memberDot,
                  { backgroundColor: idx < completedCount ? ORANGE : 'rgba(0,0,0,0.1)' }
                ]} 
              />
            ))}
          </View>
        </View>

        {/* What's Next */}
        <View style={styles.nextContainer}>
          <Text style={styles.nextTitle}>🏆 what's next?</Text>
          <Text style={styles.nextText}>
            {gameType === 'voting' 
              ? 'once everyone votes, we\'ll reveal which photos got the most votes!'
              : 'once everyone comments, we\'ll show all the creative responses!'
            }
          </Text>
          <Text style={styles.hintText}>
            results will appear automatically - no need to refresh! ✨
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
  contentWrapper: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 32,
    paddingBottom: 40,
  },
  promptLabel: {
    fontSize: 24,
    fontWeight: '700',
    color: ORANGE,
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
    marginBottom: 40,
  },
  progressBarBg: {
    height: 12,
    borderRadius: 6,
    backgroundColor: 'rgba(0,0,0,0.1)',
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: ORANGE,
  },
  progressText: {
    marginTop: 8,
    textAlign: 'center',
    color: '#1C1C1C',
    fontWeight: '600',
    textTransform: 'lowercase',
  },
  activityContainer: {
    marginBottom: 40,
  },
  activityTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1C1C1C',
    marginBottom: 8,
    textTransform: 'lowercase',
  },
  activityText: {
    fontSize: 16,
    color: '#1C1C1C',
    lineHeight: 22,
  },
  membersContainer: {
    marginBottom: 40,
  },
  membersLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1C1C1C',
    marginBottom: 8,
    textTransform: 'lowercase',
  },
  membersGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  memberDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: 'rgba(0,0,0,0.1)',
  },
  nextContainer: {
    marginBottom: 40,
  },
  nextTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1C1C1C',
    marginBottom: 8,
    textTransform: 'lowercase',
  },
  nextText: {
    fontSize: 16,
    color: '#1C1C1C',
    lineHeight: 22,
    marginBottom: 8,
  },
  hintText: {
    fontSize: 14,
    color: '#1C1C1C',
    fontStyle: 'italic',
    opacity: 0.7,
  },
}); 