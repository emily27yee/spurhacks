import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { useAuth } from '@/contexts/AuthContext';
import { appwriteDatabase } from '@/lib/appwrite';
import { Colors } from '@/constants/Colors';
import { useColorScheme } from '@/hooks/useColorScheme';

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
              // Count only comments that have actual content
              completedActivities = Object.values(todayComments).filter(
                c => c.comment && c.comment.trim().length > 0
              ).length;
            } catch (e) {
              console.error('Error parsing todaycomments:', e);
            }
          }
        }

        setCompletedCount(completedActivities);

        // Check if results are ready
        if (groupData.releaseresults) {
          onResultsReady();
          return;
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
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.tint} />
        <Text style={[styles.loadingText, { color: colors.text }]}>
          Checking results status...
        </Text>
      </View>
    );
  }

  const allActivitiesCompleted = completedCount >= totalMembers && totalMembers > 0;
  const activityName = gameType === 'voting' ? 'votes' : 'comments';

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.section}>
        <Text style={[styles.title, { color: colors.text }]}>
          ⏳ Waiting for Results
        </Text>
        
        <Text style={[styles.subtitle, { color: colors.tabIconDefault }]}>
          {allActivitiesCompleted 
            ? 'Everyone has participated! Results will be available soon.'
            : `${completedCount} of ${totalMembers} members have submitted their ${activityName}.`
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
                  width: `${totalMembers > 0 ? (completedCount / totalMembers) * 100 : 0}%`
                }
              ]} 
            />
          </View>
          <Text style={[styles.progressText, { color: colors.tabIconDefault }]}>
            {totalMembers > 0 ? Math.round((completedCount / totalMembers) * 100) : 0}% Complete
          </Text>
        </View>

        {/* Activity status */}
        <View style={styles.statusContainer}>
          <Text style={[styles.statusEmoji, { color: colors.text }]}>
            {allActivitiesCompleted ? '🎉' : '⏰'}
          </Text>
          <Text style={[styles.statusTitle, { color: colors.text }]}>
            {allActivitiesCompleted ? 'Activity Complete!' : 'Activity in Progress'}
          </Text>
          <Text style={[styles.statusText, { color: colors.tabIconDefault }]}>
            {allActivitiesCompleted 
              ? 'Great job everyone! The results are being prepared and will be revealed soon.'
              : `We're still waiting for ${totalMembers - completedCount} more ${activityName} to come in.`
            }
          </Text>
        </View>

        <View style={styles.messageContainer}>
          <Text style={[styles.messageTitle, { color: colors.text }]}>
            🏆 Results Coming Soon!
          </Text>
          <Text style={[styles.messageText, { color: colors.tabIconDefault }]}>
            {gameType === 'voting' 
              ? 'Once everyone has voted, we\'ll reveal which photos got the most votes!'
              : 'Once everyone has commented, we\'ll show all the creative responses!'
            }
          </Text>
          <Text style={[styles.messageSubtext, { color: colors.tabIconDefault }]}>
            Keep this screen open - results will appear automatically! ✨
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
  statusContainer: {
    alignItems: 'center',
    marginBottom: 30,
  },
  statusEmoji: {
    fontSize: 48,
    marginBottom: 10,
  },
  statusTitle: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 10,
    textAlign: 'center',
  },
  statusText: {
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 22,
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
    marginBottom: 10,
  },
  messageSubtext: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
    fontStyle: 'italic',
  },
}); 