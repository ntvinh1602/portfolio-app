"use client"

import { useEffect } from 'react'
import { supabase } from '../lib/supabase/supabaseClient'
import type { AuthChangeEvent, Session } from '@supabase/supabase-js'

export default function SupabaseAuthProvider({
  children,
}: {
  children: React.ReactNode
}) {
  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(
      (event: AuthChangeEvent, session: Session | null) => {
      if (event === 'SIGNED_IN' || event === 'SIGNED_OUT') {
        fetch('/api/revalidate-cache', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            action: event,
            userId: session?.user?.id,
          }),
        })
      }
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [])

  return <>{children}</>
}