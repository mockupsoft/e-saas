const express = require('express');
const router = express.Router();
const { executeTenantQuery, testTenantConnection, initializeTenantDatabase } = require('../utils/db');
const Customer = require('../models/Customer');
const Category = require('../models/Category');
const Product = require('../models/Product');
const Brand = require('../models/Brand');
const Coupon = require('../models/Coupon');
const Order = require('../models/Order');
const Affiliate = require('../models/Affiliate');
const AffiliateSale = require('../models/AffiliateSale');
const { generateNavigationMenu } = require('../utils/menuComponent');
const ProductController = require('../controllers/ProductController');
const OrderController = require('../controllers/OrderController');
const multer = require('multer');
const path = require('path');

// Staff yönetimi ve auth route'larını dahil et
const staffRoutes = require('./staff');
const authRoutes = require('./auth');
const AuthMiddleware = require('../middleware/auth');

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

// Auth session middleware'i tüm route'lara ekle
router.use(AuthMiddleware.optionalAuth());
router.use(AuthMiddleware.injectUserSession());

// Sub-route'ları ekle
router.use('/', staffRoutes);
router.use('/', authRoutes);

// ===============================
// 🔐 LOGIN SAYFASI
// ===============================

// 📄 Login Sayfası - GET /tenant/login
router.get('/login', async (req, res) => {
    try {
        const tenant = req.tenant;
        if (!tenant) {
            return res.status(400).send('Tenant bilgileri bulunamadı');
        }

        res.render('tenant/login', {
            tenantName: tenant.name,
            tenantDomain: req.tenant_domain,
            error: req.query.error || null
        });
    } catch (error) {
        console.error('Login sayfası yükleme hatası:', error.message);
        res.status(500).send('Login sayfası yüklenirken bir hata oluştu');
    }
});

// Ana tenant dashboard rotası
router.get('/dashboard', 
    AuthMiddleware.optionalAuth(),
    async (req, res) => {
    try {
        // Tenant bilgilerini middleware'den al
        const tenant = req.tenant;
        if (!tenant) {
            return res.status(400).json({
                success: false,
                error: 'TENANT_INFO_MISSING',
                message: 'Tenant bilgileri bulunamadı. Middleware çalışmadı.',
                timestamp: new Date().toISOString()
            });
        }

        // Tenant veritabanını başlat (eğer yoksa)
        await initializeTenantDatabase(tenant.db_name);
        
        // Tenant veritabanından basit istatistikler al
        let productCount = 0;
        let orderCount = 0;
        let totalRevenue = 0;

        try {
            const productCountResult = await executeTenantQuery(tenant.db_name, 'SELECT COUNT(*) as count FROM products');
            productCount = productCountResult[0]?.count || 0;

            const orderCountResult = await executeTenantQuery(tenant.db_name, 'SELECT COUNT(*) as count FROM orders');
            orderCount = orderCountResult[0]?.count || 0;

            const revenueResult = await executeTenantQuery(tenant.db_name, 'SELECT SUM(total_amount) as revenue FROM orders');
            totalRevenue = revenueResult[0]?.revenue || 0;
        } catch (dbError) {
            console.warn('Tenant veritabanı istatistikleri alınamadı:', dbError.message);
        }

        // EJS template'i render et
        res.render('tenant/dashboard', {
            tenantName: tenant.name,
            tenantDomain: req.tenant_domain,
            tenantStatus: tenant.status,
            tenantCreatedAt: tenant.created_at,
            stats: {
                productCount: productCount,
                orderCount: orderCount,
                totalRevenue: totalRevenue
            }
        });
    } catch (error) {
        console.error('Tenant dashboard hatası:', error.message);
        res.status(500).json({
            success: false,
            error: 'DASHBOARD_ERROR',
            message: 'Dashboard yüklenirken bir hata oluştu.',
            tenant_info: req.tenant ? {
                id: req.tenant.id,
                name: req.tenant.name,
                domain: req.tenant.domain
            } : null,
            timestamp: new Date().toISOString()
        });
    }
});

// ===============================
// 👥 PERSONEL YÖNETİMİ SAYFASI
// ===============================

// 📄 Staff Sayfası - GET /tenant/staff (Sadece admin)
router.get('/staff', 
    AuthMiddleware.authenticate(),
    AuthMiddleware.requireRole('admin'), 
    async (req, res) => {
    try {
        const tenant = req.tenant;
        if (!tenant) {
            return res.status(400).send('Tenant bilgileri bulunamadı');
        }

        // Staff listesini getir
        const StaffUser = require('../models/StaffUser');
        const staff = await StaffUser.getAll(tenant.db_name);

        // İstatistikleri hesapla
        const stats = {
            total: staff.length,
            active: staff.filter(s => s.status === 'active').length,
            disabled: staff.filter(s => s.status === 'disabled').length,
            admin: staff.filter(s => s.role === 'admin').length,
            manager: staff.filter(s => s.role === 'manager').length,
            viewer: staff.filter(s => s.role === 'viewer').length
        };

        res.render('tenant/staff', {
            tenantName: tenant.name,
            tenantDomain: req.tenant_domain,
            staff: staff.map(s => s.toJSON()),
            stats: stats
        });
    } catch (error) {
        console.error('Staff sayfası yükleme hatası:', error.message);
        res.status(500).send('Staff sayfası yüklenirken bir hata oluştu');
    }
});

// ===============================
// 📦 ÜRÜN YÖNETİMİ SAYFASI
// ===============================

// 📄 Products Sayfası - GET /tenant/products
router.get('/products', 
    AuthMiddleware.optionalAuth(),
    async (req, res) => {
    try {
        const tenant = req.tenant;
        if (!tenant) {
            return res.status(400).json({
                success: false,
                error: 'TENANT_INFO_MISSING',
                message: 'Tenant bilgileri bulunamadı.',
                timestamp: new Date().toISOString()
            });
        }

        // Tenant veritabanını başlat (eğer yoksa)
        await initializeTenantDatabase(tenant.db_name);
        
        // Ürün listesini getir
        const Product = require('../models/Product');
        let products = [];
        let brands = [];
        let stats = {
            total: 0,
            active: 0,
            inactive: 0,
            lowStock: 0
        };

        try {
            products = await Product.getAllProducts(tenant.db_name);
            brands = await Brand.getActiveBrands(tenant.db_name);
            
            // İstatistikleri hesapla
            stats = {
                total: products.length,
                active: products.filter(p => p.status === 'active').length,
                inactive: products.filter(p => p.status === 'inactive').length,
                lowStock: products.filter(p => p.stock_quantity <= 5).length
            };
        } catch (dbError) {
            console.warn('Ürün verileri alınamadı:', dbError.message);
        }

        res.render('tenant/products', {
            tenantName: tenant.name,
            tenantDomain: req.tenant_domain,
            tenantStatus: tenant.status,
            activePage: 'products',
            products: products,
            brands: brands,
            stats: stats
        });
    } catch (error) {
        console.error('Ürün sayfası hatası:', error.message);
        res.status(500).json({
            success: false,
            error: 'PRODUCTS_PAGE_ERROR',
            message: 'Ürün sayfası yüklenirken bir hata oluştu.',
            timestamp: new Date().toISOString()
        });
    }
});

// ===============================
// 📋 SİPARİŞ YÖNETİMİ SAYFASI
// ===============================

// 📄 Orders Sayfası - GET /tenant/orders
router.get('/orders', 
    AuthMiddleware.optionalAuth(),
    async (req, res) => {
    try {
        const tenant = req.tenant;
        if (!tenant) {
            return res.status(400).json({
                success: false,
                error: 'TENANT_INFO_MISSING',
                message: 'Tenant bilgileri bulunamadı.',
                timestamp: new Date().toISOString()
            });
        }

        // Tenant veritabanını başlat (eğer yoksa)
        await initializeTenantDatabase(tenant.db_name);
        
        // Sipariş listesini getir
        let orders = [];
        let stats = {
            total: 0,
            pending: 0,
            processing: 0,
            shipped: 0,
            delivered: 0,
            cancelled: 0,
            totalRevenue: 0
        };

        try {
            orders = await Order.getAllOrders(tenant.db_name);
            
            // İstatistikleri hesapla
            stats = {
                total: orders.length,
                pending: orders.filter(o => o.status === 'pending').length,
                processing: orders.filter(o => o.status === 'processing').length,
                shipped: orders.filter(o => o.status === 'shipped').length,
                delivered: orders.filter(o => o.status === 'delivered').length,
                cancelled: orders.filter(o => o.status === 'cancelled').length,
                totalRevenue: orders
                    .filter(o => o.status !== 'cancelled')
                    .reduce((sum, o) => sum + parseFloat(o.total_amount || 0), 0)
            };
        } catch (dbError) {
            console.warn('Sipariş verileri alınamadı:', dbError.message);
        }

        res.render('tenant/orders', {
            tenantName: tenant.name,
            tenantDomain: req.tenant_domain,
            tenantStatus: tenant.status,
            activePage: 'orders',
            orders: orders,
            stats: stats
        });
    } catch (error) {
        console.error('Sipariş sayfası hatası:', error.message);
        res.status(500).json({
            success: false,
            error: 'ORDERS_PAGE_ERROR',
            message: 'Sipariş sayfası yüklenirken bir hata oluştu.',
            timestamp: new Date().toISOString()
        });
    }
});

