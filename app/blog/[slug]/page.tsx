// app/blog/[slug]/page.tsx
export const runtime = 'edge'

import { notFound } from 'next/navigation'
import { NotionAPI } from 'notion-client'
import NotionBlogRenderer from '@/components/NotionBlogRenderer'

const notion = new NotionAPI({
  authToken: process.env.NOTION_TOKEN_V2,
  userTimeZone: 'Asia/Seoul'
})

async function getPostData(slug: string) {
  try {
    const pageId = slug.startsWith('post-') 
      ? slug.replace('post-', '').replace(/-/g, '')
      : slug

    const recordMap = await notion.getPage(pageId)
    const title = recordMap.block[pageId]?.value?.properties?.title?.[0]?.[0] || 'Untitled'

    return {
      title,
      slug,
      recordMap,
      date: new Date().toISOString().split('T')[0]
    }
  } catch (error) {
    console.error('Failed to fetch post:', error)
    return null
  }
}

export default async function BlogPage({ params }: { params: { slug: string } }) {
  const post = await getPostData(params.slug)
  if (!post) return notFound()

  return <NotionBlogRenderer recordMap={post.recordMap} />
}
