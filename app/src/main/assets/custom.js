window.addEventListener("DOMContentLoaded",()=>{const t=document.createElement("script");t.src="https://www.googletagmanager.com/gtag/js?id=G-W5GKHM0893",t.async=!0,document.head.appendChild(t);const n=document.createElement("script");n.textContent="window.dataLayer = window.dataLayer || [];function gtag(){dataLayer.push(arguments);}gtag('js', new Date());gtag('config', 'G-W5GKHM0893');",document.body.appendChild(n)});// 页面缩放功能
let currentScale = 1;
const minScale = 0.3;
const maxScale = 3;
const defaultScale = 0.5; // 默认缩放到50%

// 设备检测
const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
let isPortrait = window.innerHeight > window.innerWidth;

// 应用缩放
function applyScale(scale) {
    currentScale = Math.max(minScale, Math.min(maxScale, scale));
    
    const viewport = document.querySelector('meta[name="viewport"]');
    if (viewport) {
        // 移动端使用不同的viewport设置
        if (isMobile) {
            viewport.content = `width=device-width, initial-scale=${currentScale}, maximum-scale=${maxScale}, user-scalable=yes, viewport-fit=cover`;
        } else {
            viewport.content = `width=device-width, initial-scale=${currentScale}, maximum-scale=${maxScale}, user-scalable=yes`;
        }
    } else {
        // 如果没有viewport标签，创建一个
        const meta = document.createElement('meta');
        meta.name = 'viewport';
        meta.content = `width=device-width, initial-scale=${currentScale}, maximum-scale=${maxScale}, user-scalable=yes`;
        document.head.appendChild(meta);
    }
    
    // 更新页面元素的变换
    document.body.style.transform = `scale(${currentScale})`;
    document.body.style.transformOrigin = 'top left';
    document.body.style.width = `${100 / currentScale}%`;
    document.body.style.height = `${100 / currentScale}%`;
    document.body.style.overflow = 'visible';
    document.documentElement.style.overflow = 'visible';
    
    // 移动端特殊处理
    if (isMobile) {
        document.body.style.minHeight = `${window.innerHeight / currentScale}px`;
        document.documentElement.style.minHeight = `${window.innerHeight / currentScale}px`;
    }
    
    console.log('页面缩放至:', Math.round(currentScale * 100) + '%', '设备:', isMobile ? '移动端' : '电脑端');
    
    // 更新控制面板显示
    updateScaleDisplay();
    
    // 触发resize事件
    setTimeout(() => {
        window.dispatchEvent(new Event('resize'));
    }, 100);
}

