// sync_notion_posts.js
require('dotenv').config();

console.log("NOTION_API_KEY:", process.env.NOTION_API_KEY ? "설정됨" : "설정되지 않음");
console.log("NOTION_DATABASE_ID:", process.env.NOTION_DATABASE_ID ? "설정됨" : "설정되지 않음");

if (!process.env.NOTION_API_KEY) {
  console.error("NOTION_API_KEY가 .env 파일에 설정되지 않았습니다.");
  process.exit(1);
}

const { Client: NotionClient } = require('@notionhq/client');
const fs = require('fs');
const path = require('path');

// notion-data 디렉토리 확인 및 생성
const notionDataDir = path.join(process.cwd(), 'notion-data');
if (!fs.existsSync(notionDataDir)) {
  fs.mkdirSync(notionDataDir, { recursive: true });
}

const notion = new NotionClient({
  auth: process.env.NOTION_API_KEY,
  notionVersion: "2022-06-28"
});

async function getPosts() {
  try {
    const response = await notion.databases.query({
      database_id: process.env.NOTION_DATABASE_ID,
      filter: {
        property: 'Status',
        select: {
          equals: '발행됨'
        }
      }
    });
    console.log(`${response.results.length}개의 발행된 게시물을 찾았습니다.`);
    return response.results;
  } catch (error) {
    console.error('노션에서 게시물을 가져오는 중 오류 발생:', error);
    console.log('오류 세부 정보:', error.body);
    return [];
  }
}

// 블록과 하위 블록을 재귀적으로 가져오는 함수 (개선)
async function fetchAllBlocks(blockId, depth = 0, visited = new Set()) {
  // 무한 재귀 방지
  if (visited.has(blockId) || depth > 10) {
    return [];
  }
  
  visited.add(blockId);
  
  let blocks = [];
  let cursor = undefined;

  while (true) {
    try {
      const response = await notion.blocks.children.list({
        block_id: blockId,
        start_cursor: cursor,
      });

      // 각 블록 처리
      const processedBlocks = await Promise.all(response.results.map(async (block) => {
        // 하위 페이지나 데이터베이스 블록의 경우 자식 블록을 재귀적으로 가져옴
        if (block.has_children) {
          try {
            block.children = await fetchAllBlocks(block.id, depth + 1, visited);
          } catch (error) {
            console.error(`블록 ${block.id}의 하위 항목을 가져오는 중 오류 발생:`, error);
            block.children = [];
          }
        }
        
        // 파일 블록 특별 처리
        if (block.type === 'file' || block.type === 'pdf' || block.type === 'image') {
          block.is_file_attachment = true;
          
          // 첨부파일 이름 추가
          if (block.type === 'file') {
            block.file_name = block.file?.name || '첨부파일';
          } else if (block.type === 'pdf') {
            block.file_name = block.pdf?.name || 'PDF 문서';
          } else if (block.type === 'image') {
            block.file_name = block.image?.name || '이미지';
          }
        }
        
        // 하위 페이지 특별 처리
        if (block.type === 'child_page') {
          block.is_child_page = true;
          block.page_id = block.id;
          block.page_title = block.child_page?.title || '하위 페이지';
        }
        
        return block;
      }));

      blocks.push(...processedBlocks);
      
      if (!response.has_more) break;
      cursor = response.next_cursor;
    } catch (error) {
      console.error(`블록 ID ${blockId}의 블록을 가져오는 중 오류 발생:`, error);
      break;
    }
  }

  return blocks;
}

// 페이지 메타데이터와 블록을 가져오고 저장하는 함수
async function fetchPageContent(pageId) {
  try {
    // 페이지 메타데이터 가져오기
    const pageInfo = await notion.pages.retrieve({ page_id: pageId });
    
    // 페이지의 모든 블록 가져오기
    const blocks = await fetchAllBlocks(pageId);
    
    return {
      pageInfo,
      blocks
    };
  } catch (error) {
    console.error(`페이지 ID ${pageId}의 콘텐츠를 가져오는 중 오류 발생:`, error);
    return null;
  }
}

