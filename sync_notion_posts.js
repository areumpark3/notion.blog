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
    title: post.properties.Title.title[0].plain_text,
    date: post.properties['Publish Date'].date.start,
    tags: post.properties.Tags.multi_select.map(tag => tag.name),
  }));

  const content = `export const posts = ${JSON.stringify(postsData, null, 2)};`;
  fs.writeFileSync('content/posts.ts', content);
}

async function main() {
  const posts = await getPosts();
  await updatePostsFile(posts);
}

main().catch(console.error);
