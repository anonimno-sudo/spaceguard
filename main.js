'use strict';
const { app, BrowserWindow, ipcMain, dialog, screen, shell, session, Tray, Menu } = require('electron');
const path = require('path');
const fs   = require('fs');

// Auto-grant media, speech and microphone permissions in Electron
app.commandLine.appendSwitch('enable-speech-dispatcher');
app.commandLine.appendSwitch('use-fake-ui-for-media-stream');

app.setName('SPACEGuard');
app.setAppUserModelId('SPACESecurityLabs.SPACEGuard');

let mainWindow;
let notificationWindow = null;
let tray = null;
let isQuitting = false;

// ── System Tray ───────────────────────────────────────────────────────────────
function createTray() {
    if (tray) return;
    const trayIconPath = path.join(__dirname, 'icon.ico');
    if (!fs.existsSync(trayIconPath)) return;

    try {
        tray = new Tray(trayIconPath);
        const contextMenu = Menu.buildFromTemplate([
            {
                label: 'SPACEGuard\'ı Aç',
                click: () => {
                    if (mainWindow) {
                        mainWindow.show();
                        mainWindow.focus();
                    }
                }
            },
            { type: 'separator' },
            {
                label: 'Tamamen Kapat (Çıkış)',
                click: () => {
                    isQuitting = true;
                    app.quit();
                }
            }
        ]);

        tray.setToolTip('SPACEGuard — Arka Planda Aktif Koruma');
        tray.setContextMenu(contextMenu);

        tray.on('click', () => {
            if (mainWindow) {
                if (mainWindow.isVisible()) {
                    if (mainWindow.isFocused()) {
                        mainWindow.hide();
                    } else {
                        mainWindow.focus();
                    }
                } else {
                    mainWindow.show();
                    mainWindow.focus();
                }
            }
        });
    } catch (e) {
        console.error('Tray creation failed:', e);
    }
}

// ── Create main window ────────────────────────────────────────────────────────
function createWindow() {
    mainWindow = new BrowserWindow({
        width: 1920, height: 1080,
        minWidth: 1100, minHeight: 680,
        frame: true,
        backgroundColor: '#080c18',
        icon: path.join(__dirname, 'icon.ico'),
        webPreferences: {
            nodeIntegration: true,
            nodeIntegrationInWorker: true,
            contextIsolation: false,
        },
    });

    mainWindow.loadFile(path.join(__dirname, 'index.html'));

    // Pencere kapatıldığında uygulamayı kapatma, arka plana gizle
    mainWindow.on('close', (event) => {
        if (!isQuitting) {
            event.preventDefault();
            mainWindow.hide();
            if (tray && process.platform === 'win32') {
                try {
                    tray.displayBalloon({
                        iconType: 'info',
                        title: 'SPACEGuard Aktif',
                        content: 'Uygulama arka planda korumaya devam ediyor. Simgeye tıklayarak tekrar açabilirsiniz.'
                    });
                } catch (_) {}
            }
            return false;
        }
    });

    mainWindow.on('closed', () => { mainWindow = null; });
}

app.on('before-quit', () => {
    isQuitting = true;
});

app.whenReady().then(() => {
    // 1. Auto-approve all media, microphone, speech recognition permissions
    if (session && session.defaultSession) {
        session.defaultSession.setPermissionRequestHandler((webContents, permission, callback) => {
            callback(true); // Grant unconditionally
        });
        session.defaultSession.setPermissionCheckHandler((webContents, permission) => {
            return true;
        });
    }

    createWindow();
    createTray();

    // Pre-create notification window at startup so it's ready immediately
    setTimeout(() => createNotificationWindow(), 2000);
    app.on('activate', () => {
        if (!mainWindow) {
            createWindow();
        } else {
            mainWindow.show();
            mainWindow.focus();
        }
    });
});

app.on('window-all-closed', () => {
    // Pencere kapatılsa dahi arka planda çalışmaya devam eder
});

// ── Desktop notification window ───────────────────────────────────────────────
function createNotificationWindow() {
    if (notificationWindow) return;
    const { width, height } = screen.getPrimaryDisplay().workAreaSize;
    notificationWindow = new BrowserWindow({
        width: 400, height: 150,
        x: width - 420, y: height - 170,
        frame: false, transparent: true,
        alwaysOnTop: true, skipTaskbar: true,
        resizable: false, focusable: false, show: false,
        webPreferences: { nodeIntegration: true, contextIsolation: false },
    });
    notificationWindow.loadFile(path.join(__dirname, 'notification.html'));
    notificationWindow.on('closed', () => { notificationWindow = null; });
}

