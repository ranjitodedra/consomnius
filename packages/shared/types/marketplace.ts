/**
 * Shared type definitions for MCP Marketplace
 * Used by both frontend and backend components
 */

import { ObjectId } from 'mongodb'

/**
 * Marketplace server document structure in MongoDB
 * This interface represents how servers are stored in the database
 */
export interface MarketplaceServerDoc {
  _id?: ObjectId
  name: string
  description?: string
  version?: string
  author?: string
  config: any
  createdAt?: string
  updatedAt?: string
  
  // Ownership fields (Phase 1.1)
  ownerId?: string          // User's Google ID from OAuth
  ownerEmail?: string       // User's email for display purposes
  ownerName?: string        // User's name for attribution
  isPublic?: boolean        // Public visibility (default: true, for future private servers)
  
  // Play Store-like fields
  videoUrl?: string         // Embed video URL (YouTube, Vimeo, etc.)
  instructions?: string     // Detailed instructions/description
  category?: string         // Server category (AI, Database, API, etc.)
  website?: string          // Official website URL
  supportEmail?: string     // Support contact email
  developerInfo?: {         // Developer information
    name: string
    email?: string
    website?: string
    company?: string
  }
  
  // Rating and engagement metrics
  rating?: {
    average: number         // Average rating (0-5)
    count: number          // Total number of ratings
    distribution: {        // Rating distribution
      1: number
      2: number  
      3: number
      4: number
      5: number
    }
  }
  installCount?: number     // Number of installations
  
  // Additional metadata
  repository?: string       // Git repository URL
  tags?: string[]          // Server tags for categorization
  readme?: string          // Server documentation/readme
}

/**
 * Marketplace server data for API responses
 * This interface represents how servers are sent to the frontend
 */
export interface MarketplaceServer {
  id: string                // String version of _id for frontend use
  name: string
  description?: string
  version?: string
  author?: string
  config: any
  createdAt?: string
  updatedAt?: string
  
  // Ownership fields
  ownerId?: string
  ownerEmail?: string
  ownerName?: string
  isPublic?: boolean
  
  // Play Store-like fields
  videoUrl?: string         
  instructions?: string     
  category?: string         
  website?: string          
  supportEmail?: string     
  developerInfo?: {         
    name: string
    email?: string
    website?: string
    company?: string
  }
  
  // Rating and engagement metrics
  rating?: {
    average: number         
    count: number          
    distribution: {        
      1: number
      2: number  
      3: number
      4: number
      5: number
    }
  }
  installCount?: number     
  
  // Additional metadata  
  repository?: string
  tags?: string[]
  readme?: string
}

/**
 * Request payload for creating a new marketplace server
 */
export interface CreateMarketplaceServerRequest {
  name: string
  description?: string
  version?: string
  author?: string
  config: any
  repository?: string
  tags?: string[]
  readme?: string
  isPublic?: boolean
  
  // Play Store-like fields
  videoUrl?: string
  instructions?: string
  category?: string
  website?: string
  supportEmail?: string
  developerInfo?: {
    name: string
    email?: string
    website?: string
    company?: string
  }
}

/**
 * Request payload for updating an existing marketplace server
 */
export interface UpdateMarketplaceServerRequest {
  name?: string
  description?: string
  version?: string
  author?: string
  config?: any
  repository?: string
  tags?: string[]
  readme?: string
  isPublic?: boolean
  
  // Play Store-like fields
  videoUrl?: string
  instructions?: string
  category?: string
  website?: string
  supportEmail?: string
  developerInfo?: {
    name: string
    email?: string
    website?: string
    company?: string
  }
  // Inline assets for update (replace existing assets of same type)
  logoData?: string
  screenshotsData?: string[]
}

/**
 * User context for marketplace operations
 * Contains authenticated user information
 */
export interface MarketplaceUserContext {
  googleId: string
  email: string
  name: string
  picture?: string
  isVerified: boolean
}

/**
 * Marketplace server with ownership information
 * Used in frontend to show ownership status
 */
export interface MarketplaceServerWithOwnership extends MarketplaceServer {
  isOwner: boolean          // Whether current user owns this server
  canEdit: boolean          // Whether current user can edit this server
  canDelete: boolean        // Whether current user can delete this server
}

/**
 * Marketplace statistics
 */
export interface MarketplaceStats {
  totalServers: number
  totalUsers: number
  userServers: number       // Number of servers owned by current user
  publicServers: number
}

/**
 * Marketplace error types
 */
export enum MarketplaceErrorType {
  UNAUTHORIZED = 'UNAUTHORIZED',
  FORBIDDEN = 'FORBIDDEN',
  NOT_FOUND = 'NOT_FOUND',
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  SERVER_ERROR = 'SERVER_ERROR',
  OWNERSHIP_ERROR = 'OWNERSHIP_ERROR'
}

/**
 * Marketplace API error response
 */
export interface MarketplaceError {
  type: MarketplaceErrorType
  message: string
  details?: any
}

/**
 * Server review document structure
 */
export interface ServerReview {
  _id?: ObjectId
  serverId: string          // Server ID being reviewed
  userId: string            // Reviewer's Google ID
  userName: string          // Reviewer's name
  userEmail: string         // Reviewer's email
  rating: number            // 1-5 star rating
  review?: string           // Optional review text
  createdAt: string         // Review creation date
  updatedAt?: string        // Review update date
  isVerified?: boolean      // Verified purchase/install
}

/**
 * Server installation tracking
 */
export interface ServerInstallation {
  _id?: ObjectId
  serverId: string          // Server ID
  userId: string            // User's Google ID
  userName: string          // User's name
  userEmail: string         // User's email
  installedAt: string       // Installation date
  isActive?: boolean        // Currently installed
  uninstalledAt?: string    // Uninstall date (if applicable)
}

/**
 * Server categories enum
 */
export enum ServerCategory {
  AI_ASSISTANT = 'AI Assistant',
  DATABASE = 'Database',
  FILE_SYSTEM = 'File System',
  WEB_API = 'Web API',
  DEVELOPMENT = 'Development',
  PRODUCTIVITY = 'Productivity',
  COMMUNICATION = 'Communication',
  MEDIA = 'Media',
  UTILITIES = 'Utilities',
  OTHER = 'Other'
}

/**
 * Request payload for creating a review
 */
export interface CreateReviewRequest {
  serverId: string
  rating: number
  review?: string
}

/**
 * Request payload for updating a review
 */
export interface UpdateReviewRequest {
  rating?: number
  review?: string
}

