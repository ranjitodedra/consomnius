import React, { useState, useEffect } from 'react'
import { 
  Card, 
  Typography, 
  Button, 
  Rate, 
  Space, 
  Divider, 
  Tag, 
  Row, 
  Col, 
  List, 
  Spin,
  Alert,
  Progress,
  Input
} from 'antd'
import { 
  Download, 
  ExternalLink, 
  Mail, 
  Globe, 
  Star, 
  Calendar, 
  User,
  ArrowLeft,
} from 'lucide-react'
import { useMCPServers } from '@renderer/hooks/useMCPServers'
import { useAuth } from '@renderer/hooks/useAuth'
import { apiClient } from '@renderer/services/AuthenticatedApiClient'
import type { MarketplaceServer, ServerReview } from '@shared/types/marketplace'
import { isMarketplaceInstalled, findLegacyInstalledCandidate } from './utils'

// Extend window interface for modal
declare global {
  interface Window {
    modal: {
      success: (options: { title: string; content: string }) => void
      error: (options: { title: string; content: string }) => void
    }
  }
}

const { Title, Text, Paragraph } = Typography

interface ServerDetailsPageProps {
  server: MarketplaceServer
  onBack: () => void
  onInstall: (server: MarketplaceServer) => void
  onEdit?: (server: MarketplaceServer) => void
}

