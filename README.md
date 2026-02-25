# SEO Analyzer Pro

Herhangi bir web sayfasını tek tıkla analiz eden, 100 üzerinden SEO puanı veren ve iyileştirme önerileri sunan Chrome uzantısı.

## Özellikler

### 11 Analiz Sekmesi

| Sekme | Açıklama |
|-------|----------|
| **Genel Bakış** | SEO puanı (100 üzerinden), title/meta analizi, canonical, HTTPS kontrolü |
| **Başlıklar** | H1-H6 hiyerarşisi, eksik/tekrarlanan başlık uyarıları |
| **Hreflang** | Dil etiketleri doğrulaması, x-default kontrolü |
| **Linkler** | İç/dış link dağılımı, nofollow analizi, kırık link tespiti |
| **Görseller** | Alt metin kontrolü, boyut/lazy-loading analizi |
| **Schema** | JSON-LD, Microdata ve RDFa yapısal veri tespiti |
| **Sosyal** | Open Graph ve Twitter Card önizlemesi ve doğrulaması |
| **Performans** | Web Vitals (FCP, DCL), kaynak boyutları, render-blocking tespiti |
| **Anahtar Kelime** | Kelime yoğunluğu (1/2/3-gram), keyword stuffing uyarısı |
| **Taranabilirlik** | robots.txt analizi, sitemap.xml kontrolü |
| **Karşılaştır** | Rakip URL ile yan yana SEO karşılaştırması |

### Ek Özellikler

- **SEO Puanlama** — 5 kategoride 100 puan: On-Page (30), İçerik Kalitesi (20), Teknik (20), Link Sağlığı (15), Performans (15)
- **Kırık Link Tespiti** — Sayfadaki tüm linkleri kontrol eder, 4xx/5xx hataları raporlar
- **Redirect Zinciri** — URL yönlendirme zincirini gösterir (301/302)
- **SEO Geçmişi** — Sayfa bazında puan geçmişi ve trend grafiği
- **Dışa Aktarma** — CSV, PDF, JSON formatları + Panoya Kopyala
- **Koyu Tema** — Tek tıkla light/dark mod geçişi
- **Çoklu Dil** — Türkçe ve İngilizce arayüz desteği (i18n)

## Kurulum

1. Bu repoyu indirin veya klonlayın
2. Chrome'da `chrome://extensions/` adresine gidin
3. Sağ üst köşeden **Geliştirici modu**'nu açın
4. **Paketlenmemiş öğe yükle** butonuna tıklayın
5. İndirdiğiniz klasörü seçin

## Kullanım

1. Analiz etmek istediğiniz web sayfasına gidin
2. Araç çubuğundaki SEO Analyzer Pro simgesine tıklayın
3. Analiz sonuçları otomatik olarak yüklenir
4. Sekmeler arasında geçiş yaparak detaylı inceleyin
5. Dışa aktarmak için **Export** butonlarını kullanın

## Gereksinimler

- Chrome 116+ (Manifest V3)
- Aktif bir web sayfası (uzantı sayfaları analiz edilemez)

## İzinler

- `activeTab` — Aktif sekmedeki sayfa verisine erişim
- `scripting` — Content script enjeksiyonu
- `storage` — Tema, geçmiş ve ayar verilerini saklama

## Lisans

MIT
