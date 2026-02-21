
import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { api } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';

// Simple User Type
export interface User {
  id: string;
  email: string;
  full_name?: string;
  [key: string]: any;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ data: any; error: any }>;
  signOut: () => Promise<void>;
  signUp: (email: string, password: string) => Promise<{ data: any; error: any }>; // Mocked
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider = ({ children }: AuthProviderProps) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    // Check local storage for persisted "session"
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      setUser(JSON.parse(storedUser));
    }
    setLoading(false);
  }, []);

  const signIn = async (email: string, password: string) => {
    try {
      // Logic from app.py: POST /api/auth/login with {email}
      // Password is mocked in backend currently
      const data = await api.auth.login(email);

      setUser(data.user);
      localStorage.setItem('user', JSON.stringify(data.user));
      localStorage.setItem('token', data.token);

      toast({
        title: "Login Successful",
        description: "Welcome to Ontology Data System!",
      });

      return { data, error: null };
    } catch (error: any) {
      toast({
        title: "Login Failed",
        description: error.message || "Could not log in.",
        variant: "destructive",
      });
      return { data: null, error };
    }
  };

  const signOut = async () => {
    setUser(null);
    localStorage.removeItem('user');
    localStorage.removeItem('token');
    toast({
      title: "Logged Out",
      description: "You have been logged out.",
    });
  };

  const signUp = async (email: string, password: string) => {
    // Mock signup or tell user to contact admin
    toast({
      title: "Sign Up Unavailable",
      description: "Please contact admin to create an account used in this local version.",
      variant: "destructive"
    });
    return { data: null, error: "Not implemented" };
  }

  const value = {
    user,
    loading,
    signIn,
    signOut,
    signUp
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};