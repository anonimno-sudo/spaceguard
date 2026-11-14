'use strict';
/**
 * SPACEGuard Sovereign Edition
 * Eksik global fonksiyonlar: saveSchedule, addExclusion, analyzeWeb wrapper
 */

// ── Scheduled Scan ────────────────────────────────────────────────────────────
window.saveSchedule = function () {
    const typeEl = document.getElementById('schedule-type');
    const timeEl = document.getElementById('schedule-time');
    const status = document.getElementById('schedule-status');
    if (!typeEl || !timeEl) return;

    const type = typeEl.value;
    const time = timeEl.value;

    try {
        localStorage.setItem('sg_schedule_type', type);
        localStorage.setItem('sg_schedule_time', time);
    } catch (e) {}

    if (status) {
        if (type === 'none') {
            status.innerText = 'Zamanlanmış tarama devre dışı.';
        } else {
            status.innerText = `Zamanlanmış tarama: ${type === 'daily' ? 'Her gün' : 'Haftada bir'} ${time} saatinde.`;
        }
    }
    window.showCustomNotification && window.showCustomNotification('Zamanlama Kaydedildi', 'Tarama zamanlaması güncellendi.', 'success');
};

// Restore schedule setting on load
document.addEventListener('DOMContentLoaded', () => {
    try {
        const t = localStorage.getItem('sg_schedule_type');
        const v = localStorage.getItem('sg_schedule_time');
        if (t) { const el = document.getElementById('schedule-type'); if (el) el.value = t; }
        if (v) { const el = document.getElementById('schedule-time'); if (el) el.value = v; }
    } catch (e) {}
});

// ── Exclusions ────────────────────────────────────────────────────────────────
window.addExclusion = function () {
    const input = document.getElementById('exclusion-input');
    const list  = document.getElementById('exclusion-list');
    if (!input) return;

    const val = input.value.trim();
    if (!val) return;

    let exclusions = [];
    try { exclusions = JSON.parse(localStorage.getItem('sg_exclusions') || '[]'); } catch (e) {}

    if (!exclusions.includes(val)) {
        exclusions.push(val);
        try { localStorage.setItem('sg_exclusions', JSON.stringify(exclusions)); } catch (e) {}
    }

    input.value = '';
    renderExclusions();
    window.showCustomNotification && window.showCustomNotification('Hariç Tutma Eklendi', val + ' tarama dışında tutulacak.', 'info');
};

function renderExclusions() {
    const list = document.getElementById('exclusion-list');
    if (!list) return;
    let exclusions = [];
    try { exclusions = JSON.parse(localStorage.getItem('sg_exclusions') || '[]'); } catch (e) {}

    if (exclusions.length === 0) {
        list.innerHTML = '<div style="color:#555;font-size:12px">Henüz hariç tutulan yok.</div>';
        return;
    }
    list.innerHTML = exclusions.map((ex, i) => `
        <div style="display:flex;justify-content:space-between;align-items:center;padding:6px 8px;background:#0a0a0a;border-radius:6px;margin-bottom:4px;border:1px solid #222">
            <span style="font-family:monospace;font-size:11px;color:#ccc">${ex}</span>
            <button class="lux-btn small" style="padding:3px 8px;font-size:10px;" onclick="window._removeExclusion(${i})">Kaldır</button>
        </div>`).join('');
}

window._removeExclusion = function (index) {
    let exclusions = [];
    try { exclusions = JSON.parse(localStorage.getItem('sg_exclusions') || '[]'); } catch (e) {}
    exclusions.splice(index, 1);
    try { localStorage.setItem('sg_exclusions', JSON.stringify(exclusions)); } catch (e) {}
    renderExclusions();
};

document.addEventListener('DOMContentLoaded', renderExclusions);

// ── Statistics sync ───────────────────────────────────────────────────────────
function updateStats() {
    try {
        const ipcRenderer = require('electron').ipcRenderer;
        ipcRenderer.invoke('list-quarantine').then(res => {
            const count = (res && res.list) ? res.list.length : 0;
            const el = document.getElementById('stat-quarantined');
            if (el) el.innerText = count;
        }).catch(() => {});
    } catch (e) {}

    // scans count
    try {
        const totalScans = parseInt(localStorage.getItem('sg_total_scans') || '0');
        const blocked    = parseInt(localStorage.getItem('sg_blocked_threats') || '0');
        const scanned    = parseInt(localStorage.getItem('sg_files_scanned') || '0');

        const els = document.getElementById('stat-total-scans');   if (els) els.innerText = totalScans;
        const elb = document.getElementById('stat-blocked-threats');if (elb) elb.innerText = blocked;
        const elf = document.getElementById('stat-files-scanned'); if (elf) elf.innerText = scanned;
    } catch (e) {}
}

document.addEventListener('DOMContentLoaded', () => {
    updateStats();
    // Refresh stats when settings tab is opened
    document.querySelector('[data-tab="settings"]')?.addEventListener('click', () => {
        setTimeout(updateStats, 100);
    });
});

// Increment scan stats after each scan (listen on scan-message done)
try {
    const { ipcRenderer } = require('electron');
    ipcRenderer.on('scan-message', (event, data) => {
        if (data.type === 'done') {
            try {
                let total   = parseInt(localStorage.getItem('sg_total_scans') || '0') + 1;
                let scanned = parseInt(localStorage.getItem('sg_files_scanned') || '0') + (data.scanned || 0);
                let blocked = parseInt(localStorage.getItem('sg_blocked_threats') || '0') + (data.threats || 0);
                localStorage.setItem('sg_total_scans', total);
                localStorage.setItem('sg_files_scanned', scanned);
                localStorage.setItem('sg_blocked_threats', blocked);
            } catch (e) {}
        }
    });
} catch (e) {}

// ── analyzeWeb wrapper (in case it's called before renderer.js loads) ─────────
if (typeof window.analyzeWeb === 'undefined') {
    window.analyzeWeb = function () {
        console.warn('analyzeWeb called before renderer.js loaded');
    };
}
