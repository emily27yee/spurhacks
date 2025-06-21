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
  gameActivityCollectionId: 'gameactivities',
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
  todayvotes?: string;
  todaycomments?: string;
  resultdata?: string;
  gameid?: number;
}

// Photo data interface
export interface PhotoData {
  $id?: string; // Document ID
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
        todayvotes: "",
        todaycomments: "",
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

  submitGroupVote: async (groupId: string, userId: string, photoId: string) => {
    try {
      const groupDoc = await appwriteDatabase.getGroupData(groupId);
      let todayVotes: Record<string, string> = {};
      if (groupDoc.todayvotes) {
        try {
          todayVotes = JSON.parse(groupDoc.todayvotes);
        } catch (e) {
            console.error("Could not parse todayvotes", e)
        }
      }
      todayVotes[userId] = photoId;

      await databases.updateDocument(
        appwriteConfig.databaseId,
        appwriteConfig.groupDataCollectionId,
        groupId,
        { todayvotes: JSON.stringify(todayVotes) }
      );
      return true;
    } catch (error) {
      console.error('Error submitting group vote:', error);
      throw error;
    }
  },

  submitGroupComment: async (groupId: string, userId: string, assignedPhotoId: string, comment: string) => {
    try {
      const groupDoc = await appwriteDatabase.getGroupData(groupId);
      let todayComments: Record<string, { assignedPhotoId: string, comment: string }> = {};
      if (groupDoc.todaycomments) {
        try {
          todayComments = JSON.parse(groupDoc.todaycomments);
        } catch (e) {
          console.error("Could not parse todaycomments", e);
        }
      }
      
      todayComments[userId] = {
        assignedPhotoId,
        comment: comment.trim()
      };

      await databases.updateDocument(
        appwriteConfig.databaseId,
        appwriteConfig.groupDataCollectionId,
        groupId,
        { todaycomments: JSON.stringify(todayComments) }
      );
      return true;
    } catch (error) {
      console.error('Error submitting group comment:', error);
      throw error;
    }
  },

  savePhotoAssignments: async (groupId: string, assignments: Record<string, string>) => {
    try {
      const groupDoc = await appwriteDatabase.getGroupData(groupId);
      let todayComments: Record<string, { assignedPhotoId: string, comment: string }> = {};
      if (groupDoc.todaycomments) {
        try {
          todayComments = JSON.parse(groupDoc.todaycomments);
        } catch (e) {
          console.error("Could not parse todaycomments", e);
        }
      }
      
      // Add assignments for users who don't have comments yet
      Object.entries(assignments).forEach(([userId, photoId]) => {
        if (!todayComments[userId]) {
          // Only assign the photo ID; comment will be added when user submits
          todayComments[userId] = {
            assignedPhotoId: photoId
          } as any;
        }
      });

      await databases.updateDocument(
        appwriteConfig.databaseId,
        appwriteConfig.groupDataCollectionId,
        groupId,
        { todaycomments: JSON.stringify(todayComments) }
      );
      
      console.log('Saved photo assignments to database');
      return true;
    } catch (error) {
      console.error('Error saving photo assignments:', error);
      throw error;
    }
  },

  // Photo functions
  // Upload photo to storage and create photo document
  uploadPhoto: async (photoUri: string, userId: string, groupIds: string[], prompt: string) => {
    try {
      console.log('Starting photo upload process...');
      console.log('Photo URI:', photoUri);
      console.log('User ID:', userId);
      console.log('Group IDs:', groupIds);
      console.log('Storage bucket ID:', appwriteConfig.photosStorageBucketId);
      
      // Create photo documents for each group
      const photoDocuments = [];
      for (const groupId of groupIds) {
        // Create document ID that will also be used as storage file ID
        const documentId = ID.unique();
        
        const photoData: Omit<PhotoData, '$id'> = {
          userid: userId,
          groupid: groupId,
        };

        const document = await databases.createDocument(
          appwriteConfig.databaseId,
          appwriteConfig.photoDataCollectionId,
          documentId,
          photoData
        );
        
        photoDocuments.push(document);
        
        // Now upload the photo to storage using the same ID
        if (photoDocuments.length === 1) { // Only upload once
          // Get file info to determine size
          const response = await fetch(photoUri);
          const blob = await response.blob();
          
          // For React Native, create file object with all required properties
          const file = {
            uri: photoUri,
            type: 'image/jpeg',
            name: `photo_${documentId}.jpg`,
            size: blob.size,
          };
          
          console.log('File object created:', file);
          console.log('Uploading file with URI:', photoUri);
          
          // Upload to storage using document ID as file ID
          const uploadResult = await storage.createFile(
            appwriteConfig.photosStorageBucketId,
            documentId,
            file as any
          );
          
          console.log('Upload successful:', uploadResult);
        }
      }

      return { photoId: photoDocuments[0].$id, photoDocuments };
    } catch (error: any) {
      console.error('Error uploading photo:', error);
      console.error('Error details:', JSON.stringify(error, null, 2));
      console.error('Error name:', error?.name);
      console.error('Error message:', error?.message);
      console.error('Error code:', error?.code);
      throw error;
    }
  },

