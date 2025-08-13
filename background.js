// CNKI Helper Background Script
class CNKIHelperBackground {
    constructor() {
        this.init();
    }

    init() {
        this.bindEvents();
        this.loadSettings();
    }

    bindEvents() {
        // 插件安装事件
        chrome.runtime.onInstalled.addListener((details) => {
            this.handleInstall(details);
        });

        // 消息监听
        chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
            this.handleMessage(message, sender, sendResponse);
            return true; // 保持消息通道开放
        });

        // 标签页更新事件
        chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
            this.handleTabUpdate(tabId, changeInfo, tab);
        });

        // 标签页激活事件
        chrome.tabs.onActivated.addListener((activeInfo) => {
            this.handleTabActivated(activeInfo);
        });

        // 下载事件 - 只在有权限时添加
        if (chrome.downloads && chrome.downloads.onCreated) {
            chrome.downloads.onCreated.addListener((downloadItem) => {
                this.handleDownloadCreated(downloadItem);
            });

            chrome.downloads.onChanged.addListener((delta) => {
                this.handleDownloadChanged(delta);
            });
        }
    }

    async loadSettings() {
        try {
            const result = await chrome.storage.sync.get({
                autoDownload: false,
                enhanceSearch: true,
                quickAccess: true,
                downloadPath: ''
            });
            this.settings = result;
        } catch (error) {
            console.error('Failed to load settings:', error);
            this.settings = {
                autoDownload: false,
                enhanceSearch: true,
                quickAccess: true,
                downloadPath: ''
            };
        }
    }

    handleInstall(details) {
        if (details.reason === 'install') {
            console.log('FK_CNKI installed');
            this.showWelcomePage();
        } else if (details.reason === 'update') {
            console.log('FK_CNKI updated');
        }
    }

    async showWelcomePage() {
        try {
            await chrome.tabs.create({
                url: chrome.runtime.getURL('welcome.html')
            });
        } catch (error) {
            console.error('Failed to show welcome page:', error);
        }
    }

    async handleMessage(message, sender, sendResponse) {
        try {
            switch (message.type) {
                case 'GET_SETTINGS':
                    sendResponse(this.settings);
                    break;

                case 'UPDATE_SETTINGS':
                    await this.updateSettings(message.settings);
                    sendResponse({ success: true });
                    break;

                case 'DOWNLOAD_PAPER':
                    await this.performDownload(message.data);
                    sendResponse({ success: true });
                    break;
                    
                case 'RECORD_DOWNLOAD':
                    await this.addToDownloadHistory(message.data);
                    sendResponse({ success: true });
                    break;

                case 'SEARCH_PAPERS':
                    await this.searchPapers(message.query);
                    sendResponse({ success: true });
                    break;

                case 'GET_DOWNLOAD_HISTORY':
                    const history = await this.getDownloadHistory();
                    sendResponse(history);
                    break;

                case 'OPEN_SETTINGS':
                    this.openSettingsPage();
                    sendResponse({ success: true });
                    break;

                default:
                    sendResponse({ error: 'Unknown message type' });
            }
        } catch (error) {
            console.error('Error handling message:', error);
            sendResponse({ error: error.message });
        }
    }

    async updateSettings(newSettings) {
        try {
            this.settings = { ...this.settings, ...newSettings };
            await chrome.storage.sync.set(this.settings);
            
            // 通知所有相关标签页设置已更改
            try {
                const tabs = await chrome.tabs.query({
                    url: ['*://*.cnki.net/*', '*://*.cnki.com/*']
                });
                
                tabs.forEach(tab => {
                    chrome.tabs.sendMessage(tab.id, {
                        type: 'SETTINGS_CHANGED',
                        settings: this.settings
                    }).catch(() => {
                        // 忽略错误，可能标签页还没有加载content script
                    });
                });
            } catch (error) {
                console.error('Failed to notify tabs:', error);
            }
        } catch (error) {
            console.error('Failed to update settings:', error);
            throw error;
        }
    }

    async downloadPaper(paperInfo) {
        try {
            // 记录下载历史
            await this.addToDownloadHistory(paperInfo);

            // 如果启用了自动下载，尝试下载论文
            if (this.settings.autoDownload) {
                await this.performDownload(paperInfo);
            }

            // 显示通知
            this.showNotification('论文下载', `已添加到下载队列: ${paperInfo.title}`);
        } catch (error) {
            console.error('Failed to download paper:', error);
            this.showNotification('下载失败', `无法下载论文: ${error.message}`);
        }
    }

    async addToDownloadHistory(downloadInfo) {
        try {
            // 获取现有的下载历史
            const result = await chrome.storage.local.get('downloadHistory');
            const downloadHistory = result.downloadHistory || [];
            
            // 添加新的下载记录
            downloadHistory.unshift({
                title: downloadInfo.title,
                url: downloadInfo.url,
                timestamp: downloadInfo.timestamp,
                source: downloadInfo.source || 'FK_CNKI',
                status: 'completed'
            });
            
            // 限制历史记录数量（最多100条）
            if (downloadHistory.length > 100) {
                downloadHistory.splice(100);
            }
            
            // 保存到本地存储
            await chrome.storage.local.set({ downloadHistory: downloadHistory });
            
            console.log('FK_CNKI: 下载历史已记录:', downloadInfo.title);
            
        } catch (error) {
            console.error('FK_CNKI: 记录下载历史失败:', error);
        }
    }

    async performDownload(paperInfo) {
        try {
            console.log('Attempting to download paper:', paperInfo);

            // 示例：创建下载任务
            if (paperInfo.downloadUrl && chrome.downloads) { // Added chrome.downloads check
                await chrome.downloads.download({
                    url: paperInfo.downloadUrl,
                    filename: `${paperInfo.title}.pdf`,
                    saveAs: false
                });
            }
        } catch (error) {
            console.error('Failed to perform download:', error);
            throw error;
        }
    }

    async searchPapers(query) {
        try {
            // 打开搜索页面
            await chrome.tabs.create({
                url: `https://kns.cnki.net/kns8/AdvSearch?q=${encodeURIComponent(query)}`
            });
        } catch (error) {
            console.error('Failed to search papers:', error);
        }
    }

    openSettingsPage() {
        try {
            chrome.tabs.create({
                url: chrome.runtime.getURL('popup.html')
            });
        } catch (error) {
            console.error('Failed to open settings page:', error);
        }
    }

    async getDownloadHistory() {
        try {
            const result = await chrome.storage.local.get('downloadHistory');
            return result.downloadHistory || [];
        } catch (error) {
            console.error('Failed to get download history:', error);
            return [];
        }
    }

    handleTabUpdate(tabId, changeInfo, tab) {
        // 当标签页加载完成时，注入content script
        if (changeInfo.status === 'complete' && tab.url && 
            (tab.url.includes('cnki.net') || tab.url.includes('cnki.com'))) {
            
            // 检查是否已经注入了content script
            try {
                chrome.scripting.executeScript({
                    target: { tabId: tabId },
                    func: () => {
                        return window.cnkiHelperInjected || false;
                    }
                }).then((results) => {
                    if (!results[0].result) {
                        // 注入标记
                        chrome.scripting.executeScript({
                            target: { tabId: tabId },
                            func: () => {
                                window.cnkiHelperInjected = true;
                            }
                        });
                    }
                }).catch(() => {
                    // 忽略错误
                });
            } catch (error) {
                console.error('Failed to handle tab update:', error);
            }
        }
    }

    handleTabActivated(activeInfo) {
        // 当标签页被激活时，可以执行一些操作
        // 例如更新插件图标状态等
    }

    handleDownloadCreated(downloadItem) {
        // 当下载开始时
        console.log('Download started:', downloadItem);
    }

    handleDownloadChanged(delta) {
        // 当下载状态改变时
        if (delta.state && delta.state.current === 'complete') {
            console.log('Download completed:', delta.id);
            this.updateDownloadHistoryStatus(delta.id, 'completed');
        }
    }

    async updateDownloadHistoryStatus(downloadId, status) {
        try {
            const result = await chrome.storage.local.get('downloadHistory');
            const history = result.downloadHistory || [];
            
            // 更新下载状态（这里需要建立下载ID和论文的关联）
            // 实际实现可能需要更复杂的逻辑
            
            await chrome.storage.local.set({ downloadHistory: history });
        } catch (error) {
            console.error('Failed to update download history status:', error);
        }
    }

    showNotification(title, message) {
        try {
            if (chrome.notifications) {
                chrome.notifications.create({
                    type: 'basic',
                    iconUrl: chrome.runtime.getURL('icons/icon48.png'),
                    title: title,
                    message: message
                });
            }
        } catch (error) {
            console.error('Failed to show notification:', error);
        }
    }
}

// 初始化后台脚本
new CNKIHelperBackground();
