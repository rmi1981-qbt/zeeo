import { createContext, useContext, useEffect, useState } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';

type Profile = {
  id: string;
  email: string;
  full_name: string | null;
  avatar_url: string | null;
  is_platform_admin: boolean;
};

type Membership = {
  id: string;
  condominium_id: string;
  role: 'admin' | 'resident' | 'concierge';
  status: 'pending' | 'approved' | 'rejected';
  unit_label?: string;
  condominiums?: {
    history_visibility_hours?: number;
    [key: string]: any;
  };
};

type AuthContextType = {
  session: Session | null;
  user: User | null;
  profile: Profile | null;
  memberships: Membership[];
  selectedCondo: string | null;
  selectCondo: (condoId: string) => void;
  loading: boolean;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [memberships, setMemberships] = useState<Membership[]>([]);
  const [selectedCondo, setSelectedCondo] = useState<string | null>(() => localStorage.getItem('saas_selected_condo'));
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check active session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchProfileAndMemberships(session.user.id);
      } else {
        setLoading(false);
      }
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchProfileAndMemberships(session.user.id);
      } else {
        setProfile(null);
        setMemberships([]);
        setLoading(false);
        setSelectedCondo(null);
        localStorage.removeItem('saas_selected_condo');
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  async function fetchProfileAndMemberships(userId: string) {
    try {
      const [profileResponse, membersResponse] = await Promise.all([
        supabase.from('profiles').select('*').eq('id', userId).single(),
        supabase.from('condominium_members').select('*, condominiums(*)').eq('user_id', userId)
      ]);

      if (profileResponse.error) console.error('Error fetching profile:', profileResponse.error);
      if (membersResponse.error) console.error('Error fetching memberships:', membersResponse.error);

      setProfile(profileResponse.data);
      const members = membersResponse.data || [];
      setMemberships(members);

      // Auto-select first condo if none selected
      const currentCondo = localStorage.getItem('saas_selected_condo');
      if (!currentCondo && members.length > 0) {
        const firstCondoId = members[0].condominium_id;
        setSelectedCondo(firstCondoId);
        localStorage.setItem('saas_selected_condo', firstCondoId);
      }
    } catch (error) {
      console.error('Error in fetchProfileAndMemberships:', error);
    } finally {
      setLoading(false);
    }
  }

  const selectCondo = (condoId: string) => {
    setSelectedCondo(condoId);
    localStorage.setItem('saas_selected_condo', condoId);
  };

  async function signOut() {
    await supabase.auth.signOut();
    localStorage.removeItem('saas_selected_condo');
    setSelectedCondo(null);
    setSession(null);
    setUser(null);
    setProfile(null);
    setMemberships([]);
  }

  return (
    <AuthContext.Provider value={{ session, user, profile, memberships, selectedCondo, selectCondo, loading, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
