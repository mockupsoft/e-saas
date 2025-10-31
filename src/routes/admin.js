const express = require('express');
const router = express.Router();
const Tenant = require('../models/Tenant');
const Brand = require('../models/Brand');
const { createTenantDatabase, dropTenantDatabase } = require('../utils/db');
const { getRoutingInfo, setRoutingMode } = require('../utils/routing');
const multer = require('multer');
const path = require('path');

// Admin Analytics/Reports Router'ını dahil et
const adminReportsRouter = require('./admin-reports');

// Admin Backup Router'ını dahil et
const adminBackupRouter = require('./backup');

// Logo upload konfigürasyonu
const logoStorage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'uploads/brands/');
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, 'brand-' + uniqueSuffix + path.extname(file.originalname));
    }
});

const logoUpload = multer({
    storage: logoStorage,
    limits: {
        fileSize: 1024 * 1024 // 1MB limit
    },
    fileFilter: function (req, file, cb) {
        const allowedTypes = /jpeg|jpg|png/;
        const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
        const mimetype = allowedTypes.test(file.mimetype);

        if (mimetype && extname) {
            return cb(null, true);
        } else {
            cb(new Error('Sadece PNG ve JPG dosyaları yüklenebilir!'));
        }
    }
});

// Ana admin dashboard rotası
router.get('/dashboard', async (req, res) => {
    try {
        // Gerçek istatistikleri al
        const tenants = await Tenant.getAllTenants();
        const tenantCount = await Tenant.getCount();
        
        // EJS template'i render et
        res.render('admin/dashboard', {
            tenants: tenants,
            tenantCount: tenantCount,
            title: 'Süper Admin Dashboard'
        });
    } catch (error) {
        console.error('Admin dashboard hatası:', error.message);
        res.status(500).send(`
            <h1>Dashboard Hatası</h1>
            <p>Dashboard yüklenirken bir hata oluştu: ${error.message}</p>
            <a href="/admin/dashboard">Tekrar Dene</a>
        `);
    }
});

