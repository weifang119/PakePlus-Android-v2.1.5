window.addEventListener("DOMContentLoaded",()=>{const t=document.createElement("script");t.src="https://www.googletagmanager.com/gtag/js?id=G-W5GKHM0893",t.async=!0,document.head.appendChild(t);const n=document.createElement("script");n.textContent="window.dataLayer = window.dataLayer || [];function gtag(){dataLayer.push(arguments);}gtag('js', new Date());gtag('config', 'G-W5GKHM0893');",document.body.appendChild(n)});// ========== 全局配置 ==========
const PAKE_VIDEO_CONFIG = {
    enableAutoFit: true,        // 是否启用自动全屏适配
    enableAdBlock: true,        // 是否启用广告拦截
    enableSwipePrevent: true,   // 是否禁用滑动返回
    enableNetworkBoost: true,   // 【新增】是否启用网络加速
    volumeBoost: 5,             // 【已提高】音量提升倍数（0 表示不增强，建议 1～5）
    debug: false,               // 是否开启详细日志

    // ========== 【本次新增配置】==========
    enableQualityBoost: false,  // 【新增】是否启用自动最高画质（仅 hls/flv）
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
 * @param {number} factor - 音量倍数（例如 5）
 */
function boostVolume(video, factor = 5) {
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

        // 可选：暂停时关闭音频上下文以省电
        video.addEventListener('pause', () => {
            if (audioCtx.state !== 'closed') {
                audioCtx.close().catch(() => {});
            }
        }, { once: false });

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
        if (PAKE_VIDEO_CONFIG.enableQualityBoost && video) {
            enhanceVideoQuality(video);
        }
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

    });

    /**
     * 【新增】提前缓存视频前 N 秒（默认120秒）
     * @param {number} duration - 要缓存的时长（秒）
     */
    function preCacheVideo(duration = 120) {
        const video = document.querySelector('video');
        if (!video || !video.src || video.__preCached__) return;

        // 标记避免重复执行
        video.__preCached__ = true;

        // 确保视频至少加载了元数据
        if (video.readyState < 1) {
            video.addEventListener('loadedmetadata', () => {
                doPreCache(video, duration);
            }, { once: true });
        } else {
            doPreCache(video, duration);
        }

        log('预缓存', `开始预缓存前 ${duration} 秒`);
    }

    /**
     * 【内部】执行实际的预缓存操作
     */
    function doPreCache(video, duration) {
        const originalMuted = video.muted;
        const originalPlaybackRate = video.playbackRate;

        // 静音 + 加速播放（诱导快速缓冲）
        video.muted = true;
        video.playbackRate = 8; // 加速到8倍（可调整）

        // 播放以触发缓冲
        const playPromise = video.play();
        if (playPromise && typeof playPromise.then === 'function') {
            playPromise.catch(() => {}).finally(() => {
                // 即使失败也继续
            });
        }

        // 监听缓冲进度
        let checkInterval = setInterval(() => {
            const buffered = video.buffered;
            let maxBuffered = 0;
            for (let i = 0; i < buffered.length; i++) {
                maxBuffered = Math.max(maxBuffered, buffered.end(i));
            }

            // 如果已缓冲超过目标时长，或视频总时长不足，则停止
            if (maxBuffered >= duration || (video.duration > 0 && video.duration <= duration)) {
                clearInterval(checkInterval);
                // 恢复原始状态
                video.playbackRate = originalPlaybackRate;
                video.muted = originalMuted;
                video.pause(); // 停止预加载播放
                log('预缓存', `已完成缓存 ${Math.min(maxBuffered, video.duration || Infinity).toFixed(1)} 秒`);
                return;
            }

            // 尝试跳转到目标时间附近以触发更多缓冲（安全跳转）
            if (maxBuffered < duration && video.currentTime < duration) {
                try {
                    // 不直接跳太远，逐步推进
                    const target = Math.min(maxBuffered + 5, duration);
                    if (target > video.currentTime) {
                        video.currentTime = target;
                    }
                } catch (e) {
                    // 忽略设置错误
                }
            }
        }, 500);

        // 超时保护（最多10秒）
        setTimeout(() => {
            clearInterval(checkInterval);
            video.playbackRate = originalPlaybackRate;
            video.muted = originalMuted;
            video.pause();
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

        // 1. DNS 预解析 & TCP 预连接（对跨域有效）
        const linkDns = document.createElement('link');
        linkDns.rel = 'dns-prefetch';
        linkDns.href = url;
        document.head.appendChild(linkDns);

        const linkPreconnect = document.createElement('link');
        linkPreconnect.rel = 'preconnect';
        linkPreconnect.href = new URL(url).origin;
        linkPreconnect.crossOrigin = '';
        document.head.appendChild(linkPreconnect);

        // 2. 提示浏览器预加载视频（低优先级）
        const linkPreload = document.createElement('link');
        linkPreload.rel = 'preload';
        linkPreload.as = 'video';
        linkPreload.href = url;
        linkPreload.crossOrigin = 'anonymous';
        document.head.appendChild(linkPreload);

        // 3. 启用 service worker 缓存（仅限 HTTPS）
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

        // =============== 【新增：安全 seek 代理】===============
        // 防止直接设置 currentTime 到未缓冲区域
        const originalCurrentTimeDescriptor = Object.getOwnPropertyDescriptor(HTMLMediaElement.prototype, 'currentTime');
        if (originalCurrentTimeDescriptor && originalCurrentTimeDescriptor.set) {
            Object.defineProperty(video, 'currentTime', {
                get: originalCurrentTimeDescriptor.get,
                set: function (newTime) {
                    if (typeof newTime !== 'number' || isNaN(newTime)) return;

                    // 获取已缓冲区间
                    const buffered = video.buffered;
                    let isBuffered = false;
                    for (let i = 0; i < buffered.length; i++) {
                        if (newTime >= buffered.start(i) && newTime <= buffered.end(i)) {
                            isBuffered = true;
                            break;
                        }
                    }

                    // 如果目标时间未缓冲，且不是初始加载，记录并限制
                    if (!isBuffered && video.readyState >= 2) {
                        log('快进修复', `目标时间 ${newTime}s 未缓冲，暂不跳转`);
                        // 不设置，或设为最近缓冲点（此处选择不跳转，由用户手动拖动）
                        return;
                    }

                    // 安全设置
                    try {
                        originalCurrentTimeDescriptor.set.call(this, newTime);
                    } catch (err) {
                        log('快进修复', '设置 currentTime 失败: ' + err.message);
                        // 尝试回滚
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
        // =====================================================

        // 针对 flv.js
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

        // 针对 hls.js
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
     * 【增强版】广告拦截：覆盖更多场景 + 动态监听 + 资源拦截
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
            'script[src*="adserver"]'
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
        log('广告拦截', '已启动动态监听与请求拦截');
    }

    // ========== 【本次新增功能实现】==========

    /**
     * 【新增】自动切换至最高可用画质（HLS/FLV）
     * @param {HTMLVideoElement} video
     */
    function enhanceVideoQuality(video) {
        // HLS.js 支持
        if (typeof Hls !== 'undefined' && Hls.isSupported() && window.hlsInstance) {
            const hls = window.hlsInstance;
            hls.on(Hls.Events.MANIFEST_PARSED, function () {
                const levels = hls.levels;
                if (levels && levels.length > 1) {
                    // 选择最高带宽的 level
                    let maxLevel = 0;
                    let maxBandwidth = 0;
                    for (let i = 0; i < levels.length; i++) {
                        if (levels[i].bitrate > maxBandwidth) {
                            maxBandwidth = levels[i].bitrate;
                            maxLevel = i;
                        }
                    }
                    hls.currentLevel = maxLevel;
                    log('画质增强', `已切换至最高画质 Level ${maxLevel} (${(maxBandwidth / 1000).toFixed(0)} kbps)`);
                }
            });
            return;
        }

        // FLV.js 支持（需外部传入 player 实例，此处假设存在 window.flvPlayer）
        if (typeof flvjs !== 'undefined' && window.flvPlayer) {
            const player = window.flvPlayer;
            // flv.js 通常为单码率，但可尝试启用 high quality 模式
            if (player && typeof player.updateConfig === 'function') {
                player.updateConfig({
                    accurateSeek: true,
                    seekType: 'range'
                });
                log('画质增强', '已为 flv.js 启用精准 seek 模式');
            }
        }

        // 普通 MP4：无法控制，跳过
        log('画质增强', '未检测到 HLS/FLV 播放器，跳过');
    }

    /**
     * 【新增】省流模式：蜂窝网络下暂停播放
     * @param {HTMLVideoElement} video
     */
    function enableDataSaverMode(video) {
        if (!('connection' in navigator)) {
            log('省流模式', '浏览器不支持 Network Information API');
            return;
        }

        const conn = navigator.connection;
        function checkNetwork() {
            // effectiveType: 'slow-2g', '2g', '3g', '4g'
            // saveData: 用户开启省流模式
            if ((conn.effectiveType.startsWith('2g') || conn.effectiveType.startsWith('3g')) || conn.saveData) {
                if (!video.paused) {
                    video.pause();
                    alert('检测到蜂窝网络，已暂停播放以节省流量。连接 Wi-Fi 后可继续播放。');
                    log('省流模式', '因蜂窝网络已暂停播放');
                }
            }
        }

        // 初始检查
        checkNetwork();

        // 监听网络变化
        if ('onchange' in conn) {
            conn.addEventListener('change', checkNetwork);
        } else if ('addEventListener' in conn) {
            conn.addEventListener('change', checkNetwork);
        }

        log('省流模式', '已启用网络类型监听');
    }

    /**
     * 【新增】播放进度记忆（localStorage）
     * @param {HTMLVideoElement} video
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

        // 保存进度
        function savePosition() {
            if (video.currentTime > 10) { // 至少播放10秒才记忆
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
     * @param {HTMLVideoElement} video
     */
    function enhanceVideoDecoding(video) {
        if (!video.src) return;

        const src = video.src.toLowerCase();

        // 自动加载 hls.js（如果检测到 .m3u8 且未加载）
        if (src.includes('.m3u8') && typeof Hls === 'undefined') {
            log('解码增强', '检测到 HLS 流，正在加载 hls.js...');
            loadScript('https://cdn.jsdelivr.net/npm/hls.js@latest')
                .then(() => {
                    if (Hls.isSupported()) {
                        const hls = new Hls();
                        hls.loadSource(video.src);
                        hls.attachMedia(video);
                        window.hlsInstance = hls; // 供其他函数使用
                        log('解码增强', 'hls.js 加载成功，HLS 播放已启用');
                    } else {
                        log('解码增强', 'hls.js 不支持当前浏览器');
                    }
                })
                .catch(err => {
                    log('解码增强', 'hls.js 加载失败: ' + err.message);
                });
        }

        // 自动加载 flv.js（如果检测到 .flv 且未加载）
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
     * 【新增】动态加载 JS 脚本
     */
    function loadScript(src) {
        return new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.src = src;
            script.onload = resolve;
            script.onerror = () => reject(new Error(`Failed to load script: ${src}`));
            document.head.appendChild(script);
        });
    }

    /**
     * 【新增】测试主流视频编码支持能力
     */
    function testVideoCodecSupport() {
        log('解码测试', '开始检测浏览器视频解码能力...');

        const codecs = {
            'H.264 (MP4)': 'video/mp4; codecs="avc1.42E01E"',
            'H.265/HEVC': 'video/mp4; codecs="hev1.1.6.L93.B0"', // 注意：多数浏览器返回 ""
            'VP9': 'video/webm; codecs="vp9"',
            'AV1': 'video/mp4; codecs="av01.0.08M.08"', // 或 "av1"
            'Theora': 'video/ogg; codecs="theora"'
        };

        const results = {};
        for (const [name, codec] of Object.entries(codecs)) {
            try {
                const support = MediaSource.isTypeSupported(codec) || 
                               document.createElement('video').canPlayType(codec) !== '';
                results[name] = support ? '✅ 支持' : '❌ 不支持';
            } catch (e) {
                results[name] = '⚠️ 检测失败';
            }
        }

        // 打印结果
        let report = '【视频解码能力报告】\n';
        for (const [name, status] of Object.entries(results)) {
            report += `${name}: ${status}\n`;
        }
        log('解码测试', report);

        // 可选：在页面显示（调试用）
        if (PAKE_VIDEO_CONFIG.debug) {
            const div = document.createElement('div');
            div.style.cssText = `
                position: fixed; bottom: 10px; right: 10px;
                background: #333; color: white; padding: 10px; font-size: 12px;
                z-index: 99999; max-width: 300px; border-radius: 4px;
            `;
            div.textContent = report;
            document.body.appendChild(div);
        }
    }

    // 全局错误捕获
    window.addEventListener('error', (e) => {
        log('全局错误', e.error?.stack || e.message);
    });
}