// 初始化设备适配
function initDeviceAdaptation() {
    // 设置初始缩放比例
    let initialScale = defaultScale;
    
    // 根据设备类型调整默认缩放
    if (isMobile) {
        if (window.innerWidth < 768) { // 手机
            initialScale = 0.6;
        } else { // 平板
            initialScale = 0.7;
        }
        
        // 处理移动端视口
        handleMobileViewport();
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

// 处理移动端视口
function handleMobileViewport() {
    // 防止双击放大
    let lastTouchEnd = 0;
    document.addEventListener('touchend', function(event) {
        const now = Date.now();
        if (now - lastTouchEnd <= 300) {
            event.preventDefault();
        }
        lastTouchEnd = now;
    }, false);
    
    // 防止手势缩放
    document.addEventListener('gesturestart', function(event) {
        event.preventDefault();
    });
    
    // 适配全面屏
    const metaViewport = document.querySelector('meta[name="viewport"]');
    if (metaViewport) {
        metaViewport.content = metaViewport.content + ', viewport-fit=cover';
    }
    
    // 设置安全区域
    document.documentElement.style.setProperty('--safe-area-inset-top', 'env(safe-area-inset-top)');
    document.documentElement.style.setProperty('--safe-area-inset-bottom', 'env(safe-area-inset-bottom)');
    document.documentElement.style.setProperty('--safe-area-inset-left', 'env(safe-area-inset-left)');
    document.documentElement.style.setProperty('--safe-area-inset-right', 'env(safe-area-inset-right)');
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
    
    // 移动端物理按键支持（音量键）
    if (isMobile && (e.key === 'VolumeUp' || e.key === 'VolumeDown')) {
        e.preventDefault();
        if (e.key === 'VolumeUp') {
            applyScale(currentScale + 0.1);
        } else {
            applyScale(currentScale - 0.1);
        }
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
    touchStartX = e.touches[0].clientX;
    touchStartY = e.touches[0].clientY;
    touchStartTime = Date.now();
    isScrolling = false;
    isSwiping = false;
    
    // 多点触控（捏合缩放）
    if (e.touches.length === 2) {
        isPinching = true;
        initialPinchDistance = getTouchDistance(e.touches[0], e.touches[1]);
        initialPinchScale = currentScale;
        e.preventDefault();
    }
    
    // 长按处理
    longPressTimer = setTimeout(() => {
        if (isMobile) {
            showContextMenu(e.touches[0].clientX, e.touches[0].clientY);
        }
    }, longPressThreshold);
    
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
            // 阻止新窗口打开
            if (origin.target === '_blank' || isBaseTargetBlank) {
                e.preventDefault();
                e.stopPropagation();
                
                // 显示加载提示
                showMobileAlert('正在跳转...');
                
                setTimeout(() => {
                    location.href = origin.href;
                }, 100);
                return false;
            }
        } else {
            // 电脑端处理
            if ((origin.target === '_blank') || (origin.href && isBaseTargetBlank)) {
                e.preventDefault();
                location.href = origin.href;
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
        background: rgba(0,0,0,0.8);
        color: white;
        padding: 15px 25px;
        border-radius: 10px;
        z-index: 1000000;
        font-size: 16px;
        text-align: center;
        max-width: 80%;
        word-break: break-word;
        animation: fadeInOut 2s ease-in-out;
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
        left: ${x}px;
        top: ${y}px;
        background: white;
        border: 1px solid #ccc;
        border-radius: 5px;
        box-shadow: 0 2px 10px rgba(0,0,0,0.2);
        z-index: 1000000;
        min-width: 150px;
        transform: translate(-50%, 0);
    `;
    
    menu.innerHTML = `
        <div style="padding: 10px; border-bottom: 1px solid #eee; font-weight: bold;">缩放控制</div>
        <div style="padding: 10px; display: flex; align-items: center; justify-content: space-between;">
            <button onclick="applyScale(currentScale - 0.1)" style="padding: 5px 10px; background: #007bff; color: white; border: none; border-radius: 3px;">缩小</button>
            <span id="mobileScaleValue" style="margin: 0 10px;">${Math.round(currentScale * 100)}%</span>
            <button onclick="applyScale(currentScale + 0.1)" style="padding: 5px 10px; background: #007bff; color: white; border: none; border-radius: 3px;">放大</button>
        </div>
        <div style="padding: 10px; border-top: 1px solid #eee;">
            <button onclick="applyScale(1)" style="width: 100%; padding: 8px; background: #28a745; color: white; border: none; border-radius: 3px; margin-bottom: 5px;">重置到100%</button>
            <button onclick="document.body.removeChild(this.parentNode.parentNode)" style="width: 100%; padding: 8px; background: #6c757d; color: white; border: none; border-radius: 3px;">关闭</button>
        </div>
    `;
    
    document.body.appendChild(menu);
    
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
window.open = function (url, target, features) {
    console.log('open', url, target, features);
    
    if (isMobile) {
        showMobileAlert('正在打开链接...');
        setTimeout(() => {
            location.href = url;
        }, 300);
    } else {
        location.href = url;
    }
    
    return null;
}

// 添加点击事件监听
document.addEventListener('click', hookClick, { capture: true });

// 页面加载完成后初始化
window.addEventListener('load', () => {
    // 确保页面可以正常滚动
    setTimeout(() => {
        document.body.style.overflow = 'auto';
        document.documentElement.style.overflow = 'auto';
        updateScrollPosition();
    }, 100);
    
    // 监听窗口大小变化
    let resizeTimer;
    window.addEventListener('resize', () => {
        clearTimeout(resizeTimer);
        resizeTimer = setTimeout(() => {
            isPortrait = window.innerHeight > window.innerWidth;
            updateScrollPosition();
            
            // 如果是移动端，调整缩放
            if (isMobile) {
                document.body.style.minHeight = `${window.innerHeight / currentScale}px`;
                document.documentElement.style.minHeight = `${window.innerHeight / currentScale}px`;
            }
        }, 250);
    });
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
            background: rgba(0,0,0,0.8);
            color: white;
            padding: 12px;
            border-radius: 25px;
            z-index: 999999;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            font-size: 14px;
            display: flex;
            align-items: center;
            gap: 10px;
            backdrop-filter: blur(10px);
            -webkit-backdrop-filter: blur(10px);
            box-shadow: 0 4px 12px rgba(0,0,0,0.3);
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
            ">-</button>
            <span id="scaleValue" style="min-width: 60px; text-align: center; font-weight: bold;">${Math.round(currentScale * 100)}%</span>
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
            ">+</button>
            <button onclick="showMobileMenu()" style="
                width: 40px;
                height: 40px;
                border-radius: 50%;
                background: #6c757d;
                color: white;
                border: none;
                font-size: 16px;
                display: flex;
                align-items: center;
                justify-content: center;
                cursor: pointer;
                touch-action: manipulation;
                margin-left: 5px;
            ">⋯</button>
        `;
    } else {
        controls.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: rgba(0,0,0,0.8);
            color: white;
            padding: 15px;
            border-radius: 10px;
            z-index: 999999;
            font-family: Arial, sans-serif;
            font-size: 14px;
            backdrop-filter: blur(10px);
            box-shadow: 0 4px 12px rgba(0,0,0,0.3);
        `;
        
        controls.innerHTML = `
            <div style="margin-bottom: 10px; font-weight: bold; display: flex; justify-content: space-between; align-items: center;">
                <span>页面缩放</span>
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
                ">-</button>
                <button onclick="applyScale(currentScale + 0.1)" style="
                    flex: 1;
                    padding: 8px 12px;
                    background: #007bff;
                    color: white;
                    border: none;
                    border-radius: 4px;
                    cursor: pointer;
                    font-size: 16px;
                ">+</button>
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
                ">50%</button>
                <button onclick="applyScale(1)" style="
                    padding: 6px;
                    background: #28a745;
                    color: white;
                    border: none;
                    border-radius: 3px;
                    cursor: pointer;
                    font-size: 12px;
                ">100%</button>
                <button onclick="applyScale(1.5)" style="
                    padding: 6px;
                    background: #28a745;
                    color: white;
                    border: none;
                    border-radius: 3px;
                    cursor: pointer;
                    font-size: 12px;
                ">150%</button>
            </div>
            <div style="margin-top: 10px; font-size: 12px; color: #aaa; text-align: center;">
                快捷键: Ctrl+滚轮
            </div>
        `;
    }
    
    document.body.appendChild(controls);
    
    // 移动端菜单
    if (isMobile) {
        window.showMobileMenu = function() {
            showContextMenu(window.innerWidth - 100, window.innerHeight - 100);
        };
    }
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
    window.addEventListener('orientationchange', () => {
        setTimeout(() => {
            isPortrait = window.innerHeight > window.innerWidth;
            updateScrollPosition();
            document.body.style.minHeight = `${window.innerHeight / currentScale}px`;
            document.documentElement.style.minHeight = `${window.innerHeight / currentScale}px`;
        }, 300);
    });
}

// 禁止文本选择（可选，防止误操作）
if (isMobile) {
    document.addEventListener('selectstart', (e) => {
        e.preventDefault();
    });
}

// 控制面板拖动功能（电脑端）
if (!isMobile) {
    let isDragging = false;
    let dragOffsetX = 0;
    let dragOffsetY = 0;
    
    document.addEventListener('mousedown', (e) => {
        const controls = document.getElementById('scaleControls');
        if (controls && e.target === controls || controls.contains(e.target)) {
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