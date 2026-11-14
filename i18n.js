'use strict';
/**
 * SPACEGuard Sovereign Edition — i18n (TR / KO)
 */
const TRANSLATIONS = {
  tr: {
    nav_dashboard: 'Ana Panel',
    nav_security:  'Güvenlik Kalkanı',
    nav_quarantine:'Karantina Kasası',
    nav_cleaner:   'Sistem Temizleyici',
    nav_network:   'Ağ Analizi',
    nav_web:       'Web Kalkanı',
    nav_vuln:      'Güvenlik Açıkları',
    nav_appctrl:   'Uygulama Kontrolü',
    nav_startup:   'Başlangıç Yöneticisi',
    nav_antispam:  'Anti-Spam',
    nav_utils:     'Yardımcı Servisler',
    nav_changelog: 'Güncelleme Notları',
    nav_settings:  'Ayarlar',

    hero_title:   'Sovereign Koruması Aktif',
    hero_desc:    'Gerçek zamanlı dosya izleyici ve fidye yazılımı kalkanı çalışıyor',
    cpu_label:    'CPU YÜKÜ',
    ram_label:    'RAM KULLANIMI',

    card_monitor:      'Canlı İzleme',
    card_monitor_desc: 'Masaüstü aktivitesi taranıyor...',
    card_gamemode:     'Oyun Modu',
    card_gamemode_desc:'Bildirimleri susturur.',

    sec_matrix_title: 'SOVEREIGN SAVUNMA MATRİSİ',
    sec_safepay:      'Sovereign SafePay',
    sec_safepay_desc: 'Bankacılık işlemleri izole ediliyor',
    sec_antimining:   'Anti-Mining Kalkanı',
    sec_firewall:     'Güvenlik Duvarı',
    sec_firewall_desc:'Gelen/Giden trafik filtreleniyor',
    sec_ransom:       'Fidye Yazılım Avcısı',
    sec_ransom_desc:  'Kritik dosyalar mühürlendi',

    scan_title:       'Tarama Operasyonları',
    scan_quick:       'Hızlı Analiz',
    scan_quick_desc:  'Kritik kullanıcı dizinleri (Masaüstü, İndirilenler)',
    scan_full:        'Kapsamlı Sistem Taraması',
    scan_full_desc:   'Daha geniş kullanıcı alanları (Uzun sürer).',
    scan_custom:      'Özel Dosya Analizi',
    scan_custom_desc: 'Şüpheli tek bir dosyayı seçip tarayın.',

    quar_title:       'Karantina Kasası',
    quar_empty:       'Kasa Boş',
    quar_empty_desc:  'Şu anda izole edilmiş bir tehdit bulunmuyor.',

    cleaner_title:      'Sistem Temizleyici',
    cleaner_card_title: 'Gereksiz Dosya Analizi',
    cleaner_card_desc:  'Temp klasörleri ve önbelleği temizleyerek yer açın.',
    cleaner_btn_analyze:'Analiz Et',
    cleaner_btn_clean:  'Temizle',

    net_title: 'Aktif Ağ Arayüzleri',
    web_title: 'Web Kalkanı',
    web_card_title: 'Canlı Site Analizi',
    web_card_desc:  'Şüpheli web sitelerini girmeden önce tarayın.',
    web_placeholder:'https://ornek-site.com',

    settings_title:   'Ayarlar & Yapılandırma',
    lang_select:      'Uygulama Dili',
    stat_card_title:  'Koruma İstatistikleri',
    stat_total:       'TOPLAM TARAMA',
    stat_blocked:     'ENGELLENEN TEHDİT',
    stat_scanned:     'TARANAN DOSYA',
    stat_quar:        'KARANTİNA',
    schedule_title:   'Zamanlanmış Tarama',
    schedule_desc:    'Otomatik tarama zamanınızı ayarlayın.',
    schedule_off:     'Kapalı',
    schedule_daily:   'Her Gün',
    schedule_weekly:  'Haftada Bir',
    schedule_save:    'Kaydet',
    excl_title:       'Tarama Hariç Tutulacaklar',
    excl_desc:        'Bu dosyalar/klasörler tarama sırasında atlanacak.',
    excl_placeholder: 'C:\\Klasor veya C:\\dosya.exe',
    excl_add:         'Ekle',
    display_title:    'Splash Ekranı Göster',
    display_desc:     'Uygulama açılışında hoş geldin ekranını gösterir.',

    changelog_title:       'Güncelleme Notları',
    update_manager_title:  'Güncelleme Yöneticisi',
    update_manager_desc:   'SPACEGuard her saat güncelleme sunucusunu denetler.',
    update_btn:            'Güncellemeyi Denetle',
    changelog_history:     'Sürüm Geçmişi',

    module_wip: 'Modül hazırlanıyor...',
    vuln_title: 'Güvenlik Açıkları',
    appctrl_title: 'Uygulama Kontrolü',
    startup_title: 'Başlangıç Yöneticisi',
    utils_title:   'Yardımcı Servisler',
    net_desc:      'Ağ ve Wi-Fi analizi',
    web_desc:      'Phishing ve zararlı web sitelerine karşı koruma.',
    vuln_desc:     'Sisteminizdeki zafiyetleri ve eksik güncellemeleri tarar.',
    appctrl_desc:  'Arka planda çalışan uygulamaların izinlerini yönetin.',
    startup_desc:  'Bilgisayarın açılış hızını artırmak için programları sınırlayın.',
    utils_desc:    'Dosya öğütücü, bellek yönetimi ve sistem araçları.',
  },

  ko: {
    nav_dashboard: '대시보드',
    nav_security:  '보안 방패',
    nav_quarantine:'격리 금고',
    nav_cleaner:   '시스템 클리너',
    nav_network:   '네트워크 분석',
    nav_web:       '웹 방패',
    nav_vuln:      '취약점',
    nav_appctrl:   '앱 제어',
    nav_startup:   '시작 관리자',
    nav_antispam:  '안티스팸',
    nav_utils:     '유틸리티',
    nav_changelog: '업데이트 노트',
    nav_settings:  '설정',

    hero_title:   'Sovereign 보호 활성',
    hero_desc:    '실시간 파일 모니터 및 랜섬웨어 방어 실행 중',
    cpu_label:    'CPU 사용량',
    ram_label:    'RAM 사용량',

    scan_title:      '검사 작업',
    scan_quick:      '빠른 검사',
    scan_quick_desc: '주요 사용자 폴더 (바탕화면, 다운로드)',
    scan_full:       '전체 시스템 검사',
    scan_full_desc:  '광범위한 검사 (시간이 오래 걸림)',
    scan_custom:     '파일 분석',
    scan_custom_desc:'의심스러운 파일을 선택하여 검사하세요.',

    quar_title:      '격리 금고',
    quar_empty:      '금고 비어있음',
    quar_empty_desc: '격리된 위협이 없습니다.',

    settings_title: '설정 및 구성',
    lang_select:    '앱 언어',
    module_wip:     '모듈 준비 중...',
  }
};

