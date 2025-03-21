import { notFound } from 'next/navigation'
import { NotionAPI } from 'notion-client'
import dynamic from 'next/dynamic'
import { getPosts } from '@/lib/notion-utils'

// 동적 임포트로 클라이언트 측 전환
const NotionBlogRenderer = dynamic(
  () => import('@/components/NotionBlogRenderer'),
  { 
    ssr: false,
    loading: () => <div className="text-center py-8">로딩 중...</div>
  }
)

const notion = new NotionAPI({
  authToken: process.env.NOTION_TOKEN_V2,
  userTimeZone: 'Asia/Seoul'
})

// 정적 생성 강화
export async function generateStaticParams() {
  try {
    const posts = await getPosts()
    return posts.map(post => ({ 
      slug: post.slug,
      // 하위 페이지 ID 디코딩 문제 방지
      ...(post.notionPageId && { id: post.notionPageId })
    }))
  } catch (error) {
    console.error('정적 페이지 생성 실패:', error)
    return []
  }
}

// 데이터 가져오기 최적화
async function getPostData(slug: string) {
  try {
    const pageId = slug.replace(/^post-/, '').replace(/-/g, '')
    const recordMap = await notion.getPage(pageId)
    
    // 레코드맵 유효성 검사
    if (!recordMap?.block?.[pageId]?.value) {
      throw new Error('유효하지 않은 페이지 데이터')
    }
    
    return { recordMap }
  } catch (error) {
    console.error('게시물 가져오기 실패:', error)
    return null
  }
}

export default async function BlogPage({ params }: { params: { slug: string } }) {
  const post = await getPostData(params.slug)
  if (!post) return notFound()

  return (
    <article className="max-w-3xl mx-auto px-4">
      <NotionBlogRenderer recordMap={post.recordMap} />
    </article>
  )
}
