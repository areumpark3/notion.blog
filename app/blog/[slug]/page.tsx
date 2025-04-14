//app\blog\[slug]\metadata.tsx
import { notFound } from 'next/navigation'
import { NotionAPI } from 'notion-client'
import dynamic from 'next/dynamic'
import { getPosts } from '@/lib/notion-utils'
import { cache } from 'react'

const NotionBlogRenderer = dynamic(
  () => import('@/components/NotionBlogRenderer'),
  { 
    ssr: false,
    loading: () => <div>Loading...</div>
  }
)

const getNotionClient = cache(() => {
  const authToken = process.env.NOTION_TOKEN_V2
  if (!authToken) throw new Error('NOTION_TOKEN_V2 환경 변수 누락')
  return new NotionAPI({ authToken, userTimeZone: 'Asia/Seoul' })
})

export async function generateStaticParams() {
  const posts = await getPosts()
  return posts.map(post => ({ slug: post.slug }))
}

async function getPostData(slug: string) {
  try {
    const posts = await getPosts()
    const post = posts.find(p => p.slug === slug)
    
    if (!post) throw new Error('Post not found')
    
    const notion = getNotionClient()
    const recordMap = await notion.getPage(post.notionPageId)
    
    if (!recordMap?.block?.[post.notionPageId]?.value) {
      throw new Error('Invalid page data')
    }
    
    return { recordMap }
  } catch (error) {
    console.error(`Failed to fetch post: ${slug}`, error)
    return null
  }
}

export default async function BlogPage({ params }: { params: { slug: string } }) {
  const post = await getPostData(params.slug)
  if (!post) return notFound()

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <NotionBlogRenderer recordMap={post.recordMap} />
    </div>
  )
}
