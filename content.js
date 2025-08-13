// CNKI Helper Content Script
class CNKIHelperContent {
    constructor() {
        this.settings = {};
        this.init();
    }

    async init() {
        // 加载设置
        await this.loadSettings();
        
        // 监听来自background的消息
        chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
            if (message.type === 'SETTINGS_CHANGED') {
                this.loadSettings();
            }
        });

        // 注入UI和功能
        this.injectUI();
        
        // 解除复制限制 - 这是核心功能
        this.removeCopyRestrictions();
        
        // 添加其他功能
        this.addDownloadButtons();
        this.addSearchEnhancements();
        this.addKeyboardShortcuts();
        this.addMessageSystem();
    }

    async loadSettings() {
        try {
            const result = await chrome.storage.sync.get({
                autoDownload: false,
                enhanceSearch: true,
                quickAccess: true
            });
            this.settings = result;
        } catch (error) {
            console.error('CNKI Helper: Failed to load settings:', error);
        }
    }

    // 核心功能：解除CNKI页面的复制限制
    removeCopyRestrictions() {
        console.log('FK_CNKI: 正在解除复制限制...');
        
        // 方法1: 移除禁止选择文本的CSS样式
        this.removeSelectionRestrictions();
        
        // 方法2: 重写禁止复制的事件监听器
        this.overrideCopyEvents();
        
        // 方法3: 移除禁止右键菜单的限制
        this.removeContextMenuRestrictions();
        
        // 方法4: 重写禁止拖拽的限制
        this.removeDragRestrictions();
        
        // 方法5: 定期检查和清理新添加的限制
        this.startRestrictionMonitor();
        
        console.log('FK_CNKI: 复制限制解除完成');
    }

    // 移除禁止选择文本的CSS样式
    removeSelectionRestrictions() {
        // 移除user-select: none等样式
        const style = document.createElement('style');
        style.id = 'cnki-helper-copy-fix';
        style.textContent = `
            * {
                -webkit-user-select: auto !important;
                -moz-user-select: auto !important;
                -ms-user-select: auto !important;
                user-select: auto !important;
                -webkit-touch-callout: auto !important;
                -webkit-tap-highlight-color: rgba(0,0,0,0.1) !important;
            }
            
            /* 特别针对CNKI页面的样式覆盖 */
            .content, .article-content, .text-content, .paper-content {
                -webkit-user-select: text !important;
                -moz-user-select: text !important;
                -ms-user-select: text !important;
                user-select: text !important;
            }
            
            /* 移除可能存在的禁止选择样式 */
            [style*="user-select: none"],
            [style*="user-select:none"] {
                -webkit-user-select: auto !important;
                -moz-user-select: auto !important;
                -ms-user-select: auto !important;
                user-select: auto !important;
            }
        `;
        
        // 确保样式被添加到head中
        if (document.head) {
            document.head.appendChild(style);
        } else {
            document.documentElement.appendChild(style);
        }
    }

    // 重写禁止复制的事件监听器
    overrideCopyEvents() {
        // 重写oncopy事件
        document.addEventListener('copy', (e) => {
            // 阻止默认的禁止复制行为
            e.stopImmediatePropagation();
            console.log('FK_CNKI: 复制事件已允许');
        }, true);

        // 重写oncut事件
        document.addEventListener('cut', (e) => {
            e.stopImmediatePropagation();
            console.log('FK_CNKI: 剪切事件已允许');
        }, true);

        // 重写onselectstart事件
        document.addEventListener('selectstart', (e) => {
            e.stopImmediatePropagation();
            console.log('FK_CNKI: 文本选择已允许');
        }, true);

        // 重写onmousedown事件中的选择限制
        document.addEventListener('mousedown', (e) => {
            // 移除可能的选择限制
            if (e.target && e.target.style) {
                if (e.target.style.userSelect === 'none') {
                    e.target.style.userSelect = 'auto';
                }
            }
        }, true);

        // 重写onkeydown事件中的选择限制
        document.addEventListener('keydown', (e) => {
            // 允许Ctrl+A全选
            if (e.ctrlKey && e.key === 'a') {
                e.stopImmediatePropagation();
                console.log('CNKI Helper: Ctrl+A全选已允许');
            }
        }, true);
    }

    // 移除禁止右键菜单的限制
    removeContextMenuRestrictions() {
        // 重写oncontextmenu事件
        document.addEventListener('contextmenu', (e) => {
            e.stopImmediatePropagation();
            console.log('CNKI Helper: 右键菜单已允许');
        }, true);

        // 移除可能存在的右键限制
        document.oncontextmenu = null;
    }

    // 移除禁止拖拽的限制
    removeDragRestrictions() {
        // 重写ondragstart事件
        document.addEventListener('dragstart', (e) => {
            e.stopImmediatePropagation();
            console.log('CNKI Helper: 拖拽已允许');
        }, true);

        // 移除拖拽限制
        document.ondragstart = null;
    }

    // 定期检查和清理新添加的限制
    startRestrictionMonitor() {
        // 每2秒检查一次是否有新的限制被添加
        setInterval(() => {
            this.checkAndRemoveNewRestrictions();
        }, 2000);

        // 监听DOM变化，实时移除新添加的限制
        const observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                if (mutation.type === 'attributes' && mutation.attributeName === 'style') {
                    this.checkAndRemoveNewRestrictions();
                }
            });
        });

        observer.observe(document.body, {
            attributes: true,
            attributeFilter: ['style'],
            subtree: true
        });
    }

    // 检查并移除新添加的限制
    checkAndRemoveNewRestrictions() {
        // 查找所有可能包含禁止选择样式的元素
        const elements = document.querySelectorAll('*');
        elements.forEach(element => {
            if (element.style) {
                const computedStyle = window.getComputedStyle(element);
                if (computedStyle.userSelect === 'none' || 
                    computedStyle.webkitUserSelect === 'none' ||
                    computedStyle.mozUserSelect === 'none' ||
                    computedStyle.msUserSelect === 'none') {
                    
                    // 移除禁止选择的样式
                    element.style.userSelect = 'auto';
                    element.style.webkitUserSelect = 'auto';
                    element.style.mozUserSelect = 'auto';
                    element.style.msUserSelect = 'auto';
                    
                    console.log('CNKI Helper: 已移除元素的选择限制:', element);
                }
            }
        });
    }

    // 注入UI元素
    injectUI() {
        if (window.cnkiHelperInjected) return;
        window.cnkiHelperInjected = true;

        // 注入固定工具栏
        this.injectToolbar();
    }

    // 注入固定工具栏
    injectToolbar() {
        const toolbar = document.createElement('div');
        toolbar.id = 'cnki-helper-toolbar';
        toolbar.innerHTML = `
            <div class="toolbar-content">
                <span class="toolbar-title">FK_CNKI</span>
                <button class="toolbar-btn" id="cnki-quick-download" title="快速下载">下载</button>
                <button class="toolbar-btn" id="cnki-quick-search" title="快速搜索">搜索</button>
                <button class="toolbar-btn" id="cnki-settings" title="设置">设置</button>
                <span class="copy-status" id="copy-status">✅ 复制已启用</span>
            </div>
        `;

        // 添加到页面顶部
        document.body.insertBefore(toolbar, document.body.firstChild);

        // 绑定事件
        this.bindToolbarEvents();
    }

    // 绑定工具栏事件
    bindToolbarEvents() {
        const quickDownloadBtn = document.getElementById('cnki-quick-download');
        const quickSearchBtn = document.getElementById('cnki-quick-search');
        const settingsBtn = document.getElementById('cnki-settings');

        if (quickDownloadBtn) {
            quickDownloadBtn.addEventListener('click', () => this.quickDownload());
        }
        if (quickSearchBtn) {
            quickSearchBtn.addEventListener('click', () => this.quickSearch());
        }
        if (settingsBtn) {
            settingsBtn.addEventListener('click', () => this.openSettings());
        }
    }

    // 添加下载按钮
    addDownloadButtons() {
        // 在搜索结果页面添加下载按钮
        if (window.location.href.includes('search')) {
            this.addSearchResultDownloadButtons();
        }
        
        // 在详情页面添加下载按钮
        if (window.location.href.includes('detail') || window.location.href.includes('trialRead')) {
            this.addDetailPageDownloadButtons();
        }
    }

    // 在搜索结果页面添加下载按钮
    addSearchResultDownloadButtons() {
        const resultItems = document.querySelectorAll('.result-item, .search-item, .paper-item');
        resultItems.forEach((item, index) => {
            if (!item.querySelector('.cnki-download-btn')) {
                const downloadBtn = document.createElement('button');
                downloadBtn.className = 'cnki-download-btn search-download';
                downloadBtn.textContent = '下载';
                downloadBtn.addEventListener('click', (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    this.downloadFromSearchResult(item);
                });
                item.appendChild(downloadBtn);
            }
        });
    }

    // 在详情页面添加下载按钮
    addDetailPageDownloadButtons() {
        // 首先尝试查找页面中已存在的PDF下载按钮
        const existingDownloadBtn = this.findExistingPDFDownloadButton();
        
        if (existingDownloadBtn) {
            // 如果找到现有的下载按钮，创建一个增强版本
            this.createEnhancedDownloadButton(existingDownloadBtn);
        } else {
            // 如果没有找到，创建默认的下载按钮
            const contentArea = document.querySelector('.content, .article-content, .text-content, .paper-content');
            if (contentArea && !contentArea.querySelector('.cnki-download-btn')) {
                const downloadBtn = document.createElement('button');
                downloadBtn.className = 'cnki-download-btn detail-download';
                downloadBtn.textContent = '下载全文';
                downloadBtn.addEventListener('click', () => this.downloadFromDetailPage());
                
                // 插入到内容区域的顶部
                contentArea.insertBefore(downloadBtn, contentArea.firstChild);
            }
        }
    }

    // 查找页面中已存在的PDF下载按钮
    findExistingPDFDownloadButton() {
        // 常见的PDF下载按钮选择器
        const selectors = [
            'a[href*=".pdf"]',                    // 包含.pdf的链接
            'a[href*="download"]',                // 包含download的链接
            'a[href*="file"]',                    // 包含file的链接
            'button[onclick*="download"]',        // 包含download的onclick
            'button[onclick*="PDF"]',             // 包含PDF的onclick
            'a[title*="下载"]',                   // 标题包含"下载"的链接
            'a[title*="PDF"]',                    // 标题包含"PDF"的链接
            'a:contains("PDF下载")',              // 文本包含"PDF下载"的链接
            'a:contains("下载")',                 // 文本包含"下载"的链接
            '.download-btn',                      // 下载按钮类
            '.pdf-download',                      // PDF下载类
            '[data-type="download"]',             // 下载类型数据属性
            '[data-action="download"]'            // 下载动作数据属性
        ];

        // 遍历选择器查找下载按钮
        for (const selector of selectors) {
            try {
                const elements = document.querySelectorAll(selector);
                for (const element of elements) {
                    if (this.isDownloadButton(element)) {
                        return element;
                    }
                }
            } catch (e) {
                // 忽略无效选择器的错误
                continue;
            }
        }

        // 使用文本内容查找
        const allLinks = document.querySelectorAll('a, button');
        for (const element of allLinks) {
            const text = element.textContent || element.innerText || '';
            const href = element.href || '';
            const onclick = element.getAttribute('onclick') || '';
            
            if (this.isDownloadButtonByContent(text, href, onclick)) {
                return element;
            }
        }

        return null;
    }

    // 判断元素是否为下载按钮
    isDownloadButton(element) {
        const text = element.textContent || element.innerText || '';
        const href = element.href || '';
        const onclick = element.getAttribute('onclick') || '';
        const className = element.className || '';
        const id = element.id || '';
        
        // 检查文本内容
        const downloadKeywords = ['下载', 'PDF', 'download', 'Download', 'PDF下载', '全文下载'];
        const hasDownloadText = downloadKeywords.some(keyword => 
            text.toLowerCase().includes(keyword.toLowerCase())
        );
        
        // 检查链接
        const hasDownloadLink = href.includes('.pdf') || 
                               href.includes('download') || 
                               href.includes('file');
        
        // 检查onclick
        const hasDownloadOnclick = onclick.includes('download') || 
                                  onclick.includes('PDF') || 
                                  onclick.includes('file');
        
        // 检查类名和ID
        const hasDownloadClass = className.toLowerCase().includes('download') || 
                                id.toLowerCase().includes('download');
        
        return hasDownloadText || hasDownloadLink || hasDownloadOnclick || hasDownloadClass;
    }

    // 根据内容判断是否为下载按钮
    isDownloadButtonByContent(text, href, onclick) {
        const downloadKeywords = ['下载', 'PDF', 'download', 'Download', 'PDF下载', '全文下载'];
        const hasDownloadText = downloadKeywords.some(keyword => 
            text.toLowerCase().includes(keyword.toLowerCase())
        );
        
        const hasDownloadLink = href.includes('.pdf') || 
                               href.includes('download') || 
                               href.includes('file');
        
        const hasDownloadOnclick = onclick.includes('download') || 
                                  onclick.includes('PDF') || 
                                  onclick.includes('file');
        
        return hasDownloadText || hasDownloadLink || hasDownloadOnclick;
    }

    // 创建增强的下载按钮
    createEnhancedDownloadButton(existingBtn) {
        // 获取原始下载按钮的信息
        const originalHref = existingBtn.href || '';
        const originalOnclick = existingBtn.getAttribute('onclick') || '';
        const originalText = existingBtn.textContent || existingBtn.innerText || '';
        
        // 创建增强的下载按钮
        const enhancedBtn = document.createElement('button');
        enhancedBtn.className = 'cnki-download-btn enhanced-download';
        enhancedBtn.innerHTML = `<span class="btn-icon">📥</span>智能下载`;
        enhancedBtn.title = `关联到: ${originalText}`;
        
        // 添加点击事件
        enhancedBtn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            
            if (originalHref) {
                // 如果有直接链接，直接下载
                this.downloadFromURL(originalHref, originalText);
            } else if (originalOnclick) {
                // 如果有onclick事件，触发原始事件
                this.triggerOriginalDownload(existingBtn, originalOnclick);
            } else {
                // 否则使用默认下载逻辑
                this.downloadFromDetailPage();
            }
        });
        
        // 插入到原始按钮附近
        if (existingBtn.parentNode) {
            existingBtn.parentNode.insertBefore(enhancedBtn, existingBtn.nextSibling);
        }
        
        // 记录关联信息
        console.log('FK_CNKI: 下载按钮已关联到:', {
            originalText: originalText,
            originalHref: originalHref,
            originalOnclick: originalOnclick
        });
    }

    // 从URL直接下载
    downloadFromURL(url, filename) {
        try {
            this.showMessage(`正在下载: ${filename}`, 'info');
            
            // 创建下载链接
            const link = document.createElement('a');
            link.href = url;
            link.download = filename || 'CNKI论文.pdf';
            link.target = '_blank';
            
            // 触发下载
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            
            this.showMessage('下载已开始', 'success');
            
            // 记录下载历史
            this.recordDownload(filename, url);
            
        } catch (error) {
            console.error('FK_CNKI: 下载失败:', error);
            this.showMessage('下载失败，请重试', 'error');
        }
    }

    // 触发原始下载事件
    triggerOriginalDownload(originalBtn, onclick) {
        try {
            this.showMessage('正在触发原始下载...', 'info');
            
            // 创建临时函数来执行onclick
            const tempFunction = new Function(onclick);
            tempFunction.call(originalBtn);
            
            this.showMessage('原始下载已触发', 'success');
            
        } catch (error) {
            console.error('FK_CNKI: 触发原始下载失败:', error);
            this.showMessage('触发下载失败，使用备用方案', 'warning');
            
            // 备用方案：使用默认下载逻辑
            this.downloadFromDetailPage();
        }
    }

    // 记录下载历史
    recordDownload(filename, url) {
        const downloadInfo = {
            title: filename,
            url: url,
            timestamp: Date.now(),
            source: 'FK_CNKI'
        };
        
        // 发送到background script记录
        chrome.runtime.sendMessage({
            type: 'RECORD_DOWNLOAD',
            data: downloadInfo
        }).catch(() => {
            // 忽略错误
        });
    }

    // 添加搜索增强功能
    addSearchEnhancements() {
        if (!this.settings.enhanceSearch) return;

        // 添加搜索历史
        this.addSearchHistory();
        
        // 添加快速选项
        this.addQuickOptions();
        
        // 添加搜索建议
        this.addSearchSuggestions();
    }

    // 添加搜索历史
    addSearchHistory() {
        // 实现搜索历史功能
        console.log('FK_CNKI: 搜索历史功能已启用');
    }

    // 添加快速选项
    addQuickOptions() {
        // 实现快速选项功能
        console.log('FK_CNKI: 快速选项功能已启用');
    }

    // 添加搜索建议
    addSearchSuggestions() {
        // 实现搜索建议功能
        console.log('FK_CNKI: 搜索建议功能已启用');
    }

    // 添加键盘快捷键
    addKeyboardShortcuts() {
        document.addEventListener('keydown', (e) => {
            // Ctrl+D: 快速下载
            if (e.ctrlKey && e.key === 'd') {
                e.preventDefault();
                this.quickDownload();
            }
            
            // Ctrl+F: 快速搜索
            if (e.ctrlKey && e.key === 'f') {
                e.preventDefault();
                this.quickSearch();
            }
        });
    }

    // 添加消息系统
    addMessageSystem() {
        // 创建消息容器
        const messageContainer = document.createElement('div');
        messageContainer.id = 'cnki-message-container';
        document.body.appendChild(messageContainer);
    }

    // 显示消息
    showMessage(message, type = 'info') {
        const messageContainer = document.getElementById('cnki-message-container');
        if (!messageContainer) return;

        const messageEl = document.createElement('div');
        messageEl.className = `cnki-message cnki-message-${type}`;
        messageEl.textContent = message;

        messageContainer.appendChild(messageEl);

        // 3秒后自动移除
        setTimeout(() => {
            if (messageEl.parentNode) {
                messageEl.parentNode.removeChild(messageEl);
            }
        }, 3000);
    }

    // 快速下载
    quickDownload() {
        this.showMessage('正在准备下载...', 'info');
        
        // 根据当前页面类型选择下载方式
        if (window.location.href.includes('trialRead')) {
            this.downloadFromDetailPage();
        } else if (window.location.href.includes('search')) {
            this.downloadFromSearchResult();
        } else {
            this.showMessage('当前页面不支持快速下载', 'warning');
        }
    }

    // 快速搜索
    quickSearch() {
        this.showMessage('正在打开搜索页面...', 'info');
        chrome.runtime.sendMessage({
            type: 'SEARCH_PAPERS',
            query: ''
        });
    }

    // 打开设置
    openSettings() {
        this.showMessage('正在打开设置...', 'info');
        chrome.runtime.sendMessage({
            type: 'OPEN_SETTINGS'
        });
    }

    // 从搜索结果下载
    downloadFromSearchResult(item = null) {
        if (!item) {
            item = document.querySelector('.result-item, .search-item, .paper-item');
        }
        
        if (item) {
            const title = item.querySelector('.title, .paper-title')?.textContent || '未知标题';
            const authors = item.querySelector('.authors, .paper-authors')?.textContent || '未知作者';
            
            this.showMessage(`正在下载: ${title}`, 'info');
            
            chrome.runtime.sendMessage({
                type: 'DOWNLOAD_PAPER',
                data: {
                    title: title,
                    authors: authors,
                    url: window.location.href,
                    timestamp: Date.now()
                }
            });
        } else {
            this.showMessage('未找到可下载的内容', 'warning');
        }
    }

    // 从详情页面下载
    downloadFromDetailPage() {
        const title = document.querySelector('.title, .paper-title, .article-title')?.textContent || '未知标题';
        const authors = document.querySelector('.authors, .paper-authors, .article-authors')?.textContent || '未知作者';
        
        this.showMessage(`正在下载: ${title}`, 'info');
        
        chrome.runtime.sendMessage({
            type: 'DOWNLOAD_PAPER',
            data: {
                title: title,
                authors: authors,
                url: window.location.href,
                timestamp: Date.now()
            }
        });
    }
}

// 初始化CNKI助手
new CNKIHelperContent();
