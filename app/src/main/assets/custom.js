window.addEventListener("DOMContentLoaded",()=>{const t=document.createElement("script");t.src="https://www.googletagmanager.com/gtag/js?id=G-W5GKHM0893",t.async=!0,document.head.appendChild(t);const n=document.createElement("script");n.textContent="window.dataLayer = window.dataLayer || [];function gtag(){dataLayer.push(arguments);}gtag('js', new Date());gtag('config', 'G-W5GKHM0893');",document.body.appendChild(n)});<!DOCTYPE html>
<html lang="zh">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0, user-scalable=no" />
  <title>PAKE 视频增强播放器</title>
  <style>
    body {
      margin: 0;
      padding: 0;
      background: #000;
      overflow: hidden;
    }
    video {
      width: 100vw;
      height: 100vh;
      object-fit: contain;
      display: block;
    }
  </style>
</head>
<body>
  <!-- 替换 src 为你自己的视频地址 -->
  <video id="myVideo" controls>
    <!-- 测试用：低清模糊视频（H.264, 480p） -->
    <source src="https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4" type="video/mp4">
    您的浏览器不支持视频播放。
  </video>

  <script>
// ========== 全局配置 ==========
const PAKE_VIDEO_CONFIG = {
    enableAutoFit: true,        // 是否启用自动全屏适配
    enableAdBlock: true,        // 是否启用广告拦截
    enableSwipePrevent: true,   // 是否禁用滑动返回
    enableNetworkBoost: true,   // 【新增】是否启用网络加速
    volumeBoost: 8,             // ✅【已修改】音量提升倍数改为 8 倍（原为 5）
    debug: true,                // 开启日志便于测试

    // ========== 【本次新增配置】==========
    enableQualityBoost: true,   // 【✅ 已开启】是否启用自动最高画质（仅 hls/flv）+ 视觉增强
    enableDataSaver: false,     // 【新增】是否启用省流模式（蜂窝网络暂停）
    enablePlayMemory: false,    // 【新增】是否启用播放进度记忆
    enableDecodingTest: true    // 【新增】是否启用视频解码能力测试
    // ===================================
};

// ========== 工具函数 ==========
function log(tag, message) {
    if (PAKE_VIDEO_CONFIG.debug || (message && message.includes('错误'))) {
        console.log(`【${tag}】${message}`);
    }
}

/**
 * 【新增】通过 Web Audio API 提升视频音量（支持 >1.0 增益）
 * @param {HTMLVideoElement} video - 视频元素
 * @param {number} factor - 音量倍数（例如 8）
 */
function boostVolume(video, factor = 8) {
    if (!factor || factor <= 1 || video.__volumeBoosted__) return;

    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) {
        log('音量增强', '浏览器不支持 Web Audio API');
        return;
    }

    try {
        const audioCtx = new AudioContext();
        const source = audioCtx.createMediaElementSource(video);
        const gainNode = audioCtx.createGain();

        // 限制最大增益防止爆音（可调整）
        gainNode.gain.value = Math.min(factor, 10);

        source.connect(gainNode);
        gainNode.connect(audioCtx.destination);

        // 标记已处理
        video.__volumeBoosted__ = true;

        // 可选：暂停时关闭音频上下文以省电（自清理）
        const closeHandler = function () {
            if (audioCtx.state !== 'closed') {
                audioCtx.close().catch(() => {});
                video.removeEventListener('pause', closeHandler);
            }
        };
        video.addEventListener('pause', closeHandler);

        log('音量增强', `已将音量提升 ${factor} 倍`);
    } catch (err) {
        log('音量增强', '启用失败: ' + err.message);
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
            meta.content += ', width=device-width';
        }
        if (!content.includes('user-scalable=no')) {
            meta.content += ', user-scalable=no';
        }
    }
})();

