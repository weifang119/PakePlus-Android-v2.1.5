window.addEventListener("DOMContentLoaded",()=>{const t=document.createElement("script");t.src="https://www.googletagmanager.com/gtag/js?id=G-W5GKHM0893",t.async=!0,document.head.appendChild(t);const n=document.createElement("script");n.textContent="window.dataLayer = window.dataLayer || [];function gtag(){dataLayer.push(arguments);}gtag('js', new Date());gtag('config', 'G-W5GKHM0893');",document.body.appendChild(n)});// ========== 全局配置 ==========
const PAKE_VIDEO_CONFIG = {
    enableAutoFit: true,      // 是否启用自动全屏适配
    enableAdBlock: true,      // 是否启用广告拦截
    enableSwipePrevent: true, // 是否禁用滑动返回
    debug: false              // 是否开启详细日志
};

// ========== 工具函数 ==========
function log(tag, message) {
    if (PAKE_VIDEO_CONFIG.debug || message?.includes('错误')) {
        console.log(`【${tag}】${message}`);
    }
}

// ========== Viewport 设置 ==========
(function ensureViewport() {
    let meta = document.querySelector('meta[name="viewport"]');
    if (!meta) {
        meta = document.createElement('meta');
        meta.name = 'viewport';
        meta.content = 'width=device-width, initial-scale=1.0, user-scalable=no';
        document.head.appendChild(meta);
    } else {
        let content = meta.content;
        if (!content.includes('width=device-width')) {
            meta.content = content + ', width=device-width';
        }
        if (!content.includes('user-scalable=no')) {
            meta.content = meta.content + ', user-scalable=no';
        }
    }
})();

// ========== 防止重复初始化 ==========
if (window.__PAKE_VIDEO_INIT__) {
    log('初始化', '已初始化，跳过');
    return;
}
window.__PAKE_VIDEO_INIT__ = true;

// ========== 页面加载完成后统一初始化 ==========
window.addEventListener('load', function () {
    fixVideoPlayback();
    optimizeBuffer();
    handleAutoPlay();
    if (PAKE_VIDEO_CONFIG.enableSwipePrevent) disableSwipeBack();
    if (PAKE_VIDEO_CONFIG.enableAutoFit) autoFitVideoToScreen();
    if (PAKE_VIDEO_CONFIG.enableAdBlock) blockAds();
});

/**
 * 自动匹配视频到屏幕（全屏、安全区、响应旋转）
 */
