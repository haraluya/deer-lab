const fs = require('fs');
const path = require('path');

// 修正客戶端路由問題
function fixClientRouting() {
  const outDir = path.join(__dirname, '..', 'out');
  
  console.log('🔧 修正客戶端路由...');
  
  // 檢查並修正所有 HTML 檔案
  function processHtmlFiles(dir) {
    const files = fs.readdirSync(dir);
    
    files.forEach(file => {
      const filePath = path.join(dir, file);
      const stats = fs.statSync(filePath);
      
      if (stats.isDirectory()) {
        processHtmlFiles(filePath);
      } else if (file.endsWith('.html')) {
        fixHtmlFile(filePath);
      }
    });
  }
  
  function fixHtmlFile(filePath) {
    let content = fs.readFileSync(filePath, 'utf8');
    
    // 添加客戶端路由處理腳本
    const clientRoutingScript = `
    <script>
    // 客戶端路由處理
    (function() {
      // 檢查是否為客戶端路由
      if (typeof window !== 'undefined') {
        // 確保所有靜態檔案路徑正確
        function fixStaticPaths() {
          const scripts = document.querySelectorAll('script[src]');
          scripts.forEach(script => {
            if (script.src.includes('/_next/static/')) {
              script.src = script.src.replace('/_next/static/', './static/');
            }
          });
          
          const links = document.querySelectorAll('link[href]');
          links.forEach(link => {
            if (link.href.includes('/_next/static/')) {
              link.href = link.href.replace('/_next/static/', './static/');
            }
          });
        }
        
        // 頁面載入完成後修正路徑
        if (document.readyState === 'loading') {
          document.addEventListener('DOMContentLoaded', fixStaticPaths);
        } else {
          fixStaticPaths();
        }
        
        // 處理瀏覽器的前進/後退按鈕
        window.addEventListener('popstate', function() {
          // 重新載入頁面以確保正確的狀態
          window.location.reload();
        });
        
        // 攔截所有內部連結點擊
        document.addEventListener('click', function(e) {
          const link = e.target.closest('a');
          if (link && link.href && link.href.startsWith(window.location.origin)) {
            const href = link.getAttribute('href');
            if (href && !href.startsWith('#')) {
              e.preventDefault();
              // 使用 Next.js 的路由
              if (window.next && window.next.router) {
                window.next.router.push(href);
              } else {
                window.location.href = href;
              }
            }
          }
        });
      }
    })();
    </script>
    `;
    
    // 在 </body> 標籤前插入客戶端路由腳本
    if (!content.includes('客戶端路由處理')) {
      content = content.replace('</body>', clientRoutingScript + '\n</body>');
    }
    
    // 修正 JavaScript 模組載入問題
    content = content.replace(
      /<script[^>]*src="([^"]*)"[^>]*>/g,
      (match, src) => {
        // 確保所有 JavaScript 檔案都使用正確的路徑
        if (src.startsWith('/_next/')) {
          return match.replace(src, src.replace('/_next/', './static/'));
        }
        return match;
      }
    );
    
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`✅ 修正 ${path.relative(outDir, filePath)}`);
  }
  
  if (fs.existsSync(outDir)) {
    processHtmlFiles(outDir);
    console.log('✅ 客戶端路由修正完成');
  } else {
    console.error('❌ out 目錄不存在');
  }
}

// 執行修正
fixClientRouting();
