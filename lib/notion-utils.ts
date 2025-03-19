// lib/notion-utils.ts
import { Client } from '@notionhq/client';
import type { ListBlockChildrenResponse, QueryDatabaseResponse } from '@notionhq/client/build/src/api-endpoints';

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
  // 필요한 다른 필드 추가
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
      filter: {
        property: 'Published',
        checkbox: {
          equals: true
        }
      },
      sorts: [
        {
          property: 'Date',
          direction: 'descending'
        }
      ]
    });

    // 응답 데이터를 Post 형식으로 변환
    const posts = response.results.map((page: any) => {
      // 페이지 ID
      const id = page.id;
      
      // 제목 속성 추출 (이름이 'Name' 또는 'Title'일 수 있음)
      const titleProperty = page.properties.Name || page.properties.Title;
      const title = titleProperty?.title?.[0]?.plain_text || '제목 없음';
      
      // 날짜 속성 추출
      const dateProperty = page.properties.Date;
      const date = dateProperty?.date?.start || new Date().toISOString().split('T')[0];
      
      // 설명 속성 추출
      const descriptionProperty = page.properties.Description;
      const description = descriptionProperty?.rich_text?.[0]?.plain_text || '';
      
      // 슬러그 생성 (제목 기반 또는 별도 속성이 있는 경우)
      const slugProperty = page.properties.Slug;
      const slug = slugProperty?.rich_text?.[0]?.plain_text || 
                  `post-${id.replace(/-/g, '')}`;
      
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
