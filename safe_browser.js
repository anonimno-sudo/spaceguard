'use strict';
/**
 * SPACEGuard Sovereign Edition
 * Safe Browser — renderer tarafı mantığı
 * BrowserView'ı açar/kapatır, scan sonuçlarını UI'ya yansıtır.
 */

const { ipcRenderer } = require('electron');

let sbShieldOn = true;
let sbOpen     = false;

// ── Viewport bounds hesapla ────────────────────────────────────────────────────
function getSBBounds() {
    const vp = document.getElementById('sb-viewport');
    if (!vp) return { x: 220, y: 200, width: 900, height: 500 };
    const rect = vp.getBoundingClientRect();
    // BrowserView koordinatları pencereye göreli olmalı
    return {
        x:      Math.round(rect.left),
        y:      Math.round(rect.top),
        width:  Math.round(rect.width),
        height: Math.round(rect.height),
    };
}

// ── Güvenli tarayıcıyı aç ─────────────────────────────────────────────────────
async function sbOpen_() {
    if (sbOpen) return;
    const bounds = getSBBounds();
    await ipcRenderer.invoke('open-safe-browser', bounds);
    sbOpen = true;

    // Placeholder'ı gizle (BrowserView viewport'un üstüne biner)
    const ph = document.getElementById('sb-placeholder');
    if (ph) ph.style.visibility = 'hidden';
}

// ── Tab'a girilince otomatik aç, çıkınca kapat ────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
    // Tab switch hook
    const origHandler = window._tabSwitchHook; // override friendly
    document.querySelectorAll('.nav-link').forEach(link => {
        const orig = link.onclick;
        link.addEventListener('click', async () => {
            if (link.dataset.tab === 'safe-browser') {
                setTimeout(async () => {
                    await sbOpen_();
                    // Resize on open
                    const bounds = getSBBounds();
                    await ipcRenderer.invoke('resize-safe-browser', bounds);
                }, 100);
            } else {
                // Leaving safe browser tab — hide BrowserView
                if (sbOpen) {
                    await ipcRenderer.invoke('close-safe-browser');
                    sbOpen = false;
                    const ph = document.getElementById('sb-placeholder');
                    if (ph) ph.style.visibility = 'visible';
                }
            }
        });
    });

    // Resize observer — keep BrowserView in sync when window resizes
    const vp = document.getElementById('sb-viewport');
    if (vp && window.ResizeObserver) {
        const ro = new ResizeObserver(async () => {
            if (sbOpen) {
                const bounds = getSBBounds();
                await ipcRenderer.invoke('resize-safe-browser', bounds);
            }
        });
        ro.observe(vp);
    }
});

// ── IPC — scan events from main process ───────────────────────────────────────
ipcRenderer.on('sb-scan-started', (e, data) => {
    const urlBar   = document.getElementById('sb-url-bar');
    const spinner  = document.getElementById('sb-scan-spinner');
    const statusTx = document.getElementById('sb-status-text');
    const statusIc = document.getElementById('sb-status-icon');
    const blocked  = document.getElementById('sb-blocked-alert');

    if (urlBar)   urlBar.value = data.url;
    if (spinner)  spinner.style.display = 'flex';
    if (statusTx) statusTx.textContent  = 'Taranıyor: ' + data.url;
    if (statusIc) { statusIc.className = 'fa-solid fa-spinner fa-spin'; statusIc.style.color = '#6366f1'; }
    if (blocked)  blocked.style.display = 'none';

    sbAddLog('[BAŞLAT] ' + data.url);
});

ipcRenderer.on('sb-scan-result', (e, data) => {
    const spinner  = document.getElementById('sb-scan-spinner');
    const statusTx = document.getElementById('sb-status-text');
    const statusIc = document.getElementById('sb-status-icon');
    const shieldIc = document.getElementById('sb-shield-icon');

    if (spinner) spinner.style.display = 'none';

    if (data.score < 30) {
        // Güvenli
        if (statusTx) statusTx.textContent = `✓ Güvenli — Risk: %${data.score} — ${data.url}`;
        if (statusIc) { statusIc.className = 'fa-solid fa-shield-halved'; statusIc.style.color = '#22c55e'; }
        if (shieldIc) shieldIc.style.color = '#22c55e';
        sbAddLog(`[TEMİZ] %${data.score} — ${data.url}`);
    } else {
        // Tehlikeli
        if (statusTx) statusTx.textContent = `⚠ Tehlikeli — Risk: %${data.score}`;
        if (statusIc) { statusIc.className = 'fa-solid fa-triangle-exclamation'; statusIc.style.color = '#ef4444'; }
        if (shieldIc) shieldIc.style.color = '#ef4444';
        sbAddLog(`[TEHDİT] %${data.score} — ${data.url} — ${data.reasons.join(', ')}`);
    }
});

