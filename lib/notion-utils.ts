// lib/notion-utils.ts
import { Client } from '@notionhq/client'
import type { 
  QueryDatabaseResponse,
  PageObjectResponse
} from '@notionhq/client/build/src/api-endpoints'

const NOTION_API_KEY = process.env.NOTION_API_KEY!
const NOTION_DATABASE_ID = process.env.NOTION_DATABASE_ID!

if (!NOTION_API_KEY || !NOTION_DATABASE_ID) {
  throw new Error('필수 환경 변수가 설정되지 않았습니다.')
}

const notion = new Client({ auth: NOTION_API_KEY })

function isPageObject(obj: any): obj is PageObjectResponse {
  return obj && 'properties' in obj && 'parent' in obj
}

// 타입 안전한 속성 접근 함수
const getRichText = (property: any): string => {
  return property?.type === 'rich_text' 
    ? property.rich_text[0]?.plain_text || ''
    : ''
}

const getTitle = (property: any): string => {
  return property?.type === 'title' 
    ? property.title[0]?.plain_text || ''
    : getRichText(property) // rich_text 대체 처리
}

export async function getPosts() {
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
      .map(page => {
        // 안전한 속성 접근
        const titleProperty = page.properties.Title || page.properties.title
        const slugProperty = page.properties.Slug || page.properties.slug
        const dateProperty = page.properties.Date || page.properties.date

        return {
          id: page.id,
          slug: slugProperty ? getRichText(slugProperty) : page.id,
          title: getTitle(titleProperty) || '제목 없음',
          date: dateProperty?.type === 'date' 
            ? dateProperty.date?.start 
            : new Date().toISOString(),
          notionPageId: page.id
        }
      })
  } catch (error) {
    console.error('노션 API 호출 실패:', error)
    return []
  }
}
