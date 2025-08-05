# B站侵权举报助手

一个专门为B站设计的浏览器插件，帮助用户快速识别和举报侵权内容。

## 功能特点

### 🎯 核心功能
- **一键抓取侵权信息** - 在B站页面自动抓取视频标题、UP主、链接等关键数据
- **智能案件管理** - 创建、编辑、删除和查看侵权案件
- **证据链关联** - 将侵权线索与原创作品链接关联，形成完整证据链
- **自动化举报** - 通过API直连或UI自动化完成繁琐的表单填写和提交

### 🛠️ 技术特性
- **Manifest V3** - 使用最新的Chrome扩展标准
- **多页面支持** - 支持视频页面、用户页面、番剧页面等
- **实时数据监控** - 自动监控页面变化，实时更新数据
- **数据持久化** - 本地存储案件数据和设置
- **导入导出** - 支持数据的备份和恢复

## 安装说明

### 开发环境安装

1. **克隆或下载项目**
   ```bash
   git clone <repository-url>
   cd bilibili-report-plugin
   ```

2. **准备图标文件**
   - 将 `icons/icon.svg` 转换为以下PNG文件：
     - `icons/icon16.png` (16x16)
     - `icons/icon48.png` (48x48)
     - `icons/icon128.png` (128x128)

3. **加载到Chrome**
   - 打开Chrome浏览器
   - 访问 `chrome://extensions/`
   - 开启"开发者模式"
   - 点击"加载已解压的扩展程序"
   - 选择项目文件夹

### 生产环境安装

1. **打包扩展**
   ```bash
   # 在Chrome扩展管理页面点击"打包扩展程序"
   # 选择项目文件夹，生成.crx文件
   ```

2. **分发安装**
   - 将生成的.crx文件分发给用户
   - 用户拖拽到Chrome扩展页面安装

## 使用指南

### 基本使用流程

1. **访问B站页面**
   - 打开任意B站视频页面
   - 插件会自动检测页面类型

2. **抓取侵权信息**
   - 点击插件图标打开弹窗
   - 点击"抓取侵权信息"按钮
   - 系统自动抓取页面数据

3. **创建案件**
   - 填写原创作品链接
   - 详细描述侵权情况
   - 点击"保存案件"

4. **提交举报**
   - 在案件管理页面查看案件
   - 点击"提交举报"按钮
   - 系统自动完成举报流程

### 高级功能

#### 案件管理
- **查看统计** - 查看总案件数、待处理、已提交等统计数据
- **筛选搜索** - 按状态、时间、关键词筛选案件
- **批量操作** - 支持批量导入导出案件数据

#### 设置配置
- **自动抓取** - 访问页面时自动抓取数据
- **自动提交** - 创建案件后自动提交举报
- **通知提醒** - 操作成功/失败的通知设置
- **调试模式** - 启用详细日志和调试信息

#### 右键菜单
- **快速抓取** - 右键点击元素快速抓取信息
- **快速举报** - 右键菜单直接发起举报

## 项目结构

```
bilibili-report-plugin/
├── manifest.json              # 扩展清单文件
├── icons/                     # 图标文件
│   ├── icon16.png
│   ├── icon48.png
│   ├── icon128.png
│   └── icon.svg
├── popup/                     # 弹窗界面
│   ├── popup.html
│   ├── popup.css
│   └── popup.js
├── content_scripts/           # 内容脚本
│   ├── injector.js           # 通用注入逻辑
│   ├── bilibili_scraper.js   # B站数据抓取
│   └── injector.css          # 注入样式
├── background/                # 后台脚本
│   └── service-worker.js     # Service Worker
├── pages/                     # 独立页面
│   ├── dashboard.html        # 案件管理页面
│   ├── dashboard.css
│   ├── dashboard.js
│   └── settings.html         # 设置页面
└── utils/                     # 工具函数
    ├── storage.js            # 存储管理
    └── api.js               # API通信
```

## 技术栈

### 核心技术
- **Manifest V3** - Chrome扩展最新标准
- **JavaScript ES6+** - 现代JavaScript语法
- **Chrome Extensions API** - 浏览器扩展API
- **Service Worker** - 后台服务工作线程

### 样式技术
- **CSS3** - 现代CSS特性
- **Flexbox/Grid** - 响应式布局
- **CSS动画** - 流畅的交互效果

