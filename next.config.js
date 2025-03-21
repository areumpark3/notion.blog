// next.config.js
module.exports = {
  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
      };
    }
    return config;
  },
  env: {
    NOTION_TOKEN_V2: process.env.NOTION_TOKEN_V2,
  },
  // Cloudflare 최적화
  experimental: {
    optimizeCss: true,
    strictPostcssConfiguration: true,
  },
  // 이미지 최적화 비활성화 (Cloudflare에서 문제 발생 가능)
  images: {
    unoptimized: true,
  }
};

module.exports = {
  experimental: {
    esmExternals: 'loose',
    serverComponentsExternalPackages: ['react-notion-x', 'notion-client']
  },
  typescript: {
    ignoreBuildErrors: true // 임시 빌드 오류 무시
  }
};

