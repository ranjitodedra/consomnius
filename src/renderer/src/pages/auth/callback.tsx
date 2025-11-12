import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Spin } from 'antd'
import authService from '@renderer/services/AuthService'

/**
 * OAuth callback page
 * Handles Google OAuth redirects and closes the popup window
 */
const OAuthCallback: React.FC = () => {
  const navigate = useNavigate()

  useEffect(() => {
    // Initialize auth service to handle the callback
    authService.initializeGoogleAuth()

    // Extract code from URL
    const url = new URL(window.location.href)
    const params = new URLSearchParams(url.search)
    const code = params.get('code')
    const error = params.get('error')

    // If we have a code and an opener (popup window), send it via postMessage
    if (code && window.opener) {
      try {
        window.opener.postMessage({ type: 'GOOGLE_OAUTH_CALLBACK', code }, window.location.origin)
        // Close after a brief delay to ensure message dispatch
        setTimeout(() => {
          window.close()
        }, 200)
      } catch (err) {
        console.error('Failed to send OAuth callback:', err)
      }
    } else if (error && window.opener) {
      try {
        window.opener.postMessage({ type: 'GOOGLE_OAUTH_CALLBACK', error }, window.location.origin)
        setTimeout(() => {
          window.close()
        }, 200)
      } catch (err) {
        console.error('Failed to send OAuth error:', err)
      }
    } else if (!window.opener) {
      // If no opener, we're in the main window - redirect to settings
      setTimeout(() => {
        navigate('/settings/mcp-marketplace')
      }, 1000)
    }
  }, [navigate])

  return (
    <div style={{ 
      display: 'flex', 
      justifyContent: 'center', 
      alignItems: 'center', 
      height: '100vh',
      flexDirection: 'column',
      gap: '16px'
    }}>
      <Spin size="large" />
      <div>Completing authentication...</div>
    </div>
  )
}

export default OAuthCallback