export const ServerDetailsPage: React.FC<ServerDetailsPageProps> = ({
  server,
  onBack,
  onInstall,
  onEdit
}) => {
  const { mcpServers, updateMCPServer } = useMCPServers()
  const { user, isAuthenticated } = useAuth()
  const [reviews, setReviews] = useState<ServerReview[]>([])
  const [loadingReviews, setLoadingReviews] = useState(false)
  const [userRating, setUserRating] = useState<number>(0)
  const [reviewText, setReviewText] = useState('')
  const [submittingReview, setSubmittingReview] = useState(false)
  
  // Prefer matching by marketplaceId to avoid same-name collisions; fallback to name for legacy installs
  const isInstalled = isMarketplaceInstalled(server, mcpServers)
  const currentUserId = (user as any)?.sub || (user as any)?.googleId || (user as any)?.id
  const isOwner = Boolean(isAuthenticated && currentUserId && server.ownerId === currentUserId)
  const canEdit = isOwner

  useEffect(() => {
    // Load reviews for this server
    loadReviews()
  }, [server.id])

  // Backfill marketplaceId for legacy installs that match heuristics
  useEffect(() => {
    if (!server?.id) return
    const hasById = mcpServers.some((s) => s.meta?.marketplaceId === server.id)
    if (hasById) return
    const candidate = findLegacyInstalledCandidate(server, mcpServers)
    if (candidate) {
      updateMCPServer({ ...candidate, meta: { ...(candidate.meta || {}), marketplaceId: server.id } })
    }
  }, [server?.id, mcpServers])

  const loadReviews = async () => {
    setLoadingReviews(true)
    try {
      const response = await apiClient.getServerReviews(server.id)
      if (response.success && response.data) {
        setReviews(Array.isArray(response.data) ? response.data : [])
      } else {
        console.error('Failed to load reviews:', response.error)
        setReviews([])
      }
    } catch (error) {
      console.error('Failed to load reviews:', error)
      setReviews([])
    } finally {
      setLoadingReviews(false)
    }
  }

  const submitReview = async () => {
    if (!isAuthenticated || !user || userRating === 0) return

    setSubmittingReview(true)
    try {
      const response = await apiClient.createReview(server.id, userRating, reviewText)
      if (response.success) {
        // Reload reviews to show the new one
        await loadReviews()
        // Reset form
        setUserRating(0)
        setReviewText('')
        // Show success message
        window.modal.success({
          title: 'Review Submitted',
          content: 'Thank you for your review! It has been submitted successfully.'
        })
      } else {
        window.modal.error({
          title: 'Failed to Submit Review',
          content: response.error || 'An error occurred while submitting your review. Please try again.'
        })
      }
    } catch (error) {
      console.error('Failed to submit review:', error)
      window.modal.error({
        title: 'Failed to Submit Review',
        content: 'An error occurred while submitting your review. Please try again.'
      })
    } finally {
      setSubmittingReview(false)
    }
  }

  const formatInstallCount = (count: number = 0): string => {
    if (count >= 1000000) return `${(count / 1000000).toFixed(1)}M`
    if (count >= 1000) return `${(count / 1000).toFixed(1)}K`
    return count.toString()
  }

  const getRatingDistribution = () => {
    if (!server.rating?.distribution) return []
    
    const total = server.rating.count || 0
    return [5, 4, 3, 2, 1].map(star => ({
      star,
      count: server.rating?.distribution?.[star as keyof typeof server.rating.distribution] || 0,
      percentage: total > 0 ? ((server.rating?.distribution?.[star as keyof typeof server.rating.distribution] || 0) / total) * 100 : 0
    }))
  }

  return (
    <div style={{ padding: '24px', maxWidth: '1200px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{ marginBottom: '24px' }}>
        <Button 
          icon={<ArrowLeft />} 
          onClick={onBack}
          style={{ marginBottom: '16px' }}
        >
          Back to Marketplace
        </Button>
        
        <Row gutter={[24, 24]}>
          <Col xs={24} md={24}>
            {/* Server Info */}
            <Space direction="vertical" size="small" style={{ width: '100%' }}>
              <Title level={2} style={{ margin: 0 }}>{server.name}</Title>
              
              <Space wrap>
                {server.category && (
                  <Tag color="blue">{server.category}</Tag>
                )}
                {server.version && (
                  <Tag>v{server.version}</Tag>
                )}
                {isOwner && (
                  <Tag color="green" icon={<User size={12} />}>
                    Your Server
                  </Tag>
                )}
              </Space>
              
              <Text type="secondary">
                By {server.developerInfo?.name || server.author || 'Unknown'}
              </Text>
              
              {server.description && (
                <Paragraph>{server.description}</Paragraph>
              )}
              
              {/* Rating and Install Count */}
              <Space size="large">
                <Space direction="vertical" align="center" size={0}>
                  <Rate 
                    disabled 
                    allowHalf 
                    value={server.rating?.average || 0} 
                    style={{ fontSize: '16px' }}
                  />
                  <Text type="secondary" style={{ fontSize: '12px' }}>
                    {server.rating?.average?.toFixed(1) || '0.0'} ({server.rating?.count || 0} reviews)
                  </Text>
                </Space>
                
                <Space direction="vertical" align="center" size={0}>
                  <Text strong style={{ fontSize: '18px' }}>
                    {formatInstallCount(server.installCount || 0)}
                  </Text>
                  <Text type="secondary" style={{ fontSize: '12px' }}>
                    Downloads
                  </Text>
                </Space>
              </Space>
              
              {/* Action Buttons */}
              <Space>
                <Button
                  type="primary"
                  size="large"
                  icon={<Download />}
                  disabled={isInstalled}
                  onClick={() => onInstall(server)}
                >
                  {isInstalled ? 'Downloaded' : 'Download'}
                </Button>
                
                {canEdit && onEdit && (
                  <Button
                    size="large"
                    onClick={() => onEdit(server)}
                  >
                    Edit
                  </Button>
                )}
              </Space>
            </Space>
          </Col>
        </Row>
      </div>


      {/* About Section */}
      <Card style={{ marginBottom: '24px' }}>
        <Title level={3} style={{ marginBottom: '24px' }}>About</Title>
        
        {server.instructions && (
          <div style={{ marginBottom: '24px' }}>
            <Title level={4}>Instructions</Title>
            <Paragraph style={{ whiteSpace: 'pre-wrap' }}>
              {server.instructions}
            </Paragraph>
          </div>
        )}
        
        {server.readme && (
          <div style={{ marginBottom: '24px' }}>
            <Title level={4}>Documentation</Title>
            <Paragraph style={{ whiteSpace: 'pre-wrap' }}>
              {server.readme}
            </Paragraph>
          </div>
        )}
        
        {/* Server Details */}
        <Divider />
        <Title level={4}>Server Details</Title>
        <Row gutter={[16, 16]}>
          <Col xs={24} sm={12}>
            <Space direction="vertical" size="small">
              <Text strong>Version:</Text>
              <Text>{server.version || 'Not specified'}</Text>
              
              <Text strong>Updated:</Text>
              <Text>
                {server.updatedAt ? new Date(server.updatedAt).toLocaleDateString() : 'Unknown'}
              </Text>
              
              <Text strong>Category:</Text>
              <Text>{server.category || 'Uncategorized'}</Text>
            </Space>
          </Col>
          
          <Col xs={24} sm={12}>
            <Space direction="vertical" size="small">
              {server.website && (
                <>
                  <Text strong>Website:</Text>
                  <Button 
                    type="link" 
                    icon={<ExternalLink size={14} />}
                    href={server.website}
                    target="_blank"
                    style={{ padding: 0 }}
                  >
                    Visit Website
                  </Button>
                </>
              )}
              
              {server.repository && (
                <>
                  <Text strong>Repository:</Text>
                  <Button 
                    type="link" 
                    icon={<ExternalLink size={14} />}
                    href={server.repository}
                    target="_blank"
                    style={{ padding: 0 }}
                  >
                    View Source
                  </Button>
                </>
              )}
            </Space>
          </Col>
        </Row>
      </Card>

      {/* Reviews Section */}
      <Card style={{ marginBottom: '24px' }}>
        <Title level={3} style={{ marginBottom: '24px' }}>
          Reviews ({server.rating?.count || 0})
        </Title>
        
        {/* Rating Overview */}
        <Row gutter={[24, 24]} style={{ marginBottom: '24px' }}>
          <Col xs={24} md={8}>
            <div style={{ textAlign: 'center' }}>
              <Title level={2} style={{ margin: 0 }}>
                {server.rating?.average?.toFixed(1) || '0.0'}
              </Title>
              <Rate 
                disabled 
                allowHalf 
                value={server.rating?.average || 0}
                style={{ fontSize: '20px' }}
              />
              <div>
                <Text type="secondary">
                  {server.rating?.count || 0} reviews
                </Text>
                {server.rating?.count && server.rating.count > 0 && (
                  <div style={{ marginTop: '4px' }}>
                    <Text type="secondary" style={{ fontSize: '12px' }}>
                      Average of {server.rating.count} rating{server.rating.count !== 1 ? 's' : ''}
                    </Text>
                  </div>
                )}
              </div>
            </div>
          </Col>
          
          <Col xs={24} md={16}>
            <Space direction="vertical" style={{ width: '100%' }}>
              {getRatingDistribution().map(({ star, count, percentage }) => (
                <Row key={star} align="middle" gutter={8}>
                  <Col span={2}>
                    <Text>{star}</Text>
                  </Col>
                  <Col span={1}>
                    <Star size={14} />
                  </Col>
                  <Col span={16}>
                    <Progress 
                      percent={percentage} 
                      showInfo={false}
                      strokeColor="#1890ff"
                    />
                  </Col>
                  <Col span={5}>
                    <Text type="secondary">{count}</Text>
                  </Col>
                </Row>
              ))}
            </Space>
          </Col>
        </Row>

        {/* Rate This Server */}
        {isAuthenticated && isInstalled && !isOwner && (
          <Card 
            title="Rate this server" 
            size="small" 
            style={{ marginBottom: '24px', backgroundColor: '#f9f9f9' }}
          >
            <Space direction="vertical" style={{ width: '100%' }}>
              <div>
                <Text strong>Your rating:</Text>
                <Rate 
                  value={userRating} 
                  onChange={setUserRating}
                  style={{ marginLeft: '8px' }}
                />
              </div>
              
              <div>
                <Text strong>Your review (optional):</Text>
                <div style={{ marginTop: '8px' }}>
                  <Input.TextArea
                    value={reviewText}
                    onChange={(e) => setReviewText(e.target.value)}
                    placeholder="Share your experience with this server..."
                    rows={3}
                    maxLength={500}
                  />
                </div>
              </div>
              
              <Button 
                type="primary"
                onClick={submitReview}
                loading={submittingReview}
                disabled={userRating === 0}
              >
                Submit Review
              </Button>
            </Space>
          </Card>
        )}

        {!isAuthenticated && (
          <Alert
            message="Sign in to leave a review"
            description="You need to be signed in and have this server downloaded to write a review."
            type="info"
            style={{ marginBottom: '24px' }}
          />
        )}

        {isAuthenticated && !isInstalled && (
          <Alert
            message="Download required to review"
            description="You need to download this server before you can write a review."
            type="info"
            style={{ marginBottom: '24px' }}
          />
        )}

        {/* Reviews List */}
        <Spin spinning={loadingReviews}>
          {reviews.length > 0 ? (
            <>
              <List
                dataSource={reviews.slice(0, 3)} // Show only first 3 reviews
                renderItem={(review) => (
                  <List.Item>
                    <List.Item.Meta
                      title={
                        <Space>
                          <Text strong>{review.userName}</Text>
                          <Rate disabled value={review.rating} style={{ fontSize: '14px' }} />
                          {review.isVerified && (
                            <Tag color="green">Verified</Tag>
                          )}
                        </Space>
                      }
                      description={
                        <Space direction="vertical" size={0}>
                          <Text type="secondary" style={{ fontSize: '12px' }}>
                            <Calendar size={12} style={{ marginRight: '4px' }} />
                            {new Date(review.createdAt).toLocaleDateString()}
                          </Text>
                          {review.review && (
                            <Paragraph style={{ marginTop: '8px', marginBottom: 0 }}>
                              {review.review}
                            </Paragraph>
                          )}
                        </Space>
                      }
                    />
                  </List.Item>
                )}
              />
              {reviews.length > 3 && (
                <div style={{ textAlign: 'center', marginTop: '16px' }}>
                  <Text type="secondary">
                    Showing 3 of {reviews.length} reviews
                  </Text>
                </div>
              )}
            </>
          ) : !loadingReviews ? (
            <div style={{ textAlign: 'center', padding: '40px 0' }}>
              <Text type="secondary">No reviews yet. Be the first to review!</Text>
            </div>
          ) : null}
        </Spin>
      </Card>

      {/* Support Section */}
      <Card>
        <Title level={3} style={{ marginBottom: '24px' }}>Support</Title>
        
        <Space direction="vertical" size="large" style={{ width: '100%' }}>
          <div>
            <Title level={4}>Developer Information</Title>
            <Space direction="vertical" size="small">
              <Text strong>
                {server.developerInfo?.name || server.author || 'Unknown Developer'}
              </Text>
              
              {server.developerInfo?.company && (
                <Text type="secondary">
                  Company: {server.developerInfo.company}
                </Text>
              )}
              
              <Space wrap>
                {server.supportEmail && (
                  <Button 
                    icon={<Mail size={14} />}
                    href={`mailto:${server.supportEmail}`}
                  >
                    Contact Support
                  </Button>
                )}
                
                {server.developerInfo?.website && (
                  <Button 
                    icon={<Globe size={14} />}
                    href={server.developerInfo.website}
                    target="_blank"
                  >
                    Developer Website
                  </Button>
                )}
              </Space>
            </Space>
          </div>
          
          {server.repository && (
            <div>
              <Title level={4}>Source Code</Title>
              <Space>
                <Button 
                  icon={<ExternalLink size={14} />}
                  href={server.repository}
                  target="_blank"
                >
                  View Repository
                </Button>
              </Space>
            </div>
          )}
          
          <div>
            <Title level={4}>Server Information</Title>
            <Space direction="vertical" size="small">
              <Text>
                <Text strong>Created:</Text> {' '}
                {server.createdAt ? new Date(server.createdAt).toLocaleDateString() : 'Unknown'}
              </Text>
              <Text>
                <Text strong>Last Updated:</Text> {' '}
                {server.updatedAt ? new Date(server.updatedAt).toLocaleDateString() : 'Unknown'}
              </Text>
              <Text>
                <Text strong>Total Downloads:</Text> {' '}
                {formatInstallCount(server.installCount || 0)}
              </Text>
            </Space>
          </div>
        </Space>
      </Card>

    </div>
  )
}

