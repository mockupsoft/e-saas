const Notification = require('../models/Notification');

/**
 * Notification Service - Sistem otomatik bildirimleri
 */
class NotificationService {
    
    /**
     * Sipariş oluşturuldu bildirimi
     */
    static async notifyOrderCreated(tenantDbName, tenantId, orderId, orderData) {
        try {
            const title = 'Yeni Sipariş Alındı';
            const message = `${orderData.customer_name} tarafından ${orderData.total_amount} TL tutarında yeni bir sipariş oluşturuldu. Sipariş ID: #${orderId}`;
            
            await Notification.createNotification(tenantDbName, {
                tenant_id: tenantId,
                user_id: null, // Genel bildirim (tüm kullanıcılar görebilir)
                title: title,
                message: message,
                type: 'success'
            });
            
            console.log(`📬 Sipariş bildirimi oluşturuldu: Order #${orderId}`);
        } catch (error) {
            console.error('Sipariş bildirimi oluşturma hatası:', error.message);
        }
    }

    /**
     * Ürün stoğu kritik seviyede bildirimi
     */
    static async notifyLowStock(tenantDbName, tenantId, productData) {
        try {
            const title = 'Stok Kritik Seviyede';
            const message = `"${productData.name}" ürününün stoğu kritik seviyede! Mevcut stok: ${productData.stock_quantity} adet. Stok yenilenmesi gerekebilir.`;
            
            await Notification.createNotification(tenantDbName, {
                tenant_id: tenantId,
                user_id: null,
                title: title,
                message: message,
                type: 'warning'
            });
            
            console.log(`📬 Stok bildirimi oluşturuldu: ${productData.name}`);
        } catch (error) {
            console.error('Stok bildirimi oluşturma hatası:', error.message);
        }
    }

    /**
     * Kupon süresi bitiyor bildirimi
     */
    static async notifyExpiringCoupon(tenantDbName, tenantId, couponData, daysLeft) {
        try {
            const title = 'Kupon Süresi Dolmak Üzere';
            const message = `"${couponData.code}" kuponunun süresi ${daysLeft} gün içinde sona erecek. Kupon türü: ${couponData.type}, İndirim: ${couponData.amount}${couponData.type === 'percentage' ? '%' : ' TL'}`;
            
            await Notification.createNotification(tenantDbName, {
                tenant_id: tenantId,
                user_id: null,
                title: title,
                message: message,
                type: 'warning'
            });
            
            console.log(`📬 Kupon bildirimi oluşturuldu: ${couponData.code}`);
        } catch (error) {
            console.error('Kupon bildirimi oluşturma hatası:', error.message);
        }
    }

    /**
     * Yeni personel eklendi bildirimi
     */
    static async notifyStaffAdded(tenantDbName, tenantId, staffData) {
        try {
            const title = 'Yeni Personel Eklendi';
            const message = `${staffData.name} (${staffData.email}) panelinize ${staffData.role} yetkisiyle erişebilir duruma getirildi.`;
            
            await Notification.createNotification(tenantDbName, {
                tenant_id: tenantId,
                user_id: null,
                title: title,
                message: message,
                type: 'info'
            });
            
            console.log(`📬 Personel bildirimi oluşturuldu: ${staffData.name}`);
        } catch (error) {
            console.error('Personel bildirimi oluşturma hatası:', error.message);
        }
    }

    /**
     * Başarılı oturum açma bildirimi
     */
    static async notifySuccessfulLogin(tenantDbName, tenantId, userEmail, ipAddress, userAgent) {
        try {
            const title = 'Sisteme Giriş Yapıldı';
            const now = new Date().toLocaleString('tr-TR');
            const message = `${userEmail} kullanıcısı ${now} tarihinde sisteme giriş yaptı. IP: ${ipAddress}`;
            
            await Notification.createNotification(tenantDbName, {
                tenant_id: tenantId,
                user_id: null,
                title: title,
                message: message,
                type: 'info'
            });
            
            console.log(`📬 Giriş bildirimi oluşturuldu: ${userEmail}`);
        } catch (error) {
            console.error('Giriş bildirimi oluşturma hatası:', error.message);
        }
    }

    /**
     * Sipariş durumu değişti bildirimi
     */
    static async notifyOrderStatusChanged(tenantDbName, tenantId, orderId, oldStatus, newStatus, customerName) {
        try {
            const statusMap = {
                'pending': 'Beklemede',
                'processing': 'İşleniyor',
                'shipped': 'Kargoya Verildi',
                'delivered': 'Teslim Edildi',
                'cancelled': 'İptal Edildi'
            };

            const title = 'Sipariş Durumu Güncellendi';
            const message = `#${orderId} numaralı sipariş (${customerName}) durumu "${statusMap[oldStatus] || oldStatus}" den "${statusMap[newStatus] || newStatus}" olarak güncellendi.`;
            
            const type = newStatus === 'delivered' ? 'success' : 
                        newStatus === 'cancelled' ? 'danger' : 'info';
            
            await Notification.createNotification(tenantDbName, {
                tenant_id: tenantId,
                user_id: null,
                title: title,
                message: message,
                type: type
            });
            
            console.log(`📬 Sipariş durum bildirimi oluşturuldu: Order #${orderId}`);
        } catch (error) {
            console.error('Sipariş durum bildirimi oluşturma hatası:', error.message);
        }
    }

