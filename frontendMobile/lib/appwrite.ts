// Use React-Native specific SDK so Storage uploads accept the `{ uri, name, type, size }` object
import {
  Client,
  Account,
  ID,
  Databases,
  Storage,
  Query,
} from 'react-native-appwrite';

// Appwrite configuration
export const appwriteConfig = {
  endpoint: 'https://nyc.cloud.appwrite.io/v1',
  projectId: 'dumpsterfire',
  databaseId: 'database',
  userDataCollectionId: 'userdata',
  groupDataCollectionId: 'groupdata',
  photoDataCollectionId: 'photodata',
  photosStorageBucketId: 'photos',
};

// Initialize Appwrite client
const client = new Client();

client
  .setEndpoint(appwriteConfig.endpoint)
  .setProject(appwriteConfig.projectId);

// Initialize services
export const account = new Account(client);
export const databases = new Databases(client);
export const storage = new Storage(client);

// Authentication functions
export const appwriteAuth = {
  // Create a new account
  createAccount: async (email: string, password: string, name: string) => {
    try {
      const newAccount = await account.create(ID.unique(), email, password, name);
      return newAccount;
    } catch (error) {
      console.error('Error creating account:', error);
      throw error;
    }
  },

  // Sign in with email and password
  signIn: async (email: string, password: string) => {
    try {
      const session = await account.createEmailPasswordSession(email, password);
      return session;
    } catch (error) {
      console.error('Error signing in:', error);
      throw error;
    }
  },

  // Get current user
  getCurrentUser: async () => {
    try {
      const currentUser = await account.get();
      return currentUser;
    } catch (error: any) {
      // Don't log guest/unauthenticated errors as they're expected
      if (error?.code === 401 || error?.message?.includes('missing scope')) {
        return null;
      }
      console.error('Error getting current user:', error);
      return null;
    }
  },

  // Sign out
  signOut: async () => {
    try {
      await account.deleteSession('current');
      return true;
    } catch (error) {
      console.error('Error signing out:', error);
      throw error;
    }
  },

  // Check if user is logged in
  isLoggedIn: async () => {
    try {
      const user = await account.get();
      return !!user;
    } catch (error: any) {
      // Don't log guest/unauthenticated errors as they're expected
      if (error?.code === 401 || error?.message?.includes('missing scope')) {
        return false;
      }
      return false;
    }
  },
};

// Group member interface
export interface GroupMember {
  userId: string;
  name: string;
  role: 'captain' | 'member';
}

// Group data interface
export interface GroupData {
  $id?: string;
  name: string;
  members: string; // JSON string containing GroupMember[]
  pastdata?: string;
  todaydata?: string;
  resultdata?: string;
  gameid?: number;
}

// Photo data interface
export interface PhotoData {
  $id?: string;
  userid: string;
  groupid: string;
}