// Eski dashboard HTML'i kaldırıldı - artık EJS template kullanıyor
router.get('/dashboard-old', async (req, res) => {
    try {
        // Gerçek istatistikleri al
        const tenants = await Tenant.getAllTenants();
        const tenantCount = await Tenant.getCount();
        
        const adminDashboardHTML = `
        <!DOCTYPE html>
        <html lang="tr">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Süper Admin Dashboard - SaaS E-Ticaret</title>
            <link rel="stylesheet" href="/css/dashboard.css">
        </head>
        <body class="admin">
            <div class="dashboard-layout">
                <!-- Sidebar -->
                <nav class="sidebar">
                    <div class="sidebar-header">
                        <div class="logo">
                            <div class="logo-icon">🚀</div>
                            <span class="logo-text">Süper Admin</span>
                        </div>
                        <button class="sidebar-toggle">✕</button>
                    </div>
                    
                    <div class="sidebar-nav">
                        <div class="nav-section">
                            <div class="nav-section-title">Ana Menü</div>
                            <div class="nav-item">
                                <a href="/admin/dashboard" class="nav-link active">
                                    <div class="nav-icon">📊</div>
                                    <span class="nav-text">Dashboard</span>
                                </a>
                            </div>
                            <div class="nav-item">
                                <a href="/admin/tenants" class="nav-link">
                                    <div class="nav-icon">👥</div>
                                    <span class="nav-text">Tenant Yönetimi</span>
                                </a>
                            </div>
                            <div class="nav-item">
                                <a href="/admin/billing" class="nav-link">
                                    <div class="nav-icon">💰</div>
                                    <span class="nav-text">Faturalandırma</span>
                                </a>
                            </div>
                        </div>
                        
                        <div class="nav-section">
                            <div class="nav-section-title">İzleme</div>
                            <div class="nav-item">
                                <a href="/admin/analytics" class="nav-link">
                                    <div class="nav-icon">📈</div>
                                    <span class="nav-text">Analytics</span>
                                </a>
                            </div>
                            <div class="nav-item">
                                <a href="/admin/logs" class="nav-link">
                                    <div class="nav-icon">📋</div>
                                    <span class="nav-text">Sistem Logları</span>
                                </a>
                            </div>
                            <div class="nav-item">
                                <a href="/admin/monitoring" class="nav-link">
                                    <div class="nav-icon">🔍</div>
                                    <span class="nav-text">Sistem İzleme</span>
                                </a>
                            </div>
                        </div>
                        
                        <div class="nav-section">
                            <div class="nav-section-title">Sistem</div>
                            <div class="nav-item">
                                <a href="/admin/settings" class="nav-link">
                                    <div class="nav-icon">⚙️</div>
                                    <span class="nav-text">Ayarlar</span>
                                </a>
                            </div>
                            <div class="nav-item">
                                <a href="/admin/support" class="nav-link">
                                    <div class="nav-icon">🎧</div>
                                    <span class="nav-text">Destek</span>
                                </a>
                            </div>
                            <div class="nav-item">
                                <a href="/admin/backup" class="nav-link">
                                    <div class="nav-icon">💾</div>
                                    <span class="nav-text">Yedekleme</span>
                                </a>
                            </div>
                        </div>
                    </div>
                </nav>
                
                <!-- Main Content -->
                <main class="main-content">
                    <!-- Top Bar -->
                    <header class="top-bar">
                        <h1 class="page-title">Süper Admin Dashboard</h1>
                        <div class="top-bar-actions">
                            <button class="mobile-menu-btn">☰</button>
                            <div style="color: #6b7280; font-size: 0.875rem;">
                                ${new Date().toLocaleString('tr-TR')}
                            </div>
                        </div>
                    </header>
                    
                    <!-- Dashboard Content -->
                    <div class="content">
                        <!-- Stats Grid -->
                        <div class="stats-grid">
                            <div class="stat-card">
                                <div class="stat-icon">🏢</div>
                                <div class="stat-number">${tenantCount}</div>
                                <div class="stat-label">Aktif Tenant</div>
                                <div class="stat-change positive">
                                    ↗ +3 bu ay
                                </div>
                            </div>
                            
                            <div class="stat-card">
                                <div class="stat-icon">📦</div>
                                <div class="stat-number">1,543</div>
                                <div class="stat-label">Toplam Sipariş</div>
                                <div class="stat-change positive">
                                    ↗ +12% bu ay
                                </div>
                            </div>
                            
                            <div class="stat-card">
                                <div class="stat-icon">💰</div>
                                <div class="stat-number">₺124,500</div>
                                <div class="stat-label">Aylık Gelir</div>
                                <div class="stat-change positive">
                                    ↗ +8.2% geçen aya göre
                                </div>
                            </div>
                            
                            <div class="stat-card">
                                <div class="stat-icon">🔺</div>
                                <div class="stat-number">98.7%</div>
                                <div class="stat-label">Sistem Uptime</div>
                                <div class="stat-change positive">
                                    ↗ %99.1 ortalama
                                </div>
                            </div>
                        </div>
                        
                        <!-- Management Cards -->
                        <div class="cards-grid">
                            <div class="dashboard-card">
                                <div class="card-header">
                                    <h3 class="card-title">Son Aktiviteler</h3>
                                </div>
                                <div class="card-content">
                                    <div style="color: #6b7280; margin-bottom: 1rem;">
                                        <div style="padding: 0.5rem 0; border-bottom: 1px solid #e5e7eb;">
                                            ✅ Yeni tenant: "TechShop" oluşturuldu
                                        </div>
                                        <div style="padding: 0.5rem 0; border-bottom: 1px solid #e5e7eb;">
                                            📊 Sistem monitöring raporu hazır
                                        </div>
                                        <div style="padding: 0.5rem 0; border-bottom: 1px solid #e5e7eb;">
                                            🔄 Veritabanı yedeği tamamlandı
                                        </div>
                                        <div style="padding: 0.5rem 0;">
                                            💳 3 yeni ödeme tamamlandı
                                        </div>
                                    </div>
                                </div>
                            </div>
                            
                            <div class="dashboard-card">
                                <div class="card-header">
                                    <h3 class="card-title">Sistem Durumu</h3>
                                </div>
                                <div class="card-content">
                                    <div style="color: #6b7280;">
                                        <div style="display: flex; justify-content: space-between; padding: 0.5rem 0;">
                                            <span>CPU Kullanımı</span>
                                            <span style="color: #059669; font-weight: 600;">45%</span>
                                        </div>
                                        <div style="display: flex; justify-content: space-between; padding: 0.5rem 0;">
                                            <span>RAM Kullanımı</span>
                                            <span style="color: #059669; font-weight: 600;">62%</span>
                                        </div>
                                        <div style="display: flex; justify-content: space-between; padding: 0.5rem 0;">
                                            <span>Disk Kullanımı</span>
                                            <span style="color: #d97706; font-weight: 600;">78%</span>
                                        </div>
                                        <div style="display: flex; justify-content: space-between; padding: 0.5rem 0;">
                                            <span>Aktif Bağlantı</span>
                                            <span style="color: #059669; font-weight: 600;">234</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                        
                        <!-- Quick Actions -->
                        <div class="action-links">
                            <a href="/admin/tenants" class="action-link">
                                <div class="action-icon">👥</div>
                                <div class="action-content">
                                    <div class="action-title">Tenant Yönetimi</div>
                                    <div class="action-description">Yeni tenant oluştur ve mevcut olanları yönet</div>
                                </div>
                            </a>
                            
                            <a href="/admin/billing" class="action-link">
                                <div class="action-icon">💰</div>
                                <div class="action-content">
                                    <div class="action-title">Faturalandırma</div>
                                    <div class="action-description">Ödemeler ve faturaları görüntüle</div>
                                </div>
                            </a>
                            
                            <a href="/admin/analytics" class="action-link">
                                <div class="action-icon">📊</div>
                                <div class="action-content">
                                    <div class="action-title">Analytics</div>
                                    <div class="action-description">Detaylı raporlar ve istatistikler</div>
                                </div>
                            </a>
                            
                            <a href="/admin/settings" class="action-link">
                                <div class="action-icon">⚙️</div>
                                <div class="action-content">
                                    <div class="action-title">Sistem Ayarları</div>
                                    <div class="action-description">Genel sistem konfigürasyonu</div>
                                </div>
                            </a>
                            
                            <a href="/admin/logs" class="action-link">
                                <div class="action-icon">📋</div>
                                <div class="action-content">
                                    <div class="action-title">Sistem Logları</div>
                                    <div class="action-description">Hata ve aktivite loglarını incele</div>
                                </div>
                            </a>
                            
                            <a href="/admin/support" class="action-link">
                                <div class="action-icon">🎧</div>
                                <div class="action-content">
                                    <div class="action-title">Destek Talepleri</div>
                                    <div class="action-description">Müşteri destek taleplerine yanıt ver</div>
                                </div>
                            </a>
                        </div>
                    </div>
                </main>
            </div>
            
            <!-- Overlay for mobile -->
            <div class="overlay"></div>
            
            <script src="/js/dashboard.js"></script>
        </body>
        </html>
        `;        
        
        res.send(adminDashboardHTML);
    } catch (error) {
        console.error('Admin dashboard-old hatası:', error.message);
        res.status(500).send(`
            <h1>Dashboard Hatası</h1>
            <p>Dashboard yüklenirken bir hata oluştu: ${error.message}</p>
            <a href="/admin/dashboard">Tekrar Dene</a>
        `);
    }
});

