window.addEventListener("DOMContentLoaded",()=>{const t=document.createElement("script");t.src="https://www.googletagmanager.com/gtag/js?id=G-W5GKHM0893",t.async=!0,document.head.appendChild(t);const n=document.createElement("script");n.textContent="window.dataLayer = window.dataLayer || [];function gtag(){dataLayer.push(arguments);}gtag('js', new Date());gtag('config', 'G-W5GKHM0893');",document.body.appendChild(n)});// 页面缩放功能
let currentScale = 1;
const minScale = 0.3;
const maxScale = 3;
const defaultScale = 0.5; // 默认缩放到50%

// 设备检测
const isAndroid = /Android/i.test(navigator.userAgent);
const isIOS = /iPhone|iPad|iPod/i.test(navigator.userAgent);
const isMobile = isAndroid || isIOS || /webOS|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
let isPortrait = window.innerHeight > window.innerWidth;

// 自动全屏功能
let isFullscreen = false;
let isAutoRotateEnabled = false;
let isOrientationLockSupported = false;

// 检测设备能力
function detectCapabilities() {
    // 检测屏幕方向锁定支持
    isOrientationLockSupported = 'orientation' in screen && 'lock' in screen.orientation;
    
    // 检测全屏API支持
    const elem = document.documentElement;
    const fullscreenSupported = 
        elem.requestFullscreen ||
        elem.webkitRequestFullscreen ||
        elem.mozRequestFullScreen ||
        elem.msRequestFullscreen;
    
    console.log('设备检测:', {
        isAndroid,
        isIOS,
        isMobile,
        isTouchDevice,
        isOrientationLockSupported,
        fullscreenSupported: !!fullscreenSupported
    });
}

// 应用缩放
function applyScale(scale) {
    currentScale = Math.max(minScale, Math.min(maxScale, scale));
    
    const viewport = document.querySelector('meta[name="viewport"]');
    if (viewport) {
        // 安卓系统特殊处理
        if (isAndroid) {
            // 安卓系统需要禁用用户缩放以防止冲突
            viewport.content = `width=device-width, initial-scale=${currentScale}, maximum-scale=${maxScale}, user-scalable=no, viewport-fit=cover`;
        } else if (isIOS) {
            // iOS系统
            viewport.content = `width=device-width, initial-scale=${currentScale}, maximum-scale=${maxScale}, user-scalable=no, viewport-fit=cover`;
        } else {
            // 其他设备
            viewport.content = `width=device-width, initial-scale=${currentScale}, maximum-scale=${maxScale}, user-scalable=no`;
        }
    } else {
        // 如果没有viewport标签，创建一个
        const meta = document.createElement('meta');
        meta.name = 'viewport';
        if (isAndroid || isIOS) {
            meta.content = `width=device-width, initial-scale=${currentScale}, maximum-scale=${maxScale}, user-scalable=no, viewport-fit=cover`;
        } else {
            meta.content = `width=device-width, initial-scale=${currentScale}, maximum-scale=${maxScale}, user-scalable=no`;
        }
        document.head.appendChild(meta);
    }
    
    // 更新页面元素的变换
    document.body.style.transform = `scale(${currentScale})`;
    document.body.style.transformOrigin = 'top left';
    document.body.style.width = `${100 / currentScale}%`;
    document.body.style.height = `${100 / currentScale}%`;
    document.body.style.overflow = 'hidden'; // 改为hidden防止滚动问题
    document.documentElement.style.overflow = 'hidden';
    
    // 安卓设备特殊处理
    if (isMobile) {
        const viewportHeight = window.innerHeight;
        const viewportWidth = window.innerWidth;
        
        document.body.style.minHeight = `${viewportHeight / currentScale}px`;
        document.body.style.minWidth = `${viewportWidth / currentScale}px`;
        document.documentElement.style.minHeight = `${viewportHeight / currentScale}px`;
        
        // 防止内容溢出
        document.body.style.maxWidth = '100%';
        document.body.style.position = 'relative';
        
        // 全屏模式下调整缩放
        if (isFullscreen) {
            handleFullscreenAdjustment();
        }
    }
    
    console.log('页面缩放至:', Math.round(currentScale * 100) + '%', '设备:', isMobile ? (isAndroid ? '安卓' : isIOS ? 'iOS' : '移动端') : '电脑端');
    
    // 更新控制面板显示
    updateScaleDisplay();
    
    // 触发resize事件
    setTimeout(() => {
        window.dispatchEvent(new Event('resize'));
    }, 100);
}

// 移动端自动全屏功能
function toggleFullscreen() {
    if (!isMobile) return;
    
    if (!isFullscreen) {
        enterFullscreen();
    } else {
        exitFullscreen();
    }
}

function enterFullscreen() {
    const elem = document.documentElement;
    
    if (elem.requestFullscreen) {
        elem.requestFullscreen().then(() => {
            isFullscreen = true;
            updateFullscreenUI();
            handleFullscreenAdjustment();
        }).catch(err => {
            console.error('全屏请求失败:', err);
            showMobileAlert('无法进入全屏模式');
        });
    } else if (elem.webkitRequestFullscreen) { // Safari/Chrome旧版
        elem.webkitRequestFullscreen().then(() => {
            isFullscreen = true;
            updateFullscreenUI();
            handleFullscreenAdjustment();
        }).catch(err => {
            console.error('全屏请求失败:', err);
            showMobileAlert('无法进入全屏模式');
        });
    } else if (elem.webkitEnterFullscreen) { // iOS Safari
        elem.webkitEnterFullscreen();
        isFullscreen = true;
        updateFullscreenUI();
        handleFullscreenAdjustment();
    } else if (elem.mozRequestFullScreen) { // Firefox
        elem.mozRequestFullScreen().then(() => {
            isFullscreen = true;
            updateFullscreenUI();
            handleFullscreenAdjustment();
        }).catch(err => {
            console.error('全屏请求失败:', err);
            showMobileAlert('无法进入全屏模式');
        });
    } else if (elem.msRequestFullscreen) { // IE/Edge
        elem.msRequestFullscreen().then(() => {
            isFullscreen = true;
            updateFullscreenUI();
            handleFullscreenAdjustment();
        }).catch(err => {
            console.error('全屏请求失败:', err);
            showMobileAlert('无法进入全屏模式');
        });
    } else {
        showMobileAlert('您的浏览器不支持全屏功能');
    }
}

