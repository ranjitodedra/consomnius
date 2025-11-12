import { authService, AuthState } from '@renderer/services/AuthService'
import { AuthUser } from '@renderer/types'
import { useEffect, useState, useRef, useCallback } from 'react'

export const useAuth = () => {
  const [authState, setAuthState] = useState<AuthState>(authService.getAuthState())
  const initializedRef = useRef(false)

  useEffect(() => {
    // Subscribe to auth state changes
    const unsubscribe = authService.subscribe((newState) => {
      setAuthState(newState)
    })

    // Initialize Google Auth only once when component mounts
    if (!initializedRef.current) {
      authService.initializeGoogleAuth()
      initializedRef.current = true
    }

    return unsubscribe
  }, [])

  const signInWithGoogle = useCallback(async () => {
    try {
      const user = await authService.signInWithGoogle()
      return user
    } catch (error) {
      console.error('🔵 useAuth: Google sign-in failed:', error)
      // Don't re-throw the error to prevent crashes
      return null
    }
  }, [])

  const signOut = async (): Promise<void> => {
    return authService.signOut()
  }

  const getCurrentUser = (): AuthUser | null => {
    return authService.getCurrentUser()
  }

  const isServerOwner = (server: any): boolean => {
    return authService.isServerOwner(server)
  }

  const canEditServer = (server: any): boolean => {
    return authService.canEditServer(server)
  }

  const canPublishToMarketplace = (): boolean => {
    return authService.isAuthenticated()
  }

  return {
    ...authState,
    signInWithGoogle,
    signOut,
    getCurrentUser,
    isServerOwner,
    canEditServer,
    canPublishToMarketplace
  }
}