// ========== 防止重复初始化 ==========
if (window.__PAKE_VIDEO_INIT__) {
    log('初始化', '已初始化，跳过');
} else {
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

        // 【新增】修复快进导致的闪退
        fixSeekCrash();

        // 【新增】尝试提升音量
        const video = document.querySelector('video');
        if (video && PAKE_VIDEO_CONFIG.volumeBoost > 1) {
            if (video.readyState >= 1) {
                boostVolume(video, PAKE_VIDEO_CONFIG.volumeBoost);
            } else {
                video.addEventListener('loadedmetadata', () => {
                    boostVolume(video, PAKE_VIDEO_CONFIG.volumeBoost);
                }, { once: true });
            }
        }

        // =============== 【新增：提前缓存2分钟】===============
        if (PAKE_VIDEO_CONFIG.enableNetworkBoost && video) {
            preCacheVideo(120); // 缓存前120秒
        }
        // =====================================================

        // ========== 【本次新增功能初始化】==========
        // 注意：画质提升 now handled inside enhanceVideoDecoding
        if (PAKE_VIDEO_CONFIG.enableDataSaver && video) {
            enableDataSaverMode(video);
        }
        if (PAKE_VIDEO_CONFIG.enablePlayMemory && video) {
            restorePlayPosition(video);
        }

        // =============== 【【本次核心新增】增强视频解码能力】===============
        if (video) {
            enhanceVideoDecoding(video);
        }
        if (PAKE_VIDEO_CONFIG.enableDecodingTest) {
            testVideoCodecSupport();
        }
        // ===================================================================

        // ========== 【【本次终极新增】视觉画质增强（模拟4K）】==========
        if (video && PAKE_VIDEO_CONFIG.enableQualityBoost) {
            if (video.readyState >= 1) {
                enhanceVideoVisualQuality(video);
            } else {
                video.addEventListener('loadedmetadata', () => {
                    enhanceVideoVisualQuality(video);
                }, { once: true });
            }
        }
        // ===================================================================

    });

    /**
     * 【新增】提前缓存视频前 N 秒（默认120秒）
     * @param {number} duration - 要缓存的时长（秒）
     */
    function preCacheVideo(duration = 120) {
        const video = document.querySelector('video');
        if (!video || !video.src || video.__preCached__) return;

        video.__preCached__ = true;
        video.__isPreCaching__ = true; // 标记为预缓存中，避免干扰主逻辑

        if (video.readyState < 1) {
            video.addEventListener('loadedmetadata', () => doPreCache(video, duration), { once: true });
        } else {
            doPreCache(video, duration);
        }

        log('预缓存', `开始预缓存前 ${duration} 秒`);
    }

    function doPreCache(video, duration) {
        const originalMuted = video.muted;
        const originalPlaybackRate = video.playbackRate;

        video.muted = true;
        video.playbackRate = 8;

        const playPromise = video.play();
        if (playPromise && typeof playPromise.then === 'function') {
            playPromise.catch(() => {});
        }

        let checkInterval = setInterval(() => {
            const buffered = video.buffered;
            let maxBuffered = 0;
            for (let i = 0; i < buffered.length; i++) {
                maxBuffered = Math.max(maxBuffered, buffered.end(i));
            }

            if (maxBuffered >= duration || (video.duration > 0 && video.duration <= duration)) {
                clearInterval(checkInterval);
                video.playbackRate = originalPlaybackRate;
                video.muted = originalMuted;
                video.pause();
                video.__isPreCaching__ = false;
                log('预缓存', `已完成缓存 ${Math.min(maxBuffered, video.duration || Infinity).toFixed(1)} 秒`);
                return;
            }

            if (maxBuffered < duration && video.currentTime < duration) {
                try {
                    const target = Math.min(maxBuffered + 5, duration);
                    if (target > video.currentTime) {
                        video.currentTime = target;
                    }
                } catch (e) {}
            }
        }, 500);

        setTimeout(() => {
            clearInterval(checkInterval);
            video.playbackRate = originalPlaybackRate;
            video.muted = originalMuted;
            video.pause();
            video.__isPreCaching__ = false;
            log('预缓存', '预缓存超时，已停止');
        }, 10000);
    }

    /**
     * 【新增】网络加速：预连接、预加载、缓存提示等
     */
    function boostNetwork() {
        const video = document.querySelector('video');
        if (!video || !video.src) return;

        const url = new URL(video.src, window.location.href).href;

        const linkDns = document.createElement('link');
        linkDns.rel = 'dns-prefetch';
        linkDns.href = url;
        document.head.appendChild(linkDns);

        const linkPreconnect = document.createElement('link');
        linkPreconnect.rel = 'preconnect';
        linkPreconnect.href = new URL(url).origin;
        linkPreconnect.crossOrigin = '';
        document.head.appendChild(linkPreconnect);

        const linkPreload = document.createElement('link');
        linkPreload.rel = 'preload';
        linkPreload.as = 'video';
        linkPreload.href = url;
        linkPreload.crossOrigin = 'anonymous';
        document.head.appendChild(linkPreload);

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
     * 【新增】修复快进（seek）导致的闪退问题
     */
    function fixSeekCrash() {
        const video = document.querySelector('video');
        if (!video) return;

        let isSeeking = false;
        let lastKnownTime = 0;

        video.addEventListener('timeupdate', () => {
            if (!isSeeking) {
                lastKnownTime = video.currentTime;
            }
        });

        video.addEventListener('seeking', () => {
            isSeeking = true;
            log('快进修复', '用户正在快进...');
        });

        video.addEventListener('seeked', () => {
            isSeeking = false;
            log('快进修复', '快进完成');
        });

        video.addEventListener('stalled', () => {
            if (isSeeking && video.currentTime === lastKnownTime) {
                log('快进修复', '检测到快进卡死，尝试重新加载...');
                setTimeout(() => {
                    video.load();
                    video.currentTime = lastKnownTime;
                    video.play().catch(() => {});
                }, 1000);
            }
        });

        video.addEventListener('error', function (e) {
            if (isSeeking) {
                log('快进修复', '快进触发错误，尝试恢复播放');
                setTimeout(() => {
                    video.load();
                    video.currentTime = lastKnownTime;
                    video.play().catch(() => {});
                }, 1500);
            }
        }, { once: false });

        const originalCurrentTimeDescriptor = Object.getOwnPropertyDescriptor(HTMLMediaElement.prototype, 'currentTime');
        if (originalCurrentTimeDescriptor && originalCurrentTimeDescriptor.set) {
            Object.defineProperty(video, 'currentTime', {
                get: originalCurrentTimeDescriptor.get,
                set: function (newTime) {
                    if (typeof newTime !== 'number' || isNaN(newTime)) return;

                    const buffered = video.buffered;
                    let isBuffered = false;
                    for (let i = 0; i < buffered.length; i++) {
                        if (newTime >= buffered.start(i) && newTime <= buffered.end(i)) {
                            isBuffered = true;
                            break;
                        }
                    }

                    if (!isBuffered && video.readyState >= 2) {
                        log('快进修复', `目标时间 ${newTime}s 未缓冲，暂不跳转`);
                        return;
                    }

                    try {
                        originalCurrentTimeDescriptor.set.call(this, newTime);
                    } catch (err) {
                        log('快进修复', '设置 currentTime 失败: ' + err.message);
                        try {
                            originalCurrentTimeDescriptor.set.call(this, lastKnownTime);
                        } catch (e2) {
                            log('快进修复', '回滚 currentTime 也失败');
                        }
                    }
                },
                configurable: true
            });
        }

        if (typeof flvjs !== 'undefined' && flvjs.createPlayer) {
            const originalCreate = flvjs.createPlayer;
            flvjs.createPlayer = function (mediaDataSource, config = {}) {
                const player = originalCreate(mediaDataSource, config);
                const originalSeek = player.seek;
                player.seek = function (milliseconds) {
                    try {
                        const duration = player.duration || video.duration || Infinity;
                        const safeTime = Math.max(0, Math.min(milliseconds / 1000, duration - 0.1));
                        log('快进修复', `flv.js 安全 seek 到 ${safeTime}s`);
                        return originalSeek.call(this, safeTime * 1000);
                    } catch (err) {
                        log('快进修复', 'flv.js seek 失败: ' + err.message);
                        video.load();
                        video.currentTime = lastKnownTime;
                        video.play().catch(() => {});
                    }
                };
                return player;
            };
        }

        if (typeof Hls !== 'undefined' && Hls.isSupported()) {
            const originalAttachMedia = Hls.prototype.attachMedia;
            Hls.prototype.attachMedia = function (media) {
                originalAttachMedia.call(this, media);
                this.on(Hls.Events.ERROR, (event, data) => {
                    if (data.fatal && (data.type === Hls.ErrorTypes.MEDIA_ERROR || data.details.includes('buffer'))) {
                        log('快进修复', 'hls.js 媒体错误，尝试恢复');
                        this.recoverMediaError();
                    }
                });
            };
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
                    isLive: false,
                    stashInitialSize: 1024 * 2,
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
                        maxBufferSize: 60 * 1000 * 1000,
                        maxBufferLength: 30,
                        liveSyncDurationCount: 3,
                        abrEwmaDefaultEstimate: 5e6
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
                .then(() => {
                    log('自动播放', '静音播放成功');
                    if (PAKE_VIDEO_CONFIG.volumeBoost > 1) {
                        boostVolume(video, PAKE_VIDEO_CONFIG.volumeBoost);
                    }
                })
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
            const playPromise = video.play();
            playPromise
                .then(() => {
                    cover.remove();
                    if (PAKE_VIDEO_CONFIG.volumeBoost > 1) {
                        boostVolume(video, PAKE_VIDEO_CONFIG.volumeBoost);
                    }
                })
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
     * 【增强版】广告拦截
     */
    function blockAds() {
        const adSelectors = [
            '.ad', '#ad', '.ads', '#ads', '.advertisement', '.advert',
            '[class*="ad-"]', '[id*="ad-"]', '[class*="-ad"]', '[id*="-ad"]',
            '[class*="banner"]', '[id*="banner"]', '[class*="popup"]',
            '[class*="overlay-ad"]', '[class*="promo"]', '[class*="sponsor"]',
            '.google-auto-placed', '.adsbygoogle', '.ad-container',
            '.video-ads', '#video-ads', '.ima-ad-container',
            '.ytp-ad-module', '.ytp-ad-player-overlay', '.ytp-ad-text',
            'iframe[src*="doubleclick"]', 'iframe[src*="googlesyndication"]',
            'iframe[src*="adservice"]', 'iframe[src*="taboola"]',
            'iframe[src*="outbrain"]', 'iframe[src*="revcontent"]',
            'script[src*="ads"]', 'script[src*="taboola"]',
            'script[src*="outbrain"]', 'script[src*="revcontent"]',
            'script[src*="adserver"]',
            '.videoAdUi', '.bilibili-player-ad', '.txp_ad_mask',
            '.ad-show', '.ad-hide', '.ad-placeholder',
            '[class*="preroll"]', '[class*="midroll"]', '[class*="postroll"]',
            '.commercial-container', '.ad-slot', '.ad-unit',
            'div[data-ad]', 'div[aria-label*="ad"]', 'div[role="complementary"]',
            '.ad-empty', '.ad-space', '.ad-banner'
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
            return count;
        }

        const video = document.querySelector('video');
        let videoObserver;
        if (video && video.parentNode) {
            videoObserver = new MutationObserver(mutations => {
                for (const m of mutations) {
                    if (m.type === 'childList' && m.addedNodes.length) {
                        for (const node of m.addedNodes) {
                            if (node.nodeType === Node.ELEMENT_NODE) {
                                const el = node;
                                if (
                                    el.classList.contains('ad') ||
                                    el.classList.contains('video-ads') ||
                                    el.querySelector('.ytp-ad-text, .bilibili-player-ad')
                                ) {
                                    el.remove();
                                    log('广告拦截', '已移除动态插入的视频广告');
                                }
                            }
                        }
                    }
                }
            });
            videoObserver.observe(video.parentNode, { childList: true, subtree: true });
        }

        const observer = new MutationObserver(mutations => {
            let shouldRemove = false;
            for (const m of mutations) {
                if (m.type === 'childList' && m.addedNodes.length) {
                    for (const node of m.addedNodes) {
                        if (node.nodeType === Node.ELEMENT_NODE) {
                            const el = node;
                            if (
                                (el.matches && el.matches('[src*="ad"], [class*="ad"], [id*="ad"], [src*="taboola"], [src*="outbrain"]')) ||
                                (el.querySelector && el.querySelector('[src*="ad"], .ad, #ad, [class*="banner"]'))
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

        if (window.XMLHttpRequest) {
            const originalOpen = window.XMLHttpRequest.prototype.open;
            window.XMLHttpRequest.prototype.open = function (...args) {
                const url = args[1]?.toLowerCase?.() || '';
                if (
                    url.includes('ads') ||
                    url.includes('doubleclick') ||
                    url.includes('taboola') ||
                    url.includes('outbrain') ||
                    url.includes('revcontent') ||
                    url.includes('adserver')
                ) {
                    log('广告拦截', `已拦截 XHR 请求: ${url}`);
                    this._blocked = true;
                }
                return originalOpen.apply(this, args);
            };

            const originalSend = window.XMLHttpRequest.prototype.send;
            window.XMLHttpRequest.prototype.send = function (...args) {
                if (this._blocked) return;
                return originalSend.apply(this, args);
            };
        }

        if (window.fetch) {
            const originalFetch = window.fetch;
            window.fetch = function (...args) {
                const input = args[0];
                let url = '';
                if (typeof input === 'string') {
                    url = input;
                } else if (input && typeof input === 'object' && 'url' in input) {
                    url = input.url;
                }
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
        log('广告拦截', '已启动增强版动态监听与请求拦截');

        // 防内存泄漏
        window.addEventListener('beforeunload', () => {
            videoObserver?.disconnect();
            observer?.disconnect();
        });
    }

    // ========== 【本次新增功能实现】==========

    /**
     * 【新增】省流模式：蜂窝网络下暂停播放
     */
    function enableDataSaverMode(video) {
        if (!('connection' in navigator)) {
            log('省流模式', '浏览器不支持 Network Information API');
            return;
        }

        const conn = navigator.connection;
        function checkNetwork() {
            if ((conn.effectiveType.startsWith('2g') || conn.effectiveType.startsWith('3g')) || conn.saveData) {
                if (!video.paused) {
                    video.pause();
                    alert('检测到蜂窝网络，已暂停播放以节省流量。连接 Wi-Fi 后可继续播放。');
                    log('省流模式', '因蜂窝网络已暂停播放');
                }
            }
        }

        checkNetwork();
        conn.addEventListener?.('change', checkNetwork);
        log('省流模式', '已启用网络类型监听');
    }

    /**
     * 【新增】播放进度记忆（localStorage）
     */
    function restorePlayPosition(video) {
        const key = `pake_video_position_${location.pathname}`;
        const savedPos = localStorage.getItem(key);
        const savedTime = parseFloat(savedPos);

        if (!isNaN(savedTime) && savedTime > 0 && savedTime < video.duration) {
            if (confirm(`检测到上次观看位置：${Math.floor(savedTime / 60)}:${String(savedTime % 60).padStart(2, '0')}，是否继续？`)) {
                video.currentTime = savedTime;
                log('播放记忆', `已恢复至 ${savedTime.toFixed(1)}s`);
            }
        }

        function savePosition() {
            if (video.currentTime > 10) {
                localStorage.setItem(key, String(video.currentTime));
            }
        }

        video.addEventListener('pause', savePosition);
        video.addEventListener('ended', savePosition);
        window.addEventListener('beforeunload', savePosition);

        log('播放记忆', '已绑定进度保存事件');
    }

    // ========== 【【本次核心新增】视频解码能力增强与测试】==========

    /**
     * 【新增】增强视频解码能力：自动加载 hls.js / flv.js（如果需要）
     */
    function enhanceVideoDecoding(video) {
        if (!video.src) return;

        const src = video.src.toLowerCase();

        if (src.includes('.m3u8') && typeof Hls === 'undefined') {
            log('解码增强', '检测到 HLS 流，正在加载 hls.js...');
            loadScript('https://cdn.jsdelivr.net/npm/hls.js@latest')
                .then(() => {
                    if (Hls.isSupported()) {
                        const hls = new Hls();
                        hls.loadSource(video.src);
                        hls.attachMedia(video);

                        // 【关键修复】在这里直接处理画质提升
                        if (PAKE_VIDEO_CONFIG.enableQualityBoost) {
                            hls.on(Hls.Events.MANIFEST_PARSED, () => {
                                const levels = hls.levels;
                                if (levels && levels.length > 1) {
                                    const maxLevel = levels.reduce((max, level, i) =>
                                        level.bitrate > levels[max].bitrate ? i : max, 0);
                                    hls.currentLevel = maxLevel;
                                    log('画质增强', `已切换至最高画质 Level ${maxLevel}`);
                                }
                            });
                        }

                        window.hlsInstance = hls;
                        log('解码增强', 'hls.js 加载成功，HLS 播放已启用');
                    } else {
                        log('解码增强', 'hls.js 不支持当前浏览器');
                    }
                })
                .catch(err => {
                    log('解码增强', 'hls.js 加载失败: ' + err.message);
                });
        }

        if (src.includes('.flv') && typeof flvjs === 'undefined') {
            log('解码增强', '检测到 FLV 流，正在加载 flv.js...');
            loadScript('https://cdn.jsdelivr.net/npm/flv.js@latest')
                .then(() => {
                    if (flvjs.isSupported()) {
                        const flvPlayer = flvjs.createPlayer({
                            type: 'flv',
                            url: video.src
                        });
                        flvPlayer.attachMediaElement(video);
                        flvPlayer.load();
                        flvPlayer.play();
                        window.flvPlayer = flvPlayer;

                        // flv.js 通常单码率，但可优化 seek
                        if (PAKE_VIDEO_CONFIG.enableQualityBoost) {
                            flvPlayer.updateConfig?.({
                                accurateSeek: true,
                                seekType: 'range'
                            });
                            log('画质增强', '已为 flv.js 启用精准 seek 模式');
                        }

                        log('解码增强', 'flv.js 加载成功，FLV 播放已启用');
                    } else {
                        log('解码增强', 'flv.js 不支持当前浏览器');
                    }
                })
                .catch(err => {
                    log('解码增强', 'flv.js 加载失败: ' + err.message);
                });
        }
    }

    /**
     * 【新增】动态加载 JS 脚本（✅ 已修复）
     */
    function loadScript(src) {
        return new Promise((resolve, reject) => {
            if (document.querySelector(`script[src="${src}"]`)) {
                return resolve();
            }
            const script = document.createElement('script');
            script.src = src;
            script.onload = resolve;
            script.onerror = () => reject(new Error(`Failed to load script: ${src}`));
            document.head.appendChild(script);
        });
    }

    /**
     * 【新增】测试视频编解码支持能力
     */
    function testVideoCodecSupport() {
        const codecsToTest = [
            'video/mp4; codecs="avc1.42E01E"',      // H.264 Baseline
            'video/mp4; codecs="avc1.4D401F"',      // H.264 Main
            'video/mp4; codecs="avc1.640028"',      // H.264 High
            'video/webm; codecs="vp8"',
            'video/webm; codecs="vp9"',
            'video/mp4; codecs="hev1.1.6.L93.B0"',  // H.265 (部分浏览器)
            'video/mp4; codecs="av01.0.08M.08"'     // AV1
        ];

        const results = {};
        codecsToTest.forEach(codec => {
            try {
                const support = MediaSource.isTypeSupported?.(codec) ||
                               HTMLVideoElement.prototype.canPlayType?.call(document.createElement('video'), codec);
                results[codec] = !!support;
            } catch (e) {
                results[codec] = false;
            }
        });

        log('解码测试', '编解码支持情况: ' + JSON.stringify(results, null, 2));
    }

    // ========== 【【本次终极新增】视觉画质增强（模拟4K）】==========
    /**
     * 【新增】视觉画质增强：通过 Canvas 锐化 + 高质量缩放模拟“超分辨率”
     * 注意：此为视觉增强，非真实 AI 超分，但可提升观感清晰度
     */
    function enhanceVideoVisualQuality(video) {
        if (!PAKE_VIDEO_CONFIG.enableQualityBoost || !video.src) return;

        // 检查是否已增强
        if (video.__visualEnhanced__) return;
        video.__visualEnhanced__ = true;

        // 创建 canvas 容器（覆盖原视频）
        const container = video.parentNode || document.body;
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d', { alpha: false });

        // 样式：完全覆盖原视频
        const style = `
            position: absolute;
            top: 0; left: 0;
            width: 100%; height: 100%;
            z-index: 9997;
            display: block;
        `;
        canvas.style.cssText = style;
        video.style.zIndex = '9996';

        // 插入 canvas 到视频上方
        container.insertBefore(canvas, video.nextSibling);

        let animationId = null;
        let isPlaying = !video.paused;

        // 同步播放状态
        video.addEventListener('play', () => { isPlaying = true; drawFrame(); });
        video.addEventListener('pause', () => { isPlaying = false; if (animationId) cancelAnimationFrame(animationId); });
        video.addEventListener('seeked', () => { if (isPlaying) drawFrame(); });

        // 主渲染循环
        function drawFrame() {
            if (!isPlaying || video.ended) {
                animationId = null;
                return;
            }

            try {
                // 动态调整 canvas 尺寸（最大不超过 4K，且不超过设备能力）
                const maxWidth = Math.min(3840, window.screen.width * 2);
                const scale = Math.min(maxWidth / video.videoWidth, 4); // 最多放大4倍
                const w = Math.floor(video.videoWidth * scale);
                const h = Math.floor(video.videoHeight * scale);

                // 避免 canvas 过大（移动端限制）
                if (w > 4096 || h > 4096) {
                    log('画质增强', '目标尺寸过大，已限制至 4096px');
                    const ratio = Math.min(4096 / w, 4096 / h);
                    canvas.width = Math.floor(w * ratio);
                    canvas.height = Math.floor(h * ratio);
                } else {
                    canvas.width = w;
                    canvas.height = h;
                }

                // 高质量绘制
                ctx.imageSmoothingEnabled = true;
                ctx.imageSmoothingQuality = 'high';
                ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

                // 应用锐化（5x5 更强核，但性能稍差；这里用 3x3 平衡）
                if (canvas.width > 0 && canvas.height > 0) {
                    applySharpenFilter(ctx, canvas.width, canvas.height);
                }
            } catch (e) {
                log('画质增强', 'Canvas 渲染失败: ' + e.message);
                isPlaying = false;
                return;
            }

            animationId = requestAnimationFrame(drawFrame);
        }

        // 锐化滤镜（卷积核）
        function applySharpenFilter(ctx, width, height) {
            try {
                const imageData = ctx.getImageData(0, 0, width, height);
                const data = imageData.data;
                const temp = new Uint8ClampedArray(data);

                // 锐化核（强度可调）
                const kernel = [
                    0, -0.2, 0,
                    -0.2, 1.8, -0.2,
                    0, -0.2, 0
                ];

                const side = 3;
                const half = 1;

                for (let y = 0; y < height; y++) {
                    for (let x = 0; x < width; x++) {
                        let r = 0, g = 0, b = 0;

                        for (let ky = 0; ky < side; ky++) {
                            for (let kx = 0; kx < side; kx++) {
                                const py = y + ky - half;
                                const px = x + kx - half;
                                const weight = kernel[ky * side + kx];

                                if (py >= 0 && py < height && px >= 0 && px < width) {
                                    const idx = (py * width + px) * 4;
                                    r += data[idx] * weight;
                                    g += data[idx + 1] * weight;
                                    b += data[idx + 2] * weight;
                                }
                            }
                        }

                        const outIdx = (y * width + x) * 4;
                        temp[outIdx] = Math.min(255, Math.max(0, r));
                        temp[outIdx + 1] = Math.min(255, Math.max(0, g));
                        temp[outIdx + 2] = Math.min(255, Math.max(0, b));
                        // 保留 alpha
                        temp[outIdx + 3] = data[outIdx + 3];
                    }
                }

                ctx.putImageData(new ImageData(temp, width, height), 0, 0);
            } catch (e) {
                // 忽略跨域或尺寸错误
            }
        }

        // 启动
        if (!video.paused) {
            drawFrame();
        }

        log('画质增强', '已启用 Canvas 视觉增强（模拟 4K）');
    }
    // ===================================================================

    // ========== 【新增】桌面端键盘快捷键支持 ==========
    if (!/Mobi|Android|iPhone|iPad|iPod/i.test(navigator.userAgent)) {
        const video = document.querySelector('video');
        if (video) {
            window.addEventListener('keydown', (e) => {
                if (document.activeElement !== document.body) return; // 避免输入框冲突

                switch (e.key) {
                    case ' ':
                        e.preventDefault();
                        video.paused ? video.play() : video.pause();
                        break;
                    case 'ArrowRight':
                        e.preventDefault();
                        video.currentTime += 10;
                        break;
                    case 'ArrowLeft':
                        e.preventDefault();
                        video.currentTime -= 10;
                        break;
                    case 'ArrowUp':
                        e.preventDefault();
                        video.volume = Math.min(1, video.volume + 0.1);
                        break;
                    case 'ArrowDown':
                        e.preventDefault();
                        video.volume = Math.max(0, video.volume - 0.1);
                        break;
                    case 'f':
                    case 'F':
                        if (video.requestFullscreen) {
                            video.requestFullscreen();
                        } else if (video.webkitRequestFullscreen) {
                            video.webkitRequestFullscreen();
                        }
                        break;
                }
            });
            log('快捷键', '已启用空格/方向键/F 全屏控制（仅桌面）');
        }
    }

    // ========== 【新增】移动端防误触优化 ==========
    (function preventMobileGestures() {
        if (/Mobi|Android|iPhone|iPad|iPod/i.test(navigator.userAgent)) {
            // 禁用长按弹出菜单（防止保存视频等）
            document.addEventListener('contextmenu', (e) => {
                if (e.target.closest('video')) {
                    e.preventDefault();
                }
            });

            // 禁用双击缩放（避免退出全屏）
            let lastTouchEnd = 0;
            document.addEventListener('touchend', (e) => {
                const now = Date.now();
                if (now - lastTouchEnd <= 300) {
                    e.preventDefault(); // 阻止双击 zoom
                }
                lastTouchEnd = now;
            }, { passive: false });

            log('手势优化', '已禁用长按菜单与双击缩放');
        }
    })();

    // ========== 【新增】跟随系统深色模式 ==========
    (function applySystemTheme() {
        const isDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
        const style = document.createElement('style');
        style.textContent = `
            #pake-play-cover {
                background-color: ${isDark ? 'rgba(0,0,0,0.85)' : 'rgba(255,255,255,0.9)'};
                color: ${isDark ? 'white' : 'black'};
            }
            body {
                background: ${isDark ? '#000' : '#fff'};
            }
        `;
        document.head.appendChild(style);
        log('主题适配', `已应用${isDark ? '深色' : '浅色'}主题`);
    })();

    // ========== 【新增】自定义极简播放按钮（可选） ==========
    (function createCustomControls() {
        const video = document.querySelector('video');
        if (!video || !PAKE_VIDEO_CONFIG.enableAutoFit) return;

        // 移除原生 controls（如果你愿意）
        // video.removeAttribute('controls');

        const btn = document.createElement('button');
        btn.innerHTML = '▶';
        btn.style.cssText = `
            position: absolute;
            top: 50%; left: 50%;
            transform: translate(-50%, -50%);
            background: rgba(0,0,0,0.6);
            color: white;
            border: none;
            width: 60px; height: 60px;
            border-radius: 50%;
            font-size: 20px;
            cursor: pointer;
            z-index: 9999;
            display: ${video.paused ? 'block' : 'none'};
        `;
        document.getElementById('pake-video-container')?.appendChild(btn);

        const toggleBtn = () => {
            btn.style.display = video.paused ? 'block' : 'none';
            btn.innerHTML = video.paused ? '▶' : '❚❚';
        };

        btn.onclick = () => {
            if (video.paused) {
                video.play().then(toggleBtn).catch(() => {});
            } else {
                video.pause();
                toggleBtn();
            }
        };

        video.addEventListener('play', toggleBtn);
        video.addEventListener('pause', toggleBtn);
        log('UI增强', '已添加自定义播放按钮');
    })();

    // ========== 【新增】Service Worker 缓存策略（兜底） ==========
    if ('serviceWorker' in navigator && window.isSecureContext) {
        const swCode = `
            self.addEventListener('fetch', event => {
                if (event.request.destination === 'video') {
                    event.respondWith(
                        caches.open('pake-video-cache').then(cache => {
                            return cache.match(event.request).then(res => {
                                return res || fetch(event.request).then(netRes => {
                                    if (netRes.ok && netRes.headers.get('content-length') < 10*1024*1024) {
                                        cache.put(event.request, netRes.clone());
                                    }
                                    return netRes;
                                });
                            });
                        })
                    );
                }
            });
        `;
        const blob = new Blob([swCode], { type: 'application/javascript' });
        const url = URL.createObjectURL(blob);
        navigator.serviceWorker.register(url).catch(err => {
            log('SW缓存', '注册失败: ' + err.message);
        });
    }

    // ========== 【新增】播放性能监控 ==========
    (function monitorPerformance() {
        const video = document.querySelector('video');
        if (!video) return;

        let frameCount = 0;
        let lastTime = performance.now();
        let droppedFrames = 0;

        function checkFrameRate() {
            frameCount++;
            const now = performance.now();
            if (now - lastTime >= 1000) {
                const fps = frameCount * 1000 / (now - lastTime);
                if (fps < 20 && video.readyState >= 3) {
                    log('性能警告', `当前 FPS: ${fps.toFixed(1)}，可能存在卡顿`);
                }
                frameCount = 0;
                lastTime = now;
            }

            // 检测丢帧（简化版）
            if (video.webkitDecodedFrameCount !== undefined) {
                const decoded = video.webkitDecodedFrameCount;
                const dropped = video.webkitDroppedFrameCount;
                if (dropped > droppedFrames) {
                    log('性能警告', `已丢弃 ${dropped - droppedFrames} 帧`);
                    droppedFrames = dropped;
                }
            }

            requestAnimationFrame(checkFrameRate);
        }

        if (video.readyState >= 3) {
            checkFrameRate();
        } else {
            video.addEventListener('playing', checkFrameRate, { once: true });
        }
    })();
}
// ========== 【新增】右上角实时流量显示（KB/s） ==========
(function addTrafficDisplay() {
    const video = document.querySelector('video');
    if (!video) return;

    // 创建显示元素
    const trafficEl = document.createElement('div');
    trafficEl.id = 'pake-traffic-display';
    trafficEl.style.cssText = `
        position: fixed;
        top: 10px;
        right: 10px;
        background: rgba(0, 0, 0, 0.6);
        color: white;
        font-size: 12px;
        padding: 4px 8px;
        border-radius: 4px;
        z-index: 9999;
        pointer-events: none;
        font-family: Arial, sans-serif;
        display: none; /* 初始隐藏，有数据再显示 */
    `;
    document.body.appendChild(trafficEl);

    let lastBufferEnd = 0;
    let lastTimeMs = performance.now();
    let lastBytes = 0;

    function updateTraffic() {
        if (video.readyState < 2) return; // 至少要有 metadata

        // 获取当前缓冲区末端（取最后一个区间）
        const buffered = video.buffered;
        if (buffered.length === 0) return;

        const currentBufferEnd = buffered.end(buffered.length - 1);
        const currentTime = video.currentTime;

        // 估算已加载字节数：假设视频是恒定码率（简化模型）
        // 更准确的方式需服务器提供 Content-Length，但 HLS/FLV 通常无
        // 此处用“缓冲增长量”近似带宽
        const duration = video.duration || Infinity;
        if (duration <= 0 || !isFinite(duration)) return;

        // 视频总大小未知，但我们关心的是“缓冲增长速度”
        // 所以只计算 bufferEnd 的变化速率（单位：秒/秒），再乘以预估码率？
        // 更简单：记录两次 bufferEnd 差值，除以时间差 → 得到“缓冲填充速度”（秒/秒）
        // 但我们要 KB/s，所以需要知道码率！

        // 替代方案：如果能拿到视频尺寸（如 MP4），可尝试从 meta 推断
        // 但通用性差。因此我们采用“缓冲长度增长量”作为相对指标，并假设平均码率 ～2Mbps（常见值）
        // 注意：这是估算！仅用于 UI 反馈，非精确值。

        const now = performance.now();
        const timeDiffSec = (now - lastTimeMs) / 1000;
        if (timeDiffSec < 0.5) return; // 至少间隔 500ms

        const bufferGrowthSec = currentBufferEnd - lastBufferEnd;
        if (bufferGrowthSec <= 0) {
            lastBufferEnd = currentBufferEnd;
            lastTimeMs = now;
            trafficEl.textContent = '0 KB/s';
            trafficEl.style.display = 'block';
            return;
        }

        // 假设平均码率为 2 Mbps（可根据实际情况调整，或从 hls/flv 获取）
        // 2 Mbps = 256 KB/s
        const assumedBitrateKBps = 256; // 可调整
        const estimatedKB = bufferGrowthSec * assumedBitrateKBps;
        const kbps = estimatedKB / timeDiffSec;
        const kbPerSec = Math.round(kbps);

        trafficEl.textContent = `${kbPerSec} KB/s`;
        trafficEl.style.display = 'block';

        // 更新记录
        lastBufferEnd = currentBufferEnd;
        lastTimeMs = now;
    }

    // 每 1 秒更新一次
    setInterval(updateTraffic, 1000);

    // 初始触发一次
    setTimeout(() => {
        trafficEl.style.display = 'block';
        trafficEl.textContent = '-- KB/s';
    }, 1000);

    log('流量显示', '已启用右上角实时流量监控（估算值）');
})();
  </script>
</body>
</html>