ipcMain.on('show-desktop-notification', (event, data) => {
    if (!notificationWindow) createNotificationWindow();
    const send = () => {
        notificationWindow.webContents.send('update-notification', data);
        notificationWindow.showInactive();
        setTimeout(() => { if (notificationWindow) notificationWindow.hide(); }, 5000);
    };
    // If already loaded, send immediately (no delay)
    if (!notificationWindow.webContents.isLoading()) {
        send();
    } else {
        notificationWindow.webContents.once('did-finish-load', send);
    }
});

ipcMain.on('restart-app', () => { app.relaunch(); app.exit(0); });

// ── Quarantine ────────────────────────────────────────────────────────────────
const quarantineManager = require(path.join(__dirname, 'quarantine_manager'));
const ConfigSigner      = require(path.join(__dirname, 'config_signer'));
const signaturesPath    = path.join(__dirname, 'signatures.json');
const SIGNATURE_PUB     = path.join(__dirname, 'sg_master_public.pem');

ipcMain.handle('quarantine-file', async (event, args) => {
    try {
        const result = quarantineManager.addToQuarantine(args.path, args.name);
        return result;
    } catch (e) { return { success: false, error: e.message }; }
});

ipcMain.handle('list-quarantine', async () => {
    try { return { success: true, list: quarantineManager.list() }; }
    catch (e) { return { success: false, error: e.message }; }
});

ipcMain.handle('restore-quarantine', async (event, id) => {
    try { return quarantineManager.restore(id); }
    catch (e) { return { success: false, error: e.message }; }
});

ipcMain.handle('remove-quarantine', async (event, id) => {
    try { return quarantineManager.remove(id); }
    catch (e) { return { success: false, error: e.message }; }
});

// ── Signatures ────────────────────────────────────────────────────────────────
ipcMain.handle('verify-signatures', async () => {
    try {
        if (!fs.existsSync(signaturesPath)) return { success: false, error: 'signatures.json eksik' };
        const ok = ConfigSigner.verifyFile(signaturesPath, SIGNATURE_PUB);
        return { success: !!ok };
    } catch (e) { return { success: false, error: e.message }; }
});

ipcMain.handle('refresh-signatures', async () => {
    const https = require('https');
    const os    = require('os');
    const URL   = 'https://raw.githubusercontent.com/Muhammed/SpaceGuard-Updates/main/signatures.json';
    const tmp   = path.join(os.tmpdir(), 'sg_signatures_new.json');

    return new Promise((resolve) => {
        const req = https.get(URL, (res) => {
            if (res.statusCode !== 200) { res.resume(); return resolve({ success: false, error: 'HTTP ' + res.statusCode }); }
            let data = '';
            res.on('data', c => data += c);
            res.on('end', () => {
                try { fs.writeFileSync(tmp, data); } catch (e) { return resolve({ success: false, error: e.message }); }
                const ok = ConfigSigner.verifyFile(tmp, SIGNATURE_PUB);
                if (!ok) { try { fs.unlinkSync(tmp); } catch (e) {} return resolve({ success: false, error: 'İmza doğrulanamadı' }); }
                try { fs.copyFileSync(tmp, signaturesPath); fs.unlinkSync(tmp); resolve({ success: true }); }
                catch (e) { resolve({ success: false, error: e.message }); }
            });
        });
        req.on('error', err => resolve({ success: false, error: err.message }));
        req.setTimeout(10000, () => { req.destroy(); resolve({ success: false, error: 'Zaman aşımı' }); });
    });
});

// ── Scan worker (forked child process) ────────────────────────────────────────
const { fork } = require('child_process');
let scanChild = null;

ipcMain.handle('start-scan', async (event, args) => {
    try {
        if (scanChild) return { success: false, error: 'Zaten bir tarama çalışıyor' };
        const workerPath = path.join(__dirname, 'scan.worker.js');
        scanChild = fork(workerPath, [], { cwd: __dirname, silent: false });

        scanChild.on('message', msg => {
            if (mainWindow && !mainWindow.isDestroyed())
                mainWindow.webContents.send('scan-message', msg);
        });

        scanChild.on('exit', () => {
            scanChild = null;
            if (mainWindow && !mainWindow.isDestroyed())
                mainWindow.webContents.send('scan-message', { type: 'done', scanned: 0, threats: 0, exited: true });
        });

        scanChild.send({ command: 'start', mode: args.mode, targets: args.targets });
        return { success: true };
    } catch (e) { return { success: false, error: e.message }; }
});

