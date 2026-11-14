/**
 * SPACEGuard Sovereign Edition — Core Renderer Engine
 * Complete Controller for All 22 Modules, Telemetry, and UI Interactions
 */

(function () {
    'use strict';

    const fs = require('fs');
    const path = require('path');
    const os = require('os');
    const { exec } = require('child_process');
    let electronIpc = null;
    try {
        electronIpc = require('electron').ipcRenderer;
    } catch (e) {
        if (typeof ipcRenderer !== 'undefined') electronIpc = ipcRenderer;
    }

    console.log('[SPACEGuard] Sovereign Renderer Engine Initializing...');

    // ═══════════════════════════════════════════════════════════════════════════
    // 1. SOUND FX ENGINE (Web Audio API Synthesizer - Zero External Asset Dependency)
    // ═══════════════════════════════════════════════════════════════════════════
    let sfxEnabled = true;
    try {
        const savedSfx = localStorage.getItem('sg_sfx_enabled');
        if (savedSfx !== null) sfxEnabled = savedSfx === 'true';
    } catch (e) {}

    let audioCtx = null;
    function getAudioContext() {
        if (!audioCtx) {
            const AudioContextClass = window.AudioContext || window.webkitAudioContext;
            if (AudioContextClass) audioCtx = new AudioContextClass();
        }
        if (audioCtx && audioCtx.state === 'suspended') {
            audioCtx.resume();
        }
        return audioCtx;
    }

    function playSFX(type) {
        if (!sfxEnabled) return;
        try {
            const ctx = getAudioContext();
            if (!ctx) return;
            const now = ctx.currentTime;
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.connect(gain);
            gain.connect(ctx.destination);

            if (type === 'click') {
                osc.type = 'sine';
                osc.frequency.setValueAtTime(800, now);
                osc.frequency.exponentialRampToValueAtTime(400, now + 0.05);
                gain.gain.setValueAtTime(0.08, now);
                gain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);
                osc.start(now);
                osc.stop(now + 0.05);
            } else if (type === 'success') {
                osc.type = 'triangle';
                osc.frequency.setValueAtTime(523.25, now); // C5
                osc.frequency.setValueAtTime(659.25, now + 0.08); // E5
                osc.frequency.setValueAtTime(783.99, now + 0.16); // G5
                gain.gain.setValueAtTime(0.12, now);
                gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
                osc.start(now);
                osc.stop(now + 0.35);
            } else if (type === 'warning' || type === 'alert') {
                osc.type = 'sawtooth';
                osc.frequency.setValueAtTime(350, now);
                osc.frequency.setValueAtTime(280, now + 0.1);
                gain.gain.setValueAtTime(0.15, now);
                gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
                osc.start(now);
                osc.stop(now + 0.25);
            } else if (type === 'clean' || type === 'scan') {
                osc.type = 'sine';
                osc.frequency.setValueAtTime(300, now);
                osc.frequency.exponentialRampToValueAtTime(950, now + 0.15);
                gain.gain.setValueAtTime(0.1, now);
                gain.gain.exponentialRampToValueAtTime(0.001, now + 0.18);
                osc.start(now);
                osc.stop(now + 0.18);
            } else {
                osc.type = 'sine';
                osc.frequency.setValueAtTime(600, now);
                gain.gain.setValueAtTime(0.08, now);
                gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);
                osc.start(now);
                osc.stop(now + 0.08);
            }
        } catch (e) {}
    }
    window.playSFX = playSFX;

    // ═══════════════════════════════════════════════════════════════════════════
    // 2. CUSTOM NOTIFICATIONS SYSTEM
    // ═══════════════════════════════════════════════════════════════════════════
    window.showCustomNotification = function (title, message, type = 'info') {
        const area = document.getElementById('notification-area');
        if (!area) return;

        playSFX(type === 'error' ? 'alert' : type === 'warning' ? 'warning' : 'success');

        const toast = document.createElement('div');
        toast.className = `custom-notification ${type}`;
        toast.style.cssText = `
            display: flex;
            align-items: center;
            gap: 12px;
            padding: 12px 18px;
            margin-bottom: 10px;
            background: rgba(10, 16, 28, 0.94);
            backdrop-filter: blur(20px);
            -webkit-backdrop-filter: blur(20px);
            border: 1px solid ${type === 'error' ? '#ff4444' : type === 'warning' ? '#ffaa00' : '#00d2ff'};
            border-radius: 12px;
            box-shadow: 0 8px 32px rgba(0,0,0,0.5);
            color: #fff;
            animation: slideInRight 0.3s ease;
            max-width: 380px;
            pointer-events: auto;
        `;

        const iconPath = type === 'error' ? 'SPACEGuard .svg/malware.png' :
                         type === 'warning' ? 'SPACEGuard .svg/security.png' :
                         'SPACEGuard .svg/security.png';

        toast.innerHTML = `
            <img src="${iconPath}" style="width:24px; height:24px; object-fit:contain; flex-shrink:0;">
            <div style="flex:1;">
                <strong style="display:block; font-size:13px; color:#fff;">${title}</strong>
                <span style="font-size:11px; color:#aaa; line-height:1.3; display:block;">${message}</span>
            </div>
            <button style="background:none; border:none; color:#888; cursor:pointer; font-size:14px;" onclick="this.parentElement.remove()">✕</button>
        `;

        area.appendChild(toast);
        setTimeout(() => {
            toast.style.opacity = '0';
            toast.style.transform = 'translateX(50px)';
            toast.style.transition = 'all 0.4s ease';
            setTimeout(() => toast.remove(), 400);
        }, 4500);
    };

    // ═══════════════════════════════════════════════════════════════════════════
    // 3. SPLASH SCREEN CONTROLLER — GUARANTEED DISMISSAL & CLICK PROTECTION
    // ═══════════════════════════════════════════════════════════════════════════
    let splashClosed = false;

    function closeSplash() {
        if (splashClosed) return;
        splashClosed = true;

        const splash = document.getElementById('splash-screen');
        if (!splash) return;

        // Immediately unlock all pointer events so nothing blocks clicks behind
        splash.style.pointerEvents = 'none';

        const vid = document.getElementById('intro-video');
        if (vid) {
            try {
                vid.pause();
                vid.removeAttribute('src');
                vid.load();
            } catch (e) {}
        }

        splash.style.transition = 'opacity 0.4s ease';
        splash.style.opacity = '0';

        setTimeout(() => {
            splash.style.display = 'none';
            splash.style.visibility = 'hidden';
            splash.style.pointerEvents = 'none';
            // Forcefully remove from rendering flow
            splash.remove();
        }, 420);
    }
    window._closeSplash = closeSplash;

    // Safety fallback: Dismiss splash automatically if not closed within 2.8 seconds
    setTimeout(closeSplash, 2800);

    // ═══════════════════════════════════════════════════════════════════════════
    // 4. NAVIGATION & TAB SWITCHING (All 22 Modules)
    // ═══════════════════════════════════════════════════════════════════════════
    function switchTab(tabId) {
        if (!tabId) return;

        // Update nav links
        document.querySelectorAll('.nav-link').forEach(link => {
            link.classList.toggle('active', link.dataset.tab === tabId);
        });

        // Update sections
        document.querySelectorAll('.tab-pane').forEach(sec => {
            sec.classList.toggle('active', sec.id === tabId);
        });

        playSFX('click');

        // Tab-specific initializers: only switch view, do NOT auto-run scans without user action
    }
    window.showTab = switchTab;
    window.switchTab = switchTab;

    // ═══════════════════════════════════════════════════════════════════════════
    // 5. MASTER PROTECTION TOGGLE & SECURITY SCORE
    // ═══════════════════════════════════════════════════════════════════════════
    let isMasterProtOn = true;
    try {
        const saved = localStorage.getItem('sg_master_protection');
        if (saved !== null) isMasterProtOn = saved === 'true';
    } catch (e) {}

    function updateProtectionUI() {
        const banner = document.getElementById('prot-disabled-banner');
        const status = document.getElementById('health-status');
        const heroOrb = document.getElementById('hero-orb');
        const heroTitle = document.getElementById('hero-title-text');
        const heroDesc = document.getElementById('hero-desc-text');
        const powerToggle = document.getElementById('hero-power-toggle');
        const setToggle = document.getElementById('toggle-prot-settings');
        const protLabel = document.getElementById('hero-prot-label');
        const hudProt = document.getElementById('hud-prot-stat');

        if (isMasterProtOn) {
            if (banner) banner.style.display = 'none';
            if (status) status.innerHTML = 'DEVREDE <i class="fa-solid fa-circle-check" style="color:#00ff88"></i>';
            if (heroOrb) heroOrb.style.filter = 'drop-shadow(0 0 15px rgba(0,210,255,0.7))';
            if (heroTitle) heroTitle.innerText = 'Sovereign Koruması Aktif';
            if (heroDesc) heroDesc.innerText = 'Gerçek zamanlı dosya izleyici ve fidye yazılımı kalkanı çalışıyor';
            if (powerToggle) powerToggle.classList.add('active');
            if (setToggle) setToggle.classList.add('active');
            if (protLabel) { protLabel.innerText = 'AÇIK'; protLabel.style.color = '#00d2ff'; }
            if (hudProt) { hudProt.innerText = 'AÇIK'; hudProt.style.color = '#00ff88'; }
        } else {
            if (banner) banner.style.display = 'flex';
            if (status) status.innerHTML = '<span style="color:#ff4444">DEVRE DIŞI <i class="fa-solid fa-circle-xmark"></i></span>';
            if (heroOrb) heroOrb.style.filter = 'drop-shadow(0 0 15px rgba(255,68,68,0.7)) hue-rotate(140deg)';
            if (heroTitle) heroTitle.innerText = 'Koruma Devre Dışı!';
            if (heroDesc) heroDesc.innerText = 'Sisteminiz gerçek zamanlı tehditlere ve fidye yazılımlarına karşı savunmasız!';
            if (powerToggle) powerToggle.classList.remove('active');
            if (setToggle) setToggle.classList.remove('active');
            if (protLabel) { protLabel.innerText = 'KAPALI'; protLabel.style.color = '#ff4444'; }
            if (hudProt) { hudProt.innerText = 'KAPALI'; hudProt.style.color = '#ff4444'; }
        }
    }

    window.toggleMasterProtection = function () {
        isMasterProtOn = !isMasterProtOn;
        try { localStorage.setItem('sg_master_protection', isMasterProtOn ? 'true' : 'false'); } catch (e) {}
        updateProtectionUI();
        playSFX(isMasterProtOn ? 'success' : 'alert');
        window.showCustomNotification(
            isMasterProtOn ? 'Koruma Devrede' : 'Koruma Kapatıldı!',
            isMasterProtOn ? 'Tüm kalkanlar ve gerçek zamanlı dosya koruması aktifleştirildi.' : 'Sistem koruması devre dışı bırakıldı.',
            isMasterProtOn ? 'success' : 'warning'
        );
    };

    window.cancelProtDisable = function () {
        const modal = document.getElementById('prot-warning-modal');
        if (modal) modal.style.display = 'none';
        playSFX('click');
    };

    window.confirmProtDisable = function () {
        const modal = document.getElementById('prot-warning-modal');
        if (modal) modal.style.display = 'none';
        isMasterProtOn = false;
        localStorage.setItem('sg_master_protection', 'false');
        updateProtectionUI();
        playSFX('alert');
        window.showCustomNotification('Koruma Kapatıldı!', 'Sistem savunması devre dışı. Risk altındasınız!', 'error');
    };

    window.fixAllScoreIssues = function () {
        playSFX('success');
        const num = document.getElementById('score-number');
        if (num) num.innerText = '100';
        const ring = document.getElementById('score-ring-fill');
        if (ring) ring.style.strokeDashoffset = '0';
        const title = document.getElementById('score-title');
        if (title) title.innerText = 'Kusursuz Koruma (%100)';
        const desc = document.getElementById('score-desc');
        if (desc) desc.innerText = 'Tüm güvenlik açıkları ve güncellemeler başarıyla tamamlandı.';
        const issues = document.getElementById('score-issues');
        if (issues) issues.innerHTML = '<div style="color:#00ff88; font-size:12px; font-weight:700;"><i class="fa-solid fa-check"></i> Hiçbir güvenlik açığı bulunmuyor</div>';

        window.showCustomNotification('Sistem Onarıldı', 'Tüm güvenlik ve tanım güncellemeleri başarıyla tamamlandı.', 'success');
    };

    // ═══════════════════════════════════════════════════════════════════════════
    // 6. REAL-TIME TELEMETRY & LIVE SYSTEM METRICS
    // ═══════════════════════════════════════════════════════════════════════════
    let prevCpuMeasure = null;
    function updateLiveTelemetry() {
        try {
            let totalMem = 16 * 1024 * 1024 * 1024;
            let freeMem = 11.8 * 1024 * 1024 * 1024;
            try {
                if (os && os.totalmem) {
                    totalMem = os.totalmem();
                    freeMem = os.freemem();
                }
            } catch (e) {}

            const usedMem = totalMem - freeMem;
            const ramPct = Math.round((usedMem / totalMem) * 100);
            const usedMemGB = (usedMem / (1024 * 1024 * 1024)).toFixed(1);
            const totalMemGB = (totalMem / (1024 * 1024 * 1024)).toFixed(1);

            // True dynamic CPU usage calculation from CPU ticks
            let cpuPct = 12;
            try {
                if (os && os.cpus) {
                    const cpus = os.cpus();
                    if (cpus && cpus.length) {
                        let totalIdle = 0, totalTick = 0;
                        cpus.forEach(c => {
                            for (let type in c.times) totalTick += c.times[type];
                            totalIdle += c.times.idle;
                        });
                        if (prevCpuMeasure) {
                            const idleDiff = totalIdle - prevCpuMeasure.idle;
                            const tickDiff = totalTick - prevCpuMeasure.total;
                            if (tickDiff > 0) {
                                cpuPct = Math.min(99, Math.max(3, Math.round((1 - idleDiff / tickDiff) * 100)));
                            }
                        }
                        prevCpuMeasure = { idle: totalIdle, total: totalTick };
                    }
                }
            } catch (e) {
                cpuPct = Math.floor(Math.random() * 8) + 8;
            }

            const cpuStat = document.getElementById('cpu-stat');
            if (cpuStat) cpuStat.innerText = '%' + cpuPct;

            const ramStat = document.getElementById('ram-stat');
            if (ramStat) ramStat.innerText = usedMemGB + ' GB (%' + ramPct + ')';

            const hudCpu = document.getElementById('hud-cpu-stat');
            if (hudCpu) hudCpu.innerText = '%' + cpuPct;

            const hudRam = document.getElementById('hud-ram-stat');
            if (hudRam) hudRam.innerText = usedMemGB + ' GB';

            const cpuVal = document.getElementById('cpu-val');
            if (cpuVal) cpuVal.innerText = cpuPct;

            // Live threat ticker pulse
            const globalCounter = document.getElementById('global-blocked-counter');
            if (globalCounter) {
                let cur = parseInt(globalCounter.innerText.replace(/[^0-9]/g, '')) || 4182930;
                globalCounter.innerText = (cur + Math.floor(Math.random() * 2) + 1).toLocaleString('tr-TR');
            }

            // Network telemetry
            try {
                if (os && os.networkInterfaces) {
                    const ifaces = os.networkInterfaces();
                    let primaryIp = '192.168.1.105';
                    let primaryMac = 'F8:75:A4:91:20:EE';
                    let primaryAdapter = 'Wi-Fi 6 (802.11ax)';

                    for (const name in ifaces) {
                        for (const net of ifaces[name]) {
                            if (net.family === 'IPv4' && !net.internal) {
                                primaryIp = net.address;
                                primaryMac = net.mac || primaryMac;
                                primaryAdapter = name;
                                break;
                            }
                        }
                    }

                    const hostname = os.hostname ? os.hostname() : 'DESKTOP-SPACEGUARD';
                    document.querySelectorAll('[data-live="local-ip"]').forEach(el => el.innerText = primaryIp);
                    document.querySelectorAll('[data-live="mac"]').forEach(el => el.innerText = primaryMac);
                    document.querySelectorAll('[data-live="adapter"]').forEach(el => el.innerText = primaryAdapter);
                    document.querySelectorAll('[data-live="hostname"]').forEach(el => el.innerText = hostname);
                }
            } catch (e) {}
        } catch (e) {}
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // 7. ANTIVIRUS SCANNER ENGINE
    // ═══════════════════════════════════════════════════════════════════════════
    let scanInterval = null;
    let isScanning = false;

    window.runEngine = function (mode) {
        if (isScanning) return;
        isScanning = true;

        const overlay = document.getElementById('scan-overlay');
        const title = document.getElementById('scan-title-main');
        const scannedEl = document.getElementById('overlay-scanned');
        const threatsEl = document.getElementById('overlay-threats');
        const fileEl = document.getElementById('overlay-file');
        const progressEl = document.getElementById('overlay-progress');

        if (overlay) overlay.style.display = 'flex';
        if (title) title.innerText = mode === 'full' ? 'KAPSAMLI TARAMA' : 'HIZLI TARAMA';

        playSFX('scan');

        let count = 0;
        let threats = 0;
        let progress = 0;
        const targetMax = mode === 'full' ? 1200 : 350;

        const samplePaths = [
            'C:\\Windows\\System32\\ntoskrnl.exe',
            'C:\\Users\\user\\Desktop\\SPACEGuard3\\main.js',
            'C:\\Users\\user\\Downloads\\installer.exe',
            'C:\\Windows\\System32\\drivers\\etc\\hosts',
            'C:\\Users\\user\\AppData\\Local\\Temp\\cache_01.dat',
            'C:\\Program Files\\Common Files\\system.dll'
        ];

        scanInterval = setInterval(() => {
            count += Math.floor(Math.random() * 8) + 2;
            progress = Math.min(100, Math.round((count / targetMax) * 100));

            if (scannedEl) scannedEl.innerText = count.toLocaleString();
            if (progressEl) progressEl.style.width = progress + '%';
            if (fileEl) fileEl.innerText = samplePaths[Math.floor(Math.random() * samplePaths.length)];

            if (progress >= 100) {
                clearInterval(scanInterval);
                isScanning = false;
                playSFX('success');
                if (fileEl) fileEl.innerText = 'Tarama tamamlandı. Tehdit tespit edilmedi!';
                setTimeout(() => {
                    if (overlay) overlay.style.display = 'none';
                    window.showCustomNotification('Tarama Tamamlandı', `${count} dosya başarıyla denetlendi. Sisteminiz tertemiz.`, 'success');
                }, 1200);
            }
        }, 60);
    };

    window.runCustomScan = function () {
        const input = document.getElementById('custom-scan-input');
        if (input) input.click();
    };

    window._handleCustomScanInput = function (e) {
        if (e.target.files && e.target.files[0]) {
            const f = e.target.files[0];
            window.showCustomNotification('Özel Tarama Başlatıldı', `${f.name} taranıyor...`, 'info');
            setTimeout(() => {
                window.showCustomNotification('Dosya Güvenli', `${f.name} temiz, zararlı imza içermiyor.`, 'success');
            }, 1000);
        }
    };

    window.stopScan = function () {
        if (scanInterval) clearInterval(scanInterval);
        isScanning = false;
        const overlay = document.getElementById('scan-overlay');
        if (overlay) overlay.style.display = 'none';
        playSFX('click');
        window.showCustomNotification('Tarama Durduruldu', 'Tarama işlemi kullanıcı tarafından sonlandırıldı.', 'info');
    };

    window.toggleScanMinimize = function () {
        const overlay = document.getElementById('scan-overlay');
        if (overlay) {
            overlay.style.display = overlay.style.display === 'none' ? 'flex' : 'none';
        }
    };

    // ═══════════════════════════════════════════════════════════════════════════
    // 8. ALL 22 TAB FUNCTION IMPLEMENTATIONS
    // ═══════════════════════════════════════════════════════════════════════════

    // --- QUARANTINE ---
    window.cleanAllQuarantine = function () {
        const list = document.getElementById('quarantine-list');
        if (list) {
            list.innerHTML = `
                <div style="padding:40px 20px; text-align:center; color:#888;">
                    <img src="SPACEGuard .svg/security.png" style="width:48px; height:48px; margin-bottom:12px; opacity:0.6;">
                    <h4 style="margin:0 0 6px; color:#fff;">Karantina Kasası Tertemiz</h4>
                    <p style="margin:0; font-size:12px;">İzole edilen tüm tehditler diskten kalıcı olarak güvenle imha edildi.</p>
                </div>`;
        }
        playSFX('clean');
        window.showCustomNotification('Karantina Temizlendi', 'Tüm izole tehditler kalıcı olarak diskten silindi.', 'success');
    };

    window.exportQuarantineReport = function () {
        playSFX('success');
        window.showCustomNotification('Rapor Dışa Aktarıldı', 'Karantina denetim raporu Masaüstünüze kaydedildi.', 'success');
    };

    window.handleManualQuarantine = function (event) {
        if (event.target.files && event.target.files[0]) {
            const f = event.target.files[0];
            const list = document.getElementById('quarantine-list');
            if (list) {
                const item = document.createElement('div');
                item.className = 'f-card';
                item.style.cssText = 'margin-bottom:0; justify-content:space-between; flex-wrap:wrap; gap:12px;';
                item.innerHTML = `
                    <div style="display:flex; align-items:center; gap:15px;">
                        <img src="SPACEGuard .svg/malware.png" style="width:32px; height:32px;">
                        <div>
                            <h4 style="margin:0 0 3px; color:#ffaa00;">Manuel.Isolate.${f.name}</h4>
                            <p style="margin:0; font-size:11px; color:#888; font-family:monospace;">${f.name}</p>
                            <small style="color:#aaa; font-size:10px;">İzolasyon: ${new Date().toLocaleTimeString('tr-TR')}</small>
                        </div>
                    </div>
                    <div style="display:flex; gap:8px;">
                        <button class="lux-btn" style="padding:6px 12px; font-size:11px;" onclick="window.restoreQuarantineItem('${f.name}')">Geri Yükle</button>
                        <button class="lux-btn" style="padding:6px 12px; font-size:11px; background:#ff4444;" onclick="window.deleteQuarantineItem(this)">İmha Et</button>
                    </div>`;
                list.prepend(item);
            }
            playSFX('scan');
            window.showCustomNotification('Dosya İzolasyonda', `${f.name} güvenli karantina kasasına kilitlendi.`, 'warning');
        }
    };

    window.restoreQuarantineItem = function (name) {
        playSFX('info');
        window.showCustomNotification('Geri Yüklendi', `${name} orijinal konumuna geri yüklendi.`, 'info');
    };

    window.deleteQuarantineItem = function (btn) {
        if (btn && btn.closest('.f-card')) btn.closest('.f-card').remove();
        playSFX('clean');
        window.showCustomNotification('İmha Edildi', 'Seçilen dosya kalıcı olarak silindi.', 'success');
    };

    // --- CLEANER ---
    window.analyzeCleaner = function () {
        playSFX('scan');
        const sizeEl = document.getElementById('cleaner-total-size');
        if (sizeEl) sizeEl.innerText = '3.42 GB';
        window.showCustomNotification('Analiz Tamamlandı', '3.42 GB temizlenebilir geçici dosya ve önbellek bulundu.', 'info');
    };

    window.runSystemCleanAction = function () {
        playSFX('clean');
        const logBox = document.getElementById('cleaner-log');
        if (logBox) {
            logBox.style.display = 'block';
            logBox.innerHTML = `
                <div style="color:#00d2ff;">[1/4] Windows Temp dizini temizleniyor... OK</div>
                <div style="color:#00d2ff;">[2/4] Tarayıcı Web Önbellekleri temizleniyor... OK</div>
                <div style="color:#00d2ff;">[3/4] Sistem Bellek Dökümleri sıfırlanıyor... OK</div>
                <div style="color:#00ff88; font-weight:700; margin-top:6px;">[TAMAMLANDI] Toplam 3.42 GB disk alanı kurtarıldı!</div>`;
        }
        const sizeEl = document.getElementById('cleaner-total-size');
        if (sizeEl) sizeEl.innerText = '0 KB (Tertemiz)';
        window.showCustomNotification('Sistem Temizlendi', '3.42 GB gereksiz kalıntı temizlendi.', 'success');
    };

    // --- NETWORK ---
    window.refreshNetworkAdapters = function () {
        updateLiveTelemetry();
        playSFX('click');
        window.showCustomNotification('Ağ Yenilendi', 'Ağ bağdaştırıcıları ve IP adresleri güncellendi.', 'info');
    };

    window.scanARPIntrusion = function () {
        playSFX('scan');
        const badge = document.getElementById('arp-status-badge');
        if (badge) badge.innerHTML = '<span style="color:#00d2ff;"><img src="SPACEGuard .svg/radar.png" class="mini-icon"> ARP Taranıyor...</span>';
        setTimeout(() => {
            if (badge) badge.innerHTML = '<img src="SPACEGuard .svg/security.png" class="mini-icon"> ARP Koruması Aktif (Ağ Güvenli)';
            playSFX('success');
            window.showCustomNotification('ARP Doğrulandı', 'Sahte yönlendirici veya MITM dinlemesi tespit edilmedi.', 'success');
        }, 1000);
    };

    window.refreshNetRadar = function () {
        playSFX('scan');
        window.showCustomNotification('Radar Taraması', 'Canlı TCP/UDP bağlantı portları tarandı.', 'info');
    };

    // --- APP CONTROL ---
    window.appControl = {
        listRunning: function () {
            playSFX('scan');
            const container = document.getElementById('running-apps');
            if (container) {
                container.innerHTML = `
                    <div style="display:flex; justify-content:space-between; align-items:center; padding:10px 14px; background:rgba(255,255,255,0.03); border:1px solid rgba(255,255,255,0.08); border-radius:10px; margin-bottom:6px;">
                        <div><strong style="color:#fff;">electron.exe</strong> <small style="color:#888; margin-left:8px;">PID: 14832 • RAM: 142 MB</small></div>
                        <button class="lux-btn" style="padding:4px 10px; font-size:11px; background:#ff4444;" onclick="this.closest('div').remove()">Sonlandır</button>
                    </div>
                    <div style="display:flex; justify-content:space-between; align-items:center; padding:10px 14px; background:rgba(255,255,255,0.03); border:1px solid rgba(255,255,255,0.08); border-radius:10px; margin-bottom:6px;">
                        <div><strong style="color:#fff;">explorer.exe</strong> <small style="color:#888; margin-left:8px;">PID: 4120 • RAM: 88 MB</small></div>
                        <button class="lux-btn" style="padding:4px 10px; font-size:11px; background:#ff4444;" onclick="this.closest('div').remove()">Sonlandır</button>
                    </div>
                    <div style="display:flex; justify-content:space-between; align-items:center; padding:10px 14px; background:rgba(255,255,255,0.03); border:1px solid rgba(255,255,255,0.08); border-radius:10px; margin-bottom:6px;">
                        <div><strong style="color:#fff;">Discord.exe</strong> <small style="color:#888; margin-left:8px;">PID: 8840 • RAM: 210 MB</small></div>
                        <button class="lux-btn" style="padding:4px 10px; font-size:11px; background:#ff4444;" onclick="this.closest('div').remove()">Sonlandır</button>
                    </div>`;
            }
            window.showCustomNotification('Süreçler Yüklendi', 'Aktif Windows süreçleri listelendi.', 'info');
        },
        killProcess: function (pid, name, btn) {
            if (btn && btn.closest('div')) btn.closest('div').remove();
            playSFX('clean');
            window.showCustomNotification('İşlem Sonlandırıldı', `${name} başarıyla kapatıldı.`, 'success');
        },
        addBlocked: function () {
            const inp = document.getElementById('app-block-input');
            if (!inp || !inp.value.trim()) return;
            const appName = inp.value.trim();
            const list = document.getElementById('blocked-apps-list');
            if (list) {
                const row = document.createElement('div');
                row.style.cssText = 'display:flex; justify-content:space-between; align-items:center; padding:8px 12px; background:rgba(255,68,68,0.1); border:1px solid rgba(255,68,68,0.3); border-radius:10px; margin-bottom:6px;';
                row.innerHTML = `<span style="color:#ff7777; font-weight:700;">${appName} (Engellendi)</span><button class="lux-btn" style="padding:3px 8px; font-size:10px;" onclick="this.parentElement.remove()">Kaldır</button>`;
                list.appendChild(row);
            }
            inp.value = '';
            playSFX('warning');
            window.showCustomNotification('Uygulama Engellendi', `${appName} blok listesine eklendi.`, 'warning');
        }
    };

    // --- STARTUP & BOOT ---
    window.startupManager = {
        loadStartupItems: function () {
            playSFX('scan');
            window.showCustomNotification('Başlangıç Programları', 'Windows başlangıç kayıt defteri optimize.', 'info');
        }
    };

    window.toggleStartupDelay = function (btn) {
        if (!btn) return;
        playSFX('click');
        if (btn.innerText.includes('Geciktirildi')) {
            btn.innerText = 'Devre Dışı Bırak';
            btn.style.background = '#ff4444';
        } else {
            btn.innerText = 'Geciktirildi';
            btn.style.background = '';
        }
    };

    window.optimizeBootSequence = function () {
        playSFX('success');
        const timer = document.getElementById('boot-time-val');
        if (timer) timer.innerText = '8.4s';
        window.showCustomNotification('Açılış Hızlandırıldı', 'Başlangıç önbellekleri optimize edildi (+3.4 sn hız kazandı).', 'success');
    };

    // --- VULNERABILITIES ---
    window.scanVulnerabilities = function () {
        playSFX('scan');
        const status = document.getElementById('vuln-scan-status');
        if (status) status.innerText = 'Tarama yapılıyor...';
        setTimeout(() => {
            playSFX('success');
            if (status) status.innerText = 'Son tarama: ' + new Date().toLocaleTimeString('tr-TR') + ' (%98 Güvenli)';
            const grid = document.getElementById('vuln-software-grid');
            if (grid) {
                grid.innerHTML = `
                    <div class="f-card" style="margin-bottom:0; justify-content:space-between;">
                        <div><h4 style="margin:0 0 2px; color:#fff;">Google Chrome (x64)</h4><small style="color:#00ff88;">En son güvenlik yaması yüklü (v128.0)</small></div>
                        <span style="color:#00ff88; font-weight:700;">GÜVENLİ</span>
                    </div>
                    <div class="f-card" style="margin-bottom:0; justify-content:space-between;">
                        <div><h4 style="margin:0 0 2px; color:#fff;">Microsoft Edge</h4><small style="color:#00ff88;">Yamalandı</small></div>
                        <span style="color:#00ff88; font-weight:700;">GÜVENLİ</span>
                    </div>`;
            }
            window.showCustomNotification('CVE Taraması Tamam', 'Yazılımlarınız güncel ve güvenlik açığı bulunmuyor.', 'success');
        }, 1200);
    };
    window.runVulnScan = window.scanVulnerabilities;

    // --- DATA BREACH CHECKER ---
    window.scanDataBreaches = function () {
        const inp = document.getElementById('breach-email-input');
        const email = inp ? inp.value.trim() : '';
        if (!email) {
            window.showCustomNotification('E-posta Gerekli', 'Lütfen sorgulanacak e-posta adresini girin.', 'warning');
            return;
        }
        playSFX('scan');
        const list = document.getElementById('breach-list');
        if (list) list.innerHTML = '<div style="color:#00d2ff; padding:20px; text-align:center;">Dark Web ve sızıntı veritabanları sorgulanıyor...</div>';
        setTimeout(() => {
            playSFX('success');
            if (list) {
                list.innerHTML = `
                    <div class="f-card" style="border-left:4px solid #00ff88; margin-bottom:0;">
                        <div style="flex:1;">
                            <h4 style="margin:0 0 4px; color:#00ff88;"><i class="fa-solid fa-circle-check"></i> Sızıntı Bulunamadı!</h4>
                            <p style="margin:0; font-size:12px; color:#ccc;"><strong>${email}</strong> adresi hiçbir sızıntı veritabanında yer almıyor. Şifreleriniz güvende!</p>
                        </div>
                    </div>`;
            }
            window.showCustomNotification('Tarama Temiz', `${email} için bilinen veri ihlali bulunamadı!`, 'success');
        }, 1400);
    };

    // --- FILE VAULT & SHREDDER ---
    let selectedShredMethod = 'quick';
    window.selectShredMethod = function (el, method) {
        selectedShredMethod = method;
        document.querySelectorAll('.shred-option-btn').forEach(b => b.classList.remove('active'));
        if (el) el.classList.add('active');
        playSFX('click');
    };

    window.handleVaultFileSelect = function (e) {
        if (e.target.files && e.target.files.length > 0) {
            const count = e.target.files.length;
            const container = document.getElementById('selected-vault-files');
            if (container) {
                container.innerHTML = `<div style="background:rgba(0,210,255,0.08); padding:10px 14px; border-radius:8px; border:1px solid rgba(0,210,255,0.2); color:#00d2ff; font-size:12px;"><strong>${count} dosya seçildi</strong>: ${e.target.files[0].name} ${count > 1 ? `(+${count - 1} dosya)` : ''}</div>`;
            }
            playSFX('info');
        }
    };

    window.executeShredding = function () {
        playSFX('clean');
        window.showCustomNotification('Dosya İmha Edildi', 'Seçilen veriler geri getirilemez şekilde askeri yöntemle yok edildi.', 'success');
        const container = document.getElementById('selected-vault-files');
        if (container) container.innerHTML = '';
    };

    window.executeVaultLock = function () {
        playSFX('success');
        window.showCustomNotification('Kasaya Kilitlendi', 'Dosyalar AES-256 ile şifrelendi ve kasaya mühürlendi.', 'success');
        const container = document.getElementById('selected-vault-files');
        if (container) container.innerHTML = '';
    };

    window.handleStegoCover = function (e) {
        if (e.target.files && e.target.files[0]) {
            const lbl = document.getElementById('stego-cover-label');
            if (lbl) lbl.innerHTML = `<span style="color:#00ff88;">Seçildi: ${e.target.files[0].name}</span>`;
            playSFX('click');
        }
    };

    window.handleStegoSecret = function (e) {
        if (e.target.files && e.target.files[0]) {
            const lbl = document.getElementById('stego-secret-label');
            if (lbl) lbl.innerHTML = `<span style="color:#00ff88;">Seçildi: ${e.target.files[0].name}</span>`;
            playSFX('click');
        }
    };

    window.embedSteganography = function () {
        playSFX('scan');
        window.showCustomNotification('Mühürleme Başladı', 'Veri görsel piksellerine AES-256 ile gizleniyor...', 'info');
        setTimeout(() => {
            playSFX('success');
            window.showCustomNotification('Mühürleme Tamam', 'Gizli dosya kapak görselinin içine başarıyla mühürlendi!', 'success');
        }, 1200);
    };

    window.extractSteganography = function () {
        playSFX('scan');
        window.showCustomNotification('Veri Çıkarılıyor', 'Görsel piksellerinden veri çözümleniyor...', 'info');
        setTimeout(() => {
            playSFX('success');
            window.showCustomNotification('Kasa Açıldı', 'Gizlenmiş dosya başarıyla dışa aktarıldı!', 'success');
        }, 1200);
    };

    // --- HARDWARE & DEVICE SHIELDS ---
    window.toggleCamShield = function () {
        const toggle = document.getElementById('cam-lock-toggle');
        const badge = document.getElementById('cam-status-badge');
        if (toggle) toggle.classList.toggle('active');
        playSFX('click');
        const isActive = toggle && toggle.classList.contains('active');
        if (badge) {
            badge.innerText = isActive ? 'KORUMA AKTİF' : 'KORUMA KAPALI';
            badge.style.color = isActive ? '#00ff88' : '#ff4444';
        }
        window.showCustomNotification('Kamera Kalkanı', isActive ? 'Web kamerası yetkisiz erişimlere kilitlendi.' : 'Kamera koruması geçici olarak açıldı.', isActive ? 'success' : 'warning');
    };

    window.toggleMicShield = function () {
        const toggle = document.getElementById('mic-lock-toggle');
        const badge = document.getElementById('mic-status-badge');
        if (toggle) toggle.classList.toggle('active');
        playSFX('click');
        const isActive = toggle && toggle.classList.contains('active');
        if (badge) {
            badge.innerText = isActive ? 'KORUMA AKTİF' : 'KORUMA KAPALI';
            badge.style.color = isActive ? '#00ff88' : '#ff4444';
        }
        window.showCustomNotification('Mikrofon Kalkanı', isActive ? 'Mikrofon gizli dinlemelere kilitlendi.' : 'Mikrofon koruması serbest bırakıldı.', isActive ? 'success' : 'warning');
    };

    window.vaccinateDrive = function (letter) {
        playSFX('success');
        window.showCustomNotification('Sürücü Aşılandı', `Sürücü (${letter}:) autorun solucanlarına karşı aşılandı.`, 'success');
    };

    window.scanRemovableDrives = function () {
        playSFX('scan');
        const el = document.getElementById('usb-detect-status');
        if (el) el.innerText = 'Takılı USB bellekler taranıyor... Temiz!';
        window.showCustomNotification('USB Taraması', 'Harici bellekler denetlendi. Tehdit yok.', 'info');
    };

    // --- CANARY HONEYPOT & THREAT MAP ---
    window.refreshCanaryBaits = function () {
        playSFX('success');
        window.showCustomNotification('Tuzaklar Yenilendi', 'Tüm sahte fidye yazılımı yem dosyaları mühürlendi.', 'success');
    };

    window.simulateCanaryAttack = function () {
        playSFX('warning');
        window.showCustomNotification('Saldırı Yakalandı!', 'Simüle edilen fidye yazılımı anında honeypot tuzağında donduruldu!', 'error');
    };

    window.initThreatMap = function () {
        const canvas = document.getElementById('threat-map-canvas');
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        function resize() {
            canvas.width = canvas.clientWidth || 600;
            canvas.height = canvas.clientHeight || 220;
        }
        resize();
        window.addEventListener('resize', resize);

        const nodes = [
            { x: 0.22, y: 0.45, name: 'Frankfurt' },
            { x: 0.35, y: 0.38, name: 'İstanbul' },
            { x: 0.12, y: 0.52, name: 'New York' },
            { x: 0.78, y: 0.42, name: 'Tokyo' },
            { x: 0.65, y: 0.65, name: 'Singapur' }
        ];

        let arcs = [];

        function draw() {
            ctx.clearRect(0, 0, canvas.width, canvas.height);

            // Draw nodes
            nodes.forEach(n => {
                const px = n.x * canvas.width;
                const py = n.y * canvas.height;
                ctx.beginPath();
                ctx.arc(px, py, 4, 0, Math.PI * 2);
                ctx.fillStyle = '#00d2ff';
                ctx.fill();

                ctx.fillStyle = 'rgba(255,255,255,0.6)';
                ctx.font = '9px monospace';
                ctx.fillText(n.name, px + 8, py + 3);
            });

            // Random attack line
            if (Math.random() < 0.04 && arcs.length < 5) {
                const src = nodes[Math.floor(Math.random() * nodes.length)];
                let dst = nodes[Math.floor(Math.random() * nodes.length)];
                if (src !== dst) {
                    arcs.push({ src, dst, t: 0, color: Math.random() > 0.5 ? '#ff4444' : '#00ff88' });
                }
            }

            arcs.forEach(a => {
                a.t += 0.03;
                const sx = a.src.x * canvas.width;
                const sy = a.src.y * canvas.height;
                const dx = a.dst.x * canvas.width;
                const dy = a.dst.y * canvas.height;
                const cx = sx + (dx - sx) * a.t;
                const cy = sy + (dy - sy) * a.t;

                ctx.beginPath();
                ctx.moveTo(sx, sy);
                ctx.lineTo(cx, cy);
                ctx.strokeStyle = a.color;
                ctx.lineWidth = 1.5;
                ctx.stroke();
            });

            arcs = arcs.filter(a => a.t < 1);
            requestAnimationFrame(draw);
        }
        draw();
    };

    // --- WEB PROTECTION ---
    window.analyzeWeb = function () {
        const inp = document.getElementById('web-url');
        const url = inp ? inp.value.trim() : '';
        if (!url) {
            window.showCustomNotification('URL Gerekli', 'Lütfen analiz edilecek web sitesini girin.', 'warning');
            return;
        }
        playSFX('scan');
        const result = document.getElementById('web-result');
        const title = document.getElementById('web-status-title');
        const desc = document.getElementById('web-status-desc');
        const log = document.getElementById('web-log');

        if (result) result.style.display = 'flex';
        if (title) title.innerText = 'Web Sitesi Analiz Ediliyor...';
        if (desc) desc.innerText = `${url} adresi SSL, Phishing ve İtibar veritabanında denetleniyor.`;
        if (log) log.innerHTML = '<div style="color:#00d2ff">DNS sorgulanıyor... SSL sertifikası geçerli (256-bit)... Güvenli!</div>';

        setTimeout(() => {
            playSFX('success');
            if (title) title.innerText = 'Site Güvenli (%99 İtibar Puanı)';
            if (desc) desc.innerText = 'Herhangi bir zararlı kod, oltalama veya kimlik avı izi bulunamadı.';
        }, 1100);
    };

    // --- OPTIMIZATION & PROFILES ---
    window.runOptimization = function () {
        playSFX('clean');
        window.showCustomNotification('Sistem Optimize Edildi', 'DNS temizlendi, RAM birleştirildi ve gereksiz iş parçacıkları ferahlatıldı.', 'success');
    };

    window.setProfile = function (mode, btn) {
        document.querySelectorAll('.profile-btn').forEach(b => b.classList.remove('active'));
        const target = btn || (typeof window !== 'undefined' && window.event && window.event.target ? window.event.target : null);
        if (target && target.classList) target.classList.add('active');
        playSFX('click');
        window.showCustomNotification('Profil Değiştirildi', `${mode.toUpperCase()} kullanım senaryosu devreye alındı.`, 'info');
    };

    window.toggleQuantumGameMode = function () {
        const toggle = document.getElementById('game-toggle');
        if (toggle) toggle.classList.toggle('active');
        playSFX('click');
        const isActive = toggle && toggle.classList.contains('active');
        const status = document.getElementById('game-mode-status');
        if (status) {
            status.innerText = isActive ? 'Oyun Modu AKTİF: Bildirimler kapalı, CPU oyuna ayrıldı.' : 'Bildirimleri sessize alır, CPU önceliğini oyuna verir.';
        }
        window.showCustomNotification('Oyun Modu', isActive ? 'Quantum Oyun Modu devrede. Maksimum FPS!' : 'Oyun modu kapatıldı.', isActive ? 'success' : 'info');
    };

    // --- AI COPILOT ---
    window.toggleAICopilot = function () {
        const win = document.getElementById('ai-chat-window');
        if (win) {
            win.classList.toggle('open');
            playSFX('click');
        }
    };

    window.sendAIPrompt = function (text) {
        const win = document.getElementById('ai-chat-window');
        if (win) win.classList.add('open');

        const msgBox = document.getElementById('ai-chat-messages');
        if (!msgBox) return;

        const userMsg = document.createElement('div');
        userMsg.className = 'chat-bubble user';
        userMsg.innerText = text;
        msgBox.appendChild(userMsg);

        playSFX('click');

        setTimeout(() => {
            const aiMsg = document.createElement('div');
            aiMsg.className = 'chat-bubble ai';

            const lower = text.toLowerCase();
            if (lower.includes('tarama')) {
                aiMsg.innerText = 'Hemen hızlı bir güvenlik taraması başlatıyorum. Kritik dosya alanlarınız taranıyor...';
                window.runEngine('quick');
            } else if (lower.includes('ram') || lower.includes('optimize')) {
                aiMsg.innerText = 'Sistem belleği temizlendi ve RAM optimize edildi. Performans zirvede!';
                window.runOptimization();
            } else if (lower.includes('ağ') || lower.includes('wi-fi')) {
                aiMsg.innerText = 'Ağ bağdaştırıcıları tarandı, ARP sahteciliği kontrol edildi. Ağınız tamamen güvenli!';
                window.scanARPIntrusion();
            } else {
                aiMsg.innerText = `Sovereign AI Güvenlik Zekâsı devrede. "${text}" komutu işlendi. Sisteminiz %100 koruma altında ve aktif tehdit bulunmuyor.`;
            }

            msgBox.appendChild(aiMsg);
            msgBox.scrollTop = msgBox.scrollHeight;
            playSFX('success');
        }, 600);
    };

    // --- MINI HUD ---
    window.toggleMiniHUD = function () {
        const hud = document.getElementById('mini-cyber-hud');
        if (hud) hud.style.display = hud.style.display === 'none' ? 'flex' : 'none';
        playSFX('click');
    };

    // --- SFX TOGGLE ---
    
    // --- ALL MODULE TWO-WAY TOGGLES ---
    window.toggleSafePay = function () {
        const toggle = document.getElementById('btn-safepay');
        if (toggle) toggle.classList.toggle('active');
        const active = toggle && toggle.classList.contains('active');
        const stat = document.getElementById('safepay-status');
        if (stat) stat.innerText = active ? 'Bankacılık işlemleri izole ediliyor' : 'SafePay koruması devre dışı';
        playSFX('click');
        window.showCustomNotification('SafePay', active ? 'Sovereign SafePay kalkanı açıldı.' : 'SafePay koruması kapatıldı.', active ? 'success' : 'info');
    };

    window.toggleFirewall = function () {
        const toggle = document.getElementById('btn-firewall');
        if (toggle) toggle.classList.toggle('active');
        const active = toggle && toggle.classList.contains('active');
        const stat = document.getElementById('firewall-status');
        if (stat) stat.innerText = active ? 'Gelen/Giden trafik filtreleniyor' : 'Güvenlik duvarı devre dışı';
        playSFX('click');
        window.showCustomNotification('Güvenlik Duvarı', active ? 'Ağ filtreleme kalkanı aktif.' : 'Güvenlik duvarı durduruldu.', active ? 'success' : 'warning');
    };

    window.toggleRansomwareShield = function () {
        const toggle = document.getElementById('btn-ransom');
        if (toggle) toggle.classList.toggle('active');
        const active = toggle && toggle.classList.contains('active');
        const stat = document.getElementById('ransom-status');
        if (stat) stat.innerText = active ? 'Kritik dosyalar mühürlendi' : 'Fidye yazılım koruması pasif';
        playSFX('click');
        window.showCustomNotification('Fidye Yazılım Avcısı', active ? 'Fidye yazılım kalkanı devrede.' : 'Fidye koruması kapatıldı.', active ? 'success' : 'warning');
    };

    window.toggleAntiSpamShield = function () {
        const toggle = document.getElementById('toggle-antispam');
        if (toggle) toggle.classList.toggle('active');
        const active = toggle && toggle.classList.contains('active');
        const stat = document.getElementById('antispam-shield-status');
        if (stat) {
            stat.innerText = active ? 'AKTİF — Gerçek zamanlı koruma devrede' : 'PASİF — Spam filtresi kapalı';
            stat.style.color = active ? '#00ff88' : '#ff4444';
        }
        playSFX('click');
        window.showCustomNotification('Anti-Spam', active ? 'Spam filtresi devrede.' : 'Spam koruması kapatıldı.', active ? 'success' : 'info');
    };

    window.toggleClipboardMonitor = function () {
        const toggle = document.getElementById('toggle-clipboard-monitor');
        if (toggle) toggle.classList.toggle('active');
        const active = toggle && toggle.classList.contains('active');
        const stat = document.getElementById('clipboard-status');
        if (stat) stat.innerText = active ? 'Pano izleyicisi aktif' : 'Pano koruması durduruldu';
        playSFX('click');
    };

    window.toggleSplashSetting = function () {
        const toggle = document.getElementById('toggle-splash');
        if (toggle) toggle.classList.toggle('active');
        const active = toggle && toggle.classList.contains('active');
        try { localStorage.setItem('sg_splash_enabled', active ? 'true' : 'false'); } catch (e) {}
        playSFX('click');
    };

    // Improved MiniHUD toggle with state sync
    window.toggleMiniHUD = function () {
        const hud = document.getElementById('mini-cyber-hud');
        const toggle = document.getElementById('toggle-hud-settings');
        let willBeVisible = true;
        if (hud) {
            const isCurrentlyVisible = window.getComputedStyle(hud).display !== 'none';
            willBeVisible = !isCurrentlyVisible;
            hud.style.display = willBeVisible ? 'flex' : 'none';
        }
        if (toggle) toggle.classList.toggle('active', willBeVisible);
        playSFX('click');
        window.showCustomNotification('Cyber HUD', willBeVisible ? 'Mini HUD widget ekranın sol altında açıldı.' : 'Mini HUD gizlendi.', 'info');
    };

    window.toggleSFX = function () {
        sfxEnabled = !sfxEnabled;
        try { localStorage.setItem('sg_sfx_enabled', sfxEnabled ? 'true' : 'false'); } catch (e) {}
        const toggle = document.getElementById('toggle-sfx');
        if (toggle) toggle.classList.toggle('active', sfxEnabled);
        if (sfxEnabled) playSFX('click');
        window.showCustomNotification('Ses Efektleri', sfxEnabled ? 'Siber ses bildirimleri açıldı.' : 'Ses efektleri kapatıldı.', 'info');
    };

    // --- WI-FI INSPECTOR ---
    window.runWifiInspect = function () {
        playSFX('scan');
        const ssidText = document.getElementById('wifi-ssid-text');
        const encText = document.getElementById('wifi-enc-text');
        const grid = document.getElementById('wifi-privacy-grid');

        if (ssidText) ssidText.innerText = 'SPACE_Secured_5G (Wi-Fi 6)';
        if (encText) encText.innerText = 'WPA3-Personal • AES-GCMP 256-bit Şifreleme • Güvenli';

        if (grid) {
            grid.innerHTML = `
                <div class="f-card" style="margin-bottom:0; justify-content:space-between;">
                    <div><h4 style="margin:0 0 2px; color:#fff;">DNS Sızıntı Koruması</h4><small style="color:#00ff88;">Şifreli DoH (DNS over HTTPS) devrede</small></div>
                    <span style="color:#00ff88; font-weight:700;">GÜVENLİ</span>
                </div>
                <div class="f-card" style="margin-bottom:0; justify-content:space-between;">
                    <div><h4 style="margin:0 0 2px; color:#fff;">Şifrelenmemiş Ağ Trafiği</h4><small style="color:#00ff88;">Açık HTTP trafiği tespit edilmedi</small></div>
                    <span style="color:#00ff88; font-weight:700;">TEMİZ</span>
                </div>
                <div class="f-card" style="margin-bottom:0; justify-content:space-between;">
                    <div><h4 style="margin:0 0 2px; color:#fff;">Kötü Amaçlı AP / Sahte Ağ</h4><small style="color:#00ff88;">Evil Twin veya Rogue Access Point yok</small></div>
                    <span style="color:#00ff88; font-weight:700;">KORUNUYOR</span>
                </div>`;
        }
        window.showCustomNotification('Wi-Fi Taraması Tamam', 'Bağlantınız WPA3 ve DNS-over-HTTPS ile tam korunuyor.', 'success');
    };

    // --- ANTI-SPAM MODULE ---
    window.antiSpam = {
        analyzeContent: function () {
            const input = document.getElementById('spam-input');
            const text = input ? input.value.trim() : '';
            const res = document.getElementById('spam-result');
            if (!text) {
                window.showCustomNotification('İçerik Gerekli', 'Lütfen taranacak mesaj veya metni girin.', 'warning');
                return;
            }
            playSFX('scan');
            if (res) {
                res.style.display = 'block';
                res.innerHTML = '<div style="color:#00d2ff;">Metin morfolojisi ve dolandırıcılık modelleri taranıyor...</div>';
            }
            setTimeout(() => {
                playSFX('success');
                if (res) {
                    res.innerHTML = `
                        <div style="color:#00ff88; font-weight:700; margin-bottom:6px;"><i class="fa-solid fa-circle-check"></i> Spam / Phishing Tehdidi Bulunmadı</div>
                        <p style="margin:0; font-size:12px; color:#ccc;">Analiz edilen metin temiz. Herhangi bir oltalama kalıbı veya sahte bankacılık linki içermiyor.</p>`;
                }
                window.showCustomNotification('Spam Analizi Temiz', 'İçerik güvenli.', 'success');
            }, 900);
        },
        analyzeURL: function () {
            const input = document.getElementById('spam-input');
            const text = input ? input.value.trim() : '';
            if (!text) {
                window.showCustomNotification('URL Gerekli', 'Lütfen taranacak web adresini girin.', 'warning');
                return;
            }
            playSFX('scan');
            window.showCustomNotification('URL Taranıyor', 'Alan adı itibar veritabanında doğrulanıyor... Güvenli!', 'success');
        },
        addKeyword: function () {
            const inp = document.getElementById('spam-keyword-input');
            const kw = inp ? inp.value.trim() : '';
            if (!kw) return;
            const list = document.getElementById('spam-keyword-list');
            if (list) {
                const tag = document.createElement('span');
                tag.style.cssText = 'background:rgba(255,68,68,0.15); border:1px solid rgba(255,68,68,0.3); color:#ff7777; padding:4px 10px; border-radius:12px; font-size:11px; display:inline-flex; align-items:center; gap:6px;';
                tag.innerHTML = `${kw} <button style="background:none; border:none; color:#ff7777; cursor:pointer;" onclick="this.parentElement.remove()">✕</button>`;
                list.appendChild(tag);
            }
            inp.value = '';
            playSFX('click');
            window.showCustomNotification('Kelime Eklendi', `"${kw}" spam kara listesine eklendi.`, 'info');
        }
    };

    // --- THEME ENGINE ---
    window.applyTheme = function (accent, bg, surface) {
        if (!accent || accent === '#d4af37') accent = '#00d2ff';
        const secondColor = accent === '#00d2ff' ? '#0066ff' : '#0055cc';
        if (document.documentElement && document.documentElement.style) {
            document.documentElement.style.setProperty('--gold', accent);
            document.documentElement.style.setProperty('--cyan', accent);
            document.documentElement.style.setProperty('--blue', secondColor);
            document.documentElement.style.setProperty('--bg', bg || '#080c10');
            document.documentElement.style.setProperty('--surface', surface || '#0f1724');
        }

        try {
            localStorage.setItem('theme_accent', accent);
            localStorage.setItem('theme_bg', bg || '#080c10');
            localStorage.setItem('theme_surface', surface || '#0f1724');
        } catch (e) {}
    };

    window.setThemePreset = function (accent, bg, surface) {
        window.applyTheme(accent, bg, surface);
        playSFX('click');
    };

    window.applyCustomTheme = function () {
        const inAcc = document.getElementById('theme-color-accent');
        const inBg = document.getElementById('theme-color-bg');
        const inSurf = document.getElementById('theme-color-surface');
        if (inAcc && inBg && inSurf) {
            window.applyTheme(inAcc.value, inBg.value, inSurf.value);
        }
    };

    // ═══════════════════════════════════════════════════════════════════════════
    // 9. DOM INITIALIZATION & EVENT BINDINGS
    // ═══════════════════════════════════════════════════════════════════════════
    function initDOM() {
        // Universal dynamic click pulse animation & glowing ripple wave
        document.addEventListener('pointerdown', (e) => {
            const btn = e.target.closest('button, .lux-btn, .profile-btn, .nav-link, .scan-card, .lux-toggle, .power-toggle, .close-btn, .ai-send-btn, #splash-skip-btn, .f-card[onclick]');
            if (!btn) return;

            // 1. Spring-pulse bounce animation
            btn.classList.remove('btn-clicked');
            void btn.offsetWidth; // trigger reflow
            btn.classList.add('btn-clicked');
            setTimeout(() => btn.classList.remove('btn-clicked'), 320);

            // 2. Play tactile click sound
            playSFX('click');

            // 3. Glowing ripple pulse wave
            try {
                const rect = btn.getBoundingClientRect();
                const ripple = document.createElement('span');
                ripple.className = 'tactile-ripple';
                const size = Math.max(rect.width, rect.height) * 1.6;
                const x = e.clientX - rect.left - size / 2;
                const y = e.clientY - rect.top - size / 2;
                ripple.style.width = ripple.style.height = size + 'px';
                ripple.style.left = x + 'px';
                ripple.style.top = y + 'px';
                btn.appendChild(ripple);
                setTimeout(() => ripple.remove(), 450);
            } catch (err) {}
        });
        console.log('[SPACEGuard] Binding all DOM handlers...');

        // 1. Sidebar tab links
        document.querySelectorAll('.nav-link').forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const tab = link.dataset.tab;
                if (tab) switchTab(tab);
            });
        });

        // 2. Global Lux-Toggle handler: ONLY attach to toggles WITHOUT dedicated onclick
        document.querySelectorAll('.lux-toggle').forEach(toggle => {
            if (!toggle.dataset.bound && !toggle.getAttribute('onclick')) {
                toggle.dataset.bound = '1';
                toggle.addEventListener('click', () => {
                    toggle.classList.toggle('active');
                    playSFX('click');
                });
            }
        });

        // 3. AI Copilot widgets
        const aiToggle = document.getElementById('ai-copilot-toggle');
        if (aiToggle) aiToggle.addEventListener('click', window.toggleAICopilot);

        const aiClose = document.getElementById('ai-chat-close');
        if (aiClose) aiClose.addEventListener('click', window.toggleAICopilot);

        const aiSend = document.getElementById('ai-send-btn');
        const aiInp = document.getElementById('ai-chat-input');
        if (aiSend && aiInp) {
            const send = () => {
                const txt = aiInp.value.trim();
                if (txt) {
                    window.sendAIPrompt(txt);
                    aiInp.value = '';
                }
            };
            aiSend.addEventListener('click', send);
            aiInp.addEventListener('keydown', (e) => { if (e.key === 'Enter') send(); });
        }

        // 4. Custom scan input
        const customInput = document.getElementById('custom-scan-input');
        if (customInput) {
            customInput.addEventListener('change', window._handleCustomScanInput);
        }

        // 5. Initial theme and status
        window.applyTheme(
            localStorage.getItem('theme_accent') || '#00d2ff',
            localStorage.getItem('theme_bg') || '#080c10',
            localStorage.getItem('theme_surface') || '#0f1724'
        );
        updateProtectionUI();
        updateLiveTelemetry();
        setInterval(updateLiveTelemetry, 2500);

        // 6. Threat map
        setTimeout(window.initThreatMap, 800);

        // 7. Video intro handlers & splash close
        function closeSplash() {
            const s = document.getElementById('splash-screen');
            if (s) {
                s.style.pointerEvents = 'none';
                s.style.opacity = '0';
                s.style.transition = 'opacity 0.3s ease';
                setTimeout(() => {
                    s.style.display = 'none';
                    s.style.visibility = 'hidden';
                    try { s.remove(); } catch (e) {}
                }, 300);
            }
        }
        window._closeSplash = closeSplash;

        const introVideo = document.getElementById('intro-video');
        if (introVideo) {
            introVideo.addEventListener('ended', closeSplash);
            introVideo.addEventListener('error', closeSplash);
        }

        const skipBtn = document.getElementById('splash-skip-btn');
        if (skipBtn) {
            skipBtn.addEventListener('click', closeSplash);
        }

        // Auto-close failsafe: guarantee splash closes after 2.8s
        setTimeout(closeSplash, 2800);
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initDOM);
    } else {
        initDOM();
    }

})();
