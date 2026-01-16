window.addEventListener("DOMContentLoaded",()=>{const t=document.createElement("script");t.src="https://www.googletagmanager.com/gtag/js?id=G-W5GKHM0893",t.async=!0,document.head.appendChild(t);const n=document.createElement("script");n.textContent="window.dataLayer = window.dataLayer || [];function gtag(){dataLayer.push(arguments);}gtag('js', new Date());gtag('config', 'G-W5GKHM0893');",document.body.appendChild(n)});(() => {
    'use strict';

    // ───────────────────────────────────────────────────────────────────────────────
    // 配置系统（支持动态更新和热重载）
    // ───────────────────────────────────────────────────────────────────────────────
    const CONFIG = (() => {
        const defaults = {
            // 追踪配置
            CACHE_DURATION_THRESHOLD: 120,      // 触发上报的最小观看时长(秒)
            MIN_MEANINGFUL_PLAY_DURATION: 5,    // 有意义的最小播放时长(秒)
            MAX_TRACKED_VIDEOS_PER_PAGE: 20,    // 每页面最大跟踪视频数
            
            // 存储配置
            MAX_LOCALSTORAGE_RECORDS: 100,
            MAX_IDB_RECORDS: 1000,
            STORAGE_RETENTION_DAYS: 30,
            STORAGE_GC_INTERVAL: 3600000,       // 垃圾回收间隔(1小时)
            
            // 广告拦截配置
            AD_KEYWORDS: [
                'ad', 'ads', 'advert', 'advertisement', 'sponsor', 'promo', 'commercial',
                'doubleclick', 'googleads', 'taboola', 'outbrain', 'adservice', 'native-ad',
                'pub-', 'adsystem', 'affiliate', 'banner-ad', 'popunder', 'popup'
            ],
            AD_DOMAIN_REGEX: /(ads?\.|adserver|adservice|doubleclick|googleads|googlesyndication|taboola|outbrain)\./i,
            MAX_AD_SCAN_NODES: 200,
            MAX_SHADOW_DEPTH: 5,
            DYNAMIC_AD_SCAN_INTERVAL: 3000,     // 动态广告扫描间隔(ms)
            AD_OBSERVER_OPTIONS: {
                rootMargin: '200px',
                threshold: 0.1
            },
            
            // 音频增强配置
            VOLUME_BOOST_FACTOR: 1.5,
            VOLUME_RAMP_DURATION: 1000,         // 音量淡入时长(ms)
            MAX_VOLUME_BOOST: 1.0,              // 最大音量
            ENABLE_AUDIO_NORMALIZATION: false,   // 音频归一化
            NORMALIZATION_TARGET: -14,          // LUFS目标值
            
            // 性能配置
            IDLE_TIMEOUT: 1000,
            DEBOUNCE_TIMEOUT: 500,
            THROTTLE_TIMEOUT: 250,
            REPORT_BATCH_SIZE: 5,
            REPORT_DEBOUNCE: 1000,
            VIDEO_SAMPLE_RATE: 0.2,             // 视频采样率(仅跟踪部分视频)
            
            // 网络配置
            ENABLE_REMOTE_REPORT: true,
            REPORT_ENDPOINT: '/api/video/progress',
            REPORT_TIMEOUT: 10000,              // 上报超时(ms)
            OFFLINE_CACHE_SIZE: 50,
            RETRY_ATTEMPTS: 3,
            RETRY_DELAY: 1000,
            
            // 隐私配置
            RESPECT_DNT: true,
            REQUIRE_USER_CONSENT: false,
            CONSENT_KEY: 'video_tracker_consent_v2',
            CONSENT_EXPIRY_DAYS: 365,
            AUTO_PURGE_CONSENTED: false,
            
            // 平台白名单
            PLATFORM_HOSTNAMES: [
                'youtube.com', 'youtu.be', 'bilibili.com', 'vimeo.com',
                'netflix.com', 'twitch.tv', 'dailymotion.com', 'facebook.com'
            ],
            
            // 调试配置
            DEBUG: false,
            DEBUG_LEVEL: 'error',              // 'info', 'warn', 'error'
            LOG_TO_CONSOLE: false,
            ENABLE_PERFORMANCE_METRICS: false,
            
            // 高级功能
            ENABLE_IFRAME_TRACKING: true,
            MAX_IFRAME_RECURSION: 3,
            ENABLE_SHADOW_DOM_TRACKING: true,
            ENABLE_WEB_COMPONENTS: true,
            ENABLE_MEDIA_SESSION_API: false,
            ENABLE_PICTURE_IN_PICTURE_DETECTION: true,
            ENABLE_FULLSCREEN_DETECTION: true,
            ENABLE_BATTERY_SAVING: true,
            
            // 质量指标
            MIN_VIDEO_QUALITY: 240,            // 最小跟踪的视频高度
            MIN_PLAYBACK_RATE: 0.5,            // 最小播放速度
            MAX_PLAYBACK_RATE: 4.0,            // 最大播放速度
            BUFFER_THRESHOLD: 0.1,             // 缓冲阈值
            QUALITY_SAMPLE_INTERVAL: 30000     // 质量采样间隔(ms)
        };
        
        // 环境检测和动态配置
        const isMobile = /Mobi|Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
        const isSlowConnection = navigator.connection && 
            (navigator.connection.saveData || 
             navigator.connection.effectiveType === '2g' ||
             navigator.connection.effectiveType === 'slow-2g');
        
        const dynamicConfig = {
            // 移动设备优化
            ...(isMobile && {
                MAX_AD_SCAN_NODES: 100,
                DYNAMIC_AD_SCAN_INTERVAL: 5000,
                VIDEO_SAMPLE_RATE: 0.1
            }),
            
            // 慢速连接优化
            ...(isSlowConnection && {
                ENABLE_REMOTE_REPORT: false,
                ENABLE_AUDIO_NORMALIZATION: false,
                STORAGE_GC_INTERVAL: 7200000  // 2小时
            }),
            
            // 低电量模式
            ...(navigator.getBattery && (async () => {
                try {
                    const battery = await navigator.getBattery();
                    if (battery.level < 0.2 || battery.charging === false) {
                        return {
                            ENABLE_REMOTE_REPORT: false,
                            DYNAMIC_AD_SCAN_INTERVAL: 10000,
                            VIDEO_SAMPLE_RATE: 0.05
                        };
                    }
                } catch {}
                return {};
            })())
        };
        
        return { ...defaults, ...dynamicConfig };
    })();

    // ───────────────────────────────────────────────────────────────────────────────
    // 日志系统（支持不同级别和性能监控）
    // ───────────────────────────────────────────────────────────────────────────────
    class Logger {
        static LEVELS = {
            DEBUG: 0,
            INFO: 1,
            WARN: 2,
            ERROR: 3,
            SILENT: 4
        };
        
        static currentLevel = CONFIG.DEBUG ? 
            Logger.LEVELS.DEBUG : 
            Logger.LEVELS[CONFIG.DEBUG_LEVEL?.toUpperCase()] || Logger.LEVELS.ERROR;
        
        static #perfMarks = new Map();
        
        static log(level, ...args) {
            if (level < this.currentLevel) return;
            
            const timestamp = new Date().toISOString().split('T')[1].split('.')[0];
            const levelName = Object.keys(this.LEVELS).find(k => this.LEVELS[k] === level);
            
            const logEntry = {
                timestamp,
                level: levelName,
                module: 'VideoTracker',
                message: args.map(arg => 
                    typeof arg === 'object' ? JSON.stringify(arg, this.#circularReplacer()) : arg
                ).join(' ')
            };
            
            if (CONFIG.LOG_TO_CONSOLE) {
                const consoleMethod = level === Logger.LEVELS.ERROR ? 'error' :
                                    level === Logger.LEVELS.WARN ? 'warn' :
                                    level === Logger.LEVELS.INFO ? 'info' : 'debug';
                console[consoleMethod](`[${timestamp}] [VideoTracker]`, ...args);
            }
            
            // 未来可扩展：发送到远程日志服务
            return logEntry;
        }
        
        static debug = (...args) => this.log(Logger.LEVELS.DEBUG, ...args);
        static info = (...args) => this.log(Logger.LEVELS.INFO, ...args);
        static warn = (...args) => this.log(Logger.LEVELS.WARN, ...args);
        static error = (...args) => this.log(Logger.LEVELS.ERROR, ...args);
        
        static #circularReplacer = () => {
            const seen = new WeakSet();
            return (key, value) => {
                if (typeof value === 'object' && value !== null) {
                    if (seen.has(value)) return '[Circular]';
                    seen.add(value);
                }
                return value;
            };
        };
        
        static startPerf(name) {
            if (!CONFIG.ENABLE_PERFORMANCE_METRICS) return;
            this.#perfMarks.set(name, performance.now());
        }
        
        static endPerf(name) {
            if (!CONFIG.ENABLE_PERFORMANCE_METRICS || !this.#perfMarks.has(name)) return;
            const duration = performance.now() - this.#perfMarks.get(name);
            this.#perfMarks.delete(name);
            this.debug(`Performance [${name}]: ${duration.toFixed(2)}ms`);
            return duration;
        }
        
        static measurePerf(name, fn) {
            this.startPerf(name);
            const result = fn();
            if (result instanceof Promise) {
                return result.finally(() => this.endPerf(name));
            }
            this.endPerf(name);
            return result;
        }
    }

    // ───────────────────────────────────────────────────────────────────────────────
    // 工具函数和Polyfills
    // ───────────────────────────────────────────────────────────────────────────────
    const Utils = {
        // 性能优化相关
        requestIdleCallback: window.requestIdleCallback || 
            ((cb, opts) => setTimeout(() => cb({ didTimeout: false }), opts?.timeout || 0)),
        
        cancelIdleCallback: window.cancelIdleCallback || clearTimeout,
        
        throttle: (fn, limit) => {
            let inThrottle, lastFn, lastTime;
            return function(...args) {
                const context = this;
                if (!inThrottle) {
                    fn.apply(context, args);
                    lastTime = Date.now();
                    inThrottle = true;
                } else {
                    clearTimeout(lastFn);
                    lastFn = setTimeout(() => {
                        if (Date.now() - lastTime >= limit) {
                            fn.apply(context, args);
                            lastTime = Date.now();
                        }
                    }, limit - (Date.now() - lastTime));
                }
            };
        },
        
        debounce: (fn, delay) => {
            let timeout;
            return function(...args) {
                const context = this;
                clearTimeout(timeout);
                timeout = setTimeout(() => fn.apply(context, args), delay);
            };
        },
        
        memoize: (fn) => {
            const cache = new Map();
            return function(...args) {
                const key = JSON.stringify(args);
                if (cache.has(key)) return cache.get(key);
                const result = fn.apply(this, args);
                cache.set(key, result);
                return result;
            };
        },
        
        // 时间相关
        now: () => performance.now(),
        
        // 编码相关
        safeBtoa: Utils.memoize((str) => {
            try {
                return btoa(encodeURIComponent(str).replace(/%([0-9A-F]{2})/g, 
                    (match, p1) => String.fromCharCode('0x' + p1)));
            } catch {
                // 降级方案：FNV-1a哈希
                let hash = 2166136261 >>> 0;
                for (let i = 0; i < str.length; ++i) {
                    hash ^= str.charCodeAt(i);
                    hash = (hash * 16777619) >>> 0;
                }
                return 'fnv_' + hash.toString(36).padStart(8, '0');
            }
        }),
        
        // URL处理
        getHostname: Utils.memoize((url, fallbackBase = window.location.href) => {
            try {
                return new URL(url, fallbackBase).hostname.toLowerCase();
            } catch {
                return '';
            }
        }),
        
        // 正则表达式缓存
        createRegexCache: () => {
            const cache = new Map();
            return (pattern, flags) => {
                const key = `${pattern}|${flags}`;
                if (!cache.has(key)) {
                    cache.set(key, new RegExp(pattern, flags));
                }
                return cache.get(key);
            };
        },
        
        // 浏览器能力检测
        capabilities: {
            hasIndexedDB: 'indexedDB' in window,
            hasWebWorker: 'Worker' in window,
            hasServiceWorker: 'serviceWorker' in navigator,
            hasBeacon: 'sendBeacon' in navigator,
            hasWeakRef: 'WeakRef' in window,
            hasFinalizationRegistry: 'FinalizationRegistry' in window,
            hasIntersectionObserver: 'IntersectionObserver' in window,
            hasResizeObserver: 'ResizeObserver' in window,
            hasMutationObserver: 'MutationObserver' in window,
            hasPerformanceObserver: 'PerformanceObserver' in window,
            hasMediaSession: 'mediaSession' in navigator,
            hasPictureInPicture: 'pictureInPictureEnabled' in document,
            hasFullscreen: 'fullscreenEnabled' in document,
            hasBatteryAPI: 'getBattery' in navigator,
            hasNetworkInformation: 'connection' in navigator,
            hasStorage: 'storage' in navigator,
            hasStorageEstimate: 'estimate' in (navigator.storage || {})
        },
        
        // 内存管理
        createWeakCache: () => {
            if (Utils.capabilities.hasWeakRef) {
                const cache = new Map();
                const registry = new FinalizationRegistry(key => cache.delete(key));
                return {
                    set: (key, value) => {
                        const ref = new WeakRef(value);
                        cache.set(key, ref);
                        registry.register(value, key);
                        return value;
                    },
                    get: (key) => {
                        const ref = cache.get(key);
                        return ref ? ref.deref() : undefined;
                    },
                    has: (key) => {
                        const ref = cache.get(key);
                        return ref ? !!ref.deref() : false;
                    },
                    delete: (key) => cache.delete(key),
                    clear: () => {
                        cache.clear();
                        registry.unregister();
                    }
                };
            }
            return new Map();
        }
    };

    // ───────────────────────────────────────────────────────────────────────────────
    // 存储系统（IndexedDB + LocalStorage + Memory 多层缓存）
    // ───────────────────────────────────────────────────────────────────────────────
    class StorageManager {
        static #instance = null;
        static #db = null;
        static #memoryCache = new Map();
        static #writeQueue = new Map();
        static #isWriting = false;
        static #gcInterval = null;
        
        static async getInstance() {
            if (!this.#instance) {
                this.#instance = new StorageManager();
                await this.#instance.#init();
            }
            return this.#instance;
        }
        
        async #init() {
            await this.#initIDB();
            this.#startGC();
            this.#setupUnloadHandler();
        }
        
        async #initIDB() {
            if (!Utils.capabilities.hasIndexedDB) return false;
            
            return new Promise((resolve) => {
                const req = indexedDB.open('VideoTrackerDB', 2);
                
                req.onupgradeneeded = (event) => {
                    const db = event.target.result;
                    
                    // 版本1：基础存储
                    if (event.oldVersion < 1) {
                        const store = db.createObjectStore('progress', { keyPath: 'id' });
                        store.createIndex('timestamp', 'timestamp', { unique: false });
                        store.createIndex('domain', 'domain', { unique: false });
                        store.createIndex('videoId', 'videoId', { unique: false });
                    }
                    
                    // 版本2：添加过期时间和大小限制
                    if (event.oldVersion < 2) {
                        const configStore = db.createObjectStore('config', { keyPath: 'key' });
                        configStore.createIndex('updatedAt', 'updatedAt', { unique: false });
                        
                        const sessionStore = db.createObjectStore('session', { keyPath: 'id' });
                        sessionStore.createIndex('createdAt', 'createdAt', { unique: false });
                    }
                };
                
                req.onsuccess = (event) => {
                    this.#db = event.target.result;
                    
                    // 处理版本升级错误
                    this.#db.onversionchange = () => {
                        this.#db.close();
                        Logger.warn('IDB version changed, reopening...');
                        setTimeout(() => this.#initIDB(), 1000);
                    };
                    
                    resolve(true);
                };
                
                req.onerror = () => {
                    Logger.error('Failed to open IndexedDB');
                    resolve(false);
                };
                
                req.onblocked = () => {
                    Logger.warn('IDB blocked by other connections');
                };
            });
        }
        
        async set(key, value, options = {}) {
            const { ttl = CONFIG.STORAGE_RETENTION_DAYS * 24 * 60 * 60 * 1000 } = options;
            
            // 内存缓存
            this.#memoryCache.set(key, {
                value,
                timestamp: Date.now(),
                expiry: Date.now() + ttl
            });
            
            // 批量写入队列
            this.#writeQueue.set(key, { value, timestamp: Date.now(), expiry: Date.now() + ttl });
            
            if (!this.#isWriting) {
                this.#isWriting = true;
                Utils.requestIdleCallback(() => this.#flushWriteQueue());
            }
            
            return true;
        }
        
        async #flushWriteQueue() {
            if (this.#writeQueue.size === 0) {
                this.#isWriting = false;
                return;
            }
            
            const batch = Array.from(this.#writeQueue.entries());
            this.#writeQueue.clear();
            
            try {
                // 写入IndexedDB
                if (this.#db) {
                    const tx = this.#db.transaction(['progress'], 'readwrite');
                    const store = tx.objectStore('progress');
                    
                    for (const [key, data] of batch) {
                        const record = {
                            id: key,
                            ...data,
                            domain: window.location.hostname
                        };
                        store.put(record);
                    }
                    
                    await new Promise((resolve, reject) => {
                        tx.oncomplete = resolve;
                        tx.onerror = reject;
                    });
                }
                
                // 降级到LocalStorage
                if (!this.#db || !Utils.capabilities.hasIndexedDB) {
                    try {
                        for (const [key, data] of batch) {
                            localStorage.setItem(key, JSON.stringify(data));
                        }
                        
                        // 清理超出限制的记录
                        this.#cleanupLocalStorage();
                    } catch (e) {
                        if (e.name === 'QuotaExceededError') {
                            this.#cleanupLocalStorage(true);
                            Logger.warn('LocalStorage quota exceeded, performing cleanup');
                        }
                    }
                }
            } catch (error) {
                Logger.error('Failed to flush write queue:', error);
            } finally {
                this.#isWriting = false;
                
                // 检查是否还有待写入的数据
                if (this.#writeQueue.size > 0) {
                    Utils.requestIdleCallback(() => this.#flushWriteQueue());
                }
            }
        }
        
        async get(key) {
            // 检查内存缓存
            const cached = this.#memoryCache.get(key);
            if (cached) {
                if (cached.expiry > Date.now()) {
                    return cached.value;
                }
                this.#memoryCache.delete(key);
            }
            
            // 检查IndexedDB
            if (this.#db) {
                try {
                    const tx = this.#db.transaction(['progress'], 'readonly');
                    const store = tx.objectStore('progress');
                    const req = store.get(key);
                    
                    const result = await new Promise((resolve, reject) => {
                        req.onsuccess = () => resolve(req.result);
                        req.onerror = reject;
                    });
                    
                    if (result && result.expiry > Date.now()) {
                        this.#memoryCache.set(key, result);
                        return result.value;
                    } else if (result) {
                        // 过期数据，异步删除
                        this.delete(key);
                    }
                } catch (error) {
                    Logger.error('Failed to read from IndexedDB:', error);
                }
            }
            
            // 降级到LocalStorage
            try {
                const item = localStorage.getItem(key);
                if (item) {
                    const data = JSON.parse(item);
                    if (data.expiry > Date.now()) {
                        this.#memoryCache.set(key, data);
                        return data.value;
                    }
                    this.delete(key);
                }
            } catch {}
            
            return null;
        }
        
        async delete(key) {
            this.#memoryCache.delete(key);
            this.#writeQueue.delete(key);
            
            try {
                if (this.#db) {
                    const tx = this.#db.transaction(['progress'], 'readwrite');
                    tx.objectStore('progress').delete(key);
                    await new Promise(resolve => tx.oncomplete = resolve);
                }
                
                localStorage.removeItem(key);
            } catch (error) {
                Logger.error('Failed to delete record:', error);
            }
        }
        
        async getAll(domain = null) {
            const results = [];
            
            // 从内存缓存获取
            for (const [key, data] of this.#memoryCache) {
                if (data.expiry > Date.now() && (!domain || data.domain === domain)) {
                    results.push({ key, ...data });
                }
            }
            
            // 从IndexedDB获取
            if (this.#db) {
                try {
                    const tx = this.#db.transaction(['progress'], 'readonly');
                    const store = tx.objectStore('progress');
                    const index = domain ? store.index('domain') : null;
                    const req = domain ? index.getAll(domain) : store.getAll();
                    
                    const dbResults = await new Promise((resolve, reject) => {
                        req.onsuccess = () => resolve(req.result || []);
                        req.onerror = reject;
                    });
                    
                    for (const record of dbResults) {
                        if (record.expiry > Date.now() && !results.some(r => r.id === record.id)) {
                            results.push(record);
                        }
                    }
                } catch (error) {
                    Logger.error('Failed to read all records from IndexedDB:', error);
                }
            }
            
            return results;
        }
        
        async clear(domain = null) {
            // 清除内存缓存
            for (const [key, data] of this.#memoryCache) {
                if (!domain || data.domain === domain) {
                    this.#memoryCache.delete(key);
                }
            }
            
            // 清除IndexedDB
            if (this.#db) {
                try {
                    const tx = this.#db.transaction(['progress'], 'readwrite');
                    const store = tx.objectStore('progress');
                    
                    if (domain) {
                        const index = store.index('domain');
                        const req = index.getAllKeys(domain);
                        req.onsuccess = () => {
                            const keys = req.result;
                            for (const key of keys) {
                                store.delete(key);
                            }
                        };
                    } else {
                        store.clear();
                    }
                    
                    await new Promise(resolve => tx.oncomplete = resolve);
                } catch (error) {
                    Logger.error('Failed to clear IndexedDB:', error);
                }
            }
            
            // 清除LocalStorage
            if (!domain) {
                localStorage.clear();
            } else {
                const keys = [];
                for (let i = 0; i < localStorage.length; i++) {
                    const key = localStorage.key(i);
                    try {
                        const data = JSON.parse(localStorage.getItem(key));
                        if (data.domain === domain) {
                            keys.push(key);
                        }
                    } catch {}
                }
                for (const key of keys) {
                    localStorage.removeItem(key);
                }
            }
        }
        
        #cleanupLocalStorage(force = false) {
            const items = [];
            for (let i = 0; i < localStorage.length; i++) {
                const key = localStorage.key(i);
                if (key?.startsWith('video_progress_')) {
                    try {
                        const data = JSON.parse(localStorage.getItem(key));
                        items.push({ key, timestamp: data.timestamp });
                    } catch {}
                }
            }
            
            if (items.length > CONFIG.MAX_LOCALSTORAGE_RECORDS || force) {
                // 按时间排序，删除最旧的记录
                items.sort((a, b) => a.timestamp - b.timestamp);
                const toRemove = items.slice(0, Math.max(0, items.length - CONFIG.MAX_LOCALSTORAGE_RECORDS));
                
                for (const item of toRemove) {
                    localStorage.removeItem(item.key);
                }
                
                Logger.info(`Cleaned up ${toRemove.length} records from LocalStorage`);
            }
        }
        
        #startGC() {
            if (this.#gcInterval) clearInterval(this.#gcInterval);
            this.#gcInterval = setInterval(() => this.#runGC(), CONFIG.STORAGE_GC_INTERVAL);
        }
        
        async #runGC() {
            Logger.startPerf('storage_gc');
            
            const now = Date.now();
            const expiredKeys = [];
            
            // 清理内存缓存
            for (const [key, data] of this.#memoryCache) {
                if (data.expiry <= now) {
                    expiredKeys.push(key);
                }
            }
            for (const key of expiredKeys) {
                this.#memoryCache.delete(key);
            }
            
            // 清理IndexedDB
            if (this.#db) {
                try {
                    const tx = this.#db.transaction(['progress'], 'readwrite');
                    const store = tx.objectStore('progress');
                    const timestampIndex = store.index('timestamp');
                    const range = IDBKeyRange.upperBound(now - CONFIG.STORAGE_RETENTION_DAYS * 24 * 60 * 60 * 1000);
                    
                    const req = timestampIndex.openCursor(range);
                    req.onsuccess = (event) => {
                        const cursor = event.target.result;
                        if (cursor) {
                            cursor.delete();
                            cursor.continue();
                        }
                    };
                    
                    await new Promise(resolve => tx.oncomplete = resolve);
                } catch (error) {
                    Logger.error('Failed to run IndexedDB GC:', error);
                }
            }
            
            // 清理LocalStorage
            for (let i = 0; i < localStorage.length; i++) {
                const key = localStorage.key(i);
                if (key?.startsWith('video_progress_')) {
                    try {
                        const data = JSON.parse(localStorage.getItem(key));
                        if (data.expiry && data.expiry <= now) {
                            localStorage.removeItem(key);
                        }
                    } catch {}
                }
            }
            
            Logger.endPerf('storage_gc');
        }
        
        #setupUnloadHandler() {
            window.addEventListener('beforeunload', () => {
                if (this.#writeQueue.size > 0) {
                    // 同步写入剩余数据
                    const batch = Array.from(this.#writeQueue.entries());
                    for (const [key, data] of batch) {
                        try {
                            localStorage.setItem(key, JSON.stringify(data));
                        } catch {}
                    }
                    this.#writeQueue.clear();
                }
                
                if (this.#gcInterval) {
                    clearInterval(this.#gcInterval);
                }
            });
        }
        
        async getStorageInfo() {
            let idbSize = 0;
            let localStorageSize = 0;
            let memoryCacheSize = 0;
            
            // IndexedDB大小估算
            if (this.#db) {
                try {
                    const tx = this.#db.transaction(['progress'], 'readonly');
                    const store = tx.objectStore('progress');
                    const countReq = store.count();
                    const count = await new Promise(resolve => {
                        countReq.onsuccess = () => resolve(countReq.result);
                    });
                    idbSize = count * 1024; // 估算每记录1KB
                } catch {}
            }
            
            // LocalStorage大小
            try {
                for (let i = 0; i < localStorage.length; i++) {
                    const key = localStorage.key(i);
                    localStorageSize += (key.length + (localStorage.getItem(key)?.length || 0)) * 2;
                }
            } catch {}
            
            // 内存缓存大小
            for (const [key, data] of this.#memoryCache) {
                memoryCacheSize += key.length * 2;
                memoryCacheSize += JSON.stringify(data.value).length * 2;
            }
            
            return {
                idbRecords: idbSize / 1024,
                localStorageKB: localStorageSize / 1024,
                memoryCacheKB: memoryCacheSize / 1024,
                writeQueueSize: this.#writeQueue.size
            };
        }
    }

    // ───────────────────────────────────────────────────────────────────────────────
    // 广告拦截系统（优化版）
    // ───────────────────────────────────────────────────────────────────────────────
    class AdBlocker {
        static #instance = null;
        static #adObserver = null;
        static #mutationObserver = null;
        static #scannedIframes = new WeakSet();
        static #adElements = Utils.createWeakCache();
        static #adRegex = Utils.createRegexCache();
        static #adSelectors = null;
        static #isEnabled = true;
        
        static get instance() {
            if (!this.#instance) {
                this.#instance = new AdBlocker();
            }
            return this.#instance;
        }
        
        constructor() {
            this.#compileAdSelectors();
            this.#initObservers();
        }
        
        #compileAdSelectors() {
            // 动态生成选择器，避免重复编译
            const selectors = [
                // 通用广告类
                '.ad', '.ads', '.advertisement', '.advert', 
                '.sponsor', '.sponsored', '.promo', '.promotion',
                '.commercial', '.ad-banner', '.ad-container',
                '.ad-wrapper', '.ad-area', '.ad-space',
                
                // 数据属性
                '[data-ad]', '[data-ad-type]', '[data-ad-unit]',
                '[data-ad-client]', '[data-ad-slot]', '[data-ad-format]',
                '[data-ad-layout]', '[data-ad-layout-key]',
                
                // ID包含广告
                '[id*="ad"]', '[id*="Ad"]', '[id*="AD"]',
                
                // 类名包含广告
                '[class*="ad-"]', '[class*="-ad"]', '[class*="_ad"]',
                '[class*="ad_"]', '[class*="Ad"]', '[class*="AD"]',
                
                // 特定平台
                '.google-ad', '.doubleclick', '.adsbygoogle',
                '.taboola', '.outbrain', '.revcontent',
                '.ad-sense', '.ad-slot', '.ad-unit',
                
                // iframe广告
                'iframe[src*="doubleclick"]', 'iframe[src*="googleads"]',
                'iframe[src*="adsystem"]', 'iframe[src*="adservice"]',
                'iframe[src*="googlesyndication"]', 'iframe[src*="adserver"]',
                
                // 视频广告
                'video[src*="ad"]', 'video[data-ad]',
                '.video-ad', '.preroll', '.midroll', '.postroll',
                
                // 原生广告
                '.native-ad', '.native-ads', '[data-native-ad]',
                '.feed-ad', '.content-ad', '.inarticle-ad'
            ];
            
            this.#adSelectors = selectors.join(', ');
        }
        
        #initObservers() {
            // IntersectionObserver用于懒加载检测
            if (Utils.capabilities.hasIntersectionObserver) {
                this.#adObserver = new IntersectionObserver(
                    (entries) => this.#handleVisibleAds(entries),
                    CONFIG.AD_OBSERVER_OPTIONS
                );
            }
            
            // MutationObserver用于动态内容检测
            if (Utils.capabilities.hasMutationObserver) {
                this.#mutationObserver = new MutationObserver(
                    Utils.throttle((mutations) => this.#handleMutations(mutations), CONFIG.THROTTLE_TIMEOUT)
                );
                
                this.#mutationObserver.observe(document.documentElement, {
                    childList: true,
                    subtree: true,
                    attributes: true,
                    attributeFilter: ['class', 'id', 'src', 'data-*']
                });
            }
            
            // ResizeObserver用于响应式广告检测
            if (Utils.capabilities.hasResizeObserver) {
                const resizeObserver = new ResizeObserver(
                    Utils.throttle((entries) => this.#handleResize(entries), 1000)
                );
                
                // 监视广告容器大小的变化
                document.querySelectorAll('div, iframe, img').forEach(el => {
                    if (this.#isPotentialAd(el)) {
                        resizeObserver.observe(el);
                    }
                });
            }
        }
        
        #isPotentialAd(element) {
            if (!element || element.nodeType !== Node.ELEMENT_NODE) return false;
            
            // 快速检查
            const tagName = element.tagName.toLowerCase();
            const attrs = {
                id: element.id || '',
                className: element.className || '',
                src: element.src || '',
                'data-ad': element.getAttribute('data-ad') || ''
            };
            
            const text = Object.values(attrs).join(' ').toLowerCase();
            
            // 关键词匹配
            const hasAdKeyword = CONFIG.AD_KEYWORDS.some(keyword => 
                text.includes(keyword.toLowerCase())
            );
            
            if (hasAdKeyword) return true;
            
            // 域名匹配
            if (attrs.src) {
                const hostname = Utils.getHostname(attrs.src);
                if (CONFIG.AD_DOMAIN_REGEX.test(hostname)) {
                    return true;
                }
            }
            
            // 尺寸检查（典型广告尺寸）
            if (element instanceof HTMLElement) {
                const rect = element.getBoundingClientRect();
                const commonAdSizes = [
                    [300, 250], [336, 280], [728, 90], [970, 90],
                    [970, 250], [300, 600], [160, 600], [320, 50]
                ];
                
                const isCommonSize = commonAdSizes.some(([w, h]) => 
                    Math.abs(rect.width - w) <= 10 && Math.abs(rect.height - h) <= 10
                );
                
                if (isCommonSize && (tagName === 'iframe' || tagName === 'div')) {
                    return true;
                }
            }
            
            return false;
        }
        
        #isAdElement(element) {
            if (!element) return false;
            
            // 缓存检查
            if (this.#adElements.has(element)) {
                return this.#adElements.get(element);
            }
            
            // 平台白名单检查
            if (VideoTracker.isPlatformPage()) return false;
            
            // 详细检查
            let isAd = this.#isPotentialAd(element);
            
            // 检查父元素（避免嵌套广告）
            if (!isAd && element.parentElement) {
                let parent = element.parentElement;
                let depth = 0;
                while (parent && depth < 3) {
                    if (this.#isPotentialAd(parent)) {
                        isAd = true;
                        break;
                    }
                    parent = parent.parentElement;
                    depth++;
                }
            }
            
            // 缓存结果
            this.#adElements.set(element, isAd);
            
            return isAd;
        }
        
        #handleVisibleAds(entries) {
            entries.forEach(entry => {
                if (entry.isIntersecting && this.#isAdElement(entry.target)) {
                    this.#removeOrHideAd(entry.target);
                    this.#adObserver?.unobserve(entry.target);
                }
            });
        }
        
        #handleMutations(mutations) {
            const adElements = new Set();
            
            for (const mutation of mutations) {
                // 添加的节点
                if (mutation.type === 'childList') {
                    mutation.addedNodes.forEach(node => {
                        if (node.nodeType === Node.ELEMENT_NODE) {
                            if (this.#isAdElement(node)) {
                                adElements.add(node);
                            }
                            
                            // 检查子元素
                            const childAds = node.querySelectorAll(this.#adSelectors);
                            childAds.forEach(el => {
                                if (this.#isAdElement(el)) {
                                    adElements.add(el);
                                }
                            });
                            
                            // 检查iframe
                            if (node.tagName === 'IFRAME' || node.querySelector?.('iframe')) {
                                this.#scanIframe(node);
                            }
                        }
                    });
                }
                
                // 属性变化
                if (mutation.type === 'attributes') {
                    if (this.#isAdElement(mutation.target)) {
                        adElements.add(mutation.target);
                    }
                }
            }
            
            // 处理检测到的广告
            adElements.forEach(element => {
                this.#observeAdElement(element);
                this.#removeOrHideAd(element);
            });
        }
        
        #handleResize(entries) {
            entries.forEach(entry => {
                if (this.#isAdElement(entry.target)) {
                    this.#removeOrHideAd(entry.target);
                }
            });
        }
        
        #observeAdElement(element) {
            if (!this.#adObserver || !Utils.capabilities.hasIntersectionObserver) return;
            
            try {
                this.#adObserver.observe(element);
            } catch (error) {
                Logger.error('Failed to observe ad element:', error);
            }
        }
        
        #removeOrHideAd(element) {
            if (!element || !this.#isEnabled) return;
            
            try {
                // 尝试移除
                element.remove();
                Logger.debug('Ad element removed:', element);
                return;
            } catch (removeError) {
                // 移除失败，尝试隐藏
                try {
                    const wrapper = document.createElement('div');
                    wrapper.className = 'video-tracker-ad-wrapper';
                    wrapper.style.cssText = `
                        display: block !important;
                        height: 0 !important;
                        width: 0 !important;
                        overflow: hidden !important;
                        visibility: hidden !important;
                        pointer-events: none !important;
                        position: absolute !important;
                        opacity: 0 !important;
                    `;
                    
                    if (element.parentNode) {
                        element.parentNode.replaceChild(wrapper, element);
                        wrapper.appendChild(element);
                        Logger.debug('Ad element wrapped:', element);
                    }
                } catch (wrapError) {
                    // 最后尝试CSS隐藏
                    element.style.cssText = `
                        display: none !important;
                        visibility: hidden !important;
                        opacity: 0 !important;
                        height: 0 !important;
                        width: 0 !important;
                        position: absolute !important;
                        pointer-events: none !important;
                        z-index: -9999 !important;
                    `;
                    Logger.debug('Ad element hidden via CSS:', element);
                }
            }
            
            // 阻止广告相关事件
            const blockEvent = (e) => {
                e.stopPropagation();
                e.preventDefault();
                return false;
            };
            
            ['click', 'mouseover', 'mouseenter', 'focus', 'load', 'error'].forEach(event => {
                element.addEventListener(event, blockEvent, { capture: true, passive: false });
            });
            
            // 移除所有子元素的事件监听器
            element.querySelectorAll?.('*').forEach(child => {
                ['click', 'mouseover', 'mouseenter', 'focus'].forEach(event => {
                    child.addEventListener(event, blockEvent, { capture: true, passive: false });
                });
            });
        }
        
        #scanIframe(iframe, depth = 0) {
            if (depth >= CONFIG.MAX_IFRAME_RECURSION || this.#scannedIframes.has(iframe)) {
                return;
            }
            
            this.#scannedIframes.add(iframe);
            
            // 设置iframe属性防止广告
            try {
                iframe.setAttribute('sandbox', 'allow-scripts allow-same-origin');
                iframe.setAttribute('loading', 'lazy');
            } catch {}
            
            // 延迟扫描iframe内容
            setTimeout(() => {
                try {
                    const doc = iframe.contentDocument || iframe.contentWindow?.document;
                    if (doc && doc.body) {
                        // 扫描iframe内的广告
                        const ads = doc.querySelectorAll(this.#adSelectors);
                        ads.forEach(ad => {
                            if (this.#isAdElement(ad)) {
                                this.#removeOrHideAd(ad);
                            }
                        });
                        
                        // 递归扫描嵌套iframe
                        doc.querySelectorAll('iframe').forEach(nestedIframe => {
                            this.#scanIframe(nestedIframe, depth + 1);
                        });
                    }
                } catch (error) {
                    // 跨域iframe，无法访问
                }
            }, 1000); // 给iframe加载时间
        }
        
        #scanShadowDOM(root, depth = 0) {
            if (depth >= CONFIG.MAX_SHADOW_DEPTH || !root?.shadowRoot) return;
            
            const walker = document.createTreeWalker(
                root.shadowRoot,
                NodeFilter.SHOW_ELEMENT,
                {
                    acceptNode: (node) => {
                        if (this.#isAdElement(node)) {
                            return NodeFilter.FILTER_ACCEPT;
                        }
                        if (node.shadowRoot) {
                            this.#scanShadowDOM(node, depth + 1);
                        }
                        if (node.tagName === 'IFRAME') {
                            this.#scanIframe(node, 0);
                        }
                        return NodeFilter.FILTER_SKIP;
                    }
                }
            );
            
            let count = 0;
            let node;
            while ((node = walker.nextNode()) && count++ < CONFIG.MAX_AD_SCAN_NODES) {
                this.#removeOrHideAd(node);
            }
        }
        
        async scanDocument(root = document) {
            Logger.startPerf('ad_scan');
            
            // 初始扫描
            const ads = root.querySelectorAll(this.#adSelectors);
            let removedCount = 0;
            
            ads.forEach(ad => {
                if (this.#isAdElement(ad)) {
                    this.#removeOrHideAd(ad);
                    removedCount++;
                }
            });
            
            // 深度扫描
            if (CONFIG.ENABLE_SHADOW_DOM_TRACKING) {
                root.querySelectorAll('*').forEach(node => {
                    if (node.shadowRoot) {
                        this.#scanShadowDOM(node);
                    }
                });
            }
            
            // iframe扫描
            if (CONFIG.ENABLE_IFRAME_TRACKING) {
                root.querySelectorAll('iframe').forEach(iframe => {
                    this.#scanIframe(iframe);
                });
            }
            
            Logger.endPerf('ad_scan');
            Logger.info(`Removed ${removedCount} ads from initial scan`);
            
            return removedCount;
        }
        
        enable() {
            this.#isEnabled = true;
        }
        
        disable() {
            this.#isEnabled = false;
        }
        
        isEnabled() {
            return this.#isEnabled;
        }
        
        destroy() {
            if (this.#adObserver) {
                this.#adObserver.disconnect();
                this.#adObserver = null;
            }
            
            if (this.#mutationObserver) {
                this.#mutationObserver.disconnect();
                this.#mutationObserver = null;
            }
            
            this.#scannedIframes = new WeakSet();
            this.#adElements = Utils.createWeakCache();
            this.#instance = null;
        }
    }

    // ───────────────────────────────────────────────────────────────────────────────
    // 音频增强系统
    // ───────────────────────────────────────────────────────────────────────────────
    class AudioEnhancer {
        static #instance = null;
        static #audioContext = null;
        static #analyser = null;
        static #source = null;
        static #isInitialized = false;
        static #normalizationGain = null;
        static #targetLoudness = CONFIG.NORMALIZATION_TARGET;
        static #currentVolume = 1.0;
        static #isProcessing = false;
        
        static get instance() {
            if (!this.#instance) {
                this.#instance = new AudioEnhancer();
            }
            return this.#instance;
        }
        
        async init() {
            if (!CONFIG.ENABLE_AUDIO_NORMALIZATION) return false;
            
            try {
                const AudioContext = window.AudioContext || window.webkitAudioContext;
                if (!AudioContext) return false;
                
                this.#audioContext = new AudioContext();
                
                // 创建分析节点
                this.#analyser = this.#audioContext.createAnalyser();
                this.#analyser.fftSize = 2048;
                this.#analyser.smoothingTimeConstant = 0.8;
                
                // 创建增益节点用于音量归一化
                this.#normalizationGain = this.#audioContext.createGain();
                this.#normalizationGain.connect(this.#analyser);
                this.#analyser.connect(this.#audioContext.destination);
                
                this.#isInitialized = true;
                Logger.info('Audio enhancer initialized');
                
                return true;
            } catch (error) {
                Logger.error('Failed to initialize audio enhancer:', error);
                return false;
            }
        }
        
        connectToVideo(videoElement) {
            if (!this.#isInitialized || !CONFIG.ENABLE_AUDIO_NORMALIZATION || !videoElement) {
                return false;
            }
            
            try {
                if (this.#source) {
                    this.#source.disconnect();
                }
                
                this.#source = this.#audioContext.createMediaElementSource(videoElement);
                this.#source.connect(this.#normalizationGain);
                
                // 开始处理音频
                this.#startProcessing();
                
                return true;
            } catch (error) {
                Logger.error('Failed to connect audio enhancer to video:', error);
                return false;
            }
        }
        
        #startProcessing() {
            if (this.#isProcessing || !this.#analyser) return;
            
            this.#isProcessing = true;
            const bufferLength = this.#analyser.frequencyBinCount;
            const dataArray = new Uint8Array(bufferLength);
            
            const processAudio = () => {
                if (!this.#isProcessing) return;
                
                this.#analyser.getByteTimeDomainData(dataArray);
                
                // 计算RMS（均方根）作为响度估计
                let sum = 0;
                for (let i = 0; i < bufferLength; i++) {
                    const sample = (dataArray[i] - 128) / 128;
                    sum += sample * sample;
                }
                const rms = Math.sqrt(sum / bufferLength);
                
                // 将RMS转换为dBFS
                const db = 20 * Math.log10(rms + 1e-6);
                
                // 调整增益以达到目标响度
                if (this.#normalizationGain && Math.abs(db - this.#targetLoudness) > 1) {
                    const gainValue = Math.pow(10, (this.#targetLoudness - db) / 20);
                    this.#normalizationGain.gain.setTargetAtTime(
                        Math.max(0.1, Math.min(10, gainValue)),
                        this.#audioContext.currentTime,
                        0.1
                    );
                }
                
                requestAnimationFrame(processAudio);
            };
            
            processAudio();
        }
        
        async enhanceVolume(videoElement, targetFactor = CONFIG.VOLUME_BOOST_FACTOR) {
            if (!videoElement || videoElement.muted || videoElement.volume >= CONFIG.MAX_VOLUME_BOOST) {
                return false;
            }
            
            const currentVolume = videoElement.volume;
            const targetVolume = Math.min(currentVolume * targetFactor, CONFIG.MAX_VOLUME_BOOST);
            
            if (targetVolume <= currentVolume + 0.05) {
                return false; // 变化太小，忽略
            }
            
            // 检查音频上下文状态
            if (this.#audioContext?.state === 'suspended') {
                try {
                    await this.#audioContext.resume();
                } catch (error) {
                    Logger.warn('Failed to resume audio context:', error);
                }
            }
            
            // 应用音频增强
            if (CONFIG.ENABLE_AUDIO_NORMALIZATION && this.#isInitialized) {
                this.connectToVideo(videoElement);
            }
            
            // 平滑调整音量
            return this.#rampVolume(videoElement, currentVolume, targetVolume, CONFIG.VOLUME_RAMP_DURATION);
        }
        
        #rampVolume(videoElement, startVolume, targetVolume, duration) {
            return new Promise((resolve) => {
                const startTime = Utils.now();
                const initialVolume = videoElement.volume;
                
                const animate = (currentTime) => {
                    const elapsed = currentTime - startTime;
                    const progress = Math.min(elapsed / duration, 1);
                    
                    // 使用缓动函数使过渡更平滑
                    const easeOutCubic = 1 - Math.pow(1 - progress, 3);
                    videoElement.volume = startVolume + (targetVolume - startVolume) * easeOutCubic;
                    
                    if (progress < 1) {
                        requestAnimationFrame(animate);
                    } else {
                        resolve(true);
                    }
                };
                
                requestAnimationFrame(animate);
            });
        }
        
        disconnect() {
            if (this.#source) {
                this.#source.disconnect();
                this.#source = null;
            }
            
            this.#isProcessing = false;
        }
        
        destroy() {
            this.disconnect();
            
            if (this.#audioContext) {
                this.#audioContext.close().catch(() => {});
                this.#audioContext = null;
            }
            
            this.#analyser = null;
            this.#normalizationGain = null;
            this.#instance = null;
            this.#isInitialized = false;
        }
        
        getAudioMetrics() {
            if (!this.#isInitialized || !this.#analyser) return null;
            
            const bufferLength = this.#analyser.frequencyBinCount;
            const dataArray = new Uint8Array(bufferLength);
            this.#analyser.getByteFrequencyData(dataArray);
            
            // 计算频率数据的统计信息
            let sum = 0;
            let max = -Infinity;
            let min = Infinity;
            
            for (let i = 0; i < bufferLength; i++) {
                const value = dataArray[i];
                sum += value;
                max = Math.max(max, value);
                min = Math.min(min, value);
            }
            
            const average = sum / bufferLength;
            
            return {
                averageVolume: average,
                peakVolume: max,
                minVolume: min,
                dynamicRange: max - min,
                currentGain: this.#normalizationGain?.gain.value || 1.0
            };
        }
    }

    // ───────────────────────────────────────────────────────────────────────────────
    // 视频追踪核心系统
    // ───────────────────────────────────────────────────────────────────────────────
    class VideoTracker {
        static #instance = null;
        static #videoStates = Utils.createWeakCache();
        static #trackedFingerprints = new Set();
        static #pendingReports = new Map();
        static #reportDebounceTimer = null;
        static #mutationObserver = null;
        static #visibilityObserver = null;
        static #storageManager = null;
        static #adBlocker = null;
        static #audioEnhancer = null;
        static #initialized = false;
        static #sessionId = null;
        static #pageStartTime = Date.now();
        static #performanceMetrics = {
            videosTracked: 0,
            adsBlocked: 0,
            reportsSent: 0,
            errors: 0,
            startTime: Date.now()
        };
        
        static get instance() {
            if (!this.#instance) {
                this.#instance = new VideoTracker();
            }
            return this.#instance;
        }
        
        constructor() {
            this.#sessionId = this.#generateSessionId();
        }
        
        #generateSessionId() {
            const timestamp = Date.now().toString(36);
            const random = Math.random().toString(36).substr(2, 9);
            return `sess_${timestamp}_${random}`;
        }
        
        static async init() {
            if (this.#initialized) return true;
            
            try {
                Logger.startPerf('tracker_init');
                
                // 检查隐私设置
                if (!await this.#checkPrivacyConsent()) {
                    Logger.info('Privacy consent not granted, skipping initialization');
                    return false;
                }
                
                // 初始化子系统
                this.#storageManager = await StorageManager.getInstance();
                this.#adBlocker = AdBlocker.instance;
                this.#audioEnhancer = AudioEnhancer.instance;
                await this.#audioEnhancer.init();
                
                // 注入样式
                this.#injectStyles();
                
                // 设置观察器
                this.#setupObservers();
                
                // 初始扫描
                this.#scanExistingVideos();
                await this.#adBlocker.scanDocument();
                
                // 启动定时任务
                this.#startTimers();
                
                // 设置卸载处理器
                this.#setupUnloadHandlers();
                
                this.#initialized = true;
                Logger.info('VideoTracker initialized successfully');
                Logger.endPerf('tracker_init');
                
                return true;
            } catch (error) {
                Logger.error('Failed to initialize VideoTracker:', error);
                this.#performanceMetrics.errors++;
                return false;
            }
        }
        
        static async #checkPrivacyConsent() {
            // 尊重DNT
            if (CONFIG.RESPECT_DNT) {
                if (navigator.doNotTrack === "1" || 
                    navigator.msDoNotTrack === "1" ||
                    navigator.globalPrivacyControl) {
                    return false;
                }
            }
            
            // 检查本地同意状态
            if (CONFIG.REQUIRE_USER_CONSENT) {
                try {
                    const stored = localStorage.getItem(CONFIG.CONSENT_KEY);
                    if (stored) {
                        const consent = JSON.parse(stored);
                        if (consent.expiry && consent.expiry < Date.now()) {
                            localStorage.removeItem(CONFIG.CONSENT_KEY);
                            return false;
                        }
                        return consent.granted === true;
                    }
                } catch {
                    // 解析失败，视为未同意
                }
                
                // 检查TCF v2.0
                if (typeof window.__tcfapi === 'function') {
                    return new Promise((resolve) => {
                        window.__tcfapi('getTCData', 2, (tcData, success) => {
                            if (success && tcData.eventStatus === 'tcloaded') {
                                resolve(tcData.purpose.consents[1] && tcData.purpose.consents[4]);
                            } else {
                                resolve(false);
                            }
                        }, 100); // 100ms超时
                    });
                }
                
                return false;
            }
            
            return true;
        }
        
        static #injectStyles() {
            if (document.getElementById('video-tracker-styles')) return;
            
            const style = document.createElement('style');
            style.id = 'video-tracker-styles';
            style.textContent = `
                .video-tracker-ad-wrapper {
                    display: block !important;
                    height: 0 !important;
                    width: 0 !important;
                    overflow: hidden !important;
                    visibility: hidden !important;
                    pointer-events: none !important;
                    position: absolute !important;
                    opacity: 0 !important;
                    z-index: -9999 !important;
                }
                
                .video-tracker-processed {
                    /* 可用于标记已处理的视频 */
                }
                
                @media (prefers-reduced-motion: reduce) {
                    .video-tracker-volume-transition {
                        transition: none !important;
                    }
                }
            `;
            
            document.head.appendChild(style);
        }
        
        static #setupObservers() {
            // MutationObserver用于检测新视频
            if (Utils.capabilities.hasMutationObserver) {
                this.#mutationObserver = new MutationObserver(
                    Utils.throttle((mutations) => this.#handleMutations(mutations), CONFIG.THROTTLE_TIMEOUT)
                );
                
                this.#mutationObserver.observe(document.body, {
                    childList: true,
                    subtree: true,
                    attributes: false
                });
            }
            
            // VisibilityObserver用于页面可见性
            if (document.visibilityState !== undefined) {
                this.#visibilityObserver = () => {
                    if (document.hidden) {
                        this.#pauseAllTracking();
                    } else {
                        this.#resumeAllTracking();
                    }
                };
                document.addEventListener('visibilitychange', this.#visibilityObserver);
            }
            
            // 网络状态监听
            if (Utils.capabilities.hasNetworkInformation && navigator.connection) {
                navigator.connection.addEventListener('change', () => {
                    this.#handleNetworkChange();
                });
            }
            
            // 页面加载完成
            if (document.readyState === 'loading') {
                document.addEventListener('DOMContentLoaded', () => {
                    this.#scanExistingVideos();
                });
            }
        }
        
        static #handleMutations(mutations) {
            const newVideos = new Set();
            
            for (const mutation of mutations) {
                if (mutation.type === 'childList') {
                    mutation.addedNodes.forEach(node => {
                        if (node.nodeType === Node.ELEMENT_NODE) {
                            // 检测video元素
                            if (node.matches?.('video')) {
                                newVideos.add(node);
                            }
                            
                            // 检测包含video的元素
                            if (node.querySelector?.('video')) {
                                node.querySelectorAll('video').forEach(video => newVideos.add(video));
                            }
                            
                            // 检测iframe
                            if (node.matches?.('iframe') || node.querySelector?.('iframe')) {
                                node.querySelectorAll('iframe').forEach(iframe => {
                                    this.#scanIframeForVideos(iframe);
                                });
                            }
                            
                            // 检测Shadow DOM
                            if (node.shadowRoot) {
                                this.#scanShadowDOMForVideos(node.shadowRoot);
                            }
                        }
                    });
                }
            }
            
            // 处理新发现的视频
            newVideos.forEach(video => {
                if (!this.#videoStates.has(video) && this.#shouldTrackVideo(video)) {
                    this.#trackVideo(video);
                }
            });
            
            // 延迟广告扫描
            if (newVideos.size > 0) {
                Utils.requestIdleCallback(() => {
                    this.#adBlocker.scanDocument();
                }, { timeout: 2000 });
            }
        }
        
        static #scanIframeForVideos(iframe, depth = 0) {
            if (depth >= CONFIG.MAX_IFRAME_RECURSION || !CONFIG.ENABLE_IFRAME_TRACKING) {
                return;
            }
            
            try {
                const doc = iframe.contentDocument || iframe.contentWindow?.document;
                if (doc && doc.body) {
                    doc.querySelectorAll('video').forEach(video => {
                        if (!this.#videoStates.has(video) && this.#shouldTrackVideo(video)) {
                            this.#trackVideo(video);
                        }
                    });
                    
                    // 递归扫描嵌套iframe
                    doc.querySelectorAll('iframe').forEach(nestedIframe => {
                        this.#scanIframeForVideos(nestedIframe, depth + 1);
                    });
                }
            } catch (error) {
                // 跨域iframe，无法访问
            }
        }
        
        static #scanShadowDOMForVideos(root, depth = 0) {
            if (depth >= CONFIG.MAX_SHADOW_DEPTH || !CONFIG.ENABLE_SHADOW_DOM_TRACKING) {
                return;
            }
            
            const walker = document.createTreeWalker(
                root,
                NodeFilter.SHOW_ELEMENT,
                {
                    acceptNode: (node) => {
                        if (node.matches?.('video')) {
                            return NodeFilter.FILTER_ACCEPT;
                        }
                        if (node.shadowRoot) {
                            this.#scanShadowDOMForVideos(node.shadowRoot, depth + 1);
                        }
                        return NodeFilter.FILTER_SKIP;
                    }
                }
            );
            
            let node;
            while (node = walker.nextNode()) {
                if (!this.#videoStates.has(node) && this.#shouldTrackVideo(node)) {
                    this.#trackVideo(node);
                }
            }
        }
        
        static #scanExistingVideos() {
            Logger.startPerf('scan_existing_videos');
            
            const videos = document.querySelectorAll('video');
            let trackedCount = 0;
            
            videos.forEach(video => {
                if (!this.#videoStates.has(video) && this.#shouldTrackVideo(video)) {
                    this.#trackVideo(video);
                    trackedCount++;
                }
            });
            
            Logger.endPerf('scan_existing_videos');
            Logger.info(`Found ${videos.length} videos, tracking ${trackedCount}`);
            
            // 扫描iframe中的视频
            if (CONFIG.ENABLE_IFRAME_TRACKING) {
                document.querySelectorAll('iframe').forEach(iframe => {
                    this.#scanIframeForVideos(iframe);
                });
            }
            
            // 扫描Shadow DOM中的视频
            if (CONFIG.ENABLE_SHADOW_DOM_TRACKING) {
                document.querySelectorAll('*').forEach(node => {
                    if (node.shadowRoot) {
                        this.#scanShadowDOMForVideos(node.shadowRoot);
                    }
                });
            }
        }
        
        static #shouldTrackVideo(video) {
            if (!video || !video.tagName || video.tagName.toLowerCase() !== 'video') {
                return false;
            }
            
            // 检查是否已经处理过
            if (video.dataset.videoTrackerProcessed) {
                return false;
            }
            
            // 检查视频属性
            if (this.#isMeaninglessVideo(video)) {
                return false;
            }
            
            // 检查是否广告视频
            if (this.#isAdVideo(video)) {
                return false;
            }
            
            // 采样率控制
            if (Math.random() > CONFIG.VIDEO_SAMPLE_RATE) {
                return false;
            }
            
            // 质量检查
            if (video.videoHeight < CONFIG.MIN_VIDEO_QUALITY && video.videoWidth < CONFIG.MIN_VIDEO_QUALITY) {
                return false;
            }
            
            // 播放速度检查
            if (video.playbackRate < CONFIG.MIN_PLAYBACK_RATE || video.playbackRate > CONFIG.MAX_PLAYBACK_RATE) {
                return false;
            }
            
            return true;
        }
        
        static #isMeaninglessVideo(video) {
            // 检查是否为无意义视频（背景、装饰等）
            return (
                video.muted &&
                video.played.length === 0 &&
                !video.controls &&
                video.paused &&
                video.duration === 0 &&
                video.readyState === 0
            );
        }
        
        static #isAdVideo(video) {
            if (!video) return false;
            
            // 检查src中的广告关键词
            const src = (video.currentSrc || video.src || '').toLowerCase();
            if (CONFIG.AD_KEYWORDS.some(keyword => src.includes(keyword))) {
                return true;
            }
            
            // 检查域名
            const hostname = Utils.getHostname(src);
            if (CONFIG.AD_DOMAIN_REGEX.test(hostname)) {
                return true;
            }
            
            // 检查父元素是否为广告
            let parent = video.parentElement;
            let depth = 0;
            while (parent && depth < 3) {
                if (this.#adBlocker.isAdElement(parent)) {
                    return true;
                }
                parent = parent.parentElement;
                depth++;
            }
            
            return false;
        }
        
        static #trackVideo(video) {
            if (!video || this.#videoStates.has(video)) return;
            
            // 标记为已处理
            video.dataset.videoTrackerProcessed = 'true';
            
            const videoId = this.#getVideoUniqueId(video);
            const fingerprint = this.#getVideoFingerprint(video);
            
            // 检查是否已追踪相同指纹的视频
            if (this.#trackedFingerprints.has(fingerprint)) {
                Logger.debug(`Video with fingerprint ${fingerprint} already tracked, skipping`);
                return;
            }
            
            this.#trackedFingerprints.add(fingerprint);
            
            // 创建追踪状态
            const state = {
                id: videoId,
                fingerprint,
                totalPlayed: 0,
                lastTime: video.currentTime || 0,
                lastUpdateTime: Utils.now(),
                isSeeking: false,
                isPaused: video.paused,
                isMuted: video.muted,
                volume: video.volume,
                playbackRate: video.playbackRate,
                isFullscreen: this.#isFullscreen(video),
                isPiP: this.#isInPictureInPicture(video),
                quality: this.#getVideoQuality(video),
                buffering: false,
                bufferingStart: null,
                bufferingTotal: 0,
                tracked: false,
                reportSent: false,
                events: [],
                videoElement: video
            };
            
            this.#videoStates.set(video, state);
            this.#performanceMetrics.videosTracked++;
            
            // 音频增强
            if (!video.muted && video.volume < CONFIG.MAX_VOLUME_BOOST) {
                Utils.requestIdleCallback(() => {
                    this.#audioEnhancer.enhanceVolume(video).catch(() => {});
                }, { timeout: 1000 });
            }
            
            // 绑定事件监听器
            this.#bindVideoEvents(video, state);
            
            Logger.debug(`Started tracking video: ${videoId}`);
        }
        
        static #bindVideoEvents(video, state) {
            const updatePlayTime = Utils.throttle(() => {
                if (document.hidden && !this.#isInPictureInPicture(video)) return;
                
                const currentTime = video.currentTime;
                const nowTime = Utils.now();
                const realElapsed = (nowTime - state.lastUpdateTime) / 1000;
                
                // 有效性检查
                if (typeof currentTime !== 'number' || isNaN(currentTime) || currentTime < 0) {
                    return;
                }
                
                // 检查是否在播放（非暂停、非跳转、有实际进度）
                if (!state.isSeeking && !video.paused && currentTime > state.lastTime) {
                    state.totalPlayed += realElapsed;
                    
                    // 检查是否达到上报阈值
                    if (state.totalPlayed >= CONFIG.CACHE_DURATION_THRESHOLD && !state.tracked) {
                        state.tracked = true;
                        this.#cacheAndReport(video, state);
                    }
                }
                
                state.lastTime = currentTime;
                state.lastUpdateTime = nowTime;
            }, CONFIG.THROTTLE_TIMEOUT);
            
            const eventHandlers = {
                // 播放相关
                play: () => {
                    state.isPaused = false;
                    state.lastUpdateTime = Utils.now();
                    state.events.push({ type: 'play', timestamp: Date.now() });
                },
                
                pause: () => {
                    state.isPaused = true;
                    updatePlayTime();
                    state.events.push({ type: 'pause', timestamp: Date.now() });
                },
                
                timeupdate: updatePlayTime,
                
                seeking: () => {
                    state.isSeeking = true;
                    state.events.push({ type: 'seeking', timestamp: Date.now() });
                },
                
                seeked: () => {
                    state.isSeeking = false;
                    state.lastTime = video.currentTime;
                    state.events.push({ type: 'seeked', timestamp: Date.now() });
                },
                
                ended: () => {
                    updatePlayTime();
                    state.events.push({ type: 'ended', timestamp: Date.now() });
                    this.#cacheAndReport(video, state, true);
                },
                
                // 音量相关
                volumechange: () => {
                    state.volume = video.volume;
                    state.isMuted = video.muted;
                    state.events.push({ 
                        type: 'volumechange', 
                        timestamp: Date.now(),
                        volume: video.volume,
                        muted: video.muted 
                    });
                },
                
                // 播放速度
                ratechange: () => {
                    state.playbackRate = video.playbackRate;
                    state.events.push({ 
                        type: 'ratechange', 
                        timestamp: Date.now(),
                        rate: video.playbackRate 
                    });
                },
                
                // 缓冲相关
                waiting: () => {
                    state.buffering = true;
                    state.bufferingStart = Utils.now();
                    state.events.push({ type: 'waiting', timestamp: Date.now() });
                },
                
                playing: () => {
                    if (state.buffering && state.bufferingStart) {
                        const bufferingDuration = (Utils.now() - state.bufferingStart) / 1000;
                        state.bufferingTotal += bufferingDuration;
                        state.buffering = false;
                        state.bufferingStart = null;
                        state.events.push({ 
                            type: 'playing', 
                            timestamp: Date.now(),
                            bufferingDuration 
                        });
                    }
                },
                
                // 错误处理
                error: (e) => {
                    state.events.push({ 
                        type: 'error', 
                        timestamp: Date.now(),
                        error: video.error?.message || 'Unknown error'
                    });
                    Logger.error('Video error:', video.error);
                },
                
                // 质量变化
                resize: () => {
                    const newQuality = this.#getVideoQuality(video);
                    if (newQuality !== state.quality) {
                        state.quality = newQuality;
                        state.events.push({ 
                            type: 'qualitychange', 
                            timestamp: Date.now(),
                            quality: newQuality 
                        });
                    }
                },
                
                // 全屏/PiP变化
                fullscreenchange: () => {
                    const newFullscreen = this.#isFullscreen(video);
                    if (newFullscreen !== state.isFullscreen) {
                        state.isFullscreen = newFullscreen;
                        state.events.push({ 
                            type: 'fullscreenchange', 
                            timestamp: Date.now(),
                            fullscreen: newFullscreen 
                        });
                    }
                },
                
                enterpictureinpicture: () => {
                    state.isPiP = true;
                    state.events.push({ type: 'enterpictureinpicture', timestamp: Date.now() });
                },
                
                leavepictureinpicture: () => {
                    state.isPiP = false;
                    state.events.push({ type: 'leavepictureinpicture', timestamp: Date.now() });
                }
            };
            
            // 绑定事件
            Object.entries(eventHandlers).forEach(([event, handler]) => {
                video.addEventListener(event, handler, { passive: true });
            });
            
            // 存储清理函数
            state.cleanup = () => {
                Object.entries(eventHandlers).forEach(([event, handler]) => {
                    video.removeEventListener(event, handler);
                });
                
                this.#videoStates.delete(video);
                this.#trackedFingerprints.delete(state.fingerprint);
                
                delete video.dataset.videoTrackerProcessed;
                
                Logger.debug(`Stopped tracking video: ${state.id}`);
            };
            
            // 监听视频元素移除
            const observer = new MutationObserver((mutations) => {
                for (const mutation of mutations) {
                    if (mutation.type === 'childList' && 
                        Array.from(mutation.removedNodes).some(node => node.contains?.(video))) {
                        state.cleanup();
                        observer.disconnect();
                        break;
                    }
                }
            });
            
            observer.observe(document.body, { childList: true, subtree: true });
        }
        
        static #getVideoUniqueId(video) {
            // 尝试从data属性获取
            if (video.dataset.videoId) {
                return `data_${video.dataset.videoId}`;
            }
            
            // 尝试从id获取
            if (video.id) {
                return `id_${video.id}`;
            }
            
            // 提取平台视频ID
            const platformId = this.#extractPlatformVideoId(video.currentSrc || video.src);
            if (platformId) {
                return platformId;
            }
            
            // 生成指纹ID
            const fingerprint = this.#getVideoFingerprint(video);
            return `fp_${Utils.safeBtoa(fingerprint)}`;
        }
        
        static #extractPlatformVideoId(src) {
            if (!src) return null;
            
            try {
                const url = new URL(src, window.location.href);
                const hostname = url.hostname.toLowerCase();
                
                // YouTube
                if (hostname.includes('youtube.com') || hostname.includes('youtu.be')) {
                    const v = url.searchParams.get('v');
                    if (v) return `yt_${v}`;
                    
                    if (hostname.includes('youtu.be')) {
                        const match = url.pathname.match(/\/([\w\-]{11})/);
                        if (match)