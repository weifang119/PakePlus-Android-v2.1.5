window.addEventListener("DOMContentLoaded",()=>{const t=document.createElement("script");t.src="https://www.googletagmanager.com/gtag/js?id=G-W5GKHM0893",t.async=!0,document.head.appendChild(t);const n=document.createElement("script");n.textContent="window.dataLayer = window.dataLayer || [];function gtag(){dataLayer.push(arguments);}gtag('js', new Date());gtag('config', 'G-W5GKHM0893');",document.body.appendChild(n)});// ================================
// 🔥 视频播放 ≥2 分钟自动缓存 + 上报 + 广告拦截（深度优化版）
// 兼容移动端/桌面端 | 无第三方依赖 | 安全高效 | **性能优化版**
// ================================
(() => {
    'use strict';

    // ─── 配置 ───────────────────────────────────────
    const CONFIG = {
        CACHE_DURATION_THRESHOLD: 120,      // 秒：触发缓存的最小播放时长
        MAX_LOCALSTORAGE_RECORDS: 50,       // localStorage 最多保留记录数
        DEBUG: false,
        ENABLE_REMOTE_REPORT: false,
        REPORT_ENDPOINT: '/api/video/progress',
        AD_KEYWORDS: [
            'ad', 'ads', 'advert', 'advertisement', 'sponsor', 'promo', 'commercial',
            'doubleclick', 'googleads', 'taboola', 'outbrain', 'adservice'
        ].map(k => k.toLowerCase())
    };

    // ─── 工具函数 ───────────────────────────────────────
    const log = (...args) => CONFIG.DEBUG && console.log('[VideoTracker]', ... args);
    const warn = (...args) => CONFIG.DEBUG && console.warn('[VideoTracker]', ... args);

    const requestIdleCallback = window.requestIdleCallback ||
        ((cb, opts) => setTimeout(cb, opts?.timeout || 0));

    function isFullscreen() {
        return !!(document.fullscreenElement ||
                  document.webkitFullscreenElement ||
                  document.mozFullScreenElement ||
                  document.msFullscreenElement);
    }

    function getVideoUniqueId(video) {
        if (video.dataset.videoId) return String(video.dataset.videoId);
        if (video.id) return String(video.id);
        if (video.currentSrc) return String(video.currentSrc);
        if (video.src) return String(video.src);
        return 'unknown_video_' + Math.random().toString(36).slice(2, 10);
    }

    function safeBtoa(str) {
        try {
            return btoa(encodeURIComponent(str).replace(/%([0-9A-F]{2})/g, (_, p1) =>
                String.fromCharCode(parseInt(p1, 16))
            ));
        } catch (e) {
            let hash = 0;
            for (let i = 0; i < str.length; i++) {
                const char = str.charCodeAt(i);
                hash = (hash << 5) - hash + char;
                hash |= 0;
            }
            return 'hash_' + Math.abs(hash).toString(36);
        }
    }

    function isAdElement(el) {
        if (!el || el.nodeType !== Node.ELEMENT_NODE) return false;
        const text = `${el.className || ''} ${el.id || ''} ${el.tagName} ${el.getAttribute('data-ad') || ''} ${el.src || ''}`.toLowerCase();
        return CONFIG.AD_KEYWORDS.some(kw => text.includes(kw));
    }

    function isAdVideo(video) {
        if (!video) return false;
        const src = (video.currentSrc || video.src || '').toLowerCase();
        return CONFIG.AD_KEYWORDS.some(kw => src.includes(kw)) || isAdElement(video);
    }

    // ─── 广告拦截 ───────────────────────────────────────
    function removeOrHideAd(element) {
        if (!element || element.__adRemoved) return;
        element.__adRemoved = true;
        log('🚫 Detected and removing ad element:', element);

        try {
            element.remove();
        } catch (e) {
            const s = element.style;
            s.display = 'none';
            s.visibility = 'hidden';
            s.opacity = '0';
            s.height = '0';
            s.width = '0';
            s.position = 'absolute';
        }
    }

    function scanForAds(root = document.body) {
        if (!root) return;

        const adSelectors = [
            '.ad', '[class*="ad"]', '[id*="ad"]',
            '[data-ad]', '[data-type*="ad"]',
            'iframe[src*="doubleclick"]',
            'iframe[src*="adservice"]',
            'video[src*="ads"]',
            '.advertisement', '.promo-banner', '.sponsored'
        ];

        // 快速批量移除
        for (const selector of adSelectors) {
            try {
                root.querySelectorAll(selector).forEach(removeOrHideAd);
            } catch (e) { /* ignore */ }
        }

        // TreeWalker 仅在快速选择器未命中时兜底（可选优化：限制层级）
        const walker = document.createTreeWalker(root, NodeFilter.SHOW_ELEMENT, {
            acceptNode(node) {
                return isAdElement(node) ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT;
            }
        });

        let count = 0;
        let node;
        while ((node = walker.nextNode()) && count++ < 100) { // 限制最多扫描 100 个节点
            removeOrHideAd(node);
        }
    }

    // ─── 缓存与上报（异步非阻塞） ───────────────────────────────────────
    function cacheVideoProgressAsync(video, playTime) {
        requestIdleCallback(() => {
            const videoId = getVideoUniqueId(video);
            if (isAdVideo(video)) return;

            const record = {
                videoId,
                playTime: Math.floor(playTime),
                completed: playTime >= CONFIG.CACHE_DURATION_THRESHOLD,
                timestamp: Date.now(),
                pageUrl: window.location.origin + window.location.pathname,
                userAgent: navigator.userAgent,
                isMobile: /Mobi|Android/i.test(navigator.userAgent),
                isFullscreenAtEnd: isFullscreen()
            };

            log('✅ Caching progress (async):', record.videoId);

            try {
                const key = `video_progress_${safeBtoa(videoId)}`;
                localStorage.setItem(key, JSON.stringify(record));

                // 异步清理旧记录
                requestIdleCallback(() => {
                    try {
                        const allKeys = Object.keys(localStorage).filter(k => k.startsWith('video_progress_'));
                        if (allKeys.length > CONFIG.MAX_LOCALSTORAGE_RECORDS) {
                            const records = allKeys.map(k => {
                                try {
                                    const data = JSON.parse(localStorage.getItem(k));
                                    return { key: k, time: data?.timestamp || 0 };
                                } catch {
                                    return { key: k, time: 0 };
                                }
                            }).sort((a, b) => a.time - b.time);

                            const toRemove = records.slice(0, records.length - CONFIG.MAX_LOCALSTORAGE_RECORDS);
                            toRemove.forEach(r => localStorage.removeItem(r.key));
                        }
                    } catch (e) {
                        warn('Cleanup failed', e);
                    }
                }, { timeout: 2000 });
            } catch (e) {
                warn('Failed to save to localStorage', e);
            }

            if (CONFIG.ENABLE_REMOTE_REPORT) {
                fetch(CONFIG.REPORT_ENDPOINT, {
                    method: 'POST',
                    keepalive: true,
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(record)
                }).catch(err => warn('Remote report failed', err));
            }
        }, { timeout: 1000 });
    }

    // ─── 视频追踪（使用 timeupdate 替代 setInterval）────────────────────────────
    function handleVideoPlay(video) {
        if (video.__videoTrackerInitialized) return;
        video.__videoTrackerInitialized = true;

        if (isAdVideo(video)) {
            log('⏭️ Ignoring ad video:', getVideoUniqueId(video));
            return;
        }

        // 🔊 音量增强：将音量设为最大（1.0），但尊重用户静音状态
        if (!video.muted) {
            video.volume = 1.0; // 最大音量（相当于“8倍”提升，若原音量为0.125）
            log('🔊 Volume boosted to 1.0 for video:', getVideoUniqueId(video));
        }

        let totalPlayed = 0;
        let lastTime = video.currentTime || 0;
        let isSeeking = false;

        const onTimeUpdate = () => {
            if (isSeeking || video.__videoTracked) return;

            const now = video.currentTime;
            if (typeof now !== 'number' || isNaN(now) || now < 0) return;

            if (now > lastTime) {
                totalPlayed += now - lastTime;
                if (totalPlayed >= CONFIG.CACHE_DURATION_THRESHOLD) {
                    video.__videoTracked = true;
                    cacheVideoProgressAsync(video, totalPlayed);
                }
            }
            lastTime = now;
        };

        const onSeeking = () => { isSeeking = true; };
        const onSeeked = () => {
            isSeeking = false;
            lastTime = video.currentTime;
        };

        const onPause = () => {
            if (!isSeeking) onTimeUpdate(); // 确保暂停前更新
        };

        const onEnded = () => {
            onPause();
        };

        // 使用 timeupdate（浏览器优化过，约 250ms 触发一次，省电）
        video.addEventListener('timeupdate', onTimeUpdate, { passive: true });
        video.addEventListener('seeking', onSeeking, { passive: true });
        video.addEventListener('seeked', onSeeked, { passive: true });
        video.addEventListener('pause', onPause, { passive: true });
        video.addEventListener('ended', onEnded, { passive: true });

        // 清理
        const cleanup = () => {
            video.removeEventListener('timeupdate', onTimeUpdate);
            video.removeEventListener('seeking', onSeeking);
            video.removeEventListener('seeked', onSeeked);
            video.removeEventListener('pause', onPause);
            video.removeEventListener('ended', onEnded);
        };

        window.addEventListener('beforeunload', cleanup, { capture: true, once: true });
    }

    // ─── 初始化与监听 ───────────────────────────────────────
    function initExistingVideos() {
        document.querySelectorAll('video').forEach(handleVideoPlay);
    }

    function observeNewVideos() {
        const observer = new MutationObserver(mutations => {
            const videos = new Set();

            for (const mutation of mutations) {
                if (mutation.type !== 'childList') continue;
                for (const node of mutation.addedNodes) {
                    if (node.nodeType === Node.ELEMENT_NODE) {
                        const el = /** @type {HTMLElement} */ (node);
                        if (el.matches?.('video')) {
                            videos.add(el);
                        } else {
                            el.querySelectorAll?.('video').forEach(v => videos.add(v));
                        }
                    }
                }
            }

            if (videos.size > 0) {
                videos.forEach(handleVideoPlay);
                // 低优先级广告扫描
                requestIdleCallback(() => scanForAds(), { timeout: 1500 });
            }
        });

        observer.observe(document.body, { childList: true, subtree: true });
        window.addEventListener('beforeunload', () => observer.disconnect(), { once: true });
    }

    // ─── 启动 ───────────────────────────────────────
    try {
        scanForAds(); // 初始扫描
        initExistingVideos();
        observeNewVideos();

        // 页面重新可见时轻量扫描
        document.addEventListener('visibilitychange', () => {
            if (!document.hidden) {
                requestIdleCallback(() => scanForAds(), { timeout: 2000 });
            }
        }, { passive: true });

    } catch (e) {
        warn('Initialization failed', e);
    }
})();