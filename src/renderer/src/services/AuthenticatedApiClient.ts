import { authService } from './AuthService'
import type { MarketplaceServer } from '@shared/types/marketplace'

export interface ApiResponse<T = any> {
  success: boolean
  data?: T
  error?: string
}

// Use the same port as the main API server (default 23333)
// Users can override with VITE_MARKETPLACE_API_URL env var
const API_BASE_URL = import.meta.env.VITE_MARKETPLACE_API_URL || 'http://localhost:23333/api/marketplace'

class AuthenticatedApiClient {
  private baseUrl: string

  constructor(baseUrl: string = API_BASE_URL) {
    this.baseUrl = baseUrl
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    try {
      const accessToken = authService.getAccessToken()
      const user = authService.getCurrentUser()

      const headers: HeadersInit = {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
        ...options.headers
      }

      // Add authentication headers if available
      if (accessToken) {
        headers['Authorization'] = `Bearer ${accessToken}`
      }

      if (user) {
        headers['X-User-Id'] = user.id
        headers['X-User-Email'] = user.email
      }

      // Add cache-busting query parameter to prevent 304 responses
      const separator = endpoint.includes('?') ? '&' : '?'
      const url = `${this.baseUrl}${endpoint}${separator}_t=${Date.now()}`
      
      const response = await fetch(url, {
        ...options,
        headers,
        cache: 'no-store'
      })

      // Handle different response statuses
      if (response.status === 401) {
        // Unauthorized - user needs to sign in again
        await authService.signOut()
        return {
          success: false,
          error: 'Please sign in again'
        }
      }

      if (response.status === 403) {
        return {
          success: false,
          error: 'You do not have permission to perform this action'
        }
      }

      if (response.status === 429) {
        return {
          success: false,
          error: 'Too many requests, please try again later'
        }
      }

      // Handle 304 Not Modified - should not happen with cache-busting headers
      // but if it does, retry with cache disabled
      if (response.status === 304) {
        const separator = endpoint.includes('?') ? '&' : '?'
        const cacheBustUrl = `${this.baseUrl}${endpoint}${separator}_t=${Date.now()}`
        
        const freshResponse = await fetch(cacheBustUrl, {
          ...options,
          headers,
          cache: 'no-store'
        })
        
        if (!freshResponse.ok) {
          return {
            success: false,
            error: `Request failed with status ${freshResponse.status}`
          }
        }
        
        const freshData = await freshResponse.json().catch(() => null)
        return {
          success: true,
          data: freshData
        }
      }

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        return {
          success: false,
          error: errorData.message || `Request failed with status ${response.status}`
        }
      }

      // Parse JSON response
      let responseData: any = null
      try {
        const text = await response.text()
        if (text) {
          responseData = JSON.parse(text)
          console.log('[AuthenticatedApiClient] Response parsed:', {
            endpoint,
            status: response.status,
            hasData: !!responseData,
            dataKeys: responseData && typeof responseData === 'object' ? Object.keys(responseData) : 'N/A'
          })
        }
      } catch (parseError) {
        console.warn('[AuthenticatedApiClient] Failed to parse JSON response:', parseError, {
          endpoint,
          status: response.status,
          contentType: response.headers.get('content-type')
        })
        responseData = null
      }

      // Server returns { success: true, data: ... } or { success: false, error: ... }
      // Extract the nested data/error
      if (responseData && typeof responseData === 'object') {
        return {
          success: responseData.success ?? true,
          data: responseData.data,
          error: responseData.error
        }
      }

      return {
        success: true,
        data: responseData
      }
    } catch (error: any) {
      console.error('API request failed:', error)
      return {
        success: false,
        error: error.message || 'Network error occurred'
      }
    }
  }

  // Marketplace server methods
  async getServers(): Promise<ApiResponse<MarketplaceServer[]>> {
    return this.request<MarketplaceServer[]>('/servers')
  }

  async getServer(serverId: string): Promise<ApiResponse<MarketplaceServer>> {
    return this.request<MarketplaceServer>(`/servers/${serverId}`)
  }

  async getMyServers(): Promise<ApiResponse<MarketplaceServer[]>> {
    return this.request<MarketplaceServer[]>('/servers/my')
  }

  async createServer(serverData: any): Promise<ApiResponse<MarketplaceServer>> {
    return this.request<MarketplaceServer>('/servers', {
      method: 'POST',
      body: JSON.stringify(serverData)
    })
  }

  async updateServer(serverId: string, serverData: any): Promise<ApiResponse<MarketplaceServer>> {
    return this.request<MarketplaceServer>(`/servers/${serverId}`, {
      method: 'PUT',
      body: JSON.stringify(serverData)
    })
  }

  async deleteServer(serverId: string): Promise<ApiResponse<void>> {
    return this.request<void>(`/servers/${serverId}`, {
      method: 'DELETE'
    })
  }

  async trackInstall(serverId: string): Promise<ApiResponse<void>> {
    return this.request<void>(`/servers/${serverId}/install`, {
      method: 'POST'
    })
  }

  async trackUninstall(serverId: string): Promise<ApiResponse<void>> {
    return this.request<void>(`/servers/${serverId}/uninstall`, {
      method: 'POST'
    })
  }

  async getServerReviews(serverId: string): Promise<ApiResponse<any[]>> {
    return this.request<any[]>(`/servers/${serverId}/reviews`)
  }

  async createReview(serverId: string, rating: number, review?: string): Promise<ApiResponse<any>> {
    return this.request<any>(`/servers/${serverId}/reviews`, {
      method: 'POST',
      body: JSON.stringify({ rating, review })
    })
  }
}

export const apiClient = new AuthenticatedApiClient()
export default apiClient

