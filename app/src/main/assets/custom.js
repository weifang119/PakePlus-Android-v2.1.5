window.addEventListener("DOMContentLoaded",()=>{const t=document.createElement("script");t.src="https://www.googletagmanager.com/gtag/js?id=G-W5GKHM0893",t.async=!0,document.head.appendChild(t);const n=document.createElement("script");n.textContent="window.dataLayer = window.dataLayer || [];function gtag(){dataLayer.push(arguments);}gtag('js', new Date());gtag('config', 'G-W5GKHM0893');",document.body.appendChild(n)});/**
 * PakePlus 安卓端视频修复脚本（增强版）
 * 功能：白屏/卡顿/自动播放修复 + 禁止右滑 + 屏幕自动匹配
 */

// 确保 viewport 正确（防止页面缩放异常）
(function ensureViewport() {
    let meta = document.querySelector('meta[name="viewport"]');
    if (!meta) {
        meta = document.createElement('meta');
        meta.name = 'viewport';
        // 关键：禁止用户缩放，宽度=device-width，初始缩放=1
        meta.content = 'width=device-width, initial-scale=1.0, user-scalable=no';
        document.head.appendChild(meta);
    } else {
        // 如果已有 viewport，确保包含必要参数
        let content = meta.content;
        if (!content.includes('width=device-width')) {
            meta.content += ', width=device-width';
        }
        if (!content.includes('user-scalable=no')) {
            meta.content += ', user-scalable=no';
        }
    }
})();

// 页面加载完成后统一初始化
window.addEventListener('load', function () {
    fixVideoPlayback();
    optimizeBuffer();
    handleAutoPlay();
    disableSwipeBack();
    autoFitVideoToScreen(); // 👈 新增：自动匹配屏幕
});

/**
 * 新增功能：自动匹配视频到屏幕（全屏、安全区、响应旋转）
 */
function autoFitVideoToScreen() {
    const video = document.querySelector('video');
    if (!video) return;

    // 创建包裹容器（如果还没有）
    let container = video.parentElement;
    if (!container || container.id !== 'pake-video-container') {
        container = document.createElement('div');
        container.id = 'pake-video-container';
        container.style.cssText = `
            position: fixed;
            top: 0; left: 0;
            width: 100vw;
            height: 100vh;
            background: black;
            display: flex;
            justify-content: center;
            align-items: center;
            z-index: 9998;
            /* 适配刘海屏/挖孔屏 */
            padding: env(safe-area-inset-top) env(safe-area-inset-right)
                     env(safe-area-inset-bottom) env(safe-area-inset-left);
            box-sizing: border-box;
        `;
        video.parentNode?.replaceChild(container, video);
        container.appendChild(video);
    }

    // 设置视频样式：填充模式为 cover（无黑边，可能裁剪）
    video.style.cssText = `
        width: 100%;
        height: 100%;
        object-fit: cover;
        background: black;
        display: block;
    `;

    // 监听屏幕旋转和窗口大小变化
    function resizeHandler() {
        // 强制重绘（某些安卓 WebView 需要）
        container.style.display = 'none';
        setTimeout(() => {
            container.style.display = 'flex';
        }, 50);
    }

    window.addEventListener('resize', resizeHandler);
    window.addEventListener('orientationchange', resizeHandler);

    console.log('【屏幕适配】视频已自动匹配屏幕尺寸');
}

/**
 * 1. 修复播放核心：强制使用 Video 标签，监听错误恢复
 */
function fixVideoPlayback() {
    const video = document.querySelector('video');
    if (!video) return;

    window.ActiveXObject = undefined;
    navigator.plugins = {
        ...navigator.plugins,
        'Shockwave Flash': undefined
    };

    video.addEventListener('error', function (e) {
        console.error('【视频错误】检测到播放错误，尝试修复...', e);
        if (video.error) {
            setTimeout(() => {
                video.load();
                console.log('【视频修复】已尝试重新加载视频源');
            }, 1000);
        }
    });

    const src = video.src;
    if (src.includes('.flv') || src.includes('.m3u8')) {
        console.log('【视频源】检测到流媒体源，确保服务器支持 CORS');
    }
}

/**
 * 2. 优化缓冲与卡顿：调整播放器配置 (针对 flv.js/hls.js)
 */
function optimizeBuffer() {
    if (typeof flvjs !== 'undefined') {
        const originalCreate = flvjs.createPlayer;
        flvjs.createPlayer = function (mediaDataSource, config) {
            const optimizedConfig = {
                ...config,
                enableWorker: true,
                enableStashBuffer: true,
                isLive: true,
                stashInitialSize: 1024,
                lazyLoad: false
            };
            console.log('【flv.js】已注入优化配置:', optimizedConfig);
            return originalCreate(mediaDataSource, optimizedConfig);
        };
    }

    if (typeof Hls !== 'undefined' && Hls.isSupported()) {
        console.log('【hls.js】检测到支持，请确保创建实例时使用优化配置：', {
            maxBufferLength: 30,
            liveSyncDurationCount: 1,
            lowLatencyMode: true
        });
    }
}

/**
 * 3. 解决安卓自动播放限制
 */
function handleAutoPlay() {
    const video = document.querySelector('video');
    if (!video) return;

    video.muted = true;
    video.defaultMuted = true;

    const playPromise = video.play();
    if (playPromise !== undefined) {
        playPromise
            .then(() => {
                console.log('【自动播放】静音播放成功');
            })
            .catch((error) => {
                console.warn('【自动播放】被浏览器阻止:', error);
                createPlayCover(video);
            });
    }
}

/**
 * 辅助函数：创建点击播放遮罩
 */
function createPlayCover(video) {
    const cover = document.createElement('div');
    cover.style.cssText = `
        position: fixed;
        top: 0; left: 0;
        width: 100%; height: 100%;
        background-color: rgba(0,0,0,0.7);
        color: white;
        display: flex;
        justify-content: center;
        align-items: center;
        flex-direction: column;
        z-index: 9999;
        cursor: pointer;
        /* 适配安全区域 */
        padding: env(safe-area-inset-top) env(safe-area-inset-right)
                 env(safe-area-inset-bottom) env(safe-area-inset-left);
        box-sizing: border-box;
    `;
    cover.innerHTML = `
        <svg width="60" height="60" viewBox="0 0 24 24" fill="none">
            <path d="M5 20V4L19 12L5 20Z" fill="white"/>
        </svg>
        <p style="margin-top: 20px; font-size: 18px; text-align: center;">点击屏幕开始播放</p>
    `;

    cover.addEventListener('click', function () {
        video.play()
            .then(() => cover.remove())
            .catch(() => alert('请先与页面交互（如点击）后再试'));
    });

    document.body.appendChild(cover);
}

/**
 * 4. 禁止向右滑动（防止安卓 WebView 返回上一页）
 */
function disableSwipeBack() {
    let startX = 0;
    let startY = 0;

    document.addEventListener('touchstart', function (e) {
        if (e.touches.length !== 1) return;
        startX = e.touches[0].pageX;
        startY = e.touches[0].pageY;
    }, { passive: false });

    document.addEventListener('touchmove', function (e) {
        if (e.touches.length !== 1) return;
        const moveX = e.touches[0].pageX - startX;
        const moveY = e.touches[0].pageY - startY;

        if (Math.abs(moveX) > Math.abs(moveY) && moveX > 10) {
            e.preventDefault();
            console.log('【手势拦截】已阻止向右滑动');
        }
    }, { passive: false });
}

// 全局错误捕获
window.addEventListener('error', (e) => {
    console.error('【全局错误】', e.error);
});