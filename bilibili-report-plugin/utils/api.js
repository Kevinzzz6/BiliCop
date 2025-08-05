/**
 * API工具类 - 封装与后端API的通信
 */
class ApiManager {
    constructor() {
        this.baseURL = 'https://api.bilibili.com';
        this.timeout = 30000;
        this.maxRetries = 3;
        this.csrfToken = '';
        this.init();
    }

    async init() {
        await this.loadCsrfToken();
        this.setupInterceptors();
    }

    /**
     * 加载CSRF令牌
     */
    async loadCsrfToken() {
        try {
            // 从cookie中获取bili_jct
            const cookies = await this.getCookies('https://www.bilibili.com');
            const csrfCookie = cookies.find(cookie => cookie.name === 'bili_jct');
            if (csrfCookie) {
                this.csrfToken = csrfCookie.value;
            }
        } catch (error) {
            console.warn('获取CSRF令牌失败:', error);
        }
    }

    /**
     * 获取指定域名的cookies
     * @param {string} url - URL
     * @returns {Promise<Array>} cookies数组
     */
    async getCookies(url) {
        return new Promise((resolve, reject) => {
            chrome.cookies.getAll({ url }, (cookies) => {
                if (chrome.runtime.lastError) {
                    reject(new Error(chrome.runtime.lastError.message));
                } else {
                    resolve(cookies || []);
                }
            });
        });
    }

    /**
     * 设置拦截器
     */
    setupInterceptors() {
        // 可以在这里添加请求/响应拦截器
    }