// Database functions
export const appwriteDatabase = {
  // Create user data document
  createUserData: async (userId: string, userData: { name: string; email: string; username: string; groups: string }) => {
    try {
      const document = await databases.createDocument(
        appwriteConfig.databaseId,
        appwriteConfig.userDataCollectionId,
        userId, // Use userId as document ID
        userData
      );
      return document;
    } catch (error) {
      console.error('Error creating user data:', error);
      throw error;
    }
  },

  // Get user data
  getUserData: async (userId: string) => {
    try {
      const document = await databases.getDocument(
        appwriteConfig.databaseId,
        appwriteConfig.userDataCollectionId,
        userId
      );
      return document;
    } catch (error) {
      console.error('Error getting user data:', error);
      throw error;
    }
  },

  // Update user data
  updateUserData: async (userId: string, userData: Partial<{ name: string; email: string; username: string; groups: string }>) => {
    try {
      const document = await databases.updateDocument(
        appwriteConfig.databaseId,
        appwriteConfig.userDataCollectionId,
        userId,
        userData
      );
      return document;
    } catch (error) {
      console.error('Error updating user data:', error);
      throw error;
    }
  },

  // Group functions
  // Create a new group
  createGroup: async (groupName: string, creatorId: string, creatorName: string) => {
    try {
      const groupMembers: GroupMember[] = [{
        userId: creatorId,
        name: creatorName,
        role: 'captain'
      }];

      const groupData: Omit<GroupData, '$id'> = {
        name: groupName,
        members: JSON.stringify(groupMembers),
        pastdata: "",
        todaydata: "",
        resultdata: "",
        gameid: 0
      };

      const document = await databases.createDocument(
        appwriteConfig.databaseId,
        appwriteConfig.groupDataCollectionId,
        ID.unique(),
        groupData
      );

      // Update user's groups field
      await appwriteDatabase.addUserToGroup(creatorId, document.$id);

      return document;
    } catch (error) {
      console.error('Error creating group:', error);
      throw error;
    }
  },

  // Get group data by ID
  getGroupData: async (groupId: string) => {
    try {
      const document = await databases.getDocument(
        appwriteConfig.databaseId,
        appwriteConfig.groupDataCollectionId,
        groupId
      );
      return document as any;
    } catch (error) {
      console.error('Error getting group data:', error);
      throw error;
    }
  },

  // Get multiple groups by IDs
  getMultipleGroups: async (groupIds: string[]) => {
    try {
      if (groupIds.length === 0) return [];
      
      const queries = [Query.equal('$id', groupIds)];
      const response = await databases.listDocuments(
        appwriteConfig.databaseId,
        appwriteConfig.groupDataCollectionId,
        queries
      );
      return response.documents as any[];
    } catch (error) {
      console.error('Error getting multiple groups:', error);
      throw error;
    }
  },

  // Update group name (captain only)
  updateGroupName: async (groupId: string, newName: string, userId: string) => {
    try {
      // First, verify the user is a captain
      const groupData = await appwriteDatabase.getGroupData(groupId);
      const members: GroupMember[] = JSON.parse(groupData.members);
      
      const userMember = members.find(member => member.userId === userId);
      if (!userMember || userMember.role !== 'captain') {
        throw new Error('Only captains can update group name');
      }

      const document = await databases.updateDocument(
        appwriteConfig.databaseId,
        appwriteConfig.groupDataCollectionId,
        groupId,
        { name: newName }
      );
      return document;
    } catch (error) {
      console.error('Error updating group name:', error);
      throw error;
    }
  },

  // Join a group
  joinGroup: async (groupId: string, userId: string, userName: string) => {
    try {
      // Get current group data
      const groupData = await appwriteDatabase.getGroupData(groupId);
      const members: GroupMember[] = JSON.parse(groupData.members);
      
      // Check if user is already a member
      if (members.some(member => member.userId === userId)) {
        throw new Error('User is already a member of this group');
      }

      // Add new member
      const newMember: GroupMember = {
        userId: userId,
        name: userName,
        role: 'member'
      };
      members.push(newMember);

      // Update group document
      await databases.updateDocument(
        appwriteConfig.databaseId,
        appwriteConfig.groupDataCollectionId,
        groupId,
        { members: JSON.stringify(members) }
      );

      // Update user's groups field
      await appwriteDatabase.addUserToGroup(userId, groupId);

      return true;
    } catch (error) {
      console.error('Error joining group:', error);
      throw error;
    }
  },

  // Leave a group
  leaveGroup: async (groupId: string, userId: string) => {
    try {
      // Get current group data
      const groupData = await appwriteDatabase.getGroupData(groupId);
      const members: GroupMember[] = JSON.parse(groupData.members);
      
      // Check if user is a member
      const memberIndex = members.findIndex(member => member.userId === userId);
      if (memberIndex === -1) {
        throw new Error('User is not a member of this group');
      }

      // Remove member
      members.splice(memberIndex, 1);

      // If no members left, delete the group
      if (members.length === 0) {
        await databases.deleteDocument(
          appwriteConfig.databaseId,
          appwriteConfig.groupDataCollectionId,
          groupId
        );
      } else {
        // If the leaving member was the captain and there are other members, promote the first member to captain
        if (members.length > 0 && !members.some(member => member.role === 'captain')) {
          members[0].role = 'captain';
        }

        // Update group document
        await databases.updateDocument(
          appwriteConfig.databaseId,
          appwriteConfig.groupDataCollectionId,
          groupId,
          { members: JSON.stringify(members) }
        );
      }

      // Update user's groups field
      await appwriteDatabase.removeUserFromGroup(userId, groupId);

      return true;
    } catch (error) {
      console.error('Error leaving group:', error);
      throw error;
    }
  },

  // Get all groups (for discovery)
  getAllGroups: async (limit: number = 50) => {
    try {
      const response = await databases.listDocuments(
        appwriteConfig.databaseId,
        appwriteConfig.groupDataCollectionId,
        [Query.limit(limit)]
      );
      return response.documents as any[];
    } catch (error) {
      console.error('Error getting all groups:', error);
      throw error;
    }
  },

  // Helper function to add group ID to user's groups field
  addUserToGroup: async (userId: string, groupId: string) => {
    try {
      const userData = await appwriteDatabase.getUserData(userId);
      const currentGroups = userData.groups ? userData.groups.split(',').filter((id: string) => id.length > 0) : [];
      
      if (!currentGroups.includes(groupId)) {
        currentGroups.push(groupId);
        await appwriteDatabase.updateUserData(userId, {
          groups: currentGroups.join(',')
        });
      }
    } catch (error) {
      console.error('Error adding user to group:', error);
      throw error;
    }
  },

  // Helper function to remove group ID from user's groups field
  removeUserFromGroup: async (userId: string, groupId: string) => {
    try {
      const userData = await appwriteDatabase.getUserData(userId);
      const currentGroups = userData.groups ? userData.groups.split(',').filter((id: string) => id.length > 0) : [];
      
      const updatedGroups = currentGroups.filter((id: string) => id !== groupId);
      await appwriteDatabase.updateUserData(userId, {
        groups: updatedGroups.join(',')
      });
    } catch (error) {
      console.error('Error removing user from group:', error);
      throw error;
    }
  },

  // Photo functions
  // Upload photo to storage and create photo document
  uploadPhoto: async (photoUri: string, userId: string, groupIds: string[], prompt: string) => {
    try {
      // Create unique photo ID
      const photoId = ID.unique();
      
      console.log('Starting photo upload process...');
      console.log('Photo URI:', photoUri);
      console.log('User ID:', userId);
      console.log('Group IDs:', groupIds);
      console.log('Storage bucket ID:', appwriteConfig.photosStorageBucketId);
      
      // Get file info to determine size
      const response = await fetch(photoUri);
      const blob = await response.blob();
      
      // For React Native, create file object with all required properties
      // As per Appwrite docs: name, type, size, uri are all required
      const file = {
        uri: photoUri,
        type: 'image/jpeg',
        name: `photo_${photoId}.jpg`,
        size: blob.size, // Actual file size is required
      };
      
      console.log('File object created:', file);
      console.log('Uploading file with URI:', photoUri);
      
      // Upload to storage using React Native approach
      const uploadResult = await storage.createFile(
        appwriteConfig.photosStorageBucketId,
        photoId,
        file as any // React Native file format, bypass TypeScript
      );
      
      console.log('Upload successful:', uploadResult);

      // Create photo documents for each group
      const photoDocuments = [];
      for (const groupId of groupIds) {
        const photoData: Omit<PhotoData, '$id'> = {
          userid: userId,
          groupid: groupId,
        };

        const document = await databases.createDocument(
          appwriteConfig.databaseId,
          appwriteConfig.photoDataCollectionId,
          ID.unique(),
          photoData
        );
        
        photoDocuments.push(document);
      }

      return { photoId, photoDocuments };
    } catch (error: any) {
      console.error('Error uploading photo:', error);
      console.error('Error details:', JSON.stringify(error, null, 2));
      console.error('Error name:', error?.name);
      console.error('Error message:', error?.message);
      console.error('Error code:', error?.code);
      throw error;
    }
  },

  // Get photo URL from storage
  getPhotoUrl: (photoId: string) => {
    try {
      return storage.getFileView(appwriteConfig.photosStorageBucketId, photoId);
    } catch (error) {
      console.error('Error getting photo URL:', error);
      throw error;
    }
  },

  // Get photos for a group
  getGroupPhotos: async (groupId: string) => {
    try {
      const response = await databases.listDocuments(
        appwriteConfig.databaseId,
        appwriteConfig.photoDataCollectionId,
        [Query.equal('groupid', groupId), Query.orderDesc('timestamp')]
      );
      return response.documents as any[];
    } catch (error) {
      console.error('Error getting group photos:', error);
      throw error;
    }
  },

  // Get user's photos
  getUserPhotos: async (userId: string) => {
    try {
      const response = await databases.listDocuments(
        appwriteConfig.databaseId,
        appwriteConfig.photoDataCollectionId,
        [Query.equal('userid', userId), Query.orderDesc('timestamp')]
      );
      return response.documents as any[];
    } catch (error) {
      console.error('Error getting user photos:', error);
      throw error;
    }
  },

  // Helper to add/update user's todaydata photo entry in a group
  addPhotoToGroupTodayData: async (userId: string, groupId: string, photoId: string) => {
    try {
      const groupDoc = await appwriteDatabase.getGroupData(groupId);
      let todayDataObj: Record<string, string> = {};
      if (groupDoc.todaydata) {
        try {
          todayDataObj = JSON.parse(groupDoc.todaydata);
        } catch {}
      }
      todayDataObj[userId] = photoId;

      await databases.updateDocument(
        appwriteConfig.databaseId,
        appwriteConfig.groupDataCollectionId,
        groupId,
        { todaydata: JSON.stringify(todayDataObj) }
      );
      return true;
    } catch (error) {
      console.error('Error updating todaydata for group:', error);
      throw error;
    }
  },
}; 