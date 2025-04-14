// next.config.js
module.exports = {
  output: 'export',
  trailingSlash: true,
  transpilePackages: ['react-notion-x'],
  images: {
    unoptimized: true,
    domains: ['www.notion.so']
  },
  experimental: {
    serverComponentsExternalPackages: ['@notionhq/client']
  },
  webpack: (config) => {
    config.resolve.fallback = { 
      fs: false,
      net: false,
      tls: false
    }
    return config
  }
}
