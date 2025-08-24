// next.config.mjs

/** @type {import('next').NextConfig} */
const nextConfig = {
  // 啟用嚴格模式
  reactStrictMode: true,
  
  // 設定為靜態匯出模式
  output: 'export',
  
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
  
  // 靜態匯出配置
  trailingSlash: false,
  skipTrailingSlashRedirect: true,
  
  // 確保正確的基礎路徑
  basePath: '',
  
  // 修正靜態匯出的資產路徑問題 - 使用相對路徑
  assetPrefix: './',
  
  // 修正靜態匯出的資產路徑問題
  experimental: {
    // 確保靜態匯出時資產路徑正確
    outputFileTracingRoot: process.cwd(),
  },
  
  // 自定義靜態匯出後處理
  async rewrites() {
    return [];
  },
  
  // 確保靜態匯出時的路徑正確
  generateEtags: false,
};

export default nextConfig;