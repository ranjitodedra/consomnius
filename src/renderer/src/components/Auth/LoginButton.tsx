import { GoogleOutlined, LogoutOutlined, UserOutlined } from '@ant-design/icons'
import { useAuth } from '@renderer/hooks/useAuth'
import { Avatar, Button, Dropdown, Menu } from 'antd'
import React from 'react'
import { useTranslation } from 'react-i18next'

const LoginButton: React.FC = () => {
  const { t } = useTranslation()
  const { user, isAuthenticated, isLoading, signInWithGoogle, signOut } = useAuth()

  const handleSignIn = async () => {
    try {
      await signInWithGoogle()
    } catch (error) {
      console.error('Sign in failed:', error)
    }
  }

  const handleSignOut = async () => {
    try {
      await signOut()
    } catch (error) {
      console.error('Sign out failed:', error)
    }
  }

  if (isLoading) {
    return <Button loading>{t('auth.signingIn', 'Signing in...')}</Button>
  }

  if (isAuthenticated && user) {
    const menu = (
      <Menu>
        <Menu.Item key="profile" icon={<UserOutlined />}>
          {t('auth.profile', 'Profile')}
        </Menu.Item>
        <Menu.Divider />
        <Menu.Item key="signout" icon={<LogoutOutlined />} onClick={handleSignOut}>
          {t('auth.signOut', 'Sign Out')}
        </Menu.Item>
      </Menu>
    )

    return (
      <Dropdown overlay={menu} trigger={['click']}>
        <Button type="text" style={{ padding: '4px 8px' }}>
          <Avatar size="small" src={user.picture} icon={<UserOutlined />} style={{ marginRight: 8 }} />
          <span>{user.name}</span>
        </Button>
      </Dropdown>
    )
  }

  return (
    <Button type="primary" icon={<GoogleOutlined />} onClick={handleSignIn}>
      {t('auth.signInWithGoogle', 'Sign in with Google')}
    </Button>
  )
}

export default LoginButton

