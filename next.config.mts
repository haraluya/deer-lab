// next.config.mjs

/** @type {import('next').NextConfig} */
const nextConfig = {
  // 啟用嚴格模式
  reactStrictMode: true,
  
  // 只在生產環境啟用靜態匯出
  ...(process.env.NODE_ENV === 'production' && {
    output: 'export',
  }),
  
  // 停用圖片最佳化（靜態匯出不支援）
  images: {
    unoptimized: true
  },
  
  // 改善開發伺服器的穩定性
  webpack: (config, { dev, isServer }) => {
    if (dev && !isServer) {
      // 在開發模式下改善快取處理
      config.watchOptions = {
        poll: 1000,
        aggregateTimeout: 300,
      };
    }
    
    // 排除 firebase 相關模組
    config.externals = config.externals || [];
    config.externals.push({
      'firebase-functions': 'firebase-functions',
      'firebase-admin': 'firebase-admin'
    });
    
    return config;
  },
  
  // 跳過建置時的 ESLint 檢查
  eslint: {
    ignoreDuringBuilds: true,
  },
  
  // 跳過建置時的 TypeScript 檢查
  typescript: {
    ignoreBuildErrors: true,
  },
  
  // 靜態匯出配置 - 移除 trailingSlash 配置
  skipTrailingSlashRedirect: true,
  
  // 確保正確的基礎路徑
  basePath: '',
  
  // 修正靜態匯出的資產路徑問題 - 使用相對路徑
  assetPrefix: '',
  
  // 修正靜態匯出的資產路徑問題
  experimental: {
    // 確保靜態匯出時資產路徑正確
    outputFileTracingRoot: process.cwd(),
    // 啟用靜態匯出優化
    optimizePackageImports: ['lucide-react'],
  },
  
  // 自定義靜態匯出後處理
  async rewrites() {
    return [];
  },
  
  // 確保靜態匯出時的路徑正確
  generateEtags: false,
  
  // 改善靜態匯出的路徑處理
  // distDir: 'out', // 移除這個配置，讓 Next.js 使用默認的 .next 目錄
  
  // 確保正確的靜態檔案路徑
  async headers() {
    return [
      {
        source: '/static/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
    ];
  },
};

export default nextConfig;