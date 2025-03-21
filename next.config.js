module.exports = {
  // output: 'export', // 개발 중에는 주석 처리
  trailingSlash: true,
  images: {
    unoptimized: true,
    domains: [
      'www.notion.so',
      's3.us-west-2.amazonaws.com',
      'prod-files-secure.s3.us-west-2.amazonaws.com'
    ]
  },
  experimental: {
    serverComponentsExternalPackages: [
      '@notionhq/client',
      'react-notion-x',
      'notion-client'
    ]
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
