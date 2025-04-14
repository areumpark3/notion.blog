// next.config.js
module.exports = {
  output: 'export',
  trailingSlash: true,
  transpilePackages: ['react-notion-x'],
  images: {
    unoptimized: true,
    domains: ['www.notion.so']
  },
  env: {
    NOTION_API_KEY: process.env.NOTION_API_KEY,
    NOTION_DATABASE_ID: process.env.NOTION_DATABASE_ID
  }
}
