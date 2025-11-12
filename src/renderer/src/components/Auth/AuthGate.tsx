import { LockOutlined, UserOutlined } from '@ant-design/icons'
import { useAuth } from '@renderer/hooks/useAuth'
import { Card, Divider, Space, Typography } from 'antd'
import React from 'react'
import { useTranslation } from 'react-i18next'
import styled from 'styled-components'

import GoogleSignInButton from './GoogleSignInButton'

const { Text, Title, Paragraph } = Typography

const AuthGate: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { t } = useTranslation()
  const { isAuthenticated, isLoading, error } = useAuth()

  // Show loading state
  if (isLoading) {
    return (
      <AuthContainer>
        <Card style={{ width: 400, textAlign: 'center' }}>
          <div style={{ padding: '40px 20px' }}>
            <div className="loading-spinner" />
            <Title level={4} style={{ marginTop: 20 }}>
              Loading...
            </Title>
          </div>
        </Card>
      </AuthContainer>
    )
  }

  // If authenticated, show the app
  if (isAuthenticated) {
    return <>{children}</>
  }

  // If not authenticated, show login screen
  return (
    <AuthContainer>
      <div className="drag" style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 16 }} />
      <Card className="nodrag" style={{ width: 450, textAlign: 'center' }}>
        <div style={{ padding: '40px 20px' }}>
          <div style={{ marginBottom: 30 }}>
            <Title level={2} style={{ marginBottom: 10 }}>
              {t('auth.welcome_title', 'Welcome to Consomnius')}
            </Title>
            <Paragraph style={{ color: '#666', fontSize: 16 }}>
              {t('auth.welcome_subtitle', 'Sign in to access the MCP Marketplace')}
            </Paragraph>
          </div>

          <Space direction="vertical" size="large" style={{ width: '100%' }}>
            <GoogleSignInButton />

            <Divider>or</Divider>

            <div style={{ textAlign: 'left' }}>
              <Title level={5} style={{ marginBottom: 15 }}>
                {t('auth.why_account_title', 'Why sign in?')}
              </Title>
              <Space direction="vertical" size="small" style={{ width: '100%' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <UserOutlined style={{ color: '#1890ff' }} />
                  <Text>{t('auth.why_account_publish', 'Publish your own MCP servers')}</Text>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <LockOutlined style={{ color: '#52c41a' }} />
                  <Text>{t('auth.why_account_control', 'Control and manage your servers')}</Text>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <UserOutlined style={{ color: '#722ed1' }} />
                  <Text>{t('auth.why_account_track', 'Track your server installations')}</Text>
                </div>
              </Space>
            </div>
          </Space>
        </div>
      </Card>
    </AuthContainer>
  )
}

const AuthContainer = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 100vh;
  background-color: #f5f5f5;

  .loading-spinner {
    width: 40px;
    height: 40px;
    border: 4px solid #f3f3f3;
    border-top: 4px solid #1890ff;
    margin: 0 auto;
    border-radius: 50%;
    animation: spin 1s linear infinite;
  }

  @keyframes spin {
    0% {
      transform: rotate(0deg);
    }
    100% {
      transform: rotate(360deg);
    }
  }
`

export default AuthGate

