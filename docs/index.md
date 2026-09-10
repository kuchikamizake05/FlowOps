<div align="center">

# Sama kaya yang lain

| Anggota | NIM |
| :--- | :--- |
| Faaid Sakhaa | 24/539398/TK/59820 |
| Rafif Raihan Bahrul Alam | 24/534432/TK/59237 |
| Hendra Kurnia Maliqi | 24/542344/TK/60216 |

Project Senior Project TI

Departemen Teknologi Elektro dan Teknologi Informasi,
Fakultas Teknik, Universitas Gadjah Mada

</div>

---

## FlowOps

## Permasalahan yang Dipecahkan

### Latar Belakang

Perdagangan daring Indonesia melibatkan basis usaha yang besar. Publikasi Statistik E-Commerce 2023 dari Badan Pusat Statistik memperkirakan terdapat 3.816.750 usaha e-commerce di Indonesia pada 2023. Publikasi yang sama menyebut 95,33% usaha e-commerce menggunakan pesan instan sebagai media penjualan, sedangkan hanya 15,19% yang memiliki laporan keuangan (Badan Pusat Statistik, 2025a). Angka tersebut tidak secara langsung membuktikan bahwa semua seller mengalami order terlewat, tetapi menunjukkan bahwa banyak operasional e-commerce berlangsung melalui kanal digital yang informal dan berpotensi membutuhkan alat operasional yang sederhana, bukan ERP besar.

Nilai transaksi e-commerce Indonesia juga meningkat dari sekitar Rp205,5 triliun pada 2019 menjadi sekitar Rp487 triliun pada 2024, menurut Bank Indonesia (Bank Indonesia, 2025). Pertumbuhan transaksi memperbesar kebutuhan seller untuk memproses order secara cepat dan konsisten. Di marketplace, keterlambatan bukan sekadar persoalan kenyamanan. Dokumentasi resmi TikTok Shop menjelaskan adanya batas waktu seperti `rts_sla`, `tts_sla`, dan `cancel_order_sla`. Order yang tidak mencapai status tertentu sebelum batas tersebut dapat dihitung sebagai *late dispatch* atau dibatalkan otomatis. Permintaan pembatalan tertentu juga harus ditindak dalam jangka waktu tertentu agar tidak disetujui otomatis oleh platform.

Artinya, seller perlu mengetahui order mana yang membutuhkan tindakan sekarang, bukan hanya melihat daftar seluruh order. Produk omnichannel yang telah ada membuktikan bahwa bisnis memang membutuhkan penyatuan kanal, order, stok, chat, dan pengiriman. Namun, sebagian produk memiliki cakupan sangat luas. Untuk tim seller kecil, masalah yang lebih spesifik adalah: informasi order tersebar di dashboard marketplace, chat, dan catatan manual; order normal bercampur dengan order yang mendekati tenggat atau memiliki masalah; admin harus memeriksa daftar secara berulang untuk menentukan prioritas; alasan komplain atau retur berbentuk teks bebas sehingga perlu dibaca satu per satu; tindakan antaranggota tim tidak selalu tercatat, sehingga order berisiko ditangani ganda atau justru terlewat.

FlowOps tidak berangkat dari klaim bahwa seller membutuhkan ERP baru. Produk ini berangkat dari pertanyaan yang lebih sempit, yaitu bagaimana menyaring ratusan event operasional menjadi antrean singkat berisi order yang benar-benar membutuhkan perhatian manusia?

### Rumusan Permasalahan

Bagaimana merancang aplikasi web berbasis jaringan dan cloud yang dapat menerima data order, mendeteksi order bermasalah atau mendekati tenggat, memprioritaskan tindakan, serta menggunakan AI untuk memahami informasi tidak terstruktur tanpa mengambil keputusan kritis secara otomatis?

Sub-rumusan:

- Bagaimana mengintegrasikan event order dari marketplace atau simulator ke satu model data yang konsisten?
- Bagaimana menentukan urgensi order secara transparan menggunakan aturan SLA dan kondisi operasional?
- Bagaimana AI dapat mengklasifikasikan teks komplain, pembatalan, atau retur dan menghasilkan saran tindakan terstruktur?
- Bagaimana sistem memberi notifikasi yang tepat tanpa membanjiri pengguna dengan seluruh event normal?
- Bagaimana setiap perubahan status dan tindakan operator dapat dicatat untuk evaluasi dan audit?

## Ide Solusi yang Diusulkan beserta Rancangan Fitur

### Solusi

FlowOps adalah *marketplace fulfillment exception copilot* yang mengubah data order menjadi antrean tindakan. Sistem menerima event order, menormalisasi format datanya, menjalankan aturan operasional, dan hanya menonjolkan order yang bermasalah atau mendekati tenggat. AI digunakan untuk bagian yang memang tidak terstruktur, misalnya membaca alasan komplain/retur dan menyusun ringkasan, sedangkan tenggat dan status kritis dihitung dengan aturan deterministik agar dapat dijelaskan dan diuji.

