// Electron 主进程：首次启动引导填写 API Key，之后内置启动 server.js 后端再打开应用窗口
// 作者：周梓润
const { app, BrowserWindow, Menu, ipcMain, shell } = require('electron');
const path = require('path');
const fs = require('fs');

const APP_PORT = 31999;

// 配置写进用户数据目录，不打进 asar，避免密钥随安装包泄露
const configFile = () => path.join(app.getPath('userData'), 'sac-config.json');

const REQUIRED_KEYS = ['DEEPSEEK_API_KEY', 'AMAP_WEB_KEY'];
const ALL_KEYS = [
    'DEEPSEEK_API_KEY', 'AMAP_WEB_KEY', 'TIANDITU_KEY', 'QWEATHER_KEY',
    'BAIDU_MAP_AK', 'SUPABASE_URL', 'SUPABASE_ANON_KEY'
];

let mainWindow = null;
let setupWindow = null;

function readConfig() {
    try {
        const data = JSON.parse(fs.readFileSync(configFile(), 'utf8'));
        return data && typeof data === 'object' ? data : {};
    } catch {
        return {};
    }
}

function missingKeys(cfg) {
    return REQUIRED_KEYS.filter(key => !String(cfg[key] || '').trim());
}

// 开发模式下项目根有完整 .env 时跳过引导，方便本地调试
function devEnvReady() {
    if (app.isPackaged) return false;
    const envPath = path.join(__dirname, '..', '.env');
    try {
        if (!fs.existsSync(envPath)) return false;
        const text = fs.readFileSync(envPath, 'utf8');
        return REQUIRED_KEYS.every(key => new RegExp(`^${key}=.+`, 'm').test(text));
    } catch {
        return false;
    }
}

function startBackend() {
    process.env.PORT = String(APP_PORT);
    process.env.ELECTRON_MODE = '1';
    // 先注入用户配置，server.js 的 loadLocalEnv 只在变量为空时补 .env，不会覆盖
    const cfg = readConfig();
    for (const key of ALL_KEYS) {
        const value = String(cfg[key] || '').trim();
        if (value) process.env[key] = value;
    }
    require(path.join(__dirname, '..', 'server.js'));
}

function createWindow() {
    mainWindow = new BrowserWindow({
        width: 1280,
        height: 860,
        minWidth: 420,
        minHeight: 640,
        title: 'Spatial AI Companion',
        icon: path.join(__dirname, '..', 'build', 'icon.ico'),
        autoHideMenuBar: true,
        backgroundColor: '#0f1226',
        webPreferences: {
            contextIsolation: true,
            nodeIntegration: false
        }
    });

    mainWindow.loadURL(`http://127.0.0.1:${APP_PORT}/index.html`);

    mainWindow.on('closed', () => { mainWindow = null; });
}

function createSetupWindow() {
    setupWindow = new BrowserWindow({
        width: 640,
        height: 820,
        resizable: false,
        title: 'Spatial AI Companion - 首次配置',
        autoHideMenuBar: true,
        backgroundColor: '#0f1226',
        webPreferences: {
            contextIsolation: true,
            nodeIntegration: false,
            preload: path.join(__dirname, 'setup-preload.js')
        }
    });
    setupWindow.loadFile(path.join(__dirname, 'setup.html'));
    setupWindow.on('closed', () => { setupWindow = null; });
}

function registerIpc() {
    ipcMain.handle('sac:load-config', () => readConfig());

    ipcMain.handle('sac:save-config', (event, input) => {
        const clean = {};
        for (const key of ALL_KEYS) {
            const value = String((input && input[key]) || '').trim();
            if (value) clean[key] = value;
        }
        const missing = missingKeys(clean);
        if (missing.length) return { ok: false, missing };
        try {
            fs.mkdirSync(path.dirname(configFile()), { recursive: true });
            fs.writeFileSync(configFile(), JSON.stringify(clean, null, 2), 'utf8');
            return { ok: true, path: configFile() };
        } catch (error) {
            return { ok: false, error: error.message };
        }
    });

    ipcMain.handle('sac:config-path', () => configFile());

    ipcMain.handle('sac:open-url', (event, url) => {
        if (typeof url === 'string' && /^https:\/\//i.test(url)) shell.openExternal(url);
    });

    ipcMain.handle('sac:relaunch', () => {
        setTimeout(() => { app.relaunch(); app.exit(0); }, 150);
        return true;
    });
}

// 单实例锁：重复启动时聚焦已有窗口
const gotLock = app.requestSingleInstanceLock();
if (!gotLock) {
    app.quit();
} else {
    app.on('second-instance', () => {
        const target = setupWindow || mainWindow;
        if (target) {
            if (target.isMinimized()) target.restore();
            target.focus();
        }
    });

    app.whenReady().then(() => {
        Menu.setApplicationMenu(null);
        registerIpc();
        if (missingKeys(readConfig()).length && !devEnvReady()) {
            createSetupWindow();
        } else {
            startBackend();
            createWindow();
        }
    });
}

app.on('window-all-closed', () => {
    app.quit();
});
