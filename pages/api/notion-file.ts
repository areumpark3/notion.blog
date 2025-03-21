import { NextRequest } from 'next/server'
import { NotionAPI } from 'notion-client'

export const runtime = 'edge'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const fileId = searchParams.get('fileId')
  const pageId = searchParams.get('pageId')

  if (!fileId || !pageId) {
    return new Response(JSON.stringify({ error: '파라미터 누락' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    })
  }

  try {
    const notionToken = process.env.NOTION_TOKEN_V2
    if (!notionToken) throw new Error('NOTION_TOKEN_V2 환경 변수 없음')

    const notion = new NotionAPI({
      authToken: notionToken,
      userTimeZone: 'Asia/Seoul'
    })

    const recordMap = await notion.getPage(pageId)
    const fileUrl = recordMap.signed_urls?.[fileId] 
      || Object.values(recordMap.block).find(b => b.value.id === fileId)?.value.properties?.source?.[0]?.[0]

    if (!fileUrl) throw new Error('파일 URL 없음')

    const response = await fetch(fileUrl)
    return new Response(response.body, {
      headers: {
        'Content-Type': response.headers.get('Content-Type') || 'application/octet-stream',
        'Content-Disposition': `attachment; filename="${fileId}"`
      }
    })
  } catch (error) {
    console.error('파일 API 오류:', error)
    return new Response(JSON.stringify({ 
      error: '내부 서버 오류',
      message: error instanceof Error ? error.message : 'Unknown error'
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    })
  }
}
