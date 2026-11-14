SPACEGuard — Kısa Mimari Özeti (TR)

1) Amaç
SPACEGuard, Windows masaüstü için savunma odaklı modüler bir antivirüs uygulamasıdır. UI Electron/Node, çekirdek motor native C++/C# modülleri ve Python yardımcı analiz araçları içerir.

2) Temel Bileşenler
- UI (Electron/Renderer): `index.html`, `renderer.js`, `i18n.js` — Çoklu dil (TR/KO) desteği.
- Engine Bridge: `engine_bridge.js` — Node süreci ile native yardımcı süreçler arasında IPC, JSON üzerinden.
- Gerçek Zamanlı İzleme: `realtime_monitor.cpp` / `realtime_monitor.exe` — Dosya etkinliklerini yakalar (kullanıcı modu: ReadDirectoryChangesW; kernel-mode için filter sürücü gelecek plan).
- İmza Tarayıcı: `scanner_core.cpp` / `signatures.json` — Basit JSON imza veritabanı destekli tarama.
- Davranış & Skorlama: `behavior_engine.py`, `scoring_engine.js`, `ai_engine.py` — Olay agregasyonu, risk skorlaması.
- Karantina Yönetimi: `quarantine_manager.js` — Dosya izolasyonu, meta yönetimi.
- Güncelleme Yönetimi: `update_manager.js`, `config_signer.js`, `sg_master_public.pem` — Güncelleme doğrulama ve imza kontrolleri.
- Telemetri & Loglama: `database.js`, `error.log`, telemetri anonimleştirme yönergeleri.

3) Güvenlik Kuralları
- Minimum privilege: kritik işlemler için kullanıcıdan onay ve admin yükseltmesi.
- Kod imzalama: tüm native ikili dosyalar ve installer imzalanmalı (`sg_master_private.pem` ile yapılandırma imzalama).
- Güncelleme doğrulaması: güncelleme paketleri ve imza doğrulama ile doğrulanır.
- Kullanıcı gizliliği: telemetri varsayılan kapalı, toplanan veriler anonimleştirilir.

4) Performans Hedefleri
- Sistem idle durumunda CPU kullanım artışı < %2.
- Stream tabanlı tarama ve paralel iş parçacıkları.
- I/O throttle ve dosya boyutu eşiği (ör: >100MB arşiv izlemeden atla).

5) Test & CI
- Birim testleri: `quarantine_manager.test.js`, `engine_bridge.test.js`.
- Entegrasyon: `e2e/` dizini, Electron başlatma testleri.
- Fuzzing: yara/rust-fuzz önerileri.
- CI: GitHub Actions veya Azure Pipelines; kod imzalama adımlarını pipeline'a ekle.

6) Dosya Yapısı (özet)
- app/ (Electron app)
- engines/ (native & python yardımcı süreçler)
- libs/ (ortak modüller)
- docs/ (bu dosyalar)

7) Kısıtlamalar
- Bu proje örnek bir antivirüs altyapısı sunar, ancak gerçek kernel sürücüleri, PPL yetkileri ve üretim anti-malware dağıtımı için Microsoft lisans/sertifika gereksinimleri vardır.

8) Sonraki adımlar
- Basit imza tarayıcı iskeleti ve UI<->engine örnekleri `docs/` içinde yer almaktadır.
