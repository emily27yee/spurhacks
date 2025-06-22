import React, { useState, useEffect } from 'react';
import { StyleSheet, ScrollView, TouchableOpacity, View, TextInput, Alert, ActivityIndicator, Modal, Dimensions, Image } from 'react-native';
import { router } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';

import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { Colors } from '@/constants/Colors';
import { useColorScheme } from '@/hooks/useColorScheme';
import { useAuth } from '@/contexts/AuthContext';
import { useUserProfile } from '@/hooks/useUserProfile';
import { useGroups, type Group } from '@/hooks/useGroups';
import { appwriteDatabase } from '@/lib/appwrite';

const { width } = Dimensions.get('window');

export default function ProfileScreen() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const { logout, user } = useAuth();
  const { userProfile, isLoading: profileLoading, error, updateProfile } = useUserProfile();
  const { 
    userGroups, 
    allGroups, 
    isLoading: groupsLoading, 
    joinGroup, 
    leaveGroup, 
    updateGroupName,
    fetchAllGroups,
    fetchUserGroups 
  } = useGroups();

  // States
  const [showJoinableGroups, setShowJoinableGroups] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editedName, setEditedName] = useState('');
  const [editedUsername, setEditedUsername] = useState('');
  const [editingGroupId, setEditingGroupId] = useState<string | null>(null);
  const [editingGroupName, setEditingGroupName] = useState('');

  // Update editedName and editedUsername when userProfile changes
  useEffect(() => {
    if (userProfile) {
      setEditedName(userProfile.name);
      setEditedUsername(userProfile.username);
    }
  }, [userProfile]);

  // Manual refresh function for discover button
  const handleRefreshGroups = () => {
    fetchUserGroups(false); // Show loading when manually refreshing
  };

  // Debug: Log groups in profile screen
  useEffect(() => {
    console.log('Profile screen - userGroups:', userGroups);
    console.log('Profile screen - userGroups length:', userGroups.length);
  }, [userGroups]);

  // Generate group colors based on group ID
  const getGroupColor = (groupId: string) => {
    const groupColors = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FECA57', '#FF9FF3', '#54A0FF'];
    const index = groupId.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0) % groupColors.length;
    return groupColors[index];
  };

  // Get joinable groups (groups user is not a member of)
  const getJoinableGroups = () => {
    return allGroups.filter(group => !group.isUserMember);
  };

  const handleJoinGroup = async (group: Group) => {
    Alert.alert(
      'Join Group',
      `Are you sure you want to join "${group.name}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Join', 
          onPress: async () => {
            try {
              await joinGroup(group.$id);
              Alert.alert('Success', 'You have joined the group!');
            } catch (error) {
              Alert.alert('Error', 'Failed to join group. Please try again.');
            }
          }
        }
      ]
    );
  };

  const handleLeaveGroup = async (group: Group) => {
    Alert.alert(
      'Leave Group',
      `Are you sure you want to leave "${group.name}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Leave', 
          style: 'destructive', 
          onPress: async () => {
            try {
              await leaveGroup(group.$id);
              Alert.alert('Success', 'You have left the group.');
            } catch (error) {
              Alert.alert('Error', 'Failed to leave group. Please try again.');
            }
          }
        }
      ]
    );
  };

  const handleEditGroupName = (group: Group) => {
    setEditingGroupId(group.$id);
    setEditingGroupName(group.name);
  };

  const handleSaveGroupName = async () => {
    if (!editingGroupId || !editingGroupName.trim()) return;

    try {
      await updateGroupName(editingGroupId, editingGroupName.trim());
      setEditingGroupId(null);
      setEditingGroupName('');
      Alert.alert('Success', 'Group name updated successfully!');
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to update group name');
    }
  };

  const handleDiscoverGroups = () => {
    fetchUserGroups(false); // Refresh user groups first
    fetchAllGroups();
    setShowJoinableGroups(true);
  };

  const handleSaveProfile = async () => {
    if (!userProfile) return;
    
    // Validate username - should not be empty and should be alphanumeric with underscores/dots
    const usernameRegex = /^[a-zA-Z0-9._]+$/;
    if (!editedUsername.trim()) {
      Alert.alert('Error', 'Username cannot be empty');
      return;
    }
    if (!usernameRegex.test(editedUsername)) {
      Alert.alert('Error', 'Username can only contain letters, numbers, dots, and underscores');
      return;
    }
    if (editedUsername.length < 3) {
      Alert.alert('Error', 'Username must be at least 3 characters long');
      return;
    }
    
    try {
      const success = await updateProfile({ 
        name: editedName, 
        username: editedUsername 
      });
      if (success) {
        setIsEditing(false);
      } else {
        Alert.alert('Error', 'Failed to update profile');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to update profile');
    }
  };

  // Show loading state
  if (profileLoading) {
    return (
      <ThemedView style={[styles.container, { backgroundColor: colors.background, justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={colors.tint} />
        <ThemedText style={{ marginTop: 16, opacity: 0.7 }}>Loading profile...</ThemedText>
      </ThemedView>
    );
  }

  // Show error state
  if (error || !userProfile) {
    return (
      <ThemedView style={[styles.container, { backgroundColor: colors.background, justifyContent: 'center', alignItems: 'center', padding: 20 }]}>
        <ThemedText style={{ textAlign: 'center', marginBottom: 16 }}>
          {error || 'Failed to load profile'}
        </ThemedText>
        <TouchableOpacity 
          style={[styles.editButton, { backgroundColor: '#007AFF' }]}
          onPress={() => router.replace('/(tabs)/explore')}
        >
          <ThemedText style={styles.editButtonText}>Retry</ThemedText>
        </TouchableOpacity>
      </ThemedView>
    );
  }

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <ThemedView style={styles.header}>
        <ThemedView style={styles.avatarContainer}>
          <ThemedText style={styles.avatarText}>
            {userProfile.name.split(' ').map((n: string) => n[0]).join('')}
          </ThemedText>
        </ThemedView>
        <ThemedText type="title" style={styles.userName}>{userProfile.name}</ThemedText>
        <ThemedText style={styles.userEmail}>{userProfile.email}</ThemedText>
      </ThemedView>

      {/* Profile Stats */}
      <ThemedView style={styles.section}>
        <ThemedText type="subtitle" style={styles.sectionTitle}>Your Stats</ThemedText>
        <ThemedView style={styles.statsContainer}>
          <ThemedView style={styles.statItem}>
            <ThemedText style={styles.statNumber}>{userProfile.totalPhotos}</ThemedText>
            <ThemedText style={styles.statLabel}>Photos Shared</ThemedText>
          </ThemedView>
          <ThemedView style={styles.statItem}>
            <ThemedText style={styles.statNumber}>{userProfile.weeksActive}</ThemedText>
            <ThemedText style={styles.statLabel}>Weeks Active</ThemedText>
          </ThemedView>
          <ThemedView style={styles.statItem}>
            <ThemedText style={styles.statNumber}>{userGroups.length}</ThemedText>
            <ThemedText style={styles.statLabel}>Groups Joined</ThemedText>
          </ThemedView>
        </ThemedView>
      </ThemedView>

      {/* Edit Profile */}
      <ThemedView style={styles.section}>
        <ThemedView style={styles.sectionHeader}>
          <ThemedText type="subtitle" style={styles.sectionTitle}>Profile Info</ThemedText>
          <TouchableOpacity 
            onPress={() => isEditing ? handleSaveProfile() : setIsEditing(true)}
            style={[styles.editButton, { backgroundColor: isEditing ? '#4CAF50' : '#007AFF' }]}
          >
            <ThemedText style={styles.editButtonText}>
              {isEditing ? 'Save' : 'Edit'}
            </ThemedText>
          </TouchableOpacity>
        </ThemedView>
        
        <ThemedView style={styles.profileInfo}>
          <ThemedView style={styles.infoItem}>
            <ThemedText style={styles.infoLabel}>Name</ThemedText>
            {isEditing ? (
              <TextInput
                style={[styles.textInput, { color: colors.text, borderColor: '#007AFF' }]}
                value={editedName}
                onChangeText={setEditedName}
                placeholder="Enter your name"
              />
            ) : (
              <ThemedText style={styles.infoValue}>{userProfile.name}</ThemedText>
            )}
          </ThemedView>
          <ThemedView style={styles.infoItem}>
            <ThemedText style={styles.infoLabel}>Email</ThemedText>
            <ThemedText style={styles.infoValue}>{userProfile.email}</ThemedText>
          </ThemedView>
          <ThemedView style={styles.infoItem}>
            <ThemedText style={styles.infoLabel}>Username</ThemedText>
            {isEditing ? (
              <ThemedView style={styles.usernameContainer}>
                <ThemedText style={styles.usernamePrefix}>@</ThemedText>
                                 <TextInput
                   style={[styles.textInput, styles.usernameInput, { color: colors.text, borderColor: '#007AFF' }]}
                   value={editedUsername}
                   onChangeText={setEditedUsername}
                   placeholder="Enter username"
                   autoCapitalize="none"
                   autoCorrect={false}
                 />
              </ThemedView>
            ) : (
              <ThemedText style={styles.infoValue}>@{userProfile.username}</ThemedText>
            )}
          </ThemedView>
          <ThemedView style={styles.infoItem}>
            <ThemedText style={styles.infoLabel}>Member Since</ThemedText>
            <ThemedText style={styles.infoValue}>{userProfile.joinDate}</ThemedText>
          </ThemedView>
        </ThemedView>
      </ThemedView>

      {/* Groups Management */}
      <ThemedView style={styles.section}>
        <ThemedView style={styles.sectionHeader}>
          <ThemedText type="subtitle" style={styles.sectionTitle}>Your Groups</ThemedText>
          <ThemedView style={styles.buttonGroup}>
            <TouchableOpacity 
              onPress={handleRefreshGroups}
              style={[styles.refreshButton, { backgroundColor: colors.background, borderColor: colors.tint }]}
            >
              <ThemedText style={[styles.refreshButtonText, { color: colors.tint }]}>🔄</ThemedText>
            </TouchableOpacity>
            <TouchableOpacity 
              onPress={handleDiscoverGroups}
              style={[styles.discoverButton, { backgroundColor: colors.tint }]}
            >
              <ThemedText style={[styles.discoverButtonText, { color: colors.buttonText }]}>Discover</ThemedText>
            </TouchableOpacity>
          </ThemedView>
        </ThemedView>

        {groupsLoading ? (
          <ThemedView style={styles.loadingContainer}>
            <ActivityIndicator size="small" color={colors.tint} />
            <ThemedText style={styles.loadingText}>Loading groups...</ThemedText>
          </ThemedView>
        ) : (
          <>
            {userGroups.length === 0 ? (
              <ThemedView style={styles.emptyContainer}>
                <ThemedText style={styles.emptyText}>You haven&apos;t joined any groups yet.</ThemedText>
                <ThemedText style={styles.emptySubtext}>Discover and join groups to get started!</ThemedText>
              </ThemedView>
            ) : (
              userGroups.map((group) => (
                <ThemedView key={group.$id} style={[styles.groupCard, { borderLeftColor: getGroupColor(group.$id) }]}>
                  <ThemedView style={styles.groupHeader}>
                    {editingGroupId === group.$id ? (
                      <TextInput
                        style={[styles.groupNameInput, { color: colors.text, borderColor: colors.tint }]}
                        value={editingGroupName}
                        onChangeText={setEditingGroupName}
                        onBlur={handleSaveGroupName}
                        onSubmitEditing={handleSaveGroupName}
                        autoFocus
                      />
                    ) : (
                      <TouchableOpacity 
                        onPress={() => group.userRole === 'captain' ? handleEditGroupName(group) : undefined}
                        disabled={group.userRole !== 'captain'}
                      >
                        <ThemedText style={styles.groupName}>{group.name}</ThemedText>
                      </TouchableOpacity>
                    )}
                    <ThemedView style={styles.groupMeta}>
                      <ThemedText style={styles.groupMembers}>{group.memberCount} members</ThemedText>
                      <ThemedText style={[
                        styles.roleText, 
                        { 
                          color: group.userRole === 'captain' ? colors.tint : '#666',
                          backgroundColor: group.userRole === 'captain' ? colors.tint + '20' : '#f0f0f0'
                        }
                      ]}>
                        {group.userRole === 'captain' ? 'Captain' : 'Member'}
                      </ThemedText>
                    </ThemedView>
                  </ThemedView>
                  <ThemedView style={styles.groupActions}>
                    <TouchableOpacity 
                      onPress={() => handleLeaveGroup(group)}
                      style={styles.leaveButton}
                    >
                      <ThemedText style={styles.leaveButtonText}>Leave</ThemedText>
                    </TouchableOpacity>
                  </ThemedView>
                </ThemedView>
              ))
            )}
          </>
        )}
      </ThemedView>

      {/* Settings section removed as per requirements */}

      {/* Logout Button */}
      <ThemedView style={styles.section}>
        <TouchableOpacity 
          onPress={logout}
          style={[styles.logoutButton, { borderColor: colors.text + '30' }]}
        >
          <ThemedText style={[styles.logoutButtonText, { color: '#FF3B30' }]}>
            Sign Out
          </ThemedText>
        </TouchableOpacity>
      </ThemedView>

      {/* Group Discovery Modal */}
      <Modal
        visible={showJoinableGroups}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowJoinableGroups(false)}
      >
        <View style={styles.modalOverlay}>
          <ThemedView style={[styles.modalContent, { backgroundColor: colors.background }]}>
            <ThemedView style={styles.modalHeader}>
              <ThemedText type="subtitle" style={styles.modalTitle}>Discover Groups</ThemedText>
              <TouchableOpacity onPress={() => setShowJoinableGroups(false)}>
                <ThemedText style={styles.closeButton}>✕</ThemedText>
              </TouchableOpacity>
            </ThemedView>
            
            <ScrollView style={styles.modalScroll} showsVerticalScrollIndicator={false}>
              {getJoinableGroups().length === 0 ? (
                <ThemedView style={styles.emptyContainer}>
                  <ThemedText style={styles.emptyText}>No new groups to discover</ThemedText>
                  <ThemedText style={styles.emptySubtext}>You&apos;re already a member of all available groups!</ThemedText>
                </ThemedView>
              ) : (
                getJoinableGroups().map((group) => (
                  <ThemedView key={group.$id} style={[styles.discoverGroupCard, { borderLeftColor: getGroupColor(group.$id) }]}>
                    <ThemedView style={styles.discoverGroupInfo}>
                      <ThemedText style={styles.discoverGroupName}>{group.name}</ThemedText>
                      <ThemedText style={styles.discoverGroupMembers}>{group.memberCount} members</ThemedText>
                    </ThemedView>
                    <TouchableOpacity 
                      onPress={() => handleJoinGroup(group)}
                      style={[styles.joinButton, { backgroundColor: colors.tint }]}
                    >
                      <ThemedText style={[styles.joinButtonText, { color: colors.buttonText }]}>Join</ThemedText>
                    </TouchableOpacity>
                  </ThemedView>
                ))
              )}
            </ScrollView>
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
  avatarContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#4ECDC4',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  avatarText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
  },
  userName: {
    marginBottom: 4,
  },
  userEmail: {
    opacity: 0.7,
  },
  section: {
    marginHorizontal: 20,
    marginBottom: 24,
  },
  sectionTitle: {
    marginBottom: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 16,
    borderRadius: 12,
    backgroundColor: 'rgba(0,0,0,0.05)',
  },
  statItem: {
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    opacity: 0.7,
  },
  editButton: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 16,
  },
  editButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  profileInfo: {
    gap: 12,
  },
  infoItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  infoLabel: {
    fontSize: 14,
    opacity: 0.7,
  },
  infoValue: {
    fontSize: 14,
    fontWeight: '500',
  },
  textInput: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 14,
    minWidth: 120,
  },
  usernameContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  usernamePrefix: {
    fontSize: 14,
    fontWeight: '500',
    marginRight: 4,
    opacity: 0.7,
  },
  usernameInput: {
    minWidth: 100,
    flex: 0,
  },
  groupCard: {
    padding: 16,
    borderRadius: 12,
    borderLeftWidth: 4,
    marginBottom: 12,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  groupInfo: {
    gap: 8,
  },
  groupHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  groupName: {
    fontSize: 16,
    fontWeight: '600',
  },
  roleTag: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
    fontSize: 10,
    fontWeight: '600',
  },
  groupMembers: {
    fontSize: 12,
    opacity: 0.7,
  },
  groupActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  groupStatus: {
    fontSize: 12,
    fontWeight: '500',
  },
  leaveButton: {
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  leaveButtonText: {
    fontSize: 12,
    fontWeight: '600',
  },
  toggleButton: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 16,
  },
  toggleButtonText: {
    fontSize: 12,
    fontWeight: '600',
  },
  discoverSection: {
    gap: 12,
  },
  discoverCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    backgroundColor: 'rgba(0,0,0,0.05)',
  },
  discoverInfo: {
    flex: 1,
  },
  discoverName: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 2,
  },
  discoverDescription: {
    fontSize: 12,
    opacity: 0.7,
    marginBottom: 2,
  },
  discoverMembers: {
    fontSize: 10,
    opacity: 0.5,
  },
  joinButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  joinButtonText: {
    fontSize: 12,
    fontWeight: '600',
  },
  settingItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 4,
  },
  settingLabel: {
    fontSize: 16,
  },
  settingArrow: {
    fontSize: 16,
    opacity: 0.5,
  },
  signOutButton: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
  },
  signOutText: {
    fontSize: 16,
    fontWeight: '600',
  },
  // New styles for updated functionality
  discoverButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  discoverButtonText: {
    fontSize: 14,
    fontWeight: '600',
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
  emptyContainer: {
    padding: 20,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
    textAlign: 'center',
  },
  emptySubtext: {
    opacity: 0.7,
    textAlign: 'center',
  },
  groupNameInput: {
    borderWidth: 1,
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
    fontSize: 16,
    fontWeight: '600',
    minWidth: 150,
  },
  groupMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  roleText: {
    fontSize: 12,
    fontWeight: '600',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
    marginLeft: 8,
  },
  logoutButton: {
    borderWidth: 1,
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
  },
  logoutButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: width - 40,
    maxHeight: '80%',
    borderRadius: 16,
    padding: 0,
    maxWidth: 400,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  closeButton: {
    fontSize: 24,
    color: '#666',
    width: 30,
    height: 30,
    textAlign: 'center',
    lineHeight: 30,
  },
  modalScroll: {
    maxHeight: 400,
    padding: 20,
  },
  discoverGroupCard: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginBottom: 12,
    borderRadius: 8,
    borderLeftWidth: 4,
    backgroundColor: 'rgba(0,0,0,0.02)',
  },
  discoverGroupInfo: {
    flex: 1,
  },
  discoverGroupName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  discoverGroupMembers: {
    fontSize: 14,
    opacity: 0.7,
  },
  buttonGroup: {
    flexDirection: 'row',
    gap: 8,
  },
  refreshButton: {
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
  },
  refreshButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  photoContainer: {
    marginRight: 12,
    alignItems: 'center',
  },
  photoThumbnail: {
    width: 100,
    height: 100,
    borderRadius: 8,
  },
  photoDate: {
    fontSize: 10,
    marginTop: 4,
    opacity: 0.7,
  },
});