// Tenant yönetimi sayfası - HTML görünümü
router.get('/tenants', async (req, res) => {
    try {
        const tenants = await Tenant.getAllTenants();
        const tenantCount = await Tenant.getCount();
        
        const tenantsPageHTML = `
        <!DOCTYPE html>
        <html lang="tr">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Tenant Yönetimi - Süper Admin</title>
            <link rel="stylesheet" href="/css/dashboard.css">
            <script src="https://unpkg.com/htmx.org@1.9.12"></script>
        </head>
        <body class="admin">
            <div class="dashboard-layout">
                <!-- Sidebar -->
                <nav class="sidebar">
                    <div class="sidebar-header">
                        <div class="logo">
                            <div class="logo-icon">🚀</div>
                            <span class="logo-text">Süper Admin</span>
                        </div>
                        <button class="sidebar-toggle">✕</button>
                    </div>
                    
                    <div class="sidebar-nav">
                        <div class="nav-section">
                            <div class="nav-section-title">Ana Menü</div>
                            <div class="nav-item">
                                <a href="/admin/dashboard" class="nav-link">
                                    <div class="nav-icon">📊</div>
                                    <span class="nav-text">Dashboard</span>
                                </a>
                            </div>
                            <div class="nav-item">
                                <a href="/admin/tenants" class="nav-link active">
                                    <div class="nav-icon">👥</div>
                                    <span class="nav-text">Tenant Yönetimi</span>
                                </a>
                            </div>
                            <div class="nav-item">
                                <a href="/admin/billing" class="nav-link">
                                    <div class="nav-icon">💰</div>
                                    <span class="nav-text">Faturalandırma</span>
                                </a>
                            </div>
                        </div>
                        
                        <div class="nav-section">
                            <div class="nav-section-title">İzleme</div>
                            <div class="nav-item">
                                <a href="/admin/analytics" class="nav-link">
                                    <div class="nav-icon">📈</div>
                                    <span class="nav-text">Analytics</span>
                                </a>
                            </div>
                            <div class="nav-item">
                                <a href="/admin/logs" class="nav-link">
                                    <div class="nav-icon">📋</div>
                                    <span class="nav-text">Sistem Logları</span>
                                </a>
                            </div>
                            <div class="nav-item">
                                <a href="/admin/monitoring" class="nav-link">
                                    <div class="nav-icon">🔍</div>
                                    <span class="nav-text">Sistem İzleme</span>
                                </a>
                            </div>
                        </div>
                        
                        <div class="nav-section">
                            <div class="nav-section-title">Sistem</div>
                            <div class="nav-item">
                                <a href="/admin/settings" class="nav-link">
                                    <div class="nav-icon">⚙️</div>
                                    <span class="nav-text">Ayarlar</span>
                                </a>
                            </div>
                            <div class="nav-item">
                                <a href="/admin/support" class="nav-link">
                                    <div class="nav-icon">🎧</div>
                                    <span class="nav-text">Destek</span>
                                </a>
                            </div>
                            <div class="nav-item">
                                <a href="/admin/backup" class="nav-link">
                                    <div class="nav-icon">💾</div>
                                    <span class="nav-text">Yedekleme</span>
                                </a>
                            </div>
                        </div>
                    </div>
                </nav>
                
                <!-- Main Content -->
                <main class="main-content">
                    <!-- Top Bar -->
                    <header class="top-bar">
                        <h1 class="page-title">👥 Tenant Yönetimi</h1>
                        <div class="top-bar-actions">
                            <button class="mobile-menu-btn">☰</button>
                            <div style="display: flex; align-items: center; gap: 1rem;">
                                <span class="total-count">${tenantCount} Tenant</span>
                                <button class="btn btn-primary" data-action="open-add-tenant-modal">
                                    <span>➕</span>
                                    Yeni Tenant
                                </button>
                            </div>
                        </div>
                    </header>
                    
                    <!-- Content -->
                    <div class="content">
                        <!-- Stats Cards -->
                        <div class="stats-grid" style="margin-bottom: 2rem;">
                            <div class="stat-card">
                                <div class="stat-icon">🏢</div>
                                <div class="stat-number">${tenantCount}</div>
                                <div class="stat-label">Toplam Tenant</div>
                            </div>
                            <div class="stat-card">
                                <div class="stat-icon">✅</div>
                                <div class="stat-number">${tenants.filter(t => t.status === 'active').length}</div>
                                <div class="stat-label">Aktif Tenant</div>
                            </div>
                            <div class="stat-card">
                                <div class="stat-icon">❌</div>
                                <div class="stat-number">${tenants.filter(t => t.status === 'inactive').length}</div>
                                <div class="stat-label">Pasif Tenant</div>
                            </div>
                            <div class="stat-card">
                                <div class="stat-icon">⏸️</div>
                                <div class="stat-number">${tenants.filter(t => t.status === 'suspended').length}</div>
                                <div class="stat-label">Askıda</div>
                            </div>
                        </div>

                        <!-- Tenants Table -->
                        <div class="table-container">
                            <table class="data-table">
                                <thead>
                                    <tr>
                                        <th>ID</th>
                                        <th>Tenant Adı</th>
                                        <th>Domain</th>
                                        <th>Veritabanı</th>
                                        <th>Durum</th>
                                        <th>Oluşturma Tarihi</th>
                                        <th>İşlemler</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    ${tenants.map(tenant => `
                                        <tr>
                                            <td>${tenant.id}</td>
                                            <td>
                                                <strong>${tenant.name}</strong>
                                            </td>
                                            <td>
                                                <a href="https://saas.apollo12.co/${tenant.domain}/" target="_blank" 
                                                   style="color: #10B981; text-decoration: none;">
                                                    ${tenant.domain}
                                                </a>
                                            </td>
                                            <td>
                                                <code style="background: #f3f4f6; padding: 2px 6px; border-radius: 4px; font-size: 0.875rem;">
                                                    ${tenant.db_name}
                                                </code>
                                            </td>
                                            <td>
                                                <span class="status-badge ${tenant.status === 'active' ? 'status-active' : 
                                                    tenant.status === 'inactive' ? 'status-inactive' : 'status-suspended'}">
                                                    ${tenant.status === 'active' ? 'Aktif' : 
                                                      tenant.status === 'inactive' ? 'Pasif' : 'Askıda'}
                                                </span>
                                            </td>
                                            <td>${new Date(tenant.created_at).toLocaleDateString('tr-TR')}</td>
                                            <td>
                                                <div class="action-buttons">
                                                    <a href="/${tenant.domain}/dashboard" target="_blank" 
                                                       class="btn-sm btn-outline">
                                                        👁️ Görüntüle
                                                    </a>
                                                    <button class="btn-sm btn-outline" data-action="edit-tenant" data-tenant-id="${tenant.id}">
                                                        ✏️ Düzenle
                                                    </button>
                                                    <button class="btn-sm btn-danger" data-action="delete-tenant" data-tenant-id="${tenant.id}">
                                                        🗑️ Sil
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    `).join('')}
                                </tbody>
                            </table>
                        </div>
                        
                        ${tenants.length === 0 ? `
                        <div class="empty-state">
                            <div class="empty-icon">🏢</div>
                            <h3>Henüz tenant bulunmuyor</h3>
                            <p>İlk tenant'ınızı oluşturmak için "Yeni Tenant" butonuna tıklayın.</p>
                            <button class="btn btn-primary" data-action="open-add-tenant-modal">
                                <span>➕</span>
                                İlk Tenant'ı Oluştur
                            </button>
                        </div>
                        ` : ''}
                    </div>
                </main>
            </div>
            
            <!-- Add Tenant Modal -->
            <div class="modal" id="addTenantModal">
                <div class="modal-content">
                    <div class="modal-header">
                        <h3>Yeni Tenant Oluştur</h3>
                        <button class="modal-close" data-action="close-add-tenant-modal">✕</button>
                    </div>
                    <form id="addTenantForm" hx-post="/admin/api/tenants" hx-target="#tenant-table-body" hx-swap="outerHTML">
                        <div class="modal-body">
                            <div class="form-group">
                                <label class="form-label" for="tenant_name">Tenant Adı *</label>
                                <input class="form-input" type="text" id="tenant_name" name="name" required placeholder="Örn: Acme Store">
                            </div>
                            <div class="form-group">
                                <label class="form-label" for="tenant_domain">Domain *</label>
                                <input class="form-input" type="text" id="tenant_domain" name="domain" required placeholder="Örn: acme" pattern="[a-z0-9]+" 
                                       title="Sadece küçük harf ve rakam kullanın">
                                <div class="form-help">Sadece küçük harf ve rakam kullanın. Örnek: acme → saas.apollo12.co/acme</div>
                            </div>
                            <div class="form-group">
                                <label class="form-label" for="tenant_db_name">Veritabanı Adı *</label>
                                <input class="form-input" type="text" id="tenant_db_name" name="db_name" required placeholder="Örn: saas_acme" 
                                       pattern="[a-zA-Z][a-zA-Z0-9_]*" title="Harf ile başlamalı, sadece harf, rakam ve alt çizgi">
                                <div class="form-help">Harf ile başlamalı, sadece harf, rakam ve alt çizgi kullanın.</div>
                            </div>
                            <div class="form-group">
                                <label class="form-label" for="tenant_status">Durum</label>
                                <select class="form-select" id="tenant_status" name="status">
                                    <option value="active">Aktif</option>
                                    <option value="inactive">Pasif</option>
                                    <option value="suspended">Askıda</option>
                                </select>
                            </div>
                        </div>
                        <div class="modal-footer">
                            <button type="button" class="btn btn-outline" data-action="close-add-tenant-modal">İptal</button>
                            <button type="submit" class="btn btn-primary">Tenant Oluştur</button>
                        </div>
                    </form>
                </div>
            </div>
            
            <script src="/js/dashboard.js"></script>
        </body>
        </html>
        `;

        res.send(tenantsPageHTML);
    } catch (error) {
        console.error('Tenant sayfası hatası:', error.message);
        res.status(500).send('Tenant sayfası yüklenirken bir hata oluştu');
    }
});

