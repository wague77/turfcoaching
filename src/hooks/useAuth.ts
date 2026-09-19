
import { useState, useEffect, useCallback } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

export const useAuth = () => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        setIsLoading(false);
      }
    );

    // THEN check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setIsLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  // Check if email is approved by admin
  const checkEmailApproval = useCallback(async (email: string): Promise<{ approved: boolean; pending: boolean }> => {
    const { data, error } = await supabase
      .from('email_subscribers')
      .select('is_approved, is_active')
      .eq('email', email.toLowerCase())
      .maybeSingle();

    if (error) {
      console.error('Error checking email approval:', error);
      return { approved: false, pending: false };
    }

    if (!data) {
      // Email not found in subscribers
      return { approved: false, pending: false };
    }

    return { 
      approved: data.is_approved === true,
      pending: data.is_active && data.is_approved !== true
    };
  }, []);

  // Register email for approval
  const registerEmailForApproval = useCallback(async (email: string): Promise<{ error: Error | null }> => {
    try {
      // Check if email already exists
      const { data: existing } = await supabase
        .from('email_subscribers')
        .select('id')
        .eq('email', email.toLowerCase())
        .maybeSingle();

      if (existing) {
        // Email already registered, no error
        return { error: null };
      }

      // Add email to subscribers for approval
      const { error } = await supabase
        .from('email_subscribers')
        .insert({
          email: email.toLowerCase(),
          is_active: true,
          is_approved: null
        });

      if (error) throw error;
      return { error: null };
    } catch (err) {
      console.error('Error registering email:', err);
      return { error: err as Error };
    }
  }, []);

  const signUp = useCallback(async (email: string, password: string) => {
    const redirectUrl = `${window.location.origin}/`;
    
    // Check if email is already pre-approved by admin
    const { data: existingSubscriber } = await supabase
      .from('email_subscribers')
      .select('is_approved')
      .eq('email', email.toLowerCase())
      .maybeSingle();
    
    const isPreApproved = existingSubscriber?.is_approved === true;
    
    // Create the auth account
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: redirectUrl
      }
    });

    if (!error && data.user) {
      if (isPreApproved) {
        // Email was pre-approved by admin, user can stay logged in
        // No need to register again since it's already in the table
        return { data, error, preApproved: true };
      } else {
        // Register email for admin approval
        await registerEmailForApproval(email);
        
        // Sign out - user must wait for admin approval
        await supabase.auth.signOut();
      }
    }

    return { data, error, preApproved: false };
  }, [registerEmailForApproval]);

  const signIn = useCallback(async (email: string, password: string) => {
    // First check if email exists in subscribers table
    const { data: subscriber } = await supabase
      .from('email_subscribers')
      .select('is_approved, is_active')
      .eq('email', email.toLowerCase())
      .maybeSingle();

    // ALL users must be in email_subscribers and approved
    if (!subscriber) {
      // Email not found - user must register first
      return { 
        data: null, 
        error: { 
          message: 'EMAIL_NOT_REGISTERED',
          name: 'AuthApiError'
        } as any
      };
    }

    // Email is pending approval (is_active but not approved yet)
    if (subscriber.is_active && subscriber.is_approved !== true) {
      return { 
        data: null, 
        error: { 
          message: 'EMAIL_PENDING_APPROVAL',
          name: 'AuthApiError'
        } as any
      };
    }

    // Email was explicitly rejected (is_approved = false)
    if (subscriber.is_approved === false) {
      return { 
        data: null, 
        error: { 
          message: 'EMAIL_NOT_APPROVED',
          name: 'AuthApiError'
        } as any
      };
    }

    // Email is approved, proceed with sign in
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    return { data, error };
  }, []);

  const signOut = useCallback(async () => {
    const { error } = await supabase.auth.signOut();
    return { error };
  }, []);

  return {
    user,
    session,
    isLoading,
    signUp,
    signIn,
    signOut,
    isAuthenticated: !!session,
    checkEmailApproval,
  };
};

