import { nanoid } from '@reduxjs/toolkit'
import { useMCPServers } from '@renderer/hooks/useMCPServers'
import { useAuth } from '@renderer/hooks/useAuth'
import { MarketplaceProvider, useMarketplace } from '@renderer/contexts/MarketplaceContext'
import { apiClient } from '@renderer/services/AuthenticatedApiClient'
import { MCPServer } from '@renderer/types'
import { Button, Flex, Space, Typography, Tabs, Alert, Modal, Form, Spin, Input, Checkbox } from 'antd'
import { Plus, LogIn } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ServerCard } from '@renderer/components/marketplace/ServerCard'
import { ServerDetailsPage } from '@renderer/components/marketplace/ServerDetailsPage'
import { EnhancedServerForm } from '@renderer/components/marketplace/EnhancedServerForm'

import { SettingContainer, SettingGroup, SettingTitle } from '..'

const { Text } = Typography

// Authentication wrapper component
const AuthenticatedMarketplace = () => {
  const { user, isAuthenticated, signInWithGoogle, isLoading } = useAuth()
  const { t } = useTranslation()

  if (isLoading) {
    return (
      <SettingContainer>
        <Flex justify="center" style={{ padding: '60px 0' }}>
          <Spin size="large" />
        </Flex>
      </SettingContainer>
    )
  }

  return (
    <SettingContainer>
      <SettingGroup>
        <SettingTitle>
          {t('settings.mcp.marketplace.title', 'MCP Marketplace')}
        </SettingTitle>
        
        {/* Authentication Status */}
        {isAuthenticated && user ? (
          <Alert
            message={`Signed in as ${user.name || user.email}`}
            description="You can create, edit, and delete your own servers"
            type="success"
            showIcon
            style={{ marginBottom: '16px' }}
          />
        ) : (
          <Alert
            message="Not signed in"
            description="Sign in to create and manage your own MCP servers"
            type="info"
            showIcon
            action={
              <Button
                type="primary"
                icon={<LogIn size={16} />}
                onClick={signInWithGoogle}
                loading={isLoading}
              >
                Sign In with Google
              </Button>
            }
            style={{ marginBottom: '16px' }}
          />
        )}

        <MarketplaceContent />
      </SettingGroup>
    </SettingContainer>
  )
}

