# SPACEGuard Sovereign Edition — Dağıtım & Güncelleme Rehberi

## 📦 EXE Nasıl Üretilir?

```
npm run dist
```
`dist/` klasörü oluşturulacak. İçinde:
- `SPACEGuard Sovereign Setup 1.0.1.exe` → Arkadaşlarına gönder (Kurulum Sihirbazı)
- `SPACEGuard Sovereign 1.0.1.exe` → Portable (kurulum gerekmez)

---

## 🌐 Otomatik Uzak Güncelleme Nasıl Çalışır?

Arkadaşların uygulamayı açtığında uygulama şu adresi kontrol eder:
```
https://raw.githubusercontent.com/Muhammed/SpaceGuard-Updates/main/latest_version.json
```

### Adım 1: GitHub Repo Oluştur
1. GitHub'da `SpaceGuard-Updates` adında **public** bir repo oluştur.
2. Repoya `latest_version.json` dosyasını ekle.

### Adım 2: `latest_version.json` Formatı
```json
{
  "version": "1.0.2",
  "releaseDate": "2026-03-27",
  "notes": [
    "Yeni özellikler ve hata düzeltmeleri",
    "Memory Scanner geliştirildi"
  ]
}
```

### Adım 3: Güncelleme Yayınlamak
1. `package.json`'daki `version` değerini artır (`1.0.1` → `1.0.2`)
2. GitHub repodaki `latest_version.json`'ı update et
3. Yeni `npm run dist` komutu ile yeni EXE üret ve arkadaşlarına gönder

### Güncelleme Akışı (Otomatik)
Uygulama her açılışta GitHub'ı kontrol eder. Yeni versiyon varsa:
- Güncelleme Notları sekmesinde büyük sarı "Yeni Güncelleme!" butonu belirir
- Kullanıcı kabul ederse yeniden başlar (mevcut sanal simülasyon)

---

## 🔐 Güvenlik: Türkiye Engeli
`.dev-override` dosyası EXE'ye dahil edilmez (package.json'da filtrelendi).
Arkadaşların kurulumla gelen uygulama Türkiye'den erişilirse kapanır.
**Senin kopyanda** (`.dev-override` ile) bu kısıtlama kaldırılmıştır.

---

## 🔄 `update_manager.js`'de URL Değişikliği
```js
// update_manager.js satır 54
const UPDATE_URL = 'https://raw.githubusercontent.com/<SENIN_KULLANICI_ADIN>/SpaceGuard-Updates/main/latest_version.json';
```
`<SENIN_KULLANICI_ADIN>` yerine GitHub kullanıcı adını yaz.

---

## ✅ Tamamlanan Modüller
| Modül | Durum |
|---|---|
| 1. Statik PE Analizi | ✅ |
| 2. Dinamik Bellek Tarayıcı | ✅ |
| 3. Ağ Güvenliği / DGA | ✅ |
| 4. Ransomware Honeypot | ✅ |
| 5. Self-Protection / Anti-Tamper | ✅ |
| 6. Tehdit Puanlama (0-100) | ✅ |
| 7. Adli Analiz / IR | ✅ |
| 8. MITRE ATT&CK Mapping | ✅ |
| 9. İmzalı Güncelleme Yaşam Döngüsü | ✅ |
| 10. ML/AI Modelleri | ✅ |
| Çoklu Dil (TR/KO) | ✅ |
| Türkiye Geo-Engel | ✅ |
| EXE Paketleme (NSIS) | ✅ |
