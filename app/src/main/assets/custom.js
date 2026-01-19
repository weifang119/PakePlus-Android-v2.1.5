window.addEventListener("DOMContentLoaded",()=>{const t=document.createElement("script");t.src="https://www.googletagmanager.com/gtag/js?id=G-W5GKHM0893",t.async=!0,document.head.appendChild(t);const n=document.createElement("script");n.textContent="window.dataLayer = window.dataLayer || [];function gtag(){dataLayer.push(arguments);}gtag('js', new Date());gtag('config', 'G-W5GKHM0893');",document.body.appendChild(n)});// ==UserScript==
// @name         视频增强工具（仅 FPS + 倍速）
// @namespace    http://tampermonkey.net/
// @version      1.7
// @description  倍速 + FPS 固定显示（左上角），移除音量和亮度
// @author       Qwen
// @match        *://*/*
// @grant        none
// ==/UserScript==

(function () {
  'use strict';

  const SPEED_KEY = 'customPlaybackRate';
  const MIN_RATE = 1.0;
  const MAX_RATE = 5.0;

  let mainDiv = null;
  const watchedVideos = new WeakSet();

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

  // === 强制设置倍速 ===
  function enforceSettings(video, speed) {
    if (!video) return;
    video.playbackRate = speed;
    if (!watchedVideos.has(video)) {
      watchedVideos.add(video);
      const interval = setInterval(() => {
        if (!document.contains(video)) {
          clearInterval(interval);
          return;
        }
        if (video.playbackRate !== speed) video.playbackRate = speed;
      }, 300);
    }
  }

  function applyAllSettings() {
    const speed = Math.min(MAX_RATE, Math.max(MIN_RATE, parseFloat(localStorage.getItem(SPEED_KEY) || '1.0')));
    getAllVideos().forEach(v => enforceSettings(v, speed));
  }

  function startWatcher() {
    const observer = new MutationObserver(() => applyAllSettings());
    observer.observe(document.body, { childList: true, subtree: true });
    setInterval(applyAllSettings, 1000);
    document.addEventListener('loadedmetadata', e => {
      if (e.target?.tagName === 'VIDEO') applyAllSettings();
    }, true);
  }

  // === 创建固定 FPS 显示（左上角）===
  function createFpsDisplay() {
    const fpsDiv = document.createElement('div');
    fpsDiv.id = 've-fps-display';
    fpsDiv.style.cssText = `
      position: fixed;
      top: 10px;
      left: 10px;
      background: rgba(0, 0, 0, 0.6);
      color: #4fc3f7;
      padding: 4px 8px;
      border-radius: 4px;
      font-size: 14px;
      z-index: 99999;
      pointer-events: none;
      font-family: monospace;
    `;
    document.body.appendChild(fpsDiv);

    setInterval(() => {
      if (fps < 20 && fps > 0) {
        fpsDiv.innerHTML = `FPS: <span style="color:#f44336;">${fps} (卡顿!)</span>`;
      } else {
        fpsDiv.textContent = `FPS: ${fps || '--'}`;
      }
    }, 500);
  }

  // === UI 创建（仅倍速控制面板）===
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
        position: absolute; bottom: 50px; right: 0; width: 220px;
        background: rgba(20,20,20,0.92); color: #eee; padding: 12px;
        border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.5);
        backdrop-filter: blur(6px); display: none;
      }
      #ve-panel.visible { display: block; }
      #ve-panel h3 {
        margin: 0 0 10px 0; font-size: 15px; color: #4fc3f7;
        border-bottom: 1px solid #444; padding-bottom: 4px;
      }
      #ve-speed-group {
        display: flex; gap: 6px; margin-top: 6px; align-items: center;
      }
      #ve-speed-input {
        width: 80px; background: #333; color: white; border: 1px solid #666;
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
        <h3>视频倍速</h3>
        <div id="ve-speed-group">
          <input type="number" id="ve-speed-input" min="${MIN_RATE}" max="${MAX_RATE}" step="0.25" value="1.0">
          <button id="ve-set-btn">应用</button>
        </div>
      </div>
    `;
    document.body.appendChild(mainDiv);

    // 初始化值
    const savedSpeed = localStorage.getItem(SPEED_KEY) || '1.0';
    const speedInput = mainDiv.querySelector('#ve-speed-input');
    speedInput.value = parseFloat(savedSpeed);

    // 事件绑定
    const toggleBtn = mainDiv.querySelector('#ve-toggle-btn');
    const panel = mainDiv.querySelector('#ve-panel');
    const setBtn = mainDiv.querySelector('#ve-set-btn');

    let panelVisible = false;
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
    };
  }

  // === 启动 ===
  function init() {
    createFpsDisplay();     // 固定 FPS 显示
    createMainUI();         // 倍速控制面板
    applyAllSettings();
    startWatcher();
    startFpsCounter();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    setTimeout(init, 300);
  }

})();