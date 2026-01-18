window.addEventListener("DOMContentLoaded",()=>{const t=document.createElement("script");t.src="https://www.googletagmanager.com/gtag/js?id=G-W5GKHM0893",t.async=!0,document.head.appendChild(t);const n=document.createElement("script");n.textContent="window.dataLayer = window.dataLayer || [];function gtag(){dataLayer.push(arguments);}gtag('js', new Date());gtag('config', 'G-W5GKHM0893');",document.body.appendChild(n)});// == 打包软件兼容版视频倍速控制器 ==
// 修复：在PAKE等打包软件中自动启用
// 新增：画中画功能和视频信息显示
(function() {
  'use strict';
  
  // 配置 - 修复了在打包软件中的常见问题
  const CONFIG = {
    VERSION: '3.2',
    DEFAULT_SPEED: 1.0,
    MIN_SPEED: 0.1,
    MAX_SPEED: 5.0,
    SPEED_STEP: 0.1,
    PRESET_SPEEDS: [0.5, 0.75, 1.0, 1.25, 1.5, 1.8, 2.0, 2.5, 3.0, 3.5, 4.0, 5.0],
    STORAGE_KEY: 'video_speed_master_pake',
    DOMAIN_AWARE: true,
    AUTO_APPLY: true,
    DEBUG: true,
    AUTO_START: true,
    AUTO_PIP: false, // 是否自动为视频添加画中画按钮
    SHOW_VIDEO_INFO: true // 是否显示视频信息
  };
  
  // 状态
  let state = {
    currentSpeed: CONFIG.DEFAULT_SPEED,
    isActive: true,
    domain: window.location.hostname || 'unknown',
    siteSettings: {},
    isPake: window.__PAKE__ || false,
    initialized: false,
    activeVideo: null, // 当前激活的视频
    isPipSupported: 'pictureInPictureEnabled' in document,
    videoInfoInterval: null
  };
  
  // 元素引用
  let elements = {
    panel: null,
    toggleBtn: null
  };
  
  // 调试日志
  function log(...args) {
    if (CONFIG.DEBUG) {
      console.log('[Video Speed]', ...args);
    }
  }
  
  // 错误日志
  function error(...args) {
    console.error('[Video Speed Error]', ...args);
  }
  
  // 初始化
  function init() {
    if (window.__videoSpeedController && window.__videoSpeedController.initialized) {
      log('脚本已初始化，跳过');
      return;
    }
    
    log('开始初始化视频倍速控制器 v' + CONFIG.VERSION);
    log('画中画支持:', state.isPipSupported);
    
    try {
      // 加载设置
      loadSettings();
      
      // 创建UI
      createUI();
      
      // 设置监听器
      setupListeners();
      
      // 检查画中画支持
      checkPipSupport();
      
      // 立即应用到现有视频
      setTimeout(() => {
        const applied = applyToAllVideos();
        if (CONFIG.AUTO_PIP) {
          addPipButtons();
        }
        log(`初始化完成，应用到 ${applied} 个视频，速度: ${state.currentSpeed}x`);
        
        // 开始视频信息更新
        if (CONFIG.SHOW_VIDEO_INFO) {
          startVideoInfoUpdate();
        }
      }, 100);
      
      // 标记已初始化
      state.initialized = true;
      window.__videoSpeedController = {
        version: CONFIG.VERSION,
        state: state,
        setSpeed: setSpeed,
        getSpeed: () => state.currentSpeed,
        apply: applyToAllVideos,
        getActiveVideo: () => state.activeVideo,
        requestPip: requestPip,
        exitPip: exitPip
      };
      
      showTempMessage(`🎬 视频倍速控制器 v${CONFIG.VERSION} 已加载 (${state.currentSpeed}x)`);
      
    } catch (err) {
      error('初始化失败:', err);
      showTempMessage('❌ 视频控制器初始化失败，请检查控制台');
    }
  }
  
  // 检查画中画支持
  function checkPipSupport() {
    if (!state.isPipSupported) {
      log('画中画API不支持或已被禁用');
      return false;
    }
    
    // 检查是否被策略禁用
    const testVideo = document.createElement('video');
    try {
      if (testVideo.disablePictureInPicture !== undefined) {
        log('画中画API可用');
        return true;
      }
    } catch (e) {
      log('画中画检查失败:', e.message);
    }
    return false;
  }
  
  // 请求画中画
  async function requestPip(videoElement = state.activeVideo) {
    if (!state.isPipSupported) {
      showTempMessage('❌ 您的浏览器不支持画中画功能', 3000);
      return false;
    }
    
    if (!videoElement) {
      // 尝试获取当前页面中的第一个视频
      const videos = document.querySelectorAll('video');
      if (videos.length === 0) {
        showTempMessage('❌ 未找到可用的视频元素', 3000);
        return false;
      }
      videoElement = videos[0];
    }
    
    try {
      // 检查是否已经在画中画模式
      if (document.pictureInPictureElement === videoElement) {
        await document.exitPictureInPicture();
        showTempMessage('📺 已退出画中画模式', 2000);
        return true;
      }
      
      // 如果视频没有播放，先播放
      if (videoElement.paused) {
        await videoElement.play().catch(e => {
          log('自动播放失败:', e);
        });
      }
      
      // 请求画中画
      await videoElement.requestPictureInPicture();
      
      // 更新激活的视频
      state.activeVideo = videoElement;
      
      // 监听画中画退出
      videoElement.addEventListener('leavepictureinpicture', () => {
        log('视频退出画中画模式');
        updatePipUI(false);
      });
      
      // 监听画中画进入
      videoElement.addEventListener('enterpictureinpicture', (event) => {
        log('视频进入画中画模式');
        state.activeVideo = event.target;
        updatePipUI(true);
      });
      
      showTempMessage('📺 已开启画中画模式', 2000);
      return true;
      
    } catch (err) {
      error('画中画请求失败:', err);
      
      // 根据错误类型给出友好提示
      let errorMsg = '画中画请求失败';
      if (err.name === 'NotAllowedError') {
        errorMsg = '用户拒绝了画中画请求';
      } else if (err.name === 'InvalidStateError') {
        errorMsg = '视频不可用（可能被禁用）';
      } else if (err.name === 'NotSupportedError') {
        errorMsg = '浏览器不支持画中画';
      }
      
      showTempMessage(`❌ ${errorMsg}`, 3000);
      return false;
    }
  }
  
  // 退出画中画
  async function exitPip() {
    if (!document.pictureInPictureElement) {
      return false;
    }
    
    try {
      await document.exitPictureInPicture();
      showTempMessage('📺 已退出画中画模式', 2000);
      updatePipUI(false);
      return true;
    } catch (err) {
      error('退出画中画失败:', err);
      showTempMessage('❌ 退出画中画失败', 2000);
      return false;
    }
  }
  
  // 更新画中画UI状态
  function updatePipUI(isInPip) {
    if (!elements.panel) return;
    
    const pipBtn = document.getElementById('vsPipToggle');
    const pipStatus = document.getElementById('vsPipStatus');
    
    if (pipBtn) {
      pipBtn.innerHTML = isInPip ? '📺 退出画中画' : '📺 进入画中画';
      pipBtn.className = isInPip ? 'vs-action-btn pip-active' : 'vs-action-btn';
    }
    
    if (pipStatus) {
      pipStatus.textContent = isInPip ? '画中画中' : '正常模式';
      pipStatus.style.color = isInPip ? '#4CAF50' : '#888';
    }
  }
  
  // 添加画中画按钮到视频
  function addPipButtons() {
    if (!state.isPipSupported) return;
    
    const videos = document.querySelectorAll('video');
    videos.forEach(video => {
      // 如果已经添加过按钮，跳过
      if (video.hasAttribute('data-vspeed-pip-btn')) return;
      
      // 创建画中画按钮容器
      const pipBtnContainer = document.createElement('div');
      pipBtnContainer.className = 'vs-pip-button-container';
      pipBtnContainer.style.cssText = `
        position: absolute;
        top: 10px;
        right: 10px;
        z-index: 9999;
        opacity: 0;
        transition: opacity 0.3s;
      `;
      
      const pipBtn = document.createElement('button');
      pipBtn.className = 'vs-pip-button';
      pipBtn.innerHTML = '📺';
      pipBtn.title = '点击开启画中画模式';
      pipBtn.style.cssText = `
        background: rgba(0, 0, 0, 0.7);
        color: white;
        border: none;
        border-radius: 4px;
        width: 36px;
        height: 36px;
        font-size: 18px;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        backdrop-filter: blur(5px);
        transition: all 0.2s;
      `;
      
      pipBtn.addEventListener('mouseenter', () => {
        pipBtn.style.background = 'rgba(76, 175, 80, 0.9)';
        pipBtn.style.transform = 'scale(1.1)';
      });
      
      pipBtn.addEventListener('mouseleave', () => {
        pipBtn.style.background = 'rgba(0, 0, 0, 0.7)';
        pipBtn.style.transform = 'scale(1)';
      });
      
      pipBtn.addEventListener('click', async (e) => {
        e.stopPropagation();
        state.activeVideo = video;
        await requestPip(video);
      });
      
      pipBtnContainer.appendChild(pipBtn);
      
      // 设置视频容器为相对定位
      const videoContainer = video.parentElement;
      if (videoContainer && window.getComputedStyle(videoContainer).position === 'static') {
        videoContainer.style.position = 'relative';
      } else if (!videoContainer) {
        video.style.position = 'relative';
        video.appendChild(pipBtnContainer);
      } else {
        videoContainer.appendChild(pipBtnContainer);
      }
      
      // 鼠标移入显示按钮
      video.addEventListener('mouseenter', () => {
        pipBtnContainer.style.opacity = '1';
      });
      
      video.addEventListener('mouseleave', () => {
        pipBtnContainer.style.opacity = '0';
      });
      
      video.setAttribute('data-vspeed-pip-btn', 'true');
    });
  }
  
  // 开始视频信息更新
  function startVideoInfoUpdate() {
    if (state.videoInfoInterval) {
      clearInterval(state.videoInfoInterval);
    }
    
    state.videoInfoInterval = setInterval(() => {
      updateVideoInfo();
    }, 1000);
  }
  
  // 更新视频信息显示
  function updateVideoInfo() {
    if (!elements.panel) return;
    
    const videoInfoEl = document.getElementById('vsVideoInfoContent');
    if (!videoInfoEl) return;
    
    const videos = document.querySelectorAll('video');
    
    if (videos.length === 0) {
      videoInfoEl.innerHTML = '<div style="color: #888; text-align: center; padding: 10px;">未检测到视频元素</div>';
      return;
    }
    
    let infoHTML = '';
    
    videos.forEach((video, index) => {
      const isActive = state.activeVideo === video;
      const isPip = document.pictureInPictureElement === video;
      
      infoHTML += `
        <div class="vs-video-item ${isActive ? 'active' : ''} ${isPip ? 'pip-mode' : ''}" 
             style="margin-bottom: 10px; padding: 10px; background: rgba(255,255,255,0.05); border-radius: 6px; border-left: 3px solid ${isActive ? '#6c9eff' : 'transparent'}">
          <div style="display: flex; justify-content: space-between; margin-bottom: 5px;">
            <strong style="color: ${isActive ? '#6c9eff' : '#ccc'}">视频 #${index + 1}</strong>
            <div>
              ${isPip ? '<span style="color: #4CAF50; font-size: 12px;">📺 PIP</span>' : ''}
              ${isActive ? '<span style="color: #6c9eff; font-size: 12px;">● 激活</span>' : ''}
            </div>
          </div>
          <div style="font-size: 12px; line-height: 1.4; color: #aaa;">
            <div>分辨率: ${video.videoWidth}×${video.videoHeight}</div>
            <div>时长: ${formatTime(video.duration)}</div>
            <div>当前: ${formatTime(video.currentTime)}</div>
            <div>速度: ${video.playbackRate.toFixed(2)}x</div>
            <div>音量: ${Math.round(video.volume * 100)}% ${video.muted ? '(静音)' : ''}</div>
            <div style="margin-top: 5px;">
              <button class="vs-video-action-btn" data-action="activate" data-index="${index}" 
                      style="margin-right: 5px; padding: 2px 8px; font-size: 11px;">激活</button>
              ${state.isPipSupported ? 
                `<button class="vs-video-action-btn" data-action="pip" data-index="${index}" 
                        style="margin-right: 5px; padding: 2px 8px; font-size: 11px;">${isPip ? '退出PIP' : '画中画'}</button>` : ''}
              <button class="vs-video-action-btn" data-action="fullscreen" data-index="${index}" 
                      style="padding: 2px 8px; font-size: 11px;">全屏</button>
            </div>
          </div>
        </div>
      `;
    });
    
    videoInfoEl.innerHTML = infoHTML;
    
    // 绑定按钮事件
    videoInfoEl.querySelectorAll('.vs-video-action-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const action = btn.dataset.action;
        const index = parseInt(btn.dataset.index);
        const videos = document.querySelectorAll('video');
        const video = videos[index];
        
        if (!video) return;
        
        switch(action) {
          case 'activate':
            state.activeVideo = video;
            showTempMessage(`✅ 已激活视频 #${index + 1}`, 1500);
            break;
          case 'pip':
            if (document.pictureInPictureElement === video) {
              exitPip();
            } else {
              state.activeVideo = video;
              requestPip(video);
            }
            break;
          case 'fullscreen':
            toggleFullscreen(video);
            break;
        }
      });
    });
  }
  
  // 格式化时间
  function formatTime(seconds) {
    if (!isFinite(seconds) || seconds <= 0) return '00:00';
    
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    
    if (hours > 0) {
      return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }
  
  // 切换全屏
  function toggleFullscreen(element) {
    if (!document.fullscreenElement) {
      if (element.requestFullscreen) {
        element.requestFullscreen();
      } else if (element.webkitRequestFullscreen) {
        element.webkitRequestFullscreen();
      } else if (element.mozRequestFullScreen) {
        element.mozRequestFullScreen();
      } else if (element.msRequestFullscreen) {
        element.msRequestFullscreen();
      }
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
      } else if (document.webkitExitFullscreen) {
        document.webkitExitFullscreen();
      } else if (document.mozCancelFullScreen) {
        document.mozCancelFullScreen();
      } else if (document.msExitFullscreen) {
        document.msExitFullscreen();
      }
    }
  }
  
  // 加载设置
  function loadSettings() {
    try {
      const saved = localStorage.getItem(CONFIG.STORAGE_KEY);
      if (saved) {
        const data = JSON.parse(saved);
        
        if (CONFIG.DOMAIN_AWARE && data.siteSettings) {
          state.siteSettings = data.siteSettings;
          if (state.siteSettings[state.domain]) {
            state.currentSpeed = parseFloat(state.siteSettings[state.domain].speed) || CONFIG.DEFAULT_SPEED;
            log(`从 ${state.domain} 加载设置: ${state.currentSpeed}x`);
          }
        } else if (data.globalSpeed) {
          state.currentSpeed = parseFloat(data.globalSpeed) || CONFIG.DEFAULT_SPEED;
        }
        
        // 确保速度在有效范围内
        state.currentSpeed = Math.max(CONFIG.MIN_SPEED, 
          Math.min(CONFIG.MAX_SPEED, state.currentSpeed));
      }
    } catch (e) {
      error('加载设置失败:', e);
    }
  }
  
  // 保存设置
  function saveSettings() {
    try {
      let data = {};
      
      if (CONFIG.DOMAIN_AWARE) {
        state.siteSettings[state.domain] = {
          speed: state.currentSpeed,
          updated: Date.now()
        };
        data.siteSettings = state.siteSettings;
      } else {
        data.globalSpeed = state.currentSpeed;
      }
      
      data.lastUpdated = Date.now();
      localStorage.setItem(CONFIG.STORAGE_KEY, JSON.stringify(data));
      log(`保存设置: ${state.currentSpeed}x`);
    } catch (e) {
      error('保存设置失败:', e);
    }
  }
  
  // 设置速度
  function setSpeed(speed, options = {}) {
    if (!state.isActive) return;
    
    speed = parseFloat(speed);
    if (isNaN(speed)) {
      showTempMessage('❌ 无效的速度值', 2000);
      return;
    }
    
    // 限制范围
    speed = Math.max(CONFIG.MIN_SPEED, Math.min(CONFIG.MAX_SPEED, speed));
    
    const oldSpeed = state.currentSpeed;
    state.currentSpeed = speed;
    
    // 应用到视频
    applyToAllVideos();
    
    // 保存设置
    if (options.save !== false) {
      saveSettings();
    }
    
    // 更新UI
    updateUI();
    
    // 显示通知
    if (Math.abs(oldSpeed - speed) > 0.05) {
      showTempMessage(`⚡ 速度: ${speed.toFixed(1)}x`, 1500);
    }
    
    return speed;
  }
  
  // 应用到所有视频
  function applyToAllVideos() {
    if (!CONFIG.AUTO_APPLY || !state.isActive) return 0;
    
    const videos = document.querySelectorAll('video');
    let appliedCount = 0;
    
    videos.forEach(video => {
      try {
        // 跳过已应用相同速度的视频
        const lastApplied = video.getAttribute('data-vspeed-applied');
        if (lastApplied && Math.abs(parseFloat(lastApplied) - state.currentSpeed) < 0.01) {
          return;
        }
        
        // 设置速度
        video.playbackRate = state.currentSpeed;
        video.setAttribute('data-vspeed-applied', state.currentSpeed.toFixed(2));
        
        // 添加监听器（只加一次）
        if (!video.hasAttribute('data-vspeed-listener')) {
          // 监听视频加载
          video.addEventListener('loadedmetadata', function() {
            setTimeout(() => {
              this.playbackRate = state.currentSpeed;
              this.setAttribute('data-vspeed-applied', state.currentSpeed.toFixed(2));
            }, 50);
          });
          
          // 防止用户修改
          video.addEventListener('ratechange', function() {
            if (Math.abs(this.playbackRate - state.currentSpeed) > 0.01) {
              setTimeout(() => {
                this.playbackRate = state.currentSpeed;
                this.setAttribute('data-vspeed-applied', state.currentSpeed.toFixed(2));
              }, 50);
            }
          });
          
          // 监听视频点击，设置为激活视频
          video.addEventListener('click', () => {
            state.activeVideo = video;
            log(`激活视频: ${video.src.substring(0, 50)}...`);
          });
          
          // 监听画中画变化
          video.addEventListener('enterpictureinpicture', (event) => {
            state.activeVideo = event.target;
            updatePipUI(true);
            log('视频进入画中画模式');
          });
          
          video.addEventListener('leavepictureinpicture', () => {
            updatePipUI(false);
            log('视频退出画中画模式');
          });
          
          video.setAttribute('data-vspeed-listener', 'true');
        }
        
        appliedCount++;
        
      } catch (e) {
        error('应用速度失败:', e);
      }
    });
    
    return appliedCount;
  }
  
  // 设置监听器
  function setupListeners() {
    // 监听DOM变化
    const observer = new MutationObserver((mutations) => {
      let hasVideo = false;
      
      for (const mutation of mutations) {
        for (const node of mutation.addedNodes) {
          if (node.nodeName === 'VIDEO' || 
              (node.querySelector && node.querySelector('video'))) {
            hasVideo = true;
            break;
          }
        }
        
        if (mutation.type === 'attributes' && 
            mutation.target.nodeName === 'VIDEO' &&
            mutation.attributeName === 'src') {
          hasVideo = true;
        }
        
        if (hasVideo) break;
      }
      
      if (hasVideo) {
        setTimeout(() => {
          const count = applyToAllVideos();
          if (CONFIG.AUTO_PIP) {
            addPipButtons();
          }
          if (count > 0) {
            log(`检测到新视频，应用速度到 ${count} 个视频`);
          }
        }, 300);
      }
    });
    
    // 开始观察
    try {
      observer.observe(document.body, {
        childList: true,
        subtree: true,
        attributes: true,
        attributeFilter: ['src']
      });
      log('DOM监听器已启动');
    } catch (e) {
      error('启动DOM监听器失败:', e);
    }
    
    // 监听页面可见性变化
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden) {
        setTimeout(() => {
          applyToAllVideos();
          updateVideoInfo();
        }, 500);
      }
    });
    
    // 监听键盘快捷键
    document.addEventListener('keydown', (e) => {
      if (e.target.tagName.match(/INPUT|TEXTAREA|SELECT/)) return;
      
      switch(e.key) {
        case 'F2':
          e.preventDefault();
          togglePanel();
          break;
        case ']':
        case '}':
          e.preventDefault();
          setSpeed(state.currentSpeed + 0.1);
          break;
        case '[':
        case '{':
          e.preventDefault();
          setSpeed(Math.max(CONFIG.MIN_SPEED, state.currentSpeed - 0.1));
          break;
        case '\\':
        case '|':
          e.preventDefault();
          setSpeed(1.0);
          break;
        case 'P':
        case 'p':
          if (e.ctrlKey || e.metaKey) {
            e.preventDefault();
            requestPip();
          }
          break;
        case 'Escape':
          if (document.pictureInPictureElement) {
            exitPip();
          }
          break;
      }
    });
    
    // 监听画中画变化
    document.addEventListener('enterpictureinpicture', (event) => {
      state.activeVideo = event.target;
      updatePipUI(true);
    });
    
    document.addEventListener('leavepictureinpicture', () => {
      updatePipUI(false);
    });
    
    log('事件监听器已设置');
  }
  
  // 创建UI
  function createUI() {
    // 添加CSS样式
    const style = document.createElement('style');
    style.textContent = `
      .vs-panel {
        position: fixed;
        top: 20px;
        right: 20px;
        width: 350px;
        background: rgba(20, 20, 30, 0.95);
        color: #fff;
        border-radius: 10px;
        box-shadow: 0 5px 30px rgba(0, 0, 0, 0.5);
        z-index: 1000000;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
        font-size: 13px;
        backdrop-filter: blur(10px);
        border: 1px solid rgba(100, 150, 255, 0.2);
        user-select: none;
        display: none;
        max-height: 80vh;
        overflow-y: auto;
      }
      
      .vs-header {
        padding: 12px 15px;
        background: rgba(0, 0, 0, 0.3);
        border-bottom: 1px solid rgba(255, 255, 255, 0.1);
        display: flex;
        justify-content: space-between;
        align-items: center;
        cursor: move;
        border-radius: 10px 10px 0 0;
        position: sticky;
        top: 0;
        z-index: 1;
      }
      
      .vs-title {
        font-weight: 600;
        color: #6c9eff;
        font-size: 13px;
        display: flex;
        align-items: center;
        gap: 8px;
      }
      
      .vs-close {
        background: none;
        border: none;
        color: #aaa;
        font-size: 20px;
        cursor: pointer;
        padding: 0;
        width: 24px;
        height: 24px;
        display: flex;
        align-items: center;
        justify-content: center;
      }
      
      .vs-close:hover {
        color: #fff;
      }
      
      .vs-body {
        padding: 15px;
      }
      
      .vs-section {
        margin-bottom: 20px;
        padding-bottom: 15px;
        border-bottom: 1px solid rgba(255, 255, 255, 0.1);
      }
      
      .vs-section-title {
        font-size: 12px;
        color: #888;
        margin-bottom: 8px;
        display: flex;
        justify-content: space-between;
        align-items: center;
      }
      
      .vs-current {
        text-align: center;
        margin-bottom: 20px;
        padding: 10px;
        background: rgba(0, 0, 0, 0.2);
        border-radius: 8px;
      }
      
      .vs-current-value {
        font-size: 28px;
        font-weight: bold;
        color: #6c9eff;
        margin: 5px 0;
      }
      
      .vs-domain {
        font-size: 11px;
        color: #888;
        font-family: monospace;
      }
      
      .vs-presets {
        display: grid;
        grid-template-columns: repeat(4, 1fr);
        gap: 5px;
        margin-bottom: 15px;
      }
      
      .vs-preset-btn {
        padding: 8px 4px;
        background: rgba(255, 255, 255, 0.05);
        border: 1px solid rgba(255, 255, 255, 0.1);
        border-radius: 6px;
        color: #aaa;
        cursor: pointer;
        font-size: 12px;
        transition: all 0.2s;
      }
      
      .vs-preset-btn:hover {
        background: rgba(255, 255, 255, 0.1);
        color: #fff;
      }
      
      .vs-preset-btn.active {
        background: #6c9eff;
        color: #fff;
        border-color: #6c9eff;
      }
      
      .vs-slider {
        width: 100%;
        height: 6px;
        border-radius: 3px;
        background: rgba(255, 255, 255, 0.1);
        margin: 15px 0;
        -webkit-appearance: none;
      }
      
      .vs-slider::-webkit-slider-thumb {
        -webkit-appearance: none;
        width: 20px;
        height: 20px;
        border-radius: 50%;
        background: #6c9eff;
        cursor: pointer;
        border: 3px solid rgba(255, 255, 255, 0.3);
      }
      
      .vs-input {
        width: 100%;
        padding: 8px 10px;
        background: rgba(255, 255, 255, 0.1);
        border: 1px solid rgba(255, 255, 255, 0.2);
        border-radius: 6px;
        color: #fff;
        font-size: 13px;
        text-align: center;
        box-sizing: border-box;
      }
      
      .vs-input:focus {
        outline: none;
        border-color: #6c9eff;
      }
      
      .vs-actions {
        display: grid;
        grid-template-columns: repeat(2, 1fr);
        gap: 8px;
        margin-top: 15px;
      }
      
      .vs-action-btn {
        padding: 8px 10px;
        background: rgba(100, 150, 255, 0.1);
        border: 1px solid rgba(100, 150, 255, 0.3);
        border-radius: 6px;
        color: #6c9eff;
        cursor: pointer;
        font-size: 12px;
        transition: all 0.2s;
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 5px;
      }
      
      .vs-action-btn:hover {
        background: rgba(100, 150, 255, 0.2);
      }
      
      .vs-action-btn.pip-active {
        background: rgba(76, 175, 80, 0.2);
        color: #4CAF50;
        border-color: rgba(76, 175, 80, 0.3);
      }
      
      .vs-pip-info {
        font-size: 12px;
        color: #4CAF50;
        text-align: center;
        margin-top: 5px;
        padding: 5px;
        background: rgba(76, 175, 80, 0.1);
        border-radius: 4px;
        border: 1px solid rgba(76, 175, 80, 0.2);
      }
      
      .vs-video-info-content {
        max-height: 200px;
        overflow-y: auto;
        padding-right: 5px;
      }
      
      .vs-video-info-content::-webkit-scrollbar {
        width: 4px;
      }
      
      .vs-video-info-content::-webkit-scrollbar-track {
        background: rgba(255, 255, 255, 0.05);
        border-radius: 2px;
      }
      
      .vs-video-info-content::-webkit-scrollbar-thumb {
        background: rgba(108, 158, 255, 0.5);
        border-radius: 2px;
      }
      
      .vs-video-item:hover {
        background: rgba(255, 255, 255, 0.08) !important;
      }
      
      .vs-video-item.active {
        border-left-color: #6c9eff !important;
      }
      
      .vs-video-item.pip-mode {
        border-left-color: #4CAF50 !important;
      }
      
      .vs-video-action-btn {
        background: rgba(108, 158, 255, 0.1);
        border: 1px solid rgba(108, 158, 255, 0.3);
        color: #6c9eff;
        border-radius: 4px;
        cursor: pointer;
        transition: all 0.2s;
      }
      
      .vs-video-action-btn:hover {
        background: rgba(108, 158, 255, 0.2);
      }
      
      .vs-toggle-btn {
        position: fixed;
        bottom: 20px;
        right: 20px;
        width: 50px;
        height: 50px;
        background: linear-gradient(135deg, #667eea, #764ba2);
        color: white;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        font-size: 22px;
        z-index: 999999;
        box-shadow: 0 4px 15px rgba(0, 0, 0, 0.3);
        transition: all 0.3s;
        user-select: none;
      }
      
      .vs-toggle-btn:hover {
        transform: scale(1.1);
        box-shadow: 0 6px 20px rgba(0, 0, 0, 0.4);
      }
      
      .vs-notification {
        position: fixed;
        top: 20px;
        left: 50%;
        transform: translateX(-50%);
        padding: 10px 20px;
        background: rgba(20, 20, 30, 0.95);
        color: white;
        border-radius: 8px;
        font-size: 13px;
        z-index: 1000001;
        backdrop-filter: blur(10px);
        border: 1px solid rgba(100, 150, 255, 0.3);
        box-shadow: 0 5px 20px rgba(0, 0, 0, 0.3);
        animation: vsSlideDown 0.3s ease;
        max-width: 80%;
        text-align: center;
      }
      
      @keyframes vsSlideDown {
        from { top: -50px; opacity: 0; }
        to { top: 20px; opacity: 1; }
      }
      
      .pip-badge {
        position: absolute;
        top: 5px;
        right: 5px;
        background: rgba(76, 175, 80, 0.9);
        color: white;
        font-size: 10px;
        padding: 2px 6px;
        border-radius: 3px;
        z-index: 10000;
      }
    `;
    
    document.head.appendChild(style);
    
    // 创建控制面板
    const panel = document.createElement('div');
    panel.className = 'vs-panel';
    panel.id = 'videoSpeedPanel';
    
    panel.innerHTML = `
      <div class="vs-header">
        <div class="vs-title">
          <span>🎬 视频倍速控制</span>
          <span style="font-size: 10px; color: #4CAF50; background: rgba(76, 175, 80, 0.1); padding: 2px 6px; border-radius: 3px;">v${CONFIG.VERSION}</span>
        </div>
        <button class="vs-close" id="vsCloseBtn">×</button>
      </div>
      <div class="vs-body">
        <div class="vs-section">
          <div class="vs-current">
            <div style="font-size: 12px; color: #888; margin-bottom: 5px;">当前速度</div>
            <div class="vs-current-value" id="vsCurrentSpeed">${state.currentSpeed.toFixed(1)}x</div>
            <div class="vs-domain" id="vsDomain">${state.domain}</div>
            <div id="vsPipStatus" style="font-size: 11px; color: #888; margin-top: 5px;">
              ${state.isPipSupported ? '画中画: 已支持' : '画中画: 不支持'}
            </div>
          </div>
        </div>
        
        <div class="vs-section">
          <div class="vs-section-title">预设速度</div>
          <div class="vs-presets" id="vsPresets">
            ${CONFIG.PRESET_SPEEDS.map(speed => 
              `<button class="vs-preset-btn" data-speed="${speed}">${speed}x</button>`
            ).join('')}
          </div>
        </div>
        
        <div class="vs-section">
          <div class="vs-section-title">自定义速度</div>
          <input type="range" class="vs-slider" id="vsSpeedSlider" 
                 min="${CONFIG.MIN_SPEED}" max="${CONFIG.MAX_SPEED}" 
                 step="${CONFIG.SPEED_STEP}" value="${state.currentSpeed}">
          <input type="number" class="vs-input" id="vsSpeedInput" 
                 min="${CONFIG.MIN_SPEED}" max="${CONFIG.MAX_SPEED}" 
                 step="${CONFIG.SPEED_STEP}" value="${state.currentSpeed}">
        </div>
        
        <div class="vs-section">
          <div class="vs-section-title">画中画控制</div>
          <div class="vs-actions">
            <button class="vs-action-btn" id="vsPipToggle" ${!state.isPipSupported ? 'disabled' : ''}>
              ${document.pictureInPictureElement ? '📺 退出画中画' : '📺 进入画中画'}
            </button>
            <button class="vs-action-btn" id="vsActivateFirst">🎯 激活首个</button>
            <button class="vs-action-btn" id="vsSpeedUp">⏫ 加快</button>
            <button class="vs-action-btn" id="vsSpeedDown">⏬ 减慢</button>
            <button class="vs-action-btn" id="vsReset">🔄 重置</button>
            <button class="vs-action-btn" id="vsApplyNow">⚡ 立即应用</button>
          </div>
          ${state.isPipSupported ? `
            <div id="vsPipInfo" style="font-size: 11px; color: #888; margin-top: 8px; text-align: center;">
              快捷键: Ctrl/Cmd + P
            </div>
          ` : ''}
        </div>
        
        <div class="vs-section">
          <div class="vs-section-title">
            <span>视频信息</span>
            <span id="vsVideoCount" style="font-size: 11px; color: #6c9eff;">(0)</span>
          </div>
          <div class="vs-video-info-content" id="vsVideoInfoContent">
            <div style="color: #888; text-align: center; padding: 20px 0;">
              正在检测视频...
            </div>
          </div>
        </div>
        
        <div style="margin-top: 15px; padding-top: 15px; border-top: 1px solid rgba(255,255,255,0.1);">
          <div style="font-size: 11px; color: #666; text-align: center;">
            快捷键: F2 面板 | [ 减慢 | ] 加快 | \\ 重置 | Ctrl+P 画中画
          </div>
        </div>
      </div>
    `;
    
    document.body.appendChild(panel);
    elements.panel = panel;
    
    // 创建切换按钮
    const toggleBtn = document.createElement('div');
    toggleBtn.className = 'vs-toggle-btn';
    toggleBtn.innerHTML = '🎬';
    toggleBtn.title = `视频倍速控制 (F2)\n当前: ${state.currentSpeed.toFixed(1)}x`;
    toggleBtn.id = 'vsToggleBtn';
    
    toggleBtn.addEventListener('click', togglePanel);
    document.body.appendChild(toggleBtn);
    elements.toggleBtn = toggleBtn;
    
    // 绑定面板事件
    bindPanelEvents(panel);
    
    // 初始化拖拽
    initDrag(panel);
    
    log('UI 创建完成');
  }
  
  // 绑定面板事件
  function bindPanelEvents(panel) {
    // 关闭按钮
    panel.querySelector('#vsCloseBtn').addEventListener('click', () => {
      panel.style.display = 'none';
      if (state.videoInfoInterval) {
        clearInterval(state.videoInfoInterval);
        state.videoInfoInterval = null;
      }
    });
    
    // 预设速度按钮
    panel.querySelectorAll('.vs-preset-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const speed = parseFloat(btn.dataset.speed);
        setSpeed(speed);
      });
    });
    
    // 速度滑块
    const slider = panel.querySelector('#vsSpeedSlider');
    const input = panel.querySelector('#vsSpeedInput');
    
    slider.addEventListener('input', () => {
      const speed = parseFloat(slider.value);
      input.value = speed.toFixed(1);
      setSpeed(speed, { save: false });
    });
    
    slider.addEventListener('change', () => {
      const speed = parseFloat(slider.value);
      setSpeed(speed);
    });
    
    input.addEventListener('change', () => {
      const speed = parseFloat(input.value);
      if (!isNaN(speed)) {
        slider.value = speed;
        setSpeed(speed);
      }
    });
    
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        const speed = parseFloat(input.value);
        if (!isNaN(speed)) {
          slider.value = speed;
          setSpeed(speed);
        }
      }
    });
    
    // 画中画按钮
    const pipBtn = panel.querySelector('#vsPipToggle');
    if (pipBtn) {
      pipBtn.addEventListener('click', async () => {
        if (document.pictureInPictureElement) {
          await exitPip();
        } else {
          await requestPip();
        }
      });
    }
    
    // 激活首个视频按钮
    panel.querySelector('#vsActivateFirst').addEventListener('click', () => {
      const videos = document.querySelectorAll('video');
      if (videos.length > 0) {
        state.activeVideo = videos[0];
        showTempMessage(`✅ 已激活首个视频 (共 ${videos.length} 个)`, 1500);
        updateVideoInfo();
      } else {
        showTempMessage('❌ 未找到视频元素', 1500);
      }
    });
    
    // 控制按钮
    panel.querySelector('#vsSpeedUp').addEventListener('click', () => {
      setSpeed(state.currentSpeed + 0.1);
    });
    
    panel.querySelector('#vsSpeedDown').addEventListener('click', () => {
      setSpeed(Math.max(CONFIG.MIN_SPEED, state.currentSpeed - 0.1));
    });
    
    panel.querySelector('#vsReset').addEventListener('click', () => {
      setSpeed(1.0);
    });
    
    panel.querySelector('#vsApplyNow').addEventListener('click', () => {
      const count = applyToAllVideos();
      if (CONFIG.AUTO_PIP) {
        addPipButtons();
      }
      showTempMessage(`✅ 已应用到 ${count} 个视频`, 1500);
    });
  }
  
  // 初始化拖拽
  function initDrag(element) {
    let isDragging = false;
    let offsetX, offsetY;
    
    const header = element.querySelector('.vs-header');
    
    header.addEventListener('mousedown', (e) => {
      isDragging = true;
      offsetX = e.clientX - element.offsetLeft;
      offsetY = e.clientY - element.offsetTop;
      document.addEventListener('mousemove', drag);
      document.addEventListener('mouseup', stopDrag);
    });
    
    function drag(e) {
      if (!isDragging) return;
      element.style.left = (e.clientX - offsetX) + 'px';
      element.style.top = (e.clientY - offsetY) + 'px';
      element.style.right = 'auto';
      element.style.bottom = 'auto';
    }
    
    function stopDrag() {
      isDragging = false;
      document.removeEventListener('mousemove', drag);
      document.removeEventListener('mouseup', stopDrag);
    }
  }
  
  // 更新UI
  function updateUI() {
    if (!elements.panel) return;
    
    // 更新速度显示
    const speedValue = elements.panel.querySelector('#vsCurrentSpeed');
    const slider = elements.panel.querySelector('#vsSpeedSlider');
    const input = elements.panel.querySelector('#vsSpeedInput');
    
    if (speedValue) speedValue.textContent = state.currentSpeed.toFixed(1) + 'x';
    if (slider) slider.value = state.currentSpeed;
    if (input) input.value = state.currentSpeed.toFixed(1);
    
    // 更新预设按钮状态
    if (elements.panel.querySelectorAll) {
      elements.panel.querySelectorAll('.vs-preset-btn').forEach(btn => {
        const btnSpeed = parseFloat(btn.dataset.speed);
        if (Math.abs(btnSpeed - state.currentSpeed) < 0.05) {
          btn.classList.add('active');
        } else {
          btn.classList.remove('active');
        }
      });
    }
    
    // 更新视频计数
    const videoCount = document.querySelectorAll('video').length;
    const countEl = document.getElementById('vsVideoCount');
    if (countEl) {
      countEl.textContent = `(${videoCount})`;
    }
    
    // 更新切换按钮提示
    if (elements.toggleBtn) {
      elements.toggleBtn.title = `视频倍速控制 (F2)\n当前: ${state.currentSpeed.toFixed(1)}x\n视频: ${videoCount}个`;
    }
  }
  
  // 切换面板显示
  function togglePanel() {
    if (!elements.panel) return;
    
    if (elements.panel.style.display === 'none' || !elements.panel.style.display) {
      elements.panel.style.display = 'block';
      // 启动视频信息更新定时器
      if (CONFIG.SHOW_VIDEO_INFO) {
        startVideoInfoUpdate();
      }
      // 确保面板在可见区域
      const rect = elements.panel.getBoundingClientRect();
      if (rect.right > window.innerWidth || rect.bottom > window.innerHeight) {
        elements.panel.style.left = '20px';
        elements.panel.style.top = '20px';
        elements.panel.style.right = 'auto';
        elements.panel.style.bottom = 'auto';
      }
    } else {
      elements.panel.style.display = 'none';
      if (state.videoInfoInterval) {
        clearInterval(state.videoInfoInterval);
        state.videoInfoInterval = null;
      }
    }
  }
  
  // 显示临时消息
  function showTempMessage(message, duration = 2000) {
    const existing = document.getElementById('vsNotification');
    if (existing) {
      document.body.removeChild(existing);
    }
    
    const notification = document.createElement('div');
    notification.id = 'vsNotification';
    notification.className = 'vs-notification';
    notification.textContent = message;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
      if (notification.parentNode) {
        document.body.removeChild(notification);
      }
    }, duration);
  }
  
  // 启动脚本
  function start() {
    // 检查是否在iframe中
    if (window.self !== window.top) {
      log('脚本在iframe中运行，可能无法控制父页面视频');
    }
    
    // 等待页面基本就绪
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', init);
      log('等待DOMContentLoaded事件');
    } else {
      // 延迟初始化，确保页面完全加载
      setTimeout(init, 500);
    }
  }
  
  // 立即启动
  if (CONFIG.AUTO_START) {
    start();
  }
  
  // 提供手动启动接口
  window.startVideoSpeedController = start;
  
  // 提供全局API
  window.videoSpeed = {
    set: setSpeed,
    get: () => state.currentSpeed,
    show: () => {
      if (elements.panel) {
        elements.panel.style.display = 'block';
        if (CONFIG.SHOW_VIDEO_INFO) {
          startVideoInfoUpdate();
        }
      } else {
        createUI();
        elements.panel.style.display = 'block';
      }
    },
    hide: () => {
      if (elements.panel) {
        elements.panel.style.display = 'none';
        if (state.videoInfoInterval) {
          clearInterval(state.videoInfoInterval);
          state.videoInfoInterval = null;
        }
      }
    },
    pip: {
      request: requestPip,
      exit: exitPip,
      isSupported: state.isPipSupported
    },
    getVideos: () => document.querySelectorAll('video'),
    getActiveVideo: () => state.activeVideo
  };
  
  log('脚本加载完成，等待初始化...');
  console.log('🎬 视频倍速控制器 v' + CONFIG.VERSION + ' 已加载');
  console.log('📺 画中画功能: ' + (state.isPipSupported ? '已启用' : '不支持'));
  console.log('📋 使用方法:');
  console.log('1. 设置速度后会自动保存');
  console.log('2. 新视频会自动应用设置');
  console.log('3. 快捷键: F2 面板, [ 减慢, ] 加快, \\ 重置, Ctrl+P 画中画');
  console.log('4. 全局API: window.videoSpeed.set(2.0)');
  console.log('5. 画中画API: window.videoSpeed.pip.request()');
  
})();