    /**
     * Yeni müşteri kaydı bildirimi
     */
    static async notifyNewCustomer(tenantDbName, tenantId, customerData) {
        try {
            const title = 'Yeni Müşteri Kaydı';
            const message = `${customerData.name} (${customerData.email}) sisteme yeni müşteri olarak eklendi. Şehir: ${customerData.city || 'Belirtilmemiş'}`;
            
            await Notification.createNotification(tenantDbName, {
                tenant_id: tenantId,
                user_id: null,
                title: title,
                message: message,
                type: 'success'
            });
            
            console.log(`📬 Yeni müşteri bildirimi oluşturuldu: ${customerData.name}`);
        } catch (error) {
            console.error('Yeni müşteri bildirimi oluşturma hatası:', error.message);
        }
    }

    /**
     * Affiliate satış bildirimi
     */
    static async notifyAffiliateSale(tenantDbName, tenantId, affiliateData, orderData, commissionAmount) {
        try {
            const title = 'Affiliate Satış Gerçekleşti';
            const message = `${affiliateData.affiliate_code} affiliate kodu ile ${orderData.total_amount} TL tutarında satış gerçekleşti. Komisyon: ${commissionAmount} TL`;
            
            await Notification.createNotification(tenantDbName, {
                tenant_id: tenantId,
                user_id: null,
                title: title,
                message: message,
                type: 'success'
            });
            
            console.log(`📬 Affiliate satış bildirimi oluşturuldu: ${affiliateData.affiliate_code}`);
        } catch (error) {
            console.error('Affiliate satış bildirimi oluşturma hatası:', error.message);
        }
    }

    /**
     * Genel sistem bildirimi (manuel)
     */
    static async notifySystemMessage(tenantDbName, tenantId, title, message, type = 'info', userId = null) {
        try {
            await Notification.createNotification(tenantDbName, {
                tenant_id: tenantId,
                user_id: userId,
                title: title,
                message: message,
                type: type
            });
            
            console.log(`📬 Sistem bildirimi oluşturuldu: ${title}`);
        } catch (error) {
            console.error('Sistem bildirimi oluşturma hatası:', error.message);
        }
    }

    /**
     * Toplu bildirim temizleme (eski bildirimleri sil)
     */
    static async cleanupOldNotifications(tenantDbName, daysOld = 30) {
        try {
            const deletedCount = await Notification.deleteOldNotifications(tenantDbName, daysOld);
            
            if (deletedCount > 0) {
                console.log(`🧹 ${deletedCount} adet eski bildirim temizlendi (${daysOld} günden eski)`);
            }
            
            return deletedCount;
        } catch (error) {
            console.error('Bildirim temizleme hatası:', error.message);
            return 0;
        }
    }

    /**
     * Stok kontrolü için otomatik tarama (günlük cron job için)
     */
    static async checkLowStockProducts(tenantDbName, tenantId, threshold = 10) {
        try {
            const { executeTenantQuery } = require('./db');
            
            const lowStockProducts = await executeTenantQuery(
                tenantDbName,
                'SELECT id, name, stock_quantity FROM products WHERE stock_quantity <= ? AND status = "active"',
                [threshold]
            );

            for (const product of lowStockProducts) {
                await this.notifyLowStock(tenantDbName, tenantId, product);
            }

            if (lowStockProducts.length > 0) {
                console.log(`📊 ${lowStockProducts.length} ürün için düşük stok bildirimi oluşturuldu`);
            }

            return lowStockProducts.length;
        } catch (error) {
            console.error('Stok kontrolü hatası:', error.message);
            return 0;
        }
    }

    /**
     * Süresi dolmak üzere olan kuponları kontrol et
     */
    static async checkExpiringCoupons(tenantDbName, tenantId, daysAhead = 2) {
        try {
            const { executeTenantQuery } = require('./db');
            
            const expiringCoupons = await executeTenantQuery(
                tenantDbName,
                'SELECT * FROM coupons WHERE expires_at <= DATE_ADD(NOW(), INTERVAL ? DAY) AND expires_at > NOW() AND status = "active"',
                [daysAhead]
            );

            for (const coupon of expiringCoupons) {
                const daysLeft = Math.ceil((new Date(coupon.expires_at) - new Date()) / (1000 * 60 * 60 * 24));
                await this.notifyExpiringCoupon(tenantDbName, tenantId, coupon, daysLeft);
            }

            if (expiringCoupons.length > 0) {
                console.log(`📊 ${expiringCoupons.length} kupon için süresi dolma bildirimi oluşturuldu`);
            }

            return expiringCoupons.length;
        } catch (error) {
            console.error('Kupon kontrolü hatası:', error.message);
            return 0;
        }
    }
}

module.exports = NotificationService; 