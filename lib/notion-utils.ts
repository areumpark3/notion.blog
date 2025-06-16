// lib/notion-utils.ts
import { Client } from '@notionhq/client';

const notion = new Client({
  auth: process.env.NOTION_API_KEY,
});

export interface Post {
  id: string;
  title: string;
  slug: string;
  date: string;
  content?: string;
  status?: string;
}

// 제목 추출 함수
export function extractTitle(properties: any): string {
  try {
    // 직접적인 Title 속성 확인
    if (properties.Title?.title?.[0]?.plain_text) {
      return properties.Title.title[0].plain_text;
    }
    
    // type이 'title'인 속성 찾기
    for (const [key, prop] of Object.entries(properties)) {
      const property = prop as any;
      if (property.type === 'title' && property.title?.[0]?.plain_text) {
        return property.title[0].plain_text;
      }
    }
    
    // Name 속성 확인 (대안)
    if (properties.Name?.title?.[0]?.plain_text) {
      return properties.Name.title[0].plain_text;
    }
    
    console.warn('제목을 찾을 수 없습니다:', Object.keys(properties));
    return '제목 없음';
  } catch (error) {
    console.error('제목 추출 중 오류:', error);
    return '제목 없음';
  }
}

// 슬러그 추출 함수
export function extractSlug(properties: any): string {
  try {
    if (properties.Slug?.rich_text?.[0]?.plain_text) {
      return properties.Slug.rich_text[0].plain_text;
    }
    
    // 제목에서 슬러그 생성
    const title = extractTitle(properties);
    if (title === '제목 없음') {
      return `post-${Date.now()}`;
    }
    
    return title
      .toLowerCase()
      .replace(/[^a-z0-9가-힣\s]/g, '')
      .replace(/\s+/g, '-')
      .trim();
  } catch (error) {
    console.error('슬러그 추출 중 오류:', error);
    return `post-${Date.now()}`;
  }
}

// 슬러그 생성 함수 (generateSlug 별칭)
export function generateSlug(properties: any): string {
  return extractSlug(properties);
}

// 상태 추출 함수
export function extractStatus(properties: any): string {
  try {
    if (properties.Status?.select?.name) {
      return properties.Status.select.name;
    }
    return 'Draft';
  } catch (error) {
    console.error('상태 추출 중 오류:', error);
    return 'Draft';
  }
}

// 날짜 추출 함수
export function extractDate(properties: any): string {
  try {
    if (properties.Date?.date?.start) {
      return properties.Date.date.start;
    }
    
    return new Date().toISOString().split('T')[0];
  } catch (error) {
    console.error('날짜 추출 중 오류:', error);
    return new Date().toISOString().split('T')[0];
  }
}

// 페이지 내용 가져오기 함수
export async function getPageContent(pageId: string): Promise<string> {
  try {
    const response = await notion.blocks.children.list({
      block_id: pageId,
    });
    
    let content = '';
    
    for (const block of response.results) {
      content += await parseBlock(block as any);
    }
    
    return content;
  } catch (error) {
    console.error('페이지 내용 가져오기 실패:', error);
    return '';
  }
}

// 블록 파싱 함수
async function parseBlock(block: any): Promise<string> {
  let content = '';
  
  switch (block.type) {
    case 'paragraph':
      if (block.paragraph.rich_text.length > 0) {
        content = block.paragraph.rich_text
          .map((text: any) => text.plain_text)
          .join('') + '\n\n';
      }
      break;
      
    case 'heading_1':
      if (block.heading_1.rich_text.length > 0) {
        content = '# ' + block.heading_1.rich_text
          .map((text: any) => text.plain_text)
          .join('') + '\n\n';
      }
      break;
      
    case 'heading_2':
      if (block.heading_2.rich_text.length > 0) {
        content = '## ' + block.heading_2.rich_text
          .map((text: any) => text.plain_text)
          .join('') + '\n\n';
      }
      break;
      
    case 'heading_3':
      if (block.heading_3.rich_text.length > 0) {
        content = '### ' + block.heading_3.rich_text
          .map((text: any) => text.plain_text)
          .join('') + '\n\n';
      }
      break;
      
    case 'bulleted_list_item':
      if (block.bulleted_list_item.rich_text.length > 0) {
        content = '- ' + block.bulleted_list_item.rich_text
          .map((text: any) => text.plain_text)
          .join('') + '\n';
      }
      break;
      
    case 'numbered_list_item':
      if (block.numbered_list_item.rich_text.length > 0) {
        content = '1. ' + block.numbered_list_item.rich_text
          .map((text: any) => text.plain_text)
          .join('') + '\n';
      }
      break;
      
    case 'code':
      if (block.code.rich_text.length > 0) {
        const code = block.code.rich_text
          .map((text: any) => text.plain_text)
          .join('');
        content = '``````\n\n';
      }
      break;
      
    case 'quote':
      if (block.quote.rich_text.length > 0) {
        content = '> ' + block.quote.rich_text
          .map((text: any) => text.plain_text)
          .join('') + '\n\n';
      }
      break;
  }
  
  // 자식 블록이 있는 경우 재귀적으로 처리
  if (block.has_children) {
    try {
      const childResponse = await notion.blocks.children.list({
        block_id: block.id,
      });
      
      for (const childBlock of childResponse.results) {
        content += await parseBlock(childBlock as any);
      }
    } catch (error) {
      console.error('자식 블록 처리 중 오류:', error);
    }
  }
  
  return content;
}

// 게시물 변환 함수
export function transformNotionPageToPost(page: any): Post {
  return {
    id: page.id,
    title: extractTitle(page.properties),
    slug: extractSlug(page.properties),
    date: extractDate(page.properties),
    status: extractStatus(page.properties),
  };
}