const i18n = {
  currentLang: 'tr',

  init() {
    try {
      const saved = localStorage.getItem('sg_lang');
      if (saved && TRANSLATIONS[saved]) this.currentLang = saved;
    } catch (e) {}

    const sel = document.getElementById('setting-lang-select');
    if (sel) {
      sel.value = this.currentLang;
      sel.addEventListener('change', () => {
        this.setLang(sel.value);
      });
    }

    this.applyTranslations();
  },

  setLang(lang) {
    if (!TRANSLATIONS[lang]) return;
    this.currentLang = lang;
    try { localStorage.setItem('sg_lang', lang); } catch (e) {}
    this.applyTranslations();
  },

  t(key) {
    const dict = TRANSLATIONS[this.currentLang] || TRANSLATIONS['tr'];
    return dict[key] || TRANSLATIONS['tr'][key] || key;
  },

  applyTranslations() {
    const dict = TRANSLATIONS[this.currentLang] || TRANSLATIONS['tr'];
    document.querySelectorAll('[data-i18n]').forEach(el => {
      const key = el.getAttribute('data-i18n');
      if (dict[key]) {
        const img = el.querySelector('.nav-icon');
        if (img) {
          el.innerHTML = '';
          el.appendChild(img);
          el.appendChild(document.createTextNode(' ' + dict[key]));
        } else {
          el.innerText = dict[key];
        }
      }
    });
    document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
      const key = el.getAttribute('data-i18n-placeholder');
      if (dict[key]) el.placeholder = dict[key];
    });
    document.querySelectorAll('[data-i18n-opt]').forEach(el => {
      const key = el.getAttribute('data-i18n-opt');
      if (dict[key]) el.innerText = dict[key];
    });
  }
};

window.i18n = i18n;
document.addEventListener('DOMContentLoaded', () => { i18n.init(); });
