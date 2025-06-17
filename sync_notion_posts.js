// sync_notion_posts.js
require('dotenv').config();
const { Client } = require('@notionhq/client');
const fs = require('fs');
const path = require('path');

// 환경 변수 확인
if (!process.env.NOTION_API_KEY || !process.env.NOTION_DATABASE_ID) {
  console.error('❌ 필수 환경 변수가 설정되지 않았습니다.');
  console.error('NOTION_API_KEY:', !!process.env.NOTION_API_KEY);
  console.error('NOTION_DATABASE_ID:', !!process.env.NOTION_DATABASE_ID);
  process.exit(1);
}

const notion = new Client({
  auth: process.env.NOTION_API_KEY,
});

// 안전한 제목 추출 함수
function extractTitle(properties) {
  try {
    // 직접적인 Title 속성 확인
    if (properties.Title?.title?.[0]?.plain_text) {
      return properties.Title.title[0].plain_text;
    }
    
    // type이 'title'인 속성 찾기
    for (const [key, prop] of Object.entries(properties)) {
      if (prop.type === 'title' && prop.title?.[0]?.plain_text) {
        return prop.title[0].plain_text;
      }
    }
    
    return '제목 없음';
  } catch (error) {
    console.error('제목 추출 오류:', error);
    return '제목 없음';
  }
}

// 모든 게시물 가져오기 (페이지네이션 지원)
async function getAllPosts() {
  try {
    console.log('📚 노션 데이터베이스에서 게시물을 가져오는 중...');
    
    let allResults = [];
    let hasMore = true;
    let nextCursor = null;
    
    while (hasMore) {
      const queryOptions = {
        database_id: process.env.NOTION_DATABASE_ID,
        page_size: 100,
      };
      
      if (nextCursor) {
        queryOptions.start_cursor = nextCursor;
      }
      
      const response = await notion.databases.query(queryOptions);
      
      allResults = allResults.concat(response.results);
      hasMore = response.has_more;
      nextCursor = response.next_cursor;
      
      console.log(`📄 ${response.results.length}개 게시물 발견 (총 ${allResults.length}개)`);
    }
    
    return allResults;
  } catch (error) {
    console.error('❌ 게시물 가져오기 실패:', error);
    return [];
  }
}

// 게시물 데이터 변환
function transformPost(page) {
  try {
    const title = extractTitle(page.properties);
    
    // 디버깅을 위한 로그
    console.log(`🔍 처리 중인 게시물:`, {
      id: page.id,
      title: title,
      properties: Object.keys(page.properties)
    });
    
    return {
      id: page.id,
      title: title,
      slug: title.toLowerCase().replace(/[^a-z0-9가-힣\s]/g, '').replace(/\s+/g, '-') || `post-${page.id.slice(0, 8)}`,
      date: page.created_time.split('T')[0],
      status: page.properties.Status?.select?.name || 'Draft',
      lastSynced: new Date().toISOString()
    };
  } catch (error) {
    console.error('❌ 게시물 변환 실패:', error);
    return null;
  }
}

// 메인 실행 함수
async function main() {
  try {
    console.log('🚀 노션 블로그 동기화 시작');
    
    // 1. 모든 게시물 가져오기
    const allPosts = await getAllPosts();
    
    if (allPosts.length === 0) {
      console.log('⚠️ 가져온 게시물이 없습니다.');
      return;
    }
    
    // 2. 게시물 변환
    const transformedPosts = allPosts
      .map(transformPost)
      .filter(post => post !== null);
    
    console.log(`✅ 총 ${transformedPosts.length}개 게시물 변환 완료`);
    
    // 3. 디렉토리 생성
    const notionDataDir = path.join(process.cwd(), 'notion-data');
    if (!fs.existsSync(notionDataDir)) {
      fs.mkdirSync(notionDataDir, { recursive: true });
    }
    
    // 4. 파일 저장
    const postsFilePath = path.join(notionDataDir, 'posts.json');
    fs.writeFileSync(postsFilePath, JSON.stringify(transformedPosts, null, 2));
    
    console.log(`💾 게시물 데이터가 ${postsFilePath}에 저장되었습니다.`);
    console.log('🎉 동기화 완료!');
    
  } catch (error) {
    console.error('❌ 동기화 프로세스 실패:', error);
    process.exit(1);
  }
}

main();
