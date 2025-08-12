// CNKI Helper Popup Script
class CNKIHelper {
    constructor() {
        this.init();
    }

    init() {
        this.loadSettings();
        this.bindEvents();
        this.updateUI();
    }

    bindEvents() {
        // 功能开关事件
        document.getElementById('autoDownload').addEventListener('change', (e) => {
            this.saveSetting('autoDownload', e.target.checked);
        });

        document.getElementById('enhanceSearch').addEventListener('change', (e) => {
            this.saveSetting('enhanceSearch', e.target.checked);
        });

        document.getElementById('quickAccess').addEventListener('change', (e) => {
            this.saveSetting('quickAccess', e.target.checked);
        });

        // 按钮事件
        document.getElementById('openCNKI').addEventListener('click', () => {
            this.openCNKI();
        });

        document.getElementById('searchPapers').addEventListener('click', () => {
            this.searchPapers();
        });

        document.getElementById('downloadHistory').addEventListener('click', () => {
            this.showDownloadHistory();
        });

        document.getElementById('selectPath').addEventListener('click', () => {
            this.selectDownloadPath();
        });
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

    async saveSetting(key, value) {
        try {
            this.settings[key] = value;
            await chrome.storage.sync.set({ [key]: value });
            
            // 通知background script设置已更改
            try {
                await chrome.runtime.sendMessage({
                    type: 'UPDATE_SETTINGS',
                    settings: { [key]: value }
                });
            } catch (error) {
                console.error('Failed to notify background script:', error);
            }
            
            // 通知content script设置已更改
            try {
                const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
                if (tab && tab.url && (tab.url.includes('cnki.net') || tab.url.includes('cnki.com'))) {
                    chrome.tabs.sendMessage(tab.id, {
                        type: 'SETTINGS_CHANGED',
                        settings: this.settings
                    }).catch(() => {
                        // 忽略错误，可能标签页还没有加载content script
                    });
                }
            } catch (error) {
                console.error('Failed to notify content script:', error);
            }
        } catch (error) {
            console.error('Failed to save setting:', error);
        }
    }

    updateUI() {
        document.getElementById('autoDownload').checked = this.settings.autoDownload;
        document.getElementById('enhanceSearch').checked = this.settings.enhanceSearch;
        document.getElementById('quickAccess').checked = this.settings.quickAccess;
        document.getElementById('downloadPath').value = this.settings.downloadPath;
    }

    openCNKI() {
        chrome.tabs.create({ url: 'https://www.cnki.net/' });
    }

    searchPapers() {
        chrome.tabs.create({ url: 'https://kns.cnki.net/kns8/AdvSearch' });
    }

    async showDownloadHistory() {
        try {
            const result = await chrome.storage.local.get('downloadHistory');
            const history = result.downloadHistory || [];
            
            if (history.length === 0) {
                alert('暂无下载历史');
                return;
            }

            // 创建下载历史弹窗
            this.createHistoryModal(history);
        } catch (error) {
            console.error('Failed to load download history:', error);
            alert('加载下载历史失败');
        }
    }

    createHistoryModal(history) {
        // 移除已存在的弹窗
        const existingModal = document.querySelector('.history-modal');
        if (existingModal) {
            existingModal.remove();
        }

        const modal = document.createElement('div');
        modal.className = 'history-modal';
        modal.innerHTML = `
            <div class="modal-overlay">
                <div class="modal-content">
                    <div class="modal-header">
                        <h3>下载历史</h3>
                        <button class="close-btn">&times;</button>
                    </div>
                    <div class="modal-body">
                        ${history.map(item => `
                            <div class="history-item">
                                <div class="history-title">${item.title || '未知标题'}</div>
                                <div class="history-date">${new Date(item.date || item.timestamp).toLocaleString()}</div>
                                <div class="history-status">${item.status || '未知状态'}</div>
                            </div>
                        `).join('')}
                    </div>
                </div>
            </div>
        `;

        // 添加样式
        const style = document.createElement('style');
        style.textContent = `
            .history-modal {
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                z-index: 1000;
            }
            .modal-overlay {
                position: absolute;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: rgba(0, 0, 0, 0.5);
                display: flex;
                align-items: center;
                justify-content: center;
            }
            .modal-content {
                background: white;
                border-radius: 12px;
                width: 80%;
                max-width: 400px;
                max-height: 80%;
                overflow: hidden;
            }
            .modal-header {
                padding: 20px;
                border-bottom: 1px solid #e9ecef;
                display: flex;
                justify-content: space-between;
                align-items: center;
            }
            .modal-header h3 {
                margin: 0;
                color: #333;
            }
            .close-btn {
                background: none;
                border: none;
                font-size: 24px;
                cursor: pointer;
                color: #999;
            }
            .modal-body {
                padding: 20px;
                max-height: 300px;
                overflow-y: auto;
            }
            .history-item {
                padding: 10px 0;
                border-bottom: 1px solid #f0f0f0;
            }
            .history-title {
                font-weight: 500;
                margin-bottom: 5px;
            }
            .history-date {
                font-size: 12px;
                color: #999;
                margin-bottom: 3px;
            }
            .history-status {
                font-size: 11px;
                color: #666;
                font-style: italic;
            }
        `;

        document.head.appendChild(style);
        document.body.appendChild(modal);

        // 绑定关闭事件
        modal.querySelector('.close-btn').addEventListener('click', () => {
            modal.remove();
        });

        modal.querySelector('.modal-overlay').addEventListener('click', (e) => {
            if (e.target === e.currentTarget) {
                modal.remove();
            }
        });
    }

    selectDownloadPath() {
        // 注意：Chrome插件无法直接访问文件系统
        // 这里只是示例，实际实现可能需要用户手动输入
        const path = prompt('请输入下载文件夹路径（例如：C:\\Downloads\\CNKI）:');
        if (path) {
            this.saveSetting('downloadPath', path);
            document.getElementById('downloadPath').value = path;
        }
    }
}

// 初始化插件
document.addEventListener('DOMContentLoaded', () => {
    new CNKIHelper();
});
