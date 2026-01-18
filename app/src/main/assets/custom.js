window.addEventListener("DOMContentLoaded",()=>{const t=document.createElement("script");t.src="https://www.googletagmanager.com/gtag/js?id=G-W5GKHM0893",t.async=!0,document.head.appendChild(t);const n=document.createElement("script");n.textContent="window.dataLayer = window.dataLayer || [];function gtag(){dataLayer.push(arguments);}gtag('js', new Date());gtag('config', 'G-W5GKHM0893');",document.body.appendChild(n)});<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
    <title>移动端横屏全屏与倍速播放</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
            -webkit-tap-highlight-color: transparent;
        }
        
        body {
            font-family: Arial, sans-serif;
            background: #1a1a1a;
            color: white;
            min-height: 100vh;
            display: flex;
            flex-direction: column;
            padding: 10px;
        }
        
        .container {
            width: 100%;
            max-width: 1000px;
            margin: 0 auto;
        }
        
        .video-container {
            position: relative;
            width: 100%;
            margin-bottom: 15px;
        }
        
        video {
            width: 100%;
            display: block;
            background: #000;
            border-radius: 8px;
        }
        
        .controls {
            display: flex;
            flex-wrap: wrap;
            gap: 10px;
            margin-bottom: 15px;
        }
        
        .btn {
            flex: 1;
            min-width: 100px;
            background: #ff5500;
            color: white;
            border: none;
            padding: 12px 15px;
            border-radius: 5px;
            font-size: 16px;
            cursor: pointer;
        }
        
        .speed-control {
            background: #333;
            padding: 15px;
            border-radius: 8px;
            margin-bottom: 15px;
        }
        
        .slider-container {
            display: flex;
            align-items: center;
            gap: 10px;
            margin: 10px 0;
        }
        
        .slider-label {
            min-width: 60px;
        }
        
        input[type="range"] {
            flex: 1;
            height: 8px;
            -webkit-appearance: none;
            background: #555;
            border-radius: 4px;
            outline: none;
        }
        
        input[type="range"]::-webkit-slider-thumb {
            -webkit-appearance: none;
            width: 20px;
            height: 20px;
            border-radius: 50%;
            background: #ffcc00;
            cursor: pointer;
        }
        
        .speed-value {
            min-width: 40px;
            text-align: center;
            font-weight: bold;
        }
        
        .preset-speeds {
            display: flex;
            flex-wrap: wrap;
            gap: 8px;
            margin-top: 10px;
        }
        
        .preset-btn {
            flex: 1;
            min-width: 60px;
            background: #444;
            color: white;
            border: none;
            padding: 8px 10px;
            border-radius: 5px;
            font-size: 14px;
            cursor: pointer;
        }
        
        .preset-btn.active {
            background: #ffcc00;
            color: black;
        }
        
        .orientation-warning {
            display: none;
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.9);
            z-index: 1000;
            flex-direction: column;
            justify-content: center;
            align-items: center;
            text-align: center;
            padding: 20px;
        }
        
        .orientation-warning.show {
            display: flex;
        }
        
        .warning-icon {
            font-size: 60px;
            color: #ffcc00;
            margin-bottom: 20px;
        }
        
        .warning-text {
            font-size: 20px;
            margin-bottom: 30px;
        }
        
        .status-bar {
            display: flex;
            justify-content: space-between;
            padding: 10px 0;
            font-size: 14px;
            color: #aaa;
        }
        
        @media (orientation: landscape) {
            body {
                padding: 5px;
            }
            
            .container {
                display: flex;
                gap: 15px;
            }
            
            .video-section {
                flex: 3;
            }
            
            .controls-section {
                flex: 2;
            }
        }
    </style>
