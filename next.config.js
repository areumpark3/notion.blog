// next.config.js
module.exports = {
  trailingSlash: true,
  transpilePackages: ['react-notion-x', 'notion-client', 'notion-types'],
  images: {
    unoptimized: true,
    domains: ['www.notion.so', 's3.us-west-2.amazonaws.com']
  },
  env: {
    NOTION_API_KEY: process.env.NOTION_API_KEY,
    NOTION_DATABASE_ID: process.env.NOTION_DATABASE_ID,
    NOTION_TOKEN_V2: process.env.NOTION_TOKEN_V2
  }
}
