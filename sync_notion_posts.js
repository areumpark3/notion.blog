const { Client } = require('@notionhq/client');
const fs = require('fs');

const notion = new Client({ auth: process.env.NOTION_API_KEY });

async function getPosts() {
  const response = await notion.databases.query({
    database_id: process.env.NOTION_DATABASE_ID,
    filter: {
      property: 'Status',
      select: {
        equals: '발행됨'
      }
    }
  });

  return response.results;
}

async function updatePostsFile(posts) {
    const postsData = posts.map(post => ({
      id: post.id,
      title: post.properties.Title?.title[0]?.plain_text || '제목 없음', // 제목이 없으면 기본값 설정
      date: post.properties['Publish Date']?.date?.start || '날짜 없음', // 날짜가 없으면 기본값 설정
      tags: post.properties.Tags?.multi_select.map(tag => tag.name) || [], // 태그가 없으면 빈 배열 설정
    }));
  
    const content = `export const posts = ${JSON.stringify(postsData, null, 2)};`;
    fs.writeFileSync('content/posts.ts', content);
  }

async function main() {
  const posts = await getPosts();
  await updatePostsFile(posts);
}

main().catch(console.error);
