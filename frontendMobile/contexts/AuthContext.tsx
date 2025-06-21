import React, { createContext, useContext, useEffect, useState } from 'react';
import { appwriteAuth, appwriteDatabase } from '@/lib/appwrite';

interface User {
  $id: string;
  name: string;
  email: string;
  [key: string]: any;
}

interface AuthContextType {
  user: User | null;
  isLoggedIn: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, name: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const isLoggedIn = !!user;

  // Check if user is already authenticated on app start
  useEffect(() => {
    checkCurrentUser();
  }, []);

  const checkCurrentUser = async () => {
    try {
      setIsLoading(true);
      const currentUser = await appwriteAuth.getCurrentUser();
      if (currentUser) {
        setUser(currentUser);
      } else {
        setUser(null);
      }
    } catch (error: any) {
      // Handle the "guests missing scope" error gracefully
      if (error?.code === 401 || error?.message?.includes('missing scope')) {
        // User is not authenticated, this is expected behavior
        setUser(null);
      } else {
        console.error('Error checking current user:', error);
        setUser(null);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (email: string, password: string) => {
    try {
      setIsLoading(true);
      await appwriteAuth.signIn(email, password);
      const currentUser = await appwriteAuth.getCurrentUser();
      if (currentUser) {
        setUser(currentUser);
      }
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (email: string, password: string, name: string) => {
    try {
      setIsLoading(true);
      await appwriteAuth.createAccount(email, password, name);
      // After creating account, sign them in
      await appwriteAuth.signIn(email, password);
      const currentUser = await appwriteAuth.getCurrentUser();
      if (currentUser) {
        setUser(currentUser);
        
        // Create user data document in database
        try {
          const username = email.split('@')[0]; // Generate username from email
          await appwriteDatabase.createUserData(currentUser.$id, {
            name: name,
            email: email,
            username: username,
            groups: "", // Start with empty groups string
          });
        } catch (dbError) {
          console.error('Error creating user data document:', dbError);
          // Don't throw here as the account creation was successful
        }
      }
    } catch (error) {
      console.error('Registration error:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    try {
      setIsLoading(true);
      await appwriteAuth.signOut();
      setUser(null);
    } catch (error) {
      console.error('Logout error:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const value: AuthContextType = {
    user,
    isLoggedIn,
    isLoading,
    login,
    register,
    logout,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}; 