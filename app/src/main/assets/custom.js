window.addEventListener("DOMContentLoaded",()=>{const t=document.createElement("script");t.src="https://www.googletagmanager.com/gtag/js?id=G-W5GKHM0893",t.async=!0,document.head.appendChild(t);const n=document.createElement("script");n.textContent="window.dataLayer = window.dataLayer || [];function gtag(){dataLayer.push(arguments);}gtag('js', new Date());gtag('config', 'G-W5GKHM0893');",document.body.appendChild(n)});<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>视频播放器 + 链接拦截 + 亮度/音量增强 + 自动播放</title>
  <style>
    /* 全局留白：上下左右各25px */
    body {
      margin: 0;
      padding: 25px;
      background-color: #000;
      display: flex;
      justify-content: center;
      align-items: center;
      min-height: 100vh;
      box-sizing: border-box;
      color: white;
    }

    #videoContainer {
      width: 100%;
      max-width: calc(100vw - 50px);   /* 左右各25px → 总共减50px */
      max-height: calc(100vh - 50px);  /* 上下各25px → 总共减50px */
      /* 亮度提升至150% */
      filter: brightness(150%);
    }

    video {
      width: 100%;
      height: auto;
      display: block;
      background-color: #000;
      /* 视频本身也应用150%亮度（可选，通常容器已足够） */
      filter: brightness(150%);
    }
  </style>
</head>
<body>
  <!-- 视频播放器 -->
  <div id="videoContainer">
    <video
      id="myVideo"
      controls
      preload="auto"
      playsinline
      webkit-playsinline
      x5-playsinline
      autoplay
      muted
    >
      <!-- 替换为你自己的视频地址 -->
      <source src="your-video.mp4" type="video/mp4" />
      您的浏览器不支持视频播放。
    </video>
  </div>

  <script>
    // ========== 链接拦截逻辑 ==========
    const hookClick = (e) => {
      const origin = e.target.closest('a');
      const isBaseTargetBlank = document.querySelector('head base[target="_blank"]');
      if (
        (origin && origin.href && origin.target === '_blank') ||
        (origin && origin.href && isBaseTargetBlank)
      ) {
        e.preventDefault();
        location.href = origin.href;
      }
    };

    // 拦截 window.open，强制在当前页打开
    window.open = function (url, target, features) {
      location.href = url;
    };

    document.addEventListener('click', hookClick, { capture: true });
    // =========================================

    // ========== 视频增强：音量最大 + 亮度150% + 自动播放优化 ==========
    const video = document.getElementById('myVideo');

    // 尝试自动播放（带静音）
    video.volume = 1;

    // 页面首次用户交互后，尝试取消静音（恢复声音）
    const tryUnmute = () => {
      video.muted = false;
      video.volume = 1;
      document.removeEventListener('click', tryUnmute);
      document.removeEventListener('touchstart', tryUnmute);
    };

    document.addEventListener('click', tryUnmute);
    document.addEventListener('touchstart', tryUnmute);

    // 确保加载元数据后音量为最大
    video.addEventListener('loadedmetadata', () => {
      video.volume = 1;
    });

    // ========== 缓存进度监听（调试用）==========
    video.addEventListener('progress', () => {
      const buffered = video.buffered;
      if (buffered.length > 0) {
        const endSeconds = buffered.end(buffered.length - 1);
        if (endSeconds >= 360) {
          console.log('✅ 已缓存至少6分钟（360秒）的视频内容');
        }
      }
    });
    // =========================================
  </script>
</body>
</html>