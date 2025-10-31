const { executeTenantQuery } = require('../utils/db');

class Order {
    constructor(data = {}) {
        this.id = data.id || null;
        this.customer_name = data.customer_name || '';
        this.customer_email = data.customer_email || '';
        this.total_amount = data.total_amount || 0;
        this.status = data.status || 'pending';
        
        // Invoice fields
        this.invoice_type = data.invoice_type || 'bireysel';
        this.invoice_title = data.invoice_title || null;
        this.tax_number = data.tax_number || null;
        this.tax_office = data.tax_office || null;
        this.invoice_address = data.invoice_address || null;
        
        // Shipping fields
        this.shipping_company = data.shipping_company || null;
        this.tracking_number = data.tracking_number || null;
        this.estimated_delivery = data.estimated_delivery || null;
        
        // Affiliate field
        this.affiliate_code = data.affiliate_code || null;
        
        this.created_at = data.created_at || null;
        this.updated_at = data.updated_at || null;
    }

    /**
     * Tüm siparişleri getir
     */
    static async getAllOrders(dbName) {
        try {
            const query = `
                SELECT id, customer_name, customer_email, total_amount, status,
                       invoice_type, invoice_title, tax_number, tax_office, invoice_address,
                       shipping_company, tracking_number, estimated_delivery, affiliate_code,
                       created_at, updated_at 
                FROM orders 
                ORDER BY created_at DESC
            `;
            const rows = await executeTenantQuery(dbName, query);
            return rows.map(row => new Order(row));
        } catch (error) {
            console.error('Sipariş listesi getirme hatası:', error.message);
            throw new Error('Sipariş listesi alınamadı');
        }
    }

    /**
     * ID ile sipariş getir
     */
    static async findById(dbName, id) {
        try {
            const query = `
                SELECT id, customer_name, customer_email, total_amount, status,
                       invoice_type, invoice_title, tax_number, tax_office, invoice_address,
                       shipping_company, tracking_number, estimated_delivery, affiliate_code,
                       created_at, updated_at 
                FROM orders 
                WHERE id = ?
            `;
            const rows = await executeTenantQuery(dbName, query, [id]);
            return rows.length > 0 ? new Order(rows[0]) : null;
        } catch (error) {
            console.error('Sipariş getirme hatası:', error.message);
            throw new Error('Sipariş bulunamadı');
        }
    }