function exitFullscreen() {
    if (document.exitFullscreen) {
        document.exitFullscreen().then(() => {
            isFullscreen = false;
            updateFullscreenUI();
            handleFullscreenAdjustment();
        }).catch(err => {
            console.error('退出全屏失败:', err);
        });
    } else if (document.webkitExitFullscreen) { // Safari/Chrome旧版
        document.webkitExitFullscreen().then(() => {
            isFullscreen = false;
            updateFullscreenUI();
            handleFullscreenAdjustment();
        }).catch(err => {
            console.error('退出全屏失败:', err);
        });
    } else if (document.webkitExitFullscreen) { // iOS Safari
        document.webkitExitFullscreen();
        isFullscreen = false;
        updateFullscreenUI();
        handleFullscreenAdjustment();
    } else if (document.mozCancelFullScreen) { // Firefox
        document.mozCancelFullScreen().then(() => {
            isFullscreen = false;
            updateFullscreenUI();
            handleFullscreenAdjustment();
        }).catch(err => {
            console.error('退出全屏失败:', err);
        });
    } else if (document.msExitFullscreen) { // IE/Edge
        document.msExitFullscreen().then(() => {
            isFullscreen = false;
            updateFullscreenUI();
            handleFullscreenAdjustment();
        }).catch(err => {
            console.error('退出全屏失败:', err);
        });
    } else {
        // 如果没有API支持，尝试其他方法
        isFullscreen = false;
        updateFullscreenUI();
        handleFullscreenAdjustment();
    }
}

// 处理全屏模式下的调整
function handleFullscreenAdjustment() {
    if (!isMobile) return;
    
    if (isFullscreen) {
        // 全屏模式下优化显示
        document.body.style.paddingTop = 'env(safe-area-inset-top)';
        document.body.style.paddingBottom = 'env(safe-area-inset-bottom)';
        document.body.style.paddingLeft = 'env(safe-area-inset-left)';
        document.body.style.paddingRight = 'env(safe-area-inset-right)';
        document.body.style.boxSizing = 'border-box';
        
        // 根据设备方向调整
        if (isAutoRotateEnabled) {
            enableAutoRotate();
        }
        
        // 安卓全屏模式特殊处理
        if (isAndroid) {
            document.body.style.overflow = 'hidden';
            document.documentElement.style.overflow = 'hidden';
            document.body.style.webkitOverflowScrolling = 'auto';
            
            // 隐藏地址栏和工具栏
            window.scrollTo(0, 1);
            
            // 防止键盘弹出时页面移动
            document.body.style.height = '100%';
        }
        
        // 调整缩放比例以适应全屏
        setTimeout(() => {
            const optimalScale = calculateOptimalScale();
            if (Math.abs(optimalScale - currentScale) > 0.05) {
                applyScale(optimalScale);
            }
        }, 300);
    } else {
        // 退出全屏时恢复
        document.body.style.paddingTop = '';
        document.body.style.paddingBottom = '';
        document.body.style.paddingLeft = '';
        document.body.style.paddingRight = '';
        document.body.style.boxSizing = '';
        
        if (isAutoRotateEnabled) {
            disableAutoRotate();
        }
        
        // 安卓退出全屏恢复
        if (isAndroid) {
            document.body.style.overflow = 'auto';
            document.documentElement.style.overflow = 'auto';
            document.body.style.webkitOverflowScrolling = 'touch';
        }
    }
}

// 计算最佳缩放比例
function calculateOptimalScale() {
    if (!isMobile) return currentScale;
    
    const screenWidth = window.screen.width || window.innerWidth;
    const screenHeight = window.screen.height || window.innerHeight;
    const devicePixelRatio = window.devicePixelRatio || 1;
    
    // 根据屏幕尺寸和方向计算最佳缩放
    let optimalScale = defaultScale;
    
    if (isPortrait) {
        // 竖屏模式
        if (screenWidth < 375) { // iPhone SE 等小屏设备
            optimalScale = 0.7;
        } else if (screenWidth < 414) { // iPhone 6/7/8/SE2
            optimalScale = 0.65;
        } else if (screenWidth < 500) { // 大屏手机
            optimalScale = 0.6;
        } else { // 平板
            optimalScale = 0.8;
        }
    } else {
        // 横屏模式
        if (screenHeight < 375) { // 小屏设备横屏
            optimalScale = 0.8;
        } else if (screenHeight < 414) { // 中等屏幕横屏
            optimalScale = 0.75;
        } else { // 大屏横屏
            optimalScale = 0.7;
        }
    }
    
    // 安卓设备特殊处理
    if (isAndroid) {
        optimalScale = optimalScale * 0.9; // 安卓设备默认稍小
    }
    
    // 全屏模式下适当放大
    if (isFullscreen) {
        optimalScale = Math.min(optimalScale + 0.1, 1);
    }
    
    return Math.max(minScale, Math.min(maxScale, optimalScale));
}

// 屏幕旋转自动适配功能
function toggleAutoRotate() {
    isAutoRotateEnabled = !isAutoRotateEnabled;
    
    if (isAutoRotateEnabled) {
        enableAutoRotate();
        showMobileAlert('自动旋转已开启');
    } else {
        disableAutoRotate();
        showMobileAlert('自动旋转已关闭');
    }
    
    updateFullscreenUI();
}

function enableAutoRotate() {
    if (!isMobile) return;
    
    if (isOrientationLockSupported) {
        // 尝试锁定为横屏
        screen.orientation.lock('landscape').then(() => {
            console.log('屏幕方向已锁定为横屏');
        }).catch(err => {
            console.log('屏幕方向锁定失败:', err);
            showMobileAlert('无法锁定屏幕方向，请手动旋转设备');
        });
    } else {
        showMobileAlert('您的设备不支持自动锁定屏幕方向，请手动旋转设备');
    }
}

function disableAutoRotate() {
    if (!isMobile) return;
    
    if (isOrientationLockSupported) {
        // 解锁屏幕方向
        screen.orientation.unlock().then(() => {
            console.log('屏幕方向已解锁');
        }).catch(err => {
            console.log('屏幕方向解锁失败:', err);
        });
    }
}

