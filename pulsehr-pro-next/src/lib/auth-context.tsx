'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { UserPersona } from '@/types';

export const USERS_DATABASE: Record<string, UserPersona> = {
  "john.doe@company.com": {
    email: "john.doe@company.com",
    id: "EMP-84920",
    name: "John Doe",
    title: "Sr. Software Engineer",
    role: "EMPLOYEE",
    canApprove: false,
    managerName: "Michael Vance (Engineering Manager)",
    avatar: "JD",
    avatarBg: "#3b82f6",
    department: "Product Engineering",
    joiningDate: "June 01, 2022",
    phone: "+1 (555) 019-2834",
    address: "742 Evergreen Terrace, Suite 4B, Springfield",
    bankAccount: "•••• •••• 9841",
    pfNumber: "100984920112",
    taxId: "ABCDE1234F"
  },
  "michael.vance@company.com": {
    email: "michael.vance@company.com",
    id: "MGR-10204",
    name: "Michael Vance",
    title: "Engineering Manager",
    role: "MANAGER",
    canApprove: true,
    managerName: "Sarah Jenkins (VP & HR Admin)",
    avatar: "MV",
    avatarBg: "#f59e0b",
    department: "Product Engineering",
    joiningDate: "January 15, 2020",
    phone: "+1 (555) 019-5541",
    address: "104 Baker Street, Suite 12, Springfield",
    bankAccount: "•••• •••• 5512",
    pfNumber: "100102048899",
    taxId: "XYZ987654M"
  },
  "sarah.jenkins@company.com": {
    email: "sarah.jenkins@company.com",
    id: "HR-00001",
    name: "Sarah Jenkins",
    title: "VP of HR & Operations",
    role: "HR_ADMIN",
    canApprove: true,
    managerName: "Executive Board",
    avatar: "SJ",
    avatarBg: "#8b5cf6",
    department: "Human Resources",
    joiningDate: "March 01, 2018",
    phone: "+1 (555) 019-9000",
    address: "500 Grand Avenue, Penthouse A, Springfield",
    bankAccount: "•••• •••• 1001",
    pfNumber: "100000010000",
    taxId: "HRADMIN999X"
  }
};

interface Toast {
  id: string;
  message: string;
  type: 'success' | 'warning' | 'danger' | 'info';
}

interface AuthContextType {
  currentUser: UserPersona | null;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  login: (email: string) => void;
  logout: () => void;
  toasts: Toast[];
  addToast: (message: string, type?: 'success' | 'warning' | 'danger' | 'info') => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [currentUser, setCurrentUser] = useState<UserPersona | null>(null);
  const [activeTab, setActiveTab] = useState<string>('tabAttendance');
  const [toasts, setToasts] = useState<Toast[]>([]);

  useEffect(() => {
    const saved = localStorage.getItem('pulsehr_next_user');
    if (saved && USERS_DATABASE[saved]) {
      setCurrentUser(USERS_DATABASE[saved]);
    } else {
      // Default to John Doe
      setCurrentUser(USERS_DATABASE["john.doe@company.com"]);
    }
  }, []);

  const login = (email: string) => {
    const user = USERS_DATABASE[email] || USERS_DATABASE["john.doe@company.com"];
    setCurrentUser(user);
    localStorage.setItem('pulsehr_next_user', user.email);
    addToast(`Signed in as ${user.name} (${user.title})`, 'success');
  };

  const logout = () => {
    localStorage.removeItem('pulsehr_next_user');
    setCurrentUser(null);
    addToast('Signed out of PulseHR Pro.', 'info');
  };

  const addToast = (message: string, type: 'success' | 'warning' | 'danger' | 'info' = 'info') => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  };

  return (
    <AuthContext.Provider value={{ currentUser, activeTab, setActiveTab, login, logout, toasts, addToast }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
}
