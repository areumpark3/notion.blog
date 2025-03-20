//lib\notion-utils.ts

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

// 데이터베이스 속성 찾기 함수
async function getDatabaseProperties() {
  try {
    const db = await notion.databases.retrieve({
      database_id: NOTION_DATABASE_ID!
    });
    
    // 상태 속성 찾기 (다양한 이름 시도)
    const statusProp = Object.entries(db.properties).find(
      ([key, prop]) => prop.type === 'select' && 
      ['status', 'state', '상태'].includes(key.toLowerCase())
    );
    
    return {
      statusPropName: statusProp ? statusProp[0] : null,
      properties: db.properties
    };
  } catch (error) {
    console.error("데이터베이스 속성 가져오기 실패:", error);
    return { statusPropName: null, properties: {} };
  }
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

    // 데이터베이스 속성 먼저 확인
    const { statusPropName, properties } = await getDatabaseProperties();
    
    if (properties) {
      console.log('데이터베이스 속성:', Object.keys(properties).join(', '));
      
      // 디버깅: 각 속성 타입 출력
      Object.entries(properties).forEach(([key, value]) => {
        console.log(`속성명: ${key}, 타입: ${value.type}`);
      });
    }

    // 쿼리 옵션 설정
    let queryOptions: any = {
      database_id: NOTION_DATABASE_ID
    };
    
    // 상태 속성이 있으면 필터 추가
    if (statusPropName) {
      console.log(`상태 속성 사용: ${statusPropName}`);
      
      // '발행됨' 또는 'Published' 상태만 필터링
      queryOptions.filter = {
        property: statusPropName,
        select: {
          equals: '발행됨'
        }
      };
      
      // 상태 속성 값이 영문일 수 있으므로 영문 상태값 시도
      let response = await notion.databases.query(queryOptions);
      
      if (response.results.length === 0) {
        console.log("'발행됨' 상태로 게시물을 찾지 못함, 'Published' 상태로 시도합니다.");
        queryOptions.filter.select.equals = 'Published';
        
        response = await notion.databases.query(queryOptions);
      }
      
      if (response.results.length === 0) {
        console.log("상태 필터링으로 게시물을 찾지 못했습니다. 모든 게시물 반환 대신 빈 배열을 반환합니다.");
        return [];
      }
      
      // 정렬 시도
      try {
        queryOptions.sorts = [
          {
            property: 'Date',
            direction: 'descending'
          }
        ];
        
        response = await notion.databases.query(queryOptions);
      } catch (sortError) {
        // unknown 타입에 대한 타입 단언 추가
        console.warn('정렬 옵션 오류, 정렬 없이 계속:', 
          sortError instanceof Error ? sortError.message : String(sortError));
        // 정렬 실패 시 이미 가져온 결과 사용
      }
      
      // 응답 데이터를 Post 형식으로 변환 - 타입 가드 적용
      const posts = response.results
        .filter(obj => isPageObject(obj)) // 페이지 객체만 필터링
        .map((page) => {
          // 페이지 객체로 타입 변환
          const pageObj = page as PageObjectResponse;
          
          // 페이지 ID
          const id = pageObj.id;
          
          // 유연한 속성 접근
          const pageProperties = pageObj.properties;
          
          // 제목 찾기 (Title, Name, 제목 등 여러 이름 시도)
          const titleProperty = 
            pageProperties.Title || 
            pageProperties.Name || 
            pageProperties.제목 || 
            pageProperties.title || 
            pageProperties.name || 
            null;
          
          const title = getTextFromProperty(titleProperty, '제목 없음');
          
          // 날짜 찾기 (Date, Created, 날짜 등 여러 이름 시도)
          const dateProperty = 
            pageProperties.Date || 
            pageProperties.Created || 
            pageProperties.날짜 || 
            pageProperties.created || 
            pageProperties.date || 
            null;
          
          const date = getDateFromProperty(dateProperty);
          
          // 설명 찾기 (Description, Summary, 설명 등 여러 이름 시도)
          const descriptionProperty = 
            pageProperties.Description || 
            pageProperties.Summary || 
            pageProperties.설명 || 
            pageProperties.description || 
            pageProperties.summary || 
            null;
          
          const description = getTextFromProperty(descriptionProperty, '');
          
          // 슬러그 찾기 (Slug, URL, 슬러그 등 여러 이름 시도)
          const slugProperty = 
            pageProperties.Slug || 
            pageProperties.URL || 
            pageProperties.슬러그 || 
            pageProperties.slug || 
            pageProperties.url || 
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
    } else {
      console.log('상태 속성을 찾을 수 없습니다. 동기화된 로컬 데이터를 사용하세요.');
      return [];
    }
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
