# SPACEGuard Dağıtım ve Güncelleme Kılavuzu

Uygulamanızı arkadaşlarınızla paylaşmak ve güncellemek için aşağıdaki adımları izleyin.

## 1. Uygulamayı Paylaşma (İlk Kurulum)
1.  **EXE Dosyası:** `dist` klasörü içinde oluşturulan `SPACEGuard Sovereign 1.0.0.exe` dosyasını arkadaşlarınıza gönderin.
2.  **Kurulum:** Arkadaşlarınız bu dosyayı çalıştırdığında uygulama açılacaktır.

## 2. GitHub ile Uzaktan Güncelleme Sistemi Kurulumu
Uygulamanın güncellemeleri kontrol edeceği bir "Sunucu"ya ihtiyacı var. GitHub'ı ücretsiz sunucu olarak kullanacağız.

1.  **Repo Oluşturun:** GitHub'da yeni bir **Public** (Herkese Açık) repository oluşturun. (Örn: `SPACEGuard-Updates`)
2.  **Dosyaları Yükleyin:**
    *   **ÖNCE BUNU YAPIN (Depoyu Başlatmak İçin):** `latest_version.json` dosyasını oluşturduğunuz repo sayfasındaki "Add file" -> "Upload files" kısmından yükleyin ve **"Commit changes"** butonuna basın. (Burası çok önemli, yoksa release oluşturamazsınız).
    *   **SONRA BUNU YAPIN (.exe Yükleme):**
        1.  Repo sayfasının **sağ tarafında** "Releases" başlığını bulun (Genellikle "About" kısmının altındadır).
        2.  Veya direkt şu adrese gidin: `https://github.com/KULLANICI_ADI/REPO_ADI/releases/new`
        3.  **"Draft a new release"** (veya "Create a new release") butonuna basın.
        4.  "Choose a tag" kısmına versiyon yazın (örn: `v1.0.0`).
        5.  Alt kısımdaki **"Attach binaries by dropping them here"** kutusuna `.exe` dosyanızı sürükleyip bırakın (Burada boyut limiti 2GB'dır).
        6.  "Publish release" diyerek yayınlayın.

3.  **Adresi Alın:**
    *   Repo anasayfasına dönün. `latest_version.json` dosyasına tıklayın.
    *   Sağ üstteki **"Raw"** butonuna basın.
    *   Adres çubuğundaki linki kopyalayın. (Bu link uygulamanın versiyon kontrolü için gereklidir).
    *   Örnek: `https://raw.githubusercontent.com/KULLANICI_ADI/SPACEGuard-Updates/main/latest_version.json`
4.  **Kodu Güncelleyin:** `renderer.js` dosyasını açın (Visual Studio Code ile).
    - `REMOTE_BASE_URL` değişkenini bulun.
    - Kopyaladığınız linkin **son kısmını (`latest_version.json`) silerek** yapıştırın.
    - Örnek: `const REMOTE_BASE_URL = 'https://raw.githubusercontent.com/KULLANICI_ADI/SPACEGuard-Updates/main/';`
5.  **Tekrar Derleyin:** `npm run dist` komutunu çalıştırarak (veya VSCode terminalinden) yeni ayarlı exe'yi oluşturun ve dağıtın.

## 3. Yeni Güncelleme Nasıl Yayınlanır?
Bir değişiklik yaptığınızda (Örn: Yeni özellik eklediniz):

1.  **Versiyon Yükselt:** `package.json` ve `version.json` dosyalarındaki versiyonu artırın (Örn: `1.0.1`).
2.  **Exe Oluştur:** Terminalde `npm run dist` komutunu çalıştırın.
3.  **Sunucu Dosyasını Güncelle:** Masaüstündeki `latest_version.json` dosyasını açın ve içindeki versiyonu `1.0.1` yapın. İsterseniz "notes" kısmına yenilikleri yazın.
4.  **GitHub'a Yükle:** Yeni oluşan `.exe` dosyasını ve güncellediğiniz `latest_version.json` dosyasını GitHub reponuza yükleyin (Eskilerin üzerine yazsın).

**Sonuç:** Arkadaşlarınız uygulamayı açıp "Güncellemeleri Denetle" dediğinde, GitHub'daki `latest_version.json` dosyasını okuyacak, yeni sürümü görecek ve indirme sayfasına yönlendirilecektir.
