class BackgroundService {
    constructor() {
        this.cases = new Map();
        this.settings = new Map();
        this.activeTabs = new Map();
        this.apiEndpoints = {
            report: 'https://api.bilibili.com/x/v2/report/add',
            feedback: 'https://api.bilibili.com/x/v2/feedback/add'
        };
        this.init();
    }

    async init() {
        await this.loadStoredData();
        this.setupEventListeners();
        this.setupContextMenus();
        this.startPeriodicTasks();
        this.setupAlarmListeners();
    }

    async loadStoredData() {
        try {
            const result = await chrome.storage.local.get(['cases', 'settings', 'activeTabs']);
            
            if (result.cases) {
                this.cases = new Map(Object.entries(result.cases));
            }
            
            if (result.settings) {
                this.settings = new Map(Object.entries(result.settings));
            }
            
            if (result.activeTabs) {
                this.activeTabs = new Map(Object.entries(result.activeTabs));
            }

            this.initializeDefaultSettings();
            
        } catch (error) {
            console.error('加载存储数据失败:', error);
            this.initializeDefaultSettings();
        }
    }

    initializeDefaultSettings() {
        const defaultSettings = {
            autoCapture: true,
            autoSubmit: false,
            notifications: true,
            debugMode: false,
            apiTimeout: 30000,
            maxRetries: 3,
            evidenceScreenshots: true,
            reportTemplate: 'default',
            language: 'zh-CN'
        };

        for (const [key, value] of Object.entries(defaultSettings)) {
            if (!this.settings.has(key)) {
                this.settings.set(key, value);
            }
        }

        this.saveSettings();
    }

