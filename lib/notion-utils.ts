// lib/notion-utils.ts
import { Client } from '@notionhq/client'
import type { 
  QueryDatabaseResponse,
  PageObjectResponse,
  DatePropertyItemObjectResponse
} from '@notionhq/client/build/src/api-endpoints'

export interface Post {
  id: string
  slug: string
  title: string
  date: string
  notionPageId: string
}

const NOTION_API_KEY = process.env.NOTION_API_KEY!
const NOTION_DATABASE_ID = process.env.NOTION_DATABASE_ID!

if (!NOTION_API_KEY || !NOTION_DATABASE_ID) {
  throw new Error('필수 환경 변수가 설정되지 않았습니다.')
}

const notion = new Client({ auth: NOTION_API_KEY })

function isPageObject(obj: any): obj is PageObjectResponse {
  return obj && 'properties' in obj && 'parent' in obj
}

// 텍스트 속성 추출 함수
const getTextFromProperty = (property: any): string => {
  if (!property) return ''
  if (property.type === 'title') return property.title[0]?.plain_text || ''
  if (property.type === 'rich_text') return property.rich_text[0]?.plain_text || ''
  return ''
}

// 날짜 속성 추출 함수
const getDateFromProperty = (property: any): string => {
  if (property?.type === 'date') {
    const dateProp = property as DatePropertyItemObjectResponse
    return dateProp.date?.start || new Date().toISOString()
  }
  return new Date().toISOString()
}

export async function getPosts(): Promise<Post[]> {
  try {
    const response = await notion.databases.query({
      database_id: NOTION_DATABASE_ID,
      filter: {
        property: 'Status',
        select: { equals: '발행됨' }
      },
      sorts: [{ property: 'Date', direction: 'descending' }]
    })

    return response.results
      .filter(isPageObject)
      .map(page => ({
        id: page.id,
        slug: getTextFromProperty(page.properties.Slug) || page.id,
        title: getTextFromProperty(page.properties.Title) || '제목 없음',
        date: getDateFromProperty(page.properties.Date),
        notionPageId: page.id
      }))
  } catch (error) {
    console.error('노션 API 호출 실패:', error)
    return []
  }
}
