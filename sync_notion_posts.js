require('dotenv').config();

const { Client } = require('@notionhq/client');
const fs = require('fs');

// Post 타입 정의를 상단으로 이동
const Post = {
  title: String,
  slug: String,
  content: { blocks: Array },
  date: String,
  description: String,
  image: String
};

const notion = new Client({
    auth: "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", // 직접 API 토큰 입력
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
    console.log('Notion API Response:', JSON.stringify(response, null, 2));
    return response.results;
} catch (error) {
    console.error('Error fetching posts from Notion:', error);
    console.log('Error details:', error.body); // 추가 로깅
    return [];
}
}
    
async function updatePostsFile(posts) {
    try {
      const newPosts = await Promise.all(posts.map(async (post) => {
        let blocks = [];
        try {
          const response = await notion.blocks.children.list({
            block_id: post.id,
          });
          blocks = response.results || [];
        } catch (error) {
          console.error(`Error fetching blocks for post ${post.id}:`, error);
        }
  
        const jsonContent = { blocks };
  
        // JSON 파일 생성
        const fileName = `post_${post.id.replace(/-/g, '')}.json`;
        fs.writeFileSync(`notion-data/${fileName}`, JSON.stringify(jsonContent, null, 2));
  
        return {
          title: post.properties.Title?.rich_text[0]?.plain_text || '제목 없음',
          slug: `post-${post.id}`,
          content: fileName.replace('.json', ''),
          date: post.properties.Date?.date?.start || '날짜 없음',
          description: post.properties.Content?.rich_text[0]?.plain_text || '',
          image: post.cover?.external?.url || post.cover?.file?.url || undefined
        };
      }));
  
      const importStatements = newPosts.map((post) => 
        `import ${post.content} from '../notion-data/${post.content}.json';\n`
      ).join('');
  
      const postsContent = JSON.stringify(newPosts, null, 2)
        .replace(/"content": "([^"]+)"/g, '"content": $1');
  
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
};`;
  
      fs.writeFileSync('content/posts.ts', content);
    } catch (error) {
      console.error('Error updating posts file:', error);
    }
}
  
async function main() {
  const posts = await getPosts();
  if (posts.length > 0) {
    await updatePostsFile(posts);
  } else {
    console.log('No posts to update');
  }
}

main().catch(console.error);
