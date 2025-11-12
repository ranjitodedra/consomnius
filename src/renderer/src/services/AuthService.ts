import { AuthUser } from '@renderer/types'

export interface AuthState {
  user: AuthUser | null
  isAuthenticated: boolean
  isLoading: boolean
  error: string | null
}

type AuthStateListener = (state: AuthState) => void

class AuthService {
  private state: AuthState = {
    user: null,
    isAuthenticated: false,
    isLoading: false,
    error: null
  }

  private listeners: Set<AuthStateListener> = new Set()
  private googleAuthInitialized = false

  constructor() {
    // Load user from localStorage on initialization
    this.loadUserFromStorage()
  }

  private loadUserFromStorage(): void {
    try {
      const storedUser = localStorage.getItem('consomnius-google-user')
      const storedTokens = localStorage.getItem('consomnius-google-tokens')
      
      if (storedUser && storedTokens) {
        const user = JSON.parse(storedUser)
        const tokens = JSON.parse(storedTokens)
        
        // Check if token is still valid (basic check)
        if (tokens.expires_at && tokens.expires_at > Date.now()) {
          this.state = {
            user: this.transformGoogleUser(user),
            isAuthenticated: true,
            isLoading: false,
            error: null
          }
          this.notifyListeners()
        } else {
          // Token expired, clear storage
          this.clearStorage()
        }
      }
    } catch (error) {
      console.error('Failed to load user from storage:', error)
      this.clearStorage()
    }
  }

  private transformGoogleUser(googleUser: any): AuthUser {
    return {
      id: googleUser.sub || googleUser.id || '',
      email: googleUser.email || '',
      name: googleUser.name || googleUser.email || '',
      picture: googleUser.picture,
      isVerified: googleUser.email_verified || false,
      createdAt: new Date(),
      updatedAt: new Date()
    }
  }

  private clearStorage(): void {
    localStorage.removeItem('consomnius-google-user')
    localStorage.removeItem('consomnius-google-tokens')
  }

  private notifyListeners(): void {
    this.listeners.forEach(listener => listener(this.state))
  }

  subscribe(listener: AuthStateListener): () => void {
    this.listeners.add(listener)
    return () => {
      this.listeners.delete(listener)
    }
  }

  getAuthState(): AuthState {
    return { ...this.state }
  }

  getCurrentUser(): AuthUser | null {
    return this.state.user
  }

  isAuthenticated(): boolean {
    return this.state.isAuthenticated
  }

  getAccessToken(): string | null {
    try {
      const storedTokens = localStorage.getItem('consomnius-google-tokens')
      if (storedTokens) {
        const tokens = JSON.parse(storedTokens)
        return tokens.access_token || null
      }
    } catch (error) {
      console.error('Failed to get access token:', error)
    }
    return null
  }

  initializeGoogleAuth(): void {
    if (this.googleAuthInitialized) {
      return
    }

    // Set up message listener for OAuth callback
    window.addEventListener('message', this.handleOAuthMessage.bind(this))
    this.googleAuthInitialized = true
  }

  private handleOAuthMessage(event: MessageEvent): void {
    // Only accept messages from same origin
    if (event.origin !== window.location.origin) {
      return
    }

    if (event.data.type === 'GOOGLE_OAUTH_CALLBACK') {
      if (event.data.code) {
        this.handleOAuthCode(event.data.code)
      } else if (event.data.error) {
        this.setState({ error: event.data.error, isLoading: false })
      }
    }
  }

  private async handleOAuthCode(code: string): Promise<void> {
    this.setState({ isLoading: true, error: null })

    try {
      // Exchange code for tokens
      // Note: In production, this should be done via backend to keep client secret secure
      const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID
      const clientSecret = import.meta.env.VITE_GOOGLE_CLIENT_SECRET
      const redirectUri = window.location.origin + '/auth/callback'

      if (!clientId) {
        throw new Error('Google OAuth client ID not configured')
      }

      // Exchange authorization code for tokens
      const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: new URLSearchParams({
          client_id: clientId,
          ...(clientSecret ? { client_secret: clientSecret } : {}),
          code,
          grant_type: 'authorization_code',
          redirect_uri: redirectUri
        })
      })

      if (!tokenResponse.ok) {
        const errorData = await tokenResponse.json().catch(() => ({}))
        throw new Error(errorData.error_description || 'Failed to exchange code for tokens')
      }