  // Get photo URL from storage (preview for image display)
  getPhotoUrl: async (photoId: string, width: number = 400, height: number = 400) => {
    try {
      // Construct URL manually for consistent cross-platform behavior
      // Using view endpoint without authentication - bucket must be configured for public read
      const url = `${appwriteConfig.endpoint}/storage/buckets/${appwriteConfig.photosStorageBucketId}/files/${photoId}/view?project=${appwriteConfig.projectId}`;
      
      console.log('Constructed photo URL:', url);
      return url;
    } catch (error) {
      console.error('Error constructing photo URL:', error);
      return '';
    }
  },

  // Download photo and convert to base64 for private bucket access
  getPhotoBase64: async (photoId: string) => {
    try {
      // Download the file using SDK (includes authentication)
      const response = await storage.getFileDownload(
        appwriteConfig.photosStorageBucketId,
        photoId
      );
      
      // Convert ArrayBuffer to base64
      const blob = new Blob([response]);
      const reader = new FileReader();
      
      return new Promise<string>((resolve, reject) => {
        reader.onloadend = () => {
          const base64data = reader.result as string;
          resolve(base64data);
        };
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });
    } catch (error) {
      console.error('Error downloading photo:', error);
      return '';
    }
  },

  // Get photos for a group
  getGroupPhotos: async (groupId: string) => {
    try {
      const response = await databases.listDocuments(
        appwriteConfig.databaseId,
        appwriteConfig.photoDataCollectionId,
        [Query.equal('groupid', groupId), Query.orderDesc('$createdAt')]
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
        [Query.equal('userid', userId), Query.orderDesc('$createdAt')]
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

  // Game Activity Functions
    // Get or create game activity for a group and game prompt
  getGameActivity: async (groupId: string, gamePromptId: string) => {
    try {
      // Try to find existing game activity
      const response = await databases.listDocuments(
        appwriteConfig.databaseId,
        appwriteConfig.gameActivityCollectionId,
        [
          Query.equal('groupId', groupId),
          Query.equal('gamePromptId', gamePromptId)
        ]
      );

      if (response.documents.length > 0) {
        const activity = response.documents[0] as any;
        
        // Parse JSON fields
        const parsedActivity = {
          ...activity,
          photos: JSON.parse(activity.photos || '[]'),
          userActivities: JSON.parse(activity.userActivities || '{}'),
        };

        // Check if this is a comment game and needs photo assignment
        await appwriteDatabase.ensurePhotoAssignment(parsedActivity);
        
        return parsedActivity;
      }

      // Create new game activity if it doesn't exist
      const newActivity = {
        groupId,
        gamePromptId,
        photos: JSON.stringify([]),
        userActivities: JSON.stringify({}),
        status: 'waiting_for_photos',
        resultsAvailable: false,
      };

      const created = await databases.createDocument(
        appwriteConfig.databaseId,
        appwriteConfig.gameActivityCollectionId,
        ID.unique(),
        newActivity
      );

      // Parse JSON fields for return
      return {
        ...created,
        photos: [],
        userActivities: {},
      };
    } catch (error) {
      console.error('Error getting/creating game activity:', error);
      throw error;
    }
  },
  // Ensure photo assignment for comment games
  ensurePhotoAssignment: async (activity: any) => {
    try {
      const GAME_PROMPTS = [
        { id: 'lunch_raccoon', type: 'voting' },
        { id: 'dumb_purchase', type: 'voting' },
        { id: 'funny_pose', type: 'comment' },
        { id: 'cartoon_weapon', type: 'comment' },
      ];
      
      const gamePrompt = GAME_PROMPTS.find(p => p.id === activity.gamePromptId);
      
      // Only process comment games
      if (gamePrompt?.type !== 'comment') return;

      // Get group members
      const group = await databases.getDocument(
        appwriteConfig.databaseId,
        appwriteConfig.groupDataCollectionId,
        activity.groupId
      );

      // Parse group members correctly - it should be an array of GroupMember objects
      let groupMemberObjects;
      try {
        groupMemberObjects = JSON.parse(group.members || '[]');
      } catch (parseError) {
        console.error('Failed to parse group members:', parseError);
        return;
      }
      
      // Extract just the user IDs from the member objects
      const groupMembers = groupMemberObjects.map((member: any) => member.userId);
      const photos = activity.photos || [];
      let userActivities = activity.userActivities || {};

      console.log('Photo assignment debug:', {
        gamePromptId: activity.gamePromptId,
        gameType: gamePrompt?.type,
        groupMembers,
        photosCount: photos.length,
        userActivities
      });

      // Check if all photos are collected
      const allPhotosCollected = groupMembers.every((memberId: string) => 
        photos.some((photo: any) => photo.userId === memberId)
      );

      // Check if photos have been assigned
      const photosAssigned = groupMembers.every((memberId: string) => 
        userActivities[memberId]?.assignedPhotoId
      );

      console.log('Photo collection status:', {
        allPhotosCollected,
        photosAssigned,
        photosLength: photos.length
      });

      // If all photos are collected but not assigned, assign them
      if (allPhotosCollected && !photosAssigned && photos.length > 0) {
        console.log('Assigning photos for comment game:', activity.gamePromptId);
        
        // Assign photos randomly for comment games
        const shuffledPhotos = [...photos].sort(() => Math.random() - 0.5);
        
        groupMembers.forEach((memberId: string, index: number) => {
          // Assign each user a different photo (not their own if possible)
          let assignedPhoto = shuffledPhotos[index % shuffledPhotos.length];
          
          // Try to avoid assigning users their own photos
          if (assignedPhoto.userId === memberId && shuffledPhotos.length > 1) {
            const otherPhotos = shuffledPhotos.filter(p => p.userId !== memberId);
            if (otherPhotos.length > 0) {
              assignedPhoto = otherPhotos[index % otherPhotos.length];
            }
          }
          
          userActivities[memberId] = {
            ...userActivities[memberId],
            completed: userActivities[memberId]?.completed || false,
            assignedPhotoId: assignedPhoto.id,
          };
        });

        // Update the database
        await databases.updateDocument(
          appwriteConfig.databaseId,
          appwriteConfig.gameActivityCollectionId,
          activity.$id,
          {
            userActivities: JSON.stringify(userActivities),
            status: 'waiting_for_activities'
          }
        );

        // Update the activity object
        activity.userActivities = userActivities;
        activity.status = 'waiting_for_activities';
      }
    } catch (error) {
      console.error('Error ensuring photo assignment:', error);
      // Don't throw - this is a helper function
    }
  },

  // Submit a vote for a voting game
  submitGameVote: async (activityId: string, userId: string, photoId: string) => {
    try {
      const activity = await databases.getDocument(
        appwriteConfig.databaseId,
        appwriteConfig.gameActivityCollectionId,
        activityId
      );

      const userActivities = JSON.parse(activity.userActivities || '{}');
      userActivities[userId] = {
        ...userActivities[userId],
        completed: true,
        vote: photoId,
      };

      await databases.updateDocument(
        appwriteConfig.databaseId,
        appwriteConfig.gameActivityCollectionId,
        activityId,
        {
          userActivities: JSON.stringify(userActivities)
        }
      );

      // Check if all users have completed and update results availability
      await appwriteDatabase.checkAndUpdateGameResults(activityId);

      return true;
    } catch (error) {
      console.error('Error submitting game vote:', error);
      throw error;
    }
  },

  // Submit a comment for a comment game
  submitGameComment: async (activityId: string, userId: string, photoId: string, comment: string) => {
    try {
      const activity = await databases.getDocument(
        appwriteConfig.databaseId,
        appwriteConfig.gameActivityCollectionId,
        activityId
      );

      const userActivities = JSON.parse(activity.userActivities || '{}');
      userActivities[userId] = {
        ...userActivities[userId],
        completed: true,
        comment,
        assignedPhotoId: photoId,
      };

      await databases.updateDocument(
        appwriteConfig.databaseId,
        appwriteConfig.gameActivityCollectionId,
        activityId,
        {
          userActivities: JSON.stringify(userActivities)
        }
      );

      // Check if all users have completed and update results availability
      await appwriteDatabase.checkAndUpdateGameResults(activityId);

      return true;
    } catch (error) {
      console.error('Error submitting game comment:', error);
      throw error;
    }
  },

  // Check if all users have completed activities and update results availability
  checkAndUpdateGameResults: async (activityId: string) => {
    try {
      const activity = await databases.getDocument(
        appwriteConfig.databaseId,
        appwriteConfig.gameActivityCollectionId,
        activityId
      );      const group = await databases.getDocument(
        appwriteConfig.databaseId,
        appwriteConfig.groupDataCollectionId,
        activity.groupId
      );

      // Parse group members correctly
      let groupMemberObjects;
      try {
        groupMemberObjects = JSON.parse(group.members || '[]');
      } catch (parseError) {
        console.error('Failed to parse group members in checkAndUpdateGameResults:', parseError);
        throw parseError;
      }
      
      // Extract just the user IDs from the member objects
      const groupMembers = groupMemberObjects.map((member: any) => member.userId);
      const userActivities = JSON.parse(activity.userActivities || '{}');

      // Check if all members have completed their activities
      const allCompleted = groupMembers.every((memberId: string) => 
        userActivities[memberId]?.completed === true
      );

      if (allCompleted && !activity.resultsAvailable) {
        await databases.updateDocument(
          appwriteConfig.databaseId,
          appwriteConfig.gameActivityCollectionId,
          activityId,
          {
            status: 'completed',
            resultsAvailable: true
          }
        );

        // TODO: Send notification to all group members
        console.log('Game results are now available for activity:', activityId);
      }

      return allCompleted;
    } catch (error) {
      console.error('Error checking game results:', error);
      throw error;
    }
  },
  // Add photo to game activity
  addPhotoToGameActivity: async (groupId: string, gamePromptId: string, userId: string, photoId: string, photoUri: string) => {
    try {
      const activity = await appwriteDatabase.getGameActivity(groupId, gamePromptId);
      
      const photos = JSON.parse(activity.photos || '[]');
      const newPhoto = {
        id: photoId,
        userId,
        uri: photoUri,
        timestamp: new Date().toISOString(),
      };

      photos.push(newPhoto);      // Get group members to check if all photos are collected
      const group = await databases.getDocument(
        appwriteConfig.databaseId,
        appwriteConfig.groupDataCollectionId,
        groupId
      );

      // Parse group members correctly - it should be an array of GroupMember objects
      let groupMemberObjects;
      try {
        groupMemberObjects = JSON.parse(group.members || '[]');
      } catch (parseError) {
        console.error('Failed to parse group members in addPhotoToGameActivity:', parseError);
        throw parseError;
      }
      
      // Extract just the user IDs from the member objects
      const groupMembers = groupMemberObjects.map((member: any) => member.userId);
      let userActivities = JSON.parse(activity.userActivities || '{}');
      
      // Check if all photos are now collected
      const allPhotosCollected = groupMembers.every((memberId: string) => 
        photos.some((photo: any) => photo.userId === memberId)
      );

      // If all photos are collected and this is a comment game, assign photos randomly
      if (allPhotosCollected) {
        // Get game prompt to check type
        const GAME_PROMPTS = [
          { id: 'lunch_raccoon', type: 'voting' },
          { id: 'dumb_purchase', type: 'voting' },
          { id: 'funny_pose', type: 'comment' },
          { id: 'cartoon_weapon', type: 'comment' },
        ];
        
        const gamePrompt = GAME_PROMPTS.find(p => p.id === gamePromptId);
        
        if (gamePrompt?.type === 'comment') {
          // Assign photos randomly for comment games
          const shuffledPhotos = [...photos].sort(() => Math.random() - 0.5);
          
          groupMembers.forEach((memberId: string, index: number) => {
            // Assign each user a different photo (not their own if possible)
            let assignedPhoto = shuffledPhotos[index % shuffledPhotos.length];
            
            // Try to avoid assigning users their own photos
            if (assignedPhoto.userId === memberId && shuffledPhotos.length > 1) {
              const otherPhotos = shuffledPhotos.filter(p => p.userId !== memberId);
              if (otherPhotos.length > 0) {
                assignedPhoto = otherPhotos[index % otherPhotos.length];
              }
            }
            
            userActivities[memberId] = {
              ...userActivities[memberId],
              completed: false,
              assignedPhotoId: assignedPhoto.id,
            };
          });
        }
      }
      
      await databases.updateDocument(
        appwriteConfig.databaseId,
        appwriteConfig.gameActivityCollectionId,
        activity.$id,
        {
          photos: JSON.stringify(photos),
          userActivities: JSON.stringify(userActivities),
          status: allPhotosCollected ? 'waiting_for_activities' : 'waiting_for_photos'
        }
      );

      return true;
    } catch (error) {
      console.error('Error adding photo to game activity:', error);
      throw error;
    }
  },
};