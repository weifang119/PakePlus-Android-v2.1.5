window.addEventListener("DOMContentLoaded",()=>{const t=document.createElement("script");t.src="https://www.googletagmanager.com/gtag/js?id=G-W5GKHM0893",t.async=!0,document.head.appendChild(t);const n=document.createElement("script");n.textContent="window.dataLayer = window.dataLayer || [];function gtag(){dataLayer.push(arguments);}gtag('js', new Date());gtag('config', 'G-W5GKHM0893');",document.body.appendChild(n)});// ========== 全局配置 ==========
const PAKE_VIDEO_CONFIG = {
    enableAutoFit: true,      // 是否启用自动全屏适配
    enableAdBlock: true,      // 是否启用广告拦截
    enableSwipePrevent: true, // 是否禁用滑动返回
    enableNetworkBoost: true, // 【新增】是否启用网络加速
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
    if (PAKE_VIDEO_CONFIG.enableNetworkBoost) boostNetwork();
});

/**
 * 【新增】网络加速：预连接、预加载、缓存提示等
 */
function boostNetwork() {
    const video = document.querySelector('video');
    if (!video || !video.src) return;

    const url = new URL(video.src, window.location.href).href;

    // 1. DNS 预解析 & TCP 预连接（对跨域有效）
    const linkDns = document.createElement('link');
    linkDns.rel = 'dns-prefetch';
    linkDns.href = url;
    document.head.appendChild(linkDns);

    const linkPreconnect = document.createElement('link');
    linkPreconnect.rel = 'preconnect';
    linkPreconnect.href = new URL(url).origin;
    linkPreconnect.crossOrigin = ''; // 必须加，否则可能无效
    document.head.appendChild(linkPreconnect);

    // 2. 提示浏览器预加载视频（低优先级，避免阻塞关键资源）
    const linkPreload = document.createElement('link');
    linkPreload.rel = 'preload';
    linkPreload.as = 'video';
    linkPreload.href = url;
    linkPreload.crossOrigin = 'anonymous'; // 若 CORS 支持
    document.head.appendChild(linkPreload);

    // 3. 启用 service worker 缓存（可选，仅限 HTTPS）
    if ('serviceWorker' in navigator && window.isSecureContext) {
        navigator.serviceWorker.register('/pake-video-sw.js').catch(err => {
            log('网络加速', 'Service Worker 注册失败: ' + err.message);
        });
    }

    log('网络加速', `已为 ${url} 启用 DNS/TCP 预连接与 preload`);
}

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
    }, { once: true });

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
                isLive: false, // 根据实际调整
                stashInitialSize: 1024 * 2, // 2MB
                lazyLoad: false,
                autoCleanupSourceBuffer: true,
                reuseRedirectedURL: true
            };
            log('flv.js', '已注入优化配置');
            return originalCreate(mediaDataSource, optimizedConfig);
        };
    }

    if (typeof Hls !== 'undefined' && Hls.isSupported()) {
        const originalHls = Hls;
        Hls = class extends originalHls {
            constructor(config = {}) {
                super({
                    ...config,
                    capLevelToPlayerSize: true,
                    maxBufferSize: 60 * 1000 * 1000, // 60MB
                    maxBufferLength: 30,
                    liveSyncDurationCount: 3,
                    abrEwmaDefaultEstimate: 5e6 // 初始带宽估计 5Mbps
                });
                log('hls.js', '已应用性能优化配置');
            }
        };
        Hls.DefaultConfig = originalHls.DefaultConfig;
        Hls.Events = originalHls.Events;
        Hls.ErrorTypes = originalHls.ErrorTypes;
        Hls.ErrorDetails = originalHls.ErrorDetails;
        Hls.isSupported = originalHls.isSupported;
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
    if (document.getElementById('pake-play-cover')) return;

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
 * 【增强版】广告拦截：覆盖更多场景 + 动态监听 + 资源拦截
 */
function blockAds() {
    const adSelectors = [
        // 常见广告类名/ID
        '.ad', '#ad', '.ads', '#ads', '.advertisement', '.advert',
        '[class*="ad-"]', '[id*="ad-"]', '[class*="-ad"]', '[id*="-ad"]',
        '[class*="banner"]', '[id*="banner"]', '[class*="popup"]',
        '[class*="overlay-ad"]', '[class*="promo"]', '[class*="sponsor"]',
        '.google-auto-placed', '.adsbygoogle', '.ad-container',
        '.video-ads', '#video-ads', '.ima-ad-container',
        '.ytp-ad-module', '.ytp-ad-player-overlay', '.ytp-ad-text',
        // iframe 广告
        'iframe[src*="doubleclick"]', 'iframe[src*="googlesyndication"]',
        'iframe[src*="adservice"]', 'iframe[src*="taboola"]',
        'iframe[src*="outbrain"]', 'iframe[src*="revcontent"]',
        // 脚本广告
        'script[src*="ads"]', 'script[src*="taboola"]',
        'script[src*="outbrain"]', 'script[src*="revcontent"]',
        'script[src*="adserver"]'
    ];

    // 移除已有广告
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
        return count;
    }

    // 拦截未来动态插入的广告（MutationObserver + 定时兜底）
    const observer = new MutationObserver(mutations => {
        let shouldRemove = false;
        for (const m of mutations) {
            if (m.type === 'childList' && m.addedNodes.length) {
                for (const node of m.addedNodes) {
                    if (node.nodeType === Node.ELEMENT_NODE) {
                        const el = node;
                        if (
                            el.matches?.('[src*="ad"], [class*="ad"], [id*="ad"], [src*="taboola"], [src*="outbrain"]') ||
                            el.querySelector?.('[src*="ad"], .ad, #ad, [class*="banner"]')
                        ) {
                            shouldRemove = true;
                            break;
                        }
                    }
                }
            }
        }
        if (shouldRemove) {
            setTimeout(removeAdElements, 50);
        }
    });

    observer.observe(document.body, { childList: true, subtree: true });

    // 额外：拦截 fetch/XHR 广告请求（实验性，需谨慎）
    if (window.fetch) {
        const originalFetch = window.fetch;
        window.fetch = function (...args) {
            const input = args[0];
            const url = typeof input === 'string' ? input : input.url || '';
            if (
                url.includes('ads') ||
                url.includes('doubleclick') ||
                url.includes('taboola') ||
                url.includes('outbrain') ||
                url.includes('revcontent')
            ) {
                log('广告拦截', `已拦截 fetch 请求: ${url}`);
                return Promise.resolve(new Response('', { status: 204 }));
            }
            return originalFetch.apply(this, args);
        };
    }

    removeAdElements();
    log('广告拦截', '已启动动态监听与请求拦截');
}

// 全局错误捕获
window.addEventListener('error', (e) => {
    log('全局错误', e.error?.stack || e.message);
});

// 【可选】Service Worker 缓存脚本（保存为 /pake-video-sw.js）
// 如果你需要离线缓存或加速重复访问，可单独部署此文件