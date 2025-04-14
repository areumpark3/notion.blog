// sync_notion_posts.js
require('dotenv').config();

// 환경 변수 확인 로깅
console.log("===== 노션 게시물 동기화 스크립트 시작 =====");
console.log("환경 변수 상태:");
console.log("NOTION_API_KEY:", process.env.NOTION_API_KEY ? "설정됨" : "설정되지 않음");
console.log("NOTION_DATABASE_ID:", process.env.NOTION_DATABASE_ID ? "설정됨" : "설정되지 않음");
console.log("NOTION_TOKEN_V2:", process.env.NOTION_TOKEN_V2 ? "설정됨" : "설정되지 않음");

// 필수 환경 변수 확인
if (!process.env.NOTION_API_KEY) {
  console.error("NOTION_API_KEY가 .env 파일에 설정되지 않았습니다.");
  process.exit(1);
}

if (!process.env.NOTION_DATABASE_ID) {
  console.error("NOTION_DATABASE_ID가 .env 파일에 설정되지 않았습니다.");
  process.exit(1);
}

const { Client: NotionClient } = require('@notionhq/client');
const fs = require('fs');
const path = require('path');

// notion-data 디렉토리 확인 및 생성
const notionDataDir = path.join(process.cwd(), 'notion-data');
if (!fs.existsSync(notionDataDir)) {
  fs.mkdirSync(notionDataDir, { recursive: true });
  console.log(`'${notionDataDir}' 디렉토리 생성 완료`);
}

// Notion API 클라이언트 생성
const notion = new NotionClient({
  auth: process.env.NOTION_API_KEY,
  notionVersion: "2022-06-28" 
});

// 데이터베이스 속성 가져오기
async function getDatabaseProperties() {
  try {
    console.log(`데이터베이스 속성 가져오기 시작 (DB ID: ${process.env.NOTION_DATABASE_ID})`);
    
    const db = await notion.databases.retrieve({
      database_id: process.env.NOTION_DATABASE_ID
    });
    
    console.log("데이터베이스 속성 가져오기 성공");
    console.log("발견된 속성들:", Object.keys(db.properties).join(", "));
    
    // 상태 속성 찾기 (다양한 이름 시도)
    const statusProp = Object.entries(db.properties).find(
      ([key, prop]) => prop.type === 'select' && 
      ['status', 'state', '상태', 'Status'].includes(key)
    );
    
    if (statusProp) {
      console.log(`상태 속성 발견: ${statusProp[0]}`);
      return { 
        statusPropName: statusProp[0],
        properties: db.properties
      };
    } else {
      console.log("상태 속성을 찾을 수 없음, 필터링 없이 진행합니다.");
      return { 
        statusPropName: null,
        properties: db.properties
      };
    }
  } catch (error) {
    console.error("데이터베이스 속성 가져오기 실패:", error);
    console.error("오류 세부 정보:", error.body || error.message);
    return { statusPropName: null, properties: {} };
  }
}

// 게시물 가져오기
async function getPosts() {
  try {
    console.log("노션 게시물 가져오기 시작");
    
    // 데이터베이스 속성 먼저 확인
    const { statusPropName, properties } = await getDatabaseProperties();
    
    // 쿼리 옵션 설정
    let queryOptions = {
      database_id: process.env.NOTION_DATABASE_ID
    };
    
    // 상태 속성이 있으면 필터 추가
    let results = [];
    
    if (statusPropName) {
      // 여러 가능한 상태값 시도
      const possibleStatusValues = ['발행됨', 'Published', '게시됨', 'Live'];
      
      for (const statusValue of possibleStatusValues) {
        console.log(`'${statusValue}' 상태로 게시물 필터링 시도`);
        
        queryOptions.filter = {
          property: statusPropName,
          select: {
            equals: statusValue
          }
        };
        
        try {
          const response = await notion.databases.query(queryOptions);
          
          if (response.results.length > 0) {
            console.log(`'${statusValue}' 상태의 게시물 ${response.results.length}개 발견`);
            results = response.results;
            break;
          }
        } catch (filterError) {
          console.warn(`'${statusValue}' 필터 적용 중 오류 발생:`, filterError.message);
        }
      }
      
      // 필터링된 결과가 없으면 모든 게시물 가져오기
      if (results.length === 0) {
        console.log("상태 필터링으로 게시물을 찾지 못했습니다. 모든 게시물을 가져옵니다.");
        delete queryOptions.filter;
        const response = await notion.databases.query(queryOptions);
        results = response.results;
      }
    } else {
      // 상태 속성이 없으면 모든 게시물 가져오기
      console.log("상태 속성 없음, 모든 게시물을 가져옵니다.");
      const response = await notion.databases.query(queryOptions);
      results = response.results;
    }
    
    console.log(`총 ${results.length}개의 게시물 검색됨`);
    return { results };
    
  } catch (error) {
    console.error('노션에서 게시물을 가져오는 중 오류 발생:', error);
    console.error('오류 세부 정보:', error.body || error.message);
    
    // 백업 방법: 필터 없이 시도
    try {
      console.log("필터 없이 다시 시도합니다.");
      return await notion.databases.query({
        database_id: process.env.NOTION_DATABASE_ID
      });
    } catch (fallbackError) {
      console.error('백업 방법도 실패:', fallbackError);
      return { results: [] };
    }
  }
}

async function updatePostsFile(posts) {
  const filePath = path.join(notionDataDir, 'posts.json')
  const data = JSON.stringify(posts.map(p => ({
    ...p,
    // Next.js 빌드를 트리거하기 위해 메타데이터 추가
    lastSynced: new Date().toISOString()
  })), null, 2)
  
  fs.writeFileSync(filePath, data)
  console.log(`게시물 데이터가 ${filePath}에 저장되었습니다.`)
}

// 메인 함수
async function main() {
  try {
    console.log("노션 게시물 동기화를 시작합니다...");
    
    const { results: posts } = await getPosts();
    
    if (posts && posts.length > 0) {
      console.log(`처리할 ${posts.length}개의 게시물을 찾았습니다...`);
      await updatePostsFile(posts);
      console.log("게시물이 성공적으로 동기화되었습니다!");
    } else {
      console.log('업데이트할 게시물이 없습니다.');
    }
  } catch (error) {
    console.error('동기화 프로세스 중 오류 발생:', error);
    process.exit(1);
  }
}

// 스크립트 실행
main();
