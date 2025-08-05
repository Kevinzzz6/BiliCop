class DashboardManager {
    constructor() {
        this.cases = [];
        this.settings = {};
        this.currentCase = null;
        this.init();
    }

    async init() {
        await this.loadData();
        this.bindEvents();
        this.renderDashboard();
        this.loadSettings();
    }

    async loadData() {
        try {
            const response = await chrome.runtime.sendMessage({ action: 'getCases' });
            if (response.success) {
                this.cases = response.cases;
            } else {
                console.error('加载案件失败:', response.error);
            }
        } catch (error) {
            console.error('加载数据失败:', error);
        }
    }

    async loadSettings() {
        try {
            const response = await chrome.runtime.sendMessage({ action: 'getSettings' });
            if (response.success) {
                this.settings = response.settings;
                this.renderSettings();
            }
        } catch (error) {
            console.error('加载设置失败:', error);
        }
    }

    bindEvents() {
        // 导航事件
        document.getElementById('dashboardTab').addEventListener('click', () => this.showDashboard());
        document.getElementById('settingsTab').addEventListener('click', () => this.showSettings());

        // 案件管理事件
        document.getElementById('refreshBtn').addEventListener('click', () => this.refreshCases());
        document.getElementById('exportBtn').addEventListener('click', () => this.exportData());
        document.getElementById('importBtn').addEventListener('click', () => this.showImportModal());

        // 筛选事件
        document.getElementById('statusFilter').addEventListener('change', () => this.filterCases());
        document.getElementById('dateFilter').addEventListener('change', () => this.filterCases());
        document.getElementById('searchInput').addEventListener('input', () => this.filterCases());

        // 设置事件
        document.getElementById('saveSettingsBtn').addEventListener('click', () => this.saveSettings());
        document.getElementById('resetSettingsBtn').addEventListener('click', () => this.resetSettings());
        document.getElementById('clearDataBtn').addEventListener('click', () => this.clearData());

        // 模态框事件
        document.querySelectorAll('.close-btn').forEach(btn => {
            btn.addEventListener('click', (e) => this.closeModal(e.target.closest('.modal')));
        });

        document.getElementById('editCaseBtn').addEventListener('click', () => this.showEditModal());
        document.getElementById('submitCaseBtn').addEventListener('click', () => this.submitCase());
        document.getElementById('deleteCaseBtn').addEventListener('click', () => this.deleteCase());

        document.getElementById('saveEditBtn').addEventListener('click', () => this.saveEditCase());
        document.getElementById('cancelEditBtn').addEventListener('click', () => this.closeModal('editCaseModal'));

        document.getElementById('confirmImportBtn').addEventListener('click', () => this.importData());
        document.getElementById('cancelImportBtn').addEventListener('click', () => this.closeModal('importModal'));

        document.getElementById('confirmActionBtn').addEventListener('click', () => this.executeConfirmedAction());
        document.getElementById('cancelConfirmBtn').addEventListener('click', () => this.closeModal('confirmModal'));

        // 文件选择事件
        document.getElementById('importFile').addEventListener('change', (e) => this.handleFileSelect(e));

        // 点击模态框外部关闭
        document.querySelectorAll('.modal').forEach(modal => {
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    this.closeModal(modal);
                }
            });
        });
    }

    showDashboard() {
        document.getElementById('dashboardTab').classList.add('active');
        document.getElementById('settingsTab').classList.remove('active');
        document.getElementById('dashboardSection').classList.add('active');
        document.getElementById('settingsSection').classList.remove('active');
    }

    showSettings() {
        document.getElementById('settingsTab').classList.add('active');
        document.getElementById('dashboardTab').classList.remove('active');
        document.getElementById('settingsSection').classList.add('active');
        document.getElementById('dashboardSection').classList.remove('active');
    }

    renderDashboard() {
        this.updateStats();
        this.renderCasesList();
    }

    updateStats() {
        const totalCases = this.cases.length;
        const pendingCases = this.cases.filter(c => c.status === 'pending').length;
        const submittedCases = this.cases.filter(c => c.status === 'submitted').length;
        const successCases = this.cases.filter(c => c.status === 'success').length;
        const successRate = totalCases > 0 ? Math.round((successCases / totalCases) * 100) : 0;

        document.getElementById('totalCases').textContent = totalCases;
        document.getElementById('pendingCases').textContent = pendingCases;
        document.getElementById('submittedCases').textContent = submittedCases;
        document.getElementById('successRate').textContent = successRate + '%';
    }

    renderCasesList() {
        const casesList = document.getElementById('casesList');
        const filteredCases = this.getFilteredCases();

        if (filteredCases.length === 0) {
            casesList.innerHTML = `
                <div class="empty-state">
                    <div class="empty-state-icon">📁</div>
                    <div class="empty-state-text">暂无案件数据</div>
                    <button class="btn-primary" onclick="window.close()">关闭页面</button>
                </div>
            `;
            return;
        }

        casesList.innerHTML = filteredCases.map(caseItem => this.renderCaseItem(caseItem)).join('');

        // 绑定案件项事件
        filteredCases.forEach(caseItem => {
            const element = document.querySelector(`[data-case-id="${caseItem.id}"]`);
            if (element) {
                element.querySelector('.view-btn').addEventListener('click', () => this.viewCase(caseItem.id));
                element.querySelector('.edit-btn').addEventListener('click', () => this.editCase(caseItem.id));
                element.querySelector('.submit-btn').addEventListener('click', () => this.submitCaseById(caseItem.id));
                element.querySelector('.delete-btn').addEventListener('click', () => this.confirmDeleteCase(caseItem.id));
            }
        });
    }

    renderCaseItem(caseItem) {
        const statusClass = `status-${caseItem.status}`;
        const statusText = this.getStatusText(caseItem.status);
        const createdTime = new Date(caseItem.createdAt).toLocaleString('zh-CN');

        return `
            <div class="case-item" data-case-id="${caseItem.id}">
                <div class="case-header">
                    <div>
                        <div class="case-title">${this.escapeHtml(caseItem.infringedContent?.title || '未知标题')}</div>
                        <div class="case-uploader">UP主: ${this.escapeHtml(caseItem.infringedContent?.uploader || '未知')}</div>
                    </div>
                    <div class="case-status ${statusClass}">${statusText}</div>
                </div>
                <div class="case-content">
                    <div class="case-info">
                        <div>创建时间: ${createdTime}</div>
                        <div>原创作品: ${this.escapeHtml(caseItem.originalWork || '未填写')}</div>
                    </div>
                    <div class="case-info">
                        <div>侵权描述: ${this.escapeHtml(caseItem.evidenceDesc || '未填写').substring(0, 50)}${caseItem.evidenceDesc?.length > 50 ? '...' : ''}</div>
                        <div>链接: <a href="${this.escapeHtml(caseItem.infringedContent?.url || '#')}" target="_blank">查看</a></div>
                    </div>
                </div>
                <div class="case-actions">
                    <button class="btn-secondary view-btn">查看</button>
                    <button class="btn-secondary edit-btn">编辑</button>
                    ${caseItem.status === 'pending' ? `<button class="btn-primary submit-btn">提交</button>` : ''}
                    <button class="btn-danger delete-btn">删除</button>
                </div>
            </div>
        `;
    }

    getStatusText(status) {
        const statusMap = {
            'pending': '待处理',
            'submitted': '已提交',
            'success': '成功',
            'failed': '失败'
        };
        return statusMap[status] || status;
    }

    getFilteredCases() {
        let filtered = [...this.cases];

        // 状态筛选
        const statusFilter = document.getElementById('statusFilter').value;
        if (statusFilter !== 'all') {
            filtered = filtered.filter(c => c.status === statusFilter);
        }

        // 时间筛选
        const dateFilter = document.getElementById('dateFilter').value;
        if (dateFilter !== 'all') {
            const now = new Date();
            let startDate;
            
            switch (dateFilter) {
                case 'today':
                    startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
                    break;
                case 'week':
                    startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
                    break;
                case 'month':
                    startDate = new Date(now.getFullYear(), now.getMonth(), 1);
                    break;
            }
            
            if (startDate) {
                filtered = filtered.filter(c => new Date(c.createdAt) >= startDate);
            }
        }

        // 搜索筛选
        const searchTerm = document.getElementById('searchInput').value.toLowerCase();
        if (searchTerm) {
            filtered = filtered.filter(c => {
                const title = (c.infringedContent?.title || '').toLowerCase();
                const uploader = (c.infringedContent?.uploader || '').toLowerCase();
                const desc = (c.evidenceDesc || '').toLowerCase();
                const original = (c.originalWork || '').toLowerCase();
                
                return title.includes(searchTerm) || 
                       uploader.includes(searchTerm) || 
                       desc.includes(searchTerm) || 
                       original.includes(searchTerm);
            });
        }

        // 按创建时间倒序排列
        filtered.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

        return filtered;
    }

    filterCases() {
        this.renderCasesList();
    }

    async refreshCases() {
        const refreshBtn = document.getElementById('refreshBtn');
        const originalText = refreshBtn.textContent;
        
        refreshBtn.classList.add('loading');
        refreshBtn.disabled = true;

        try {
            await this.loadData();
            this.renderDashboard();
            this.showNotification('案件列表已刷新', 'success');
        } catch (error) {
            this.showNotification('刷新失败: ' + error.message, 'error');
        } finally {
            refreshBtn.classList.remove('loading');
            refreshBtn.textContent = originalText;
            refreshBtn.disabled = false;
        }
    }

    viewCase(caseId) {
        const caseItem = this.cases.find(c => c.id === caseId);
        if (!caseItem) return;

        this.currentCase = caseItem;
        this.renderCaseDetail();
        this.showModal('caseModal');
    }

    renderCaseDetail() {
        if (!this.currentCase) return;

        const caseItem = this.currentCase;
        
        document.getElementById('detailTitle').textContent = this.escapeHtml(caseItem.infringedContent?.title || '未知标题');
        document.getElementById('detailUploader').textContent = this.escapeHtml(caseItem.infringedContent?.uploader || '未知');
        document.getElementById('detailUrl').textContent = this.escapeHtml(caseItem.infringedContent?.url || '#');
        document.getElementById('detailUrl').href = this.escapeHtml(caseItem.infringedContent?.url || '#');
        document.getElementById('detailPublishTime').textContent = this.escapeHtml(caseItem.infringedContent?.publishTime || '未知');
        
        document.getElementById('detailOriginalWork').textContent = this.escapeHtml(caseItem.originalWork || '未填写');
        document.getElementById('detailOriginalWork').href = this.escapeHtml(caseItem.originalWork || '#');
        
        document.getElementById('detailEvidenceDesc').textContent = this.escapeHtml(caseItem.evidenceDesc || '未填写');
        
        document.getElementById('detailCaseId').textContent = caseItem.id;
        document.getElementById('detailCreatedAt').textContent = new Date(caseItem.createdAt).toLocaleString('zh-CN');
        
        const statusElement = document.getElementById('detailStatus');
        statusElement.textContent = this.getStatusText(caseItem.status);
        statusElement.className = `status-badge status-${caseItem.status}`;
        
        if (caseItem.submittedAt) {
            document.getElementById('detailSubmittedAtContainer').style.display = 'flex';
            document.getElementById('detailSubmittedAt').textContent = new Date(caseItem.submittedAt).toLocaleString('zh-CN');
        } else {
            document.getElementById('detailSubmittedAtContainer').style.display = 'none';
        }
        
        if (caseItem.reportResult) {
            document.getElementById('detailResultSection').style.display = 'block';
            document.getElementById('detailResult').textContent = JSON.stringify(caseItem.reportResult, null, 2);
        } else {
            document.getElementById('detailResultSection').style.display = 'none';
        }

        // 更新按钮状态
        const submitBtn = document.getElementById('submitCaseBtn');
        const editBtn = document.getElementById('editCaseBtn');
        
        if (caseItem.status === 'pending') {
            submitBtn.style.display = 'inline-block';
            submitBtn.disabled = false;
        } else {
            submitBtn.style.display = 'none';
        }
        
        if (caseItem.status === 'pending') {
            editBtn.style.display = 'inline-block';
        } else {
            editBtn.style.display = 'none';
        }
    }

    editCase(caseId) {
        const caseItem = this.cases.find(c => c.id === caseId);
        if (!caseItem) return;

        this.currentCase = caseItem;
        
        document.getElementById('editOriginalWork').value = caseItem.originalWork || '';
        document.getElementById('editEvidenceDesc').value = caseItem.evidenceDesc || '';
        
        this.showModal('editCaseModal');
    }

    showEditModal() {
        if (!this.currentCase) return;
        
        document.getElementById('editOriginalWork').value = this.currentCase.originalWork || '';
        document.getElementById('editEvidenceDesc').value = this.currentCase.evidenceDesc || '';
        
        this.showModal('editCaseModal');
    }

    async saveEditCase() {
        if (!this.currentCase) return;

        const originalWork = document.getElementById('editOriginalWork').value.trim();
        const evidenceDesc = document.getElementById('editEvidenceDesc').value.trim();

        if (!originalWork) {
            this.showNotification('请输入原创作品链接', 'error');
            return;
        }

        if (!evidenceDesc) {
            this.showNotification('请输入侵权描述', 'error');
            return;
        }

        const saveBtn = document.getElementById('saveEditBtn');
        const originalText = saveBtn.textContent;
        
        saveBtn.classList.add('loading');
        saveBtn.disabled = true;

        try {
            const response = await chrome.runtime.sendMessage({
                action: 'updateCase',
                caseId: this.currentCase.id,
                updates: {
                    originalWork,
                    evidenceDesc
                }
            });

            if (response.success) {
                this.currentCase.originalWork = originalWork;
                this.currentCase.evidenceDesc = evidenceDesc;
                
                // 更新本地数据
                const index = this.cases.findIndex(c => c.id === this.currentCase.id);
                if (index !== -1) {
                    this.cases[index] = this.currentCase;
                }
                
                this.renderDashboard();
                this.renderCaseDetail();
                this.closeModal('editCaseModal');
                this.showNotification('案件更新成功', 'success');
            } else {
                this.showNotification('更新失败: ' + response.error, 'error');
            }
        } catch (error) {
            this.showNotification('更新失败: ' + error.message, 'error');
        } finally {
            saveBtn.classList.remove('loading');
            saveBtn.textContent = originalText;
            saveBtn.disabled = false;
        }
    }

    async submitCase() {
        if (!this.currentCase) return;

        const submitBtn = document.getElementById('submitCaseBtn');
        const originalText = submitBtn.textContent;
        
        submitBtn.classList.add('loading');
        submitBtn.disabled = true;

        try {
            const response = await chrome.runtime.sendMessage({
                action: 'submitReport',
                caseId: this.currentCase.id
            });

            if (response.success) {
                this.currentCase.status = 'submitted';
                this.currentCase.submittedAt = new Date().toISOString();
                this.currentCase.reportResult = response.result;
                
                // 更新本地数据
                const index = this.cases.findIndex(c => c.id === this.currentCase.id);
                if (index !== -1) {
                    this.cases[index] = this.currentCase;
                }
                
                this.renderDashboard();
                this.renderCaseDetail();
                this.showNotification('举报提交成功', 'success');
            } else {
                this.showNotification('提交失败: ' + response.error, 'error');
            }
        } catch (error) {
            this.showNotification('提交失败: ' + error.message, 'error');
        } finally {
            submitBtn.classList.remove('loading');
            submitBtn.textContent = originalText;
            submitBtn.disabled = false;
        }
    }

    async submitCaseById(caseId) {
        const caseItem = this.cases.find(c => c.id === caseId);
        if (!caseItem) return;

        this.currentCase = caseItem;
        await this.submitCase();
    }

    confirmDeleteCase(caseId) {
        const caseItem = this.cases.find(c => c.id === caseId);
        if (!caseItem) return;

        this.currentCase = caseItem;
        
        document.getElementById('confirmMessage').textContent = `确定要删除案件 "${this.escapeHtml(caseItem.infringedContent?.title || '未知标题')}" 吗？此操作不可撤销。`;
        this.pendingAction = () => this.deleteCase();
        
        this.showModal('confirmModal');
    }

    async deleteCase() {
        if (!this.currentCase) return;

        try {
            const response = await chrome.runtime.sendMessage({
                action: 'deleteCase',
                caseId: this.currentCase.id
            });

            if (response.success) {
                // 从本地数据中删除
                this.cases = this.cases.filter(c => c.id !== this.currentCase.id);
                
                this.renderDashboard();
                this.closeModal('caseModal');
                this.closeModal('confirmModal');
                this.showNotification('案件删除成功', 'success');
                
                this.currentCase = null;
            } else {
                this.showNotification('删除失败: ' + response.error, 'error');
            }
        } catch (error) {
            this.showNotification('删除失败: ' + error.message, 'error');
        }
    }

    renderSettings() {
        const settings = this.settings;
        
        document.getElementById('autoCapture').checked = settings.autoCapture || false;
        document.getElementById('autoSubmit').checked = settings.autoSubmit || false;
        document.getElementById('notifications').checked = settings.notifications || false;
        document.getElementById('debugMode').checked = settings.debugMode || false;
        document.getElementById('apiTimeout').value = settings.apiTimeout || 30000;
        document.getElementById('maxRetries').value = settings.maxRetries || 3;
        document.getElementById('evidenceScreenshots').checked = settings.evidenceScreenshots || false;
        document.getElementById('reportTemplate').value = settings.reportTemplate || 'default';
        document.getElementById('language').value = settings.language || 'zh-CN';
    }

    async saveSettings() {
        const newSettings = {
            autoCapture: document.getElementById('autoCapture').checked,
            autoSubmit: document.getElementById('autoSubmit').checked,
            notifications: document.getElementById('notifications').checked,
            debugMode: document.getElementById('debugMode').checked,
            apiTimeout: parseInt(document.getElementById('apiTimeout').value),
            maxRetries: parseInt(document.getElementById('maxRetries').value),
            evidenceScreenshots: document.getElementById('evidenceScreenshots').checked,
            reportTemplate: document.getElementById('reportTemplate').value,
            language: document.getElementById('language').value
        };

        const saveBtn = document.getElementById('saveSettingsBtn');
        const originalText = saveBtn.textContent;
        
        saveBtn.classList.add('loading');
        saveBtn.disabled = true;

        try {
            const response = await chrome.runtime.sendMessage({
                action: 'updateSettings',
                settings: newSettings
            });

            if (response.success) {
                this.settings = newSettings;
                this.showNotification('设置保存成功', 'success');
            } else {
                this.showNotification('保存失败: ' + response.error, 'error');
            }
        } catch (error) {
            this.showNotification('保存失败: ' + error.message, 'error');
        } finally {
            saveBtn.classList.remove('loading');
            saveBtn.textContent = originalText;
            saveBtn.disabled = false;
        }
    }

    resetSettings() {
        document.getElementById('confirmMessage').textContent = '确定要重置所有设置为默认值吗？';
        this.pendingAction = () => this.executeResetSettings();
        
        this.showModal('confirmModal');
    }

    async executeResetSettings() {
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

        try {
            const response = await chrome.runtime.sendMessage({
                action: 'updateSettings',
                settings: defaultSettings
            });

            if (response.success) {
                this.settings = defaultSettings;
                this.renderSettings();
                this.closeModal('confirmModal');
                this.showNotification('设置已重置为默认值', 'success');
            } else {
                this.showNotification('重置失败: ' + response.error, 'error');
            }
        } catch (error) {
            this.showNotification('重置失败: ' + error.message, 'error');
        }
    }

    clearData() {
        document.getElementById('confirmMessage').textContent = '确定要清空所有案件数据吗？此操作不可撤销。';
        this.pendingAction = () => this.executeClearData();
        
        this.showModal('confirmModal');
    }

    async executeClearData() {
        try {
            // 批量删除所有案件
            for (const caseItem of this.cases) {
                await chrome.runtime.sendMessage({
                    action: 'deleteCase',
                    caseId: caseItem.id
                });
            }

            this.cases = [];
            this.renderDashboard();
            this.closeModal('confirmModal');
            this.showNotification('所有数据已清空', 'success');
        } catch (error) {
            this.showNotification('清空失败: ' + error.message, 'error');
        }
    }

    async exportData() {
        try {
            await chrome.runtime.sendMessage({ action: 'exportData' });
            this.showNotification('数据导出成功', 'success');
        } catch (error) {
            this.showNotification('导出失败: ' + error.message, 'error');
        }
    }

    showImportModal() {
        document.getElementById('importFile').value = '';
        this.showModal('importModal');
    }

    handleFileSelect(event) {
        const file = event.target.files[0];
        if (!file) return;

        if (file.type !== 'application/json') {
            this.showNotification('请选择JSON文件', 'error');
            event.target.value = '';
            return;
        }

        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const data = JSON.parse(e.target.result);
                this.importDataContent = data;
                this.showNotification('文件读取成功，点击导入按钮完成导入', 'success');
            } catch (error) {
                this.showNotification('文件格式错误: ' + error.message, 'error');
                event.target.value = '';
            }
        };
        reader.readAsText(file);
    }

    async importData() {
        if (!this.importDataContent) {
            this.showNotification('请先选择要导入的文件', 'error');
            return;
        }

        const importBtn = document.getElementById('confirmImportBtn');
        const originalText = importBtn.textContent;
        
        importBtn.classList.add('loading');
        importBtn.disabled = true;

        try {
            const response = await chrome.runtime.sendMessage({
                action: 'importData',
                data: this.importDataContent
            });

            if (response.success) {
                await this.loadData();
                this.renderDashboard();
                this.closeModal('importModal');
                this.showNotification('数据导入成功', 'success');
                this.importDataContent = null;
            } else {
                this.showNotification('导入失败: ' + response.error, 'error');
            }
        } catch (error) {
            this.showNotification('导入失败: ' + error.message, 'error');
        } finally {
            importBtn.classList.remove('loading');
            importBtn.textContent = originalText;
            importBtn.disabled = false;
        }
    }

    executeConfirmedAction() {
        if (this.pendingAction) {
            this.pendingAction();
            this.pendingAction = null;
        }
    }

    showModal(modalId) {
        const modal = document.getElementById(modalId);
        modal.classList.add('show');
        document.body.style.overflow = 'hidden';
    }

    closeModal(modalId) {
        const modal = typeof modalId === 'string' ? document.getElementById(modalId) : modalId;
        if (modal) {
            modal.classList.remove('show');
            document.body.style.overflow = '';
        }
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

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
}

document.addEventListener('DOMContentLoaded', () => {
    new DashboardManager();
});