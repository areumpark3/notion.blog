import { notFound } from 'next/navigation'
import { NotionAPI } from 'notion-client'
import dynamic from 'next/dynamic'
import { getPosts } from '@/lib/notion-utils'

const NotionBlogRenderer = dynamic(
  () => import('@/components/NotionBlogRenderer'),
  { 
    ssr: false,
    loading: () => <div>Loading...</div>
  }
)

const notion = new NotionAPI({
  authToken: process.env.NOTION_TOKEN_V2,
  userTimeZone: 'Asia/Seoul'
})

export async function generateStaticParams() {
  try {
    const posts = await getPosts()
    return posts.map(post => ({
      slug: post.slug,
    }))
  } catch (error) {
    console.error('Static params generation failed:', error)
    return []
  }
}

async function getPostData(slug: string) {
  try {
    const pageId = slug.replace(/^post-/, '').replace(/-/g, '')
    const recordMap = await notion.getPage(pageId)
    if (!recordMap?.block?.[pageId]?.value) {
      throw new Error('Invalid page data')
    }
    return { recordMap }
  } catch (error) {
    console.error('Failed to fetch post:', error)
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

