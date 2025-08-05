class ContentScriptInjector {
    constructor() {
        this.isBilibiliPage = this.checkIfBilibiliPage();
        this.init();
    }

    checkIfBilibiliPage() {
        return window.location.hostname.includes('bilibili.com');
    }

    init() {
        if (!this.isBilibiliPage) return;

        this.injectReportButton();
        this.setupMessageListener();
        this.addCustomStyles();
    }

    injectReportButton() {
        if (this.isVideoPage()) {
            this.injectVideoPageButton();
        } else {
            this.injectGeneralPageButton();
        }
    }

    isVideoPage() {
        return window.location.pathname.includes('/video/');
    }

    injectVideoPageButton() {
        const toolbar = this.findToolbarElement();
        if (!toolbar) return;

        const buttonContainer = document.createElement('div');
        buttonContainer.className = 'bilibili-report-plugin-container';
        
        const reportButton = document.createElement('button');
        reportButton.className = 'bilibili-report-plugin-btn';
        reportButton.innerHTML = '📋 侵权举报';
        reportButton.title = '使用B站侵权举报助手快速举报';

        reportButton.addEventListener('click', () => {
            this.triggerReportCapture();
        });

        buttonContainer.appendChild(reportButton);
        toolbar.appendChild(buttonContainer);
    }

    injectGeneralPageButton() {
        const floatingButton = document.createElement('div');
        floatingButton.className = 'bilibili-report-plugin-floating';
        floatingButton.innerHTML = '📋';
        floatingButton.title = 'B站侵权举报助手';

        floatingButton.addEventListener('click', () => {
            this.triggerReportCapture();
        });

        document.body.appendChild(floatingButton);
    }

    findToolbarElement() {
        const selectors = [
            '.video-toolbar-right',
            '.toolbar-right',
            '.video-info-toolbar',
            '.arc-toolbar',
            '.video-toolbar'
        ];

        for (const selector of selectors) {
            const element = document.querySelector(selector);
            if (element) return element;
        }

        const videoInfo = document.querySelector('.video-info');
        if (videoInfo) {
            const toolbar = document.createElement('div');
            toolbar.className = 'video-toolbar-right';
            videoInfo.appendChild(toolbar);
            return toolbar;
        }

        return null;
    }

    triggerReportCapture() {
        chrome.runtime.sendMessage({
            action: 'openPopup',
            tabId: chrome.runtime.id
        });
    }

    setupMessageListener() {
        chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
            switch (request.action) {
                case 'captureData':
                    this.handleCaptureData(sendResponse);
                    return true;
                
                case 'submitReport':
                    this.handleSubmitReport(request.caseData, sendResponse);
                    return true;
                
                default:
                    return false;
            }
        });
    }

    async handleCaptureData(sendResponse) {
        try {
            const data = await this.capturePageData();
            sendResponse({ success: true, data });
        } catch (error) {
            sendResponse({ success: false, error: error.message });
        }
    }

    async capturePageData() {
        const data = {
            url: window.location.href,
            title: '',
            uploader: '',
            uploaderId: '',
            publishTime: '',
            description: '',
            tags: [],
            viewCount: 0,
            likeCount: 0,
            coinCount: 0,
            favoriteCount: 0,
            shareCount: 0,
            bvid: '',
            aid: ''
        };

        if (this.isVideoPage()) {
            Object.assign(data, await this.captureVideoData());
        } else {
            Object.assign(data, await this.captureGeneralData());
        }

        return data;
    }

    async captureVideoData() {
        const videoData = {};

        try {
            videoData.title = this.safeQueryText('h1.video-title, .video-title h1, .tit');
            videoData.uploader = this.safeQueryText('.up-name, .up-info__name, .username');
            videoData.publishTime = this.safeQueryText('.publish-date, .video-info-meta-item, .video-info-detail');
            
            const descElement = document.querySelector('.desc-info, .video-desc, .abstract');
            videoData.description = descElement ? descElement.textContent.trim() : '';

            const tags = Array.from(document.querySelectorAll('.tag-link, .video-tag, .tag'));
            videoData.tags = tags.map(tag => tag.textContent.trim()).filter(tag => tag);

            const stats = this.extractVideoStats();
            Object.assign(videoData, stats);

            const videoId = this.extractVideoId();
            Object.assign(videoData, videoId);

        } catch (error) {
            console.warn('视频数据抓取部分失败:', error);
        }

        return videoData;
    }

    async captureGeneralData() {
        const generalData = {};

        try {
            generalData.title = document.title;
            generalData.description = this.getMetaDescription();
            
            const uploaderElement = document.querySelector('.author-name, .username, .up-name');
            generalData.uploader = uploaderElement ? uploaderElement.textContent.trim() : '';

        } catch (error) {
            console.warn('通用页面数据抓取失败:', error);
        }

        return generalData;
    }

    extractVideoStats() {
        const stats = {
            viewCount: 0,
            likeCount: 0,
            coinCount: 0,
            favoriteCount: 0,
            shareCount: 0
        };

        try {
            const viewElement = document.querySelector('.view-count, .video-view, .play-count');
            if (viewElement) {
                stats.viewCount = this.parseNumber(viewElement.textContent);
            }

            const likeElement = document.querySelector('.like-count, .video-like, .like');
            if (likeElement) {
                stats.likeCount = this.parseNumber(likeElement.textContent);
            }

            const coinElement = document.querySelector('.coin-count, .video-coin, .coin');
            if (coinElement) {
                stats.coinCount = this.parseNumber(coinElement.textContent);
            }

            const favoriteElement = document.querySelector('.favorite-count, .video-fav, .collect');
            if (favoriteElement) {
                stats.favoriteCount = this.parseNumber(favoriteElement.textContent);
            }

            const shareElement = document.querySelector('.share-count, .video-share, .share');
            if (shareElement) {
                stats.shareCount = this.parseNumber(shareElement.textContent);
            }

        } catch (error) {
            console.warn('统计数据抓取失败:', error);
        }

        return stats;
    }

    extractVideoId() {
        const ids = { bvid: '', aid: '' };

        try {
            const urlMatch = window.location.pathname.match(/\/video\/(BV\w+)/);
            if (urlMatch) {
                ids.bvid = urlMatch[1];
            }

            const aidMatch = window.location.search.match(/[?&]aid=(\d+)/);
            if (aidMatch) {
                ids.aid = aidMatch[1];
            }

            const scriptTags = document.querySelectorAll('script');
            for (const script of scriptTags) {
                const content = script.textContent;
                if (content && content.includes('window.__INITIAL_STATE__')) {
                    const match = content.match(/window\.__INITIAL_STATE__\s*=\s*({.+?});/);
                    if (match) {
                        try {
                            const initialState = JSON.parse(match[1]);
                            if (initialState.aid) ids.aid = initialState.aid;
                            if (initialState.bvid) ids.bvid = initialState.bvid;
                        } catch (e) {
                            console.warn('解析INITIAL_STATE失败:', e);
                        }
                    }
                }
            }

        } catch (error) {
            console.warn('视频ID提取失败:', error);
        }

        return ids;
    }

    safeQueryText(selector) {
        const element = document.querySelector(selector);
        return element ? element.textContent.trim() : '';
    }

    getMetaDescription() {
        const metaDesc = document.querySelector('meta[name="description"]');
        return metaDesc ? metaDesc.getAttribute('content') : '';
    }

    parseNumber(text) {
        if (!text) return 0;
        
        const numText = text.replace(/[^\d.]/g, '');
        const num = parseFloat(numText);
        
        if (text.includes('万')) {
            return num * 10000;
        } else if (text.includes('亿')) {
            return num * 100000000;
        }
        
        return isNaN(num) ? 0 : Math.floor(num);
    }

    async handleSubmitReport(caseData, sendResponse) {
        try {
            const result = await this.automateReportSubmission(caseData);
            sendResponse({ success: true, result });
        } catch (error) {
            sendResponse({ success: false, error: error.message });
        }
    }

    async automateReportSubmission(caseData) {
        return new Promise((resolve, reject) => {
            try {
                this.showReportDialog(caseData);
                
                setTimeout(() => {
                    this.fillReportForm(caseData);
                    
                    setTimeout(() => {
                        this.submitReportForm()
                            .then(resolve)
                            .catch(reject);
                    }, 2000);
                }, 1000);
                
            } catch (error) {
                reject(error);
            }
        });
    }

    showReportDialog(caseData) {
        const reportButton = this.findReportButton();
        if (reportButton) {
            reportButton.click();
        } else {
            throw new Error('未找到举报按钮');
        }
    }

    findReportButton() {
        const selectors = [
            '.report-btn',
            '.video-report',
            '.report',
            '[title*="举报"]',
            '[aria-label*="举报"]'
        ];

        for (const selector of selectors) {
            const element = document.querySelector(selector);
            if (element) return element;
        }

        const moreButton = document.querySelector('.more-btn, .more, .video-more');
        if (moreButton) {
            moreButton.click();
            
            setTimeout(() => {
                const reportInMenu = document.querySelector('.report-menu-item, .menu-report');
                if (reportInMenu) return reportInMenu;
            }, 500);
        }

        return null;
    }

    fillReportForm(caseData) {
        const form = this.findReportForm();
        if (!form) {
            throw new Error('未找到举报表单');
        }

        this.selectReportReason(form, caseData);
        this.fillReportDescription(form, caseData);
        this.attachEvidence(form, caseData);
    }

    findReportForm() {
        return document.querySelector('.report-dialog, .report-form, .modal-content');
    }

    selectReportReason(form, caseData) {
        const reasonButtons = form.querySelectorAll('.reason-btn, .report-reason');
        const targetReason = this.determineReportReason(caseData);
        
        for (const button of reasonButtons) {
            if (button.textContent.includes(targetReason)) {
                button.click();
                break;
            }
        }
    }

    determineReportReason(caseData) {
        const desc = caseData.evidenceDesc.toLowerCase();
        
        if (desc.includes('版权') || desc.includes('著作权')) {
            return '版权';
        } else if (desc.includes('抄袭') || desc.includes('盗用')) {
            return '抄袭';
        } else if (desc.includes('色情') || desc.includes('低俗')) {
            return '色情';
        } else if (desc.includes('暴力') || desc.includes('血腥')) {
            return '暴力';
        } else {
            return '其他';
        }
    }

    fillReportDescription(form, caseData) {
        const textarea = form.querySelector('textarea, .report-desc, .description-input');
        if (textarea) {
            const description = this.generateReportDescription(caseData);
            textarea.value = description;
            
            const event = new Event('input', { bubbles: true });
            textarea.dispatchEvent(event);
        }
    }

    generateReportDescription(caseData) {
        return `举报侵权内容：

原创作品链接：${caseData.originalWork}

侵权描述：${caseData.evidenceDesc}

侵权视频信息：
- 标题：${caseData.infringedContent.title}
- UP主：${caseData.infringedContent.uploader}
- 链接：${caseData.infringedContent.url}
- 发布时间：${caseData.infringedContent.publishTime}

请管理员核实处理，谢谢！`;
    }

    attachEvidence(form, caseData) {
        const evidenceInput = form.querySelector('input[type="file"], .evidence-input');
        if (evidenceInput && caseData.evidenceFiles) {
            // 这里可以添加自动上传证据文件的逻辑
            // 由于安全限制，可能需要用户手动操作
        }
    }

    async submitReportForm() {
        return new Promise((resolve, reject) => {
            const submitButton = document.querySelector('.submit-btn, .report-submit, .confirm-btn');
            
            if (submitButton) {
                submitButton.click();
                
                setTimeout(() => {
                    const successMessage = document.querySelector('.success-msg, .report-success');
                    if (successMessage) {
                        resolve({ success: true, message: '举报提交成功' });
                    } else {
                        resolve({ success: true, message: '举报已提交' });
                    }
                }, 2000);
            } else {
                reject(new Error('未找到提交按钮'));
            }
        });
    }

    addCustomStyles() {
        const styles = `
            .bilibili-report-plugin-container {
                display: inline-block;
                margin-left: 8px;
            }
            
            .bilibili-report-plugin-btn {
                background: #00A1D6;
                color: white;
                border: none;
                border-radius: 4px;
                padding: 6px 12px;
                font-size: 14px;
                cursor: pointer;
                transition: all 0.2s;
            }
            
            .bilibili-report-plugin-btn:hover {
                background: #0086b3;
                transform: translateY(-1px);
            }
            
            .bilibili-report-plugin-floating {
                position: fixed;
                bottom: 20px;
                right: 20px;
                width: 50px;
                height: 50px;
                background: #00A1D6;
                color: white;
                border-radius: 50%;
                display: flex;
                align-items: center;
                justify-content: center;
                font-size: 20px;
                cursor: pointer;
                box-shadow: 0 2px 10px rgba(0, 0, 0, 0.3);
                z-index: 9999;
                transition: all 0.2s;
            }
            
            .bilibili-report-plugin-floating:hover {
                background: #0086b3;
                transform: scale(1.1);
            }
        `;

        const styleElement = document.createElement('style');
        styleElement.textContent = styles;
        document.head.appendChild(styleElement);
    }
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        new ContentScriptInjector();
    });
} else {
    new ContentScriptInjector();
}