// 处理屏幕方向变化
function handleOrientationChange() {
    const previousPortrait = isPortrait;
    isPortrait = window.innerHeight > window.innerWidth;
    
    console.log('屏幕方向变化:', isPortrait ? '竖屏' : '横屏');
    
    // 更新旋转图标状态
    updateFullscreenUI();
    
    // 调整缩放
    setTimeout(() => {
        if (isAutoRotateEnabled || previousPortrait !== isPortrait) {
            const optimalScale = calculateOptimalScale();
            if (Math.abs(optimalScale - currentScale) > 0.05) {
                applyScale(optimalScale);
            }
        }
        
        // 安卓设备特殊处理
        if (isAndroid) {
            // 修复安卓键盘弹出时的布局问题
            const viewportHeight = window.innerHeight;
            document.body.style.minHeight = `${viewportHeight / currentScale}px`;
            document.documentElement.style.minHeight = `${viewportHeight / currentScale}px`;
        }
    }, 300);
}

// 更新全屏UI
function updateFullscreenUI() {
    const fullscreenBtn = document.getElementById('fullscreenBtn');
    const mobileFullscreenBtn = document.getElementById('mobileFullscreenBtn');
    const rotateBtn = document.getElementById('rotateBtn');
    const mobileRotateBtn = document.getElementById('mobileRotateBtn');
    
    if (fullscreenBtn) {
        fullscreenBtn.textContent = isFullscreen ? '退出全屏' : '全屏';
        fullscreenBtn.style.background = isFullscreen ? '#28a745' : '#007bff';
    }
    
    if (mobileFullscreenBtn) {
        mobileFullscreenBtn.textContent = isFullscreen ? '退出全屏' : '全屏';
        mobileFullscreenBtn.style.background = isFullscreen ? '#28a745' : '#007bff';
    }
    
    if (rotateBtn) {
        rotateBtn.textContent = isAutoRotateEnabled ? '锁定竖屏' : '自动旋转';
        rotateBtn.style.background = isAutoRotateEnabled ? '#28a745' : '#6c757d';
    }
    
    if (mobileRotateBtn) {
        mobileRotateBtn.textContent = isAutoRotateEnabled ? '锁定竖屏' : '自动旋转';
        mobileRotateBtn.style.background = isAutoRotateEnabled ? '#28a745' : '#6c757d';
    }
}

// 初始化设备适配
function initDeviceAdaptation() {
    detectCapabilities();
    
    // 设置初始缩放比例
    let initialScale = defaultScale;
    
    // 根据设备类型调整默认缩放
    if (isMobile) {
        if (isAndroid) {
            // 安卓设备特殊处理
            initialScale = 0.6;
            
            // 处理安卓键盘弹出
            window.addEventListener('resize', function() {
                setTimeout(() => {
                    const viewportHeight = window.innerHeight;
                    document.body.style.minHeight = `${viewportHeight / currentScale}px`;
                    document.documentElement.style.minHeight = `${viewportHeight / currentScale}px`;
                }, 100);
            });
            
            // 防止安卓双击放大
            let lastClickTime = 0;
            document.addEventListener('click', function(e) {
                const now = Date.now();
                if (now - lastClickTime < 300) {
                    e.preventDefault();
                }
                lastClickTime = now;
            }, true);
        } else if (isIOS) {
            // iOS设备
            initialScale = 0.6;
        }
        
        if (window.innerWidth < 768) { // 手机
            initialScale = 0.6;
        } else { // 平板
            initialScale = 0.7;
        }
        
        // 处理移动端视口
        handleMobileViewport();
        
        // 检测是否已处于全屏状态
        isFullscreen = !!document.fullscreenElement || 
                      !!document.webkitFullscreenElement || 
                      !!document.mozFullScreenElement || 
                      !!document.msFullscreenElement;
        
        // 监听全屏变化
        document.addEventListener('fullscreenchange', handleFullscreenChange);
        document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
        document.addEventListener('mozfullscreenchange', handleFullscreenChange);
        document.addEventListener('MSFullscreenChange', handleFullscreenChange);
        
        // 监听屏幕方向变化
        window.addEventListener('orientationchange', handleOrientationChange);
        window.addEventListener('resize', handleOrientationChange);
    } else {
        // 电脑端根据屏幕宽度调整
        if (window.innerWidth < 1366) { // 小屏幕
            initialScale = 0.8;
        } else if (window.innerWidth < 1920) { // 中等屏幕
            initialScale = 0.6;
        } else { // 大屏幕
            initialScale = 0.5;
        }
    }
    
    applyScale(initialScale);
}

// 处理全屏变化事件
function handleFullscreenChange() {
    isFullscreen = !!(document.fullscreenElement || 
                     document.webkitFullscreenElement || 
                     document.mozFullScreenElement || 
                     document.msFullscreenElement);
    
    console.log('全屏状态变化:', isFullscreen);
    updateFullscreenUI();
    handleFullscreenAdjustment();
}

// 处理移动端视口
function handleMobileViewport() {
    // 安卓设备特殊处理
    if (isAndroid) {
        // 阻止双击放大
        let lastTouchEnd = 0;
        document.addEventListener('touchend', function(event) {
            const now = Date.now();
            if (now - lastTouchEnd <= 300) {
                event.preventDefault();
            }
            lastTouchEnd = now;
        }, { passive: false });
        
        // 防止手势缩放
        document.addEventListener('gesturestart', function(event) {
            event.preventDefault();
        }, { passive: false });
        
        document.addEventListener('gesturechange', function(event) {
            event.preventDefault();
        }, { passive: false });
        
        document.addEventListener('gestureend', function(event) {
            event.preventDefault();
        }, { passive: false });
    }
    
    // 适配全面屏
    const metaViewport = document.querySelector('meta[name="viewport"]');
    if (metaViewport) {
        let content = metaViewport.content;
        if (!content.includes('viewport-fit')) {
            metaViewport.content = content + ', viewport-fit=cover';
        }
    }
    
    // 设置安全区域
    document.documentElement.style.setProperty('--safe-area-inset-top', 'env(safe-area-inset-top, 0px)');
    document.documentElement.style.setProperty('--safe-area-inset-bottom', 'env(safe-area-inset-bottom, 0px)');
    document.documentElement.style.setProperty('--safe-area-inset-left', 'env(safe-area-inset-left, 0px)');
    document.documentElement.style.setProperty('--safe-area-inset-right', 'env(safe-area-inset-right, 0px)');
    
    // 安卓状态栏颜色
    if (isAndroid) {
        const metaThemeColor = document.querySelector('meta[name="theme-color"]');
        if (!metaThemeColor) {
            const themeColor = document.createElement('meta');
            themeColor.name = 'theme-color';
            themeColor.content = '#000000';
            document.head.appendChild(themeColor);
        }
    }
}

