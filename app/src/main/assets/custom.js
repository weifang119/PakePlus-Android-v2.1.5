window.addEventListener("DOMContentLoaded",()=>{const t=document.createElement("script");t.src="https://www.googletagmanager.com/gtag/js?id=G-W5GKHM0893",t.async=!0,document.head.appendChild(t);const n=document.createElement("script");n.textContent="window.dataLayer = window.dataLayer || [];function gtag(){dataLayer.push(arguments);}gtag('js', new Date());gtag('config', 'G-W5GKHM0893');",document.body.appendChild(n)});<script>
// =============== Pake 全屏兼容补丁 ===============
(function () {
  // 判断是否在 Pake App 环境中
  // Pake 默认会注入 window.pake 对象（v1.3+）
  // 如果你用的老版本，也可以通过 UA 或其他特征判断
  const isInPake = typeof window.pake !== 'undefined' || 
                   (navigator.userAgent.includes('Pake') && !window.chrome);

  if (!isInPake) {
    // 在普通浏览器中，啥也不干，走原生全屏
    return;
  }

  console.log('[Pake] 检测到 App 环境，启用防卡顿全屏模式');

  // 强制所有 video 内联播放（关键！防 iOS 跳出）
  function enforceInlinePlayback() {
    document.querySelectorAll('video').forEach(video => {
      video.setAttribute('webkit-playsinline', 'true');
      video.setAttribute('playsinline', 'true');
      video.setAttribute('x5-video-player-type', 'h5');
      video.setAttribute('x5-video-player-fullscreen', 'false');
    });
  }

  // 劫持原生 requestFullscreen 方法
  const originalRequestFullscreen = Element.prototype.requestFullscreen;
  Element.prototype.requestFullscreen = function () {
    // 找到最近的 video 容器
    const container = this.closest('video') || this;

    // 添加伪全屏样式
    container.classList.add('__pake-fake-fullscreen');
    document.body.style.overflow = 'hidden';

    // 监听退出（点击 ESC 或调用 exitFullscreen）
    const handleExit = () => {
      container.classList.remove('__pake-fake-fullscreen');
      document.body.style.overflow = '';
      document.removeEventListener('touchstart', handleExit);
    };

    // 点击屏幕任意位置退出（移动端友好）
    document.addEventListener('touchstart', handleExit, { once: true });

    return Promise.resolve(); // 模拟成功
  };

  // 替换 exitFullscreen（虽然一般不会被调用）
  const originalExitFullscreen = Document.prototype.exitFullscreen;
  Document.prototype.exitFullscreen = function () {
    document.querySelectorAll('.__pake-fake-fullscreen').forEach(el => {
      el.classList.remove('__pake-fake-fullscreen');
    });
    document.body.style.overflow = '';
    return Promise.resolve();
  };

  // 注入 CSS
  const style = document.createElement('style');
  style.textContent = `
    .__pake-fake-fullscreen {
      position: fixed !important;
      top: 0 !important;
      left: 0 !important;
      width: 100vw !important;
      height: 100vh !important;
      z-index: 99999 !important;
      max-width: none !important;
      max-height: none !important;
    }
    .__pake-fake-fullscreen video {
      width: 100% !important;
      height: 100% !important;
      object-fit: contain !important;
      background: #000;
    }
  `;
  document.head.appendChild(style);

  // 初始执行 & 监听动态视频
  enforceInlinePlayback();
  const observer = new MutationObserver(enforceInlinePlayback);
  observer.observe(document.body, { childList: true, subtree: true });
})();
</script>