ipcMain.handle('stop-scan', async () => {
    try {
        if (scanChild) { scanChild.kill('SIGTERM'); scanChild = null; return { success: true }; }
        return { success: false, error: 'Çalışan tarama yok' };
    } catch (e) { return { success: false, error: e.message }; }
});

// ── Application control ───────────────────────────────────────────────────────
const { exec } = require('child_process');
const blockedAppsFile = path.join(app.getPath('userData'), 'blocked_apps.json');
let blockedApps = [];

function loadBlockedApps() {
    try { if (fs.existsSync(blockedAppsFile)) blockedApps = JSON.parse(fs.readFileSync(blockedAppsFile, 'utf8')) || []; }
    catch (e) { blockedApps = []; }
}
function saveBlockedApps() {
    try { fs.writeFileSync(blockedAppsFile, JSON.stringify(blockedApps, null, 2)); } catch (e) {}
}
loadBlockedApps();

ipcMain.handle('add-blocked-app',    async (e, name) => { const n = name.trim(); if (!n) return { success: false }; if (!blockedApps.includes(n)) { blockedApps.push(n); saveBlockedApps(); } return { success: true, list: blockedApps }; });
ipcMain.handle('remove-blocked-app', async (e, name) => { blockedApps = blockedApps.filter(x => x !== name); saveBlockedApps(); return { success: true, list: blockedApps }; });
ipcMain.handle('list-blocked-apps',  async ()        => ({ success: true, list: blockedApps }));

