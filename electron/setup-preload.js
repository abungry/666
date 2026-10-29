// 引导页预加载：只暴露配置读写和打开外链，不放开 Node 能力
// 作者：周梓润
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('sacSetup', {
    load: () => ipcRenderer.invoke('sac:load-config'),
    save: cfg => ipcRenderer.invoke('sac:save-config', cfg),
    configPath: () => ipcRenderer.invoke('sac:config-path'),
    openUrl: url => ipcRenderer.invoke('sac:open-url', url),
    relaunch: () => ipcRenderer.invoke('sac:relaunch')
});