// 初始化缩放
initDeviceAdaptation();

// 添加快捷键支持缩放
document.addEventListener('keydown', (e) => {
    // 电脑端快捷键
    if (!isMobile) {
        // Ctrl + 加号
        if ((e.ctrlKey || e.metaKey) && (e.key === '+' || e.key === '=')) {
            e.preventDefault();
            applyScale(currentScale + 0.1);
        }
        // Ctrl + 减号
        if ((e.ctrlKey || e.metaKey) && e.key === '-') {
            e.preventDefault();
            applyScale(currentScale - 0.1);
        }
        // Ctrl + 0 重置
        if ((e.ctrlKey || e.metaKey) && e.key === '0') {
            e.preventDefault();
            const resetScale = isMobile ? 0.6 : 0.5;
            applyScale(resetScale);
        }
    }
    
    // 移动端物理按键支持（音量键）- 安卓特殊处理
    if (isMobile && (e.key === 'VolumeUp' || e.key === 'VolumeDown')) {
        e.preventDefault();
        if (e.key === 'VolumeUp') {
            applyScale(Math.min(currentScale + 0.1, maxScale));
        } else {
            applyScale(Math.max(currentScale - 0.1, minScale));
        }
        return false;
    }
});

// 触摸滑动处理
let touchStartX = 0;
let touchStartY = 0;
let touchStartTime = 0;
let isScrolling = false;
let isSwiping = false;
let isPinching = false;
let initialPinchDistance = 0;
let initialPinchScale = 1;
const swipeThreshold = 30;
const tapThreshold = 5;
const longPressThreshold = 500;
let touchMoveTimeout = null;
let longPressTimer = null;

// 防抖函数
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// 节流函数
function throttle(func, limit) {
    let inThrottle;
    return function executedFunction(...args) {
        if (!inThrottle) {
            func(...args);
            inThrottle = true;
            setTimeout(() => inThrottle = false, limit);
        }
    };
}

// 更新窗口滚动位置
const updateScrollPosition = debounce(() => {
    if (!isSwiping && !isPinching) {
        window.scrollTo({
            left: window.scrollX,
            top: window.scrollY,
            behavior: 'auto'
        });
    }
}, 16);

// 计算两点间距离
function getTouchDistance(touch1, touch2) {
    const dx = touch2.clientX - touch1.clientX;
    const dy = touch2.clientY - touch1.clientY;
    return Math.sqrt(dx * dx + dy * dy);
}

// 处理触摸开始
function handleTouchStart(e) {
    if (e.touches.length === 1) {
        touchStartX = e.touches[0].clientX;
        touchStartY = e.touches[0].clientY;
        touchStartTime = Date.now();
        isScrolling = false;
        isSwiping = false;
        
        // 长按处理
        longPressTimer = setTimeout(() => {
            if (isMobile) {
                showContextMenu(e.touches[0].clientX, e.touches[0].clientY);
            }
        }, longPressThreshold);
    }
    
    // 多点触控（捏合缩放）
    if (e.touches.length === 2) {
        isPinching = true;
        initialPinchDistance = getTouchDistance(e.touches[0], e.touches[1]);
        initialPinchScale = currentScale;
        e.preventDefault();
        
        // 清除长按定时器
        if (longPressTimer) {
            clearTimeout(longPressTimer);
            longPressTimer = null;
        }
    }
    
    if (touchMoveTimeout) {
        clearTimeout(touchMoveTimeout);
    }
}

// 处理触摸移动
function handleTouchMove(e) {
    if (e.touches.length === 2 && isPinching) {
        // 捏合缩放
        e.preventDefault();
        const currentDistance = getTouchDistance(e.touches[0], e.touches[1]);
        const scaleChange = currentDistance / initialPinchDistance;
        const newScale = initialPinchScale * scaleChange;
        
        // 限制缩放范围
        const clampedScale = Math.max(minScale, Math.min(maxScale, newScale));
        if (Math.abs(clampedScale - currentScale) > 0.01) {
            applyScale(clampedScale);
        }
        return;
    }
    
    if (e.touches.length !== 1) return;
    
    const touchX = e.touches[0].clientX;
    const touchY = e.touches[0].clientY;
    
    const deltaX = touchX - touchStartX;
    const deltaY = touchY - touchStartY;
    
    // 清除长按定时器
    if (longPressTimer) {
        clearTimeout(longPressTimer);
        longPressTimer = null;
    }
    
    // 判断是水平滑动还是垂直滑动
    if (!isScrolling) {
        isScrolling = Math.abs(deltaX) < Math.abs(deltaY);
    }
    
    // 如果是水平滑动，阻止默认行为
    if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > swipeThreshold) {
        if (!isSwiping) {
            e.preventDefault();
            isSwiping = true;
        }
    }
    
    // 防抖更新滚动位置
    touchMoveTimeout = setTimeout(() => {
        updateScrollPosition();
    }, 0);
}

// 处理触摸结束
function handleTouchEnd(e) {
    const touchEndTime = Date.now();
    const deltaTime = touchEndTime - touchStartTime;
    
    // 清除长按定时器
    if (longPressTimer) {
        clearTimeout(longPressTimer);
        longPressTimer = null;
    }
    
    // 处理双击缩放
    if (e.touches.length === 0 && e.changedTouches.length === 1) {
        if (deltaTime < 300) { // 点击
            const touch = e.changedTouches[0];
            const deltaX = Math.abs(touch.clientX - touchStartX);
            const deltaY = Math.abs(touch.clientY - touchStartY);
            
            if (deltaX < tapThreshold && deltaY < tapThreshold) {
                // 双击检测
                if (touchEndTime - (window.lastTapTime || 0) < 300) {
                    e.preventDefault();
                    if (currentScale === 1) {
                        applyScale(2);
                    } else {
                        applyScale(1);
                    }
                }
                window.lastTapTime = touchEndTime;
            }
        }
    }
    
    isScrolling = false;
    isSwiping = false;
    isPinching = false;
    
    if (touchMoveTimeout) {
        clearTimeout(touchMoveTimeout);
    }
}

