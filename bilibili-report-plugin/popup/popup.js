class PopupManager {
    constructor() {
        this.currentTab = null;
        this.capturedData = null;
        this.currentCase = null;
        this.init();
    }

    async init() {
        await this.getCurrentTab();
        this.bindEvents();
        this.updateStatus();
    }

    async getCurrentTab() {
        const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
        this.currentTab = tabs[0];
    }

    bindEvents() {
        document.getElementById('captureBtn').addEventListener('click', () => this.captureData());
        document.getElementById('createCaseBtn').addEventListener('click', () => this.showCaseForm());
        document.getElementById('saveCaseBtn').addEventListener('click', () => this.saveCase());
        document.getElementById('cancelCaseBtn').addEventListener('click', () => this.hideCaseForm());
        document.getElementById('submitReportBtn').addEventListener('click', () => this.submitReport());
        document.getElementById('dashboardBtn').addEventListener('click', () => this.openDashboard());
        document.getElementById('settingsBtn').addEventListener('click', () => this.openSettings());
    }

    async updateStatus() {
        const statusIndicator = document.getElementById('statusIndicator');
        const statusText = document.getElementById('statusText');
        const captureBtn = document.getElementById('captureBtn');

        if (!this.currentTab || !this.currentTab.url.includes('bilibili.com')) {
            statusIndicator.className = 'status-indicator error';
            statusText.textContent = '请在B站页面使用';
            captureBtn.disabled = true;
            return;
        }

        statusIndicator.className = 'status-indicator active';
        statusText.textContent = 'B站页面已就绪';
        captureBtn.disabled = false;
    }

    async captureData() {
        const captureBtn = document.getElementById('captureBtn');
        const originalText = captureBtn.textContent;
        
        captureBtn.classList.add('loading');
        captureBtn.disabled = true;

        try {
            const response = await chrome.tabs.sendMessage(this.currentTab.id, {
                action: 'captureData'
            });

            if (response && response.success) {
                this.capturedData = response.data;
                this.displayCapturedData();
                document.getElementById('createCaseBtn').disabled = false;
            } else {
                this.showError('数据抓取失败：' + (response?.error || '未知错误'));
            }
        } catch (error) {
            this.showError('抓取失败：' + error.message);
        } finally {
            captureBtn.classList.remove('loading');
            captureBtn.textContent = originalText;
            captureBtn.disabled = false;
        }
    }

    displayCapturedData() {
        const capturedInfo = document.getElementById('capturedInfo');
        const data = this.capturedData;

        document.getElementById('videoTitle').textContent = data.title || '-';
        document.getElementById('uploader').textContent = data.uploader || '-';
        document.getElementById('videoUrl').textContent = data.url || '-';
        document.getElementById('publishTime').textContent = data.publishTime || '-';

        capturedInfo.classList.remove('hidden');
    }

    showCaseForm() {
        document.getElementById('caseForm').classList.remove('hidden');
        document.getElementById('createCaseBtn').style.display = 'none';
    }

    hideCaseForm() {
        document.getElementById('caseForm').classList.add('hidden');
        document.getElementById('createCaseBtn').style.display = 'block';
        this.clearCaseForm();
    }

    clearCaseForm() {
        document.getElementById('originalWork').value = '';
        document.getElementById('evidenceDesc').value = '';
    }

    async saveCase() {
        const originalWork = document.getElementById('originalWork').value.trim();
        const evidenceDesc = document.getElementById('evidenceDesc').value.trim();

        if (!originalWork) {
            this.showError('请输入原创作品链接');
            return;
        }

        if (!evidenceDesc) {
            this.showError('请输入侵权描述');
            return;
        }

        const saveBtn = document.getElementById('saveCaseBtn');
        const originalText = saveBtn.textContent;
        
        saveBtn.classList.add('loading');
        saveBtn.disabled = true;

        try {
            this.currentCase = {
                id: Date.now().toString(),
                infringedContent: this.capturedData,
                originalWork: originalWork,
                evidenceDesc: evidenceDesc,
                createdAt: new Date().toISOString(),
                status: 'pending'
            };

            await this.saveCaseToStorage();
            this.hideCaseForm();
            document.getElementById('submitReportBtn').disabled = false;
            this.showSuccess('案件创建成功');
        } catch (error) {
            this.showError('保存失败：' + error.message);
        } finally {
            saveBtn.classList.remove('loading');
            saveBtn.textContent = originalText;
            saveBtn.disabled = false;
        }
    }

    async saveCaseToStorage() {
        return new Promise((resolve, reject) => {
            chrome.storage.local.get(['cases'], (result) => {
                const cases = result.cases || [];
                cases.push(this.currentCase);
                
                chrome.storage.local.set({ cases }, () => {
                    if (chrome.runtime.lastError) {
                        reject(chrome.runtime.lastError);
                    } else {
                        resolve();
                    }
                });
            });
        });
    }

    async submitReport() {
        if (!this.currentCase) {
            this.showError('请先创建案件');
            return;
        }

        const submitBtn = document.getElementById('submitReportBtn');
        const originalText = submitBtn.textContent;
        
        submitBtn.classList.add('loading');
        submitBtn.disabled = true;

        try {
            const response = await chrome.tabs.sendMessage(this.currentTab.id, {
                action: 'submitReport',
                caseData: this.currentCase
            });

            if (response && response.success) {
                this.currentCase.status = 'submitted';
                this.currentCase.submittedAt = new Date().toISOString();
                await this.updateCaseInStorage();
                this.showSuccess('举报提交成功');
                
                setTimeout(() => {
                    window.close();
                }, 2000);
            } else {
                this.showError('举报提交失败：' + (response?.error || '未知错误'));
            }
        } catch (error) {
            this.showError('提交失败：' + error.message);
        } finally {
            submitBtn.classList.remove('loading');
            submitBtn.textContent = originalText;
            submitBtn.disabled = false;
        }
    }

    async updateCaseInStorage() {
        return new Promise((resolve, reject) => {
            chrome.storage.local.get(['cases'], (result) => {
                const cases = result.cases || [];
                const index = cases.findIndex(c => c.id === this.currentCase.id);
                
                if (index !== -1) {
                    cases[index] = this.currentCase;
                    chrome.storage.local.set({ cases }, () => {
                        if (chrome.runtime.lastError) {
                            reject(chrome.runtime.lastError);
                        } else {
                            resolve();
                        }
                    });
                } else {
                    reject(new Error('案件不存在'));
                }
            });
        });
    }

    openDashboard() {
        chrome.tabs.create({ url: chrome.runtime.getURL('pages/dashboard.html') });
        window.close();
    }

    openSettings() {
        chrome.tabs.create({ url: chrome.runtime.getURL('pages/settings.html') });
        window.close();
    }

    showError(message) {
        this.showNotification(message, 'error');
    }

    showSuccess(message) {
        this.showNotification(message, 'success');
    }

    showNotification(message, type = 'info') {
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.textContent = message;
        
        Object.assign(notification.style, {
            position: 'fixed',
            top: '20px',
            right: '20px',
            padding: '12px 16px',
            borderRadius: '6px',
            color: 'white',
            fontSize: '14px',
            zIndex: '10000',
            maxWidth: '300px',
            wordWrap: 'break-word'
        });

        if (type === 'error') {
            notification.style.background = '#dc3545';
        } else if (type === 'success') {
            notification.style.background = '#28a745';
        } else {
            notification.style.background = '#17a2b8';
        }

        document.body.appendChild(notification);

        setTimeout(() => {
            notification.remove();
        }, 3000);
    }
}

document.addEventListener('DOMContentLoaded', () => {
    new PopupManager();
});