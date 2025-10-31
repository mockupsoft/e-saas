# 📚 SaaS E-Ticaret Platformu API Dokümantasyonu

Bu dokümantasyon, SaaS E-Ticaret Platformu API'lerini Swagger UI ile nasıl kullanacağınızı açıklar.

## 🌐 Swagger UI Erişimi

Swagger UI'ye aşağıdaki URL'den erişebilirsiniz:

**🔗 Production:** `https://saas.apollo12.co/api-docs/` 🔒
**🔗 Development:** `http://localhost:3000/api-docs/`

> **🔒 SSL Güvenlik**: HTTPS ile güvenli bağlantı sağlanır
> 
> **🔀 Otomatik Yönlendirme**: HTTP istekleri HTTPS'e yönlendirilir

## 📋 API Kategorileri

### 1. 🏠 System APIs
- **GET /** - API durumu kontrolü
- Platform durumu ve versiyon bilgileri

### 2. 👥 Admin APIs
- **GET /admin/api/tenants** - Tenant listesi (Admin yetkisi gerekli)
- **POST /admin/api/tenants** - Yeni tenant oluştur
- Süper admin paneli yönetimi

### 3. 🏪 Tenant APIs
- **GET /{tenant}/api/categories** - Kategori listesi
- **POST /{tenant}/api/categories** - Yeni kategori oluştur
- **GET /{tenant}/api/categories/{id}** - Kategori detayı
- **PUT /{tenant}/api/categories/{id}** - Kategori güncelle
- **DELETE /{tenant}/api/categories/{id}** - Kategori sil
- **GET /{tenant}/api/coupons** - Kupon listesi
- **POST /{tenant}/api/coupons** - Yeni kupon oluştur
- **GET /{tenant}/api/coupons/{id}** - Kupon detayı
- **PUT /{tenant}/api/coupons/{id}** - Kupon güncelle
- **DELETE /{tenant}/api/coupons/{id}** - Kupon sil

## 🔐 Kimlik Doğrulama

Platform iki tür kimlik doğrulama kullanır:

### Session Auth (Cookie)
```
SessionAuth: connect.sid cookie
```
- Web arayüzü için otomatik session yönetimi
- Login sonrası otomatik cookie set edilir

### Bearer Token (JWT)
```
Authorization: Bearer <jwt_token>
```
- API-only erişimler için
- Mobil uygulamalar ve 3. parti entegrasyonlar

## 🏢 Multi-Tenant Yapısı

Her tenant kendi domain'i ile erişilir:

- **test1**: `http://saas.apollo12.co:3000/test1/`
- **demo**: `http://saas.apollo12.co:3000/demo/`
- **dbtest**: `http://saas.apollo12.co:3000/dbtest/`

### Tenant API Örnekleri

```bash
# Test1 tenant'ının kategorilerini getir
curl http://saas.apollo12.co:3000/test1/api/categories

# Demo tenant'ına yeni kategori ekle
curl -X POST http://saas.apollo12.co:3000/demo/api/categories \
  -H "Content-Type: application/json" \
  -d '{"name":"Elektronik","description":"Elektronik ürünler","status":"active"}'

# Test1 tenant'ının kuponlarını getir
curl http://saas.apollo12.co:3000/test1/api/coupons

# Demo tenant'ına yeni kupon ekle
curl -X POST http://saas.apollo12.co:3000/demo/api/coupons \
  -H "Content-Type: application/json" \
  -d '{
    "code": "INDIRIM20",
    "type": "percentage", 
    "amount": 20,
    "min_cart_total": 100,
    "expires_at": "2024-12-31T23:59:59Z",
    "status": "active"
  }'
```

## 📊 API Response Formatı

Tüm API'ler standart response formatı kullanır:

### Başarılı Response
```json
{
  "success": true,
  "data": {
    // Response data
  },
  "message": "İşlem başarıyla tamamlandı",
  "timestamp": "2025-07-23T12:00:00.000Z"
}
```

### Hata Response
```json
{
  "success": false,
  "error": "ERROR_CODE",
  "message": "Hata açıklaması",
  "timestamp": "2025-07-23T12:00:00.000Z"
}
```

## 🧪 Test Senaryoları

### 1. Kategori Yönetimi Testi

```bash
# 1. Mevcut kategorileri listele
curl http://saas.apollo12.co:3000/test1/api/categories

# 2. Yeni kategori oluştur
curl -X POST http://saas.apollo12.co:3000/test1/api/categories \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test Kategori",
    "description": "API ile test kategorisi",
    "status": "active"
  }'

# 3. Kategori detayını getir (ID: 1)
curl http://saas.apollo12.co:3000/test1/api/categories/1

# 4. Kategori güncelle
curl -X PUT http://saas.apollo12.co:3000/test1/api/categories/1 \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Güncellenmiş Kategori",
    "description": "Güncellenmiş açıklama",
    "status": "active"
  }'

# 5. Kategori sil (soft delete)
curl -X DELETE http://saas.apollo12.co:3000/test1/api/categories/1
```

### 2. Admin Tenant Testi

```bash
# Tüm tenant'ları listele
curl http://saas.apollo12.co:3000/admin/api/tenants
```

## 🛠️ Swagger Konfigürasyonu

Swagger konfigürasyonu `src/config/swagger.js` dosyasında tanımlıdır:

- **OpenAPI Version**: 3.0.0
- **Security Schemes**: Session Auth + Bearer Token
- **Custom Styling**: Platform teması
- **Schema Definitions**: Category, Tenant, ApiResponse modelleri

## 📝 API Dokümantasyonu Ekleme

Yeni API endpoint'i için Swagger dokümantasyonu eklemek:

```javascript
/**
 * @swagger
 * /{tenant}/api/products:
 *   get:
 *     summary: Ürün listesini getir
 *     description: Tenant'a ait tüm ürünleri getirir
 *     tags: [Products]
 *     parameters:
 *       - in: path
 *         name: tenant
 *         required: true
 *         schema:
 *           type: string
 *         description: Tenant domain adı
 *     responses:
 *       200:
 *         description: Ürün listesi başarıyla getirildi
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiResponse'
 */
router.get('/api/products', async (req, res) => {
  // API implementasyonu
});
```

## 🚀 Geliştirme Notları

- Swagger UI otomatik olarak route dosyalarını tarar
- JSDoc comment'leri kullanarak API dokümantasyonu eklenir
- Schema'lar `src/config/swagger.js` dosyasında tanımlanır
- Custom CSS ile platform teması uygulanır

## 🔍 Debug ve Test

Swagger UI ile API'leri test etmek için:

1. `http://saas.apollo12.co:3000/api-docs/` adresini açın
2. İlgili API endpoint'ini seçin
3. "Try it out" butonuna tıklayın
4. Gerekli parametreleri doldurun
5. "Execute" ile API'yi test edin

## 📞 Destek

API kullanımı ile ilgili sorularınız için:
- **Email**: support@saas.apollo12.co
- **Swagger UI**: Interactive API documentation
- **Platform**: Multi-tenant SaaS Architecture 