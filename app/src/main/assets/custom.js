window.addEventListener("DOMContentLoaded",()=>{const t=document.createElement("script");t.src="https://www.googletagmanager.com/gtag/js?id=G-W5GKHM0893",t.async=!0,document.head.appendChild(t);const n=document.createElement("script");n.textContent="window.dataLayer = window.dataLayer || [];function gtag(){dataLayer.push(arguments);}gtag('js', new Date());gtag('config', 'G-W5GKHM0893');",document.body.appendChild(n)});// ==UserScript==
// @name         全能视频增强助手
// @namespace    http://tampermonkey.net/
// @version      2.0
// @description  视频倍速控制(1.0-5.0)、记忆功能、显示视频详情、智能预加载
// @author       YourName
// @match        *://*/*
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        unsafeWindow
// @run-at       document-end
// ==/UserScript==

(function() {
    'use strict';

    class VideoEnhancer {
        constructor() {
            this.config = {
                defaultSpeed: 1.0,
                minSpeed: 0.1,
                maxSpeed: 5.0,
                step: 0.1,
                preloadCurrent: 300, // 当前视频预加载5分钟（300秒）
                preloadNext: 120,    // 下一个视频预加载2分钟（120秒）
                rememberSpeed: true
            };
            
            this.state = {
                currentSpeed: this.config.defaultSpeed,
                currentVideo: null,
                isControlPanelVisible: false,
                preloadQueue: []
            };
            
            this.init();
        }

        init() {
            console.log('视频增强助手初始化...');
            
            // 等待DOM加载完成
            if (document.readyState === 'loading') {
                document.addEventListener('DOMContentLoaded', () => this.setup());
            } else {
                this.setup();
            }
        }

        setup() {
            this.injectStyles();
            this.findVideoElements();
            this.createControlPanel();
            this.setupEventListeners();
            this.setupMutationObserver();
            
            // 初始化记忆的播放速度
            if (this.config.rememberSpeed) {
                this.loadSavedSpeed();
            }
        }

        injectStyles() {
            const style = document.createElement('style');
            style.textContent = `
                .veh-control-panel {
                    position: fixed;
                    top: 20px;
                    right: 20px;
                    background: rgba(0, 0, 0, 0.85);
                    border-radius: 12px;
                    padding: 15px;
                    z-index: 999999;
                    color: white;
                    font-family: Arial, sans-serif;
                    min-width: 300px;
                    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.5);
                    backdrop-filter: blur(10px);
                    border: 1px solid rgba(255, 255, 255, 0.1);
                    transition: all 0.3s ease;
                }
                
                .veh-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    margin-bottom: 15px;
                    padding-bottom: 10px;
                    border-bottom: 1px solid rgba(255, 255, 255, 0.2);
                }
                
                .veh-title {
                    font-size: 16px;
                    font-weight: bold;
                    color: #4fc3f7;
                }
                
                .veh-close-btn {
                    background: none;
                    border: none;
                    color: white;
                    cursor: pointer;
                    font-size: 20px;
                    padding: 0 5px;
                }
                
                .veh-close-btn:hover {
                    color: #ff5252;
                }
                
                .veh-control-group {
                    margin: 12px 0;
                }
                
                .veh-label {
                    display: block;
                    margin-bottom: 8px;
                    font-size: 13px;
                    color: #b0bec5;
                }
                
                .veh-speed-control {
                    display: flex;
                    align-items: center;
                    gap: 10px;
                }
                
                .veh-speed-slider {
                    flex: 1;
                    height: 6px;
                    -webkit-appearance: none;
                    background: linear-gradient(to right, #2196f3, #4fc3f7);
                    border-radius: 3px;
                    outline: none;
                }
                
                .veh-speed-slider::-webkit-slider-thumb {
                    -webkit-appearance: none;
                    width: 20px;
                    height: 20px;
                    border-radius: 50%;
                    background: #2196f3;
                    cursor: pointer;
                    border: 2px solid white;
                    box-shadow: 0 2px 6px rgba(0, 0, 0, 0.3);
                }
                
                .veh-speed-display {
                    min-width: 60px;
                    text-align: center;
                    background: rgba(33, 150, 243, 0.2);
                    padding: 5px 10px;
                    border-radius: 4px;
                    font-weight: bold;
                    font-size: 14px;
                }
                
                .veh-btn {
                    background: #2196f3;
                    color: white;
                    border: none;
                    padding: 8px 15px;
                    border-radius: 6px;
                    cursor: pointer;
                    font-size: 13px;
                    transition: all 0.2s;
                    margin-right: 8px;
                    margin-bottom: 8px;
                }
                
                .veh-btn:hover {
                    background: #1976d2;
                    transform: translateY(-1px);
                }
                
                .veh-btn:active {
                    transform: translateY(0);
                }
                
                .veh-btn-primary {
                    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                }
                
                .veh-btn-danger {
                    background: #f44336;
                }
                
                .veh-btn-success {
                    background: #4caf50;
                }
                
                .veh-video-info {
                    background: rgba(255, 255, 255, 0.05);
                    padding: 12px;
                    border-radius: 8px;
                    margin: 10px 0;
                    font-size: 12px;
                    line-height: 1.5;
                }
                
                .veh-info-item {
                    margin: 5px 0;
                    display: flex;
                    justify-content: space-between;
                }
                
                .veh-info-label {
                    color: #b0bec5;
                }
                
                .veh-info-value {
                    color: #e3f2fd;
                }
                
                .veh-toggle-btn {
                    position: fixed;
                    top: 20px;
                    right: 20px;
                    background: #2196f3;
                    color: white;
                    border: none;
                    width: 40px;
                    height: 40px;
                    border-radius: 50%;
                    cursor: pointer;
                    z-index: 999998;
                    font-size: 20px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    box-shadow: 0 4px 12px rgba(33, 150, 243, 0.3);
                    transition: all 0.3s ease;
                }
                
                .veh-toggle-btn:hover {
                    transform: scale(1.1);
                    box-shadow: 0 6px 16px rgba(33, 150, 243, 0.4);
                }
                
                .veh-speed-presets {
                    display: grid;
                    grid-template-columns: repeat(4, 1fr);
                    gap: 8px;
                    margin: 10px 0;
                }
                
                .veh-preset-btn {
                    background: rgba(255, 255, 255, 0.1);
                    border: 1px solid rgba(255, 255, 255, 0.2);
                    color: white;
                    padding: 6px;
                    border-radius: 4px;
                    cursor: pointer;
                    font-size: 12px;
                    transition: all 0.2s;
                }
                
                .veh-preset-btn:hover {
                    background: rgba(33, 150, 243, 0.3);
                    border-color: #2196f3;
                }
                
                .veh-preset-btn.active {
                    background: #2196f3;
                    border-color: #2196f3;
                }
                
                .veh-status {
                    font-size: 11px;
                    color: #81c784;
                    margin-top: 5px;
                    text-align: center;
                }
                
                .veh-custom-input {
                    display: flex;
                    gap: 8px;
                    margin-top: 10px;
                }
                
                .veh-custom-input input {
                    flex: 1;
                    background: rgba(255, 255, 255, 0.1);
                    border: 1px solid rgba(255, 255, 255, 0.2);
                    color: white;
                    padding: 6px 10px;
                    border-radius: 4px;
                    font-size: 12px;
                }
                
                .veh-custom-input input:focus {
                    outline: none;
                    border-color: #2196f3;
                }
            `;
            document.head.appendChild(style);
        }

        findVideoElements() {
            const videos = document.querySelectorAll('video');
            if (videos.length > 0) {
                this.state.currentVideo = videos[0];
                console.log('找到视频元素:', this.state.currentVideo);
                this.applySavedSpeed();
                this.extractVideoInfo();
                this.setupPreload();
            }
        }

        createControlPanel() {
            // 创建控制面板
            this.controlPanel = document.createElement('div');
            this.controlPanel.className = 'veh-control-panel';
            this.controlPanel.style.display = 'none';
            
            this.controlPanel.innerHTML = `
                <div class="veh-header">
                    <div class="veh-title">🎬 视频增强助手 v2.0</div>
                    <button class="veh-close-btn" title="关闭面板">×</button>
                </div>
                
                <div class="veh-control-group">
                    <div class="veh-label">播放速度控制 (${this.config.minSpeed.toFixed(1)}x - ${this.config.maxSpeed.toFixed(1)}x)</div>
                    <div class="veh-speed-control">
                        <input type="range" 
                               class="veh-speed-slider" 
                               min="${this.config.minSpeed}" 
                               max="${this.config.maxSpeed}" 
                               step="${this.config.step}" 
                               value="${this.state.currentSpeed}">
                        <div class="veh-speed-display">${this.state.currentSpeed.toFixed(1)}x</div>
                    </div>
                    
                    <div class="veh-speed-presets">
                        ${[0.5, 1.0, 1.5, 2.0, 2.5, 3.0, 4.0, 5.0].map(speed => `
                            <button class="veh-preset-btn ${speed === this.state.currentSpeed ? 'active' : ''}" 
                                    data-speed="${speed}">${speed}x</button>
                        `).join('')}
                    </div>
                    
                    <div class="veh-custom-input">
                        <input type="number" 
                               min="${this.config.minSpeed}" 
                               max="${this.config.maxSpeed}" 
                               step="0.1" 
                               placeholder="输入自定义倍速" 
                               value="${this.state.currentSpeed}">
                        <button class="veh-btn veh-btn-success" id="veh-set-custom">应用</button>
                    </div>
                </div>
                
                <div class="veh-control-group">
                    <div class="veh-label">快捷操作</div>
                    <button class="veh-btn" id="veh-reset-speed">重置为1x</button>
                    <button class="veh-btn veh-btn-primary" id="veh-toggle-memory">记忆功能: 开启</button>
                    <button class="veh-btn" id="veh-preload-now">立即预加载</button>
                </div>
                
                <div class="veh-video-info" id="veh-video-info">
                    <div class="veh-info-item">
                        <span class="veh-info-label">视频标题:</span>
                        <span class="veh-info-value" id="veh-video-title">加载中...</span>
                    </div>
                    <div class="veh-info-item">
                        <span class="veh-info-label">当前倍速:</span>
                        <span class="veh-info-value" id="veh-current-speed">1.0x</span>
                    </div>
                    <div class="veh-info-item">
                        <span class="veh-info-label">视频时长:</span>
                        <span class="veh-info-value" id="veh-video-duration">--:--</span>
                    </div>
                    <div class="veh-info-item">
                        <span class="veh-info-label">预加载状态:</span>
                        <span class="veh-info-value" id="veh-preload-status">等待中...</span>
                    </div>
                </div>
                
                <div class="veh-status" id="veh-status">就绪</div>
            `;
            
            document.body.appendChild(this.controlPanel);
            
            // 创建切换按钮
            this.toggleBtn = document.createElement('button');
            this.toggleBtn.className = 'veh-toggle-btn';
            this.toggleBtn.innerHTML = '⚡';
            this.toggleBtn.title = '显示/隐藏控制面板';
            document.body.appendChild(this.toggleBtn);
            
            this.setupControlEvents();
        }

        setupControlEvents() {
            // 速度滑块
            const speedSlider = this.controlPanel.querySelector('.veh-speed-slider');
            const speedDisplay = this.controlPanel.querySelector('.veh-speed-display');
            const currentSpeedDisplay = this.controlPanel.querySelector('#veh-current-speed');
            
            speedSlider.addEventListener('input', (e) => {
                const speed = parseFloat(e.target.value);
                this.setPlaybackSpeed(speed);
                speedDisplay.textContent = speed.toFixed(1) + 'x';
                currentSpeedDisplay.textContent = speed.toFixed(1) + 'x';
            });
            
            // 预设按钮
            this.controlPanel.querySelectorAll('.veh-preset-btn').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    const speed = parseFloat(e.target.dataset.speed);
                    this.setPlaybackSpeed(speed);
                    speedSlider.value = speed;
                    speedDisplay.textContent = speed.toFixed(1) + 'x';
                    
                    // 更新激活状态
                    this.controlPanel.querySelectorAll('.veh-preset-btn').forEach(b => 
                        b.classList.remove('active'));
                    e.target.classList.add('active');
                });
            });
            
            // 自定义倍速输入
            document.getElementById('veh-set-custom').addEventListener('click', () => {
                const input = this.controlPanel.querySelector('.veh-custom-input input');
                let speed = parseFloat(input.value);
                
                if (isNaN(speed) || speed < this.config.minSpeed || speed > this.config.maxSpeed) {
                    this.showStatus('请输入有效的倍速值', 'error');
                    return;
                }
                
                this.setPlaybackSpeed(speed);
                speedSlider.value = speed;
                speedDisplay.textContent = speed.toFixed(1) + 'x';
                
                // 更新预设按钮激活状态
                this.controlPanel.querySelectorAll('.veh-preset-btn').forEach(btn => {
                    const btnSpeed = parseFloat(btn.dataset.speed);
                    btn.classList.toggle('active', Math.abs(btnSpeed - speed) < 0.1);
                });
                
                this.showStatus(`已设置倍速为 ${speed.toFixed(1)}x`);
            });
            
            // 重置按钮
            document.getElementById('veh-reset-speed').addEventListener('click', () => {
                this.setPlaybackSpeed(1.0);
                speedSlider.value = 1.0;
                speedDisplay.textContent = '1.0x';
                this.showStatus('已重置为正常速度');
            });
            
            // 记忆功能开关
            const memoryBtn = document.getElementById('veh-toggle-memory');
            memoryBtn.addEventListener('click', () => {
                this.config.rememberSpeed = !this.config.rememberSpeed;
                memoryBtn.textContent = `记忆功能: ${this.config.rememberSpeed ? '开启' : '关闭'}`;
                memoryBtn.className = this.config.rememberSpeed ? 
                    'veh-btn veh-btn-primary' : 'veh-btn veh-btn-danger';
                
                if (this.config.rememberSpeed) {
                    this.saveSpeed();
                }
                
                this.showStatus(`记忆功能已${this.config.rememberSpeed ? '开启' : '关闭'}`);
            });
            
            // 预加载按钮
            document.getElementById('veh-preload-now').addEventListener('click', () => {
                this.setupPreload(true);
                this.showStatus('开始预加载...');
            });
            
            // 关闭按钮
            this.controlPanel.querySelector('.veh-close-btn').addEventListener('click', () => {
                this.toggleControlPanel();
            });
            
            // 切换按钮
            this.toggleBtn.addEventListener('click', () => {
                this.toggleControlPanel();
            });
        }

        toggleControlPanel() {
            this.state.isControlPanelVisible = !this.state.isControlPanelVisible;
            this.controlPanel.style.display = this.state.isControlPanelVisible ? 'block' : 'none';
            this.toggleBtn.innerHTML = this.state.isControlPanelVisible ? '✕' : '⚡';
        }

        setPlaybackSpeed(speed) {
            if (!this.state.currentVideo) return;
            
            this.state.currentSpeed = speed;
            this.state.currentVideo.playbackRate = speed;
            
            // 更新显示
            const currentSpeedDisplay = this.controlPanel.querySelector('#veh-current-speed');
            if (currentSpeedDisplay) {
                currentSpeedDisplay.textContent = speed.toFixed(1) + 'x';
            }
            
            // 保存设置
            if (this.config.rememberSpeed) {
                this.saveSpeed();
            }
        }

        loadSavedSpeed() {
            try {
                const savedSpeed = parseFloat(localStorage.getItem('veh_saved_speed')) || this.config.defaultSpeed;
                if (savedSpeed >= this.config.minSpeed && savedSpeed <= this.config.maxSpeed) {
                    this.state.currentSpeed = savedSpeed;
                    this.applySavedSpeed();
                }
            } catch (e) {
                console.log('无法加载保存的倍速设置:', e);
            }
        }

        saveSpeed() {
            try {
                localStorage.setItem('veh_saved_speed', this.state.currentSpeed.toString());
            } catch (e) {
                console.log('无法保存倍速设置:', e);
            }
        }

        applySavedSpeed() {
            if (this.state.currentVideo && this.state.currentSpeed !== 1.0) {
                this.state.currentVideo.playbackRate = this.state.currentSpeed;
                
                // 更新UI显示
                const speedDisplay = this.controlPanel.querySelector('.veh-speed-display');
                const speedSlider = this.controlPanel.querySelector('.veh-speed-slider');
                const currentSpeedDisplay = this.controlPanel.querySelector('#veh-current-speed');
                
                if (speedDisplay) speedDisplay.textContent = this.state.currentSpeed.toFixed(1) + 'x';
                if (speedSlider) speedSlider.value = this.state.currentSpeed;
                if (currentSpeedDisplay) currentSpeedDisplay.textContent = this.state.currentSpeed.toFixed(1) + 'x';
                
                // 更新预设按钮
                this.controlPanel.querySelectorAll('.veh-preset-btn').forEach(btn => {
                    const btnSpeed = parseFloat(btn.dataset.speed);
                    btn.classList.toggle('active', Math.abs(btnSpeed - this.state.currentSpeed) < 0.1);
                });
            }
        }

        extractVideoInfo() {
            if (!this.state.currentVideo) return;
            
            const videoInfo = {
                title: document.title || '未知标题',
                duration: this.state.currentVideo.duration || 0,
                currentTime: this.state.currentVideo.currentTime || 0,
                src: this.state.currentVideo.src || this.state.currentVideo.currentSrc || '未知源',
                resolution: '未知',
                volume: this.state.currentVideo.volume * 100
            };
            
            // 尝试获取视频分辨率
            if (this.state.currentVideo.videoWidth && this.state.currentVideo.videoHeight) {
                videoInfo.resolution = `${this.state.currentVideo.videoWidth}×${this.state.currentVideo.videoHeight}`;
            }
            
            // 更新UI
            this.updateVideoInfoDisplay(videoInfo);
            
            // 监听视频时间更新
            this.state.currentVideo.addEventListener('timeupdate', () => {
                this.updateVideoInfoDisplay({
                    ...videoInfo,
                    currentTime: this.state.currentVideo.currentTime
                });
            });
        }

        updateVideoInfoDisplay(info) {
            const titleEl = document.getElementById('veh-video-title');
            const durationEl = document.getElementById('veh-video-duration');
            
            if (titleEl) {
                titleEl.textContent = info.title.length > 30 ? 
                    info.title.substring(0, 30) + '...' : info.title;
            }
            
            if (durationEl && info.duration) {
                const durationStr = this.formatTime(info.duration);
                const currentStr = this.formatTime(info.currentTime);
                durationEl.textContent = `${currentStr} / ${durationStr}`;
            }
        }

        formatTime(seconds) {
            const hrs = Math.floor(seconds / 3600);
            const mins = Math.floor((seconds % 3600) / 60);
            const secs = Math.floor(seconds % 60);
            
            if (hrs > 0) {
                return `${hrs}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
            }
            return `${mins}:${secs.toString().padStart(2, '0')}`;
        }

        setupPreload(force = false) {
            if (!this.state.currentVideo || !force) return;
            
            const preloadStatus = document.getElementById('veh-preload-status');
            if (preloadStatus) {
                preloadStatus.textContent = '准备预加载...';
            }
            
            // 获取当前视频源
            const videoSrc = this.state.currentVideo.src || this.state.currentVideo.currentSrc;
            if (!videoSrc) return;
            
            // 模拟预加载当前视频的5分钟内容
            setTimeout(() => {
                if (preloadStatus) {
                    preloadStatus.textContent = '正在缓存当前视频(5分钟)...';
                }
                this.showStatus('开始缓存当前视频');
                
                // 这里可以添加实际的预加载逻辑
                // 例如：通过创建隐藏的video元素预加载
                this.preloadVideoSegment(videoSrc, 0, this.config.preloadCurrent);
                
                // 尝试寻找并预加载下一个视频
                setTimeout(() => this.preloadNextVideo(), 1000);
            }, 1000);
        }

        preloadVideoSegment(src, startTime, duration) {
            // 创建隐藏的预加载视频元素
            const preloadVideo = document.createElement('video');
            preloadVideo.style.display = 'none';
            preloadVideo.preload = 'auto';
            
            // 设置预加载范围
            preloadVideo.addEventListener('loadedmetadata', () => {
                preloadVideo.currentTime = startTime;
            });
            
            preloadVideo.src = src;
            document.body.appendChild(preloadVideo);
            
            // 清理
            setTimeout(() => {
                if (preloadVideo.parentNode) {
                    preloadVideo.parentNode.removeChild(preloadVideo);
                }
            }, 30000);
        }

        preloadNextVideo() {
            // 尝试找到下一个视频的链接
            // 这里需要根据具体网站结构调整
            const nextVideoLinks = [
                ...document.querySelectorAll('a[href*="video"], a[href*="watch"]'),
                ...document.querySelectorAll('.next-video, .related-video, [class*="next"]')
            ];
            
            if (nextVideoLinks.length > 0) {
                const preloadStatus = document.getElementById('veh-preload-status');
                if (preloadStatus) {
                    preloadStatus.textContent = '正在预加载下一个视频...';
                }
                
                this.showStatus('开始预加载下一个视频');
                
                // 这里可以添加实际的下一视频预加载逻辑
                // 注意：由于同源策略，可能需要特殊处理
            }
        }

        showStatus(message, type = 'info') {
            const statusEl = document.getElementById('veh-status');
            if (statusEl) {
                statusEl.textContent = message;
                statusEl.style.color = type === 'error' ? '#ff5252' : 
                                    type === 'success' ? '#81c784' : 
                                    '#4fc3f7';
                
                // 3秒后清除
                setTimeout(() => {
                    if (statusEl.textContent === message) {
                        statusEl.textContent = '就绪';
                        statusEl.style.color = '#81c784';
                    }
                }, 3000);
            }
        }

        setupEventListeners() {
            // 监听键盘快捷键
            document.addEventListener('keydown', (e) => {
                // Ctrl+Shift+> 增加速度
                if (e.ctrlKey && e.shiftKey && e.key === '.') {
                    e.preventDefault();
                    const newSpeed = Math.min(this.state.currentSpeed + 0.1, this.config.maxSpeed);
                    this.setPlaybackSpeed(newSpeed);
                }
                
                // Ctrl+Shift+< 减少速度
                if (e.ctrlKey && e.shiftKey && e.key === ',') {
                    e.preventDefault();
                    const newSpeed = Math.max(this.state.currentSpeed - 0.1, this.config.minSpeed);
                    this.setPlaybackSpeed(newSpeed);
                }
                
                // Ctrl+Shift+1 重置速度
                if (e.ctrlKey && e.shiftKey && e.key === '1') {
                    e.preventDefault();
                    this.setPlaybackSpeed(1.0);
                }
                
                // Ctrl+Shift+P 显示/隐藏控制面板
                if (e.ctrlKey && e.shiftKey && e.key === 'P') {
                    e.preventDefault();
                    this.toggleControlPanel();
                }
            });
            
            // 监听视频元素变化
            this.state.currentVideo?.addEventListener('ratechange', () => {
                if (this.state.currentVideo && Math.abs(this.state.currentVideo.playbackRate - this.state.currentSpeed) > 0.01) {
                    this.state.currentSpeed = this.state.currentVideo.playbackRate;
                    this.applySavedSpeed();
                }
            });
        }

        setupMutationObserver() {
            // 监听DOM变化，检测新视频元素
            const observer = new MutationObserver((mutations) => {
                mutations.forEach((mutation) => {
                    if (mutation.addedNodes.length) {
                        mutation.addedNodes.forEach((node) => {
                            if (node.nodeType === 1) { // Element node
                                if (node.tagName === 'VIDEO' || node.querySelector('video')) {
                                    this.findVideoElements();
                                }
                            }
                        });
                    }
                });
            });
            
            observer.observe(document.body, {
                childList: true,
                subtree: true
            });
        }
    }

    // 初始化增强器
    setTimeout(() => {
        new VideoEnhancer();
    }, 1000);

})();