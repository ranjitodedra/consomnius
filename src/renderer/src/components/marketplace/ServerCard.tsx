import React from 'react'
import { Button, Card, Space, Typography, Tag, Rate, Row, Col } from 'antd'
import { Download, Edit3, Trash2, User, Eye } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useMCPServers } from '@renderer/hooks/useMCPServers'
import { isMarketplaceInstalled } from './utils'
import type { MarketplaceServer } from '@shared/types/marketplace'

const { Text, Title } = Typography

interface ServerCardProps {
  server: MarketplaceServer
  onEdit: (server: MarketplaceServer) => void
  onDelete: (server: MarketplaceServer) => void
  onInstall: (server: MarketplaceServer) => void
  onView: (server: MarketplaceServer) => void
  canEdit: boolean
  isOwner: boolean
  showOwnership?: boolean
  compact?: boolean
}

export const ServerCard: React.FC<ServerCardProps> = ({
  server,
  onEdit,
  onDelete,
  onInstall,
  onView,
  canEdit,
  isOwner,
  showOwnership = true,
  compact = false
}) => {
  const { t } = useTranslation()
  const { mcpServers } = useMCPServers()
  
  // Prefer matching by marketplaceId to avoid same-name collisions; fallback to name for legacy installs
  const isInstalled = isMarketplaceInstalled(server, mcpServers)

  const formatInstallCount = (count: number = 0): string => {
    if (count >= 1000000) return `${(count / 1000000).toFixed(1)}M`
    if (count >= 1000) return `${(count / 1000).toFixed(1)}K`
    return count.toString()
  }

  if (compact) {
    // Compact view for grid layout
    return (
      <Card
        hoverable
        onClick={() => onView(server)}
        style={{ 
          borderRadius: '12px',
          overflow: 'hidden',
          height: '100%',
          cursor: 'pointer'
        }}
        bodyStyle={{ padding: '16px' }}
      >
        <Space direction="vertical" size="small" style={{ width: '100%' }}>
          <div>
            <Title level={5} style={{ margin: 0, fontSize: '16px' }} ellipsis>
              {server.name}
            </Title>
            {server.category && (
              <Tag color="blue" style={{ marginTop: '4px', fontSize: '12px' }}>
                {server.category}
              </Tag>
            )}
          </div>
          
          {server.description && (
            <Text 
              type="secondary" 
              style={{ 
                fontSize: '12px',
                display: '-webkit-box',
                WebkitLineClamp: 2,
                WebkitBoxOrient: 'vertical',
                overflow: 'hidden'
              }}
            >
              {server.description}
            </Text>
          )}
          
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Space size="small">
              <Rate 
                disabled 
                value={server.rating?.average || 0} 
                style={{ fontSize: '12px' }}
              />
              <Text type="secondary" style={{ fontSize: '11px' }}>
                ({server.rating?.count || 0})
              </Text>
            </Space>
            
            <Text type="secondary" style={{ fontSize: '11px' }}>
              {formatInstallCount(server.installCount || 0)} installs
            </Text>
          </div>
          
          <Button
            type="primary"
            size="small"
            block
            disabled={isInstalled}
            icon={<Download size={14} />}
            onClick={(e) => {
              e.stopPropagation()
              onInstall(server)
            }}
          >
            {isInstalled ? t('common.downloaded') : t('common.download')}
          </Button>
        </Space>
      </Card>
    )
  }

  // Full detailed view for list layout
  return (
    <Card
      hoverable
      style={{ 
        borderRadius: '12px',
        marginBottom: '16px'
      }}
      bodyStyle={{ padding: '20px' }}
    >
      <Row gutter={[16, 16]} align="middle">
        {/* Server Information */}
        <Col flex="auto">
          <Space direction="vertical" size="small" style={{ width: '100%' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div style={{ flex: 1 }}>
                <Space align="center" wrap>
                  <Title 
                    level={4} 
                    style={{ margin: 0, cursor: 'pointer' }}
                    onClick={() => onView(server)}
                  >
                    {server.name}
                  </Title>
                  {server.version && (
                    <Tag color="blue">v{server.version}</Tag>
                  )}
                  {server.category && (
                    <Tag color="geekblue">{server.category}</Tag>
                  )}
                  {showOwnership && isOwner && (
                    <Tag color="green" icon={<User size={12} />}>
                      Your Server
                    </Tag>
                  )}
                </Space>
                
                {server.description && (
                  <Text 
                    type="secondary" 
                    style={{ 
                      display: 'block',
                      marginTop: '4px',
                      fontSize: '14px'
                    }}
                  >
                    {server.description}
                  </Text>
                )}
                
                <div style={{ marginTop: '8px' }}>
                  <Space size="large">
                    {/* Rating */}
                    <Space size="small">
                      <Rate 
                        disabled 
                        allowHalf
                        value={server.rating?.average || 0} 
                        style={{ fontSize: '14px' }}
                      />
                      <Text type="secondary" style={{ fontSize: '12px' }}>
                        {server.rating?.average?.toFixed(1) || '0.0'} ({server.rating?.count || 0})
                      </Text>
                    </Space>
                    
                    {/* Install Count */}
                    <Space size="small">
                      <Download size={14} style={{ color: '#999' }} />
                      <Text type="secondary" style={{ fontSize: '12px' }}>
                        {formatInstallCount(server.installCount || 0)} downloads
                      </Text>
                    </Space>
                    
                    {/* Developer */}
                    <Text type="secondary" style={{ fontSize: '12px' }}>
                      By {server.developerInfo?.name || server.author || 'Unknown'}
                    </Text>
                  </Space>
                </div>
              </div>
              
              {/* Action Buttons */}
              <Space>
                <Button
                  icon={<Eye size={14} />}
                  onClick={() => onView(server)}
                >
                  View Details
                </Button>
                
                {canEdit && (
                  <>
                    <Button
                      type="text"
                      icon={<Edit3 size={14} />}
                      onClick={() => onEdit(server)}
                      title="Edit server"
                    />
                    <Button
                      type="text"
                      danger
                      icon={<Trash2 size={14} />}
                      onClick={() => onDelete(server)}
                      title="Delete server"
                    />
                  </>
                )}
                
                <Button
                  type="primary"
                  disabled={isInstalled}
                  icon={<Download size={14} />}
                  onClick={() => onInstall(server)}
                >
                  {isInstalled ? t('common.downloaded') : t('common.download')}
                </Button>
              </Space>
            </div>
          </Space>
        </Col>
      </Row>
    </Card>
  )
}