// ===============================
// 👥 MÜŞTERİ YÖNETİMİ SAYFASI
// ===============================

// 📄 Customers Sayfası - GET /tenant/customers
router.get('/customers', 
    AuthMiddleware.optionalAuth(),
    async (req, res) => {
    try {
        const tenant = req.tenant;
        if (!tenant) {
            return res.status(400).json({
                success: false,
                error: 'TENANT_INFO_MISSING',
                message: 'Tenant bilgileri bulunamadı.',
                timestamp: new Date().toISOString()
            });
        }

        // Tenant veritabanını başlat (eğer yoksa)
        await initializeTenantDatabase(tenant.db_name);
        
        // Müşteri listesini getir
        const Customer = require('../models/Customer');
        let customers = [];
        let stats = {
            total: 0,
            active: 0,
            inactive: 0
        };

        try {
            customers = await Customer.getAllCustomers(tenant.db_name);
            
            // İstatistikleri hesapla
            stats = {
                total: customers.length,
                active: customers.filter(c => c.status === 'active').length,
                inactive: customers.filter(c => c.status === 'inactive').length
            };
        } catch (dbError) {
            console.warn('Müşteri verileri alınamadı:', dbError.message);
        }

        res.render('tenant/customers', {
            tenantName: tenant.name,
            tenantDomain: req.tenant_domain,
            tenantStatus: tenant.status,
            activePage: 'customers',
            customers: customers,
            stats: stats
        });
    } catch (error) {
        console.error('Müşteri sayfası hatası:', error.message);
        res.status(500).json({
            success: false,
            error: 'CUSTOMERS_PAGE_ERROR',
            message: 'Müşteri sayfası yüklenirken bir hata oluştu.',
            timestamp: new Date().toISOString()
        });
    }
});

// ===============================
// 📁 KATEGORİ YÖNETİMİ SAYFASI
// ===============================

// 📄 Categories Sayfası - GET /tenant/categories
router.get('/categories', 
    AuthMiddleware.optionalAuth(),
    async (req, res) => {
    try {
        const tenant = req.tenant;
        if (!tenant) {
            return res.status(400).json({
                success: false,
                error: 'TENANT_INFO_MISSING',
                message: 'Tenant bilgileri bulunamadı.',
                timestamp: new Date().toISOString()
            });
        }

        // Tenant veritabanını başlat (eğer yoksa)
        await initializeTenantDatabase(tenant.db_name);
        
        // Kategori listesini getir
        let categories = [];
        let stats = {
            total: 0,
            active: 0,
            inactive: 0
        };

        try {
            categories = await Category.getAllCategories(tenant.db_name);
            
            // İstatistikleri hesapla
            stats = {
                total: categories.length,
                active: categories.filter(c => c.status === 'active').length,
                inactive: categories.filter(c => c.status === 'inactive').length
            };
        } catch (dbError) {
            console.warn('Kategori verileri alınamadı:', dbError.message);
        }

        res.render('tenant/categories', {
            tenantName: tenant.name,
            tenantDomain: req.tenant_domain,
            tenantStatus: tenant.status,
            activePage: 'categories',
            categories: categories,
            stats: stats
        });
    } catch (error) {
        console.error('Kategori sayfası hatası:', error.message);
        res.status(500).json({
            success: false,
            error: 'CATEGORIES_PAGE_ERROR',
            message: 'Kategori sayfası yüklenirken bir hata oluştu.',
            timestamp: new Date().toISOString()
        });
    }
});

// ===============================
// 🤝 AFFILIATE SİSTEMİ SAYFASI
// ===============================

// 📄 Affiliates Sayfası - GET /tenant/affiliates
router.get('/affiliates', 
    AuthMiddleware.optionalAuth(),
    async (req, res) => {
    try {
        const tenant = req.tenant;
        if (!tenant) {
            return res.status(400).json({
                success: false,
                error: 'TENANT_INFO_MISSING',
                message: 'Tenant bilgileri bulunamadı.',
                timestamp: new Date().toISOString()
            });
        }

        // Tenant veritabanını başlat (eğer yoksa)
        await initializeTenantDatabase(tenant.db_name);
        
        // Affiliate listesini ve müşteri listesini getir
        const Affiliate = require('../models/Affiliate');
        const Customer = require('../models/Customer');
        const AffiliateSale = require('../models/AffiliateSale');
        
        let affiliates = [];
        let customers = [];
        let stats = {
            total: 0,
            active: 0,
            inactive: 0,
            totalCommission: 0,
            pendingCommission: 0
        };

        try {
            // Affiliate listesi
            affiliates = await Affiliate.getAllAffiliates(tenant.db_name);
            
            // Müşteri listesi (form için)
            customers = await Customer.getAllCustomers(tenant.db_name);
            
            // Komisyon istatistikleri
            const commissionSummary = await AffiliateSale.getCommissionSummary(tenant.db_name);
            
            // İstatistikleri hesapla
            stats = {
                total: affiliates.length,
                active: affiliates.filter(a => a.status === 'active').length,
                inactive: affiliates.filter(a => a.status === 'inactive').length,
                totalCommission: commissionSummary.total_commission || 0,
                pendingCommission: commissionSummary.pending_commission || 0
            };
        } catch (dbError) {
            console.warn('Affiliate verileri alınamadı:', dbError.message);
        }

        res.render('tenant/affiliates', {
            tenantName: tenant.name,
            tenantDomain: req.tenant_domain,
            tenantStatus: tenant.status,
            activePage: 'affiliates',
            affiliates: affiliates,
            customers: customers,
            stats: stats
        });
    } catch (error) {
        console.error('Affiliate sayfası hatası:', error.message);
        res.status(500).json({
            success: false,
            error: 'AFFILIATES_PAGE_ERROR',
            message: 'Affiliate sayfası yüklenirken bir hata oluştu.',
            timestamp: new Date().toISOString()
        });
    }
});

// ===============================
// 🎫 KUPON YÖNETİMİ SAYFASI
// ===============================

// 📄 Coupons Sayfası - GET /tenant/coupons
router.get('/coupons', 
    AuthMiddleware.optionalAuth(),
    async (req, res) => {
    try {
        const tenant = req.tenant;
        if (!tenant) {
            return res.status(400).json({
                success: false,
                error: 'TENANT_INFO_MISSING',
                message: 'Tenant bilgileri bulunamadı.',
                timestamp: new Date().toISOString()
            });
        }

        // Tenant veritabanını başlat (eğer yoksa)
        await initializeTenantDatabase(tenant.db_name);
        
        // Kupon listesini getir
        let coupons = [];
        let stats = {
            total: 0,
            active: 0,
            inactive: 0,
            expired: 0,
            validCoupons: 0
        };

        try {
            coupons = await Coupon.getAllCoupons(tenant.db_name);
            
            // İstatistikleri hesapla
            const now = new Date();
            stats = {
                total: coupons.length,
                active: coupons.filter(c => c.status === 'active').length,
                inactive: coupons.filter(c => c.status === 'inactive').length,
                expired: coupons.filter(c => c.expires_at && new Date(c.expires_at) <= now).length,
                validCoupons: coupons.filter(c => c.status === 'active' && (!c.expires_at || new Date(c.expires_at) > now)).length
            };
        } catch (dbError) {
            console.warn('Kupon verileri alınamadı:', dbError.message);
        }

        res.render('tenant/coupons', {
            tenantName: tenant.name,
            tenantDomain: req.tenant_domain,
            tenantStatus: tenant.status,
            activePage: 'coupons',
            coupons: coupons.map(c => c.toJSON()),
            stats: stats
        });
    } catch (error) {
        console.error('Kupon sayfası hatası:', error.message);
        res.status(500).json({
            success: false,
            error: 'COUPONS_PAGE_ERROR',
            message: 'Kupon sayfası yüklenirken bir hata oluştu.',
            timestamp: new Date().toISOString()
        });
    }
});

// 🔗 Affiliate API Routes
// ===============================

