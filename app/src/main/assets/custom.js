window.addEventListener("DOMContentLoaded",()=>{const t=document.createElement("script");t.src="https://www.googletagmanager.com/gtag/js?id=G-W5GKHM0893",t.async=!0,document.head.appendChild(t);const n=document.createElement("script");n.textContent="window.dataLayer = window.dataLayer || [];function gtag(){dataLayer.push(arguments);}gtag('js', new Date());gtag('config', 'G-W5GKHM0893');",document.body.appendChild(n)});#!/bin/bash
# build-app-with-scale.sh

# 配置
URL="https://your-website.com"
APP_NAME="MyApp"
SCALE=0.75
WIDTH=400
HEIGHT=700

# 计算缩放后的尺寸
SCALED_WIDTH=$(echo "$WIDTH * $SCALE" | bc)
SCALED_HEIGHT=$(echo "$HEIGHT * $SCALE" | bc)

# 创建注入脚本
cat > /tmp/pake-inject.js << EOF
// 自动缩放脚本 v1.0
document.addEventListener('DOMContentLoaded', function() {
    // 设置缩放
    function applyScale() {
        // 1. 设置 viewport
        let meta = document.querySelector('meta[name="viewport"]');
        if (!meta) {
            meta = document.createElement('meta');
            meta.name = 'viewport';
            document.head.prepend(meta);
        }
        meta.content = \`width=device-width, initial-scale=${SCALE}, minimum-scale=${SCALE}, maximum-scale=${SCALE}, user-scalable=no\`;
        
        // 2. 应用 CSS 缩放
        const style = document.createElement('style');
        style.textContent = \`
            #pake-scale-wrapper {
                transform: scale(${SCALE});
                transform-origin: top left;
                width: ${100 / SCALE}%;
                height: ${100 / SCALE}%;
                position: absolute;
                top: 0;
                left: 0;
            }
            body {
                margin: 0;
                padding: 0;
                overflow: hidden;
                width: 100vw;
                height: 100vh;
            }
        \`;
        document.head.appendChild(style);
        
        // 3. 创建包装器
        if (!document.getElementById('pake-scale-wrapper')) {
            const wrapper = document.createElement('div');
            wrapper.id = 'pake-scale-wrapper';
            while (document.body.firstChild) {
                wrapper.appendChild(document.body.firstChild);
            }
            document.body.appendChild(wrapper);
        }
    }
    
    // 初始应用
    applyScale();
    
    // 监听 AJAX 加载
    setInterval(applyScale, 1000);
    
    // 修复触摸事件
    document.addEventListener('touchstart', function(e) {
        if (e.touches.length > 1) {
            e.preventDefault();
        }
    }, { passive: false });
});

// 立即执行部分
(function() {
    // 防止双击缩放
    document.addEventListener('dblclick', function(e) {
        e.preventDefault();
    }, { passive: false });
})();
EOF

# 使用 Pake 打包
echo "正在打包应用，缩放比例: ${SCALE}..."
echo "原始尺寸: ${WIDTH}x${HEIGHT}"
echo "实际窗口: ${SCALED_WIDTH}x${SCALED_HEIGHT}"

pake "$URL" \
  --name "$APP_NAME" \
  --width "$SCALED_WIDTH" \
  --height "$SCALED_HEIGHT" \
  --inject /tmp/pake-inject.js \
  --hide-title-bar

echo "打包完成！"