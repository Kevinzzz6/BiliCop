/**
 * 存储工具类 - 封装 chrome.storage API
 */
class StorageManager {
    constructor() {
        this.storageArea = chrome.storage.local;
        this.defaultSettings = {
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
    }

    /**
     * 获取存储的数据
     * @param {string|string[]} keys - 要获取的键名或键名数组
     * @returns {Promise<Object>} 包含请求数据的对象
     */
    async get(keys) {
        return new Promise((resolve, reject) => {
            this.storageArea.get(keys, (result) => {
                if (chrome.runtime.lastError) {
                    reject(new Error(chrome.runtime.lastError.message));
                } else {
                    resolve(result);
                }
            });
        });
    }

    /**
     * 设置存储数据
     * @param {Object} data - 要设置的数据对象
     * @returns {Promise<void>}
     */
    async set(data) {
        return new Promise((resolve, reject) => {
            this.storageArea.set(data, () => {
                if (chrome.runtime.lastError) {
                    reject(new Error(chrome.runtime.lastError.message));
                } else {
                    resolve();
                }
            });
        });
    }

    /**
     * 删除存储的数据
     * @param {string|string[]} keys - 要删除的键名或键名数组
     * @returns {Promise<void>}
     */
    async remove(keys) {
        return new Promise((resolve, reject) => {
            this.storageArea.remove(keys, () => {
                if (chrome.runtime.lastError) {
                    reject(new Error(chrome.runtime.lastError.message));
                } else {
                    resolve();
                }
            });
        });
    }

    /**
     * 清空所有存储数据
     * @returns {Promise<void>}
     */
    async clear() {
        return new Promise((resolve, reject) => {
            this.storageArea.clear(() => {
                if (chrome.runtime.lastError) {
                    reject(new Error(chrome.runtime.lastError.message));
                } else {
                    resolve();
                }
            });
        });
    }

    /**
     * 获取存储空间使用情况
     * @returns {Promise<Object>} 存储空间信息
     */
    async getBytesInUse() {
        return new Promise((resolve, reject) => {
            this.storageArea.getBytesInUse((bytesInUse) => {
                if (chrome.runtime.lastError) {
                    reject(new Error(chrome.runtime.lastError.message));
                } else {
                    resolve({ bytesInUse });
                }
            });
        });
    }

    /**
     * 获取案件数据
     * @returns {Promise<Array>} 案件列表
     */
    async getCases() {
        try {
            const result = await this.get('cases');
            return result.cases || [];
        } catch (error) {
            console.error('获取案件数据失败:', error);
            return [];
        }
    }

    /**
     * 保存案件数据
     * @param {Array} cases - 案件列表
     * @returns {Promise<void>}
     */
    async saveCases(cases) {
        try {
            await this.set({ cases });
        } catch (error) {
            console.error('保存案件数据失败:', error);
            throw error;
        }
    }

    /**
     * 添加新案件
     * @param {Object} caseData - 案件数据
     * @returns {Promise<string>} 案件ID
     */
    async addCase(caseData) {
        try {
            const cases = await this.getCases();
            const newCase = {
                ...caseData,
                id: Date.now().toString(),
                createdAt: new Date().toISOString(),
                status: 'pending'
            };
            
            cases.push(newCase);
            await this.saveCases(cases);
            
            return newCase.id;
        } catch (error) {
            console.error('添加案件失败:', error);
            throw error;
        }
    }

    /**
     * 更新案件
     * @param {string} caseId - 案件ID
     * @param {Object} updates - 更新数据
     * @returns {Promise<boolean>} 是否成功
     */
    async updateCase(caseId, updates) {
        try {
            const cases = await this.getCases();
            const index = cases.findIndex(c => c.id === caseId);
            
            if (index === -1) {
                return false;
            }
            
            cases[index] = { ...cases[index], ...updates };
            await this.saveCases(cases);
            
            return true;
        } catch (error) {
            console.error('更新案件失败:', error);
            throw error;
        }
    }

    /**
     * 删除案件
     * @param {string} caseId - 案件ID
     * @returns {Promise<boolean>} 是否成功
     */
    async deleteCase(caseId) {
        try {
            const cases = await this.getCases();
            const filteredCases = cases.filter(c => c.id !== caseId);
            
            if (filteredCases.length === cases.length) {
                return false;
            }
            
            await this.saveCases(filteredCases);
            return true;
        } catch (error) {
            console.error('删除案件失败:', error);
            throw error;
        }
    }

    /**
     * 获取设置
     * @returns {Promise<Object>} 设置对象
     */
    async getSettings() {
        try {
            const result = await this.get('settings');
            const settings = result.settings || {};
            
            // 合并默认设置
            return { ...this.defaultSettings, ...settings };
        } catch (error) {
            console.error('获取设置失败:', error);
            return { ...this.defaultSettings };
        }
    }

    /**
     * 保存设置
     * @param {Object} settings - 设置对象
     * @returns {Promise<void>}
     */
    async saveSettings(settings) {
        try {
            await this.set({ settings });
        } catch (error) {
            console.error('保存设置失败:', error);
            throw error;
        }
    }

    /**
     * 重置设置为默认值
     * @returns {Promise<void>}
     */
    async resetSettings() {
        try {
            await this.set({ settings: { ...this.defaultSettings } });
        } catch (error) {
            console.error('重置设置失败:', error);
            throw error;
        }
    }

    /**
     * 获取活动标签页数据
     * @returns {Promise<Object>} 活动标签页数据
     */
    async getActiveTabs() {
        try {
            const result = await this.get('activeTabs');
            return result.activeTabs || {};
        } catch (error) {
            console.error('获取活动标签页数据失败:', error);
            return {};
        }
    }

    /**
     * 保存活动标签页数据
     * @param {Object} activeTabs - 活动标签页数据
     * @returns {Promise<void>}
     */
    async saveActiveTabs(activeTabs) {
        try {
            await this.set({ activeTabs });
        } catch (error) {
            console.error('保存活动标签页数据失败:', error);
            throw error;
        }
    }

    /**
     * 添加活动标签页
     * @param {string} tabId - 标签页ID
     * @param {Object} tabData - 标签页数据
     * @returns {Promise<void>}
     */
    async addActiveTab(tabId, tabData) {
        try {
            const activeTabs = await this.getActiveTabs();
            activeTabs[tabId] = {
                ...tabData,
                timestamp: Date.now()
            };
            await this.saveActiveTabs(activeTabs);
        } catch (error) {
            console.error('添加活动标签页失败:', error);
            throw error;
        }
    }

    /**
     * 移除活动标签页
     * @param {string} tabId - 标签页ID
     * @returns {Promise<void>}
     */
    async removeActiveTab(tabId) {
        try {
            const activeTabs = await this.getActiveTabs();
            delete activeTabs[tabId];
            await this.saveActiveTabs(activeTabs);
        } catch (error) {
            console.error('移除活动标签页失败:', error);
            throw error;
        }
    }

    /**
     * 清理过期数据
     * @param {number} maxAge - 最大年龄（毫秒）
     * @returns {Promise<void>}
     */
    async cleanupOldData(maxAge = 30 * 24 * 60 * 60 * 1000) {
        try {
            // 清理过期案件
            const cases = await this.getCases();
            const now = Date.now();
            const filteredCases = cases.filter(caseItem => {
                const caseAge = now - new Date(caseItem.createdAt).getTime();
                return caseAge <= maxAge || caseItem.status === 'pending';
            });
            
            if (filteredCases.length !== cases.length) {
                await this.saveCases(filteredCases);
            }

            // 清理过期活动标签页
            const activeTabs = await this.getActiveTabs();
            const filteredActiveTabs = {};
            
            for (const [tabId, tabData] of Object.entries(activeTabs)) {
                const tabAge = now - tabData.timestamp;
                if (tabAge <= maxAge) {
                    filteredActiveTabs[tabId] = tabData;
                }
            }
            
            if (Object.keys(filteredActiveTabs).length !== Object.keys(activeTabs).length) {
                await this.saveActiveTabs(filteredActiveTabs);
            }

        } catch (error) {
            console.error('清理过期数据失败:', error);
            throw error;
        }
    }

    /**
     * 导出所有数据
     * @returns {Promise<Object>} 导出的数据对象
     */
    async exportData() {
        try {
            const [cases, settings, activeTabs] = await Promise.all([
                this.getCases(),
                this.getSettings(),
                this.getActiveTabs()
            ]);

            return {
                cases,
                settings,
                activeTabs,
                exportedAt: new Date().toISOString(),
                version: chrome.runtime.getManifest().version
            };
        } catch (error) {
            console.error('导出数据失败:', error);
            throw error;
        }
    }

    /**
     * 导入数据
     * @param {Object} importData - 要导入的数据对象
     * @returns {Promise<void>}
     */
    async importData(importData) {
        try {
            const { cases, settings, activeTabs } = importData;
            
            if (cases) {
                await this.saveCases(cases);
            }
            
            if (settings) {
                await this.saveSettings(settings);
            }
            
            if (activeTabs) {
                await this.saveActiveTabs(activeTabs);
            }

        } catch (error) {
            console.error('导入数据失败:', error);
            throw error;
        }
    }

    /**
     * 验证数据完整性
     * @returns {Promise<Object>} 验证结果
     */
    async validateData() {
        try {
            const [cases, settings, activeTabs, bytesInUse] = await Promise.all([
                this.getCases(),
                this.getSettings(),
                this.getActiveTabs(),
                this.getBytesInUse()
            ]);

            const issues = [];

            // 验证案件数据
            cases.forEach((caseItem, index) => {
                if (!caseItem.id) {
                    issues.push(`案件 ${index}: 缺少ID`);
                }
                if (!caseItem.createdAt) {
                    issues.push(`案件 ${caseItem.id || index}: 缺少创建时间`);
                }
                if (!caseItem.status) {
                    issues.push(`案件 ${caseItem.id}: 缺少状态`);
                }
            });

            // 验证设置数据
            const requiredSettings = ['autoCapture', 'autoSubmit', 'notifications'];
            requiredSettings.forEach(setting => {
                if (!(setting in settings)) {
                    issues.push(`设置: 缺少 ${setting}`);
                }
            });

            // 检查存储空间使用情况
            const maxStorage = 10 * 1024 * 1024; // 10MB
            if (bytesInUse.bytesInUse > maxStorage) {
                issues.push(`存储空间使用过多: ${Math.round(bytesInUse.bytesInUse / 1024 / 1024)}MB`);
            }

            return {
                valid: issues.length === 0,
                issues,
                stats: {
                    casesCount: cases.length,
                    activeTabsCount: Object.keys(activeTabs).length,
                    storageUsed: bytesInUse.bytesInUse,
                    storageUsedMB: Math.round(bytesInUse.bytesInUse / 1024 / 1024 * 100) / 100
                }
            };

        } catch (error) {
            console.error('验证数据失败:', error);
            return {
                valid: false,
                issues: [`验证失败: ${error.message}`],
                stats: null
            };
        }
    }

    /**
     * 监听存储变化
     * @param {Function} callback - 变化回调函数
     */
    onChanged(callback) {
        chrome.storage.onChanged.addListener((changes, areaName) => {
            callback(changes, areaName);
        });
    }
}

// 创建全局实例
window.storageManager = new StorageManager();

// 导出类（用于模块化环境）
if (typeof module !== 'undefined' && module.exports) {
    module.exports = StorageManager;
}