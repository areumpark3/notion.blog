import { Client } from '@notionhq/client';
import type { 
  ListBlockChildrenResponse, 
  QueryDatabaseResponse,
  PageObjectResponse,
  PartialPageObjectResponse,
  PartialDatabaseObjectResponse,
  DatabaseObjectResponse
} from '@notionhq/client/build/src/api-endpoints';

// 일관된 환경 변수 사용
const NOTION_TOKEN = process.env.NOTION_API_KEY || process.env.NOTION_TOKEN;
const NOTION_DATABASE_ID = process.env.NOTION_DATABASE_ID;

// 토큰 존재 확인 및 오류 로깅
if (!NOTION_TOKEN) {
  console.warn('NOTION_API_KEY 또는 NOTION_TOKEN 환경 변수가 설정되지 않았습니다.');
}

if (!NOTION_DATABASE_ID) {
  console.warn('NOTION_DATABASE_ID 환경 변수가 설정되지 않았습니다.');
}

// 토큰으로 Notion 클라이언트 초기화
const notion = new Client({ auth: NOTION_TOKEN });

// 블록 가져오기 함수 (기존 코드 유지)
export async function fetchAllBlocks(blockId: string): Promise<ListBlockChildrenResponse['results']> {
  let blocks: ListBlockChildrenResponse['results'] = [];
  let cursor: string | null = null;

  while (true) {
    try {
      const response = await notion.blocks.children.list({
        block_id: blockId,
        start_cursor: cursor ?? undefined,
      });

      blocks.push(...response.results);

      if (!response.has_more) break;

      cursor = response.next_cursor;
    } catch (error) {
      console.error(`Error fetching blocks for block ID ${blockId}:`, error);
      break;
    }
  }

  return blocks;
}

// 게시물을 위한 타입 정의
export interface Post {
  id: string;
  slug: string;
  title: string;
  date: string;
  description?: string;
  notionPageId: string;
}

// 페이지 객체인지 확인하는 타입 가드
function isPageObject(obj: any): obj is PageObjectResponse {
  return obj && 'properties' in obj && 'parent' in obj;
}

// 안전한 속성 추출 헬퍼 함수
function getTextFromProperty(property: any, defaultValue: string = ''): string {
  if (!property) return defaultValue;
  
  // 타입에 따라 텍스트 추출
  switch (property.type) {
    case 'title':
      return property.title?.[0]?.plain_text || defaultValue;
    case 'rich_text':
      return property.rich_text?.[0]?.plain_text || defaultValue;
    case 'text':
      return property.text?.[0]?.plain_text || defaultValue;
    default:
      return defaultValue;
  }
}

// 날짜 속성 추출 헬퍼 함수
function getDateFromProperty(property: any, defaultValue: string = new Date().toISOString().split('T')[0]): string {
  if (!property) return defaultValue;
  
  if (property.type === 'date' && property.date?.start) {
    return property.date.start;
  }
  
  return defaultValue;
}

// 데이터베이스에서 게시물 가져오기 함수 (실제 구현)
export async function getPosts(): Promise<Post[]> {
  try {
    console.log('노션 API 호출 시작');
    console.log('데이터베이스 ID:', NOTION_DATABASE_ID);
    console.log('API 토큰 존재 여부:', !!NOTION_TOKEN);
    
    if (!NOTION_DATABASE_ID || !NOTION_TOKEN) {
      throw new Error('필수 환경 변수가 설정되지 않았습니다.');
    }

    // 실제 Notion 데이터베이스 쿼리 구현
    const response = await notion.databases.query({
      database_id: NOTION_DATABASE_ID,
      // Published 속성 필터 제거
      
      // 정렬 시도 - 실패하면 아래 catch 블록에서 처리
      sorts: [
        {
          property: 'Date',
          direction: 'descending'
        }
      ]
    }).catch(error => {
      console.warn('정렬 옵션으로 쿼리 실패, 정렬 없이 재시도:', error.message);
      // 정렬 옵션 없이 재시도
      return notion.databases.query({
        database_id: NOTION_DATABASE_ID
      });
    });

    // 데이터베이스 스키마 로깅 (디버깅용)
    if (response.results.length > 0) {
      const firstResult = response.results[0];
      
      if (isPageObject(firstResult)) {
        console.log('데이터베이스 속성:', Object.keys(firstResult.properties).join(', '));
        
        // 디버깅: 각 속성 타입 출력
        Object.entries(firstResult.properties).forEach(([key, value]) => {
          console.log(`속성명: ${key}, 타입: ${value.type}`);
        });
      } else {
        console.log('결과는 있지만 페이지 객체가 아닙니다:', typeof firstResult);
      }
    } else {
      console.log('데이터베이스 결과가 비어 있습니다');
    }

    // 응답 데이터를 Post 형식으로 변환 - 타입 가드 적용
    const posts = response.results
      .filter(obj => isPageObject(obj)) // 페이지 객체만 필터링
      .map((page) => {
        // any로 타입 단언 - 이미 위에서 필터링했으므로 안전함
        const pageObj = page as PageObjectResponse;
        
        // 페이지 ID
        const id = pageObj.id;
        
        // 유연한 속성 접근
        const properties = pageObj.properties;
        
        // 제목 찾기 (Title, Name, 제목 등 여러 이름 시도)
        const titleProperty = 
          properties.Title || 
          properties.Name || 
          properties.제목 || 
          properties.title || 
          properties.name || 
          null;
        
        const title = getTextFromProperty(titleProperty, '제목 없음');
        
        // 날짜 찾기 (Date, Created, 날짜 등 여러 이름 시도)
        const dateProperty = 
          properties.Date || 
          properties.Created || 
          properties.날짜 || 
          properties.created || 
          properties.date || 
          null;
        
        const date = getDateFromProperty(dateProperty);
        
        // 설명 찾기 (Description, Summary, 설명 등 여러 이름 시도)
        const descriptionProperty = 
          properties.Description || 
          properties.Summary || 
          properties.설명 || 
          properties.description || 
          properties.summary || 
          null;
        
        const description = getTextFromProperty(descriptionProperty, '');
        
        // 슬러그 찾기 (Slug, URL, 슬러그 등 여러 이름 시도)
        const slugProperty = 
          properties.Slug || 
          properties.URL || 
          properties.슬러그 || 
          properties.slug || 
          properties.url || 
          null;
        
        const slug = getTextFromProperty(slugProperty, `post-${id.replace(/-/g, '')}`);
        
        return {
          id,
          slug,
          title,
          date,
          description,
          notionPageId: id
        };
      });
    
    console.log('노션 API 호출 성공, 결과:', posts.length);
    return posts;
  } catch (error) {
    console.error('노션 API 호출 실패:', error);
    
    // 개발 환경에서는 에러를 던져서 디버깅하기 쉽게
    if (process.env.NODE_ENV === 'development') {
      throw error;
    }
    
    // 프로덕션에서는 빈 배열 반환
    return [];
  }
}
