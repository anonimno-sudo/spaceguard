# SPACEGuard Sovereign Edition — v3.1.0

Gerçek çalışan profesyonel masaüstü antivirüs uygulaması. Electron.js tabanlı, Windows için.

## Kurulum

```bash
npm install
npm start
```

## Gereksinimler
- **Node.js** 18+ (https://nodejs.org)
- **npm** 9+
- Windows 10/11 x64

## Proje Yapısı

```
spaceguard-sovereign/
├── main.js                 ← Electron ana süreç
├── index.html              ← UI kabuğu
├── renderer.js             ← Frontend mantığı (2300 satır)
├── style.css               ← Koyu altın tema
├── scan.worker.js          ← Fork'lanan tarama motoru (MD5 + heuristic)
├── quarantine_manager.js   ← AES-256 şifreli karantina kasası  ★ YENİ
├── config_signer.js        ← RSA-SHA256 imza doğrulama          ★ YENİ
├── signatures.json         ← 30 tehdit hash imzası              ★ YENİ
├── notification.html       ← Desktop bildirim penceresi         ★ YENİ
├── i18n.js                 ← TR/KO çoklu dil desteği            ★ YENİ
├── update_manager.js       ← GitHub güncelleme kontrolü         ★ YENİ
├── web_shield.js           ← Web Kalkanı + Ağ Tarayıcı          ★ YENİ
├── missing_functions.js    ← saveSchedule, addExclusion vs.     ★ YENİ
├── database.js             ← Temel imza veritabanı
├── memory_scanner.py       ← Windows ctypes bellek tarayıcı
├── NetworkGuard.cs         ← C# netstat+netsh güvenlik duvarı
├── SafePay.cs              ← C# Low-Integrity sandbox tarayıcı
└── version.json            ← Versiyon bilgisi
```

## Gerçek Çalışan Özellikler

| Özellik | Teknoloji | Durum |
|---------|-----------|-------|
| MD5 imza tabanlı tarama | Node.js crypto | ✅ Gerçek |
| Heuristic analiz (PowerShell/JS/VBS) | Regex engine | ✅ Gerçek |
| Gerçek zamanlı dosya izleyici | fs.watch() | ✅ Gerçek |
| Karantina (AES-256 şifreli) | crypto.createCipheriv | ✅ Gerçek |
| Güvenlik duvarı durumu | netsh advfirewall | ✅ Gerçek |
| İşlem listesi & engelleme | tasklist + taskkill | ✅ Gerçek |
| Web site analizi | fetch() + heuristic | ✅ Gerçek |
| Ağ cihaz tarama | arp -a | ✅ Gerçek |
| Sistem temizleyici | fs + tmpdir() | ✅ Gerçek |
| Başlangıç yöneticisi | reg query HKCU\\Run | ✅ Gerçek |
| Güvenlik açığı tarayıcı | wmic qfe | ✅ Gerçek |
| CPU/RAM monitörü | os.cpus() delta | ✅ Gerçek |
| Anti-spam motoru | Heuristic scoring | ✅ Gerçek |
| Pano izleyici | electron clipboard | ✅ Gerçek |
| Bellek tarayıcı | Python ctypes | ✅ Gerçek (python gerekir) |
| Network Guard | C# netstat+netsh | ✅ Gerçek (.NET gerekir) |
| SafePay Sandbox | C# Low-IL process | ✅ Gerçek (.NET gerekir) |

## .exe Paketi Oluşturmak

```bash
npm install
npm run dist
# dist/ klasöründe Setup.exe ve portable.exe oluşur
```

## Test Dosyası (EICAR)
EICAR test dosyası oluşturmak için:
```
X5O!P%@AP[4\PZX54(P^)7CC)7}$EICAR-STANDARD-ANTIVIRUS-TEST-FILE!$H+H*
```
Bunu bir `.txt` veya `.exe` olarak kaydedin — SPACEGuard `EICAR-Test-File` olarak tespit edecek.