ipcRenderer.on('sb-blocked', (e, data) => {
    const alertEl  = document.getElementById('sb-blocked-alert');
    const detailEl = document.getElementById('sb-blocked-detail');

    if (alertEl)  alertEl.style.display = 'flex';
    if (detailEl) detailEl.textContent  =
        `Risk: %${data.score} | ${data.reasons.slice(0,2).join(' · ')}`;

    window.showCustomNotification &&
        window.showCustomNotification('Tehlikeli Site Engellendi!',
            `%${data.score} risk — ${new URL(data.url).hostname}`, 'danger');

    sbAddLog(`[ENGEL] ${data.url} → %${data.score}`);
});

ipcRenderer.on('sb-url-changed', (e, data) => {
    const urlBar = document.getElementById('sb-url-bar');
    if (urlBar) urlBar.value = data.url;
});

ipcRenderer.on('sb-title-changed', (e, data) => {
    // Optionally update tab title
    const statusTx = document.getElementById('sb-status-text');
    // Only update if not scanning
    const spinner = document.getElementById('sb-scan-spinner');
    if (spinner && spinner.style.display === 'none') {
        // leave as-is, already set by scan result
    }
});

// ── Log helper ────────────────────────────────────────────────────────────────
function sbAddLog(msg) {
    const log = document.getElementById('sb-scan-log');
    if (!log) return;
    const time = new Date().toLocaleTimeString('tr-TR');
    const line = document.createElement('div');
    line.style.cssText = 'padding:1px 0;border-bottom:1px solid #0f172a;';
    line.textContent = `[${time}] ${msg}`;
    if (log.firstChild && log.firstChild.textContent === 'Henüz tarama yapılmadı.') {
        log.innerHTML = '';
    }
    log.insertBefore(line, log.firstChild);
    // Keep max 50 entries
    while (log.children.length > 50) log.removeChild(log.lastChild);
}

// ── Global fonksiyonlar (HTML onclick'lerden çağrılır) ────────────────────────
window.sbNavigate = async function(url) {
    const urlBar = document.getElementById('sb-url-bar');
    if (!url) url = urlBar ? urlBar.value.trim() : '';
    if (!url) return;
    if (!url.startsWith('http')) url = 'https://' + url;
    if (urlBar) urlBar.value = url;
    if (!sbOpen) await sbOpen_();
    await ipcRenderer.invoke('safe-browser-navigate', url);
};

window.sbBack = async function() {
    await ipcRenderer.invoke('safe-browser-back');
};
window.sbGoBack = window.sbBack;

window.sbForward = async function() {
    await ipcRenderer.invoke('safe-browser-forward');
};
window.sbGoForward = window.sbForward;

window.sbReload = async function() {
    await ipcRenderer.invoke('safe-browser-reload');
};

window.sbHome = async function() {
    await ipcRenderer.invoke('safe-browser-home');
    const urlBar = document.getElementById('sb-url-bar');
    if (urlBar) urlBar.value = '';
    const ph = document.getElementById('sb-placeholder');
    if (ph) ph.style.visibility = 'visible';
};

window.sbClose = async function() {
    await ipcRenderer.invoke('close-safe-browser');
    sbOpen = false;
    // Switch back to web-protection tab
    const link = document.querySelector('[data-tab="web-protection"]');
    if (link) link.click();
};

window.sbToggleShield = async function() {
    sbShieldOn = !sbShieldOn;
    const toggle = document.getElementById('sb-shield-toggle');
    const icon   = document.getElementById('sb-shield-icon');
    const status = document.getElementById('sb-status-text');

    if (toggle) toggle.classList.toggle('active', sbShieldOn);
    if (icon)   icon.style.color = sbShieldOn ? '#22c55e' : '#ef4444';
    if (status) status.textContent = sbShieldOn
        ? 'Kalkan AKTİF — tüm siteler otomatik taranıyor'
        : '⚠ Kalkan KAPALI — tehlike koruması devre dışı';

    await ipcRenderer.invoke('safe-browser-set-shield', sbShieldOn);

    window.showCustomNotification &&
        window.showCustomNotification('Web Kalkanı',
            sbShieldOn ? 'Otomatik tarama aktifleştirildi' : 'Kalkan devre dışı bırakıldı',
            sbShieldOn ? 'success' : 'danger');
};