    setupEventListeners() {
        chrome.runtime.onInstalled.addListener((details) => {
            this.handleInstall(details);
        });

        chrome.runtime.onStartup.addListener(() => {
            this.handleStartup();
        });

        chrome.action.onClicked.addListener((tab) => {
            this.handleActionClick(tab);
        });

        chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
            this.handleTabUpdate(tabId, changeInfo, tab);
        });

        chrome.tabs.onRemoved.addListener((tabId) => {
            this.handleTabRemove(tabId);
        });

        chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
            return this.handleMessage(request, sender, sendResponse);
        });

        chrome.storage.onChanged.addListener((changes, areaName) => {
            this.handleStorageChange(changes, areaName);
        });

        // 安全地添加webNavigation监听器
        if (chrome.webNavigation) {
            chrome.webNavigation.onCompleted.addListener((details) => {
                this.handleNavigationComplete(details);
            });
        }
    }

    setupContextMenus() {
        chrome.contextMenus.create({
            id: 'bilibili-report-capture',
            title: '抓取侵权信息',
            contexts: ['selection', 'link', 'image', 'video'],
            documentUrlPatterns: ['*://*.bilibili.com/*']
        });

        chrome.contextMenus.create({
            id: 'bilibili-report-quick',
            title: '快速举报',
            contexts: ['selection', 'link', 'image', 'video'],
            documentUrlPatterns: ['*://*.bilibili.com/*']
        });

        chrome.contextMenus.create({
            id: 'bilibili-report-separator',
            type: 'separator',
            contexts: ['selection', 'link', 'image', 'video'],
            documentUrlPatterns: ['*://*.bilibili.com/*']
        });

        chrome.contextMenus.onClicked.addListener((info, tab) => {
            this.handleContextMenuClick(info, tab);
        });
    }

    startPeriodicTasks() {
        this.cleanupOldData();
        this.syncWithServer();
        this.checkForUpdates();
    }

    setupAlarmListeners() {
        // 安全地设置定时任务
        if (chrome.alarms) {
            chrome.alarms.create('cleanup', {
                delayInMinutes: 60,
                periodInMinutes: 60
            });

            chrome.alarms.create('sync', {
                delayInMinutes: 30,
                periodInMinutes: 30
            });

            chrome.alarms.create('updateCheck', {
                delayInMinutes: 1440,
                periodInMinutes: 1440
            });

            chrome.alarms.onAlarm.addListener((alarm) => {
                this.handleAlarm(alarm);
            });
        }
    }

    async handleInstall(details) {
        if (details.reason === 'install') {
            await this.showWelcomeMessage();
            await this.openDashboard();
        } else if (details.reason === 'update') {
            await this.showUpdateMessage(details.previousVersion);
        }
    }

    async handleStartup() {
        console.log('B站侵权举报助手启动');
        await this.cleanupOldData();
        await this.checkForUpdates();
    }

    handleActionClick(tab) {
        if (tab.url && tab.url.includes('bilibili.com')) {
            this.openPopupForTab(tab);
        } else {
            this.openDashboard();
        }
    }

    handleTabUpdate(tabId, changeInfo, tab) {
        if (changeInfo.status === 'complete' && tab.url) {
            if (tab.url.includes('bilibili.com')) {
                this.activeTabs.set(tabId, {
                    url: tab.url,
                    title: tab.title,
                    timestamp: Date.now()
                });
                
                if (this.settings.get('autoCapture')) {
                    this.scheduleAutoCapture(tabId);
                }
            } else {
                this.activeTabs.delete(tabId);
            }
        }
    }

    handleTabRemove(tabId) {
        this.activeTabs.delete(tabId);
    }

    async handleMessage(request, sender, sendResponse) {
        try {
            switch (request.action) {
                case 'captureData':
                    return this.handleCaptureData(request, sender, sendResponse);
                
                case 'createCase':
                    return this.handleCreateCase(request, sender, sendResponse);
                
                case 'submitReport':
                    return this.handleSubmitReport(request, sender, sendResponse);
                
                case 'getCases':
                    return this.handleGetCases(request, sender, sendResponse);
                
                case 'updateCase':
                    return this.handleUpdateCase(request, sender, sendResponse);
                
                case 'deleteCase':
                    return this.handleDeleteCase(request, sender, sendResponse);
                
                case 'getSettings':
                    return this.handleGetSettings(request, sender, sendResponse);
                
                case 'updateSettings':
                    return this.handleUpdateSettings(request, sender, sendResponse);
                
                case 'openPopup':
                    return this.handleOpenPopup(request, sender, sendResponse);
                
                case 'openDashboard':
                    return this.handleOpenDashboard(request, sender, sendResponse);
                
                case 'showNotification':
                    return this.handleShowNotification(request, sender, sendResponse);
                
                case 'takeScreenshot':
                    return this.handleTakeScreenshot(request, sender, sendResponse);
                
                case 'exportData':
                    return this.handleExportData(request, sender, sendResponse);
                
                case 'importData':
                    return this.handleImportData(request, sender, sendResponse);
                
                default:
                    return { success: false, error: '未知操作' };
            }
        } catch (error) {
            console.error('消息处理失败:', error);
            return { success: false, error: error.message };
        }
    }

    async handleCaptureData(request, sender, sendResponse) {
        try {
            const tabId = sender.tab.id;
            const captureResult = await this.captureTabData(tabId, request.options);
            
            sendResponse({ success: true, data: captureResult });
        } catch (error) {
            sendResponse({ success: false, error: error.message });
        }
    }

    async captureTabData(tabId, options = {}) {
        return new Promise((resolve, reject) => {
            chrome.scripting.executeScript({
                target: { tabId },
                func: this.extractPageData,
                args: [options]
            }, (results) => {
                if (chrome.runtime.lastError) {
                    reject(new Error(chrome.runtime.lastError.message));
                } else if (results && results[0]) {
                    resolve(results[0].result);
                } else {
                    reject(new Error('数据提取失败'));
                }
            });
        });
    }

    extractPageData(options) {
        try {
            const data = {
                url: window.location.href,
                title: document.title,
                timestamp: Date.now(),
                type: this.detectPageType()
            };

            if (data.type === 'video') {
                Object.assign(data, this.extractVideoData());
            } else if (data.type === 'user') {
                Object.assign(data, this.extractUserData());
            } else {
                Object.assign(data, this.extractGeneralData());
            }

            if (options.includeScreenshot) {
                data.screenshot = this.takeScreenshot();
            }

            return data;
        } catch (error) {
            console.error('页面数据提取失败:', error);
            throw error;
        }
    }

    detectPageType() {
        const url = window.location.href;
        if (url.includes('/video/')) return 'video';
        if (url.includes('/space/')) return 'user';
        if (url.includes('/bangumi/')) return 'bangumi';
        if (url.includes('/article/')) return 'article';
        return 'general';
    }

    extractVideoData() {
        return {
            bvid: this.extractBVID(),
            aid: this.extractAID(),
            title: this.extractTitle(),
            uploader: this.extractUploader(),
            publishTime: this.extractPublishTime(),
            description: this.extractDescription(),
            tags: this.extractTags(),
            stats: this.extractStats()
        };
    }

    extractBVID() {
        const match = window.location.pathname.match(/\/video\/(BV\w+)/);
        return match ? match[1] : '';
    }

    extractAID() {
        const match = window.location.search.match(/[?&]aid=(\d+)/);
        return match ? match[1] : '';
    }

    extractTitle() {
        const titleElement = document.querySelector('h1.video-title, .video-title h1, .tit');
        return titleElement ? titleElement.textContent.trim() : document.title;
    }

    extractUploader() {
        const uploaderElement = document.querySelector('.up-name, .up-info__name, .username');
        return uploaderElement ? uploaderElement.textContent.trim() : '';
    }

    extractPublishTime() {
        const timeElement = document.querySelector('.publish-date, .video-info-meta-item');
        return timeElement ? timeElement.textContent.trim() : '';
    }

    extractDescription() {
        const descElement = document.querySelector('.desc-info, .video-desc');
        return descElement ? descElement.textContent.trim() : '';
    }

    extractTags() {
        const tagElements = document.querySelectorAll('.tag-link, .video-tag');
        return Array.from(tagElements).map(tag => tag.textContent.trim());
    }

    extractStats() {
        const stats = {};
        const statElements = {
            view: '.view-count',
            like: '.like-count',
            coin: '.coin-count',
            favorite: '.favorite-count',
            share: '.share-count'
        };

        for (const [key, selector] of Object.entries(statElements)) {
            const element = document.querySelector(selector);
            if (element) {
                stats[key] = this.parseNumber(element.textContent);
            }
        }

        return stats;
    }

    parseNumber(text) {
        if (!text) return 0;
        const numText = text.replace(/[^\d.]/g, '');
        const num = parseFloat(numText);
        
        if (text.includes('万')) return num * 10000;
        if (text.includes('亿')) return num * 100000000;
        return isNaN(num) ? 0 : Math.floor(num);
    }

    extractUserData() {
        return {
            username: this.extractUsername(),
            userId: this.extractUserId(),
            sign: this.extractUserSign(),
            stats: this.extractUserStats()
        };
    }

    extractUsername() {
        const usernameElement = document.querySelector('.h-name, .username');
        return usernameElement ? usernameElement.textContent.trim() : '';
    }

    extractUserId() {
        const match = window.location.pathname.match(/\/space\/bilibili\/(\d+)/);
        return match ? match[1] : '';
    }

    extractUserSign() {
        const signElement = document.querySelector('.sign-content');
        return signElement ? signElement.textContent.trim() : '';
    }

    extractUserStats() {
        const stats = {};
        const statElements = {
            follower: '.follower-count',
            following: '.following-count',
            video: '.video-count'
        };

        for (const [key, selector] of Object.entries(statElements)) {
            const element = document.querySelector(selector);
            if (element) {
                stats[key] = this.parseNumber(element.textContent);
            }
        }

        return stats;
    }

    extractGeneralData() {
        return {
            title: document.title,
            description: this.getMetaDescription(),
            keywords: this.getMetaKeywords()
        };
    }

    getMetaDescription() {
        const metaDesc = document.querySelector('meta[name="description"]');
        return metaDesc ? metaDesc.getAttribute('content') : '';
    }

    getMetaKeywords() {
        const metaKeywords = document.querySelector('meta[name="keywords"]');
        return metaKeywords ? metaKeywords.getAttribute('content') : '';
    }

    takeScreenshot() {
        // 在内容脚本中无法直接截图，这里返回占位符
        return 'screenshot_placeholder';
    }

    async handleCreateCase(request, sender, sendResponse) {
        try {
            const caseData = {
                id: Date.now().toString(),
                ...request.caseData,
                createdAt: new Date().toISOString(),
                status: 'pending',
                tabId: sender.tab.id
            };

            this.cases.set(caseData.id, caseData);
            await this.saveCases();

            sendResponse({ success: true, caseId: caseData.id });
        } catch (error) {
            sendResponse({ success: false, error: error.message });
        }
    }

    async handleSubmitReport(request, sender, sendResponse) {
        try {
            const caseId = request.caseId;
            const caseData = this.cases.get(caseId);
            
            if (!caseData) {
                throw new Error('案件不存在');
            }

            const result = await this.submitReportToBilibili(caseData);
            
            caseData.status = 'submitted';
            caseData.submittedAt = new Date().toISOString();
            caseData.reportResult = result;
            
            this.cases.set(caseId, caseData);
            await this.saveCases();

            sendResponse({ success: true, result });
        } catch (error) {
            sendResponse({ success: false, error: error.message });
        }
    }

    async submitReportToBilibili(caseData) {
        const maxRetries = this.settings.get('maxRetries') || 3;
        const timeout = this.settings.get('apiTimeout') || 30000;

        for (let attempt = 1; attempt <= maxRetries; attempt++) {
            try {
                const response = await fetch(this.apiEndpoints.report, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
                    },
                    body: JSON.stringify(this.formatReportData(caseData)),
                    signal: AbortSignal.timeout(timeout)
                });

                if (response.ok) {
                    const result = await response.json();
                    return result;
                } else {
                    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
                }
            } catch (error) {
                if (attempt === maxRetries) {
                    throw new Error(`提交失败，已重试${maxRetries}次: ${error.message}`);
                }
                await this.delay(1000 * attempt);
            }
        }
    }

    formatReportData(caseData) {
        return {
            aid: caseData.infringedContent.aid,
            bvid: caseData.infringedContent.bvid,
            reason: this.determineReportReason(caseData),
            desc: this.generateReportDescription(caseData),
            type: 1,
            oid: caseData.infringedContent.aid,
            csrf: this.getCsrfToken()
        };
    }

    determineReportReason(caseData) {
        const desc = caseData.evidenceDesc.toLowerCase();
        
        if (desc.includes('版权') || desc.includes('著作权')) return 1;
        if (desc.includes('抄袭') || desc.includes('盗用')) return 2;
        if (desc.includes('色情') || desc.includes('低俗')) return 3;
        if (desc.includes('暴力') || desc.includes('血腥')) return 4;
        if (desc.includes('政治') || desc.includes('敏感')) return 5;
        return 6;
    }

    generateReportDescription(caseData) {
        return `侵权举报：

原创作品：${caseData.originalWork}
侵权描述：${caseData.evidenceDesc}

侵权视频信息：
标题：${caseData.infringedContent.title}
UP主：${caseData.infringedContent.uploader}
链接：${caseData.infringedContent.url}
发布时间：${caseData.infringedContent.publishTime}

请管理员核实处理。`;
    }

    getCsrfToken() {
        // 从cookie中获取csrf token
        const cookies = document.cookie.split(';');
        for (const cookie of cookies) {
            const [name, value] = cookie.trim().split('=');
            if (name === 'bili_jct') {
                return value;
            }
        }
        return '';
    }

    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    async handleGetCases(request, sender, sendResponse) {
        try {
            const cases = Array.from(this.cases.values());
            sendResponse({ success: true, cases });
        } catch (error) {
            sendResponse({ success: false, error: error.message });
        }
    }

    async handleUpdateCase(request, sender, sendResponse) {
        try {
            const caseId = request.caseId;
            const updates = request.updates;
            
            if (!this.cases.has(caseId)) {
                throw new Error('案件不存在');
            }

            const existingCase = this.cases.get(caseId);
            const updatedCase = { ...existingCase, ...updates };
            
            this.cases.set(caseId, updatedCase);
            await this.saveCases();

            sendResponse({ success: true, case: updatedCase });
        } catch (error) {
            sendResponse({ success: false, error: error.message });
        }
    }

    async handleDeleteCase(request, sender, sendResponse) {
        try {
            const caseId = request.caseId;
            
            if (!this.cases.has(caseId)) {
                throw new Error('案件不存在');
            }

            this.cases.delete(caseId);
            await this.saveCases();

            sendResponse({ success: true });
        } catch (error) {
            sendResponse({ success: false, error: error.message });
        }
    }

    async handleGetSettings(request, sender, sendResponse) {
        try {
            const settings = Object.fromEntries(this.settings);
            sendResponse({ success: true, settings });
        } catch (error) {
            sendResponse({ success: false, error: error.message });
        }
    }

    async handleUpdateSettings(request, sender, sendResponse) {
        try {
            const newSettings = request.settings;
            
            for (const [key, value] of Object.entries(newSettings)) {
                this.settings.set(key, value);
            }
            
            await this.saveSettings();
            sendResponse({ success: true });
        } catch (error) {
            sendResponse({ success: false, error: error.message });
        }
    }

    async handleOpenPopup(request, sender, sendResponse) {
        try {
            await this.openPopupForTab(sender.tab);
            sendResponse({ success: true });
        } catch (error) {
            sendResponse({ success: false, error: error.message });
        }
    }

    async openPopupForTab(tab) {
        await chrome.action.openPopup();
    }

    async handleOpenDashboard(request, sender, sendResponse) {
        try {
            await this.openDashboard();
            sendResponse({ success: true });
        } catch (error) {
            sendResponse({ success: false, error: error.message });
        }
    }

    async openDashboard() {
        await chrome.tabs.create({
            url: chrome.runtime.getURL('pages/dashboard.html')
        });
    }

    async handleShowNotification(request, sender, sendResponse) {
        try {
            await this.showNotification(request.message, request.type);
            sendResponse({ success: true });
        } catch (error) {
            sendResponse({ success: false, error: error.message });
        }
    }

    async showNotification(message, type = 'info') {
        if (!this.settings.get('notifications')) return;

        // 安全地使用通知API
        if (chrome.notifications) {
            const notificationId = `bilibili-report-${Date.now()}`;
            
            try {
                await chrome.notifications.create(notificationId, {
                    type: 'basic',
                    iconUrl: 'icons/icon128.png',
                    title: 'B站侵权举报助手',
                    message: message
                });

                setTimeout(() => {
                    chrome.notifications.clear(notificationId);
                }, 5000);
            } catch (error) {
                console.warn('通知API调用失败:', error);
            }
        }
    }

    async handleTakeScreenshot(request, sender, sendResponse) {
        try {
            const tabId = sender.tab.id;
            const dataUrl = await chrome.tabs.captureVisibleTab();
            sendResponse({ success: true, screenshot: dataUrl });
        } catch (error) {
            sendResponse({ success: false, error: error.message });
        }
    }

    async handleExportData(request, sender, sendResponse) {
        try {
            const exportData = {
                cases: Array.from(this.cases.values()),
                settings: Object.fromEntries(this.settings),
                exportedAt: new Date().toISOString(),
                version: chrome.runtime.getManifest().version
            };

            const blob = new Blob([JSON.stringify(exportData, null, 2)], {
                type: 'application/json'
            });

            const url = URL.createObjectURL(blob);
            const filename = `bilibili-report-export-${new Date().toISOString().split('T')[0]}.json`;

            await chrome.downloads.download({
                url: url,
                filename: filename,
                saveAs: true
            });

            sendResponse({ success: true });
        } catch (error) {
            sendResponse({ success: false, error: error.message });
        }
    }

    async handleImportData(request, sender, sendResponse) {
        try {
            const importData = request.data;
            
            if (importData.cases) {
                for (const caseData of importData.cases) {
                    this.cases.set(caseData.id, caseData);
                }
            }

            if (importData.settings) {
                for (const [key, value] of Object.entries(importData.settings)) {
                    this.settings.set(key, value);
                }
            }

            await this.saveCases();
            await this.saveSettings();

            sendResponse({ success: true });
        } catch (error) {
            sendResponse({ success: false, error: error.message });
        }
    }

    handleContextMenuClick(info, tab) {
        switch (info.menuItemId) {
            case 'bilibili-report-capture':
                this.handleContextMenuCapture(info, tab);
                break;
            case 'bilibili-report-quick':
                this.handleContextMenuQuickReport(info, tab);
                break;
        }
    }

    async handleContextMenuCapture(info, tab) {
        try {
            const captureData = {
                url: tab.url,
                title: tab.title,
                selection: info.selectionText,
                linkUrl: info.linkUrl,
                srcUrl: info.srcUrl,
                timestamp: Date.now()
            };

            const caseData = {
                infringedContent: captureData,
                originalWork: '',
                evidenceDesc: info.selectionText || '通过右键菜单抓取的侵权内容',
                createdAt: new Date().toISOString(),
                status: 'pending'
            };

            const caseId = Date.now().toString();
            this.cases.set(caseId, caseData);
            await this.saveCases();

            await this.showNotification('侵权信息已抓取并创建案件', 'success');
        } catch (error) {
            console.error('右键抓取失败:', error);
        }
    }

    async handleContextMenuQuickReport(info, tab) {
        try {
            await this.openPopupForTab(tab);
            await this.showNotification('请在弹窗中完成举报流程', 'info');
        } catch (error) {
            console.error('快速举报失败:', error);
        }
    }

    handleStorageChange(changes, areaName) {
        if (areaName === 'local') {
            if (changes.cases) {
                this.cases = new Map(Object.entries(changes.cases.newValue || {}));
            }
            if (changes.settings) {
                this.settings = new Map(Object.entries(changes.settings.newValue || {}));
            }
        }
    }

    handleNavigationComplete(details) {
        if (details.url && details.url.includes('bilibili.com')) {
            this.activeTabs.set(details.tabId, {
                url: details.url,
                timestamp: Date.now()
            });
        }
    }

    handleAlarm(alarm) {
        switch (alarm.name) {
            case 'cleanup':
                this.cleanupOldData();
                break;
            case 'sync':
                this.syncWithServer();
                break;
            case 'updateCheck':
                this.checkForUpdates();
                break;
        }
    }

    async cleanupOldData() {
        const now = Date.now();
        const maxAge = 30 * 24 * 60 * 60 * 1000; // 30天

        for (const [caseId, caseData] of this.cases.entries()) {
            const caseAge = now - new Date(caseData.createdAt).getTime();
            if (caseAge > maxAge && caseData.status === 'submitted') {
                this.cases.delete(caseId);
            }
        }

        await this.saveCases();
    }

    async syncWithServer() {
        // 这里可以实现与服务器同步的逻辑
        console.log('同步数据到服务器');
    }

    async checkForUpdates() {
        // 这里可以实现检查更新的逻辑
        console.log('检查插件更新');
    }

    async scheduleAutoCapture(tabId) {
        setTimeout(async () => {
            try {
                if (this.activeTabs.has(tabId)) {
                    await this.captureTabData(tabId, { auto: true });
                }
            } catch (error) {
                console.error('自动抓取失败:', error);
            }
        }, 3000);
    }

    async saveCases() {
        const casesObject = Object.fromEntries(this.cases);
        await chrome.storage.local.set({ cases: casesObject });
    }

    async saveSettings() {
        const settingsObject = Object.fromEntries(this.settings);
        await chrome.storage.local.set({ settings: settingsObject });
    }

    async showWelcomeMessage() {
        await this.showNotification('欢迎使用B站侵权举报助手！点击图标开始使用', 'info');
    }

    async showUpdateMessage(previousVersion) {
        await this.showNotification(`插件已更新到版本 ${chrome.runtime.getManifest().version}`, 'info');
    }
}

// 初始化服务
const backgroundService = new BackgroundService();