// Main marketplace content component
const MarketplaceContent = () => {
  const { t } = useTranslation()
  const { user, isAuthenticated } = useAuth()
  const {
    servers,
    serversLoading,
    serversError,
    myServers,
    myServersLoading,
    myServersError,
    creating,
    updating,
    deleteServer,
    createServer,
    updateServer,
    canEdit,
    refreshServerData
  } = useMarketplace()

  const [openEditor, setOpenEditor] = useState(false)
  const [editing, setEditing] = useState<any | null>(null)
  const [form] = Form.useForm()
  const [activeTab, setActiveTab] = useState('browse')
  const [currentView, setCurrentView] = useState<'marketplace' | 'details'>('marketplace')
  const [selectedServer, setSelectedServer] = useState<any | null>(null)

  const { addMCPServer } = useMCPServers()

  // Note: Data is automatically loaded by MarketplaceContext on mount
  // Only refresh if needed (e.g., after mutations)

  const onCreate = () => {
    if (!isAuthenticated) {
      Modal.info({
        title: 'Authentication Required',
        content: 'Please sign in to create new MCP servers.',
      })
      return
    }
    setEditing(null)
    setOpenEditor(true)
  }

  const onView = (record: any) => {
    setSelectedServer(record)
    setCurrentView('details')
  }

  const onEdit = (record: any) => {
    if (!canEdit(record)) {
      Modal.warning({
        title: 'Permission Denied',
        content: 'You can only edit servers that you own.',
      })
      return
    }

    setEditing(record)
    setOpenEditor(true)
  }

  const onDelete = async (record: any) => {
    if (!canEdit(record)) {
      Modal.warning({
        title: 'Permission Denied',
        content: 'You can only delete servers that you own.',
      })
      return
    }

    Modal.confirm({
      title: t('common.confirm'),
      content: t('common.deleteConfirm'),
      async onOk() {
        const response = await deleteServer(record.id)
        if (response.success) {
          window.toast?.success?.('Server deleted successfully')
        } else {
          window.toast?.error?.(response.error || 'Delete failed')
        }
      }
    })
  }

  const onSubmitEnhanced = async (serverData: any) => {
    try {
      let response
      if (editing) {
        response = await updateServer(editing.id, serverData)
      } else {
        response = await createServer(serverData)
      }

      if (response.success) {
        window.toast?.success?.(editing ? 'Server updated successfully' : 'Server created successfully')
        setOpenEditor(false)
        setEditing(null)
      } else {
        window.toast?.error?.(response.error || 'Operation failed')
      }
    } catch (err: any) {
      window.toast?.error?.(err?.message || 'Operation failed')
    }
  }

  const onSubmit = async () => {
    try {
      const values = await form.validateFields()

      const args: string[] = (values.args || []).map((r: any) => (r?.value ?? '').trim())
      const argsPrompts = (values.args || [])
        .map((r: any, idx: number) => (r?.askPath ? { argIndex: idx, label: r?.label, type: 'path' } : null))
        .filter(Boolean)

      const payload = {
        name: values.name,
        description: values.description,
        version: values.version,
        author: values.author,
        config: {
          command: values.command,
          registryUrl: values.registryUrl,
          args,
          argsPrompts
        }
      }

      let response
      if (editing?.id) {
        response = await updateServer(editing.id, payload)
      } else {
        response = await createServer(payload)
      }

      if (response.success) {
        window.toast?.success?.(editing ? 'Server updated successfully' : 'Server created successfully')
        setOpenEditor(false)
      } else {
        window.toast?.error?.(response.error || 'Operation failed')
      }
    } catch (err: any) {
      window.toast?.error?.(err?.message || 'Validation failed')
    }
  }

  const onInstall = async (record: any) => {
    try {
      const cfg = record?.config
      let extracted: any = {}

      if (cfg && typeof cfg === 'object' && cfg.mcpServers && typeof cfg.mcpServers === 'object') {
        const keys = Object.keys(cfg.mcpServers)
        if (keys.length > 0) {
          extracted = cfg.mcpServers[keys[0]] || {}
        }
      } else if (Array.isArray(cfg) && cfg.length > 0) {
        extracted = cfg[0] || {}
      } else if (cfg && typeof cfg === 'object') {
        extracted = cfg
      }

      if (!extracted || typeof extracted !== 'object') {
        window.toast?.error?.(t('common.error') + ': Invalid server config')
        return
      }

      // Resolve ${HOME} placeholders via main
      let homeDir = ''
      try {
        homeDir = await (window as any).api.getHomeDir()
      } catch (error) {
        console.warn('Failed to get home directory:', error)
      }

      const resolveArg = (a: any) => {
        if (typeof a !== 'string' || !homeDir) return a
        let out = a
        out = out.replace(/^\/?\$\{HOME\}/g, homeDir)
        out = out.replace(/\$\{HOME\}/g, homeDir)
        out = out.replace(/^\/\/+/, '/')
        return out
      }

      const argsPrompts: Array<{ argIndex: number; label?: string; type?: 'path' | 'text' }> = Array.isArray(
        cfg?.argsPrompts
      )
        ? cfg.argsPrompts
        : []

      const baseArgs: string[] = Array.isArray(extracted.args) ? [...extracted.args] : []
      for (const p of argsPrompts) {
        while (baseArgs.length <= p.argIndex) baseArgs.push('')
      }

      const server: MCPServer = {
        id: nanoid(),
        name: record.name || extracted.name || t('settings.mcp.newServer'),
        description: record.description,
        isActive: false,
        type: extracted.type ?? 'stdio',
        command: extracted.command || '',
        registryUrl: extracted.registryUrl || record.repository,
        args: baseArgs.map(resolveArg),
        env: extracted.env || {},
        provider: record.author,
        searchKey: record.name,
        meta: {
          ...(argsPrompts.length ? { argsPrompts } : {}),
          marketplaceId: record.id
        }
      }

      console.groupCollapsed('[MCP Marketplace] Installing server')
      console.log('command:', server.command, 'args:', server.args)
      console.log('meta.argsPrompts:', server.meta?.argsPrompts)
      console.log('marketplaceConfig:', cfg)
      console.log('installedServer:', server)
      console.groupEnd()

      addMCPServer(server)
      
      // Track installation if user is authenticated
      if (isAuthenticated && record.id) {
        try {
          await apiClient.trackInstall(record.id)
          console.log('Installation tracked successfully for server:', record.id)
          // Refresh server data to update download counts
          await refreshServerData()
        } catch (trackingError) {
          console.warn('Failed to track installation:', trackingError)
          // Don't fail the install if tracking fails
        }
      }
      
      window.toast?.success?.(t('settings.mcp.downloadSuccess'))
    } catch (e: any) {
      window.toast?.error?.(t('common.error') + ': ' + (e?.message || 'Download failed'))
    }
  }

  return (
    <div>
      {currentView === 'details' && selectedServer ? (
        <ServerDetailsPage
          server={selectedServer}
          onBack={() => setCurrentView('marketplace')}
          onInstall={onInstall}
          onEdit={canEdit(selectedServer) ? onEdit : undefined}
        />
      ) : (
        <Tabs
          activeKey={activeTab}
          onChange={setActiveTab}
          items={[
            {
              key: 'browse',
              label: 'Browse Servers',
              children: (
                <div>
                  <Flex justify="space-between" align="center" style={{ marginBottom: 16 }}>
                    <Text strong>Available MCP Servers</Text>
                    <Button
                    type="primary"
                    icon={<Plus size={16} />}
                    onClick={onCreate}
                    disabled={!isAuthenticated}
                  >
                    Add New Server
                  </Button>
                </Flex>

                {serversError && (
                  <Alert
                    type="error"
                    message="Failed to load servers"
                    description={serversError}
                    style={{ marginBottom: 16 }}
                  />
                )}

                {serversLoading ? (
                  <Flex justify="center" align="center" style={{ padding: 40 }}>
                    <Spin size="large" />
                  </Flex>
                ) : (
                  <Space direction="vertical" size="middle" style={{ width: '100%' }}>
                    {servers.map((record) => (
                      <ServerCard
                        key={record.id}
                        server={record}
                        onEdit={onEdit}
                        onDelete={onDelete}
                        onInstall={onInstall}
                        onView={onView}
                        canEdit={canEdit(record)}
                        isOwner={(() => {
                          const uid = (user as any)?.sub || (user as any)?.googleId || (user as any)?.id
                          return Boolean(uid && uid === record.ownerId)
                        })()}
                        showOwnership={true}
                      />
                    ))}
                    {servers.length === 0 && (
                      <Flex justify="center" align="center" style={{ padding: 40 }}>
                        <Text type="secondary">No servers available</Text>
                      </Flex>
                    )}
                  </Space>
                )}
              </div>
            )
          },
          ...(isAuthenticated ? [{
            key: 'my-servers',
            label: `My Servers (${myServers.length})`,
            children: (
              <div>
                <Flex justify="space-between" align="center" style={{ marginBottom: 16 }}>
                  <Text strong>Your MCP Servers</Text>
                  <Button
                    type="primary"
                    icon={<Plus size={16} />}
                    onClick={onCreate}
                  >
                    Add New Server
                  </Button>
                </Flex>

                {myServersError && (
                  <Alert
                    type="error"
                    message="Failed to load your servers"
                    description={myServersError}
                    style={{ marginBottom: 16 }}
                  />
                )}

                {myServersLoading ? (
                  <Flex justify="center" align="center" style={{ padding: 40 }}>
                    <Spin size="large" />
                  </Flex>
                ) : (
                  <Space direction="vertical" size="middle" style={{ width: '100%' }}>
                    {myServers.map((record) => (
                      <ServerCard
                        key={record.id}
                        server={record}
                        onEdit={onEdit}
                        onDelete={onDelete}
                        onInstall={onInstall}
                        onView={onView}
                        canEdit={true}
                        isOwner={true}
                        showOwnership={false}
                      />
                    ))}
                    {myServers.length === 0 && (
                      <Flex justify="center" align="center" style={{ padding: 40 }}>
                        <Text type="secondary">You haven't created any servers yet</Text>
                      </Flex>
                    )}
                  </Space>
                )}
              </div>
            )
          }] : [])
        ]}
      />
      )}

      {/* Enhanced Server Form */}
      <EnhancedServerForm
        open={openEditor}
        server={editing}
        onSubmit={onSubmitEnhanced}
        onCancel={() => {
          setOpenEditor(false)
          setEditing(null)
        }}
        loading={creating || updating}
      />

      {/* Legacy Server Editor Modal (keeping for backward compatibility) */}
      <Modal
        title={editing ? 'Edit Server' : 'Add New Server'}
        open={openEditor}
        onCancel={() => setOpenEditor(false)}
        footer={[
          <Button key="cancel" onClick={() => setOpenEditor(false)}>
            Cancel
          </Button>,
          <Button
            key="submit"
            type="primary"
            loading={creating || updating}
            onClick={onSubmit}
          >
            {editing ? 'Update' : 'Create'}
          </Button>
        ]}
        width={800}
      >
        <Form form={form} layout="vertical">
          <Form.Item
            name="name"
            label="Server Name"
            rules={[{ required: true, message: 'Please enter server name' }]}
          >
            <Input placeholder="e.g., my-awesome-server" />
          </Form.Item>

          <Form.Item name="description" label="Description">
            <Input.TextArea placeholder="Describe what this server does..." rows={3} />
          </Form.Item>

          <Space style={{ width: '100%' }}>
            <Form.Item name="version" label="Version" style={{ flex: 1 }}>
              <Input placeholder="e.g., 1.0.0" />
            </Form.Item>

            <Form.Item name="author" label="Author" style={{ flex: 1 }}>
              <Input placeholder="Your name or organization" />
            </Form.Item>
          </Space>

          <Form.Item
            name="command"
            label="Command"
            rules={[{ required: true, message: 'Please enter command' }]}
          >
            <Input placeholder="e.g., python, node, ./my-server" />
          </Form.Item>

          <Form.Item name="registryUrl" label="Registry URL">
            <Input placeholder="e.g., https://github.com/user/repo" />
          </Form.Item>

          <Form.Item label="Arguments">
            <Form.List name="args">
              {(fields, { add, remove }) => (
                <>
                  {fields.map(({ key, name, ...restField }) => (
                    <Space key={key} style={{ display: 'flex', marginBottom: 8 }}>
                      <Form.Item
                        {...restField}
                        name={[name, 'value']}
                        style={{ flex: 1 }}
                      >
                        <Input placeholder="Argument value" />
                      </Form.Item>
                      <Form.Item
                        {...restField}
                        name={[name, 'label']}
                        style={{ width: 120 }}
                      >
                        <Input placeholder="Label" />
                      </Form.Item>
                      <Form.Item
                        {...restField}
                        name={[name, 'askPath']}
                        valuePropName="checked"
                      >
                        <Checkbox>Path?</Checkbox>
                      </Form.Item>
                      <Button onClick={() => remove(name)} danger>
                        Remove
                      </Button>
                    </Space>
                  ))}
                  <Button type="dashed" onClick={() => add()} block>
                    Add Argument
                  </Button>
                </>
              )}
            </Form.List>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}

// Main component with provider wrapper
const MCPMarketplace = () => {
  return (
    <MarketplaceProvider>
      <AuthenticatedMarketplace />
    </MarketplaceProvider>
  )
}

export default MCPMarketplace

