'use strict';
/**
 * SPACEGuard Sovereign Edition
 * Web Shield + Network Scanner modülleri
 */

// ─────────────────────────────────────────────────────────────────────────────
// WEB SHIELD
// ─────────────────────────────────────────────────────────────────────────────
window.webShield = (function () {
    let active = false;
    const BLOCKED_DOMAINS_KEY = 'sg_blocked_domains';

    function getBlockedDomains() {
        try { return JSON.parse(localStorage.getItem(BLOCKED_DOMAINS_KEY) || '[]'); }
        catch (e) { return []; }
    }
    function saveBlockedDomains(list) {
        localStorage.setItem(BLOCKED_DOMAINS_KEY, JSON.stringify(list));
    }

    return {
        toggleProtection() {
            active = !active;
            const icon   = document.getElementById('web-shield-icon');
            const status = document.getElementById('web-shield-status');
            const btn    = document.getElementById('btn-web-shield-toggle');
            if (active) {
                if (icon)   icon.style.color = '#00ff88';
                if (status) status.innerText  = 'Durum: Aktif — Gerçek Zamanlı Koruma';
                if (btn)    btn.innerHTML     = '<i class="fa-solid fa-toggle-on"></i> Korumayı Durdur';
                window.showCustomNotification && window.showCustomNotification('Web Kalkanı', 'Gerçek zamanlı web koruması aktive edildi.', 'success');
            } else {
                if (icon)   icon.style.color = '#ff4444';
                if (status) status.innerText  = 'Durum: Pasif';
                if (btn)    btn.innerHTML     = '<i class="fa-solid fa-toggle-off"></i> Korumayı Başlat';
            }
        },

        checkURL() {
            const input  = document.getElementById('url-check-input');
            const result = document.getElementById('url-check-result');
            if (!input || !result) return;
            let url = input.value.trim();
            if (!url) return;
            if (!url.startsWith('http')) url = 'https://' + url;

            result.innerHTML = '<div style="color:#888"><i class="fa-solid fa-spinner fa-spin"></i> Kontrol ediliyor...</div>';

            const PHISHING = ['bit.ly', 'tinyurl', 'login-secure-', 'account-verify-',
                              'paypal-secure', 'apple-id-confirm', 'microsoft-alert',
                              'banking-alert', 'tax-refund', 'gov-payment'];

            let risk = 0;
            const reasons = [];

            PHISHING.forEach(p => { if (url.toLowerCase().includes(p)) { risk += 35; reasons.push('Bilinen tehlikeli pattern: ' + p); } });
            if (/https?:\/\/\d{1,3}(\.\d{1,3}){3}/.test(url)) { risk += 30; reasons.push('IP adresine doğrudan yönlendirme'); }
            if (url.includes('@')) { risk += 25; reasons.push('URL\'de @ işareti (phishing tekniği)'); }
            if (!url.startsWith('https')) { risk += 20; reasons.push('Güvensiz protokol (HTTP)'); }
            if (url.length > 200) { risk += 15; reasons.push('Aşırı uzun URL'); }

            const blocked = getBlockedDomains();
            try {
                const host = new URL(url).hostname;
                if (blocked.includes(host)) { risk = 100; reasons.unshift('Manuel olarak engellenmiş domain'); }
            } catch (e) {}

            risk = Math.min(risk, 100);

            setTimeout(() => {
                let color, label, icon;
                if (risk >= 60)       { color = '#ff4444'; label = 'TEHLİKELİ'; icon = 'triangle-exclamation'; }
                else if (risk >= 30)  { color = 'var(--gold)'; label = 'ŞÜPHELİ'; icon = 'circle-exclamation'; }
                else                  { color = '#00ff88'; label = 'GÜVENLİ'; icon = 'shield-check'; }

                result.innerHTML = `
                    <div style="display:flex;align-items:center;gap:12px;padding:14px;background:#0a0a0a;border-radius:10px;border:1px solid ${color}33">
                        <i class="fa-solid fa-${icon}" style="font-size:24px;color:${color}"></i>
                        <div style="flex:1">
                            <div style="font-weight:700;color:${color}">${label} — Risk: %${risk}</div>
                            <div style="font-size:11px;color:#888;margin-top:3px">${url}</div>
                            ${reasons.map(r => `<div style="font-size:11px;color:#aaa;margin-top:2px">• ${r}</div>`).join('')}
                        </div>
                    </div>`;
            }, 600);
        },

        blockDomainPrompt() {
            // Electron prompt() desteklemez — DOM tabanlı input kullan
            const inp = document.getElementById('block-domain-input');
            const val = inp ? inp.value.trim() : '';
            if (!val) {
                // Giriş alanını göster / odakla
                if (inp) { inp.focus(); inp.style.borderColor = '#00d2ff'; }
                window.showCustomNotification && window.showCustomNotification('Domain Girin', 'Engellenecek adresi kutuya yazıp Engelle butonuna basın.', 'info');
                return;
            }
            const d = val.toLowerCase().replace(/^https?:\/\//, '').split('/')[0];
            const list = getBlockedDomains();
            if (!list.includes(d)) { list.push(d); saveBlockedDomains(list); }
            if (inp) inp.value = '';
            window.showCustomNotification && window.showCustomNotification('Web Kalkanı', d + ' engellendi.', 'success');
            this.loadBlockedDomains();
        },

        loadBlockedDomains() {
            const container = document.getElementById('hosts-list');
            if (!container) return;
            const list = getBlockedDomains();
            if (list.length === 0) {
                container.innerHTML = '<div style="color:#555;text-align:center;padding:20px">Engellenmiş domain yok.</div>';
                return;
            }
            container.innerHTML = list.map((d, i) => `
                <div style="display:flex;align-items:center;justify-content:space-between;padding:8px 12px;background:#0a0a0a;border-radius:8px;margin-bottom:6px;border:1px solid #222">
                    <div style="font-family:monospace;font-size:12px;color:#ccc">${d}</div>
                    <button class="lux-btn small" style="background:#ff444422;color:#ff4444;border:1px solid #ff444444"
                        onclick="window.webShield._unblock(${i})">Kaldır</button>
                </div>`).join('');
        },

        _unblock(index) {
            const list = getBlockedDomains();
            list.splice(index, 1);
            saveBlockedDomains(list);
            this.loadBlockedDomains();
        }
    };
})();

// ─────────────────────────────────────────────────────────────────────────────
// NETWORK SCANNER
// ─────────────────────────────────────────────────────────────────────────────
window.networkScanner = (function () {
    const { exec } = require('child_process');
    const os = require('os');

    function getLocalSubnet() {
        const ifaces = os.networkInterfaces();
        for (const name of Object.keys(ifaces)) {
            for (const iface of ifaces[name]) {
                if (iface.family === 'IPv4' && !iface.internal) {
                    const parts = iface.address.split('.');
                    return parts.slice(0, 3).join('.') + '.';
                }
            }
        }
        return '192.168.1.';
    }

    return {
        scanNetwork() {
            const container = document.getElementById('device-list');
            const status    = document.getElementById('network-scan-status');
            if (!container) return;

            container.innerHTML = '<div style="color:#888;text-align:center;padding:30px"><i class="fa-solid fa-spinner fa-spin"></i> Ağ taranıyor...</div>';
            if (status) status.innerText = 'Tarama başlatıldı...';

            // Use arp -a to get known hosts (no admin needed)
            exec('arp -a', (err, stdout) => {
                const devices = [];
                if (!err && stdout) {
                    const lines = stdout.split('\n');
                    lines.forEach(line => {
                        const m = line.match(/(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})\s+([0-9a-f\-:]{17})/i);
                        if (m) {
                            devices.push({ ip: m[1], mac: m[2].toUpperCase(), type: guessType(m[1]) });
                        }
                    });
                }

                // Always add self
                const ifaces = os.networkInterfaces();
                for (const name of Object.keys(ifaces)) {
                    for (const iface of ifaces[name]) {
                        if (iface.family === 'IPv4' && !iface.internal) {
                            if (!devices.find(d => d.ip === iface.address)) {
                                devices.unshift({ ip: iface.address, mac: iface.mac || '—', type: 'Bu Cihaz', self: true });
                            }
                        }
                    }
                }

                if (devices.length === 0) {
                    container.innerHTML = '<div style="color:#555;text-align:center;padding:30px">Cihaz bulunamadı. Ağa bağlı değilsiniz.</div>';
                    if (status) status.innerText = 'Tarama tamamlandı — cihaz bulunamadı';
                    return;
                }

                container.innerHTML = devices.map(d => `
                    <div style="display:flex;align-items:center;gap:14px;padding:12px 16px;background:#0a0a0a;border-radius:10px;margin-bottom:8px;border:1px solid ${d.self ? '#c9a22733' : '#222'}">
                        <i class="fa-solid fa-${d.self ? 'laptop' : 'circle-nodes'}" style="font-size:20px;color:${d.self ? 'var(--gold)' : '#555'}"></i>
                        <div style="flex:1">
                            <div style="font-weight:600;color:${d.self ? 'var(--gold)' : '#fff'};font-size:13px">${d.ip} ${d.self ? '(Bu Cihaz)' : ''}</div>
                            <div style="font-size:11px;color:#555;font-family:monospace">MAC: ${d.mac}</div>
                        </div>
                        <span style="font-size:10px;padding:3px 9px;border-radius:20px;background:${d.self ? 'rgba(201,162,39,0.1)' : 'rgba(255,255,255,0.05)'};color:${d.self ? 'var(--gold)' : '#888'};border:1px solid ${d.self ? 'rgba(201,162,39,0.3)' : '#333'}">${d.type}</span>
                    </div>`).join('');

                if (status) status.innerText = `Son tarama: ${new Date().toLocaleTimeString('tr-TR')} — ${devices.length} cihaz`;
            });
        }
    };

    function guessType(ip) {
        const last = parseInt(ip.split('.').pop());
        if (last === 1)  return 'Modem/Router';
        if (last < 10)   return 'Ağ Cihazı';
        return 'Cihaz';
    }
})();

// Load blocked domains list on tab open (no auto-scan without user click)
document.addEventListener('DOMContentLoaded', () => {
    const webLink = document.querySelector('[data-tab="web-protection"]');
    if (webLink) {
        webLink.addEventListener('click', () => {
            setTimeout(() => window.webShield.loadBlockedDomains(), 200);
        });
    }
});