### 数据存储
- **Chrome Storage API** - 本地数据存储
- **IndexedDB** - 大数据存储（可选）
- **Cookies** - 用户会话管理

## API文档

### 内容脚本API

#### 数据抓取
```javascript
// 抓取页面数据
chrome.runtime.sendMessage({
    action: 'captureData',
    options: { includeScreenshot: true }
}, (response) => {
    if (response.success) {
        console.log('抓取的数据:', response.data);
    }
});
```

#### 案件管理
```javascript
// 创建案件
chrome.runtime.sendMessage({
    action: 'createCase',
    caseData: {
        infringedContent: {...},
        originalWork: 'https://example.com/original',
        evidenceDesc: '侵权描述...'
    }
}, (response) => {
    if (response.success) {
        console.log('案件ID:', response.caseId);
    }
});
```

### 后台脚本API

#### 存储操作
```javascript
// 获取案件数据
const cases = await storageManager.getCases();

// 保存设置
await storageManager.saveSettings({
    autoCapture: true,
    notifications: true
});
```

#### API请求
```javascript
// 提交举报
const result = await apiManager.submitReport({
    aid: '123456',
    bvid: 'BV1234567890',
    reason: 1,
    desc: '侵权描述...'
});
```

## 配置说明

### 默认设置
```javascript
{
    autoCapture: true,        // 自动抓取
    autoSubmit: false,       // 自动提交
    notifications: true,     // 通知提醒
    debugMode: false,        // 调试模式
    apiTimeout: 30000,       // API超时时间
    maxRetries: 3,          // 最大重试次数
    evidenceScreenshots: true, // 证据截图
    reportTemplate: 'default', // 举报模板
    language: 'zh-CN'       // 界面语言
}
```

### 自定义配置
可以通过设置页面修改各项配置，或直接修改 `utils/storage.js` 中的默认设置。

## 开发指南

### 添加新的数据抓取器

1. **创建抓取器文件**
   ```javascript
   // content_scripts/new_scraper.js
   class NewScraper {
       async extractData() {
           // 实现数据抓取逻辑
       }
   }
   ```

2. **注册抓取器**
   ```javascript
   // 在 injector.js 中添加
   if (this.isNewPage()) {
       this.setupNewExtraction();
   }
   ```

3. **更新manifest.json**
   ```json
   {
       "content_scripts": [{
           "matches": ["https://new-site.com/*"],
           "js": ["content_scripts/new_scraper.js"]
       }]
   }
   ```

### 添加新的API端点

1. **定义API方法**
   ```javascript
   // utils/api.js
   async newApiMethod(params) {
       return await this.request({
           url: '/new/endpoint',
           method: 'POST',
           body: params
       });
   }
   ```

2. **调用API**
   ```javascript
   const result = await apiManager.newApiMethod({
       param1: 'value1',
       param2: 'value2'
   });
   ```

### 调试技巧

1. **启用调试模式**
   - 在设置中开启"调试模式"
   - 查看控制台详细日志

2. **后台脚本调试**
   ```javascript
   // 在 service-worker.js 中
   console.log('[Background] Debug message');
   ```

3. **内容脚本调试**
   ```javascript
   // 在内容脚本中
   console.log('[Content Script] Page data:', data);
   ```

## 常见问题

### Q: 插件无法加载？
A: 检查manifest.json格式是否正确，确保所有必需文件都存在。

### Q: 数据抓取失败？
A: 确保在B站页面使用插件，检查网络连接和页面加载状态。

### Q: 举报提交失败？
A: 检查CSRF令牌是否正确，确保用户已登录B站。

### Q: 数据丢失？
A: 定期导出数据备份，检查浏览器存储权限设置。

## 更新日志

### v1.0.0
- 初始版本发布
- 支持基本的侵权信息抓取
- 案件管理功能
- 自动化举报提交

## 贡献指南

1. Fork 项目
2. 创建功能分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 打开 Pull Request

## 许可证

本项目采用 MIT 许可证 - 查看 [LICENSE](LICENSE) 文件了解详情。

## 联系方式

- 项目主页: [GitHub Repository]
- 问题反馈: [Issues]
- 邮箱: [your-email@example.com]

## 免责声明

本插件仅供学习和研究使用，使用者应遵守相关法律法规和平台规定。开发者不对使用本插件产生的任何法律后果承担责任。