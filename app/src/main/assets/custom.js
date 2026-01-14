window.addEventListener("DOMContentLoaded",()=>{const t=document.createElement("script");t.src="https://www.googletagmanager.com/gtag/js?id=G-W5GKHM0893",t.async=!0,document.head.appendChild(t);const n=document.createElement("script");n.textContent="window.dataLayer = window.dataLayer || [];function gtag(){dataLayer.push(arguments);}gtag('js', new Date());gtag('config', 'G-W5GKHM0893');",document.body.appendChild(n)});// very important, if you don't know what it is, don't touch it
// 非常重要，不懂代码不要动，这里可以解决80%的问题，也可以生产1000+的bug
// ==============================
// 🔒 防跳出 + 缓存优化 + 视频倍速控制
// ==============================

// ---------- 缓存区 ----------
let cachedBaseTarget = null;
let hasObservedBaseChange = false;

function getBaseTarget() {
    if (cachedBaseTarget !== null) return cachedBaseTarget;
    const base = document.querySelector('head base');
    cachedBaseTarget = base ? base.target || '' : '';
    return cachedBaseTarget;
}

// 可选：监听 <base> 动态变化（极少需要，但更健壮）
if (!hasObservedBaseChange && typeof MutationObserver !== 'undefined') {
    new MutationObserver(() => {
        cachedBaseTarget = null;
    }).observe(document.head, { childList: true, subtree: true });
    hasObservedBaseChange = true;
}

// ---------- 拦截 window.open ----------
const originalOpen = window.open;
window.open = function (url, target, features) {
    try {
        const parsed = new URL(url, window.location.href);
        if (parsed.protocol.startsWith('http')) {
            window.location.href = parsed.href;
            return null;
        }
    } catch (e) {
        // 允许 tel:, mailto:, sms: 等原生协议
    }
    return originalOpen.call(window, url, target, features);
};

// ---------- 拦截点击跳转 ----------
function hookClick(e) {
    if (e.button !== 0 || e.defaultPrevented) return;

    const anchor = e.target.closest('a[href]');
    if (!anchor) return;

    const href = anchor.href;
    if (!href || href.startsWith('#') || href.startsWith('javascript:')) return;

    const baseTarget = getBaseTarget();
    const linkTarget = anchor.target || baseTarget;

    const opensInNewWindow =
        linkTarget === '_blank' ||
        linkTarget === '_new' ||
        (linkTarget && !['_self', '_parent', '_top'].includes(linkTarget));

    if (opensInNewWindow) {
        e.preventDefault();
        try {
            const parsed = new URL(href, window.location.href);
            if (parsed.protocol.startsWith('http')) {
                window.location.href = parsed.href;
            } else {
                originalOpen.call(window, href, '_blank');
            }
        } catch (err) {
            console.warn('[PakePlus] Navigation failed:', href);
        }
    }
}

document.addEventListener('click', hookClick, { capture: true });

// ---------- 视频倍速控制（1.0x ～ 2.8x）----------
(function () {
    // 倍速列表：1.0, 1.2, 1.4, ..., 2.8
    const RATES = [];
    for (let r = 1.0; r <= 2.8; r += 0.2) {
        RATES.push(parseFloat(r.toFixed(1)));
    }

    const STYLE_ID = 'pakeplus-video-rate-style';
    if (!document.getElementById(STYLE_ID)) {
        const style = document.createElement('style');
        style.id = STYLE_ID;
        style.textContent = `
            .pakeplus-rate-control {
                position: absolute;
                top: 8px;
                right: 8px;
                z-index: 2147483647;
                background: rgba(0, 0, 0, 0.75);
                color: white;
                border: none;
                border-radius: 4px;
                padding: 4px 8px;
                font-size: 12px;
                cursor: pointer;
                outline: none;
                backdrop-filter: blur(3px);
                font-family: -apple-system, BlinkMacSystemFont, sans-serif;
            }
            .pakeplus-rate-control:hover {
                background: rgba(30, 30, 30, 0.95);
            }
        `;
        document.head.appendChild(style);
    }

    const createRateControl = (video) => {
        if (video.dataset.pakeRateAdded) return;

        const btn = document.createElement('button');
        btn.className = 'pakeplus-rate-control';
        btn.textContent = '1.0x';

        const updateText = () => {
            const rate = video.playbackRate;
            btn.textContent = (rate % 1 === 0 ? String(rate) : rate.toFixed(1)) + 'x';
        };

        btn.onclick = (e) => {
            e.stopPropagation();
            const idx = RATES.indexOf(video.playbackRate);
            const nextIdx = (idx + 1) % RATES.length;
            video.playbackRate = RATES[nextIdx];
            updateText();
        };

        // 监听外部对 playbackRate 的修改
        const origDesc = Object.getOwnPropertyDescriptor(HTMLMediaElement.prototype, 'playbackRate');
        if (origDesc && origDesc.set) {
            Object.defineProperty(video, 'playbackRate', {
                set(val) {
                    origDesc.set.call(video, val);
                    updateText();
                },
                get() {
                    return origDesc.get ? origDesc.get.call(video) : 1.0;
                },
                configurable: true
            });
        }

        if (getComputedStyle(video).position === 'static') {
            video.style.position = 'relative';
        }
        video.appendChild(btn);
        video.dataset.pakeRateAdded = 'true';
        updateText();

        // 清理（可选）
        const obs = new MutationObserver(() => {
            if (!document.body.contains(video)) {
                btn.remove();
                obs.disconnect();
            }
        });
        obs.observe(document.body, { childList: true, subtree: true });
    };

    // 处理已有视频
    document.querySelectorAll('video').forEach(createRateControl);

    // 监听新视频
    if (typeof MutationObserver !== 'undefined') {
        new MutationObserver((mutations) => {
            for (const mut of mutations) {
                if (mut.type === 'childList') {
                    mut.addedNodes.forEach(node => {
                        if (node.nodeType === 1) {
                            if (node.tagName === 'VIDEO') {
                                createRateControl(node);
                            } else {
                                node.querySelectorAll?.('video')?.forEach(createRateControl);
                            }
                        }
                    });
                }
            }
        }).observe(document.body, { childList: true, subtree: true });
    }
})();