    /**
     * Yeni sipariş oluştur
     */
    static async createOrder(dbName, orderData) {
        try {
            // Validate required fields
            if (!orderData.customer_name || !orderData.customer_email || !orderData.total_amount) {
                throw new Error('Müşteri adı, e-posta ve tutar alanları zorunludur');
            }

            // Email validation
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(orderData.customer_email)) {
                throw new Error('Geçerli bir e-posta adresi giriniz');
            }

            // Amount validation
            const amount = parseFloat(orderData.total_amount);
            if (isNaN(amount) || amount <= 0) {
                throw new Error('Geçerli bir tutar giriniz');
            }

            // Invoice type validation for corporate
            if (orderData.invoice_type === 'kurumsal') {
                if (!orderData.invoice_title || !orderData.tax_number) {
                    throw new Error('Kurumsal fatura için fatura başlığı ve vergi numarası zorunludur');
                }
                
                // Tax number validation (10 digit)
                if (orderData.tax_number && orderData.tax_number.length < 10) {
                    throw new Error('Vergi numarası en az 10 karakter olmalıdır');
                }
            }

            // Affiliate kod kontrolü ve komisyon işlemi
            let affiliateId = null;
            let commissionRate = 0;
            
            if (orderData.affiliate_code) {
                const Affiliate = require('./Affiliate');
                const affiliate = await Affiliate.findByCode(dbName, orderData.affiliate_code);
                
                if (affiliate && affiliate.status === 'active') {
                    affiliateId = affiliate.id;
                    commissionRate = affiliate.commission_rate;
                }
            }

            const query = `
                INSERT INTO orders (
                    customer_name, customer_email, total_amount, status,
                    invoice_type, invoice_title, tax_number, tax_office, invoice_address,
                    shipping_company, tracking_number, estimated_delivery, affiliate_code,
                    created_at, updated_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
            `;
            
            const params = [
                orderData.customer_name.trim(),
                orderData.customer_email.trim().toLowerCase(),
                amount,
                orderData.status || 'pending',
                orderData.invoice_type || 'bireysel',
                orderData.invoice_title || null,
                orderData.tax_number || null,
                orderData.tax_office || null,
                orderData.invoice_address || null,
                orderData.shipping_company || null,
                orderData.tracking_number || null,
                orderData.estimated_delivery || null,
                orderData.affiliate_code || null
            ];

            const result = await executeTenantQuery(dbName, query, params);
            const newOrder = await Order.findById(dbName, result.insertId);
            
            // Eğer geçerli affiliate kodu varsa komisyon kaydı oluştur
            if (affiliateId && commissionRate > 0) {
                try {
                    const commissionAmount = (amount * commissionRate) / 100;
                    const AffiliateSale = require('./AffiliateSale');
                    await AffiliateSale.createAffiliateSale(dbName, affiliateId, result.insertId, commissionAmount);
                } catch (commissionError) {
                    console.error('Komisyon kaydı oluşturma hatası:', commissionError.message);
                    // Sipariş oluşturuldu ama komisyon kaydedilemedi, devam et
                }
            }

            // Sipariş oluşturuldu bildirimi gönder
            try {
                const NotificationService = require('../utils/notificationService');
                // Tenant ID'yi veritabanı adından çıkar (örn: saas_test1 -> 1)
                const tenantId = parseInt(dbName.replace('saas_test', '').replace('saas_', '') || '1');
                await NotificationService.notifyOrderCreated(dbName, tenantId, result.insertId, newOrder);
            } catch (notificationError) {
                console.error('Sipariş bildirimi oluşturma hatası:', notificationError.message);
                // Bildirim hatası sipariş oluşturulmasını engellemez
            }
            
            return newOrder;
        } catch (error) {
            console.error('Sipariş oluşturma hatası:', error.message);
            throw error;
        }
    }

    /**
     * Sipariş güncelle
     */
    static async updateOrder(dbName, id, orderData) {
        try {
            // Validate required fields
            if (!orderData.customer_name || !orderData.customer_email || !orderData.total_amount) {
                throw new Error('Müşteri adı, e-posta ve tutar alanları zorunludur');
            }

            // Email validation
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(orderData.customer_email)) {
                throw new Error('Geçerli bir e-posta adresi giriniz');
            }

            // Amount validation
            const amount = parseFloat(orderData.total_amount);
            if (isNaN(amount) || amount <= 0) {
                throw new Error('Geçerli bir tutar giriniz');
            }

            // Invoice type validation for corporate
            if (orderData.invoice_type === 'kurumsal') {
                if (!orderData.invoice_title || !orderData.tax_number) {
                    throw new Error('Kurumsal fatura için fatura başlığı ve vergi numarası zorunludur');
                }
                
                // Tax number validation (10 digit)
                if (orderData.tax_number && orderData.tax_number.length < 10) {
                    throw new Error('Vergi numarası en az 10 karakter olmalıdır');
                }
            }

            const query = `
                UPDATE orders SET 
                    customer_name = ?, customer_email = ?, total_amount = ?, status = ?,
                    invoice_type = ?, invoice_title = ?, tax_number = ?, tax_office = ?, invoice_address = ?,
                    shipping_company = ?, tracking_number = ?, estimated_delivery = ?, affiliate_code = ?,
                    updated_at = CURRENT_TIMESTAMP
                WHERE id = ?
            `;
            
            const params = [
                orderData.customer_name.trim(),
                orderData.customer_email.trim().toLowerCase(),
                amount,
                orderData.status || 'pending',
                orderData.invoice_type || 'bireysel',
                orderData.invoice_title || null,
                orderData.tax_number || null,
                orderData.tax_office || null,
                orderData.invoice_address || null,
                orderData.shipping_company || null,
                orderData.tracking_number || null,
                orderData.estimated_delivery || null,
                orderData.affiliate_code || null,
                id
            ];

            await executeTenantQuery(dbName, query, params);
            return await Order.findById(dbName, id);
        } catch (error) {
            console.error('Sipariş güncelleme hatası:', error.message);
            throw error;
        }
    }

    /**
     * Sipariş sil
     */
    static async deleteOrder(dbName, id) {
        try {
            const query = 'DELETE FROM orders WHERE id = ?';
            const result = await executeTenantQuery(dbName, query, [id]);
            return result.affectedRows > 0;
        } catch (error) {
            console.error('Sipariş silme hatası:', error.message);
            throw new Error('Sipariş silinirken bir hata oluştu');
        }
    }

    /**
     * Sipariş sayısını getir
     */
    static async getCount(dbName) {
        try {
            const query = 'SELECT COUNT(*) as count FROM orders';
            const result = await executeTenantQuery(dbName, query);
            return result[0].count;
        } catch (error) {
            console.error('Sipariş sayısı getirme hatası:', error.message);
            return 0;
        }
    }

    /**
     * Toplam geliri getir
     */
    static async getTotalRevenue(dbName) {
        try {
            const query = 'SELECT SUM(total_amount) as revenue FROM orders WHERE status != "cancelled"';
            const result = await executeTenantQuery(dbName, query);
            return parseFloat(result[0].revenue) || 0;
        } catch (error) {
            console.error('Toplam gelir getirme hatası:', error.message);
            return 0;
        }
    }

    /**
     * Durum bazlı istatistikler
     */
    static async getStatusStats(dbName) {
        try {
            const query = `
                SELECT 
                    status,
                    COUNT(*) as count,
                    SUM(total_amount) as total_amount
                FROM orders 
                GROUP BY status
            `;
            const result = await executeTenantQuery(dbName, query);
            return result;
        } catch (error) {
            console.error('Durum istatistikleri getirme hatası:', error.message);
            return [];
        }
    }

    /**
     * Kargo firması bazlı istatistikler
     */
    static async getShippingStats(dbName) {
        try {
            const query = `
                SELECT 
                    shipping_company,
                    COUNT(*) as count
                FROM orders 
                WHERE shipping_company IS NOT NULL
                GROUP BY shipping_company
                ORDER BY count DESC
            `;
            const result = await executeTenantQuery(dbName, query);
            return result;
        } catch (error) {
            console.error('Kargo istatistikleri getirme hatası:', error.message);
            return [];
        }
    }

    /**
     * JSON formatında sipariş verisini döndür
     */
    toJSON() {
        return {
            id: this.id,
            customer_name: this.customer_name,
            customer_email: this.customer_email,
            total_amount: parseFloat(this.total_amount),
            status: this.status,
            invoice_type: this.invoice_type,
            invoice_title: this.invoice_title,
            tax_number: this.tax_number,
            tax_office: this.tax_office,
            invoice_address: this.invoice_address,
            shipping_company: this.shipping_company,
            tracking_number: this.tracking_number,
            estimated_delivery: this.estimated_delivery,
            created_at: this.created_at,
            updated_at: this.updated_at
        };
    }

    /**
     * Durum text'ini döndür
     */
    getStatusText() {
        const statusMap = {
            'pending': 'Bekliyor',
            'processing': 'İşlemde',
            'shipped': 'Kargoda',
            'delivered': 'Teslim Edildi',
            'cancelled': 'İptal Edildi'
        };
        return statusMap[this.status] || this.status;
    }

    /**
     * Fatura tipi text'ini döndür
     */
    getInvoiceTypeText() {
        const typeMap = {
            'bireysel': 'Bireysel',
            'kurumsal': 'Kurumsal'
        };
        return typeMap[this.invoice_type] || this.invoice_type;
    }
}

module.exports = Order; 