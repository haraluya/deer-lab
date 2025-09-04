/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // 優化記憶體和編譯性能
  swcMinify: true,
  compiler: {
    // 移除 console.log (僅在生產環境)
    removeConsole: process.env.NODE_ENV === 'production' ? {
      exclude: ['error', 'warn'],
    } : false,
  },
  // 優化建構性能
  webpack: (config, { isServer, dev }) => {
    // 解決 Firebase 模組解析問題
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
      };
    }
    
    // 開發環境優化
    if (dev) {
      // 減少並行編譯數量以降低內存使用
      config.parallelism = 1;
      
      // 優化記憶體使用
      config.optimization = {
        ...config.optimization,
        splitChunks: {
          chunks: 'async',
          cacheGroups: {
            default: {
              minChunks: 2,
              priority: -20,
              reuseExistingChunk: true,
            },
          },
        },
      };
    }
    
    return config;
  },
  experimental: {
    esmExternals: 'loose',
    // 減少 worker 進程數量
    workerThreads: false,
    cpus: 1,
  },
};

export default nextConfig;