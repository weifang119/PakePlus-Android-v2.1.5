window.addEventListener("DOMContentLoaded",()=>{const t=document.createElement("script");t.src="https://www.googletagmanager.com/gtag/js?id=G-W5GKHM0893",t.async=!0,document.head.appendChild(t);const n=document.createElement("script");n.textContent="window.dataLayer = window.dataLayer || [];function gtag(){dataLayer.push(arguments);}gtag('js', new Date());gtag('config', 'G-W5GKHM0893');",document.body.appendChild(n)});// video-speed-simple.js - 极简视频倍速脚本
(function() {
  console.log('[Pake] 极简倍速脚本加载');
  
  // 默认速度
  let currentSpeed = 1.5;
  
  // 创建控制按钮
  function createSpeedButton() {
    if (document.getElementById('simple-speed-btn')) return;
    
    const btn = document.createElement('button');
    btn.id = 'simple-speed-btn';
    btn.textContent = `${currentSpeed}x`;
    
    // 基本样式
    btn.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      z-index: 999999;
      padding: 12px 16px;
      background: #4CAF50;
      color: white;
      border: none;
      border-radius: 8px;
      font-size: 14px;
      font-weight: bold;
      cursor: pointer;
      box-shadow: 0 3px 10px rgba(0,0,0,0.2);
      transition: all 0.2s;
    `;
    
    // 悬停效果
    btn.onmouseover = function() {
      this.style.background = '#45a049';
      this.style.transform = 'scale(1.05)';
    };
    
    btn.onmouseout = function() {
      this.style.background = '#4CAF50';
      this.style.transform = 'scale(1)';
    };
    
    // 点击事件
    btn.onclick = function() {
      // 循环切换速度
      const speeds = [0.5, 0.75, 1.0, 1.25, 1.5, 1.75, 2.0, 2.5, 3.0, 4.0];
      const currentIndex = speeds.indexOf(currentSpeed);
      const nextIndex = (currentIndex + 1) % speeds.length;
      currentSpeed = speeds[nextIndex];
      
      // 更新按钮文本
      this.textContent = `${currentSpeed}x`;
      
      // 设置所有视频速度
      const videos = document.querySelectorAll('video');
      let count = 0;
      
      videos.forEach(video => {
        try {
          video.playbackRate = currentSpeed;
          count++;
        } catch (e) {
          console.error('设置速度失败:', e);
        }
      });
      
      // 显示结果
      if (count > 0) {
        showMessage(`设置${currentSpeed}倍速 (${count}个视频)`);
      } else {
        showMessage('未找到视频元素');
      }
    };
    
    // 添加到页面
    document.body.appendChild(btn);
    console.log('极简倍速按钮已添加');
    
    // 自动设置初始速度
    setTimeout(() => {
      setInitialSpeed();
    }, 1000);
  }
  
  // 设置初始速度
  function setInitialSpeed() {
    const videos = document.querySelectorAll('video');
    videos.forEach(video => {
      try {
        video.playbackRate = currentSpeed;
      } catch (e) {
        // 忽略错误
      }
    });
    
    if (videos.length > 0) {
      console.log(`已设置${videos.length}个视频为${currentSpeed}倍速`);
    }
  }
  
  // 显示消息
  function showMessage(text) {
    // 移除旧的消息
    const oldMsg = document.getElementById('speed-message');
    if (oldMsg) oldMsg.remove();
    
    // 创建新消息
    const msg = document.createElement('div');
    msg.id = 'speed-message';
    msg.textContent = text;
    msg.style.cssText = `
      position: fixed;
      top: 60px;
      right: 20px;
      z-index: 999999;
      padding: 8px 12px;
      background: rgba(0, 0, 0, 0.8);
      color: white;
      border-radius: 6px;
      font-size: 12px;
      animation: fadeOut 2s forwards;
    `;
    
    // 添加动画样式
    const style = document.createElement('style');
    style.textContent = `
      @keyframes fadeOut {
        0% { opacity: 1; }
        70% { opacity: 1; }
        100% { opacity: 0; }
      }
    `;
    document.head.appendChild(style);
    
    document.body.appendChild(msg);
    
    // 2秒后移除
    setTimeout(() => {
      if (msg.parentNode) {
        msg.parentNode.removeChild(msg);
      }
    }, 2000);
  }
  
  // 页面加载完成后执行
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function() {
      setTimeout(createSpeedButton, 1000);
    });
  } else {
    setTimeout(createSpeedButton, 1000);
  }
  
  // 监听新视频出现
  const observer = new MutationObserver(function(mutations) {
    mutations.forEach(function(mutation) {
      if (mutation.addedNodes.length) {
        mutation.addedNodes.forEach(function(node) {
          if (node.nodeType === 1) { // 元素节点
            if (node.tagName === 'VIDEO' || node.querySelector('video')) {
              // 延迟一点，确保视频已加载
              setTimeout(function() {
                document.querySelectorAll('video').forEach(video => {
                  try {
                    video.playbackRate = currentSpeed;
                  } catch (e) {
                    // 忽略错误
                  }
                });
              }, 500);
            }
          }
        });
      }
    });
  });
  
  // 开始观察
  observer.observe(document.body, {
    childList: true,
    subtree: true
  });
  
  // 导出到全局，方便调试
  window.simpleVideoSpeed = {
    setSpeed: function(speed) {
      currentSpeed = speed;
      const btn = document.getElementById('simple-speed-btn');
      if (btn) btn.textContent = `${speed}x`;
      
      document.querySelectorAll('video').forEach(v => {
        try {
          v.playbackRate = speed;
        } catch (e) {
          console.error(e);
        }
      });
      
      showMessage(`设置${speed}倍速`);
    },
    getSpeed: function() {
      return currentSpeed;
    }
  };
  
  console.log('极简倍速脚本初始化完成');
})();