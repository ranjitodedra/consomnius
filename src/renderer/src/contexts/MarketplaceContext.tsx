import React, { createContext, useContext, useEffect, useState, useCallback, ReactNode } from 'react'
import { apiClient, ApiResponse } from '@renderer/services/AuthenticatedApiClient'
import { useAuth } from '@renderer/hooks/useAuth'
import { MarketplaceServer } from '@shared/types/marketplace'

export interface MarketplaceState {
  // Public servers (for browsing)
  servers: MarketplaceServer[]
  serversLoading: boolean
  serversError: string | null

  // User's own servers
  myServers: MarketplaceServer[]
  myServersLoading: boolean
  myServersError: string | null

  // Operation states
  creating: boolean
  updating: boolean
  deleting: boolean
}

export interface MarketplaceActions {
  // Data fetching
  fetchServers: () => Promise<void>
  fetchMyServers: () => Promise<void>
  refreshAll: () => Promise<void>
  refreshServerData: () => Promise<void>

  // Server operations
  createServer: (serverData: any) => Promise<ApiResponse>
  updateServer: (serverId: string, serverData: any) => Promise<ApiResponse>
  deleteServer: (serverId: string) => Promise<ApiResponse>

  // Helper methods
  isOwner: (server: MarketplaceServer) => boolean
  canEdit: (server: MarketplaceServer) => boolean
}

export interface MarketplaceContextType extends MarketplaceState, MarketplaceActions {}

const initialState: MarketplaceState = {
  servers: [],
  serversLoading: false,
  serversError: null,
  myServers: [],
  myServersLoading: false,
  myServersError: null,
  creating: false,
  updating: false,
  deleting: false
}

const MarketplaceContext = createContext<MarketplaceContextType | null>(null)

export const useMarketplace = (): MarketplaceContextType => {
  const context = useContext(MarketplaceContext)
  if (!context) {
    throw new Error('useMarketplace must be used within a MarketplaceProvider')
  }
  return context
}

interface MarketplaceProviderProps {
  children: ReactNode
}

