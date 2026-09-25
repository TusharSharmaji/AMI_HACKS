import React, { createContext, useContext, useState, useEffect } from 'react';

export interface UserProfile {
  id: string;
  name: string;
  role: string;
  email: string;
  avatarInitials: string;
  department?: string;
  joinedDate?: string;
}

const DEFAULT_PROFILE: UserProfile = {
  id: 'usr_tushar_01',
  name: 'Tushar',
  role: 'CityPulse Resident',
  email: 'ts0128501285@gmail.com',
  avatarInitials: 'T',
  department: 'Civic Community',
  joinedDate: '2026-01-15',
};

const USER_STORAGE_KEY = 'citypulse_user_profile_v1';

interface UserContextType {
  user: UserProfile;
  updateUser: (updates: Partial<UserProfile>) => void;
  signOut: () => void;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

export const UserProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserProfile>(() => {
    try {
      const stored = localStorage.getItem(USER_STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        // Ensure name is Tushar and initials T as per prompt
        return {
          ...DEFAULT_PROFILE,
          ...parsed,
          name: parsed.name || 'Tushar',
          avatarInitials: parsed.avatarInitials || 'T',
          role: parsed.role || 'CityPulse Resident',
        };
      }
    } catch (e) {
      console.warn('Failed to load user profile from localStorage:', e);
    }
    return DEFAULT_PROFILE;
  });

  useEffect(() => {
    try {
      localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(user));
    } catch (e) {
      console.warn('Failed to save user profile:', e);
    }
  }, [user]);

  const updateUser = (updates: Partial<UserProfile>) => {
    setUser((prev) => {
      const next = { ...prev, ...updates };
      if (updates.name && !updates.avatarInitials) {
        next.avatarInitials = updates.name.trim().charAt(0).toUpperCase() || 'T';
      }
      return next;
    });
  };

  const signOut = () => {
    // Reset to default resident profile
    setUser(DEFAULT_PROFILE);
    localStorage.removeItem(USER_STORAGE_KEY);
  };

  return (
    <UserContext.Provider value={{ user, updateUser, signOut }}>
      {children}
    </UserContext.Provider>
  );
};

export const useUser = (): UserContextType => {
  const context = useContext(UserContext);
  if (!context) {
    throw new Error('useUser must be used within a UserProvider');
  }
  return context;
};
