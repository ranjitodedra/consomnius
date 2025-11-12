import { GoogleOutlined } from '@ant-design/icons'
import { useAuth } from '@renderer/hooks/useAuth'
import { Button } from 'antd'
import React, { useEffect } from 'react'
import { useTranslation } from 'react-i18next'

interface GoogleSignInButtonProps {
  onSuccess?: (user: any) => void
  onError?: (error: Error) => void
  loading?: boolean
  disabled?: boolean
  size?: 'small' | 'middle' | 'large'
  type?: 'primary' | 'default' | 'dashed' | 'link' | 'text'
  className?: string
}

const GoogleSignInButton: React.FC<GoogleSignInButtonProps> = ({
  onSuccess,
  onError,
  loading: externalLoading,
  disabled,
  size = 'middle',
  type = 'primary',
  className
}) => {
  const { t } = useTranslation()
  const { signInWithGoogle, isLoading } = useAuth()
  const [isSigningIn, setIsSigningIn] = React.useState(false)

  // Add global error handler to prevent crashes
  useEffect(() => {
    const handleUnhandledError = (event: ErrorEvent) => {
      console.error('🔵 GoogleSignInButton: Unhandled error caught:', event.error)
      event.preventDefault()
      // Don't let the error crash the app
    }

    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      console.error('🔵 GoogleSignInButton: Unhandled promise rejection caught:', event.reason)
      event.preventDefault()
      // Don't let the rejection crash the app
    }

    window.addEventListener('error', handleUnhandledError)
    window.addEventListener('unhandledrejection', handleUnhandledRejection)

    return () => {
      window.removeEventListener('error', handleUnhandledError)
      window.removeEventListener('unhandledrejection', handleUnhandledRejection)
    }
  }, [])

  const handleGoogleSignIn = async () => {
    try {
      if (isSigningIn) {
        return
      }
      
      setIsSigningIn(true)
      
      const user = await signInWithGoogle()
      
      if (user) {
        onSuccess?.(user)
      } else {
        onError?.(new Error('Sign-in failed or was cancelled'))
      }
    } catch (error) {
      console.error('🔵 GoogleSignInButton: Sign-in failed:', error)
      onError?.(error instanceof Error ? error : new Error('Unknown error occurred'))
    } finally {
      setIsSigningIn(false)
    }
  }

  const buttonLoading = externalLoading || isLoading || isSigningIn
  const isButtonDisabled = disabled || buttonLoading

  return (
    <Button
      type={type}
      size={size}
      icon={<GoogleOutlined />}
      onClick={handleGoogleSignIn}
      loading={buttonLoading}
      disabled={isButtonDisabled}
      className={className}
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '8px',
        height: '40px',
        borderRadius: '8px',
        fontWeight: 500,
        opacity: isButtonDisabled ? 0.6 : 1,
        cursor: isButtonDisabled ? 'not-allowed' : 'pointer'
      }}>
      {t('auth.sign_in_with_google', 'Sign in with Google')}
    </Button>
  )
}

export default GoogleSignInButton