    /**
     * 发送HTTP请求
     * @param {Object} options - 请求选项
     * @returns {Promise<Object>} 响应数据
     */
    async request(options) {
        const {
            url,
            method = 'GET',
            headers = {},
            body = null,
            timeout = this.timeout,
            retries = this.maxRetries
        } = options;

        const fullUrl = url.startsWith('http') ? url : `${this.baseURL}${url}`;

        for (let attempt = 1; attempt <= retries; attempt++) {
            try {
                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), timeout);

                const fetchOptions = {
                    method,
                    headers: {
                        'Content-Type': 'application/json',
                        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
                        'Referer': 'https://www.bilibili.com/',
                        ...headers
                    },
                    signal: controller.signal
                };

                if (body && method !== 'GET') {
                    fetchOptions.body = typeof body === 'string' ? body : JSON.stringify(body);
                }

                const response = await fetch(fullUrl, fetchOptions);
                clearTimeout(timeoutId);

                if (!response.ok) {
                    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
                }

                const data = await response.json();
                
                // 检查B站API响应格式
                if (data.code !== 0) {
                    throw new Error(`API错误: ${data.message || '未知错误'}`);
                }

                return data;

            } catch (error) {
                if (attempt === retries) {
                    throw new Error(`请求失败，已重试${retries}次: ${error.message}`);
                }
                
                console.warn(`请求失败，第${attempt}次重试:`, error);
                await this.delay(1000 * attempt);
            }
        }
    }

    /**
     * 延迟函数
     * @param {number} ms - 延迟毫秒数
     * @returns {Promise<void>}
     */
    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    /**
     * 提交举报
     * @param {Object} reportData - 举报数据
     * @returns {Promise<Object>} 举报结果
     */
    async submitReport(reportData) {
        const payload = {
            aid: reportData.aid,
            bvid: reportData.bvid,
            reason: reportData.reason || 6,
            desc: reportData.desc || '',
            type: 1,
            oid: reportData.aid,
            csrf: this.csrfToken
        };

        try {
            const response = await this.request({
                url: '/x/v2/report/add',
                method: 'POST',
                body: payload
            });

            return {
                success: true,
                data: response.data,
                message: '举报提交成功'
            };

        } catch (error) {
            return {
                success: false,
                error: error.message,
                message: '举报提交失败'
            };
        }
    }

    /**
     * 提交反馈
     * @param {Object} feedbackData - 反馈数据
     * @returns {Promise<Object>} 反馈结果
     */
    async submitFeedback(feedbackData) {
        const payload = {
            type: feedbackData.type || 1,
            content: feedbackData.content || '',
            contact: feedbackData.contact || '',
            csrf: this.csrfToken
        };

        try {
            const response = await this.request({
                url: '/x/v2/feedback/add',
                method: 'POST',
                body: payload
            });

            return {
                success: true,
                data: response.data,
                message: '反馈提交成功'
            };

        } catch (error) {
            return {
                success: false,
                error: error.message,
                message: '反馈提交失败'
            };
        }
    }

    /**
     * 获取视频信息
     * @param {string} bvid - 视频BV号
     * @returns {Promise<Object>} 视频信息
     */
    async getVideoInfo(bvid) {
        try {
            const response = await this.request({
                url: `/x/web-interface/view?bvid=${bvid}`,
                method: 'GET'
            });

            return {
                success: true,
                data: response.data,
                message: '获取视频信息成功'
            };

        } catch (error) {
            return {
                success: false,
                error: error.message,
                message: '获取视频信息失败'
            };
        }
    }

    /**
     * 获取用户信息
     * @param {string} mid - 用户ID
     * @returns {Promise<Object>} 用户信息
     */
    async getUserInfo(mid) {
        try {
            const response = await this.request({
                url: `/x/space/acc/info?mid=${mid}`,
                method: 'GET'
            });

            return {
                success: true,
                data: response.data,
                message: '获取用户信息成功'
            };

        } catch (error) {
            return {
                success: false,
                error: error.message,
                message: '获取用户信息失败'
            };
        }
    }

    /**
     * 获取视频评论
     * @param {string} aid - 视频AID
     * @param {Object} options - 选项
     * @returns {Promise<Object>} 评论数据
     */
    async getVideoComments(aid, options = {}) {
        const { page = 1, pageSize = 20, sort = 'hot' } = options;
        
        try {
            const response = await this.request({
                url: `/x/v2/reply?oid=${aid}&type=1&pn=${page}&ps=${pageSize}&sort=${sort}`,
                method: 'GET'
            });

            return {
                success: true,
                data: response.data,
                message: '获取评论成功'
            };

        } catch (error) {
            return {
                success: false,
                error: error.message,
                message: '获取评论失败'
            };
        }
    }

    /**
     * 搜索视频
     * @param {string} keyword - 搜索关键词
     * @param {Object} options - 选项
     * @returns {Promise<Object>} 搜索结果
     */
    async searchVideos(keyword, options = {}) {
        const { page = 1, pageSize = 20, order = 'totalrank' } = options;
        
        try {
            const response = await this.request({
                url: `/x/web-interface/search/type?context=&search_type=video&keyword=${encodeURIComponent(keyword)}&page=${page}&page_size=${pageSize}&order=${order}`,
                method: 'GET'
            });

            return {
                success: true,
                data: response.data,
                message: '搜索成功'
            };

        } catch (error) {
            return {
                success: false,
                error: error.message,
                message: '搜索失败'
            };
        }
    }

    /**
     * 获取视频统计数据
     * @param {string} bvid - 视频BV号
     * @returns {Promise<Object>} 统计数据
     */
    async getVideoStats(bvid) {
        try {
            const response = await this.request({
                url: `/x/web-interface/archive/stat?bvid=${bvid}`,
                method: 'GET'
            });

            return {
                success: true,
                data: response.data,
                message: '获取统计数据成功'
            };

        } catch (error) {
            return {
                success: false,
                error: error.message,
                message: '获取统计数据失败'
            };
        }
    }

    /**
     * 获取视频相关推荐
     * @param {string} bvid - 视频BV号
     * @returns {Promise<Object>} 推荐视频
     */
    async getVideoRecommend(bvid) {
        try {
            const response = await this.request({
                url: `/x/web-interface/archive/related?bvid=${bvid}`,
                method: 'GET'
            });

            return {
                success: true,
                data: response.data,
                message: '获取推荐视频成功'
            };

        } catch (error) {
            return {
                success: false,
                error: error.message,
                message: '获取推荐视频失败'
            };
        }
    }

    /**
     * 检查视频是否侵权
     * @param {Object} videoData - 视频数据
     * @returns {Promise<Object>} 检查结果
     */
    async checkCopyrightInfringement(videoData) {
        // 这是一个模拟的版权检查API
        // 实际使用时需要替换为真实的版权检查服务
        
        try {
            // 模拟API调用延迟
            await this.delay(1000);
            
            // 模拟检查逻辑
            const infringementScore = this.calculateInfringementScore(videoData);
            
            return {
                success: true,
                data: {
                    score: infringementScore,
                    isLikelyInfringement: infringementScore > 0.7,
                    reasons: this.generateInfringementReasons(videoData, infringementScore),
                    recommendation: infringementScore > 0.7 ? '建议举报' : '需要进一步检查'
                },
                message: '版权检查完成'
            };

        } catch (error) {
            return {
                success: false,
                error: error.message,
                message: '版权检查失败'
            };
        }
    }

    /**
     * 计算侵权分数
     * @param {Object} videoData - 视频数据
     * @returns {number} 侵权分数 (0-1)
     */
    calculateInfringementScore(videoData) {
        let score = 0;
        
        // 标题相似度检查
        if (videoData.title && videoData.originalTitle) {
            const titleSimilarity = this.calculateSimilarity(videoData.title, videoData.originalTitle);
            score += titleSimilarity * 0.4;
        }
        
        // 内容相似度检查
        if (videoData.description && videoData.originalDescription) {
            const descSimilarity = this.calculateSimilarity(videoData.description, videoData.originalDescription);
            score += descSimilarity * 0.3;
        }
        
        // 发布时间检查
        if (videoData.publishTime && videoData.originalPublishTime) {
            const timeDiff = new Date(videoData.publishTime) - new Date(videoData.originalPublishTime);
            if (timeDiff > 0) {
                score += 0.2;
            }
        }
        
        // UP主检查
        if (videoData.uploader && videoData.originalUploader) {
            if (videoData.uploader !== videoData.originalUploader) {
                score += 0.1;
            }
        }
        
        return Math.min(score, 1);
    }

    /**
     * 计算文本相似度
     * @param {string} text1 - 文本1
     * @param {string} text2 - 文本2
     * @returns {number} 相似度 (0-1)
     */
    calculateSimilarity(text1, text2) {
        if (!text1 || !text2) return 0;
        
        const words1 = text1.toLowerCase().split('');
        const words2 = text2.toLowerCase().split('');
        
        const intersection = words1.filter(word => words2.includes(word));
        const union = [...new Set([...words1, ...words2])];
        
        return intersection.length / union.length;
    }

    /**
     * 生成侵权原因
     * @param {Object} videoData - 视频数据
     * @param {number} score - 侵权分数
     * @returns {Array>} 原因列表
     */
    generateInfringementReasons(videoData, score) {
        const reasons = [];
        
        if (score > 0.8) {
            reasons.push('高度相似的内容');
            reasons.push('可能存在版权侵权');
        } else if (score > 0.6) {
            reasons.push('内容存在相似性');
            reasons.push('需要进一步核实');
        } else if (score > 0.4) {
            reasons.push('存在部分相似内容');
        }
        
        return reasons;
    }

    /**
     * 批量检查视频
     * @param {Array} videoList - 视频列表
     * @returns {Promise<Array>} 检查结果
     */
    async batchCheckVideos(videoList) {
        const results = [];
        
        for (const videoData of videoList) {
            try {
                const result = await this.checkCopyrightInfringement(videoData);
                results.push({
                    videoId: videoData.bvid || videoData.aid,
                    ...result
                });
                
                // 添加延迟避免过于频繁的请求
                await this.delay(500);
                
            } catch (error) {
                results.push({
                    videoId: videoData.bvid || videoData.aid,
                    success: false,
                    error: error.message
                });
            }
        }
        
        return results;
    }

    /**
     * 获取API状态
     * @returns {Promise<Object>} API状态
     */
    async getApiStatus() {
        try {
            const response = await this.request({
                url: '/x/web-interface/nav',
                method: 'GET'
            });

            return {
                success: true,
                data: {
                    online: true,
                    responseTime: Date.now(),
                    userInfo: response.data
                },
                message: 'API状态正常'
            };

        } catch (error) {
            return {
                success: false,
                data: {
                    online: false,
                    error: error.message
                },
                message: 'API状态异常'
            };
        }
    }

    /**
     * 设置请求配置
     * @param {Object} config - 配置对象
     */
    setConfig(config) {
        if (config.baseURL) {
            this.baseURL = config.baseURL;
        }
        if (config.timeout) {
            this.timeout = config.timeout;
        }
        if (config.maxRetries) {
            this.maxRetries = config.maxRetries;
        }
        if (config.csrfToken) {
            this.csrfToken = config.csrfToken;
        }
    }

    /**
     * 获取当前配置
     * @returns {Object} 当前配置
     */
    getConfig() {
        return {
            baseURL: this.baseURL,
            timeout: this.timeout,
            maxRetries: this.maxRetries,
            hasCsrfToken: !!this.csrfToken
        };
    }
}

// 创建全局实例
window.apiManager = new ApiManager();

// 导出类（用于模块化环境）
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ApiManager;
}