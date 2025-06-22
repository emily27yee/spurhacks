import { useState, useEffect, useCallback } from 'react';
import { appwriteDatabase, type GroupData, type GroupMember } from '@/lib/appwrite';
import { useAuth } from '@/contexts/AuthContext';

export interface Group {
  $id: string;
  name: string;
  members: GroupMember[];
  memberCount: number;
  userRole: 'captain' | 'member' | null;
  isUserMember: boolean;
  todaydata?: string;
}

export const useGroups = () => {
  const { user } = useAuth();
  const [userGroups, setUserGroups] = useState<Group[]>([]);
  const [allGroups, setAllGroups] = useState<Group[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch user's groups
  const fetchUserGroups = useCallback(async (silent: boolean = false) => {
    if (!user) return;

    try {
      if (!silent) setIsLoading(true);
      setError(null);

      // Get user data to get group IDs
      const userData = await appwriteDatabase.getUserData(user.$id);
      const groupIds = userData.groups ? userData.groups.split(',').filter((id: string) => id.length > 0) : [];
      
      console.log('Fetching user groups for user:', user.$id);
      console.log('User groups field:', userData.groups);
      console.log('Parsed group IDs:', groupIds);

      if (groupIds.length === 0) {
        console.log('No groups found for user');
        setUserGroups([]);
        return;
      }

      // Fetch group data
      const groupsData = await appwriteDatabase.getMultipleGroups(groupIds);
      
      const processedGroups = groupsData.map((groupData: any) => {
        const members: GroupMember[] = JSON.parse(groupData.members);
        const userMember = members.find(member => member.userId === user.$id);
        
        return {
          $id: groupData.$id,
          name: groupData.name,
          members,
          memberCount: members.length,
          userRole: userMember?.role || null,
          isUserMember: !!userMember,
          todaydata: groupData.todaydata,
        };
      });

      console.log('Processed groups:', processedGroups);
      setUserGroups(processedGroups);
    } catch (error) {
      console.error('Error fetching user groups:', error);
      setError('Failed to load your groups');
    } finally {
      if (!silent) setIsLoading(false);
    }
  }, [user]);

  // Fetch all groups for discovery
  const fetchAllGroups = useCallback(async () => {
    if (!user) return;

    try {
      setIsLoading(true);
      setError(null);

      const groupsData = await appwriteDatabase.getAllGroups();
      
      const processedGroups = groupsData.map((groupData: any) => {
        const members: GroupMember[] = JSON.parse(groupData.members);
        const userMember = members.find(member => member.userId === user.$id);
        
        return {
          $id: groupData.$id,
          name: groupData.name,
          members,
          memberCount: members.length,
          userRole: userMember?.role || null,
          isUserMember: !!userMember,
          todaydata: groupData.todaydata,
        };
      });

      setAllGroups(processedGroups);
    } catch (error) {
      console.error('Error fetching all groups:', error);
      setError('Failed to load groups');
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  // Create a new group
  const createGroup = async (groupName: string) => {
    if (!user) throw new Error('User not authenticated');

    try {
      setIsLoading(true);
      await appwriteDatabase.createGroup(groupName, user.$id, user.name);
      await fetchUserGroups(false); // Refresh user groups with loading
      return true;
    } catch (error) {
      console.error('Error creating group:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  // Join a group
  const joinGroup = async (groupId: string) => {
    if (!user) throw new Error('User not authenticated');

    try {
      setIsLoading(true);
      await appwriteDatabase.joinGroup(groupId, user.$id, user.name);
      await fetchUserGroups(false); // Refresh user groups with loading
      await fetchAllGroups(); // Refresh all groups to update member counts
      return true;
    } catch (error) {
      console.error('Error joining group:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  // Leave a group
  const leaveGroup = async (groupId: string) => {
    if (!user) throw new Error('User not authenticated');

    const originalUserGroups = [...userGroups];
    const originalAllGroups = [...allGroups];

    // Optimistically update the UI
    setUserGroups(prev => prev.filter(g => g.$id !== groupId));
    setAllGroups(prev => prev.map(g => {
        if (g.$id === groupId) {
          const newMembers = g.members.filter(m => m.userId !== user.$id);
          return {
            ...g,
            isUserMember: false,
            members: newMembers,
            memberCount: newMembers.length,
            userRole: null,
          };
        }
        return g;
      })
    );
    
    try {
      await appwriteDatabase.leaveGroup(groupId, user.$id);
      fetchUserGroups(true);
      fetchAllGroups();
    } catch (error) {
      // If the API call fails, revert the UI changes
      setUserGroups(originalUserGroups);
      setAllGroups(originalAllGroups);
      console.error('Error leaving group:', error);
      throw error; // Re-throw to be handled by the component
    }
  };

  // Update group name (captain only)
  const updateGroupName = async (groupId: string, newName: string) => {
    if (!user) throw new Error('User not authenticated');

    try {
      setIsLoading(true);
      await appwriteDatabase.updateGroupName(groupId, newName, user.$id);
      await fetchUserGroups(false); // Refresh user groups with loading
      return true;
    } catch (error) {
      console.error('Error updating group name:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  // Load user groups on mount
  useEffect(() => {
    if (user) {
      fetchUserGroups();
    }
  }, [user]);

  return {
    userGroups,
    allGroups,
    isLoading,
    error,
    createGroup,
    joinGroup,
    leaveGroup,
    updateGroupName,
    fetchUserGroups,
    fetchAllGroups,
  };
}; 