// components/NotionBlogRenderer.tsx
'use client'
import { NotionRenderer } from 'react-notion-x'
import type { ExtendedRecordMap, FileBlock } from 'notion-types'
import dynamic from 'next/dynamic'

const Code = dynamic(
  () => import('react-notion-x/build/third-party/code').then((m) => m.Code),
  { ssr: false }
)

const Collection = dynamic(
  () => import('react-notion-x/build/third-party/collection').then((m) => m.Collection),
  { ssr: false }
)

interface NotionBlogRendererProps {
  recordMap: ExtendedRecordMap
}

export default function NotionBlogRenderer({ recordMap }: NotionBlogRendererProps) {
  const FileComponent = ({ block }: { block: FileBlock }) => {
    const fileUrl = block.properties?.source?.[0]?.[0] || ''
    const fileName = block.properties?.title?.[0]?.[0] || '파일'

    return (
      <div className="notion-file">
        <a
          href={fileUrl}
          download
          target="_blank"
          rel="noopener noreferrer"
          className="text-blue-600 hover:underline"
        >
          📎 {fileName}
        </a>
      </div>
    )
  }

  return (
    <NotionRenderer
      recordMap={recordMap}
      components={{
        Code,
        Collection,
        File: FileComponent
      }}
      fullPage
      darkMode={false}
    />
  )
}