/**
 * @swagger
 * /admin/api/tenants:
 *   get:
 *     summary: Tenant listesini getir
 *     description: Tüm tenant'ları ve sayılarını getirir (Admin yetkisi gerekli)
 *     tags: [Admin - Tenants]
 *     responses:
 *       200:
 *         description: Tenant listesi başarıyla getirildi
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Tenant listesi başarıyla getirildi"
 *                 data:
 *                   type: object
 *                   properties:
 *                     tenants:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/Tenant'
 *                     total:
 *                       type: integer
 *                       example: 3
 *                 timestamp:
 *                   type: string
 *                   format: date-time
 *       500:
 *         description: Sunucu hatası
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
// Tenant yönetimi API'si - JSON endpoint
router.get('/api/tenants', async (req, res) => {
    try {
        const tenants = await Tenant.getAllTenants();
        const tenantCount = await Tenant.getCount();
        
        res.json({
            success: true,
            message: 'Tenant listesi başarıyla getirildi',
            data: {
                tenants: tenants,
                total: tenantCount
            },
                timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error('Tenant listesi hatası:', error.message);
        res.status(500).json({
            success: false,
            message: 'Tenant listesi alınamadı',
            error: error.message,
            timestamp: new Date().toISOString()
        });
    }
});

// Belirli bir tenant getir
router.get('/tenants/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const tenant = await Tenant.findById(id);
        
        if (!tenant) {
            return res.status(404).json({
                success: false,
                message: 'Tenant bulunamadı',
                timestamp: new Date().toISOString()
            });
        }

        res.json({
            success: true,
            message: 'Tenant başarıyla getirildi',
            data: tenant,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error('Tenant getirme hatası:', error.message);
        res.status(500).json({
            success: false,
            message: 'Tenant getirilemedi',
            error: error.message,
            timestamp: new Date().toISOString()
        });
    }
});

// Yeni tenant oluştur - API endpoint
router.post('/api/tenants', async (req, res) => {
    try {
        const { name, domain, db_name, status } = req.body;
        
        // Temel validasyon
        if (!name || !domain || !db_name) {
            return res.status(400).json({
                success: false,
                message: 'Name, domain ve db_name alanları zorunludur',
                timestamp: new Date().toISOString()
            });
        }

        // Veritabanı adı validasyonu (güvenlik için)
        if (!/^[a-zA-Z][a-zA-Z0-9_]*$/.test(db_name) || db_name.length > 64) {
            return res.status(400).json({
                success: false,
                message: 'Geçersiz veritabanı adı. Sadece harf, rakam ve alt çizgi kullanın.',
                timestamp: new Date().toISOString()
            });
        }

        console.log(`🏗️ Yeni tenant oluşturuluyor: ${name} (${domain} -> ${db_name})`);

        // 1. Önce tenant veritabanını oluştur
        const dbCreated = await createTenantDatabase(db_name);
        if (!dbCreated) {
            return res.status(500).json({
                success: false,
                message: 'Tenant veritabanı oluşturulamadı',
                timestamp: new Date().toISOString()
            });
        }

        // 2. Tenant kaydını ana veritabanında oluştur
        let tenant;
        try {
            tenant = await Tenant.createTenant({
                name,
                domain,
                db_name,
                status: status || 'active'
            });
        } catch (tenantError) {
            // Tenant kaydı oluşturulamazsa, oluşturulan veritabanını sil
            console.error('Tenant kaydı oluşturulamadı, veritabanı siliniyor:', tenantError.message);
            await dropTenantDatabase(db_name);
            throw tenantError;
        }

        res.status(201).json({
            success: true,
            message: dbCreated ? 'Tenant ve veritabanı başarıyla oluşturuldu' : 'Tenant başarıyla oluşturuldu',
            data: {
                tenant: tenant,
                database_created: dbCreated,
                database_name: db_name
            },
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error('Tenant oluşturma hatası:', error.message);
        res.status(400).json({
            success: false,
            message: 'Tenant oluşturulamadı',
            error: error.message,
            timestamp: new Date().toISOString()
        });
    }
});

// Tenant güncelle
router.put('/tenants/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { name, domain, db_name, status } = req.body;

        const tenant = await Tenant.findById(id);
        if (!tenant) {
            return res.status(404).json({
                success: false,
                message: 'Tenant bulunamadı',
                timestamp: new Date().toISOString()
            });
        }

        const updatedTenant = await tenant.update({
            name,
            domain,
            db_name,
            status
        });

        res.json({
            success: true,
            message: 'Tenant başarıyla güncellendi',
            data: updatedTenant,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error('Tenant güncelleme hatası:', error.message);
        res.status(400).json({
            success: false,
            message: 'Tenant güncellenemedi',
            error: error.message,
            timestamp: new Date().toISOString()
        });
    }
});

// Tenant sil
router.delete('/tenants/:id', async (req, res) => {
    try {
        const { id } = req.params;
        
        const tenant = await Tenant.findById(id);
        if (!tenant) {
            return res.status(404).json({
                success: false,
                message: 'Tenant bulunamadı',
                timestamp: new Date().toISOString()
            });
        }

        const tenantData = { ...tenant.toJSON() }; // Silmeden önce veriyi sakla
        
        console.log(`🗑️ Tenant siliniyor: ${tenant.name} (${tenant.domain} -> ${tenant.db_name})`);

        // 1. Tenant kaydını ana veritabanından sil
        await tenant.delete();

        // 2. Tenant veritabanını sil
        const dbDeleted = await dropTenantDatabase(tenant.db_name);

        res.json({
            success: true,
            message: 'Tenant ve veritabanı başarıyla silindi',
            data: {
                deleted_tenant: tenantData,
                database_deleted: dbDeleted
            },
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error('Tenant silme hatası:', error.message);
        res.status(500).json({
            success: false,
            message: 'Tenant silinemedi',
            error: error.message,
            timestamp: new Date().toISOString()
        });
    }
});

// Sistem ayarları rotası (placeholder)
router.get('/settings', (req, res) => {
    res.json({
        message: 'Sistem Ayarları',
        endpoint: '/admin/settings',
        status: 'Geliştirme aşamasında',
        timestamp: new Date().toISOString()
    });
});

// Routing modu bilgisi
router.get('/routing', (req, res) => {
    try {
        const routingInfo = getRoutingInfo();
        res.json({
            success: true,
            message: 'Routing modu bilgileri',
            data: routingInfo,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Routing bilgileri alınamadı',
            error: error.message,
            timestamp: new Date().toISOString()
        });
    }
});

// Routing modunu değiştir
router.post('/routing', (req, res) => {
    try {
        const { mode } = req.body;
        
        if (!mode || !['directory', 'subdomain'].includes(mode)) {
            return res.status(400).json({
                success: false,
                message: 'Geçersiz mod. "directory" veya "subdomain" olmalı.',
                timestamp: new Date().toISOString()
            });
        }

        setRoutingMode(mode);
        
        res.json({
            success: true,
            message: `Routing modu ${mode} olarak ayarlandı. Sunucuyu yeniden başlatın.`,
            data: {
                new_mode: mode,
                restart_required: true
            },
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Routing modu değiştirilemedi',
            error: error.message,
            timestamp: new Date().toISOString()
        });
    }
});

// Admin ürün yönetimi sayfası
router.get('/products', async (req, res) => {
    try {
        const tenants = await Tenant.getAllTenants();
        
        // Tüm tenant'lardan ürün verilerini topla
        let allProducts = [];
        let totalProducts = 0;
        let lowStockCount = 0;
        let totalValue = 0;
        
        for (const tenant of tenants) {
            try {
                const { executeTenantQuery } = require('../utils/db');
                const products = await executeTenantQuery(
                    tenant.db_name,
                    'SELECT *, ? as tenant_name, ? as tenant_domain, ? as tenant_id FROM products ORDER BY created_at DESC',
                    [tenant.name, tenant.domain, tenant.id]
                );
                
                allProducts = allProducts.concat(products);
                totalProducts += products.length;
                lowStockCount += products.filter(p => p.stock_quantity <= 5).length;
                totalValue += products.reduce((sum, p) => sum + (p.price * p.stock_quantity), 0);
            } catch (error) {
                console.warn(`Tenant ${tenant.name} ürün verileri alınamadı:`, error.message);
            }
        }
        
        res.render('admin/products', {
            tenants: tenants,
            products: allProducts,
            totalProducts: totalProducts,
            lowStockCount: lowStockCount,
            totalValue: totalValue
        });
    } catch (error) {
        console.error('Admin ürün sayfası hatası:', error.message);
        res.status(500).send('Ürün sayfası yüklenirken bir hata oluştu');
    }
});

// Admin ürün API'si
router.get('/api/products', async (req, res) => {
    try {
        const tenantFilter = req.query.tenant_id;
        const tenants = await Tenant.getAllTenants();
        
        let allProducts = [];
        const filteredTenants = tenantFilter ? tenants.filter(t => t.id == tenantFilter) : tenants;
        
        for (const tenant of filteredTenants) {
            try {
                const { executeTenantQuery } = require('../utils/db');
                const products = await executeTenantQuery(
                    tenant.db_name,
                    'SELECT *, ? as tenant_name, ? as tenant_domain, ? as tenant_id FROM products ORDER BY created_at DESC',
                    [tenant.name, tenant.domain, tenant.id]
                );
                
                allProducts = allProducts.concat(products);
            } catch (error) {
                console.warn(`Tenant ${tenant.name} ürün verileri alınamadı:`, error.message);
            }
        }
        
        // HTMX request ise tablo satırlarını döndür
        if (req.headers['hx-request']) {
            const tableRows = allProducts.map(product => `
                <tr class="table-row" style="border-bottom: 1px solid #e5e7eb; transition: all 0.3s ease;">
                    <td style="padding: 1rem; font-weight: 500;">${product.id}</td>
                    <td style="padding: 1rem;">
                        <span style="font-size: 0.875rem; background: #f3f4f6; padding: 2px 6px; border-radius: 4px;">${product.tenant_name}</span>
                    </td>
                    <td style="padding: 1rem;">
                        <strong>${product.name}</strong>
                    </td>
                    <td style="padding: 1rem; font-weight: 600;">₺${parseFloat(product.price).toLocaleString('tr-TR')}</td>
                    <td style="padding: 1rem; ${product.stock_quantity <= 5 ? 'color: #dc2626; font-weight: 600;' : 'color: #6b7280;'}">
                        ${product.stock_quantity}
                    </td>
                    <td style="padding: 1rem;">
                        <span class="status-badge ${product.status === 'active' ? 'status-active' : 'status-inactive'}" 
                              style="display: inline-block; padding: 0.25rem 0.75rem; border-radius: 9999px; font-size: 0.75rem; font-weight: 600; text-transform: uppercase;">
                            ${product.status === 'active' ? 'Aktif' : 'Pasif'}
                        </span>
                    </td>
                    <td style="padding: 1rem; color: #6b7280;">${new Date(product.created_at).toLocaleDateString('tr-TR')}</td>
                    <td style="padding: 1rem;">
                        <div style="display: flex; gap: 0.5rem;">
                            <a href="/${product.tenant_domain}/products" target="_blank" 
                               class="btn-sm btn-outline" style="padding: 0.375rem 0.75rem; border: 1px solid #d1d5db; border-radius: 6px; background: white; color: #374151; font-size: 0.75rem; text-decoration: none; cursor: pointer; transition: all 0.3s ease;">
                                👁️ Görüntüle
                            </a>
                            <button class="btn-sm btn-outline" data-action="view-product-detail" data-product-id="${product.id}" data-tenant-id="${product.tenant_id}"
                                    style="padding: 0.375rem 0.75rem; border: 1px solid #d1d5db; border-radius: 6px; background: white; color: #374151; font-size: 0.75rem; cursor: pointer; transition: all 0.3s ease;">
                                ℹ️ Detay
                            </button>
                        </div>
                    </td>
                </tr>
            `).join('');

            return res.send(`<tbody>${tableRows}</tbody>`);
        }
        
        res.json({
            success: true,
            data: {
                products: allProducts,
                total: allProducts.length
            },
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error('Admin ürün API hatası:', error.message);
        res.status(500).json({
            success: false,
            message: 'Ürün verileri alınamadı',
            error: error.message,
            timestamp: new Date().toISOString()
        });
    }
});

// Admin ürün detay API'si
router.get('/api/products/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const tenantId = req.query.tenant_id;
        
        if (!tenantId) {
            return res.status(400).json({
                success: false,
                message: 'Tenant ID gerekli',
                timestamp: new Date().toISOString()
            });
        }
        
        const tenant = await Tenant.findById(tenantId);
        if (!tenant) {
            return res.status(404).json({
                success: false,
                message: 'Tenant bulunamadı',
                timestamp: new Date().toISOString()
            });
        }
        
        const { executeTenantQuery } = require('../utils/db');
        const products = await executeTenantQuery(
            tenant.db_name,
            'SELECT * FROM products WHERE id = ?',
            [parseInt(id)]
        );
        
        if (products.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Ürün bulunamadı',
                timestamp: new Date().toISOString()
            });
        }
        
        res.json({
            success: true,
            data: {
                product: products[0],
                tenant: tenant
            },
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error('Admin ürün detay hatası:', error.message);
        res.status(500).json({
            success: false,
            message: 'Ürün detayı alınamadı',
            error: error.message,
            timestamp: new Date().toISOString()
        });
    }
});

// Admin Analytics/Reports rotalarını ekle
router.use('/analytics', adminReportsRouter);

// Admin Backup rotalarını ekle
router.use('/backup', adminBackupRouter);

// ===============================
// 📋 ADMİN LOGS YÖNETİMİ
// ===============================

// Admin Logs Sayfası - Tüm tenant'ların loglarını görüntüleme
router.get('/logs', async (req, res) => {
    try {
        const tenants = await Tenant.getAllTenants();
        
        console.log('Admin logs - tenant count:', tenants.length);
        
        res.render('admin/logs', {
            tenants: tenants.filter(t => t.status === 'active')
        });
    } catch (error) {
        console.error('Admin logs sayfası hatası:', error.message);
        console.error('Error stack:', error.stack);
        res.status(500).send('Logs sayfası yüklenirken bir hata oluştu: ' + error.message);
    }
});

// Admin Logs API - Belirli tenant'ın loglarını getir
router.get('/api/logs/:tenantId', async (req, res) => {
    try {
        const tenantId = parseInt(req.params.tenantId);
        const tenant = await Tenant.findById(tenantId);
        
        if (!tenant) {
            return res.status(404).json({
                success: false,
                error: 'TENANT_NOT_FOUND',
                message: 'Tenant bulunamadı'
            });
        }

        // Query parametrelerini al
        const {
            page = 1,
            limit = 50,
            actionType = '',
            targetType = '',
            userId = '',
            dateFrom = '',
            dateTo = '',
            search = ''
        } = req.query;

        const offset = (parseInt(page) - 1) * parseInt(limit);

        // Activity logger'ı import et
        const { getActivityLogs, getActivityLogsCount } = require('../utils/activityLogger');

        // Filtreleri hazırla
        const filters = {
            limit: parseInt(limit),
            offset: offset
        };

        if (actionType) filters.actionType = actionType;
        if (targetType) filters.targetType = targetType;
        if (userId) filters.userId = parseInt(userId);
        if (dateFrom) filters.dateFrom = dateFrom;
        if (dateTo) filters.dateTo = dateTo;

        // Logs ve toplam sayıyı al
        const [logs, totalCount] = await Promise.all([
            getActivityLogs(tenant.db_name, filters),
            getActivityLogsCount(tenant.db_name, filters)
        ]);

        // Arama filtresi varsa
        let filteredLogs = logs;
        if (search) {
            const searchLower = search.toLowerCase();
            filteredLogs = logs.filter(log => 
                (log.user_email && log.user_email.toLowerCase().includes(searchLower)) ||
                log.action_type.toLowerCase().includes(searchLower) ||
                log.target_type.toLowerCase().includes(searchLower) ||
                (log.metadata && JSON.stringify(log.metadata).toLowerCase().includes(searchLower))
            );
        }

        // Sayfalama bilgileri
        const totalPages = Math.ceil(totalCount / parseInt(limit));
        const hasNextPage = parseInt(page) < totalPages;
        const hasPrevPage = parseInt(page) > 1;

        res.json({
            success: true,
            data: {
                tenant: {
                    id: tenant.id,
                    name: tenant.name,
                    domain: tenant.domain
                },
                logs: filteredLogs,
                pagination: {
                    currentPage: parseInt(page),
                    totalPages: totalPages,
                    totalCount: totalCount,
                    hasNextPage: hasNextPage,
                    hasPrevPage: hasPrevPage,
                    limit: parseInt(limit)
                }
            },
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        console.error('Admin logs API hatası:', error.message);
        res.status(500).json({
            success: false,
            error: 'ADMIN_LOGS_API_ERROR',
            message: 'Tenant logs alınırken bir hata oluştu',
            timestamp: new Date().toISOString()
        });
    }
});

// ===============================
// 📱 MOBİL UYGULAMA YÖNETİMİ
// ===============================

// Mobil uygulama yönetim sayfası
router.get('/mobile', async (req, res) => {
    try {
        const tenants = await Tenant.getAllTenants();
        
        res.render('admin/mobile', {
            tenants: tenants.filter(t => t.status === 'active'),
            title: 'Mobil Uygulama Yönetimi - Süper Admin'
        });
    } catch (error) {
        console.error('Mobil uygulama sayfası hatası:', error.message);
        res.status(500).send('Mobil uygulama sayfası yüklenirken bir hata oluştu: ' + error.message);
    }
});

// Mobil uygulama build API
router.post('/api/mobile/build', async (req, res) => {
    try {
        // Flutter build işlemini simüle et
        // Gerçek implementasyonda burada flutter build komutları çalıştırılacak
        
        res.json({
            success: true,
            message: 'Build işlemi başlatıldı',
            data: {
                build_id: Date.now(),
                status: 'building',
                estimated_time: '5 dakika'
            },
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error('Mobil build hatası:', error.message);
        res.status(500).json({
            success: false,
            message: 'Build işlemi başlatılamadı',
            error: error.message,
            timestamp: new Date().toISOString()
        });
    }
});

// QR kod oluşturma API
router.post('/api/mobile/qr-codes', async (req, res) => {
    try {
        const tenants = await Tenant.getAllTenants();
        const qrCodes = [];
        
        for (const tenant of tenants.filter(t => t.status === 'active')) {
            qrCodes.push({
                tenant_id: tenant.id,
                tenant_name: tenant.name,
                tenant_domain: tenant.domain,
                url: `https://${tenant.domain}.saas.apollo12.co`,
                qr_generated: true
            });
        }
        
        res.json({
            success: true,
            message: `${qrCodes.length} QR kod oluşturuldu`,
            data: {
                qr_codes: qrCodes,
                total: qrCodes.length
            },
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error('QR kod oluşturma hatası:', error.message);
        res.status(500).json({
            success: false,
            message: 'QR kodları oluşturulamadı',
            error: error.message,
            timestamp: new Date().toISOString()
        });
    }
});

// Firebase upload API
router.post('/api/mobile/firebase-upload', async (req, res) => {
    try {
        // Firebase App Distribution upload simülasyonu
        // Gerçek implementasyonda Firebase CLI komutları çalıştırılacak
        
        res.json({
            success: true,
            message: 'APK Firebase\'e yüklendi',
            data: {
                distribution_id: Date.now(),
                download_url: 'https://appdistribution.firebase.dev/...',
                testers_notified: true
            },
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error('Firebase upload hatası:', error.message);
        res.status(500).json({
            success: false,
            message: 'Firebase yükleme başarısız',
            error: error.message,
            timestamp: new Date().toISOString()
        });
    }
});

// APK indirme API
router.get('/api/mobile/download-apk/:tenant', (req, res) => {
    try {
        const { tenant } = req.params;
        
        // Gerçek implementasyonda burada APK dosyası serve edilecek
        res.status(404).json({
            success: false,
            message: `${tenant} için APK henüz hazır değil`,
            note: 'Önce build işlemini tamamlayın',
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error('APK indirme hatası:', error.message);
        res.status(500).json({
            success: false,
            message: 'APK indirilemedi',
            error: error.message,
            timestamp: new Date().toISOString()
        });
    }
});

// QR kodları zip indirme API
router.get('/api/mobile/download-qr-zip', (req, res) => {
    try {
        // Gerçek implementasyonda QR kodları zip olarak serve edilecek
        res.status(404).json({
            success: false,
            message: 'QR kodları zip dosyası henüz hazır değil',
            note: 'Önce QR kodlarını oluşturun',
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error('QR zip indirme hatası:', error.message);
        res.status(500).json({
            success: false,
            message: 'QR zip indirilemedi',
            error: error.message,
            timestamp: new Date().toISOString()
        });
    }
});

// Admin Brand Yönetimi Sayfası - HTML görünümü
router.get('/brands', async (req, res) => {
    try {
        // Admin için tüm tenant'lardan brand'ları topla
        const tenants = await Tenant.getAllTenants();
        let allBrands = [];
        let brandCount = 0;
        
        for (const tenant of tenants) {
            try {
                const tenantBrands = await Brand.getAllBrands(tenant.db_name);
                // Tenant bilgisini brand'lara ekle
                const brandsWithTenant = tenantBrands.map(brand => ({
                    ...brand,
                    tenant_name: tenant.name,
                    tenant_domain: tenant.domain
                }));
                allBrands = allBrands.concat(brandsWithTenant);
                brandCount += tenantBrands.length;
            } catch (tenantError) {
                console.warn(`Tenant ${tenant.name} brand'ları alınamadı:`, tenantError.message);
            }
        }
        
        const stats = {
            total: allBrands.length,
            active: allBrands.filter(b => b.status === 'active').length,
            inactive: allBrands.filter(b => b.status === 'inactive').length
        };

        res.render('admin/brands', {
            brands: allBrands,
            brandCount: brandCount,
            stats: stats,
            title: 'Marka Yönetimi - Süper Admin'
        });
    } catch (error) {
        console.error('Marka yönetimi sayfası hatası:', error.message);
        res.status(500).send('Marka yönetimi sayfası yüklenirken bir hata oluştu: ' + error.message);
    }
});

// Marka API'si - JSON endpoint
router.get('/api/brands', async (req, res) => {
    try {
        // Admin için tüm tenant'lardan brand'ları topla
        const tenants = await Tenant.getAllTenants();
        let allBrands = [];
        let brandCount = 0;
        
        for (const tenant of tenants) {
            try {
                const tenantBrands = await Brand.getAllBrands(tenant.db_name);
                // Tenant bilgisini brand'lara ekle
                const brandsWithTenant = tenantBrands.map(brand => ({
                    ...brand,
                    tenant_name: tenant.name,
                    tenant_domain: tenant.domain
                }));
                allBrands = allBrands.concat(brandsWithTenant);
                brandCount += tenantBrands.length;
            } catch (tenantError) {
                console.warn(`Tenant ${tenant.name} brand'ları alınamadı:`, tenantError.message);
            }
        }
        
        res.json({
            success: true,
            message: 'Marka listesi başarıyla getirildi',
            data: {
                brands: allBrands,
                total: brandCount
            },
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error('Marka listesi hatası:', error.message);
        res.status(500).json({
            success: false,
            message: 'Marka listesi alınamadı',
            error: error.message,
            timestamp: new Date().toISOString()
        });
    }
});

// Belirli bir marka getir
router.get('/brands/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const brand = await Brand.findById(id);
        
        if (!brand) {
            return res.status(404).json({
                success: false,
                message: 'Marka bulunamadı',
                timestamp: new Date().toISOString()
            });
        }

        res.json({
            success: true,
            message: 'Marka başarıyla getirildi',
            data: brand,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error('Marka getirme hatası:', error.message);
        res.status(500).json({
            success: false,
            message: 'Marka getirilemedi',
            error: error.message,
            timestamp: new Date().toISOString()
        });
    }
});

// Yeni marka oluştur - API endpoint
router.post('/api/brands', logoUpload.single('logo'), async (req, res) => {
    try {
        const { name, description } = req.body;
        const logoFile = req.file;

        if (!name) {
            return res.status(400).json({
                success: false,
                message: 'Marka adı zorunludur',
                timestamp: new Date().toISOString()
            });
        }

        if (!logoFile) {
            return res.status(400).json({
                success: false,
                message: 'Marka logosu gerekli',
                timestamp: new Date().toISOString()
            });
        }

        const brand = await Brand.createBrand({
            name,
            description,
            logo_url: `/uploads/brands/${logoFile.filename}`
        });

        res.status(201).json({
            success: true,
            message: 'Marka başarıyla oluşturuldu',
            data: brand,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error('Marka oluşturma hatası:', error.message);
        res.status(400).json({
            success: false,
            message: 'Marka oluşturulamadı',
            error: error.message,
            timestamp: new Date().toISOString()
        });
    }
});

// Marka güncelle
router.put('/brands/:id', logoUpload.single('logo'), async (req, res) => {
    try {
        const { id } = req.params;
        const { name, description } = req.body;
        const logoFile = req.file;

        const brand = await Brand.findById(id);
        if (!brand) {
            return res.status(404).json({
                success: false,
                message: 'Marka bulunamadı',
                timestamp: new Date().toISOString()
            });
        }

        const updatedBrand = await brand.update({
            name,
            description,
            logo_url: logoFile ? `/uploads/brands/${logoFile.filename}` : brand.logo_url
        });

        res.json({
            success: true,
            message: 'Marka başarıyla güncellendi',
            data: updatedBrand,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error('Marka güncelleme hatası:', error.message);
        res.status(400).json({
            success: false,
            message: 'Marka güncellenemedi',
            error: error.message,
            timestamp: new Date().toISOString()
        });
    }
});

// Marka sil
router.delete('/brands/:id', async (req, res) => {
    try {
        const { id } = req.params;
        
        const brand = await Brand.findById(id);
        if (!brand) {
            return res.status(404).json({
                success: false,
                message: 'Marka bulunamadı',
                timestamp: new Date().toISOString()
            });
        }

        const brandData = { ...brand.toJSON() }; // Silmeden önce veriyi sakla
        
        console.log(`🗑️ Marka siliniyor: ${brand.name} (ID: ${brand.id})`);

        // 1. Marka kaydını ana veritabanından sil
        await brand.delete();

        // 2. Marka logosunu dosyadan sil
        if (brand.logo_url && brand.logo_url.startsWith('/uploads/brands/')) {
            const logoPath = path.join(__dirname, '../public', brand.logo_url);
            if (fs.existsSync(logoPath)) {
                fs.unlinkSync(logoPath);
                console.log(`Marka logosu silindi: ${logoPath}`);
            } else {
                console.warn(`Marka logosu bulunamadı: ${logoPath}`);
            }
        }

        res.json({
            success: true,
            message: 'Marka ve logosu başarıyla silindi',
            data: {
                deleted_brand: brandData
            },
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error('Marka silme hatası:', error.message);
        res.status(500).json({
            success: false,
            message: 'Marka silinemedi',
            error: error.message,
            timestamp: new Date().toISOString()
        });
    }
});

// Ana admin rotası - dashboard'a yönlendirme
router.get('/', (req, res) => {
    res.redirect('/admin/dashboard');
});

module.exports = router; 