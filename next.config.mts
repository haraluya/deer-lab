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
  
  // 確保正確的靜態資源路徑
  assetPrefix: process.env.NODE_ENV === 'production' ? undefined : '',
  
  // 改善開發伺服器的穩定性
  webpack: (config, { dev, isServer }) => {
    if (dev && !isServer) {
      // 在開發模式下改善快取處理
      config.watchOptions = {
        poll: 1000,
        aggregateTimeout: 300,
      };
    }
    
    // 排除 functions 目錄和相關模組
    config.externals = config.externals || [];
    config.externals.push({
      'firebase-functions': 'firebase-functions',
      'firebase-admin': 'firebase-admin'
    });
    
    // 排除 functions 目錄的檔案
    config.module.rules.push({
      test: /functions/,
      use: 'ignore-loader'
    });
    
    return config;
  },
  
  // 排除特定目錄和檔案
  experimental: {
    excludeDefaultMomentLocales: false,
  },
  
  // 自訂建置輸出目錄
  distDir: 'out',
};

export default nextConfig;