const express = require('express');
const router = express.Router();
const { executeQuery, executeTenantQuery } = require('../utils/db');
const Tenant = require('../models/Tenant');

// 📊 ADMIN RAPORLAMA VE ANALİTİK API'LERİ

// Ana admin raporlama sayfası
router.get('/', async (req, res) => {
    try {
        const tenantsCount = await Tenant.getCount();
        
        // EJS template'ini render et
        res.render('admin/analytics', {
            title: 'Sistem Raporları ve Analytics - Süper Admin',
            tenantsCount: tenantsCount
        });
    } catch (error) {
        console.error('Admin raporlama sayfası hatası:', error.message);
        res.status(500).send(`
            <!DOCTYPE html>
            <html lang="tr">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>Hata - Admin Analytics</title>
                <style>
                    body { 
                        font-family: Arial, sans-serif; 
                        display: flex; 
                        align-items: center; 
                        justify-content: center; 
                        min-height: 100vh; 
                        margin: 0; 
                        background: #f5f5f5; 
                    }
                    .error-container { 
                        text-align: center; 
                        padding: 2rem; 
                        background: white; 
                        border-radius: 8px; 
                        box-shadow: 0 2px 10px rgba(0,0,0,0.1); 
                    }
                    .error-title { 
                        color: #dc2626; 
                        font-size: 2rem; 
                        margin-bottom: 1rem; 
                    }
                    .error-message { 
                        color: #6b7280; 
                        margin-bottom: 1.5rem; 
                    }
                    .retry-btn { 
                        background: #3b82f6; 
                        color: white; 
                        padding: 0.75rem 1.5rem; 
                        border: none; 
                        border-radius: 6px; 
                        cursor: pointer; 
                        text-decoration: none; 
                        display: inline-block; 
                    }
                </style>
            </head>
            <body>
                <div class="error-container">
                    <div class="error-title">⚠️ Hata</div>
                    <div class="error-message">Admin raporlama sayfası yüklenirken bir hata oluştu:<br><code>${error.message}</code></div>
                    <a href="/admin/analytics" class="retry-btn">🔄 Tekrar Dene</a>
                    <a href="/admin/dashboard" class="retry-btn" style="margin-left: 1rem; background: #6b7280;">🏠 Dashboard'a Dön</a>
                </div>
            </body>
            </html>
        `);
    }
});