// 添加触摸事件监听
if (isTouchDevice) {
    document.addEventListener('touchstart', handleTouchStart, { passive: false });
    document.addEventListener('touchmove', handleTouchMove, { passive: false });
    document.addEventListener('touchend', handleTouchEnd, { passive: true });
    document.addEventListener('touchcancel', handleTouchEnd, { passive: true });
}

// 鼠标滚轮处理
let isWheeling = false;
let wheelTimeout = null;
let wheelScaleStartTime = 0;

function handleWheel(e) {
    // 电脑端：Ctrl+滚轮缩放
    if ((e.ctrlKey || e.metaKey) && !isMobile) {
        e.preventDefault();
        
        const now = Date.now();
        if (now - wheelScaleStartTime > 100) { // 限制缩放频率
            wheelScaleStartTime = now;
            
            if (e.deltaY < 0) {
                // 滚轮向上，放大
                applyScale(currentScale + 0.1);
            } else if (e.deltaY > 0) {
                // 滚轮向下，缩小
                applyScale(currentScale - 0.1);
            }
        }
        return;
    }
    
    // 普通滚动
    if (!isWheeling) {
        isWheeling = true;
        
        if (wheelTimeout) {
            clearTimeout(wheelTimeout);
        }
        wheelTimeout = setTimeout(() => {
            updateScrollPosition();
            isWheeling = false;
        }, 50);
    }
}

document.addEventListener('wheel', handleWheel, { passive: false });

// 链接点击处理
const hookClick = (e) => {
    const origin = e.target.closest('a');
    const isBaseTargetBlank = document.querySelector('head base[target="_blank"]');
    
    if (origin && origin.href) {
        // 移动端特殊处理
        if (isMobile) {
            // 防止在新标签页中打开
            if (origin.target === '_blank' || isBaseTargetBlank) {
                e.preventDefault();
                e.stopPropagation();
                
                // 显示加载提示
                showMobileAlert('正在跳转...');
                
                // 安卓设备使用setTimeout避免弹出阻止
                setTimeout(() => {
                    try {
                        window.location.href = origin.href;
                    } catch (err) {
                        console.error('跳转失败:', err);
                    }
                }, 100);
                return false;
            }
        } else {
            // 电脑端处理
            if ((origin.target === '_blank') || (origin.href && isBaseTargetBlank)) {
                e.preventDefault();
                try {
                    window.location.href = origin.href;
                } catch (err) {
                    console.error('跳转失败:', err);
                }
            }
        }
    }
    
    return true;
}

// 移动端提示
function showMobileAlert(message) {
    const alert = document.createElement('div');
    alert.textContent = message;
    alert.style.cssText = `
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        background: rgba(0,0,0,0.85);
        color: white;
        padding: 15px 25px;
        border-radius: 10px;
        z-index: 1000000;
        font-size: 16px;
        text-align: center;
        max-width: 80%;
        word-break: break-word;
        animation: fadeInOut 2s ease-in-out;
        backdrop-filter: blur(20px);
        -webkit-backdrop-filter: blur(20px);
        border: 1px solid rgba(255,255,255,0.1);
    `;
    
    const style = document.createElement('style');
    style.textContent = `
        @keyframes fadeInOut {
            0% { opacity: 0; transform: translate(-50%, -50%) scale(0.8); }
            15% { opacity: 1; transform: translate(-50%, -50%) scale(1); }
            85% { opacity: 1; transform: translate(-50%, -50%) scale(1); }
            100% { opacity: 0; transform: translate(-50%, -50%) scale(0.8); }
        }
    `;
    document.head.appendChild(style);
    
    document.body.appendChild(alert);
    
    setTimeout(() => {
        if (alert.parentNode) {
            alert.parentNode.removeChild(alert);
        }
        if (style.parentNode) {
            style.parentNode.removeChild(style);
        }
    }, 2000);
}

