'use client'

import { useState } from 'react'
import { Form, Input, Button, Upload, message } from 'antd'
import type { GetProp, UploadFile, UploadProps } from 'antd'
import { Container } from '@web/components/Container'
import PanoramicViewer from '@web/components/ui/PanoramicViewer/PanoramicViewer'

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:4000'

export default function UploadPage() {
  const [form] = Form.useForm()
  const [uploading, setUploading] = useState(false)

  const [previewImage, setPreviewImage] = useState('')

  type FileType = Parameters<GetProp<UploadProps, 'beforeUpload'>>[0]

  const beforeUpload = async (file: File) => {
    const reader = new FileReader()

    reader.onload = () => {
      setPreviewImage(reader.result as string)
    }

    reader.readAsDataURL(file)
    // prevent auto upload
    return false
  }

  const handleChange = info => {
    console.log('info', info)
  }

  const handleUpload = async (options: any) => {
    const { file, onSuccess, onError } = options

    try {
      const formData = new FormData()
      formData.append('file', file as Blob)
      formData.append('name', form.getFieldValue('name') || '')
      formData.append('description', form.getFieldValue('description') || '')
      formData.append('tags', form.getFieldValue('tags') || '')

      setUploading(true)

      const res = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      })

      const result = await res.json()

      if (res.ok) {
        message.success('Upload successful')
        onSuccess?.(result, new XMLHttpRequest())
        form.resetFields()
      } else {
        message.error(result.error || 'Upload failed')
        onError?.(new Error(result.error || 'Upload failed'))
      }
    } catch (err) {
      message.error('Unexpected error')
      onError?.(err as Error)
    } finally {
      setUploading(false)
    }
  }

  return (
    <>
      {previewImage && <PanoramicViewer imgSrc={previewImage} />}
      <div className="w-full p-4 max-w-2xl mx-auto">
        <Upload
          action={`http://localhost:4000/api/uploads`}
          accept="image/*"
          maxCount={1}
          showUploadList={false}
          onChange={handleChange}
          beforeUpload={beforeUpload}
          className="w-full flex flex-col items-center justify-center"
        >
          <div className="bg-gray-100 cursor-pointer flex flex-col items-center justify-center max-w-screen w-xl h-64 border border-dashed rounded-lg p-4 mb-8 border-gray-500">
            <p>Click or drag file to this area to upload</p>
          </div>
        </Upload>

        <Form form={form} layout="vertical">
          <Form.Item label="Name" name="name" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item label="Description" name="description">
            <Input.TextArea rows={3} />
          </Form.Item>
          <Form.Item label="Tags (comma separated)" name="tags">
            <Input />
          </Form.Item>
        </Form>
      </div>
    </>
  )
}