function autoFitVideoToScreen() {
    const video = document.querySelector('video');
    if (!video) return;

    let container = document.getElementById('pake-video-container');
    if (!container) {
        container = document.createElement('div');
        container.id = 'pake-video-container';
        // 安全区回退：若 env 不支持，则 padding 为 0（桌面端安全）
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
            padding: env(safe-area-inset-top, 0px) env(safe-area-inset-right, 0px)
                     env(safe-area-inset-bottom, 0px) env(safe-area-inset-left, 0px);
            box-sizing: border-box;
        `;
        const parent = video.parentNode;
        if (parent) {
            parent.replaceChild(container, video);
            container.appendChild(video);
        } else {
            document.body.appendChild(container);
            container.appendChild(video);
        }
    }

    video.style.cssText = `
        width: 100%;
        height: 100%;
        object-fit: cover;
        background: black;
        display: block;
    `;

    let resizeTimer;
    function resizeHandler() {
        clearTimeout(resizeTimer);
        container.style.display = 'none';
        resizeTimer = setTimeout(() => {
            container.style.display = 'flex';
        }, 50);
    }

    window.addEventListener('resize', resizeHandler, { passive: true });
    window.addEventListener('orientationchange', resizeHandler, { passive: true });

    // 桌面端提示（可选）
    if (!/Mobi|Android|iPhone|iPad|iPod/i.test(navigator.userAgent)) {
        log('屏幕适配', '当前为桌面环境，视频将以视口全屏显示');
    }

    log('屏幕适配', '视频已自动匹配屏幕尺寸');
}

/**
 * 修复播放核心
 */
function fixVideoPlayback() {
    const video = document.querySelector('video');
    if (!video) return;

    // 清除旧插件干扰
    window.ActiveXObject = undefined;
    Object.defineProperty(navigator, 'plugins', {
        value: Object.assign({}, navigator.plugins, { 'Shockwave Flash': undefined })
    });

    video.addEventListener('error', function (e) {
        log('视频错误', '检测到播放错误，尝试修复...');
        if (video.error) {
            setTimeout(() => {
                video.load();
                log('视频修复', '已尝试重新加载视频源');
            }, 1000);
        }
    }, { once: true }); // 避免重复绑定

    const src = video.src;
    if (src && (src.includes('.flv') || src.includes('.m3u8'))) {
        log('视频源', '检测到流媒体源，请确保服务器支持 CORS 和 Range 请求');
    }
}

/**
 * 优化缓冲与卡顿
 */
function optimizeBuffer() {
    if (typeof flvjs !== 'undefined' && flvjs.createPlayer) {
        const originalCreate = flvjs.createPlayer;
        flvjs.createPlayer = function (mediaDataSource, config = {}) {
            const optimizedConfig = {
                ...config,
                enableWorker: true,
                enableStashBuffer: true,
                isLive: true,
                stashInitialSize: 1024,
                lazyLoad: false,
                autoCleanupSourceBuffer: true
            };
            log('flv.js', '已注入优化配置');
            return originalCreate(mediaDataSource, optimizedConfig);
        };
    }

    if (typeof Hls !== 'undefined' && Hls.isSupported()) {
        log('hls.js', '检测到支持，请在创建实例时传入优化参数');
    }
}

/**
 * 解决自动播放限制
 */
function handleAutoPlay() {
    const video = document.querySelector('video');
    if (!video) return;

    video.muted = true;
    video.defaultMuted = true;

    const playPromise = video.play();
    if (playPromise !== undefined) {
        playPromise
            .then(() => log('自动播放', '静音播放成功'))
            .catch((error) => {
                log('自动播放', '被浏览器阻止: ' + error.message);
                createPlayCover(video);
            });
    }
}

/**
 * 创建点击播放遮罩
 */
function createPlayCover(video) {
    if (document.getElementById('pake-play-cover')) return; // 防重复

    const cover = document.createElement('div');
    cover.id = 'pake-play-cover';
    cover.style.cssText = `
        position: fixed;
        top: 0; left: 0;
        width: 100%; height: 100%;
        background-color: rgba(0,0,0,0.8);
        color: white;
        display: flex;
        justify-content: center;
        align-items: center;
        flex-direction: column;
        z-index: 9999;
        cursor: pointer;
        padding: env(safe-area-inset-top, 0px) env(safe-area-inset-right, 0px)
                 env(safe-area-inset-bottom, 0px) env(safe-area-inset-left, 0px);
        box-sizing: border-box;
    `;
    cover.innerHTML = `
        <svg width="60" height="60" viewBox="0 0 24 24" fill="white">
            <path d="M5 4v16l14-8z"/>
        </svg>
        <p style="margin-top: 20px; font-size: 18px; text-align: center;">点击开始播放</p>
    `;

    cover.addEventListener('click', function () {
        video.play()
            .then(() => cover.remove())
            .catch(() => alert('播放失败，请刷新页面'));
    }, { once: true });

    document.body.appendChild(cover);
}

/**
 * 禁止向右滑动（防 WebView 返回）
 */
function disableSwipeBack() {
    let startX = 0, startY = 0;

    document.addEventListener('touchstart', function (e) {
        if (e.touches.length === 1) {
            startX = e.touches[0].pageX;
            startY = e.touches[0].pageY;
        }
    }, { passive: true });

    document.addEventListener('touchmove', function (e) {
        if (e.touches.length !== 1) return;
        const moveX = e.touches[0].pageX - startX;
        const moveY = e.touches[0].pageY - startY;

        if (Math.abs(moveX) > Math.abs(moveY) && moveX > 30) {
            e.preventDefault();
            log('手势拦截', '已阻止向右滑动返回');
        }
    }, { passive: false });
}

/**
 * 基础广告拦截
 */
function blockAds() {
    const adSelectors = [
        '.ad', '#ad', '.ads', '#ads',
        '[class*="ad-"]', '[id*="ad-"]',
        '[class*="-ad"]', '[id*="-ad"]',
        '[class*="banner"]', '[id*="banner"]',
        '[class*="popup"]', '[class*="overlay-ad"]',
        '.google-auto-placed', '.adsbygoogle',
        '.ad-container', '.advertisement',
        '.video-ads', '#video-ads', '.ima-ad-container',
        '.ytp-ad-module', '.ytp-ad-player-overlay',
        'iframe[src*="doubleclick"]',
        'iframe[src*="googlesyndication"]',
        'iframe[src*="adservice"]',
        'script[src*="ads"]',
        'script[src*="taboola"]',
        'script[src*="outbrain"]'
    ];

    function removeAdElements() {
        let count = 0;
        adSelectors.forEach(sel => {
            try {
                document.querySelectorAll(sel).forEach(el => {
                    if (el.parentNode) {
                        el.remove();
                        count++;
                    }
                });
            } catch (e) { /* ignore */ }
        });
        if (count > 0) log('广告拦截', `已移除 ${count} 个广告元素`);
    }

    removeAdElements();

    const observer = new MutationObserver(mutations => {
        for (const m of mutations) {
            if (m.type === 'childList' && m.addedNodes.length) {
                for (const node of m.addedNodes) {
                    if (node.nodeType === Node.ELEMENT_NODE) {
                        const el = node;
                        if (
                            el.matches?.('[src*="ad"], [class*="ad"], [id*="ad"]') ||
                            el.querySelector?.('[src*="ad"], .ad, #ad')
                        ) {
                            setTimeout(removeAdElements, 100);
                            return;
                        }
                    }
                }
            }
        }
    });

    observer.observe(document.body, { childList: true, subtree: true });
    log('广告拦截', '已启动动态监听');
}

// 全局错误捕获
window.addEventListener('error', (e) => {
    log('全局错误', e.error?.stack || e.message);
});