// 移动端上下文菜单
function showContextMenu(x, y) {
    const existingMenu = document.getElementById('mobileContextMenu');
    if (existingMenu) {
        document.body.removeChild(existingMenu);
    }
    
    const menu = document.createElement('div');
    menu.id = 'mobileContextMenu';
    menu.style.cssText = `
        position: fixed;
        left: ${Math.min(x, window.innerWidth - 220)}px;
        top: ${Math.min(y, window.innerHeight - 200)}px;
        background: rgba(255,255,255,0.95);
        border: 1px solid rgba(0,0,0,0.1);
        border-radius: 12px;
        box-shadow: 0 4px 20px rgba(0,0,0,0.2);
        z-index: 1000000;
        min-width: 200px;
        backdrop-filter: blur(20px);
        -webkit-backdrop-filter: blur(20px);
        overflow: hidden;
    `;
    
    const scalePercent = Math.round(currentScale * 100);
    menu.innerHTML = `
        <div style="padding: 12px 15px; border-bottom: 1px solid rgba(0,0,0,0.1); font-weight: bold; color: #333; font-size: 16px;">页面控制</div>
        <div style="padding: 15px; border-bottom: 1px solid rgba(0,0,0,0.1);">
            <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 10px;">
                <span style="color: #666; font-size: 14px;">缩放比例</span>
                <span id="mobileScaleValue" style="font-weight: bold; color: #007bff; font-size: 16px;">${scalePercent}%</span>
            </div>
            <div style="display: flex; align-items: center; gap: 10px;">
                <button onclick="applyScale(currentScale - 0.1)" style="
                    flex: 1;
                    padding: 10px;
                    background: #007bff;
                    color: white;
                    border: none;
                    border-radius: 6px;
                    font-size: 18px;
                    cursor: pointer;
                    transition: all 0.2s;
                " onmousedown="this.style.opacity='0.7'" onmouseup="this.style.opacity='1'" ontouchend="this.style.opacity='1'">缩小</button>
                <button onclick="applyScale(currentScale + 0.1)" style="
                    flex: 1;
                    padding: 10px;
                    background: #007bff;
                    color: white;
                    border: none;
                    border-radius: 6px;
                    font-size: 18px;
                    cursor: pointer;
                    transition: all 0.2s;
                " onmousedown="this.style.opacity='0.7'" onmouseup="this.style.opacity='1'" ontouchend="this.style.opacity='1'">放大</button>
            </div>
        </div>
        <div style="padding: 10px;">
            <button onclick="toggleFullscreen()" id="mobileFullscreenBtn" style="
                width: 100%;
                padding: 12px;
                background: ${isFullscreen ? '#28a745' : '#007bff'};
                color: white;
                border: none;
                border-radius: 6px;
                margin-bottom: 8px;
                font-size: 14px;
                cursor: pointer;
                transition: all 0.2s;
            " onmousedown="this.style.opacity='0.7'" onmouseup="this.style.opacity='1'" ontouchend="this.style.opacity='1'">${isFullscreen ? '退出全屏' : '进入全屏'}</button>
            <button onclick="toggleAutoRotate()" id="mobileRotateBtn" style="
                width: 100%;
                padding: 12px;
                background: ${isAutoRotateEnabled ? '#28a745' : '#6c757d'};
                color: white;
                border: none;
                border-radius: 6px;
                margin-bottom: 8px;
                font-size: 14px;
                cursor: pointer;
                transition: all 0.2s;
            " onmousedown="this.style.opacity='0.7'" onmouseup="this.style.opacity='1'" ontouchend="this.style.opacity='1'">${isAutoRotateEnabled ? '锁定竖屏' : '自动旋转'}</button>
            <button onclick="applyScale(1)" style="
                width: 100%;
                padding: 12px;
                background: #28a745;
                color: white;
                border: none;
                border-radius: 6px;
                margin-bottom: 8px;
                font-size: 14px;
                cursor: pointer;
                transition: all 0.2s;
            " onmousedown="this.style.opacity='0.7'" onmouseup="this.style.opacity='1'" ontouchend="this.style.opacity='1'">重置到100%</button>
            <button onclick="document.body.removeChild(this.parentNode.parentNode)" style="
                width: 100%;
                padding: 12px;
                background: #dc3545;
                color: white;
                border: none;
                border-radius: 6px;
                font-size: 14px;
                cursor: pointer;
                transition: all 0.2s;
            " onmousedown="this.style.opacity='0.7'" onmouseup="this.style.opacity='1'" ontouchend="this.style.opacity='1'">关闭菜单</button>
        </div>
    `;
    
    document.body.appendChild(menu);
    
    // 更新按钮状态
    updateFullscreenUI();
    
    // 点击其他地方关闭菜单
    setTimeout(() => {
        const closeMenu = (e) => {
            if (!menu.contains(e.target)) {
                if (menu.parentNode) {
                    menu.parentNode.removeChild(menu);
                }
                document.removeEventListener('click', closeMenu);
                document.removeEventListener('touchstart', closeMenu);
            }
        };
        
        document.addEventListener('click', closeMenu);
        document.addEventListener('touchstart', closeMenu);
    }, 100);
}

// 重写window.open
const originalWindowOpen = window.open;
window.open = function (url, target, features) {
    console.log('拦截window.open:', url, target, features);
    
    if (isMobile) {
        showMobileAlert('正在打开链接...');
        setTimeout(() => {
            try {
                window.location.href = url;
            } catch (err) {
                console.error('打开链接失败:', err);
            }
        }, 300);
        return null;
    } else {
        return originalWindowOpen.call(window, url, target, features);
    }
};

// 添加点击事件监听
document.addEventListener('click', hookClick, { capture: true });

// 页面加载完成后初始化
window.addEventListener('load', () => {
    // 确保页面可以正常滚动
    setTimeout(() => {
        document.body.style.overflow = 'auto';
        document.documentElement.style.overflow = 'auto';
        
        // 安卓设备特殊处理
        if (isAndroid) {
            document.body.style.webkitOverflowScrolling = 'touch';
            document.documentElement.style.webkitOverflowScrolling = 'touch';
            
            // 防止安卓键盘弹出时页面错乱
            window.addEventListener('resize', function() {
                setTimeout(() => {
                    const viewportHeight = window.innerHeight;
                    document.body.style.minHeight = `${viewportHeight / currentScale}px`;
                    document.documentElement.style.minHeight = `${viewportHeight / currentScale}px`;
                }, 100);
            });
        }
        
        updateScrollPosition();
    }, 100);
    
    // 监听窗口大小变化
    let resizeTimer;
    window.addEventListener('resize', () => {
        clearTimeout(resizeTimer);
        resizeTimer = setTimeout(() => {
            isPortrait = window.innerHeight > window.innerWidth;
            updateScrollPosition();
            
            // 移动端调整
            if (isMobile) {
                const viewportHeight = window.innerHeight;
                document.body.style.minHeight = `${viewportHeight / currentScale}px`;
                document.documentElement.style.minHeight = `${viewportHeight / currentScale}px`;
                
                // 安卓设备特殊处理
                if (isAndroid) {
                    // 修复键盘弹出时的布局问题
                    if (document.activeElement && 
                       (document.activeElement.tagName === 'INPUT' || 
                        document.activeElement.tagName === 'TEXTAREA')) {
                        document.body.style.position = 'fixed';
                        document.body.style.width = '100%';
                    } else {
                        document.body.style.position = 'relative';
                    }
                }
            }
        }, 250);
    });
    
    // 输入框焦点处理（安卓键盘问题）
    if (isAndroid) {
        const inputs = document.querySelectorAll('input, textarea');
        inputs.forEach(input => {
            input.addEventListener('focus', function() {
                setTimeout(() => {
                    document.body.style.position = 'fixed';
                    document.body.style.width = '100%';
                }, 100);
            });
            
            input.addEventListener('blur', function() {
                setTimeout(() => {
                    document.body.style.position = 'relative';
                }, 100);
            });
        });
    }
});

// 防止重复滚动
let lastScrollTime = 0;
const scrollInterval = 100; // 100ms内不重复滚动

window.addEventListener('scroll', (e) => {
    const now = Date.now();
    if (now - lastScrollTime < scrollInterval) {
        e.preventDefault();
        e.stopPropagation();
        return false;
    }
    lastScrollTime = now;
}, { passive: false });