Pertanyaan yang dijawab FlowOps setiap saat adalah: “Order mana yang bermasalah, mengapa order itu diprioritaskan, dan apa tindakan berikutnya?”

### Rancangan Fitur Solusi

| Fitur | Keterangan |
| ----- | ----- |
| Autentikasi dan Role | Owner dan operator dapat masuk. Owner melihat seluruh data, sedangkan operator hanya mengelola exception. Akses API yang tidak sah ditolak. |
| Order Ingestion | Menerima webhook HTTPS dan impor CSV, memvalidasi payload, menyimpan event, serta memberi respons cepat. |
| Normalisasi Order | Mengubah payload sumber menjadi model internal yang sama sehingga rules engine tidak bergantung pada format sumber. |
| Rules Engine | Mendeteksi lima exception MVP secara deterministik dan menyimpan rule yang terpicu serta penjelasannya. |
| Detail Order dan Timeline | Menampilkan data order, sumber event, exception, rekomendasi, assignee, serta histori tindakan secara kronologis. |
| AI Text Triage | Mengubah alasan komplain/retur menjadi JSON terstruktur: kategori, urgensi, ringkasan, saran, dan confidence. Output dapat dikoreksi operator. |
| Audit Trail | Mencatat siapa melakukan apa, kapan, pada order mana, serta nilai sebelum/sesudah perubahan. |

## Analisis Kompetitor

### Jubelio

| Aspek | Keterangan |
| ----- | ----- |
| Jenis Kompetitor | Direct competitor |
| Jenis Produk | Platform operasi bisnis omnichannel |
| Target Customer | Bisnis online/offline yang mengelola katalog, stok, pesanan, gudang, keuangan, dan penjualan lintas channel |
| Kelebihan | Cakupan end-to-end: katalog, persediaan, order, gudang, keuangan, shipment, chat, dan analytics. Mendukung integrasi marketplace, webstore, toko offline, dan social commerce. Memiliki fitur AI untuk visual matching, chat, dan analisis penjualan. Ekosistem dan integrasi lebih matang daripada produk mahasiswa. |
| Kekurangan | Cakupan yang luas dapat lebih berat daripada kebutuhan seller kecil yang hanya ingin melihat order bermasalah. Berdasarkan positioning publiknya, pusat nilai Jubelio adalah sistem operasi omnichannel secara menyeluruh, bukan antrean exception dengan penjelasan rule dan audit keputusan sebagai pengalaman utama. Sulit ditandingi secara breadth; karena itu FlowOps harus menang melalui fokus, bukan jumlah modul. |
| Key Competitive Advantage & Unique Value | Satu ekosistem untuk mengendalikan hampir seluruh operasi penjualan omnichannel. |

### ResiHub

| Aspek | Keterangan |
| ----- | ----- |
| Jenis Kompetitor | Direct competitor pada tahap pengiriman |
| Jenis Produk | Tracking resi dan manajemen order berbasis AI |
| Target Customer | Bisnis D2C/COD dan tim customer service yang perlu memantau pengiriman serta performa kurir |
| Kelebihan | Mendeteksi masalah pengiriman dan membuat action plan untuk tim. Menyediakan notifikasi, multi-role, dashboard analitik, dan integrasi WhatsApp. Memiliki fitur COD, profit, database pelanggan, dan performa ekspedisi. Positioning mudah dipahami dan dekat dengan pain operasional nyata. |
| Kekurangan | Fokus publiknya lebih kuat pada resi, kurir, COD, dan kondisi setelah order dikirim. Pre-fulfillment exception seperti risiko ready-to-ship, request pembatalan, label belum tersedia, dan pembagian tugas berbasis SLA marketplace bukan pusat positioning publiknya. Cakupan ekspedisi yang disebut di halaman produk masih terbatas pada beberapa layanan. |
| Key Competitive Advantage & Unique Value | Pemantauan pengiriman berbasis AI yang menghubungkan status resi, masalah logistik, notifikasi, dan profit COD. |

### Komni

| Aspek | Keterangan |
| ----- | ----- |
| Jenis Kompetitor | Indirect competitor |
| Jenis Produk | Omnichannel inbox, customer/order context, CRM, dan AI automation |
| Target Customer | Tidak dicantumkan dalam worksheet. |
| Kelebihan | Menyatukan chat dari WhatsApp Business, Shopee, Tokopedia, TikTok Shop, Instagram, dan kanal lain. Menampilkan riwayat customer, order, dan catatan dalam konteks percakapan. Memiliki AI untuk booking, meeting, dan auto-order. Cocok untuk kolaborasi tim customer-facing. |
| Kekurangan | Nilai utama berpusat pada komunikasi dan customer journey, bukan fulfillment exception queue. Berdasarkan halaman publik, tidak tampak fokus khusus pada skor risiko SLA marketplace yang transparan. FlowOps tidak perlu menandingi unified inbox; FlowOps dapat fokus pada tindakan operasional setelah order tercipta. |
| Key Competitive Advantage & Unique Value | Menghubungkan percakapan omnichannel dengan konteks customer dan order dalam satu dashboard kolaboratif. |
