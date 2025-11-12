import React, { useEffect } from 'react'
import {
  Modal,
  Form,
  Input,
  Button,
  Select,
  Card,
  Row,
  Col,
  Space
} from 'antd'
import type { MarketplaceServer } from '@shared/types/marketplace'

const { TextArea } = Input
const { Option } = Select

interface EnhancedServerFormProps {
  open: boolean
  server?: MarketplaceServer | null
  onSubmit: (data: any) => Promise<void>
  onCancel: () => void
  loading?: boolean
}

const SERVER_CATEGORIES = [
  { value: 'AI Assistant', label: 'AI Assistant' },
  { value: 'Database', label: 'Database' },
  { value: 'File System', label: 'File System' },
  { value: 'Web API', label: 'Web API' },
  { value: 'Development', label: 'Development' },
  { value: 'Productivity', label: 'Productivity' },
  { value: 'Communication', label: 'Communication' },
  { value: 'Media', label: 'Media' },
  { value: 'Utilities', label: 'Utilities' },
  { value: 'Other', label: 'Other' }
]

export const EnhancedServerForm: React.FC<EnhancedServerFormProps> = ({
  open,
  server,
  onSubmit,
  onCancel,
  loading = false
}) => {
  const [form] = Form.useForm()

  const isEditing = !!server

  useEffect(() => {
    if (open) {
      if (isEditing && server) {
        // Populate form with existing server data
        form.setFieldsValue({
          name: server.name,
          description: server.description || '',
          version: server.version || '',
          author: server.author || '',
          category: server.category || '',
          instructions: server.instructions || '',
          website: server.website || '',
          supportEmail: server.supportEmail || '',
          repository: server.repository || '',
          videoUrl: server.videoUrl || '',
          developerName: server.developerInfo?.name || '',
          developerEmail: server.developerInfo?.email || '',
          developerWebsite: server.developerInfo?.website || '',
          developerCompany: server.developerInfo?.company || '',
          configCommand: server.config?.command || '',
          configArgs: Array.isArray(server.config?.args) ? server.config.args.join(' ') : '',
          configEnv: server.config?.env ? Object.entries(server.config.env).map(([key, value]) => `${key}=${value}`).join('\\n') : ''
        })
      } else {
        // Reset form for new server
        form.resetFields()
      }
    }
  }, [open, server, isEditing, form])


  const handleSubmit = async (values: any) => {
    try {
      // Parse configuration
      const args = values.configArgs ? values.configArgs.split(' ').filter(Boolean) : []
      const env: Record<string, string> = {}
      
      if (values.configEnv) {
        values.configEnv.split('\\n').forEach((line: string) => {
          const [key, ...valueParts] = line.split('=')
          if (key && valueParts.length > 0) {
            env[key.trim()] = valueParts.join('=').trim()
          }
        })
      }

      const serverData = {
        name: values.name,
        description: values.description,
        version: values.version,
        author: values.author,
        category: values.category,
        instructions: values.instructions,
        website: values.website,
        supportEmail: values.supportEmail,
        repository: values.repository,
        videoUrl: values.videoUrl,
        developerInfo: {
          name: values.developerName,
          email: values.developerEmail,
          website: values.developerWebsite,
          company: values.developerCompany
        },
        config: {
          command: values.configCommand,
          args,
          env: Object.keys(env).length > 0 ? env : undefined
        }
      }

      await onSubmit(serverData)
    } catch (error) {
      console.error('Form submission error:', error)
    }
  }


  return (
    <Modal
      title={isEditing ? 'Edit MCP Server' : 'Add New MCP Server'}
      open={open}
      onCancel={onCancel}
      footer={null}
      width={800}
      style={{ top: 20 }}
      destroyOnClose
    >
      <Form
        form={form}
        layout="vertical"
        onFinish={handleSubmit}
        autoComplete="off"
      >
        {/* Basic Information */}
        <Card title="Basic Information" size="small" style={{ marginBottom: 16 }}>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                label="Server Name"
                name="name"
                rules={[{ required: true, message: 'Please enter server name' }]}
              >
                <Input placeholder="e.g., File System Server" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                label="Version"
                name="version"
              >
                <Input placeholder="e.g., 1.0.0" />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item
            label="Short Description"
            name="description"
            rules={[{ required: true, message: 'Please enter a description' }]}
          >
            <Input placeholder="Brief description of what this server does" />
          </Form.Item>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                label="Category"
                name="category"
                rules={[{ required: true, message: 'Please select a category' }]}
              >
                <Select placeholder="Select category">
                  {SERVER_CATEGORIES.map(cat => (
                    <Option key={cat.value} value={cat.value}>
                      {cat.label}
                    </Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                label="Author"
                name="author"
              >
                <Input placeholder="Author name" />
              </Form.Item>
            </Col>
          </Row>
        </Card>

        {/* Demo Video */}
        <Card title="Demo Video" size="small" style={{ marginBottom: 16 }}>
          <Form.Item
            label="Demo Video URL"
            name="videoUrl"
            help="YouTube, Vimeo, or other embeddable video URL"
          >
            <Input placeholder="https://youtube.com/embed/..." />
          </Form.Item>
        </Card>

        {/* Detailed Information */}
        <Card title="Detailed Information" size="small" style={{ marginBottom: 16 }}>
          <Form.Item
            label="Instructions"
            name="instructions"
            help="Detailed description and usage instructions"
          >
            <TextArea 
              rows={4} 
              placeholder="Provide detailed instructions on how to use this server, its features, and any setup requirements..."
            />
          </Form.Item>
        </Card>

        {/* Developer Information */}
        <Card title="Developer Information" size="small" style={{ marginBottom: 16 }}>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                label="Developer Name"
                name="developerName"
                rules={[{ required: true, message: 'Please enter developer name' }]}
              >
                <Input placeholder="Your name or organization" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                label="Company"
                name="developerCompany"
              >
                <Input placeholder="Company/Organization name" />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                label="Contact Email"
                name="developerEmail"
                rules={[{ type: 'email', message: 'Please enter a valid email' }]}
              >
                <Input placeholder="developer@example.com" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                label="Website"
                name="developerWebsite"
                rules={[{ type: 'url', message: 'Please enter a valid URL' }]}
              >
                <Input placeholder="https://developer-website.com" />
              </Form.Item>
            </Col>
          </Row>
        </Card>

        {/* Support & Links */}
        <Card title="Support & Links" size="small" style={{ marginBottom: 16 }}>
          <Row gutter={16}>
            <Col span={8}>
              <Form.Item
                label="Official Website"
                name="website"
                rules={[{ type: 'url', message: 'Please enter a valid URL' }]}
              >
                <Input placeholder="https://your-server.com" />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item
                label="Support Email"
                name="supportEmail"
                rules={[{ type: 'email', message: 'Please enter a valid email' }]}
              >
                <Input placeholder="support@example.com" />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item
                label="Repository"
                name="repository"
                rules={[{ type: 'url', message: 'Please enter a valid URL' }]}
              >
                <Input placeholder="https://github.com/user/repo" />
              </Form.Item>
            </Col>
          </Row>
        </Card>

        {/* Technical Configuration */}
        <Card title="Technical Configuration" size="small" style={{ marginBottom: 16 }}>
          <Form.Item
            label="Command"
            name="configCommand"
            rules={[{ required: true, message: 'Please enter the command' }]}
            help="The executable command to run the server"
          >
            <Input placeholder="e.g., node, python, ./server" />
          </Form.Item>

          <Form.Item
            label="Arguments"
            name="configArgs"
            help="Space-separated command line arguments"
          >
            <Input placeholder="e.g., index.js --port 3000" />
          </Form.Item>

          <Form.Item
            label="Environment Variables"
            name="configEnv"
            help="One variable per line, format: KEY=value"
          >
            <TextArea 
              rows={3} 
              placeholder="PORT=3000&#10;DEBUG=true&#10;API_KEY=your_key"
            />
          </Form.Item>
        </Card>

        {/* Form Actions */}
        <div style={{ textAlign: 'right', borderTop: '1px solid #f0f0f0', paddingTop: 16 }}>
          <Space>
            <Button onClick={onCancel}>
              Cancel
            </Button>
            <Button type="primary" htmlType="submit" loading={loading}>
              {isEditing ? 'Update Server' : 'Create Server'}
            </Button>
          </Space>
        </div>
      </Form>
    </Modal>
  )
}

