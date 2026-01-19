window.addEventListener("DOMContentLoaded",()=>{const t=document.createElement("script");t.src="https://www.googletagmanager.com/gtag/js?id=G-W5GKHM0893",t.async=!0,document.head.appendChild(t);const n=document.createElement("script");n.textContent="window.dataLayer = window.dataLayer || [];function gtag(){dataLayer.push(arguments);}gtag('js', new Date());gtag('config', 'G-W5GKHM0893');",document.body.appendChild(n)});// ==UserScript==
// @name         视频增强工具（含 FPS 显示）
// @namespace    http://tampermonkey.net/
// @version      1.6
// @description  倍速+亮度+音量+FPS+详情+锁定+可折叠
// @author       Qwen
// @match        *://*/*
// @grant        none
// ==/UserScript==

(function () {
  'use strict';

  const SPEED_KEY = 'customPlaybackRate';
  const BRIGHT_KEY = 'customBrightness';
  const VOLUME_KEY = 'customVolume';

  const MIN_RATE = 1.0;
  const MAX_RATE = 5.0;

  let panelVisible = false;
  let mainDiv = null;
  const watchedVideos = new WeakSet();
  let brightnessOverlay = null;

  // === FPS 计算变量 ===
  let fps = 0;
  let frameCount = 0;
  let lastFpsUpdate = performance.now();

  function startFpsCounter() {
    const tick = () => {
      frameCount++;
      const now = performance.now();
      if (now - lastFpsUpdate >= 1000) {
        fps = Math.round((frameCount * 1000) / (now - lastFpsUpdate));
        frameCount = 0;
        lastFpsUpdate = now;
      }
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }

  // === 工具函数 ===
  const formatTime = (s) => {
    if (isNaN(s)) return '00:00';
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const sec = Math.floor(s % 60);
    return h ? `${h}:${m.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`
             : `${m}:${sec.toString().padStart(2, '0')}`;
  };

  const extractTitle = () => {
    const selectors = [
      'h1.ytd-video-primary-info-renderer',
      'h1.video-title',
      'h1.title',
      'meta[property="og:title"]',
      'title'
    ];
    for (const sel of selectors) {
      const el = document.querySelector(sel);
      if (el) {
        if (sel.includes('meta')) return el.getAttribute('content') || '';
        if (sel === 'title') return el.textContent.replace(/\s*-\s*(YouTube|哔哩哔哩|Bilibili).*$/i, '').trim();
        return el.textContent.trim();
      }
    }
    return '未知标题';
  };

  function getAllVideos() {
    const videos = Array.from(document.querySelectorAll('video'));
    function searchShadow(root) {
      if (!root?.shadowRoot) return;
      const shadowVideos = root.shadowRoot.querySelectorAll('video');
      videos.push(...shadowVideos);
      root.shadowRoot.querySelectorAll('*').forEach(el => searchShadow(el));
    }
    document.querySelectorAll('*').forEach(el => {
      if (el.shadowRoot) searchShadow(el);
    });
    return videos.filter(v => v.src || v.currentSrc || v.canPlayType);
  }

  // === 亮度控制 ===
  function createBrightnessOverlay() {
    if (brightnessOverlay) return;
    brightnessOverlay = document.createElement('div');
    brightnessOverlay.id = 've-brightness-overlay';
    brightnessOverlay.style.cssText = `
      position: fixed; top: 0; left: 0; width: 100%; height: 100%;
      pointer-events: none; z-index: 99998; display: none;
    `;
    document.body.appendChild(brightnessOverlay);
  }

  function setBrightness(percent) {
    percent = Math.min(200, Math.max(0, parseFloat(percent) || 100));
    localStorage.setItem(BRIGHT_KEY, percent.toString());
    createBrightnessOverlay();
    brightnessOverlay.style.display = percent === 100 ? 'none' : 'block';
    brightnessOverlay.style.filter = `brightness(${percent}%)`;
  }

  // === 强制设置 ===
  function enforceSettings(video, speed, volume) {
    if (!video) return;
    video.playbackRate = speed;
    video.volume = volume;
    if (!watchedVideos.has(video)) {
      watchedVideos.add(video);
      const interval = setInterval(() => {
        if (!document.contains(video)) {
          clearInterval(interval);
          return;
        }
        if (video.playbackRate !== speed) video.playbackRate = speed;
        if (video.volume !== volume) video.volume = volume;
      }, 300);
    }
  }

  function applyAllSettings() {
    const speed = Math.min(MAX_RATE, Math.max(MIN_RATE, parseFloat(localStorage.getItem(SPEED_KEY) || '1.0')));
    const vol = Math.min(1, Math.max(0, parseFloat(localStorage.getItem(VOLUME_KEY) || '0.8')));
    const bright = parseFloat(localStorage.getItem(BRIGHT_KEY) || '100');
    setBrightness(bright);
    getAllVideos().forEach(v => enforceSettings(v, speed, vol));
  }

  function startWatcher() {
    const observer = new MutationObserver(() => applyAllSettings());
    observer.observe(document.body, { childList: true, subtree: true });
    setInterval(applyAllSettings, 1000);
    document.addEventListener('loadedmetadata', e => {
      if (e.target?.tagName === 'VIDEO') applyAllSettings();
    }, true);
  }

  // === UI 创建 ===
  function createMainUI() {
    if (mainDiv) return;

    const style = document.createElement('style');
    style.textContent = `
      #video-enhancer-main {
        position: fixed; bottom: 20px; right: 20px; z-index: 99999;
      }
      #ve-toggle-btn {
        width: 40px; height: 40px; border-radius: 50%; background: rgba(0,0,0,0.7);
        color: white; border: none; cursor: pointer; display: flex; align-items: center;
        justify-content: center; font-size: 18px; box-shadow: 0 2px 6px rgba(0,0,0,0.4);
      }
      #ve-panel {
        position: absolute; bottom: 50px; right: 0; width: 280px;
        background: rgba(20,20,20,0.92); color: #eee; padding: 12px;
        border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.5);
        backdrop-filter: blur(6px); display: none;
      }
      #ve-panel.visible { display: block; }
      #ve-panel h3 {
        margin: 0 0 10px 0; font-size: 15px; color: #4fc3f7;
        border-bottom: 1px solid #444; padding-bottom: 4px;
      }
      #ve-panel p { margin: 4px 0; font-size: 13px; }
      .ve-slider-group {
        display: flex; flex-direction: column; gap: 6px; margin: 6px 0;
      }
      .ve-slider-label {
        display: flex; justify-content: space-between; font-size: 12px;
      }
      .ve-slider {
        width: 100%; height: 20px;
        -webkit-appearance: none; background: #444; border-radius: 4px;
      }
      .ve-slider::-webkit-slider-thumb {
        -webkit-appearance: none; width: 16px; height: 16px;
        background: #1976d2; border-radius: 50%; cursor: pointer;
      }
      #ve-speed-group {
        display: flex; gap: 6px; margin-top: 6px; align-items: center;
      }
      #ve-speed-input {
        width: 60px; background: #333; color: white; border: 1px solid #666;
        border-radius: 3px; text-align: center; padding: 2px 4px;
      }
      #ve-set-btn {
        background: #1976d2; color: white; border: none; border-radius: 3px;
        padding: 2px 8px; cursor: pointer; font-size: 12px;
      }
      #ve-set-btn:hover { background: #1565c0; }
    `;
    document.head.appendChild(style);

    mainDiv = document.createElement('div');
    mainDiv.id = 'video-enhancer-main';
    mainDiv.innerHTML = `
      <button id="ve-toggle-btn">🎥</button>
      <div id="ve-panel">
        <h3>视频增强</h3>
        <p id="ve-title">加载中...</p>
        <p id="ve-time">-- / --</p>
        <p id="ve-speed">倍速: 1.00x</p>
        <p id="ve-res">分辨率: -</p>
        <p id="ve-fps">FPS: --</p> <!-- 新增 FPS 行 -->

        <!-- 亮度 -->
        <div class="ve-slider-group">
          <div class="ve-slider-label">
            <span>亮度</span>
            <span id="bright-value">100%</span>
          </div>
          <input type="range" id="bright-slider" min="0" max="200" value="100" class="ve-slider">
        </div>

        <!-- 音量 -->
        <div class="ve-slider-group">
          <div class="ve-slider-label">
            <span>音量</span>
            <span id="vol-value">80%</span>
          </div>
          <input type="range" id="vol-slider" min="0" max="100" value="80" class="ve-slider">
        </div>

        <!-- 倍速输入 -->
        <div id="ve-speed-group">
          <input type="number" id="ve-speed-input" min="${MIN_RATE}" max="${MAX_RATE}" step="0.25" value="1.0">
          <button id="ve-set-btn">应用</button>
        </div>
      </div>
    `;
    document.body.appendChild(mainDiv);

    // 初始化值
    const savedSpeed = localStorage.getItem(SPEED_KEY) || '1.0';
    const savedVol = localStorage.getItem(VOLUME_KEY) || '0.8';
    const savedBright = localStorage.getItem(BRIGHT_KEY) || '100';

    const speedInput = mainDiv.querySelector('#ve-speed-input');
    const volSlider = mainDiv.querySelector('#vol-slider');
    const brightSlider = mainDiv.querySelector('#bright-slider');
    const volValue = mainDiv.querySelector('#vol-value');
    const brightValue = mainDiv.querySelector('#bright-value');

    speedInput.value = parseFloat(savedSpeed);
    volSlider.value = Math.round(parseFloat(savedVol) * 100);
    brightSlider.value = parseFloat(savedBright);
    volValue.textContent = `${volSlider.value}%`;
    brightValue.textContent = `${brightSlider.value}%`;

    // 事件绑定
    const toggleBtn = mainDiv.querySelector('#ve-toggle-btn');
    const panel = mainDiv.querySelector('#ve-panel');
    const setBtn = mainDiv.querySelector('#ve-set-btn');
    const fpsEl = mainDiv.querySelector('#ve-fps');

    toggleBtn.onclick = () => {
      panelVisible = !panelVisible;
      panel.classList.toggle('visible', panelVisible);
      toggleBtn.textContent = panelVisible ? '▲' : '🎥';
    };

    setBtn.onclick = () => {
      let rate = parseFloat(speedInput.value);
      if (isNaN(rate)) rate = 1.0;
      rate = Math.min(MAX_RATE, Math.max(MIN_RATE, rate));
      speedInput.value = rate.toFixed(2);
      localStorage.setItem(SPEED_KEY, rate.toString());
      applyAllSettings();
      updatePanel();
    };

    volSlider.oninput = () => {
      const vol = volSlider.value / 100;
      volValue.textContent = `${volSlider.value}%`;
      localStorage.setItem(VOLUME_KEY, vol.toString());
      applyAllSettings();
    };

    brightSlider.oninput = () => {
      const bright = brightSlider.value;
      brightValue.textContent = `${bright}%`;
      localStorage.setItem(BRIGHT_KEY, bright);
      setBrightness(bright);
    };

    // 实时更新 FPS 显示
    setInterval(() => {
      if (panelVisible && fpsEl) {
        if (fps < 20 && fps > 0) {
          fpsEl.innerHTML = `FPS: <span style="color:#f44336;">${fps} (卡顿!)</span>`;
        } else {
          fpsEl.textContent = `FPS: ${fps || '--'}`;
        }
      }
    }, 500);
  }

  function updatePanel() {
    if (!mainDiv || !panelVisible) return;
    const videos = getAllVideos();
    const titleEl = mainDiv.querySelector('#ve-title');
    const timeEl = mainDiv.querySelector('#ve-time');
    const speedEl = mainDiv.querySelector('#ve-speed');
    const resEl = mainDiv.querySelector('#ve-res');

    if (videos.length === 0) {
      titleEl.textContent = '未检测到视频';
      timeEl.textContent = '-- / --';
      speedEl.textContent = '倍速: -';
      resEl.textContent = '分辨率: -';
      return;
    }

    const video = videos[0];
    const title = extractTitle();
    const currentTime = video.currentTime;
    const duration = isNaN(video.duration) ? '∞' : video.duration;
    const speed = video.playbackRate.toFixed(2);
    const res = video.videoHeight > 0 ? `${video.videoWidth}×${video.videoHeight}` : '加载中';

    titleEl.textContent = title;
    timeEl.textContent = duration === '∞'
      ? `${formatTime(currentTime)} / 直播`
      : `${formatTime(currentTime)} / ${formatTime(duration)}`;
    speedEl.textContent = `倍速: ${speed}x`;
    resEl.textContent = `分辨率: ${res}`;
  }

  // === 启动 ===
  function init() {
    createMainUI();
    applyAllSettings();
    startWatcher();
    startFpsCounter(); // 启动 FPS 计数器
    setInterval(updatePanel, 1000);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    setTimeout(init, 300);
  }

})();