// Process watcher — kills blocked apps every 5s
setInterval(() => {
    if (!blockedApps || blockedApps.length === 0) return;
    exec('tasklist /fo csv /nh', (err, stdout) => {
        if (err || !stdout) return;
        stdout.split('\r\n').filter(Boolean).forEach(line => {
            const cols = line.split(',');
            const proc = cols[0] ? cols[0].replace(/"/g, '') : '';
            const pid  = cols[1] ? cols[1].replace(/"/g, '') : '';
            if (!proc) return;
            const lower = proc.toLowerCase();
            const SAFE  = ['system', 'idle', 'svchost.exe', 'wininit.exe', 'explorer.exe', 'electron.exe'];
            if (SAFE.some(s => lower.includes(s))) return;
            blockedApps.forEach(b => {
                if (!b) return;
                if (lower === b.toLowerCase() || lower.includes(b.toLowerCase())) {
                    exec(`taskkill /PID ${pid} /F`, (ke) => {
                        if (!ke && mainWindow && !mainWindow.isDestroyed())
                            mainWindow.webContents.send('appcontrol-event', { action: 'killed', process: proc, pid });
                    });
                }
            });
        });
    });
}, 5000);


// ══════════════════════════════════════════════════════════════════════════════
// SAFE BROWSER — BrowserView tabanlı güvenli tarayıcı
// Her URL değişiminde arka planda heuristic tarama yapar.
// Tehlikeli ise blocked.html sayfasına yönlendirir.
// ══════════════════════════════════════════════════════════════════════════════

const { BrowserView } = require('electron');
const https2 = require('https');

let safeBrowserView = null;
let safeBrowserActive = false;
let shieldEnabled = true; // Kullanıcı toggle ile kapatabilir

// Tehdit skoru hesaplama (main process — renderer'a bağımlı değil)
function calcRisk(url, html) {
    let score = 0;
    const reasons = [];
    const low = (html || '').toLowerCase();

    if (!url.startsWith('https')) { score += 30; reasons.push('Güvensiz protokol (HTTP)'); }

    const phishWords = ['verify your account','confirm your identity','suspended','unusual activity',
        'click here to restore','login to continue','hesabınız askıya','kimliğinizi doğrulayın',
        'acil işlem','hesap kapatılacak','account locked','your account has been'];
    phishWords.forEach(w => { if (low.includes(w)) { score += 20; reasons.push('Phishing: "' + w + '"'); } });

    const iframes = (low.match(/<iframe/g) || []).length;
    if (iframes > 0) { score += iframes * 12; reasons.push(iframes + ' gizli iframe'); }

    if (low.includes('eval(') || low.includes('unescape(') || low.includes('fromcharcode') || low.includes('atob(')) {
        score += 35; reasons.push('Obfuscated JS');
    }
    if (low.includes('coinhive') || low.includes('cryptonight') || low.includes('webminer')) {
        score += 60; reasons.push('Kripto madencisi');
    }
    if (low.includes('http-equiv="refresh"') || low.includes("http-equiv='refresh'")) {
        score += 20; reasons.push('Meta refresh yönlendirme');
    }
    if (/https?:\/\/\d{1,3}(\.\d{1,3}){3}/.test(url)) { score += 30; reasons.push('IP adresine doğrudan bağlantı'); }
    if (url.includes('@')) { score += 25; reasons.push('URL\'de @ işareti'); }

    return { score: Math.min(score, 100), reasons };
}

// HTML içeriğini çek (ana process'te)
function fetchHTML(url) {
    return new Promise((resolve) => {
        try {
            const mod = url.startsWith('https') ? https2 : require('http');
            const req = mod.get(url, { timeout: 6000, headers: { 'User-Agent': 'Mozilla/5.0' } }, (res) => {
                let data = '';
                res.setEncoding('utf8');
                res.on('data', c => { data += c; if (data.length > 150000) req.destroy(); });
                res.on('end', () => resolve(data));
            });
            req.on('error', () => resolve(''));
            req.on('timeout', () => { req.destroy(); resolve(''); });
        } catch (e) { resolve(''); }
    });
}

// Engelleme sayfası HTML'i
function buildBlockPage(url, score, reasons) {
    const safeUrl = url.replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
    const reasonList = reasons.map(r => `<li>${r}</li>`).join('');
    return `<!DOCTYPE html><html>
<head><meta charset="UTF-8"><title>SPACEGuard — Engellendi</title>
<style>
  *{margin:0;padding:0;box-sizing:border-box}
  body{font-family:'Segoe UI',sans-serif;background:#050810;color:#e2e8f0;
       display:flex;align-items:center;justify-content:center;min-height:100vh;}
  .card{background:#0f1424;border:1px solid rgba(239,68,68,0.3);border-radius:16px;
        padding:40px;max-width:580px;width:90%;text-align:center;
        box-shadow:0 0 60px rgba(239,68,68,0.15);}
  .shield{font-size:64px;margin-bottom:20px;filter:drop-shadow(0 0 20px #ef4444);}
  h1{font-size:22px;font-weight:700;color:#ef4444;margin-bottom:8px;}
  .sub{color:#94a3b8;font-size:14px;margin-bottom:24px;}
  .url-box{background:#020817;border:1px solid #1e293b;border-radius:8px;
           padding:10px 14px;font-family:monospace;font-size:12px;
           color:#64748b;word-break:break-all;margin-bottom:20px;text-align:left;}
  .score{display:inline-block;background:rgba(239,68,68,0.1);border:1px solid rgba(239,68,68,0.3);
         border-radius:100px;padding:6px 18px;font-size:13px;font-weight:700;
         color:#ef4444;margin-bottom:20px;}
  ul{text-align:left;background:#020817;border-radius:8px;padding:14px 14px 14px 28px;
     margin-bottom:24px;border:1px solid #1e293b;}
  ul li{font-size:12px;color:#94a3b8;padding:3px 0;}
  .btn-group{display:flex;gap:10px;justify-content:center;flex-wrap:wrap;}
  .btn{padding:10px 22px;border-radius:8px;font-size:13px;font-weight:600;
       cursor:pointer;border:none;transition:all .15s;}
  .btn-back{background:#1e293b;color:#e2e8f0;}
  .btn-back:hover{background:#334155;}
  .btn-proceed{background:rgba(239,68,68,0.1);color:#ef4444;
               border:1px solid rgba(239,68,68,0.3);}
  .btn-proceed:hover{background:rgba(239,68,68,0.2);}
  .badge{font-size:10px;color:#6366f1;letter-spacing:.1em;margin-bottom:16px;opacity:.7;}
</style></head>
<body><div class="card">
  <div class="shield">🛡</div>
  <div class="badge">SPACEGUARD SOVEREIGN — WEB SHIELD</div>
  <h1>Bu Site Engellendi</h1>
  <p class="sub">SPACEGuard bu sitede tehlikeli içerik tespit etti.</p>
  <div class="url-box">${safeUrl}</div>
  <div class="score">Risk Skoru: %${score}</div>
  <ul>${reasonList}</ul>
  <div class="btn-group">
    <button class="btn btn-back" onclick="history.back()">← Geri Dön</button>
    <button class="btn btn-back" onclick="window.location.href='about:blank'">Ana Sayfa</button>
    <button class="btn btn-proceed" onclick="window.sg_proceed=true;window.location.href='${safeUrl}'">
      ⚠ Yine de Devam Et (Riskli)
    </button>
  </div>
</div></body></html>`;
}

// SafeBrowser IPC handlers
ipcMain.handle('safe-browser-navigate', async (event, url) => {
    if (!safeBrowserView || !safeBrowserActive) return { error: 'SafeBrowser kapalı' };
    if (!url.startsWith('http')) url = 'https://' + url;
    safeBrowserView.webContents.loadURL(url);
    return { ok: true };
});

ipcMain.handle('safe-browser-back',    async () => { if (safeBrowserView) safeBrowserView.webContents.goBack(); });
ipcMain.handle('safe-browser-forward', async () => { if (safeBrowserView) safeBrowserView.webContents.goForward(); });
ipcMain.handle('safe-browser-reload',  async () => { if (safeBrowserView) safeBrowserView.webContents.reload(); });
ipcMain.handle('safe-browser-home',    async () => { if (safeBrowserView) safeBrowserView.webContents.loadURL('about:blank'); });

ipcMain.handle('safe-browser-set-shield', async (event, enabled) => {
    shieldEnabled = enabled;
    return { ok: true };
});

ipcMain.handle('open-safe-browser', async (event, bounds) => {
    if (!mainWindow) return { error: 'Ana pencere yok' };
    if (safeBrowserView) {
        mainWindow.addBrowserView(safeBrowserView);
        safeBrowserActive = true;
        mainWindow.setBrowserView(safeBrowserView);
        safeBrowserView.setBounds(bounds);
        return { ok: true };
    }

    safeBrowserView = new BrowserView({
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
            javascript: true,
        }
    });

    mainWindow.addBrowserView(safeBrowserView);
    safeBrowserView.setBounds(bounds);
    safeBrowserActive = true;

    // Her URL değişiminde tara
    safeBrowserView.webContents.on('did-navigate', async (e, navUrl) => {
        if (!shieldEnabled) return;
        if (navUrl === 'about:blank' || navUrl.startsWith('data:')) return;

        // Renderer'a "taranıyor" sinyali gönder
        if (mainWindow && !mainWindow.isDestroyed()) {
            mainWindow.webContents.send('sb-scan-started', { url: navUrl });
        }

        const html  = await fetchHTML(navUrl);
        const { score, reasons } = calcRisk(navUrl, html);

        if (mainWindow && !mainWindow.isDestroyed()) {
            mainWindow.webContents.send('sb-scan-result', { url: navUrl, score, reasons });
        }

        if (score >= 30) {
            // Tehlikeli — engelle
            const blockPage = buildBlockPage(navUrl, score, reasons);
            safeBrowserView.webContents.loadURL('data:text/html;charset=utf-8,' + encodeURIComponent(blockPage));

            // Bildirim gönder
            if (mainWindow && !mainWindow.isDestroyed()) {
                mainWindow.webContents.send('sb-blocked', { url: navUrl, score, reasons });
            }
        }
    });

    safeBrowserView.webContents.on('did-navigate-in-page', async (e, navUrl) => {
        if (mainWindow && !mainWindow.isDestroyed()) {
            mainWindow.webContents.send('sb-url-changed', { url: navUrl });
        }
    });

    safeBrowserView.webContents.on('page-title-updated', (e, title) => {
        if (mainWindow && !mainWindow.isDestroyed()) {
            mainWindow.webContents.send('sb-title-changed', { title });
        }
    });

    safeBrowserView.webContents.loadURL('about:blank');
    return { ok: true };
});

ipcMain.handle('close-safe-browser', async () => {
    if (safeBrowserView && mainWindow) {
        mainWindow.removeBrowserView(safeBrowserView);
        safeBrowserActive = false;
    }
    return { ok: true };
});

ipcMain.handle('resize-safe-browser', async (event, bounds) => {
    if (safeBrowserView && safeBrowserActive) {
        safeBrowserView.setBounds(bounds);
    }
    return { ok: true };
});
