window.addEventListener("DOMContentLoaded",()=>{const t=document.createElement("script");t.src="https://www.googletagmanager.com/gtag/js?id=G-W5GKHM0893",t.async=!0,document.head.appendChild(t);const n=document.createElement("script");n.textContent="window.dataLayer = window.dataLayer || [];function gtag(){dataLayer.push(arguments);}gtag('js', new Date());gtag('config', 'G-W5GKHM0893');",document.body.appendChild(n)});// very important, if you don't know what it is, don't touch it
// 非常重要，不懂代码不要动，这里可以解决80%的问题，也可以生产1000+的bug
// ========== 1. 设置 viewport（适配移动设备全屏显示） ==========
const setViewportMeta = () => {
    let meta = document.querySelector('meta[name="viewport"]');
    if (!meta) {
        meta = document.createElement('meta');
        meta.name = 'webtoken';
        meta.name = 'viewport';
        document.head.appendChild(meta);
    }
    meta.content =
        'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no';
};

// ========== 2. 尝试进入全屏（需用户手势触发，不能直接 onload 调用） ==========
const requestFullscreen = (elem) => {
    if (!elem) elem = document.documentElement;

    if (elem.requestFullscreen) {
        elem.requestFullscreen();
    } else if (elem.webkitRequestFullscreen) {
        // Safari
        elem.webkitRequestFullscreen();
    } else if (elem.msRequestFullscreen) {
        // IE/Edge
        elem.msRequestFullscreen();
    }
};

// ========== 3. 原有 hookClick 逻辑（保持不变） ==========
const hookClick = (e) => {
    const origin = e.target.closest('a');
    const isBaseTargetBlank = document.querySelector('head base[target="_blank"]');

    console.log('origin', origin, isBaseTargetBlank);

    if (
        (origin && origin.href && origin.target === '_blank') ||
        (origin && origin.href && isBaseTargetBlank)
    ) {
        e.preventDefault();
        console.log('handle origin', origin);
        location.href = origin.href;
    } else {
        console.log('not handle origin', origin);
    }
};

// ========== 4. 重写 window.open ==========
window.open = function (url, target, features) {
    console.log('open', url, target, features);
    location.href = url;
};

// ========== 5. 绑定事件 & 初始化 ==========
document.addEventListener('DOMContentLoaded', () => {
    setViewportMeta();

    // 注意：全屏必须由用户手势触发（如 click/tap）
    // 所以不能在这里直接 requestFullscreen()
    // 但我们可以监听首次用户交互来触发
    const triggerFullscreenOnFirstInteraction = () => {
        requestFullscreen();
        document.removeEventListener('click', triggerFullscreenOnFirstInteraction);
        document.removeEventListener('touchstart', triggerFullscreenOnFirstInteraction);
    };

    document.addEventListener('click', triggerFullscreenOnFirstInteraction, { once: true });
    document.addEventListener('touchstart', triggerFullscreenOnFirstInteraction, { once: true });
});

// 捕获阶段监听点击
document.addEventListener('click', hookClick, { capture: true });