export const MarketplaceProvider: React.FC<MarketplaceProviderProps> = ({ children }) => {
  const [state, setState] = useState<MarketplaceState>(initialState)
  const { user, isAuthenticated } = useAuth()

  // Fetch all servers (public browsing)
  const fetchServers = useCallback(async (): Promise<void> => {
    setState(prev => ({ ...prev, serversLoading: true, serversError: null }))
    
    try {
      const response = await apiClient.getServers()
      console.log('[MarketplaceContext] getServers response:', {
        success: response.success,
        hasData: !!response.data,
        dataType: Array.isArray(response.data) ? 'array' : typeof response.data,
        dataLength: Array.isArray(response.data) ? response.data.length : 'N/A',
        error: response.error
      })
      
      if (response.success) {
        const servers = Array.isArray(response.data) ? response.data : []
        console.log('[MarketplaceContext] Setting servers:', servers.length)
        setState(prev => ({
          ...prev,
          servers,
          serversLoading: false
        }))
      } else {
        console.error('[MarketplaceContext] Failed to fetch servers:', response.error)
        setState(prev => ({
          ...prev,
          serversError: response.error || 'Failed to fetch servers',
          serversLoading: false
        }))
      }
    } catch (error: any) {
      console.error('[MarketplaceContext] Error fetching servers:', error)
      // Check if it's a connection error
      const isConnectionError = error?.message?.includes('Failed to fetch') || 
                                error?.message?.includes('ERR_CONNECTION_REFUSED') ||
                                error?.message?.includes('Network error')
      
      setState(prev => ({
        ...prev,
        serversError: isConnectionError 
          ? 'API server is not running. Please enable it in Settings → API Server.'
          : 'Network error while fetching servers',
        serversLoading: false
      }))
    }
  }, [])

  // Fetch user's own servers
  const fetchMyServers = useCallback(async (): Promise<void> => {
    if (!isAuthenticated) {
      setState(prev => ({ ...prev, myServers: [], myServersLoading: false }))
      return
    }

    setState(prev => ({ ...prev, myServersLoading: true, myServersError: null }))
    
    try {
      const response = await apiClient.getMyServers()
      if (response.success) {
        setState(prev => ({
          ...prev,
          myServers: Array.isArray(response.data) ? response.data : [],
          myServersLoading: false
        }))
      } else {
        setState(prev => ({
          ...prev,
          myServersError: response.error || 'Failed to fetch your servers',
          myServersLoading: false
        }))
      }
    } catch (error) {
      setState(prev => ({
        ...prev,
        myServersError: 'Network error while fetching your servers',
        myServersLoading: false
      }))
    }
  }, [isAuthenticated])

  // Refresh all data
  const refreshAll = useCallback(async (): Promise<void> => {
    await Promise.all([fetchServers(), fetchMyServers()])
  }, [fetchServers, fetchMyServers])

  // Refresh server data (for updating download counts)
  const refreshServerData = useCallback(async (): Promise<void> => {
    await fetchServers()
  }, [fetchServers])

  // Create a new server
  const createServer = useCallback(async (serverData: any): Promise<ApiResponse> => {
    setState(prev => ({ ...prev, creating: true }))
    
    try {
      const response = await apiClient.createServer(serverData)
      
      if (response.success) {
        // Optimistically update the state
        await Promise.all([fetchServers(), fetchMyServers()])
      }
      
      return response
    } finally {
      setState(prev => ({ ...prev, creating: false }))
    }
  }, [fetchServers, fetchMyServers])

  // Update an existing server
  const updateServer = useCallback(async (serverId: string, serverData: any): Promise<ApiResponse> => {
    setState(prev => ({ ...prev, updating: true }))
    
    try {
      const response = await apiClient.updateServer(serverId, serverData)
      
      if (response.success) {
        // Optimistically update the state
        await Promise.all([fetchServers(), fetchMyServers()])
      }
      
      return response
    } finally {
      setState(prev => ({ ...prev, updating: false }))
    }
  }, [fetchServers, fetchMyServers])

  // Delete a server
  const deleteServer = useCallback(async (serverId: string): Promise<ApiResponse> => {
    setState(prev => ({ ...prev, deleting: true }))
    
    try {
      const response = await apiClient.deleteServer(serverId)
      
      if (response.success) {
        // Optimistically update the state
        setState(prev => ({
          ...prev,
          servers: prev.servers.filter(s => s.id !== serverId),
          myServers: prev.myServers.filter(s => s.id !== serverId)
        }))
        // Refresh to ensure consistency
        await Promise.all([fetchServers(), fetchMyServers()])
      }
      
      return response
    } finally {
      setState(prev => ({ ...prev, deleting: false }))
    }
  }, [fetchServers, fetchMyServers])

  // Helper: Check if user owns a server
  const isOwner = (server: MarketplaceServer): boolean => {
    if (!server) return false
    // Trust backend flag when present
    if (typeof (server as any).isOwner === 'boolean') return (server as any).isOwner
    if (!user) return false
    const userId = (user as any)?.sub || (user as any)?.googleId || (user as any)?.id
    return !!userId && server.ownerId === userId
  }

  // Helper: Check if user can edit a server
  const canEdit = (server: MarketplaceServer): boolean => {
    if (!isAuthenticated || !server) return false
    // Trust backend flag when present
    if (typeof (server as any).isOwner === 'boolean') return (server as any).isOwner
    if (!server.ownerId) return true
    if (!user) return false
    const userId = (user as any)?.sub || (user as any)?.googleId || (user as any)?.id
    return !!userId && server.ownerId === userId
  }

  // Load data on mount and when authentication changes
  useEffect(() => {
    fetchServers()
    if (isAuthenticated) {
      fetchMyServers()
    } else {
      setState(prev => ({ ...prev, myServers: [] }))
    }
  }, [isAuthenticated, fetchServers, fetchMyServers])

  const contextValue: MarketplaceContextType = {
    ...state,
    fetchServers,
    fetchMyServers,
    refreshAll,
    refreshServerData,
    createServer,
    updateServer,
    deleteServer,
    isOwner,
    canEdit
  }

  return (
    <MarketplaceContext.Provider value={contextValue}>
      {children}
    </MarketplaceContext.Provider>
  )
}

export default MarketplaceContext

