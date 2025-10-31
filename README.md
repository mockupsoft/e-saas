# 🏢 SaaS E-Ticaret Platformu

Multi-tenant SaaS e-ticaret platformu - saas.apollo12.co

**Version**: 1.0.0  
**Repository**: [https://github.com/mockupsoft/e-saas](https://github.com/mockupsoft/e-saas)

## 🚀 Özellikler

- **Multi-Tenant Architecture**: Her müşteri kendi izole edilmiş mağazası
- **Dinamik Veritabanı**: Tenant başına ayrı veritabanı
- **Responsive Design**: Mobile-first tasarım
- **Real-time Updates**: HTMX ile dinamik içerik
- **Admin Panel**: Süper admin yönetim paneli
- **API Documentation**: Swagger UI ile tam API dokümantasyonu

## 📦 Kurulum

```bash
# Depoyu klonla
git clone https://github.com/mockupsoft/e-saas.git
cd saas-panel

# Bağımlılıkları yükle
npm install

# Çevre değişkenlerini ayarla
cp .env.example .env
# .env dosyasını düzenle

# Veritabanını başlat
# MariaDB/MySQL sunucunuzun çalıştığından emin olun

# Uygulamayı başlat
npm start
```

## 🌐 Erişim URL'leri

### 🏠 Ana Platform
- **Production**: http://saas.apollo12.co:3000
- **Development**: http://localhost:3000

### 👥 Admin Panel
- **URL**: http://saas.apollo12.co:3000/admin
- Süper admin yönetim paneli

### 🏪 Tenant Mağazaları
- **Test1**: http://saas.apollo12.co:3000/test1
- **Demo**: http://saas.apollo12.co:3000/demo
- **DBTest**: http://saas.apollo12.co:3000/dbtest

## 📚 API Dokümantasyonu

### 🔗 Swagger UI
**Live Documentation**: http://saas.apollo12.co:3000/api-docs/

Swagger UI ile tüm API endpoint'lerini test edebilir ve dokümantasyonu görüntüleyebilirsiniz.

### 📋 API Kategorileri
- **System APIs**: Platform durumu ve sistem bilgileri
- **Admin APIs**: Tenant yönetimi ve sistem yönetimi
- **Tenant APIs**: Kategori, ürün ve mağaza yönetimi

### 🧪 Hızlı API Testi
```bash
# Platform durumunu kontrol et
curl http://saas.apollo12.co:3000/

# Test1 kategorilerini getir
curl http://saas.apollo12.co:3000/test1/api/categories

# Yeni kategori oluştur
curl -X POST http://saas.apollo12.co:3000/test1/api/categories \
  -H "Content-Type: application/json" \
  -d '{"name":"API Test","description":"API ile test","status":"active"}'
```

**Detaylı API Dokümantasyonu**: [SWAGGER.md](./SWAGGER.md)

## 🛠️ Geliştirme

```bash
# Development mode (auto-restart)
npm run dev

# Production mode
npm run production

# Swagger dokümantasyonu ile başlat
npm run swagger

# Dokümantasyon linklerini göster
npm run docs
```

## 🏗️ Mimari

### Multi-Tenant Yapısı
```
saas.apollo12.co:3000/
├── admin/           # Süper admin paneli
├── test1/           # Test mağazası (DB: saas_test1)
├── demo/            # Demo mağazası (DB: saas_demo)
├── dbtest/          # Test mağazası (DB: saas_dbtest)
└── api-docs/        # Swagger UI dokümantasyonu
```

### Veritabanı Modeli
- **saas_main**: Ana platform ve tenant bilgileri
- **saas_test1**: Test1 tenant veritabanı
- **saas_demo**: Demo tenant veritabanı
- **saas_dbtest**: DBTest tenant veritabanı

## 🔧 Teknolojiler

### Backend
- **Node.js**: Server runtime
- **Express.js**: Web framework
- **MariaDB/MySQL**: Veritabanı
- **EJS**: Template engine
- **Swagger**: API dokümantasyonu

### Frontend
- **HTMX**: Dynamic content
- **Vanilla JavaScript**: Client-side logic
- **CSS3**: Responsive styling
- **Font Awesome**: Icons

### Security
- **Helmet.js**: Security headers
- **CORS**: Cross-origin resource sharing
- **Session Management**: Cookie-based auth
- **CSP**: Content Security Policy

### 💾 Backup System
- **Full System Backup**: Tüm dosyalar ve veritabanları
- **Compressed Archives**: `.tar.gz` formatında sıkıştırma
- **Database Dump**: `mysqldump` ile veritabanı yedekleme
- **Web Interface**: Admin panel entegrasyonu
- **Security**: Süper admin erişimi, rate limiting
- **Restore**: Tek tıkla sistem geri yükleme

## 📁 Proje Yapısı

```
saas-panel/
├── src/
│   ├── config/
│   │   └── swagger.js          # Swagger konfigürasyonu
│   ├── middleware/
│   │   ├── tenantRouter.js     # Tenant routing
│   │   └── adminAuth.js        # Admin authentication
│   ├── models/
│   │   ├── Category.js         # Kategori modeli
│   │   └── Tenant.js           # Tenant modeli
│   ├── routes/
│   │   ├── admin.js            # Admin rotaları
│   │   ├── backup.js           # Backup system routes
│   │   └── tenant.js           # Tenant rotaları
│   └── utils/
│       ├── db.js               # Veritabanı utilities
│       └── backup.js           # Backup service
├── views/
│   ├── admin/
│   │   ├── dashboard.ejs       # Admin dashboard
│   │   └── backup.ejs          # Backup management
│   └── tenant/                 # Tenant views
├── backups/                    # Backup storage
├── public/                     # Static files
├── uploads/                    # User uploads
└── storage/                    # Application storage
```

## 🎯 Öne Çıkan Özellikler

### 1. Kategori Yönetimi
- ✅ CRUD operasyonları
- ✅ Soft delete (inactive status)
- ✅ Real-time UI updates
- ✅ Search/filter functionality
- ✅ HTMX integration

### 2. Multi-Tenant Support
- ✅ Tenant-specific databases
- ✅ Dynamic tenant detection
- ✅ Isolated data per tenant
- ✅ Admin tenant management

### 3. API Documentation
- ✅ Swagger UI integration
- ✅ Interactive API testing
- ✅ Schema definitions
- ✅ Authentication examples

## 🚀 Deployment

### Production Deployment
```bash
# Environment variables
NODE_ENV=production
PORT=3000
DB_HOST=localhost
DB_USER=your_db_user
DB_PASSWORD=your_db_password

# Start production server
npm run production
```

### Docker Support (Gelecek)
```bash
# Docker build & run commands will be added
```

## 📞 Destek

- **API Dokümantasyonu**: [Swagger UI](https://saas.apollo12.co/api-docs/) 🔒
- **Platform URL**: https://saas.apollo12.co 🔒
- **Email**: support@saas.apollo12.co

## 📄 Lisans

MIT License

## 🤝 Katkıda Bulunma

1. Fork yapın
2. Feature branch oluşturun (`git checkout -b feature/amazing-feature`)
3. Commit yapın (`git commit -m 'Add some amazing feature'`)
4. Branch'i push edin (`git push origin feature/amazing-feature`)
5. Pull Request oluşturun

---

**🎉 SaaS E-Ticaret Platformu ile modern multi-tenant e-ticaret çözümünüz hazır!** 

## 💾 Backup System Usage

### Admin Panel Access
```
https://saas.apollo12.co/admin/backup
```

### Features
- **Create Backup**: Yedek Al butonu ile tam sistem yedekleme
- **Restore**: Seçilen backup'tan sistem geri yükleme  
- **List Management**: Mevcut backup'ları listeleme ve yönetme
- **Log Viewer**: Backup/restore işlem loglarını görüntüleme
- **Auto Refresh**: 30 saniyede bir otomatik liste yenileme

### API Endpoints
```bash
# Create backup
POST /admin/backup/api/create

# List backups  
GET /admin/backup/api/list

# Restore backup
POST /admin/backup/api/restore/:backupId

# Delete backup
DELETE /admin/backup/api/delete/:backupId

# View logs
GET /admin/backup/api/logs/:operation
```

### Security
- ✅ Sadece süper admin erişimi
- ✅ Rate limiting (5 dakikada 3 işlem)
- ✅ AJAX/HTMX validation
- ✅ Referrer header kontrolü

Detaylı backup sistemi dokümantasyonu için: **[BACKUP_SYSTEM.md](./BACKUP_SYSTEM.md)** 