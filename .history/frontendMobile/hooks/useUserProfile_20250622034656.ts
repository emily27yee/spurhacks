import { useState, useEffect } from 'react';
import { appwriteDatabase } from '@/lib/appwrite';
import { useAuth } from '@/contexts/AuthContext';

interface UserProfile {
  name: string;
  email: string;
  username: string;
  groups: string;
  joinDate: string;
  totalPhotos: number;
  weeksActive: number;
}

export const useUserProfile = () => {
  const { user, logout } = useAuth();
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      fetchUserProfile();
    } else {
      setUserProfile(null);
      setIsLoading(false);
    }
  }, [user]);

  const fetchUserProfile = async () => {
    if (!user) return;

    try {
      setIsLoading(true);
      setError(null);

      // Fetch user data from database
      const userData = await appwriteDatabase.getUserData(user.$id);
      
      // Format the join date from Appwrite user info
      const joinDate = new Date(user.$createdAt).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });

      // Combine user data with mock stats (can be replaced with real data later)
      const profile: UserProfile = {
        name: userData.name || user.name,
        email: userData.email || user.email,
        username: userData.username || user.email.split('@')[0],
        groups: userData.groups || "",
        joinDate: joinDate,
        totalPhotos: 127, // Mock data - can be calculated from actual photo records
        weeksActive: calculateWeeksActive(user.$createdAt),
      };

      setUserProfile(profile);
    } catch (error: any) {
      console.error('Error fetching user profile:', error);
      
      // If permission error, session is likely invalid, so log out
      if (error?.code === 401 || error?.code === 403) {
        setTimeout(logout, 0);
        return;
      }
      
      // If user data document doesn't exist, create it
      if (error?.code === 404) {
        try {
          const username = user.email.split('@')[0];
                     await appwriteDatabase.createUserData(user.$id, {
             name: user.name,
             email: user.email,
             username: username,
             groups: "",
           });
          
          // Retry fetching after creating
          await fetchUserProfile();
          return;
        } catch (createError) {
          console.error('Error creating user data:', createError);
          setError('Failed to create user profile');
        }
      } else {
        setError('Failed to load user profile');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const calculateWeeksActive = (createdAt: string): number => {
    const createdDate = new Date(createdAt);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - createdDate.getTime());
    const diffWeeks = Math.ceil(diffTime / (1000 * 60 * 60 * 24 * 7));
    return diffWeeks;
  };

  const updateProfile = async (updates: Partial<Pick<UserProfile, 'name' | 'username'>>) => {
    if (!user || !userProfile) return false;

    try {
      setIsLoading(true);
      
      // Update in database
      await appwriteDatabase.updateUserData(user.$id, updates);
      
      // Update local state
      setUserProfile(prev => prev ? { ...prev, ...updates } : null);
      
      return true;
    } catch (error: any) {
      console.error('Error updating profile:', error);
      // Also handle permission errors here
      if (error?.code === 401 || error?.code === 403) {
        setTimeout(logout, 0);
      } else {
        setError('Failed to update profile');
      }
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  return {
    userProfile,
    isLoading,
    error,
    updateProfile,
    refreshProfile: fetchUserProfile,
  };
};