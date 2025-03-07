require('dotenv').config();

console.log("NOTION_API_KEY:", process.env.NOTION_API_KEY);
console.log("NOTION_DATABASE_ID:", process.env.NOTION_DATABASE_ID);

if (!process.env.NOTION_API_KEY) {
  console.error("NOTION_API_KEY is not set in .env file.");
  process.exit(1);
}

const { Client } = require('@notionhq/client');
const fs = require('fs');

const notion = new Client({
  auth: process.env.NOTION_API_KEY,
  notionVersion: "2022-06-28"
});

// Post 타입 정의
const Post = {
  title: String,
  slug: String,
  content: { blocks: Array },
  date: String,
  description: String,
  image: String
};

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
    console.log('Error details:', error.body);
    return [];
  }
}

async function fetchAllBlocks(blockId) {
  let blocks = [];
  let cursor = undefined; // null 대신 undefined 사용

  while (true) {
    try {
      const response = await notion.blocks.children.list({
        block_id: blockId,
        start_cursor: cursor,
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

async function updatePostsFile(posts) {
  try {
    const newPosts = await Promise.all(
      posts.map(async (post) => {
        const blocks = await fetchAllBlocks(post.id);

        const jsonContent = { blocks };
        const fileName = `post_${post.id.replace(/-/g, '')}.json`;
        fs.writeFileSync(`notion-data/${fileName}`, JSON.stringify(jsonContent, null, 2));

        return {
          title: post.properties.Title?.rich_text[0]?.plain_text || '제목 없음',
          slug: `post-${post.id}`,
          content: fileName.replace('.json', ''),
          date: post.properties.Date?.date?.start || '날짜 없음',
          description: post.properties.Description?.rich_text[0]?.plain_text || '',
          image: post.cover?.external?.url || post.cover?.file?.url || undefined
        };
      })
    );

    const importStatements = newPosts.map((post) => 
      `import ${post.content} from '../notion-data/${post.content}.json';\n`
    ).join('');

    const postsContent = JSON.stringify(newPosts, null, 2).replace(/"content": "([^"]+)"/g, '"content": $1');

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