// GET /tenant/api/affiliates - Affiliate listesi API
router.get('/api/affiliates', async (req, res) => {
    try {
        const tenant = req.tenant;
        if (!tenant) {
            return res.status(400).json({
                success: false,
                error: 'TENANT_REQUIRED',
                message: 'Tenant bilgileri bulunamadı.'
            });
        }

        const Affiliate = require('../models/Affiliate');
        const affiliates = await Affiliate.getAllAffiliates(tenant.db_name);

        res.json({
            success: true,
            data: {
                affiliates: affiliates,
                total: affiliates.length
            },
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error('Affiliate listesi API hatası:', error.message);
        res.status(500).json({
            success: false,
            error: 'AFFILIATES_API_ERROR',
            message: 'Affiliate listesi alınamadı.',
            timestamp: new Date().toISOString()
        });
    }
});

// GET /tenant/api/affiliates/:id - Affiliate detay API
router.get('/api/affiliates/:id', async (req, res) => {
    try {
        const tenant = req.tenant;
        const { id } = req.params;

        if (!tenant) {
            return res.status(400).json({
                success: false,
                error: 'TENANT_REQUIRED',
                message: 'Tenant bilgileri bulunamadı.'
            });
        }

        const Affiliate = require('../models/Affiliate');
        const affiliate = await Affiliate.findById(tenant.db_name, parseInt(id));

        if (!affiliate) {
            return res.status(404).json({
                success: false,
                error: 'AFFILIATE_NOT_FOUND',
                message: 'Affiliate bulunamadı.'
            });
        }

        res.json({
            success: true,
            data: { affiliate: affiliate },
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error('Affiliate detay API hatası:', error.message);
        res.status(500).json({
            success: false,
            error: 'AFFILIATE_DETAIL_ERROR',
            message: 'Affiliate detayı alınamadı.',
            timestamp: new Date().toISOString()
        });
    }
});

// POST /tenant/api/affiliates - Yeni affiliate oluştur
router.post('/api/affiliates', async (req, res) => {
    try {
        const tenant = req.tenant;
        if (!tenant) {
            return res.status(400).json({
                success: false,
                error: 'TENANT_REQUIRED',
                message: 'Tenant bilgileri bulunamadı.'
            });
        }

        const Affiliate = require('../models/Affiliate');
        const newAffiliate = await Affiliate.createAffiliate(tenant.db_name, req.body);

        res.status(201).json({
            success: true,
            data: newAffiliate,
            message: 'Affiliate başarıyla oluşturuldu.',
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error('Affiliate oluşturma API hatası:', error.message);
        res.status(500).json({
            success: false,
            error: 'AFFILIATE_CREATE_ERROR',
            message: error.message || 'Affiliate oluşturulamadı.',
            timestamp: new Date().toISOString()
        });
    }
});

// PUT /tenant/api/affiliates/:id - Affiliate güncelle
router.put('/api/affiliates/:id', async (req, res) => {
    try {
        const tenant = req.tenant;
        const { id } = req.params;

        if (!tenant) {
            return res.status(400).json({
                success: false,
                error: 'TENANT_REQUIRED',
                message: 'Tenant bilgileri bulunamadı.'
            });
        }

        const Affiliate = require('../models/Affiliate');
        const updatedAffiliate = await Affiliate.updateAffiliate(tenant.db_name, parseInt(id), req.body);

        res.json({
            success: true,
            data: updatedAffiliate,
            message: 'Affiliate başarıyla güncellendi.',
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error('Affiliate güncelleme API hatası:', error.message);
        res.status(500).json({
            success: false,
            error: 'AFFILIATE_UPDATE_ERROR',
            message: error.message || 'Affiliate güncellenemedi.',
            timestamp: new Date().toISOString()
        });
    }
});

// DELETE /tenant/api/affiliates/:id - Affiliate sil
router.delete('/api/affiliates/:id', async (req, res) => {
    try {
        const tenant = req.tenant;
        const { id } = req.params;

        if (!tenant) {
            return res.status(400).json({
                success: false,
                error: 'TENANT_REQUIRED',
                message: 'Tenant bilgileri bulunamadı.'
            });
        }

        const Affiliate = require('../models/Affiliate');
        await Affiliate.deleteAffiliate(tenant.db_name, parseInt(id));

        res.json({
            success: true,
            message: 'Affiliate başarıyla silindi.',
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error('Affiliate silme API hatası:', error.message);
        res.status(500).json({
            success: false,
            error: 'AFFILIATE_DELETE_ERROR',
            message: error.message || 'Affiliate silinemedi.',
            timestamp: new Date().toISOString()
        });
    }
});

// 🔗 Order API Routes - Using OrderController
// ===============================

// GET /tenant/api/orders - List orders with filtering, sorting, pagination
router.get('/api/orders', OrderController.getAll);

// GET /tenant/api/orders/:id - Get single order
router.get('/api/orders/:id', OrderController.getById);

// PUT /tenant/api/orders/:id/status - Update order status
router.put('/api/orders/:id/status', OrderController.updateStatus);

// PUT /tenant/api/orders/:id - Update order (full update)
router.put('/api/orders/:id', OrderController.update);

// POST /tenant/api/orders - Yeni sipariş oluştur
router.post('/api/orders', async (req, res) => {
    try {
        const tenant = req.tenant;
        if (!tenant) {
            return res.status(400).json({
                success: false,
                error: 'TENANT_REQUIRED',
                message: 'Tenant bilgileri bulunamadı.'
            });
        }

        const newOrder = await Order.createOrder(tenant.db_name, req.body);

        // HTMX request ise HTML response döndür
        if (req.headers['hx-request']) {
            // Güncellenmiş sipariş listesini getir
            const orders = await Order.getAllOrders(tenant.db_name);
            
            // Table body HTML oluştur
            let tableHTML = '';
            orders.forEach(order => {
                const statusBadgeClass = {
                    'pending': 'badge-warning',
                    'processing': 'badge-info', 
                    'shipped': 'badge-primary',
                    'delivered': 'badge-success',
                    'cancelled': 'badge-danger'
                }[order.status] || 'badge-secondary';
                
                const statusText = {
                    'pending': 'Beklemede',
                    'processing': 'İşleniyor',
                    'shipped': 'Kargoda', 
                    'delivered': 'Teslim Edildi',
                    'cancelled': 'İptal Edildi'
                }[order.status] || order.status;

                tableHTML += `
                    <tr class="table-row" style="border-bottom: 1px solid #e5e7eb; transition: all 0.3s ease;">
                        <td style="padding: 1rem; font-weight: 500;">${order.id}</td>
                        <td style="padding: 1rem;">
                            <strong>${order.customer_name}</strong>
                            <div style="color: #6b7280; font-size: 0.875rem; margin-top: 0.25rem;">
                                ${order.customer_email}
                            </div>
                        </td>
                        <td style="padding: 1rem; font-weight: 600;">₺${parseFloat(order.total_amount).toLocaleString('tr-TR')}</td>
                        <td style="padding: 1rem;">
                            <span class="badge ${statusBadgeClass}">${statusText}</span>
                        </td>
                        <td style="padding: 1rem; color: #6b7280;">${new Date(order.created_at).toLocaleDateString('tr-TR')}</td>
                        <td style="padding: 1rem;" class="actions-cell">
                            <div class="action-buttons" style="display: flex; flex-direction: row; gap: 0.5rem; align-items: center; justify-content: flex-end; flex-wrap: nowrap;">
                                <button class="btn btn-outline btn-sm action-btn" data-action="view-order-detail" data-order-id="${order.id}" title="Detayları Görüntüle" style="min-width: 36px; width: 36px; height: 36px; padding: 0; display: inline-flex; align-items: center; justify-content: center;">
                                    <span class="btn-icon" style="margin: 0; font-size: 1rem;">👁️</span>
                                </button>
                                <button class="btn btn-outline btn-sm action-btn" data-action="edit-order" data-order-id="${order.id}" title="Düzenle" style="min-width: 36px; width: 36px; height: 36px; padding: 0; display: inline-flex; align-items: center; justify-content: center;">
                                    <span class="btn-icon" style="margin: 0; font-size: 1rem;">✏️</span>
                                </button>
                                <button class="btn btn-danger btn-sm action-btn" onclick="deleteOrder(${order.id})" title="Sil" style="min-width: 36px; width: 36px; height: 36px; padding: 0; display: inline-flex; align-items: center; justify-content: center;">
                                    <span class="btn-icon" style="margin: 0; font-size: 1rem;">🗑️</span>
                                </button>
                            </div>
                        </td>
                    </tr>
                `;
            });
            
            return res.send(tableHTML);
        }

        // Normal JSON response
        res.status(201).json({
            success: true,
            data: newOrder,
            message: 'Sipariş başarıyla oluşturuldu.',
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error('Sipariş oluşturma API hatası:', error.message);
        
        if (req.headers['hx-request']) {
            return res.status(400).send(`<div class="alert alert-danger">${error.message}</div>`);
        }
        
        res.status(500).json({
            success: false,
            error: 'ORDER_CREATE_ERROR',
            message: error.message || 'Sipariş oluşturulamadı.',
            timestamp: new Date().toISOString()
        });
    }
});

// PUT /tenant/api/orders/:id - Sipariş güncelle
router.put('/api/orders/:id', async (req, res) => {
    try {
        const tenant = req.tenant;
        const { id } = req.params;

        if (!tenant) {
            return res.status(400).json({
                success: false,
                error: 'TENANT_REQUIRED',
                message: 'Tenant bilgileri bulunamadı.'
            });
        }

        const updatedOrder = await Order.updateOrder(tenant.db_name, parseInt(id), req.body);

        // HTMX request ise HTML response döndür
        if (req.headers['hx-request']) {
            // Güncellenmiş sipariş listesini getir
            const orders = await Order.getAllOrders(tenant.db_name);
            
            // Table body HTML oluştur
            let tableHTML = '';
            orders.forEach(order => {
                const statusBadgeClass = {
                    'pending': 'badge-warning',
                    'processing': 'badge-info', 
                    'shipped': 'badge-primary',
                    'delivered': 'badge-success',
                    'cancelled': 'badge-danger'
                }[order.status] || 'badge-secondary';
                
                const statusText = {
                    'pending': 'Beklemede',
                    'processing': 'İşleniyor',
                    'shipped': 'Kargoda', 
                    'delivered': 'Teslim Edildi',
                    'cancelled': 'İptal Edildi'
                }[order.status] || order.status;

                tableHTML += `
                    <tr class="table-row" style="border-bottom: 1px solid #e5e7eb; transition: all 0.3s ease;">
                        <td style="padding: 1rem; font-weight: 500;">${order.id}</td>
                        <td style="padding: 1rem;">
                            <strong>${order.customer_name}</strong>
                            <div style="color: #6b7280; font-size: 0.875rem; margin-top: 0.25rem;">
                                ${order.customer_email}
                            </div>
                        </td>
                        <td style="padding: 1rem; font-weight: 600;">₺${parseFloat(order.total_amount).toLocaleString('tr-TR')}</td>
                        <td style="padding: 1rem;">
                            <span class="badge ${statusBadgeClass}">${statusText}</span>
                        </td>
                        <td style="padding: 1rem; color: #6b7280;">${new Date(order.created_at).toLocaleDateString('tr-TR')}</td>
                        <td style="padding: 1rem;" class="actions-cell">
                            <div class="action-buttons" style="display: flex; flex-direction: row; gap: 0.5rem; align-items: center; justify-content: flex-end; flex-wrap: nowrap;">
                                <button class="btn btn-outline btn-sm action-btn" data-action="view-order-detail" data-order-id="${order.id}" title="Detayları Görüntüle" style="min-width: 36px; width: 36px; height: 36px; padding: 0; display: inline-flex; align-items: center; justify-content: center;">
                                    <span class="btn-icon" style="margin: 0; font-size: 1rem;">👁️</span>
                                </button>
                                <button class="btn btn-outline btn-sm action-btn" data-action="edit-order" data-order-id="${order.id}" title="Düzenle" style="min-width: 36px; width: 36px; height: 36px; padding: 0; display: inline-flex; align-items: center; justify-content: center;">
                                    <span class="btn-icon" style="margin: 0; font-size: 1rem;">✏️</span>
                                </button>
                                <button class="btn btn-danger btn-sm action-btn" onclick="deleteOrder(${order.id})" title="Sil" style="min-width: 36px; width: 36px; height: 36px; padding: 0; display: inline-flex; align-items: center; justify-content: center;">
                                    <span class="btn-icon" style="margin: 0; font-size: 1rem;">🗑️</span>
                                </button>
                            </div>
                        </td>
                    </tr>
                `;
            });
            
            return res.send(tableHTML);
        }

        res.json({
            success: true,
            data: updatedOrder,
            message: 'Sipariş başarıyla güncellendi.',
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error('Sipariş güncelleme API hatası:', error.message);
        
        if (req.headers['hx-request']) {
            return res.status(400).send(`<div class="alert alert-danger">${error.message}</div>`);
        }
        
        res.status(500).json({
            success: false,
            error: 'ORDER_UPDATE_ERROR',
            message: error.message || 'Sipariş güncellenemedi.',
            timestamp: new Date().toISOString()
        });
    }
});

// DELETE /tenant/api/orders/:id - Sipariş sil (durumu cancelled yap)
router.delete('/api/orders/:id', async (req, res) => {
    try {
        const tenant = req.tenant;
        const { id } = req.params;

        if (!tenant) {
            return res.status(400).json({
                success: false,
                error: 'TENANT_REQUIRED',
                message: 'Tenant bilgileri bulunamadı.'
            });
        }

        // Siparişi iptal et (soft delete) - updateOrder yerine direkt SQL kullan
        await executeTenantQuery(tenant.db_name, 'UPDATE orders SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?', ['cancelled', parseInt(id)]);

        res.json({
            success: true,
            message: 'Sipariş başarıyla iptal edildi.',
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error('Sipariş iptal etme API hatası:', error.message);
        res.status(500).json({
            success: false,
            error: 'ORDER_CANCEL_ERROR',
            message: error.message || 'Sipariş iptal edilemedi.',
            timestamp: new Date().toISOString()
        });
    }
});

// 🔗 Customer API Routes
// ===============================

// GET /tenant/api/customers - Müşteri listesi API
router.get('/api/customers', async (req, res) => {
    try {
        const tenant = req.tenant;
        if (!tenant) {
            return res.status(400).json({
                success: false,
                error: 'TENANT_REQUIRED',
                message: 'Tenant bilgileri bulunamadı.'
            });
        }

        const Customer = require('../models/Customer');
        const customers = await Customer.getAllCustomers(tenant.db_name);

        res.json({
            success: true,
            data: {
                customers: customers,
                total: customers.length
            },
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error('Müşteri listesi API hatası:', error.message);
        res.status(500).json({
            success: false,
            error: 'CUSTOMERS_API_ERROR',
            message: 'Müşteri listesi alınamadı.',
            timestamp: new Date().toISOString()
        });
    }
});

// GET /tenant/api/customers/:id - Müşteri detay API
router.get('/api/customers/:id', async (req, res) => {
    try {
        const tenant = req.tenant;
        const { id } = req.params;

        if (!tenant) {
            return res.status(400).json({
                success: false,
                error: 'TENANT_REQUIRED',
                message: 'Tenant bilgileri bulunamadı.'
            });
        }

        const Customer = require('../models/Customer');
        const customer = await Customer.findById(tenant.db_name, parseInt(id));

        if (!customer) {
            return res.status(404).json({
                success: false,
                error: 'CUSTOMER_NOT_FOUND',
                message: 'Müşteri bulunamadı.'
            });
        }

        res.json({
            success: true,
            data: { customer: customer },
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error('Müşteri detay API hatası:', error.message);
        res.status(500).json({
            success: false,
            error: 'CUSTOMER_DETAIL_ERROR',
            message: 'Müşteri detayı alınamadı.',
            timestamp: new Date().toISOString()
        });
    }
});

// POST /tenant/api/customers - Yeni müşteri oluştur
router.post('/api/customers', async (req, res) => {
    try {
        const tenant = req.tenant;
        if (!tenant) {
            return res.status(400).json({
                success: false,
                error: 'TENANT_REQUIRED',
                message: 'Tenant bilgileri bulunamadı.'
            });
        }

        const Customer = require('../models/Customer');
        const newCustomer = await Customer.createCustomer(tenant.db_name, req.body);

        // HTMX request ise HTML response döndür
        if (req.headers['hx-request']) {
            // Güncellenmiş müşteri listesini getir
            const customers = await Customer.getAllCustomers(tenant.db_name);
            
            // Table body HTML oluştur
            let tableHTML = '';
            customers.forEach(customer => {
                tableHTML += `
                    <tr class="table-row">
                        <td class="font-medium">#${customer.id}</td>
                        <td>
                            <div class="customer-info">
                                <strong class="customer-name">${customer.name}</strong>
                                <div class="customer-email">${customer.email}</div>
                            </div>
                        </td>
                        <td>${customer.phone || '-'}</td>
                        <td class="hidden-mobile">${customer.city || '-'}</td>
                        <td>
                            <span class="badge ${customer.status === 'active' ? 'badge-success' : 'badge-secondary'}">
                                ${customer.status === 'active' ? 'Aktif' : 'Pasif'}
                            </span>
                        </td>
                        <td class="hidden-mobile date-cell">
                            ${new Date(customer.created_at).toLocaleDateString('tr-TR')}
                        </td>
                        <td class="actions-cell">
                            <div class="action-buttons">
                                <button class="btn btn-outline btn-sm action-btn" data-action="edit-customer" data-customer-id="${customer.id}" title="Düzenle">
                                    <span class="btn-icon">✏️</span>
                                </button>
                                <button class="btn btn-danger btn-sm action-btn" onclick="deleteCustomer(${customer.id})" title="Sil">
                                    <span class="btn-icon">🗑️</span>
                                </button>
                            </div>
                        </td>
                    </tr>
                `;
            });
            
            return res.send(tableHTML);
        }

        res.status(201).json({
            success: true,
            data: newCustomer,
            message: 'Müşteri başarıyla oluşturuldu.',
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error('Müşteri oluşturma API hatası:', error.message);
        
        if (req.headers['hx-request']) {
            return res.status(400).send(`<div class="alert alert-danger">${error.message}</div>`);
        }
        
        res.status(500).json({
            success: false,
            error: 'CUSTOMER_CREATE_ERROR',
            message: error.message || 'Müşteri oluşturulamadı.',
            timestamp: new Date().toISOString()
        });
    }
});

// PUT /tenant/api/customers/:id - Müşteri güncelle
router.put('/api/customers/:id', async (req, res) => {
    try {
        const tenant = req.tenant;
        const { id } = req.params;

        if (!tenant) {
            return res.status(400).json({
                success: false,
                error: 'TENANT_REQUIRED',
                message: 'Tenant bilgileri bulunamadı.'
            });
        }

        const Customer = require('../models/Customer');
        const updatedCustomer = await Customer.updateCustomer(tenant.db_name, parseInt(id), req.body);

        // HTMX request ise HTML response döndür
        if (req.headers['hx-request']) {
            // Güncellenmiş müşteri listesini getir
            const customers = await Customer.getAllCustomers(tenant.db_name);
            
            // Table body HTML oluştur
            let tableHTML = '';
            customers.forEach(customer => {
                tableHTML += `
                    <tr class="table-row">
                        <td class="font-medium">#${customer.id}</td>
                        <td>
                            <div class="customer-info">
                                <strong class="customer-name">${customer.name}</strong>
                                <div class="customer-email">${customer.email}</div>
                            </div>
                        </td>
                        <td>${customer.phone || '-'}</td>
                        <td class="hidden-mobile">${customer.city || '-'}</td>
                        <td>
                            <span class="badge ${customer.status === 'active' ? 'badge-success' : 'badge-secondary'}">
                                ${customer.status === 'active' ? 'Aktif' : 'Pasif'}
                            </span>
                        </td>
                        <td class="hidden-mobile date-cell">
                            ${new Date(customer.created_at).toLocaleDateString('tr-TR')}
                        </td>
                        <td class="actions-cell">
                            <div class="action-buttons">
                                <button class="btn btn-outline btn-sm action-btn" data-action="edit-customer" data-customer-id="${customer.id}" title="Düzenle">
                                    <span class="btn-icon">✏️</span>
                                </button>
                                <button class="btn btn-danger btn-sm action-btn" onclick="deleteCustomer(${customer.id})" title="Sil">
                                    <span class="btn-icon">🗑️</span>
                                </button>
                            </div>
                        </td>
                    </tr>
                `;
            });
            
            return res.send(tableHTML);
        }

        res.json({
            success: true,
            data: updatedCustomer,
            message: 'Müşteri başarıyla güncellendi.',
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error('Müşteri güncelleme API hatası:', error.message);
        
        if (req.headers['hx-request']) {
            return res.status(400).send(`<div class="alert alert-danger">${error.message}</div>`);
        }
        
        res.status(500).json({
            success: false,
            error: 'CUSTOMER_UPDATE_ERROR',
            message: error.message || 'Müşteri güncellenemedi.',
            timestamp: new Date().toISOString()
        });
    }
});

// DELETE /tenant/api/customers/:id - Müşteri sil (durumu inactive yap)
router.delete('/api/customers/:id', async (req, res) => {
    try {
        const tenant = req.tenant;
        const { id } = req.params;

        if (!tenant) {
            return res.status(400).json({
                success: false,
                error: 'TENANT_REQUIRED',
                message: 'Tenant bilgileri bulunamadı.'
            });
        }

        // Müşteriyi pasif yap (soft delete) - direkt SQL kullan
        await executeTenantQuery(tenant.db_name, 'UPDATE customers SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?', ['inactive', parseInt(id)]);

        res.json({
            success: true,
            message: 'Müşteri başarıyla pasif hale getirildi.',
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error('Müşteri pasifleştirme API hatası:', error.message);
        res.status(500).json({
            success: false,
            error: 'CUSTOMER_DEACTIVATE_ERROR',
            message: error.message || 'Müşteri pasifleştirilemedi.',
            timestamp: new Date().toISOString()
        });
    }
});

// 🔗 Product API Routes - Using ProductController
// ===============================

// GET /tenant/api/products - List products with filtering, sorting, pagination
router.get('/api/products', ProductController.getAll);

// GET /tenant/api/products/:id - Get single product
router.get('/api/products/:id', ProductController.getById);

// POST /tenant/api/products - Create new product
router.post('/api/products', ProductController.create);

// PUT /tenant/api/products/:id - Update product
router.put('/api/products/:id', ProductController.update);

// DELETE /tenant/api/products/:id - Soft delete product
router.delete('/api/products/:id', ProductController.delete);

// 🔗 Category API Routes
// ===============================

/**
 * @swagger
 * /{tenant}/api/categories:
 *   get:
 *     summary: Kategori listesini getir
 *     description: Tenant'a ait tüm kategorileri getirir
 *     tags: [Categories]
 *     parameters:
 *       - in: path
 *         name: tenant
 *         required: true
 *         schema:
 *           type: string
 *         description: Tenant domain adı
 *         example: test1
 *     responses:
 *       200:
 *         description: Kategori listesi başarıyla getirildi
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     categories:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/Category'
 *                     total:
 *                       type: integer
 *                       example: 5
 *                 timestamp:
 *                   type: string
 *                   format: date-time
 *       400:
 *         description: Tenant bilgileri bulunamadı
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       500:
 *         description: Sunucu hatası
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
// GET /tenant/api/categories - Kategori listesi API
router.get('/api/categories', async (req, res) => {
    try {
        const tenant = req.tenant;
        if (!tenant) {
            return res.status(400).json({
                success: false,
                error: 'TENANT_REQUIRED',
                message: 'Tenant bilgileri bulunamadı.'
            });
        }

        const categories = await Category.getAllCategories(tenant.db_name);

        res.json({
            success: true,
            data: {
                categories: categories,
                total: categories.length
            },
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error('Kategori listesi API hatası:', error.message);
        res.status(500).json({
            success: false,
            error: 'CATEGORIES_API_ERROR',
            message: 'Kategori listesi alınamadı.',
            timestamp: new Date().toISOString()
        });
    }
});

// GET /tenant/api/categories/:id - Kategori detay API
router.get('/api/categories/:id', async (req, res) => {
    try {
        const tenant = req.tenant;
        const { id } = req.params;

        if (!tenant) {
            return res.status(400).json({
                success: false,
                error: 'TENANT_REQUIRED',
                message: 'Tenant bilgileri bulunamadı.'
            });
        }

        const category = await Category.findById(tenant.db_name, parseInt(id));

        if (!category) {
            return res.status(404).json({
                success: false,
                error: 'CATEGORY_NOT_FOUND',
                message: 'Kategori bulunamadı.'
            });
        }

        res.json({
            success: true,
            data: { category: category },
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error('Kategori detay API hatası:', error.message);
        res.status(500).json({
            success: false,
            error: 'CATEGORY_DETAIL_ERROR',
            message: 'Kategori detayı alınamadı.',
            timestamp: new Date().toISOString()
        });
    }
});

/**
 * @swagger
 * /{tenant}/api/categories:
 *   post:
 *     summary: Yeni kategori oluştur
 *     description: Tenant için yeni bir kategori oluşturur
 *     tags: [Categories]
 *     parameters:
 *       - in: path
 *         name: tenant
 *         required: true
 *         schema:
 *           type: string
 *         description: Tenant domain adı
 *         example: test1
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CategoryInput'
 *     responses:
 *       201:
 *         description: Kategori başarıyla oluşturuldu
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/Category'
 *                 message:
 *                   type: string
 *                   example: "Kategori başarıyla oluşturuldu."
 *                 timestamp:
 *                   type: string
 *                   format: date-time
 *       400:
 *         description: Geçersiz giriş verileri
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       409:
 *         description: Kategori zaten mevcut
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       500:
 *         description: Sunucu hatası
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
// POST /tenant/api/categories - Yeni kategori oluştur
router.post('/api/categories', async (req, res) => {
    try {
        const tenant = req.tenant;
        if (!tenant) {
            return res.status(400).json({
                success: false,
                error: 'TENANT_REQUIRED',
                message: 'Tenant bilgileri bulunamadı.'
            });
        }

        const newCategory = await Category.createCategory(tenant.db_name, req.body);

        // HTMX request ise HTML response döndür
        if (req.headers['hx-request']) {
            // Güncellenmiş kategori listesini getir
            const categories = await Category.getAllCategories(tenant.db_name);
            
            // Table body HTML oluştur
            let tableHTML = '';
            categories.forEach(category => {
                const statusBadgeClass = category.status === 'active' ? 'badge-success' : 'badge-secondary';
                const statusText = category.status === 'active' ? 'Aktif' : 'Pasif';
                
                tableHTML += `
                    <tr>
                        <td>${category.id}</td>
                        <td>${category.name}</td>
                        <td>${category.description || '-'}</td>
                        <td>
                            <span class="badge ${statusBadgeClass}">${statusText}</span>
                        </td>
                        <td>${new Date(category.created_at).toLocaleDateString('tr-TR')}</td>
                        <td>
                            <div class="table-actions">
                                <button class="btn btn-outline-primary btn-sm" data-action="edit-category" data-id="${category.id}">
                                    ✏️ Düzenle
                                </button>
                                <button class="btn btn-outline-danger btn-sm" data-action="delete-category" data-id="${category.id}">
                                    🗑️ Sil
                                </button>
                            </div>
                        </td>
                    </tr>
                `;
            });
            
            res.send(tableHTML);
        } else {
            res.status(201).json({
                success: true,
                data: newCategory,
                message: 'Kategori başarıyla oluşturuldu.',
                timestamp: new Date().toISOString()
            });
        }
    } catch (error) {
        console.error('Kategori oluşturma API hatası:', error.message);
        res.status(500).json({
            success: false,
            error: 'CATEGORY_CREATE_ERROR',
            message: error.message || 'Kategori oluşturulamadı.',
            timestamp: new Date().toISOString()
        });
    }
});

// PUT /tenant/api/categories/:id - Kategori güncelle
router.put('/api/categories/:id', async (req, res) => {
    try {
        const tenant = req.tenant;
        const { id } = req.params;

        if (!tenant) {
            return res.status(400).json({
                success: false,
                error: 'TENANT_REQUIRED',
                message: 'Tenant bilgileri bulunamadı.'
            });
        }

        const updatedCategory = await Category.updateCategory(tenant.db_name, parseInt(id), req.body);

        // HTMX request ise HTML response döndür
        if (req.headers['hx-request']) {
            // Güncellenmiş kategori listesini getir
            const categories = await Category.getAllCategories(tenant.db_name);
            
            // Table body HTML oluştur
            let tableHTML = '';
            categories.forEach(category => {
                const statusBadgeClass = category.status === 'active' ? 'badge-success' : 'badge-secondary';
                const statusText = category.status === 'active' ? 'Aktif' : 'Pasif';
                
                tableHTML += `
                    <tr>
                        <td>${category.id}</td>
                        <td>${category.name}</td>
                        <td>${category.description || '-'}</td>
                        <td>
                            <span class="badge ${statusBadgeClass}">${statusText}</span>
                        </td>
                        <td>${new Date(category.created_at).toLocaleDateString('tr-TR')}</td>
                        <td>
                            <div class="table-actions">
                                <button class="btn btn-outline-primary btn-sm" data-action="edit-category" data-id="${category.id}">
                                    ✏️ Düzenle
                                </button>
                                <button class="btn btn-outline-danger btn-sm" data-action="delete-category" data-id="${category.id}">
                                    🗑️ Sil
                                </button>
                            </div>
                        </td>
                    </tr>
                `;
            });
            
            res.send(tableHTML);
        } else {
            res.json({
                success: true,
                data: updatedCategory,
                message: 'Kategori başarıyla güncellendi.',
                timestamp: new Date().toISOString()
            });
        }
    } catch (error) {
        console.error('Kategori güncelleme API hatası:', error.message);
        res.status(500).json({
            success: false,
            error: 'CATEGORY_UPDATE_ERROR',
            message: error.message || 'Kategori güncellenemedi.',
            timestamp: new Date().toISOString()
        });
    }
});

// DELETE /tenant/api/categories/:id - Kategori sil (durumu inactive yap)
router.delete('/api/categories/:id', async (req, res) => {
    try {
        const tenant = req.tenant;
        const { id } = req.params;

        if (!tenant) {
            return res.status(400).json({
                success: false,
                error: 'TENANT_REQUIRED',
                message: 'Tenant bilgileri bulunamadı.'
            });
        }

        // Kategoriyi pasif yap (soft delete)
        await Category.deleteCategory(tenant.db_name, parseInt(id));

        res.json({
            success: true,
            message: 'Kategori başarıyla pasif hale getirildi.',
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error('Kategori pasifleştirme API hatası:', error.message);
        res.status(500).json({
            success: false,
            error: 'CATEGORY_DELETE_ERROR',
            message: error.message || 'Kategori pasifleştirilemedi.',
            timestamp: new Date().toISOString()
        });
    }
});

// ===============================
// 🏷️ MARKA YÖNETİMİ SAYFASI
// ===============================

// 📄 Brands Sayfası - GET /tenant/brands
router.get('/brands', 
    AuthMiddleware.optionalAuth(),
    async (req, res) => {
    try {
        const tenant = req.tenant;
        if (!tenant) {
            return res.status(400).json({
                success: false,
                error: 'TENANT_INFO_MISSING',
                message: 'Tenant bilgileri bulunamadı.',
                timestamp: new Date().toISOString()
            });
        }

        // Tenant veritabanını başlat (eğer yoksa)
        await initializeTenantDatabase(tenant.db_name);
        
        // Marka listesini getir
        let brands = [];
        let stats = {
            total: 0,
            active: 0,
            inactive: 0
        };

        try {
            brands = await Brand.getAllBrands(tenant.db_name);
            
            // İstatistikleri hesapla
            stats = {
                total: brands.length,
                active: brands.filter(b => b.status === 'active').length,
                inactive: brands.filter(b => b.status === 'inactive').length
            };
        } catch (dbError) {
            console.warn('Marka verileri alınamadı:', dbError.message);
        }

        res.render('tenant/brands', {
            tenantName: tenant.name,
            tenantDomain: req.tenant_domain,
            tenantStatus: tenant.status,
            activePage: 'brands',
            brands: brands,
            stats: stats
        });
    } catch (error) {
        console.error('Marka sayfası hatası:', error.message);
        res.status(500).json({
            success: false,
            error: 'BRANDS_PAGE_ERROR',
            message: 'Marka sayfası yüklenirken bir hata oluştu.',
            timestamp: new Date().toISOString()
        });
    }
});

// ===============================
// 🏷️ MARKA YÖNETİMİ API'LERİ
// ===============================

// GET /tenant/api/brands - Marka listesi API
router.get('/api/brands', async (req, res) => {
    try {
        const tenant = req.tenant;
        if (!tenant) {
            return res.status(400).json({
                success: false,
                error: 'TENANT_REQUIRED',
                message: 'Tenant bilgileri bulunamadı.'
            });
        }

        const brands = await Brand.getAllBrands(tenant.db_name);

        res.json({
            success: true,
            data: {
                brands: brands,
                total: brands.length
            },
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error('Marka listesi API hatası:', error.message);
        res.status(500).json({
            success: false,
            error: 'BRANDS_API_ERROR',
            message: 'Marka listesi alınamadı.',
            timestamp: new Date().toISOString()
        });
    }
});

// GET /tenant/api/brands/:id - Marka detay API
router.get('/api/brands/:id', async (req, res) => {
    try {
        const tenant = req.tenant;
        const { id } = req.params;

        if (!tenant) {
            return res.status(400).json({
                success: false,
                error: 'TENANT_REQUIRED',
                message: 'Tenant bilgileri bulunamadı.'
            });
        }

        const brand = await Brand.findById(tenant.db_name, parseInt(id));

        if (!brand) {
            return res.status(404).json({
                success: false,
                error: 'BRAND_NOT_FOUND',
                message: 'Marka bulunamadı.',
                timestamp: new Date().toISOString()
            });
        }

        res.json({
            success: true,
            data: brand,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error('Marka detay API hatası:', error.message);
        res.status(500).json({
            success: false,
            error: 'BRAND_DETAIL_ERROR',
            message: 'Marka detayları alınamadı.',
            timestamp: new Date().toISOString()
        });
    }
});

// POST /tenant/api/brands - Yeni marka oluştur
router.post('/api/brands', logoUpload.single('logo'), async (req, res) => {
    try {
        const tenant = req.tenant;
        const { name, description, status } = req.body;
        const logoFile = req.file;

        if (!tenant) {
            return res.status(400).json({
                success: false,
                error: 'TENANT_REQUIRED',
                message: 'Tenant bilgileri bulunamadı.'
            });
        }

        if (!name || name.trim() === '') {
            return res.status(400).json({
                success: false,
                error: 'BRAND_NAME_REQUIRED',
                message: 'Marka adı zorunludur.'
            });
        }

        const newBrand = await Brand.createBrand(tenant.db_name, {
            name: name.trim(),
            description: description || '',
            logo: logoFile ? `/uploads/brands/${logoFile.filename}` : null,
            status: status || 'active'
        });

        // HTMX isteği mi kontrol et
        if (req.headers['hx-request']) {
            // Güncellenmiş marka listesi tablosunu döndür
            const brands = await Brand.getAllBrands(tenant.db_name);
            
            // Table body HTML oluştur
            let tableHTML = '';
            brands.forEach(brand => {
                const statusBadgeClass = brand.status === 'active' ? 'badge-success' : 'badge-secondary';
                const statusText = brand.status === 'active' ? 'Aktif' : 'Pasif';
                const logoImg = brand.logo ? `<img src="${brand.logo}" alt="${brand.name}" style="width: 30px; height: 30px; object-fit: cover; border-radius: 4px;">` : '📦';
                
                tableHTML += `
                    <tr>
                        <td>${brand.id}</td>
                        <td>
                            <div style="display: flex; align-items: center; gap: 0.5rem;">
                                ${logoImg}
                                ${brand.name}
                            </div>
                        </td>
                        <td>${brand.description || '-'}</td>
                        <td>
                            <span class="badge ${statusBadgeClass}">${statusText}</span>
                        </td>
                        <td>${new Date(brand.created_at).toLocaleDateString('tr-TR')}</td>
                        <td>
                            <div class="table-actions">
                                <button class="btn btn-outline-primary btn-sm" data-action="edit-brand" data-id="${brand.id}">
                                    ✏️ Düzenle
                                </button>
                                <button class="btn btn-outline-danger btn-sm" data-action="delete-brand" data-id="${brand.id}">
                                    🗑️ Sil
                                </button>
                            </div>
                        </td>
                    </tr>
                `;
            });
            
            res.send(tableHTML);
        } else {
            res.status(201).json({
                success: true,
                data: newBrand,
                message: 'Marka başarıyla oluşturuldu.',
                timestamp: new Date().toISOString()
            });
        }
    } catch (error) {
        console.error('Marka oluşturma API hatası:', error.message);
        res.status(500).json({
            success: false,
            error: 'BRAND_CREATE_ERROR',
            message: error.message || 'Marka oluşturulamadı.',
            timestamp: new Date().toISOString()
        });
    }
});

// PUT /tenant/api/brands/:id - Marka güncelle
router.put('/api/brands/:id', logoUpload.single('logo'), async (req, res) => {
    try {
        const tenant = req.tenant;
        const { id } = req.params;
        const { name, description, status } = req.body;
        const logoFile = req.file;

        if (!tenant) {
            return res.status(400).json({
                success: false,
                error: 'TENANT_REQUIRED',
                message: 'Tenant bilgileri bulunamadı.'
            });
        }

        const existingBrand = await Brand.findById(tenant.db_name, parseInt(id));
        if (!existingBrand) {
            return res.status(404).json({
                success: false,
                error: 'BRAND_NOT_FOUND',
                message: 'Güncellenecek marka bulunamadı.'
            });
        }

        const updatedBrand = await Brand.updateBrand(tenant.db_name, parseInt(id), {
            name: name || existingBrand.name,
            description: description !== undefined ? description : existingBrand.description,
            logo: logoFile ? `/uploads/brands/${logoFile.filename}` : existingBrand.logo,
            status: status || existingBrand.status
        });

        // HTMX isteği mi kontrol et
        if (req.headers['hx-request']) {
            // Güncellenmiş marka listesi tablosunu döndür
            const brands = await Brand.getAllBrands(tenant.db_name);
            
            // Table body HTML oluştur
            let tableHTML = '';
            brands.forEach(brand => {
                const statusBadgeClass = brand.status === 'active' ? 'badge-success' : 'badge-secondary';
                const statusText = brand.status === 'active' ? 'Aktif' : 'Pasif';
                const logoImg = brand.logo ? `<img src="${brand.logo}" alt="${brand.name}" style="width: 30px; height: 30px; object-fit: cover; border-radius: 4px;">` : '📦';
                
                tableHTML += `
                    <tr>
                        <td>${brand.id}</td>
                        <td>
                            <div style="display: flex; align-items: center; gap: 0.5rem;">
                                ${logoImg}
                                ${brand.name}
                            </div>
                        </td>
                        <td>${brand.description || '-'}</td>
                        <td>
                            <span class="badge ${statusBadgeClass}">${statusText}</span>
                        </td>
                        <td>${new Date(brand.created_at).toLocaleDateString('tr-TR')}</td>
                        <td>
                            <div class="table-actions">
                                <button class="btn btn-outline-primary btn-sm" data-action="edit-brand" data-id="${brand.id}">
                                    ✏️ Düzenle
                                </button>
                                <button class="btn btn-outline-danger btn-sm" data-action="delete-brand" data-id="${brand.id}">
                                    🗑️ Sil
                                </button>
                            </div>
                        </td>
                    </tr>
                `;
            });
            
            res.send(tableHTML);
        } else {
            res.json({
                success: true,
                data: updatedBrand,
                message: 'Marka başarıyla güncellendi.',
                timestamp: new Date().toISOString()
            });
        }
    } catch (error) {
        console.error('Marka güncelleme API hatası:', error.message);
        res.status(500).json({
            success: false,
            error: 'BRAND_UPDATE_ERROR',
            message: error.message || 'Marka güncellenemedi.',
            timestamp: new Date().toISOString()
        });
    }
});

// DELETE /tenant/api/brands/:id - Marka sil (durumu inactive yap)
router.delete('/api/brands/:id', async (req, res) => {
    try {
        const tenant = req.tenant;
        const { id } = req.params;

        if (!tenant) {
            return res.status(400).json({
                success: false,
                error: 'TENANT_REQUIRED',
                message: 'Tenant bilgileri bulunamadı.'
            });
        }

        // Markayı soft delete yap
        await Brand.deleteBrand(tenant.db_name, parseInt(id));

        res.json({
            success: true,
            message: 'Marka başarıyla pasif hale getirildi.',
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error('Marka pasifleştirme API hatası:', error.message);
        res.status(500).json({
            success: false,
            error: 'BRAND_DELETE_ERROR',
            message: error.message || 'Marka pasifleştirilemedi.',
            timestamp: new Date().toISOString()
        });
    }
});

// ===============================
// 🎫 KUPON YÖNETİMİ API'LERİ
// ===============================

/**
 * @swagger
 * /{tenant}/api/coupons:
 *   get:
 *     summary: Kupon listesini getir
 *     description: Tenant'a ait tüm kuponları getirir
 *     tags: [Coupons]
 *     parameters:
 *       - in: path
 *         name: tenant
 *         required: true
 *         schema:
 *           type: string
 *         description: Tenant domain adı
 *         example: test1
 *     responses:
 *       200:
 *         description: Kupon listesi başarıyla getirildi
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     coupons:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/Coupon'
 *                     total:
 *                       type: integer
 *                       example: 5
 *                 timestamp:
 *                   type: string
 *                   format: date-time
 *       400:
 *         description: Tenant bilgileri bulunamadı
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       500:
 *         description: Sunucu hatası
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
// GET /tenant/api/coupons - Kupon listesi API
router.get('/api/coupons', async (req, res) => {
    try {
        const tenant = req.tenant;
        if (!tenant) {
            return res.status(400).json({
                success: false,
                error: 'TENANT_REQUIRED',
                message: 'Tenant bilgileri bulunamadı.'
            });
        }

        const coupons = await Coupon.getAllCoupons(tenant.db_name);

        res.json({
            success: true,
            data: {
                coupons: coupons.map(c => c.toJSON()),
                total: coupons.length
            },
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error('Kupon listesi API hatası:', error.message);
        res.status(500).json({
            success: false,
            error: 'COUPONS_API_ERROR',
            message: 'Kupon listesi alınamadı.',
            timestamp: new Date().toISOString()
        });
    }
});

/**
 * @swagger
 * /{tenant}/api/coupons:
 *   post:
 *     summary: Yeni kupon oluştur
 *     description: Yeni bir kupon oluşturur
 *     tags: [Coupons]
 *     parameters:
 *       - in: path
 *         name: tenant
 *         required: true
 *         schema:
 *           type: string
 *         description: Tenant domain adı
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - code
 *               - type
 *               - amount
 *             properties:
 *               code:
 *                 type: string
 *                 description: Kupon kodu
 *                 example: "INDIRIM20"
 *               type:
 *                 type: string
 *                 enum: [percentage, fixed]
 *                 description: Kupon tipi
 *                 example: "percentage"
 *               amount:
 *                 type: number
 *                 description: İndirim miktarı
 *                 example: 20
 *               min_cart_total:
 *                 type: number
 *                 description: Minimum sepet tutarı
 *                 example: 100
 *               expires_at:
 *                 type: string
 *                 format: date-time
 *                 description: Son kullanma tarihi
 *               status:
 *                 type: string
 *                 enum: [active, inactive]
 *                 description: Kupon durumu
 *                 example: "active"
 *     responses:
 *       201:
 *         description: Kupon başarıyla oluşturuldu
 *       400:
 *         description: Geçersiz veri
 *       500:
 *         description: Sunucu hatası
 */
// POST /tenant/api/coupons - Yeni kupon oluştur
router.post('/api/coupons', async (req, res) => {
    try {
        const tenant = req.tenant;
        if (!tenant) {
            return res.status(400).json({
                success: false,
                error: 'TENANT_REQUIRED',
                message: 'Tenant bilgileri bulunamadı.'
            });
        }

        const { code, type, amount, min_cart_total, expires_at, status } = req.body;

        if (!code || !type || !amount) {
            return res.status(400).json({
                success: false,
                error: 'VALIDATION_ERROR',
                message: 'Kupon kodu, tipi ve miktarı zorunludur.'
            });
        }

        const coupon = await Coupon.createCoupon(tenant.db_name, {
            code: code.trim().toUpperCase(),
            type,
            amount: parseFloat(amount),
            min_cart_total: parseFloat(min_cart_total) || 0,
            expires_at: expires_at || null,
            status: status || 'active'
        });

        res.status(201).json({
            success: true,
            data: { coupon: coupon.toJSON() },
            message: 'Kupon başarıyla oluşturuldu.',
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error('Kupon oluşturma API hatası:', error.message);
        res.status(400).json({
            success: false,
            error: 'COUPON_CREATE_ERROR',
            message: error.message,
            timestamp: new Date().toISOString()
        });
    }
});

/**
 * @swagger
 * /{tenant}/api/coupons/{id}:
 *   get:
 *     summary: Kupon detayını getir
 *     description: Belirtilen ID'ye sahip kuponun detaylarını getirir
 *     tags: [Coupons]
 *     parameters:
 *       - in: path
 *         name: tenant
 *         required: true
 *         schema:
 *           type: string
 *         description: Tenant domain adı
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Kupon ID'si
 *     responses:
 *       200:
 *         description: Kupon detayı başarıyla getirildi
 *       404:
 *         description: Kupon bulunamadı
 *       500:
 *         description: Sunucu hatası
 */
// GET /tenant/api/coupons/:id - Kupon detay API
router.get('/api/coupons/:id', async (req, res) => {
    try {
        const tenant = req.tenant;
        const { id } = req.params;

        if (!tenant) {
            return res.status(400).json({
                success: false,
                error: 'TENANT_REQUIRED',
                message: 'Tenant bilgileri bulunamadı.'
            });
        }

        const coupon = await Coupon.findById(tenant.db_name, parseInt(id));

        if (!coupon) {
            return res.status(404).json({
                success: false,
                error: 'COUPON_NOT_FOUND',
                message: 'Kupon bulunamadı.'
            });
        }

        res.json({
            success: true,
            data: { coupon: coupon.toJSON() },
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error('Kupon detay API hatası:', error.message);
        res.status(500).json({
            success: false,
            error: 'COUPON_DETAIL_ERROR',
            message: 'Kupon detayı alınamadı.',
            timestamp: new Date().toISOString()
        });
    }
});

/**
 * @swagger
 * /{tenant}/api/coupons/{id}:
 *   put:
 *     summary: Kupon güncelle
 *     description: Belirtilen ID'ye sahip kuponu günceller
 *     tags: [Coupons]
 *     parameters:
 *       - in: path
 *         name: tenant
 *         required: true
 *         schema:
 *           type: string
 *         description: Tenant domain adı
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Kupon ID'si
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               code:
 *                 type: string
 *               type:
 *                 type: string
 *                 enum: [percentage, fixed]
 *               amount:
 *                 type: number
 *               min_cart_total:
 *                 type: number
 *               expires_at:
 *                 type: string
 *                 format: date-time
 *               status:
 *                 type: string
 *                 enum: [active, inactive]
 *     responses:
 *       200:
 *         description: Kupon başarıyla güncellendi
 *       400:
 *         description: Geçersiz veri
 *       404:
 *         description: Kupon bulunamadı
 *       500:
 *         description: Sunucu hatası
 */
// PUT /tenant/api/coupons/:id - Kupon güncelle
router.put('/api/coupons/:id', async (req, res) => {
    try {
        const tenant = req.tenant;
        const { id } = req.params;

        if (!tenant) {
            return res.status(400).json({
                success: false,
                error: 'TENANT_REQUIRED',
                message: 'Tenant bilgileri bulunamadı.'
            });
        }

        const { code, type, amount, min_cart_total, expires_at, status } = req.body;

        if (!code || !type || !amount) {
            return res.status(400).json({
                success: false,
                error: 'VALIDATION_ERROR',
                message: 'Kupon kodu, tipi ve miktarı zorunludur.'
            });
        }

        const updatedCoupon = await Coupon.updateCoupon(tenant.db_name, parseInt(id), {
            code: code.trim().toUpperCase(),
            type,
            amount: parseFloat(amount),
            min_cart_total: parseFloat(min_cart_total) || 0,
            expires_at: expires_at || null,
            status: status || 'active'
        });

        if (!updatedCoupon) {
            return res.status(404).json({
                success: false,
                error: 'COUPON_NOT_FOUND',
                message: 'Kupon bulunamadı.'
            });
        }

        res.json({
            success: true,
            data: { coupon: updatedCoupon.toJSON() },
            message: 'Kupon başarıyla güncellendi.',
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error('Kupon güncelleme API hatası:', error.message);
        res.status(400).json({
            success: false,
            error: 'COUPON_UPDATE_ERROR',
            message: error.message,
            timestamp: new Date().toISOString()
        });
    }
});

/**
 * @swagger
 * /{tenant}/api/coupons/{id}:
 *   delete:
 *     summary: Kupon sil
 *     description: Belirtilen ID'ye sahip kuponu siler
 *     tags: [Coupons]
 *     parameters:
 *       - in: path
 *         name: tenant
 *         required: true
 *         schema:
 *           type: string
 *         description: Tenant domain adı
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Kupon ID'si
 *     responses:
 *       200:
 *         description: Kupon başarıyla silindi
 *       404:
 *         description: Kupon bulunamadı
 *       500:
 *         description: Sunucu hatası
 */
// DELETE /tenant/api/coupons/:id - Kupon sil
router.delete('/api/coupons/:id', async (req, res) => {
    try {
        const tenant = req.tenant;
        const { id } = req.params;

        if (!tenant) {
            return res.status(400).json({
                success: false,
                error: 'TENANT_REQUIRED',
                message: 'Tenant bilgileri bulunamadı.'
            });
        }

        const success = await Coupon.deleteCoupon(tenant.db_name, parseInt(id));

        if (!success) {
            return res.status(404).json({
                success: false,
                error: 'COUPON_NOT_FOUND',
                message: 'Kupon bulunamadı.'
            });
        }

        res.json({
            success: true,
            message: 'Kupon başarıyla silindi.',
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error('Kupon silme API hatası:', error.message);
        res.status(500).json({
            success: false,
            error: 'COUPON_DELETE_ERROR',
            message: 'Kupon silinemedi.',
            timestamp: new Date().toISOString()
        });
    }
});

// Ana tenant rotası - dashboard'a yönlendirme
router.get('/', (req, res) => {
    res.redirect(`/${req.tenant_domain}/dashboard`);
});

module.exports = router; 