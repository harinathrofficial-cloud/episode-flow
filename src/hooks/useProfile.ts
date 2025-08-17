import { useState, useEffect } from 'react'
import { supabase } from '@/integrations/supabase/client'
import { useAuth } from './useAuth'

interface Profile {
  first_name: string | null
  last_name: string | null
  bio: string | null
}

export function useProfile() {
  const { user } = useAuth()
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (user) {
      loadProfile()
    } else {
      setProfile(null)
      setLoading(false)
    }
  }, [user])

  const loadProfile = async () => {
    if (!user) return

    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('first_name, last_name, bio')
        .eq('user_id', user.id)
        .single()

      if (error && error.code !== 'PGRST116') {
        throw error
      }

      setProfile(data)
    } catch (error) {
      console.error('Error loading profile:', error)
    } finally {
      setLoading(false)
    }
  }

  const getInitials = () => {
    if (!profile?.first_name && !profile?.last_name) {
      return user?.email?.charAt(0).toUpperCase() || 'U'
    }
    
    const first = profile?.first_name?.charAt(0) || ''
    const last = profile?.last_name?.charAt(0) || ''
    return (first + last).toUpperCase()
  }

  return { profile, loading, getInitials, refetch: loadProfile }
}