async function updatePostsFile(posts) {
  try {
    const newPosts = await Promise.all(
      posts.map(async (post) => {
        console.log(`게시물 처리 중: ${post.id} - ${post.properties.Title?.rich_text[0]?.plain_text || '제목 없음'}`);
        
        // 이 게시물의 모든 블록 가져오기 (하위 블록 포함)
        const blocks = await fetchAllBlocks(post.id);
        
        // 하위 페이지 검사
        const hasChildPages = blocks.some(block => block.type === 'child_page' || block.is_child_page);
        
        // 블록을 JSON 파일로 저장
        const postId = post.id.replace(/-/g, '');
        const fileName = `post_${postId}.json`;
        const filePath = path.join(notionDataDir, fileName);
        
        fs.writeFileSync(filePath, JSON.stringify({ blocks }, null, 2));
        console.log(`${blocks.length}개의 블록을 ${filePath}에 저장했습니다.`);
        
        // 하위 페이지가 있는 경우 각 하위 페이지도 저장
        if (hasChildPages) {
          const childPages = [];
          
          for (const block of blocks) {
            if (block.type === 'child_page' || block.is_child_page) {
              const childPageId = block.id;
              const childPageContent = await fetchPageContent(childPageId);
              
              if (childPageContent) {
                const childFileName = `child_page_${childPageId.replace(/-/g, '')}.json`;
                const childFilePath = path.join(notionDataDir, childFileName);
                
                fs.writeFileSync(childFilePath, JSON.stringify(childPageContent, null, 2));
                console.log(`하위 페이지 ${childPageId}를 ${childFilePath}에 저장했습니다.`);
                
                // 하위 페이지 정보 저장
                childPages.push({
                  id: childPageId,
                  title: block.child_page?.title || '하위 페이지',
                  slug: `post-${childPageId.replace(/-/g, '')}`
                });
              }
            }
          }
        }
        
        // 게시물 메타데이터 반환
        return {
          title: post.properties.Title?.rich_text[0]?.plain_text || '제목 없음',
          slug: `post-${postId}`,
          content: `post_${postId}`,
          date: post.properties.Date?.date?.start || new Date().toISOString().split('T')[0],
          description: post.properties.Description?.rich_text[0]?.plain_text || '',
          image: post.cover?.external?.url || post.cover?.file?.url || undefined,
          notionPageId: postId,
          has_children: hasChildPages, // 하위 페이지 여부 표시
        };
      })
    );

    // content/posts.ts 파일 생성
    const contentDir = path.join(process.cwd(), 'content');
    if (!fs.existsSync(contentDir)) {
      fs.mkdirSync(contentDir, { recursive: true });
    }
    
    // 각 게시물에 대한 import 문 생성
    const importStatements = newPosts.map((post) => 
      `import ${post.content} from '../notion-data/${post.content}.json';\n`
    ).join('');

    // 게시물 배열의 content 참조 수정
    const postsContent = JSON.stringify(newPosts, null, 2)
      .replace(/"content": "([^"]+)"/g, '"content": $1');
    
    // 완전한 파일 내용 생성
    const content = `${importStatements}
const posts = ${postsContent} as Post[];

export default posts;

export type Post = {
  title: string;
  slug: string;
  content: { blocks: any[] };
  date: string;
  description: string;
  image?: string;
  notionPageId: string;
  has_children?: boolean;
  childPages?: { id: string; title: string; slug: string; }[];
};`;

    // 파일 작성
    const postsFilePath = path.join(contentDir, 'posts.ts');
    fs.writeFileSync(postsFilePath, content);
    console.log(`${postsFilePath}에 ${newPosts.length}개의 게시물을 성공적으로 업데이트했습니다.`);
  } catch (error) {
    console.error('게시물 파일 업데이트 중 오류 발생:', error);
    throw error;
  }
}

async function main() {
  try {
    console.log("노션 게시물 동기화를 시작합니다...");
    
    const posts = await getPosts();
    
    if (posts.length > 0) {
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

main();