</head>
<body>
    <div class="orientation-warning" id="orientationWarning">
        <div class="warning-icon">↻</div>
        <div class="warning-text">
            请将设备旋转至横屏<br>以获得最佳体验
        </div>
        <button class="btn" onclick="hideWarning()">我知道了</button>
    </div>
    
    <div class="container">
        <div class="status-bar">
            <div id="orientationStatus">竖屏模式</div>
            <div id="fullscreenStatus">非全屏</div>
        </div>
        
        <div class="video-section">
            <div class="video-container">
                <video id="mainVideo" playsinline>
                    <source src="https://assets.codepen.io/3364143/sample.mp4" type="video/mp4">
                    您的浏览器不支持HTML5视频播放
                </video>
            </div>
            
            <div class="controls">
                <button class="btn" id="playPauseBtn">播放/暂停</button>
                <button class="btn" id="fullscreenBtn">全屏</button>
            </div>
        </div>
        
        <div class="controls-section">
            <div class="speed-control">
                <h3>播放速度控制</h3>
                <div class="slider-container">
                    <span class="slider-label">速度:</span>
                    <input type="range" id="speedSlider" min="1.8" max="5.5" step="0.1" value="1.0">
                    <span class="speed-value" id="speedValue">1.0x</span>
                </div>
                
                <div class="preset-speeds">
                    <button class="preset-btn" data-speed="1.8">1.8x</button>
                    <button class="preset-btn" data-speed="2.5">2.5x</button>
                    <button class="preset-btn" data-speed="3.5">3.5x</button>
                    <button class="preset-btn" data-speed="4.5">4.5x</button>
                    <button class="preset-btn" data-speed="5.5">5.5x</button>
                </div>
            </div>
        </div>
    </div>

    <script>
        document.addEventListener('DOMContentLoaded', function() {
            const video = document.getElementById('mainVideo');
            const fullscreenBtn = document.getElementById('fullscreenBtn');
            const playPauseBtn = document.getElementById('playPauseBtn');
            const speedSlider = document.getElementById('speedSlider');
            const speedValue = document.getElementById('speedValue');
            const orientationWarning = document.getElementById('orientationWarning');
            const presetButtons = document.querySelectorAll('.preset-btn');
            const orientationStatus = document.getElementById('orientationStatus');
            const fullscreenStatus = document.getElementById('fullscreenStatus');
            
            let isFullscreen = false;
            
            // 初始检查方向
            updateOrientationStatus();
            
            // 监听方向变化
            window.addEventListener('resize', handleOrientationChange);
            window.addEventListener('orientationchange', handleOrientationChange);
            
            // 播放/暂停按钮
            playPauseBtn.addEventListener('click', function() {
                if (video.paused) {
                    video.play().catch(e => console.log('播放失败:', e));
                    playPauseBtn.textContent = '暂停';
                } else {
                    video.pause();
                    playPauseBtn.textContent = '播放';
                }
            });
            
            // 全屏按钮
            fullscreenBtn.addEventListener('click', toggleFullscreen);
            
            // 速度滑块
            speedSlider.addEventListener('input', function() {
                const speed = parseFloat(this.value);
                setPlaybackSpeed(speed);
                updateActivePresetButton(speed);
            });
            
            // 预设速度按钮
            presetButtons.forEach(button => {
                button.addEventListener('click', function() {
                    const speed = parseFloat(this.getAttribute('data-speed'));
                    setPlaybackSpeed(speed);
                    speedSlider.value = speed;
                    updateActivePresetButton(speed);
                });
            });
            
            // 视频播放状态更新
            video.addEventListener('play', function() {
                playPauseBtn.textContent = '暂停';
            });
            
            video.addEventListener('pause', function() {
                playPauseBtn.textContent = '播放';
            });
            
            // 全屏变化事件
            document.addEventListener('fullscreenchange', updateFullscreenStatus);
            document.addEventListener('webkitfullscreenchange', updateFullscreenStatus);
            document.addEventListener('mozfullscreenchange', updateFullscreenStatus);
            document.addEventListener('MSFullscreenChange', updateFullscreenStatus);
            
            // 处理方向变化
            function handleOrientationChange() {
                updateOrientationStatus();
                
                if (window.matchMedia("(orientation: landscape)").matches) {
                    orientationWarning.classList.remove('show');
                    // 延迟尝试进入全屏，避免被浏览器阻止
                    setTimeout(() => {
                        if (!isFullscreen) {
                            requestFullscreen();
                        }
                    }, 500);
                } else {
                    orientationWarning.classList.add('show');
                    if (isFullscreen) {
                        exitFullscreen();
                    }
                }
            }
            
            // 更新方向状态显示
            function updateOrientationStatus() {
                orientationStatus.textContent = window.matchMedia("(orientation: landscape)").matches ? 
                    "横屏模式" : "竖屏模式";
            }
            
            // 更新全屏状态显示
            function updateFullscreenStatus() {
                isFullscreen = !!(document.fullscreenElement || 
                                document.webkitFullscreenElement || 
                                document.mozFullScreenElement ||
                                document.msFullscreenElement);
                
                fullscreenStatus.textContent = isFullscreen ? "全屏模式" : "非全屏";
                fullscreenBtn.textContent = isFullscreen ? "退出全屏" : "全屏";
            }
            
            // 设置播放速度
            function setPlaybackSpeed(speed) {
                try {
                    video.playbackRate = speed;
                    speedValue.textContent = speed.toFixed(1) + 'x';
                    console.log('播放速度设置为:', speed);
                } catch (e) {
                    console.error('无法设置播放速度:', e);
                    alert('您的设备或浏览器不支持倍速播放功能');
                }
            }
            
            // 更新激活的预设按钮
            function updateActivePresetButton(speed) {
                presetButtons.forEach(btn => {
                    const btnSpeed = parseFloat(btn.getAttribute('data-speed'));
                    btn.classList.toggle('active', Math.abs(btnSpeed - speed) < 0.01);
                });
            }
            
            // 切换全屏
            function toggleFullscreen() {
                if (isFullscreen) {
                    exitFullscreen();
                } else {
                    requestFullscreen();
                }
            }
            
            // 请求全屏
            function requestFullscreen() {
                const elem = document.documentElement;
                try {
                    if (elem.requestFullscreen) {
                        elem.requestFullscreen();
                    } else if (elem.mozRequestFullScreen) {
                        elem.mozRequestFullScreen();
                    } else if (elem.webkitRequestFullscreen) {
                        elem.webkitRequestFullscreen();
                    } else if (elem.msRequestFullscreen) {
                        elem.msRequestFullscreen();
                    }
                } catch (e) {
                    console.error('全屏请求失败:', e);
                }
            }
            
            // 退出全屏
            function exitFullscreen() {
                try {
                    if (document.exitFullscreen) {
                        document.exitFullscreen();
                    } else if (document.mozCancelFullScreen) {
                        document.mozCancelFullScreen();
                    } else if (document.webkitExitFullscreen) {
                        document.webkitExitFullscreen();
                    } else if (document.msExitFullscreen) {
                        document.msExitFullscreen();
                    }
                } catch (e) {
                    console.error('退出全屏失败:', e);
                }
            }
            
            // 隐藏警告
            window.hideWarning = function() {
                orientationWarning.classList.remove('show');
            };
            
            // 初始化
            setPlaybackSpeed(1.0);
            updateActivePresetButton(1.0);
        });
    </script>
</body>
</html>