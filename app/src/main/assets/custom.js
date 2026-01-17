window.addEventListener("DOMContentLoaded",()=>{const t=document.createElement("script");t.src="https://www.googletagmanager.com/gtag/js?id=G-W5GKHM0893",t.async=!0,document.head.appendChild(t);const n=document.createElement("script");n.textContent="window.dataLayer = window.dataLayer || [];function gtag(){dataLayer.push(arguments);}gtag('js', new Date());gtag('config', 'G-W5GKHM0893');",document.body.appendChild(n)});// ==UserScript==
// @name         Pake MacPlayer 视频提取强制全屏 (最终版)
// @namespace    http://tampermonkey.net/
// @version      1.0
// @description  不修播放器，直接提取视频元素强制全屏，解决顽固白屏。
// @author       You
// @match        *://www.sunnafh.com/vod/show/id/*
// @grant        none
// ==/UserScript==

(function () {
    'use strict';

    console.log("【终极修复脚本】已启动");

    // --- 第一步：强制 HTML 和 Body 全屏 ---
    // 确保底下的容器能继承尺寸
    const resetStyle = document.createElement('style');
    resetStyle.textContent = `
        html, body {
            margin: 0;
            padding: 0;
            width: 100% !important;
            height: 100% !important;
            min-height: 100vh;
            overflow: hidden;
            background: #000;
        }
    `;
    document.head.appendChild(resetStyle);

    // --- 第二步：定义动态高度变量 ---
    // 修复移动端浏览器UI遮挡
    function setVH() {
        const vh = window.innerHeight * 0.01;
        document.documentElement.style.setProperty('--vh', `${vh}px`);
    }
    setVH();
    window.addEventListener('resize', setVH);
    window.addEventListener('orientationchange', setVH);

    // --- 第三步：注入强制全屏样式 ---
    // 创建一个覆盖层，准备接住视频
    const style = document.createElement('style');
    style.textContent = `
        /* 全屏覆盖层 */
        #pake-video-overlay {
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: calc(var(--vh, 1vh) * 100);
            background: #000;
            z-index: 2147483647;
            display: flex;
            justify-content: center;
            align-items: center;
            flex-direction: column;
        }

        /* 强制视频样式 */
        #pake-video-overlay video {
            position: absolute !important;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%) !important;
            width: 100% !important;
            height: 100% !important;
            object-fit: contain !important;
            z-index: 1;
        }

        /* 隐藏原播放器容器 (防止它闪烁或干扰) */
        #playleft, #player_container, .MacPlayer {
            opacity: 0 !important;
            visibility: hidden !important;
            pointer-events: none !important;
        }
    `;
    document.head.appendChild(style);

    // --- 第四步：核心逻辑 - 提取视频元素 ---
    // 定时查找页面上的 video 元素，一旦找到，就把它移到我们的全屏层
    function promoteVideoToFullscreen() {
        // 1. 查找视频元素
        let video = document.querySelector('video');
        
        // 如果没找到，或者已经在我们的层里了，就等待下一次
        if (!video || video.id === 'pake-forced-video') {
            setTimeout(promoteVideoToFullscreen, 500);
            return;
        }

        console.log("【发现视频元素】正在强制接管...");

        // 2. 创建全屏容器
        let overlay = document.getElementById('pake-video-overlay');
        if (!overlay) {
            overlay = document.createElement('div');
            overlay.id = 'pake-video-overlay';
            document.body.appendChild(overlay);
        }

        // 3. 克隆或移动视频 (这里选择移动)
        // 修改视频ID，标记为已处理
        video.id = 'pake-forced-video';

        // 4. 将视频放入全屏容器
        overlay.appendChild(video);

        // 5. 监听视频的播放状态，确保它能正常播放
        video.muted = false; // 取消静音
        video.controls = true; // 显示控制条

        // --- 可选：添加一个退出全屏的机制 ---
        // 这里简单实现：点击屏幕缩小 (根据你的Pake需求可删改)
        overlay.onclick = function(e) {
            if (e.target === overlay) {
                // 点击遮罩层外区域，退出全屏 (这里简单刷新页面)
                location.reload();
            }
        };

        console.log("【视频接管成功】视频已强制全屏显示");
    }

    // --- 第五步：启动 ---
    // 页面加载完成后立即执行
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', promoteVideoToFullscreen);
    } else {
        promoteVideoToFullscreen();
    }

    // --- 第六步：兜底 ---
    // 如果页面动态加载了新视频，也尝试接管
    setInterval(promoteVideoToFullscreen, 2000);

})();