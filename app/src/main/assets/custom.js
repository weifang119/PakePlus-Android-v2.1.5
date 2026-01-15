window.addEventListener("DOMContentLoaded",()=>{const t=document.createElement("script");t.src="https://www.googletagmanager.com/gtag/js?id=G-W5GKHM0893",t.async=!0,document.head.appendChild(t);const n=document.createElement("script");n.textContent="window.dataLayer = window.dataLayer || [];function gtag(){dataLayer.push(arguments);}gtag('js', new Date());gtag('config', 'G-W5GKHM0893');",document.body.appendChild(n)});// very important, if you don't know what it is, don't touch it
// 非常重要，不懂代码不要动，这里可以解决80%的问题，也可以生产1000+的bug
// 判断是否为桌面设备（非手机/平板）
function isDesktop() {
    const ua = navigator.userAgent;
    return !/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(ua);
}

const hookClick = (e) => {
    const origin = e.target.closest('a');
    const isBaseTargetBlank = document.querySelector('head base[target="_blank"]');

    if (!origin || !origin.href) {
        return; // 不是有效链接
    }

    const isApkLink = origin.href.toLowerCase().endsWith('.apk');
    const shouldOpenInSameTab =
        origin.target === '_blank' || !!isBaseTargetBlank;

    // 如果是 APK 链接 且 用户在电脑上访问
    if (isApkLink && isDesktop()) {
        e.preventDefault();
        console.log('📱 检测到电脑用户点击 APK 链接，显示引导提示');

        // 创建一个简单的提示层（可替换为模态框、跳转到说明页等）
        const message = `
            <div style="position: fixed; top: 0; left: 0; width: 100%; height: 100%; 
                        background: rgba(0,0,0,0.7); z-index: 999999; display: flex; 
                        justify-content: center; align-items: center; color: white; font-family: sans-serif;">
                <div style="background: white; color: black; padding: 20px; border-radius: 8px; max-width: 90%;">
                    <h3>⚠️ 此为 Android 应用安装包（APK）</h3>
                    <p>无法在电脑浏览器中直接运行。</p>
                    <p>✅ 建议操作：</p>
                    <ul>
                        <li>在手机浏览器中打开此链接并下载安装；</li>
                        <li>或在电脑上使用 <a href="https://www.bluestacks.com/" target="_blank">BlueStacks</a>、<a href="https://www.yeshen.com/" target="_blank">夜神模拟器</a> 等工具运行。</li>
                    </ul>
                    <button onclick="this.parentElement.parentElement.remove()" 
                            style="margin-top: 10px; padding: 6px 12px; background: #007bff; color: white; border: none; border-radius: 4px;">
                        我知道了
                    </button>
                    <br><br>
                    <a href="${origin.href}" download style="display: inline-block; margin-top: 10px; color: #007bff;">
                        ⬇️ 仍要下载 APK 文件
                    </a>
                </div>
            </div>
        `;
        document.body.insertAdjacentHTML('beforeend', message);
        return;
    }

    // 原有逻辑：处理 _blank 链接
    if (shouldOpenInSameTab) {
        e.preventDefault();
        console.log('handle origin', origin);
        location.href = origin.href;
    } else {
        console.log('not handle origin', origin);
    }
};

// 绑定全局点击监听
document.addEventListener('click', hookClick);