// Sistem özet istatistikleri API
router.get('/api/summary', async (req, res) => {
    try {
        const stats = {
            totalTenants: 0,
            activeTenants: 0,
            totalOrders: 0,
            totalRevenue: 0,
            avgOrderValue: 0,
            systemUptime: process.uptime()
        };

        // Tenant istatistikleri
        const tenants = await Tenant.getAllTenants();
        stats.totalTenants = tenants.length;
        stats.activeTenants = tenants.filter(t => t.status === 'active').length;

        // Tüm tenant'lardan sipariş ve gelir topla
        let totalOrders = 0;
        let totalRevenue = 0;

        for (const tenant of tenants.filter(t => t.status === 'active')) {
            try {
                const ordersResult = await executeTenantQuery(
                    tenant.db_name,
                    'SELECT COUNT(*) as count, COALESCE(SUM(total_amount), 0) as revenue FROM orders WHERE status != "cancelled"'
                );
                
                if (ordersResult.length > 0) {
                    totalOrders += parseInt(ordersResult[0].count || 0);
                    totalRevenue += parseFloat(ordersResult[0].revenue || 0);
                }
            } catch (tenantError) {
                console.warn(`Tenant ${tenant.name} verisi alınamadı:`, tenantError.message);
            }
        }

        stats.totalOrders = totalOrders;
        stats.totalRevenue = totalRevenue;
        stats.avgOrderValue = totalOrders > 0 ? (totalRevenue / totalOrders) : 0;

        res.json({
            success: true,
            data: stats,
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        console.error('Admin özet istatistik hatası:', error.message);
        res.status(500).json({
            success: false,
            error: 'ADMIN_SUMMARY_ERROR',
            message: 'Sistem istatistikleri getirilirken bir hata oluştu.'
        });
    }
});

// Tenant performans API (en aktif tenant'lar)
router.get('/api/tenant-performance', async (req, res) => {
    try {
        const tenants = await Tenant.getAllTenants();
        const tenantStats = [];

        for (const tenant of tenants.filter(t => t.status === 'active')) {
            try {
                const stats = await executeTenantQuery(
                    tenant.db_name,
                    `SELECT 
                        COUNT(*) as total_orders,
                        COALESCE(SUM(total_amount), 0) as total_revenue,
                        COUNT(DISTINCT customer_email) as unique_customers,
                        AVG(total_amount) as avg_order_value
                     FROM orders 
                     WHERE status != "cancelled" 
                     AND created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)`
                );

                if (stats.length > 0) {
                    tenantStats.push({
                        tenant_name: tenant.name,
                        tenant_domain: tenant.domain,
                        total_orders: parseInt(stats[0].total_orders || 0),
                        total_revenue: parseFloat(stats[0].total_revenue || 0),
                        unique_customers: parseInt(stats[0].unique_customers || 0),
                        avg_order_value: parseFloat(stats[0].avg_order_value || 0)
                    });
                }
            } catch (tenantError) {
                console.warn(`Tenant ${tenant.name} performans verisi alınamadı:`, tenantError.message);
                tenantStats.push({
                    tenant_name: tenant.name,
                    tenant_domain: tenant.domain,
                    total_orders: 0,
                    total_revenue: 0,
                    unique_customers: 0,
                    avg_order_value: 0
                });
            }
        }

        // En yüksek gelire göre sırala
        tenantStats.sort((a, b) => b.total_revenue - a.total_revenue);

        res.json({
            success: true,
            data: tenantStats.slice(0, 10), // Top 10 tenant
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        console.error('Tenant performans hatası:', error.message);
        res.status(500).json({
            success: false,
            error: 'TENANT_PERFORMANCE_ERROR',
            message: 'Tenant performans verileri getirilirken bir hata oluştu.'
        });
    }
});

// Sistem aktivite trendi API (son 30 gün)
router.get('/api/activity-trend', async (req, res) => {
    try {
        const tenants = await Tenant.getAllTenants();
        const activityData = [];

        // Son 30 günün tarihlerini oluştur
        for (let i = 29; i >= 0; i--) {
            const date = new Date();
            date.setDate(date.getDate() - i);
            const dateStr = date.toISOString().split('T')[0];

            let dailyOrders = 0;
            let dailyRevenue = 0;

            // Tüm aktif tenant'lardan o günün verilerini topla
            for (const tenant of tenants.filter(t => t.status === 'active')) {
                try {
                    const dayStats = await executeTenantQuery(
                        tenant.db_name,
                        `SELECT 
                            COUNT(*) as orders,
                            COALESCE(SUM(total_amount), 0) as revenue
                         FROM orders 
                         WHERE DATE(created_at) = ?
                         AND status != "cancelled"`,
                        [dateStr]
                    );

                    if (dayStats.length > 0) {
                        dailyOrders += parseInt(dayStats[0].orders || 0);
                        dailyRevenue += parseFloat(dayStats[0].revenue || 0);
                    }
                } catch (tenantError) {
                    // Sessizce geç
                }
            }

            activityData.push({
                date: dateStr,
                total_orders: dailyOrders,
                total_revenue: dailyRevenue
            });
        }

        res.json({
            success: true,
            data: activityData,
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        console.error('Aktivite trendi hatası:', error.message);
        res.status(500).json({
            success: false,
            error: 'ACTIVITY_TREND_ERROR',
            message: 'Aktivite trendi verileri getirilirken bir hata oluştu.'
        });
    }
});

// Sistem sağlığı API
router.get('/api/system-health', async (req, res) => {
    try {
        const tenants = await Tenant.getAllTenants();
        const healthData = {
            total_tenants: tenants.length,
            active_tenants: tenants.filter(t => t.status === 'active').length,
            inactive_tenants: tenants.filter(t => t.status === 'inactive').length,
            suspended_tenants: tenants.filter(t => t.status === 'suspended').length,
            system_uptime: process.uptime(),
            memory_usage: process.memoryUsage(),
            server_time: new Date().toISOString()
        };

        // Database bağlantı testi
        try {
            await executeQuery('SELECT 1');
            healthData.database_status = 'healthy';
        } catch (dbError) {
            healthData.database_status = 'error';
            healthData.database_error = dbError.message;
        }

        res.json({
            success: true,
            data: healthData,
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        console.error('Sistem sağlığı hatası:', error.message);
        res.status(500).json({
            success: false,
            error: 'SYSTEM_HEALTH_ERROR',
            message: 'Sistem sağlığı verileri getirilirken bir hata oluştu.'
        });
    }
});

module.exports = router;
