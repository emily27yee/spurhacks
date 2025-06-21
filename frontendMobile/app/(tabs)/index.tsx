import React, { useState, useEffect } from 'react';
import { Image } from 'expo-image';
import { Platform, StyleSheet, ScrollView, TouchableOpacity, View, Dimensions, Alert, Modal, TextInput, ActivityIndicator, SafeAreaView } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';

import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import Games from '@/components/Games';
import { Colors } from '@/constants/Colors';
import { useColorScheme } from '@/hooks/useColorScheme';
import { useGroups } from '@/hooks/useGroups';

const { width } = Dimensions.get('window');

export default function HomeScreen() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const { userGroups, isLoading: groupsLoading, createGroup } = useGroups();
  const router = useRouter();
  const params = useLocalSearchParams();
  
  // Debug: Log groups in home screen
  useEffect(() => {
    console.log('Home screen - userGroups:', userGroups);
  }, [userGroups]);
  // Modal states
  const [showCreateGroupModal, setShowCreateGroupModal] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  const [isCreatingGroup, setIsCreatingGroup] = useState(false);
  const [selectedGroupId, setSelectedGroupId] = useState<string>('');
  const [showGames, setShowGames] = useState(false);

  // Mock data for demonstration
  const dailyPhotos = [
    { day: 'Mon', taken: true, count: 3 },
    { day: 'Tue', taken: true, count: 2 },
    { day: 'Wed', taken: false, count: 0 },
    { day: 'Thu', taken: true, count: 4 },
    { day: 'Fri', taken: false, count: 0 },
    { day: 'Sat', taken: false, count: 0 },
    { day: 'Sun', taken: false, count: 0 },
  ];

  const currentPrompt = {
    title: "Who's lunch would you feed to a raccoon?",
    type: "vote",
    timeLeft: "2 days left",
  };

  // Generate group colors based on group ID
  const getGroupColor = (groupId: string) => {
    const colors = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FECA57', '#FF9FF3', '#54A0FF'];
    const index = groupId.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0) % colors.length;
    return colors[index];
  };
  const handleCreateGroup = async () => {
    if (!newGroupName.trim()) {
      Alert.alert('Error', 'Please enter a group name');
      return;
    }

    try {
      setIsCreatingGroup(true);
      await createGroup(newGroupName.trim());
      setShowCreateGroupModal(false);
      setNewGroupName('');
      Alert.alert('Success', 'Group created successfully!');
    } catch (error) {
      Alert.alert('Error', 'Failed to create group. Please try again.');
    } finally {
      setIsCreatingGroup(false);
    }
  };

  const handleGroupSelect = (groupId: string) => {
    setSelectedGroupId(groupId);
    setShowGames(true);
  };

  const handleNavigateToCamera = () => {
    router.push('/camera');
  };

  // Auto-select first group if only one exists
  useEffect(() => {
    if (userGroups.length === 1 && !selectedGroupId) {
      setSelectedGroupId(userGroups[0].$id);
    }
  }, [userGroups]);

  // Handle URL parameters for automatic games navigation
  useEffect(() => {
    if (params.showGames === 'true' && params.groupId && userGroups.length > 0) {
      const groupExists = userGroups.find(g => g.$id === params.groupId);
      if (groupExists) {
        setSelectedGroupId(params.groupId as string);
        setShowGames(true);
        // Clear the URL parameters after handling them
        router.replace('/(tabs)');
      }
    }
  }, [params, userGroups]);
  if (showGames && selectedGroupId) {
    const selectedGroup = userGroups.find(g => g.$id === selectedGroupId)
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.gamesHeader}>
          <TouchableOpacity 
            style={styles.backButton}
            onPress={() => setShowGames(false)}
          >
            <ThemedText style={[styles.backButtonText, { color: colors.tint }]}>← Back</ThemedText>
          </TouchableOpacity>
          <View style={styles.headerTitleContainer}>
            <ThemedText style={styles.headerTitle}>Photo Games</ThemedText>
            <ThemedText style={styles.headerSubtitle}>{selectedGroup?.name}</ThemedText>
          </View>
          <View style={styles.backButton} />
        </View>
        <Games 
          selectedGroupId={selectedGroupId}
          onNavigateToCamera={handleNavigateToCamera}
        />
      </SafeAreaView>
    );
  }

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <ThemedView style={styles.header}>
        <ThemedText type="title" style={styles.appTitle}>Week Dump 📸</ThemedText>
        <ThemedText style={styles.subtitle}>Share your week, one photo at a time</ThemedText>
      </ThemedView>

      {/* Daily Photo Tracker */}
      <ThemedView style={styles.section}>
        <ThemedText type="subtitle" style={styles.sectionTitle}>This Week's Photos</ThemedText>
        <ThemedView style={styles.weekTracker}>
          {dailyPhotos.map((photo, index) => (
            <TouchableOpacity key={index} style={styles.dayContainer}>
              <ThemedView style={[
                styles.dayCircle,
                { backgroundColor: photo.taken ? colors.tint : colors.icon + '30' }
              ]}>
                <ThemedText style={[
                  styles.dayText,
                  { color: photo.taken ? '#fff' : colors.icon }
                ]}>
                  {photo.day}
                </ThemedText>
              </ThemedView>
              {photo.taken && (
                <ThemedText style={styles.photoCount}>{photo.count}</ThemedText>
              )}
            </TouchableOpacity>
          ))}
        </ThemedView>
        <TouchableOpacity 
          style={[styles.addPhotoButton, { backgroundColor: colors.tint }]}
          onPress={() => router.push('/camera')}
        >
          <ThemedText style={[styles.addPhotoText, { color: colors.buttonText }]}>📷 Take Today's Photo</ThemedText>
        </TouchableOpacity>
      </ThemedView>

      {/* Current Prompt */}
      <ThemedView style={styles.section}>
        <ThemedText type="subtitle" style={styles.sectionTitle}>This Week's Prompt</ThemedText>
        <ThemedView style={[styles.promptCard, { borderColor: colors.tint + '30' }]}>
          <ThemedText style={styles.promptTitle}>{currentPrompt.title}</ThemedText>
          <ThemedView style={styles.promptMeta}>
            <ThemedText style={[styles.promptType, { backgroundColor: colors.tint + '20', color: colors.tint }]}>
              👆 Vote
            </ThemedText>
            <ThemedText style={styles.timeLeft}>{currentPrompt.timeLeft}</ThemedText>
          </ThemedView>
        </ThemedView>
      </ThemedView>

      {/* Your Groups */}
      <ThemedView style={styles.section}>
        <ThemedView style={styles.sectionHeader}>
          <ThemedText type="subtitle" style={styles.sectionTitle}>Your Groups</ThemedText>
          <TouchableOpacity 
            onPress={() => setShowCreateGroupModal(true)}
            style={[styles.createGroupButton, { backgroundColor: colors.tint }]}
          >
            <ThemedText style={[styles.createGroupButtonText, { color: colors.buttonText }]}>+ Create</ThemedText>
          </TouchableOpacity>
        </ThemedView>
        
        {groupsLoading ? (
          <ThemedView style={styles.loadingContainer}>
            <ActivityIndicator size="small" color={colors.tint} />
            <ThemedText style={styles.loadingText}>Loading groups...</ThemedText>
          </ThemedView>
        ) : (
          <>
            {userGroups.length === 0 ? (
              <ThemedView style={styles.emptyGroupsContainer}>
                <ThemedText style={styles.emptyGroupsText}>You haven't joined any groups yet.</ThemedText>
                <ThemedText style={styles.emptyGroupsSubtext}>Create a new group or join existing ones to get started!</ThemedText>
              </ThemedView>            ) : (
              userGroups.map((group) => (
                <TouchableOpacity 
                  key={group.$id} 
                  style={[styles.groupCard, { borderLeftColor: getGroupColor(group.$id) }]}
                  onPress={() => handleGroupSelect(group.$id)}
                >
                  <ThemedView style={styles.groupInfo}>
                    <ThemedText style={styles.groupName}>{group.name}</ThemedText>
                    <ThemedView style={styles.groupMeta}>
                      <ThemedText style={styles.groupMembers}>{group.memberCount} members</ThemedText>
                      {group.userRole === 'captain' && (
                        <ThemedText style={[styles.roleText, { color: colors.tint }]}>Captain</ThemedText>
                      )}
                    </ThemedView>
                    <ThemedText style={[styles.gamePrompt, { color: colors.tabIconDefault }]}>
                      🎮 Tap to play daily games
                    </ThemedText>
                  </ThemedView>
                  <ThemedView style={[styles.groupIndicator, { backgroundColor: getGroupColor(group.$id) }]} />
                </TouchableOpacity>
              ))
            )}
          </>
        )}
      </ThemedView>

      {/* Quick Actions */}
      <ThemedView style={styles.section}>
        <ThemedText type="subtitle" style={styles.sectionTitle}>Quick Actions</ThemedText>
        <ThemedView style={styles.actionGrid}>
          <TouchableOpacity style={[styles.actionCard, { backgroundColor: colors.tint + '10' }]}>
            <ThemedText style={styles.actionEmoji}>🗓️</ThemedText>
            <ThemedText style={styles.actionText}>View Previous Weeks</ThemedText>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.actionCard, { backgroundColor: colors.tint + '10' }]}>
            <ThemedText style={styles.actionEmoji}>👥</ThemedText>
            <ThemedText style={styles.actionText}>Join New Group</ThemedText>
          </TouchableOpacity>
        </ThemedView>
      </ThemedView>

      {/* Friday Reminder */}
      <ThemedView style={[styles.reminderCard, { backgroundColor: '#FFF3CD', borderColor: '#FFEAA7' }]}>
        <ThemedText style={[styles.reminderTitle, { color: '#856404' }]}>📅 Friday Reminder</ThemedText>
        <ThemedText style={[styles.reminderText, { color: '#856404' }]}>
          Don't forget to submit your week's photos tomorrow! Choose which photos each group gets to see.
        </ThemedText>
      </ThemedView>

      {/* Create Group Modal */}
      <Modal
        visible={showCreateGroupModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowCreateGroupModal(false)}
      >
        <View style={styles.modalOverlay}>
          <ThemedView style={[styles.modalContent, { backgroundColor: colors.background }]}>
            <ThemedText type="subtitle" style={styles.modalTitle}>Create New Group</ThemedText>
            <TextInput
              style={[styles.groupNameInput, { borderColor: colors.icon + '30', color: colors.text }]}
              placeholder="Enter group name"
              placeholderTextColor={colors.icon}
              value={newGroupName}
              onChangeText={setNewGroupName}
              maxLength={50}
            />
            <ThemedView style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => {
                  setShowCreateGroupModal(false);
                  setNewGroupName('');
                }}
              >
                <ThemedText style={styles.cancelButtonText}>Cancel</ThemedText>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.createButton, { backgroundColor: colors.tint }]}
                onPress={handleCreateGroup}
                disabled={isCreatingGroup}
              >
                {isCreatingGroup ? (
                  <ActivityIndicator size="small" color={colors.buttonText} />
                ) : (
                  <ThemedText style={[styles.createButtonText, { color: colors.buttonText }]}>Create</ThemedText>
                )}
              </TouchableOpacity>
            </ThemedView>
          </ThemedView>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    alignItems: 'center',
    paddingTop: 60,
    paddingBottom: 20,
    paddingHorizontal: 20,
  },
  appTitle: {
    marginBottom: 8,
  },
  subtitle: {
    opacity: 0.7,
    textAlign: 'center',
  },
  section: {
    marginHorizontal: 20,
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    marginBottom: 16,
  },
  createGroupButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  createGroupButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  weekTracker: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  dayContainer: {
    alignItems: 'center',
  },
  dayCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 4,
  },
  dayText: {
    fontSize: 12,
    fontWeight: '600',
  },
  photoCount: {
    fontSize: 12,
    opacity: 0.7,
  },
  addPhotoButton: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 12,
    alignItems: 'center',
  },
  addPhotoText: {
    fontWeight: '600',
    fontSize: 16,
  },
  promptCard: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
  },
  promptTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 12,
  },
  promptMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  promptType: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    fontSize: 14,
    fontWeight: '600',
  },
  timeLeft: {
    opacity: 0.7,
    fontSize: 14,
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 20,
  },
  loadingText: {
    marginLeft: 8,
    opacity: 0.7,
  },
  emptyGroupsContainer: {
    padding: 20,
    alignItems: 'center',
  },
  emptyGroupsText: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
    textAlign: 'center',
  },
  emptyGroupsSubtext: {
    opacity: 0.7,
    textAlign: 'center',
  },
  groupCard: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 16,
    marginBottom: 12,
    borderRadius: 12,
    borderLeftWidth: 4,
  },
  groupInfo: {
    flex: 1,
  },
  groupName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  groupMeta: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  groupMembers: {
    opacity: 0.7,
    fontSize: 14,
    marginRight: 12,
  },
  roleText: {
    fontSize: 12,
    fontWeight: '600',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
    backgroundColor: 'rgba(0, 122, 255, 0.1)',
  },  groupIndicator: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  gamePrompt: {
    fontSize: 12,
    marginTop: 4,
    fontStyle: 'italic',
  },
  actionGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  actionCard: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 20,
    paddingHorizontal: 16,
    borderRadius: 12,
    marginHorizontal: 4,
  },
  actionEmoji: {
    fontSize: 24,
    marginBottom: 8,
  },
  actionText: {
    fontSize: 14,
    textAlign: 'center',
    fontWeight: '500',
  },
  reminderCard: {
    margin: 20,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
  },
  reminderTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  reminderText: {
    fontSize: 14,
    lineHeight: 20,
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: width - 40,
    padding: 24,
    borderRadius: 16,
    maxWidth: 400,
  },
  modalTitle: {
    textAlign: 'center',
    marginBottom: 20,
  },
  groupNameInput: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    marginBottom: 24,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  modalButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginHorizontal: 6,
  },
  cancelButton: {
    backgroundColor: '#f0f0f0',
  },
  cancelButtonText: {
    color: '#666',
    fontWeight: '600',
  },
  createButton: {
    minHeight: 44,
    justifyContent: 'center',
  },  createButtonText: {
    fontWeight: '600',
  },
  // Games navigation styles
  gamesHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingTop: Platform.OS === 'android' ? 40 : 10,
    paddingBottom: 10,
  },
  backButton: {
    padding: 8,
  },
  backButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  headerTitleContainer: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  headerSubtitle: {
    fontSize: 14,
    opacity: 0.7,
    marginTop: 2,
  },
});
