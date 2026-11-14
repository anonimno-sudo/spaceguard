'use strict';
/**
 * SPACEGuard Sovereign Edition — Update Manager
 * Gerçek GitHub release kontrolü + progress bar
 */

const UPDATE_BASE = 'https://raw.githubusercontent.com/JoYu-ri/SPACEGuard-Updates/main/';

window.installUpdate = async function () {
    const btn = document.getElementById('btn-do-update');
    const barWrap = document.getElementById('update-progress');
    const bar = document.getElementById('update-bar');
    const statusTxt = document.getElementById('update-status-text');

    if (btn) { btn.disabled = true; btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Kontrol ediliyor...'; }

    try {
        // 1. Read local version
        let localVersion = '26.2.0';
        try {
            const fs = require('fs');
            const path = require('path');
            const raw = fs.readFileSync(path.join(__dirname, 'version.json'), 'utf8');
            localVersion = JSON.parse(raw).version || localVersion;
        } catch (e) { }

        // 2. Fetch remote version
        const resp = await fetch(UPDATE_BASE + 'latest_version.json?t=' + Date.now());
        if (!resp.ok) throw new Error('Sunucu yanıt vermedi: ' + resp.status);
        const remoteData = await resp.json();

        if (statusTxt) statusTxt.innerText = `Yerel: v${localVersion}  ·  Uzak: v${remoteData.version}`;

        if (remoteData.version === localVersion) {
            // Up to date
            if (btn) {
                btn.disabled = false;
                btn.innerHTML = '<i class="fa-solid fa-circle-check"></i> Güncel';
                btn.style.background = '#00ff88';
                btn.style.color = '#000';
                setTimeout(() => {
                    btn.innerHTML = '<i class="fa-solid fa-cloud-arrow-down"></i> Güncellemeyi Denetle';
                    btn.style.background = '';
                    btn.style.color = '';
                }, 3000);
            }
            if (statusTxt) statusTxt.innerText = 'Sisteminiz güncel (v' + localVersion + ')';
            return;
        }

        // New version available — show progress and redirect
        if (barWrap) barWrap.style.display = 'block';
        if (statusTxt) statusTxt.innerText = `v${remoteData.version} mevcut! İndirme sayfasına yönlendiriliyor...`;

        // Animate bar
        let w = 0;
        const tick = setInterval(() => {
            w = Math.min(w + Math.random() * 15, 90);
            if (bar) bar.style.width = w + '%';
        }, 200);

        await new Promise(r => setTimeout(r, 2000));
        clearInterval(tick);
        if (bar) bar.style.width = '100%';

        // Release notes
        const notesList = document.getElementById('release-notes');
        if (notesList && remoteData.releaseNotes) {
            notesList.innerHTML = remoteData.releaseNotes
                .map(n => `<li style="padding:6px 0; border-bottom:1px solid #1a1a1a; color:#ccc;">${n}</li>`)
                .join('');
        }

        // Open releases page
        try {
            require('electron').shell.openExternal('https://github.com/JoYu-ri/SPACEGuard-Updates/releases');
        } catch (e) { }

        if (btn) {
            btn.disabled = false;
            btn.innerHTML = '<i class="fa-solid fa-arrow-up-right-from-square"></i> Sürüm Sayfası Açıldı';
        }

    } catch (e) {
        if (btn) { btn.disabled = false; btn.innerHTML = '<i class="fa-solid fa-triangle-exclamation"></i> Hata'; }
        if (statusTxt) { statusTxt.innerText = 'Güncelleme kontrolü başarısız: ' + e.message; }
    }
};

// Auto-check on changelog tab open removed: user clicks button to check

function renderLocalHistory() {
    const notesList = document.getElementById('release-notes');
    if (!notesList) return;
    try {
        const fs = require('fs');
        const path = require('path');
        const histData = JSON.parse(fs.readFileSync(path.join(__dirname, 'update_history.json'), 'utf8'));
        if (histData && histData.length) {
            notesList.innerHTML = histData.map(item => `
                <li style="padding:12px 14px; border-bottom:1px solid #1a1a1a; margin-bottom:8px; background:rgba(255,255,255,0.02); border-radius:8px;">
                    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:6px;">
                        <strong style="color:#00d2ff; font-size:14px;">v${item.version}</strong>
                        <small style="color:#888;">${item.date}</small>
                    </div>
                    <ul style="margin:0; padding-left:18px; color:#aaa; font-size:12px;">
                        ${item.changes.map(c => `<li style="margin-bottom:3px;">${c}</li>`).join('')}
                    </ul>
                </li>
            `).join('');
        }
    } catch (e) {
        // Fallback static latest history
        notesList.innerHTML = `
            <li style="padding:12px 14px; border-bottom:1px solid #1a1a1a; background:rgba(255,255,255,0.02); border-radius:8px;">
                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:6px;">
                    <strong style="color:#00d2ff; font-size:14px;">v26.1.5</strong>
                    <small style="color:#888;">16.09.2026</small>
                </div>
                <ul style="margin:0; padding-left:18px; color:#aaa; font-size:12px;">
                    <li>Sovereign 3.0 çekirdek kararlılık ve performans optimizasyonu uygulandı.</li>
                    <li>Tüm arayüz butonlarına gelişmiş dokunsal (tactile) tıklama ve ses animasyonları entegre edildi.</li>
                    <li>Safe Browser köprüleri ve gezinti motoru kararlı sürüme güncellendi.</li>
                    <li>Fidye yazılımı canarya tuzağı, Web kalkanı ve AI Copilot modelleri güncellendi.</li>
                </ul>
            </li>`;
    }
}
document.addEventListener('DOMContentLoaded', renderLocalHistory);
