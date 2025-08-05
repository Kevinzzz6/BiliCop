class BilibiliScraper {
    constructor() {
        this.pageType = this.detectPageType();
        this.dataCache = new Map();
        this.init();
    }

    detectPageType() {
        const url = window.location.href;
        
        if (url.includes('/video/')) {
            return 'video';
        } else if (url.includes('/space/')) {
            return 'user';
        } else if (url.includes('/bangumi/')) {
            return 'bangumi';
        } else if (url.includes('/article/')) {
            return 'article';
        } else {
            return 'general';
        }
    }

    init() {
        this.setupDataExtraction();
        this.setupPageMonitoring();
    }

    setupDataExtraction() {
        switch (this.pageType) {
            case 'video':
                this.setupVideoExtraction();
                break;
            case 'user':
                this.setupUserExtraction();
                break;
            case 'bangumi':
                this.setupBangumiExtraction();
                break;
            case 'article':
                this.setupArticleExtraction();
                break;
            default:
                this.setupGeneralExtraction();
        }
    }

    setupVideoExtraction() {
        this.extractVideoData();
        this.monitorVideoChanges();
    }

    async extractVideoData() {
        const data = {
            type: 'video',
            url: window.location.href,
            extractedAt: new Date().toISOString()
        };

        try {
            Object.assign(data, await this.extractVideoBasicInfo());
            Object.assign(data, await this.extractVideoStats());
            Object.assign(data, await this.extractVideoMetadata());
            Object.assign(data, await this.extractVideoComments());
            Object.assign(data, await this.extractVideoRelated());

            this.dataCache.set('video', data);
            this.notifyDataUpdate('video', data);
            
        } catch (error) {
            console.error('视频数据提取失败:', error);
        }
    }

    async extractVideoBasicInfo() {
        const basicInfo = {};

        try {
            basicInfo.title = this.extractTitle();
            basicInfo.bvid = this.extractBVID();
            basicInfo.aid = this.extractAID();
            basicInfo.cid = this.extractCID();
            
            const uploaderInfo = this.extractUploaderInfo();
            Object.assign(basicInfo, uploaderInfo);
            
            basicInfo.publishTime = this.extractPublishTime();
            basicInfo.description = this.extractDescription();
            basicInfo.duration = this.extractDuration();
            basicInfo.thumbnail = this.extractThumbnail();

        } catch (error) {
            console.warn('视频基本信息提取失败:', error);
        }

        return basicInfo;
    }

    extractTitle() {
        const selectors = [
            'h1.video-title',
            '.video-title h1',
            '.tit',
            '.viewbox h1',
            '.video-info-title'
        ];

        for (const selector of selectors) {
            const element = document.querySelector(selector);
            if (element) {
                return element.textContent.trim();
            }
        }

        return document.title.replace('_哔哩哔哩_bilibili', '').trim();
    }

    extractBVID() {
        const urlMatch = window.location.pathname.match(/\/video\/(BV\w+)/);
        if (urlMatch) {
            return urlMatch[1];
        }

        const metaBvid = document.querySelector('meta[name="bvid"]');
        if (metaBvid) {
            return metaBvid.getAttribute('content');
        }

        return this.extractFromWindowProperty('bvid');
    }

    extractAID() {
        const urlMatch = window.location.search.match(/[?&]aid=(\d+)/);
        if (urlMatch) {
            return urlMatch[1];
        }

        const metaAid = document.querySelector('meta[name="aid"]');
        if (metaAid) {
            return metaAid.getAttribute('content');
        }

        return this.extractFromWindowProperty('aid');
    }

    extractCID() {
        return this.extractFromWindowProperty('cid');
    }

    extractFromWindowProperty(property) {
        try {
            if (window.__INITIAL_STATE__ && window.__INITIAL_STATE__[property]) {
                return window.__INITIAL_STATE__[property];
            }

            if (window.__playinfo__ && window.__playinfo__[property]) {
                return window.__playinfo__[property];
            }

            const scripts = document.querySelectorAll('script');
            for (const script of scripts) {
                const content = script.textContent;
                if (content && content.includes(`window.__INITIAL_STATE__`)) {
                    const match = content.match(/window\.__INITIAL_STATE__\s*=\s*({.+?});/);
                    if (match) {
                        const initialState = JSON.parse(match[1]);
                        if (initialState[property]) {
                            return initialState[property];
                        }
                    }
                }
            }
        } catch (error) {
            console.warn(`从window属性提取${property}失败:`, error);
        }

        return '';
    }

    extractUploaderInfo() {
        const uploaderInfo = {};

        try {
            const selectors = [
                '.up-name',
                '.up-info__name',
                '.username',
                '.author-name',
                '.video-info-detail .name'
            ];

            for (const selector of selectors) {
                const element = document.querySelector(selector);
                if (element) {
                    uploaderInfo.uploader = element.textContent.trim();
                    uploaderInfo.uploaderUrl = element.href || '';
                    break;
                }
            }

            const uidSelectors = [
                '.up-info__btn',
                '.up-btn',
                '.follow-btn'
            ];

            for (const selector of uidSelectors) {
                const element = document.querySelector(selector);
                if (element && element.href) {
                    const uidMatch = element.href.match(/\/space\/bilibili\/(\d+)/);
                    if (uidMatch) {
                        uploaderInfo.uploaderId = uidMatch[1];
                        break;
                    }
                }
            }

            if (!uploaderInfo.uploaderId) {
                uploaderInfo.uploaderId = this.extractFromWindowProperty('owner.mid');
            }

        } catch (error) {
            console.warn('UP主信息提取失败:', error);
        }

        return uploaderInfo;
    }

    extractPublishTime() {
        const selectors = [
            '.publish-date',
            '.video-info-meta-item',
            '.video-info-detail',
            '.video-info-meta span'
        ];

        for (const selector of selectors) {
            const element = document.querySelector(selector);
            if (element) {
                const text = element.textContent.trim();
                if (text.includes('发布') || text.includes('投稿')) {
                    return text;
                }
            }
        }

        return this.extractFromWindowProperty('pubdate') || '';
    }

    extractDescription() {
        const selectors = [
            '.desc-info',
            '.video-desc',
            '.abstract',
            '.video-info-desc'
        ];

        for (const selector of selectors) {
            const element = document.querySelector(selector);
            if (element) {
                return element.textContent.trim();
            }
        }

        const metaDesc = document.querySelector('meta[name="description"]');
        if (metaDesc) {
            return metaDesc.getAttribute('content');
        }

        return '';
    }

    extractDuration() {
        const selectors = [
            '.bilibili-player-video-duration',
            '.duration',
            '.video-duration'
        ];

        for (const selector of selectors) {
            const element = document.querySelector(selector);
            if (element) {
                return element.textContent.trim();
            }
        }

        return this.extractFromWindowProperty('duration') || '';
    }

    extractThumbnail() {
        const selectors = [
            '.bilibili-player-video-poster img',
            '.video-cover img',
            '.cover img'
        ];

        for (const selector of selectors) {
            const element = document.querySelector(selector);
            if (element) {
                return element.src || '';
            }
        }

        const metaImage = document.querySelector('meta[property="og:image"]');
        if (metaImage) {
            return metaImage.getAttribute('content');
        }

        return '';
    }

    async extractVideoStats() {
        const stats = {};

        try {
            const statElements = {
                view: '.view-count, .video-view, .play-count',
                like: '.like-count, .video-like, .like',
                coin: '.coin-count, .video-coin, .coin',
                favorite: '.favorite-count, .video-fav, .collect',
                share: '.share-count, .video-share, .share',
                reply: '.reply-count, .video-reply, .comment'
            };

            for (const [key, selector] of Object.entries(statElements)) {
                const element = document.querySelector(selector);
                if (element) {
                    stats[`${key}Count`] = this.parseStatNumber(element.textContent);
                }
            }

            const windowStats = this.extractFromWindowProperty('stat');
            if (windowStats) {
                Object.assign(stats, windowStats);
            }

        } catch (error) {
            console.warn('视频统计数据提取失败:', error);
        }

        return stats;
    }

    parseStatNumber(text) {
        if (!text) return 0;
        
        const numText = text.replace(/[^\d.]/g, '');
        const num = parseFloat(numText);
        
        if (text.includes('万')) {
            return Math.floor(num * 10000);
        } else if (text.includes('亿')) {
            return Math.floor(num * 100000000);
        }
        
        return isNaN(num) ? 0 : Math.floor(num);
    }

    async extractVideoMetadata() {
        const metadata = {};

        try {
            const tags = Array.from(document.querySelectorAll('.tag-link, .video-tag, .tag'));
            metadata.tags = tags.map(tag => ({
                name: tag.textContent.trim(),
                url: tag.href || ''
            })).filter(tag => tag.name);

            const categories = Array.from(document.querySelectorAll('.category-link, .video-category'));
            metadata.categories = categories.map(cat => cat.textContent.trim()).filter(cat => cat);

            const typeInfo = this.extractFromWindowProperty('type');
            if (typeInfo) {
                metadata.typeInfo = typeInfo;
            }

        } catch (error) {
            console.warn('视频元数据提取失败:', error);
        }

        return metadata;
    }

    async extractVideoComments() {
        const comments = {
            count: 0,
            topComments: []
        };

        try {
            const commentCountElement = document.querySelector('.reply-count, .comment-count');
            if (commentCountElement) {
                comments.count = this.parseStatNumber(commentCountElement.textContent);
            }

            const topCommentElements = document.querySelectorAll('.reply-item, .comment-item');
            comments.topComments = Array.from(topCommentElements.slice(0, 5)).map(element => {
                return {
                    author: this.safeQueryText(element, '.user-name, .reply-user'),
                    content: this.safeQueryText(element, '.reply-content, .comment-text'),
                    likeCount: this.parseStatNumber(this.safeQueryText(element, '.like-count, .reply-like')),
                    time: this.safeQueryText(element, '.reply-time, .comment-time')
                };
            }).filter(comment => comment.content);

        } catch (error) {
            console.warn('视频评论提取失败:', error);
        }

        return comments;
    }

    async extractVideoRelated() {
        const related = {
            videos: [],
            playlists: []
        };

        try {
            const relatedVideos = document.querySelectorAll('.recommend-video, .related-video');
            related.videos = Array.from(relatedVideos.slice(0, 10)).map(element => {
                return {
                    title: this.safeQueryText(element, '.title, .video-title'),
                    url: element.querySelector('a')?.href || '',
                    uploader: this.safeQueryText(element, '.up-name, .author'),
                    viewCount: this.parseStatNumber(this.safeQueryText(element, '.view-count, .play-count')),
                    duration: this.safeQueryText(element, '.duration, .video-duration')
                };
            }).filter(video => video.title && video.url);

        } catch (error) {
            console.warn('相关视频提取失败:', error);
        }

        return related;
    }

    safeQueryText(parent, selector) {
        const element = parent.querySelector(selector);
        return element ? element.textContent.trim() : '';
    }

    setupUserExtraction() {
        this.extractUserData();
    }

    async extractUserData() {
        const data = {
            type: 'user',
            url: window.location.href,
            extractedAt: new Date().toISOString()
        };

        try {
            Object.assign(data, await this.extractUserBasicInfo());
            Object.assign(data, await this.extractUserStats());
            Object.assign(data, await this.extractUserVideos());

            this.dataCache.set('user', data);
            this.notifyDataUpdate('user', data);
            
        } catch (error) {
            console.error('用户数据提取失败:', error);
        }
    }

    async extractUserBasicInfo() {
        const basicInfo = {};

        try {
            basicInfo.username = this.safeQueryText(document, '.h-name, .username, .user-name');
            basicInfo.userId = this.extractUserId();
            basicInfo.sign = this.safeQueryText(document, '.sign-content, .user-sign');
            basicInfo.level = this.safeQueryText(document, '.level-info, .user-level');
            basicInfo.avatar = this.extractUserAvatar();

        } catch (error) {
            console.warn('用户基本信息提取失败:', error);
        }

        return basicInfo;
    }

    extractUserId() {
        const urlMatch = window.location.pathname.match(/\/space\/bilibili\/(\d+)/);
        if (urlMatch) {
            return urlMatch[1];
        }

        return this.extractFromWindowProperty('mid') || '';
    }

    extractUserAvatar() {
        const avatarElement = document.querySelector('.user-avatar img, .avatar img');
        return avatarElement ? avatarElement.src : '';
    }

    async extractUserStats() {
        const stats = {};

        try {
            const statElements = {
                follower: '.follower-count, .fans-count',
                following: '.following-count, .follow-count',
                video: '.video-count, .works-count'
            };

            for (const [key, selector] of Object.entries(statElements)) {
                const element = document.querySelector(selector);
                if (element) {
                    stats[`${key}Count`] = this.parseStatNumber(element.textContent);
                }
            }

        } catch (error) {
            console.warn('用户统计数据提取失败:', error);
        }

        return stats;
    }

    async extractUserVideos() {
        const videos = {
            count: 0,
            recentVideos: []
        };

        try {
            const videoElements = document.querySelectorAll('.small-item, .video-item, .user-video');
            videos.recentVideos = Array.from(videoElements.slice(0, 10)).map(element => {
                return {
                    title: this.safeQueryText(element, '.title, .video-title'),
                    url: element.querySelector('a')?.href || '',
                    viewCount: this.parseStatNumber(this.safeQueryText(element, '.view-count, .play-count')),
                    publishTime: this.safeQueryText(element, '.publish-time, .date')
                };
            }).filter(video => video.title && video.url);

            videos.count = videos.recentVideos.length;

        } catch (error) {
            console.warn('用户视频提取失败:', error);
        }

        return videos;
    }

    setupBangumiExtraction() {
        this.extractBangumiData();
    }

    async extractBangumiData() {
        const data = {
            type: 'bangumi',
            url: window.location.href,
            extractedAt: new Date().toISOString()
        };

        try {
            Object.assign(data, await this.extractBangumiBasicInfo());
            Object.assign(data, await this.extractBangumiEpisodes());

            this.dataCache.set('bangumi', data);
            this.notifyDataUpdate('bangumi', data);
            
        } catch (error) {
            console.error('番剧数据提取失败:', error);
        }
    }

    async extractBangumiBasicInfo() {
        const basicInfo = {};

        try {
            basicInfo.title = this.safeQueryText(document, '.bangumi-title, .media-title');
            basicInfo.description = this.safeQueryText(document, '.bangumi-desc, .media-desc');
            basicInfo.cover = this.extractBangumiCover();
            basicInfo.rating = this.safeQueryText(document, '.rating, .score');

        } catch (error) {
            console.warn('番剧基本信息提取失败:', error);
        }

        return basicInfo;
    }

    extractBangumiCover() {
        const coverElement = document.querySelector('.bangumi-cover img, .media-cover img');
        return coverElement ? coverElement.src : '';
    }

    async extractBangumiEpisodes() {
        const episodes = {
            count: 0,
            list: []
        };

        try {
            const episodeElements = document.querySelectorAll('.episode-item, .bangumi-episode');
            episodes.list = Array.from(episodeElements).map(element => {
                return {
                    title: this.safeQueryText(element, '.episode-title, .ep-title'),
                    url: element.querySelector('a')?.href || '',
                    duration: this.safeQueryText(element, '.duration, .ep-duration')
                };
            }).filter(ep => ep.title && ep.url);

            episodes.count = episodes.list.length;

        } catch (error) {
            console.warn('番剧集数提取失败:', error);
        }

        return episodes;
    }

    setupArticleExtraction() {
        this.extractArticleData();
    }

    async extractArticleData() {
        const data = {
            type: 'article',
            url: window.location.href,
            extractedAt: new Date().toISOString()
        };

        try {
            Object.assign(data, await this.extractArticleBasicInfo());
            Object.assign(data, await this.extractArticleStats());

            this.dataCache.set('article', data);
            this.notifyDataUpdate('article', data);
            
        } catch (error) {
            console.error('文章数据提取失败:', error);
        }
    }

    async extractArticleBasicInfo() {
        const basicInfo = {};

        try {
            basicInfo.title = this.safeQueryText(document, '.article-title, .title');
            basicInfo.author = this.safeQueryText(document, '.author-name, .up-name');
            basicInfo.content = this.extractArticleContent();
            basicInfo.publishTime = this.safeQueryText(document, '.publish-time, .date');

        } catch (error) {
            console.warn('文章基本信息提取失败:', error);
        }

        return basicInfo;
    }

    extractArticleContent() {
        const contentElement = document.querySelector('.article-content, .content');
        return contentElement ? contentElement.textContent.trim() : '';
    }

    async extractArticleStats() {
        const stats = {};

        try {
            const statElements = {
                view: '.view-count, .read-count',
                like: '.like-count',
                coin: '.coin-count',
                favorite: '.favorite-count'
            };

            for (const [key, selector] of Object.entries(statElements)) {
                const element = document.querySelector(selector);
                if (element) {
                    stats[`${key}Count`] = this.parseStatNumber(element.textContent);
                }
            }

        } catch (error) {
            console.warn('文章统计数据提取失败:', error);
        }

        return stats;
    }

    setupGeneralExtraction() {
        this.extractGeneralData();
    }

    async extractGeneralData() {
        const data = {
            type: 'general',
            url: window.location.href,
            extractedAt: new Date().toISOString()
        };

        try {
            data.title = document.title;
            data.description = this.getMetaDescription();
            data.keywords = this.getMetaKeywords();

            this.dataCache.set('general', data);
            this.notifyDataUpdate('general', data);
            
        } catch (error) {
            console.error('通用数据提取失败:', error);
        }
    }

    getMetaDescription() {
        const metaDesc = document.querySelector('meta[name="description"]');
        return metaDesc ? metaDesc.getAttribute('content') : '';
    }

    getMetaKeywords() {
        const metaKeywords = document.querySelector('meta[name="keywords"]');
        return metaKeywords ? metaKeywords.getAttribute('content') : '';
    }

    setupPageMonitoring() {
        const observer = new MutationObserver((mutations) => {
            for (const mutation of mutations) {
                if (mutation.type === 'childList' || mutation.type === 'subtree') {
                    this.handlePageChange();
                    break;
                }
            }
        });

        observer.observe(document.body, {
            childList: true,
            subtree: true,
            attributes: false,
            characterData: false
        });
    }

    handlePageChange() {
        clearTimeout(this.changeTimeout);
        this.changeTimeout = setTimeout(() => {
            this.setupDataExtraction();
        }, 1000);
    }

    monitorVideoChanges() {
        const videoObserver = new MutationObserver((mutations) => {
            for (const mutation of mutations) {
                if (mutation.type === 'attributes' && mutation.attributeName === 'src') {
                    this.extractVideoData();
                    break;
                }
            }
        });

        const videoElement = document.querySelector('video');
        if (videoElement) {
            videoObserver.observe(videoElement, {
                attributes: true,
                attributeFilter: ['src']
            });
        }
    }

    notifyDataUpdate(type, data) {
        window.postMessage({
            type: 'BILIBILI_DATA_UPDATE',
            payload: {
                dataType: type,
                data: data
            }
        }, '*');
    }

    getCachedData(type) {
        return this.dataCache.get(type);
    }

    getAllCachedData() {
        return Object.fromEntries(this.dataCache);
    }
}

if (typeof window !== 'undefined') {
    window.BilibiliScraper = BilibiliScraper;
    
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            new BilibiliScraper();
        });
    } else {
        new BilibiliScraper();
    }
}