// 添加缩放控制按钮
function addScaleControls() {
    // 移除已有的控制面板
    const existingControls = document.getElementById('scaleControls');
    if (existingControls) {
        existingControls.remove();
    }
    
    const controls = document.createElement('div');
    controls.id = 'scaleControls';
    
    // 根据设备类型设置样式
    if (isMobile) {
        controls.style.cssText = `
            position: fixed;
            bottom: 20px;
            right: 20px;
            background: rgba(0,0,0,0.85);
            color: white;
            padding: 12px 15px;
            border-radius: 30px;
            z-index: 999999;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            font-size: 14px;
            display: flex;
            align-items: center;
            gap: 10px;
            backdrop-filter: blur(20px);
            -webkit-backdrop-filter: blur(20px);
            box-shadow: 0 4px 20px rgba(0,0,0,0.3);
            border: 1px solid rgba(255,255,255,0.1);
            touch-action: none;
        `;
        
        controls.innerHTML = `
            <button onclick="applyScale(currentScale - 0.1)" style="
                width: 40px;
                height: 40px;
                border-radius: 50%;
                background: #007bff;
                color: white;
                border: none;
                font-size: 20px;
                display: flex;
                align-items: center;
                justify-content: center;
                cursor: pointer;
                touch-action: manipulation;
                transition: all 0.2s;
                -webkit-tap-highlight-color: transparent;
                user-select: none;
            " ontouchstart="this.style.transform='scale(0.95)'; this.style.opacity='0.8'" ontouchend="this.style.transform='scale(1)'; this.style.opacity='1'" onmousedown="this.style.transform='scale(0.95)'; this.style.opacity='0.8'" onmouseup="this.style.transform='scale(1)'; this.style.opacity='1'" onmouseleave="this.style.transform='scale(1)'; this.style.opacity='1'">-</button>
            <span id="scaleValue" style="min-width: 60px; text-align: center; font-weight: bold; font-size: 16px; user-select: none;">${Math.round(currentScale * 100)}%</span>
            <button onclick="applyScale(currentScale + 0.1)" style="
                width: 40px;
                height: 40px;
                border-radius: 50%;
                background: #007bff;
                color: white;
                border: none;
                font-size: 20px;
                display: flex;
                align-items: center;
                justify-content: center;
                cursor: pointer;
                touch-action: manipulation;
                transition: all 0.2s;
                -webkit-tap-highlight-color: transparent;
                user-select: none;
            " ontouchstart="this.style.transform='scale(0.95)'; this.style.opacity='0.8'" ontouchend="this.style.transform='scale(1)'; this.style.opacity='1'" onmousedown="this.style.transform='scale(0.95)'; this.style.opacity='0.8'" onmouseup="this.style.transform='scale(1)'; this.style.opacity='1'" onmouseleave="this.style.transform='scale(1)'; this.style.opacity='1'">+</button>
            <div style="display: flex; gap: 8px; margin-left: 5px; border-left: 1px solid rgba(255,255,255,0.2); padding-left: 8px;">
                <button onclick="toggleFullscreen()" id="fullscreenBtn" style="
                    width: 40px;
                    height: 40px;
                    border-radius: 50%;
                    background: ${isFullscreen ? '#28a745' : '#007bff'};
                    color: white;
                    border: none;
                    font-size: 12px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    cursor: pointer;
                    touch-action: manipulation;
                    transition: all 0.2s;
                    -webkit-tap-highlight-color: transparent;
                    user-select: none;
                " ontouchstart="this.style.transform='scale(0.95)'; this.style.opacity='0.8'" ontouchend="this.style.transform='scale(1)'; this.style.opacity='1'" onmousedown="this.style.transform='scale(0.95)'; this.style.opacity='0.8'" onmouseup="this.style.transform='scale(1)'; this.style.opacity='1'" onmouseleave="this.style.transform='scale(1)'; this.style.opacity='1'">${isFullscreen ? '退出' : '全屏'}</button>
                <button onclick="toggleAutoRotate()" id="rotateBtn" style="
                    width: 40px;
                    height: 40px;
                    border-radius: 50%;
                    background: ${isAutoRotateEnabled ? '#28a745' : '#6c757d'};
                    color: white;
                    border: none;
                    font-size: 12px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    cursor: pointer;
                    touch-action: manipulation;
                    transition: all 0.2s;
                    -webkit-tap-highlight-color: transparent;
                    user-select: none;
                " ontouchstart="this.style.transform='scale(0.95)'; this.style.opacity='0.8'" ontouchend="this.style.transform='scale(1)'; this.style.opacity='1'" onmousedown="this.style.transform='scale(0.95)'; this.style.opacity='0.8'" onmouseup="this.style.transform='scale(1)'; this.style.opacity='1'" onmouseleave="this.style.transform='scale(1)'; this.style.opacity='1'">旋转</button>
            </div>
        `;
    } else {
        controls.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: rgba(0,0,0,0.85);
            color: white;
            padding: 15px;
            border-radius: 10px;
            z-index: 999999;
            font-family: Arial, sans-serif;
            font-size: 14px;
            backdrop-filter: blur(20px);
            box-shadow: 0 4px 20px rgba(0,0,0,0.3);
            border: 1px solid rgba(255,255,255,0.1);
            user-select: none;
        `;
        
        controls.innerHTML = `
            <div style="margin-bottom: 10px; font-weight: bold; display: flex; justify-content: space-between; align-items: center;">
                <span>页面控制</span>
                <span id="scaleValue" style="font-size: 16px; font-weight: bold;">${Math.round(currentScale * 100)}%</span>
            </div>
            <div style="display: flex; gap: 8px; margin-bottom: 10px;">
                <button onclick="applyScale(currentScale - 0.1)" style="
                    flex: 1;
                    padding: 8px 12px;
                    background: #007bff;
                    color: white;
                    border: none;
                    border-radius: 4px;
                    cursor: pointer;
                    font-size: 16px;
                    transition: all 0.2s;
                " onmousedown="this.style.transform='scale(0.95)'" onmouseup="this.style.transform='scale(1)'">-</button>
                <button onclick="applyScale(currentScale + 0.1)" style="
                    flex: 1;
                    padding: 8px 12px;
                    background: #007bff;
                    color: white;
                    border: none;
                    border-radius: 4px;
                    cursor: pointer;
                    font-size: 16px;
                    transition: all 0.2s;
                " onmousedown="this.style.transform='scale(0.95)'" onmouseup="this.style.transform='scale(1)'">+</button>
            </div>
            <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 5px;">
                <button onclick="applyScale(0.5)" style="
                    padding: 6px;
                    background: #28a745;
                    color: white;
                    border: none;
                    border-radius: 3px;
                    cursor: pointer;
                    font-size: 12px;
                    transition: all 0.2s;
                " onmousedown="this.style.transform='scale(0.95)'" onmouseup="this.style.transform='scale(1)'">50%</button>
                <button onclick="applyScale(1)" style="
                    padding: 6px;
                    background: #28a745;
                    color: white;
                    border: none;
                    border-radius: 3px;
                    cursor: pointer;
                    font-size: 12px;
                    transition: all 0.2s;
                " onmousedown="this.style.transform='scale(0.95)'" onmouseup="this.style.transform='scale(1)'">100%</button>
                <button onclick="applyScale(1.5)" style="
                    padding: 6px;
                    background: #28a745;
                    color: white;
                    border: none;
                    border-radius: 3px;
                    cursor: pointer;
                    font-size: 12px;
                    transition: all 0.2s;
                " onmousedown="this.style.transform='scale(0.95)'" onmouseup="this.style.transform='scale(1)'">150%</button>
            </div>
            ${isMobile ? `
            <div style="margin-top: 10px; padding-top: 10px; border-top: 1px solid rgba(255,255,255,0.1); display: flex; gap: 5px;">
                <button onclick="toggleFullscreen()" id="fullscreenBtn" style="
                    flex: 1;
                    padding: 6px;
                    background: ${isFullscreen ? '#28a745' : '#007bff'};
                    color: white;
                    border: none;
                    border-radius: 3px;
                    cursor: pointer;
                    font-size: 12px;
                ">${isFullscreen ? '退出全屏' : '全屏'}</button>
                <button onclick="toggleAutoRotate()" id="rotateBtn" style="
                    flex: 1;
                    padding: 6px;
                    background: ${isAutoRotateEnabled ? '#28a745' : '#6c757d'};
                    color: white;
                    border: none;
                    border-radius: 3px;
                    cursor: pointer;
                    font-size: 12px;
                ">${isAutoRotateEnabled ? '锁定竖屏' : '自动旋转'}</button>
            </div>
            ` : ''}
            <div style="margin-top: 10px; font-size: 12px; color: #aaa; text-align: center;">
                快捷键: Ctrl+滚轮
            </div>
        `;
    }
    
    document.body.appendChild(controls);
    
    // 更新按钮状态
    updateFullscreenUI();
}

// 更新缩放显示
function updateScaleDisplay() {
    const scaleValue = document.getElementById('scaleValue');
    if (scaleValue) {
        scaleValue.textContent = Math.round(currentScale * 100) + '%';
    }
    
    const mobileScaleValue = document.getElementById('mobileScaleValue');
    if (mobileScaleValue) {
        mobileScaleValue.textContent = Math.round(currentScale * 100) + '%';
    }
}

// 自动添加控制按钮
setTimeout(() => {
    addScaleControls();
    
    // 监听缩放变化，更新显示
    const originalApplyScale = applyScale;
    applyScale = function(scale) {
        originalApplyScale.call(this, scale);
        updateScaleDisplay();
    };
}, 1000);

// 添加设备方向变化监听
if (isMobile) {
    // 安卓设备需要监听resize来判断方向变化
    let lastWidth = window.innerWidth;
    let lastHeight = window.innerHeight;
    
    window.addEventListener('resize', () => {
        const newWidth = window.innerWidth;
        const newHeight = window.innerHeight;
        
        if (Math.abs(newWidth - lastWidth) > 50 || Math.abs(newHeight - lastHeight) > 50) {
            setTimeout(() => {
                isPortrait = window.innerHeight > window.innerWidth;
                updateScrollPosition();
                document.body.style.minHeight = `${window.innerHeight / currentScale}px`;
                document.documentElement.style.minHeight = `${window.innerHeight / currentScale}px`;
                
                // 方向变化时调整缩放
                const optimalScale = calculateOptimalScale();
                if (Math.abs(optimalScale - currentScale) > 0.1) {
                    applyScale(optimalScale);
                }
            }, 300);
        }
        
        lastWidth = newWidth;
        lastHeight = newHeight;
    });
}

// 禁止文本选择（可选，防止误操作）
if (isMobile) {
    document.addEventListener('selectstart', (e) => {
        e.preventDefault();
    }, { passive: false });
}

// 控制面板拖动功能（电脑端）
if (!isMobile) {
    let isDragging = false;
    let dragOffsetX = 0;
    let dragOffsetY = 0;
    
    document.addEventListener('mousedown', (e) => {
        const controls = document.getElementById('scaleControls');
        if (controls && (e.target === controls || controls.contains(e.target))) {
            if (e.target.tagName !== 'BUTTON') {
                isDragging = true;
                const rect = controls.getBoundingClientRect();
                dragOffsetX = e.clientX - rect.left;
                dragOffsetY = e.clientY - rect.top;
                controls.style.cursor = 'move';
                e.preventDefault();
            }
        }
    });
    
    document.addEventListener('mousemove', (e) => {
        if (isDragging) {
            const controls = document.getElementById('scaleControls');
            if (controls) {
                controls.style.left = (e.clientX - dragOffsetX) + 'px';
                controls.style.top = (e.clientY - dragOffsetY) + 'px';
                controls.style.right = 'auto';
                controls.style.bottom = 'auto';
            }
        }
    });
    
    document.addEventListener('mouseup', () => {
        if (isDragging) {
            isDragging = false;
            const controls = document.getElementById('scaleControls');
            if (controls) {
                controls.style.cursor = '';
            }
        }
    });
}

// 安卓后退按钮处理
if (isAndroid) {
    let backButtonPressed = false;
    
    // 监听页面可见性变化
    document.addEventListener('visibilitychange', function() {
        if (document.hidden) {
            // 页面隐藏时保存状态
            localStorage.setItem('pageScale', currentScale);
        }
    });
    
    // 恢复缩放状态
    window.addEventListener('pageshow', function() {
        const savedScale = localStorage.getItem('pageScale');
        if (savedScale) {
            applyScale(parseFloat(savedScale));
        }
    });
}

// 确保代码在DOM加载后执行
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initDeviceAdaptation);
} else {
    initDeviceAdaptation();
}

// 导出函数供全局使用
window.applyScale = applyScale;
window.toggleFullscreen = toggleFullscreen;
window.toggleAutoRotate = toggleAutoRotate;