      const tokens = await tokenResponse.json()

      // Get user info
      const userResponse = await fetch('https://openidconnect.googleapis.com/v1/userinfo', {
        headers: {
          Authorization: `Bearer ${tokens.access_token}`
        }
      })

      if (!userResponse.ok) {
        throw new Error('Failed to fetch user information')
      }

      const user = await userResponse.json()

      // Store user and tokens
      const tokenData = {
        ...tokens,
        expires_at: Date.now() + (tokens.expires_in * 1000)
      }
      localStorage.setItem('consomnius-google-user', JSON.stringify(user))
      localStorage.setItem('consomnius-google-tokens', JSON.stringify(tokenData))
      
      this.setState({
        user: this.transformGoogleUser(user),
        isAuthenticated: true,
        isLoading: false,
        error: null
      })
    } catch (error: any) {
      console.error('OAuth code exchange failed:', error)
      this.setState({
        error: error.message || 'Authentication failed',
        isLoading: false
      })
      throw error
    }
  }

  async signInWithGoogle(): Promise<AuthUser | null> {
    this.setState({ isLoading: true, error: null })

    try {
      // Initialize if not already done
      if (!this.googleAuthInitialized) {
        this.initializeGoogleAuth()
      }

      // Start OAuth flow - for now, use a popup-based approach
      // This will be enhanced when backend OAuth handlers are added
      const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID
      if (!clientId) {
        throw new Error('Google OAuth client ID not configured. Please set VITE_GOOGLE_CLIENT_ID environment variable.')
      }

      // Use popup-based OAuth flow
      const redirectUri = window.location.origin + '/auth/callback'
      const scope = 'openid profile email'
      const responseType = 'code'
      const authUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth')
      authUrl.searchParams.set('client_id', clientId)
      authUrl.searchParams.set('redirect_uri', redirectUri)
      authUrl.searchParams.set('response_type', responseType)
      authUrl.searchParams.set('scope', scope)
      authUrl.searchParams.set('access_type', 'offline')
      authUrl.searchParams.set('prompt', 'consent')

      // Open OAuth popup
      const popup = window.open(
        authUrl.toString(),
        'google-oauth',
        'width=500,height=600,left=100,top=100'
      )

      if (!popup) {
        throw new Error('Popup blocked. Please allow popups for this site.')
      }

      // Wait for OAuth callback via postMessage
      return new Promise((resolve, reject) => {
        const messageHandler = (event: MessageEvent) => {
          if (event.origin !== window.location.origin) return

          if (event.data.type === 'GOOGLE_OAUTH_CALLBACK') {
            window.removeEventListener('message', messageHandler)
            popup.close()

            if (event.data.code) {
              // Exchange code for tokens (this would typically be done via backend)
              // For now, we'll use a simplified approach
              this.handleOAuthCode(event.data.code)
                .then(() => resolve(this.state.user))
                .catch(reject)
            } else if (event.data.error) {
              reject(new Error(event.data.error))
            }
          }
        }

        window.addEventListener('message', messageHandler)

        // Cleanup on popup close
        const checkClosed = setInterval(() => {
          if (popup.closed) {
            clearInterval(checkClosed)
            window.removeEventListener('message', messageHandler)
            if (!this.state.isAuthenticated) {
              reject(new Error('OAuth popup was closed'))
            }
          }
        }, 1000)
      })
    } catch (error: any) {
      console.error('Google sign-in failed:', error)
      this.setState({
        error: error.message || 'Sign-in failed',
        isLoading: false
      })
      return null
    }
  }

  async signOut(): Promise<void> {
    this.clearStorage()
    this.setState({
      user: null,
      isAuthenticated: false,
      isLoading: false,
      error: null
    })
  }

  isServerOwner(server: any): boolean {
    if (!this.state.user || !server) return false
    const userId = this.state.user.id
    return !!userId && server.ownerId === userId
  }

  canEditServer(server: any): boolean {
    if (!this.state.isAuthenticated || !server) return false
    if (!server.ownerId) return true // Public servers without owner can be edited by anyone (for now)
    return this.isServerOwner(server)
  }

  private setState(updates: Partial<AuthState>): void {
    this.state = { ...this.state, ...updates }
    this.notifyListeners()
  }
}

const authService = new AuthService()
export default authService
export { authService }

