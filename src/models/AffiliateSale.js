const { executeTenantQuery } = require('../utils/db');

class AffiliateSale {
    constructor(data = {}) {
        this.id = data.id || null;
        this.affiliate_id = data.affiliate_id || null;
        this.order_id = data.order_id || null;
        this.commission_amount = data.commission_amount || 0.00;
        this.status = data.status || 'pending';
        this.paid_at = data.paid_at || null;
        this.created_at = data.created_at || null;
        this.updated_at = data.updated_at || null;
    }

    /**
     * AffiliateSale nesnesini JSON formatına çevir
     */
    toJSON() {
        return {
            id: this.id,
            affiliate_id: this.affiliate_id,
            order_id: this.order_id,
            commission_amount: parseFloat(this.commission_amount),
            status: this.status,
            paid_at: this.paid_at,
            created_at: this.created_at,
            updated_at: this.updated_at
        };
    }

    /**
     * Tüm affiliate satışlarını getir
     */
    static async getAllAffiliateSales(dbName) {
        try {
            const query = `
                SELECT 
                    asa.*,
                    a.affiliate_code,
                    a.commission_rate,
                    c.name as customer_name,
                    c.email as customer_email,
                    o.customer_name as order_customer_name,
                    o.customer_email as order_customer_email,
                    o.total_amount as order_total,
                    o.status as order_status,
                    o.created_at as order_date
                FROM affiliate_sales asa
                JOIN affiliates a ON asa.affiliate_id = a.id
                JOIN orders o ON asa.order_id = o.id
                LEFT JOIN customers c ON a.owner_customer_id = c.id
                ORDER BY asa.created_at DESC
            `;
            const rows = await executeTenantQuery(dbName, query);
            return rows.map(row => ({
                ...new AffiliateSale(row).toJSON(),
                affiliate_code: row.affiliate_code,
                commission_rate: parseFloat(row.commission_rate),
                customer_name: row.customer_name,
                customer_email: row.customer_email,
                order_customer_name: row.order_customer_name,
                order_customer_email: row.order_customer_email,
                order_total: parseFloat(row.order_total),
                order_status: row.order_status,
                order_date: row.order_date
            }));
        } catch (error) {
            console.error('Affiliate satış listesi getirme hatası:', error.message);
            throw new Error('Affiliate satış listesi alınamadı');
        }
    }

    /**
     * Belirli affiliate ID için satışları getir
     */
    static async getSalesByAffiliate(dbName, affiliateId) {
        try {
            const query = `
                SELECT 
                    asa.*,
                    o.customer_name as order_customer_name,
                    o.customer_email as order_customer_email,
                    o.total_amount as order_total,
                    o.status as order_status,
                    o.created_at as order_date
                FROM affiliate_sales asa
                JOIN orders o ON asa.order_id = o.id
                WHERE asa.affiliate_id = ?
                ORDER BY asa.created_at DESC
            `;
            const rows = await executeTenantQuery(dbName, query, [affiliateId]);
            return rows.map(row => ({
                ...new AffiliateSale(row).toJSON(),
                order_customer_name: row.order_customer_name,
                order_customer_email: row.order_customer_email,
                order_total: parseFloat(row.order_total),
                order_status: row.order_status,
                order_date: row.order_date
            }));
        } catch (error) {
            console.error('Affiliate satışları getirme hatası:', error.message);
            throw new Error('Affiliate satışları alınamadı');
        }
    }

    /**
     * ID ile affiliate satış getir
     */
    static async findById(dbName, id) {
        try {
            const query = `
                SELECT 
                    asa.*,
                    a.affiliate_code,
                    a.commission_rate,
                    c.name as customer_name,
                    c.email as customer_email,
                    o.customer_name as order_customer_name,
                    o.customer_email as order_customer_email,
                    o.total_amount as order_total,
                    o.status as order_status,
                    o.created_at as order_date
                FROM affiliate_sales asa
                JOIN affiliates a ON asa.affiliate_id = a.id
                JOIN orders o ON asa.order_id = o.id
                LEFT JOIN customers c ON a.owner_customer_id = c.id
                WHERE asa.id = ?
            `;
            const rows = await executeTenantQuery(dbName, query, [id]);
            if (rows.length > 0) {
                const sale = new AffiliateSale(rows[0]);
                return {
                    ...sale.toJSON(),
                    affiliate_code: rows[0].affiliate_code,
                    commission_rate: parseFloat(rows[0].commission_rate),
                    customer_name: rows[0].customer_name,
                    customer_email: rows[0].customer_email,
                    order_customer_name: rows[0].order_customer_name,
                    order_customer_email: rows[0].order_customer_email,
                    order_total: parseFloat(rows[0].order_total),
                    order_status: rows[0].order_status,
                    order_date: rows[0].order_date
                };
            }
            return null;
        } catch (error) {
            console.error('Affiliate satış getirme hatası:', error.message);
            throw new Error('Affiliate satış bulunamadı');
        }
    }

    /**
     * Yeni affiliate satış kaydı oluştur
     */
    static async createAffiliateSale(dbName, affiliateId, orderId, commissionAmount) {
        try {
            // Aynı sipariş için zaten kayıt var mı kontrol et
            const existing = await executeTenantQuery(
                dbName,
                'SELECT id FROM affiliate_sales WHERE affiliate_id = ? AND order_id = ?',
                [affiliateId, orderId]
            );

            if (existing.length > 0) {
                throw new Error('Bu sipariş için zaten affiliate satış kaydı mevcut');
            }

            const query = `
                INSERT INTO affiliate_sales (
                    affiliate_id, order_id, commission_amount, status,
                    created_at, updated_at
                ) VALUES (?, ?, ?, 'pending', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
            `;
            
            const result = await executeTenantQuery(dbName, query, [affiliateId, orderId, commissionAmount]);
            
            // Affiliate istatistiklerini güncelle
            const Affiliate = require('./Affiliate');
            await Affiliate.updateAffiliateStats(dbName, affiliateId);
            
            return await AffiliateSale.findById(dbName, result.insertId);
        } catch (error) {
            console.error('Affiliate satış oluşturma hatası:', error.message);
            throw error;
        }
    }

    /**
     * Komisyon durumunu güncelle
     */
    static async updateCommissionStatus(dbName, id, status) {
        try {
            // Geçerli durumları kontrol et
            const validStatuses = ['pending', 'paid'];
            if (!validStatuses.includes(status)) {
                throw new Error('Geçersiz komisyon durumu');
            }

            // Mevcut kaydı kontrol et
            const existing = await this.findById(dbName, id);
            if (!existing) {
                throw new Error('Güncellenecek affiliate satış bulunamadı');
            }

            const updateQuery = `
                UPDATE affiliate_sales SET 
                    status = ?, 
                    paid_at = ?,
                    updated_at = CURRENT_TIMESTAMP
                WHERE id = ?
            `;
            
            const paidAt = status === 'paid' ? new Date() : null;
            await executeTenantQuery(dbName, updateQuery, [status, paidAt, id]);

            // Affiliate istatistiklerini güncelle
            const Affiliate = require('./Affiliate');
            await Affiliate.updateAffiliateStats(dbName, existing.affiliate_id);
            
            return await AffiliateSale.findById(dbName, id);
        } catch (error) {
            console.error('Komisyon durumu güncelleme hatası:', error.message);
            throw error;
        }
    }

    /**
     * Birden fazla komisyonu toplu olarak güncelle
     */
    static async bulkUpdateCommissionStatus(dbName, ids, status) {
        try {
            if (!Array.isArray(ids) || ids.length === 0) {
                throw new Error('Güncellenecek kayıt bulunamadı');
            }

            const validStatuses = ['pending', 'paid'];
            if (!validStatuses.includes(status)) {
                throw new Error('Geçersiz komisyon durumu');
            }

            const placeholders = ids.map(() => '?').join(',');
            const updateQuery = `
                UPDATE affiliate_sales SET 
                    status = ?, 
                    paid_at = ?,
                    updated_at = CURRENT_TIMESTAMP
                WHERE id IN (${placeholders})
            `;
            
            const paidAt = status === 'paid' ? new Date() : null;
            const params = [status, paidAt, ...ids];
            
            await executeTenantQuery(dbName, updateQuery, params);

            // Etkilenen affiliate'ların istatistiklerini güncelle
            const affiliateQuery = `
                SELECT DISTINCT affiliate_id FROM affiliate_sales WHERE id IN (${placeholders})
            `;
            const affiliates = await executeTenantQuery(dbName, affiliateQuery, ids);
            
            const Affiliate = require('./Affiliate');
            for (const affiliate of affiliates) {
                await Affiliate.updateAffiliateStats(dbName, affiliate.affiliate_id);
            }

            return ids.length;
        } catch (error) {
            console.error('Toplu komisyon güncellemesi hatası:', error.message);
            throw error;
        }
    }

    /**
     * Affiliate satış sil
     */
    static async deleteAffiliateSale(dbName, id) {
        try {
            const existing = await this.findById(dbName, id);
            if (!existing) {
                throw new Error('Silinecek affiliate satış bulunamadı');
            }

            await executeTenantQuery(dbName, 'DELETE FROM affiliate_sales WHERE id = ?', [id]);
            
            // Affiliate istatistiklerini güncelle
            const Affiliate = require('./Affiliate');
            await Affiliate.updateAffiliateStats(dbName, existing.affiliate_id);
            
            return true;
        } catch (error) {
            console.error('Affiliate satış silme hatası:', error.message);
            throw error;
        }
    }

    /**
     * Komisyon özetini getir
     */
    static async getCommissionSummary(dbName, affiliateId = null) {
        try {
            let query = `
                SELECT 
                    COUNT(*) as total_sales,
                    SUM(commission_amount) as total_commission,
                    SUM(CASE WHEN status = 'pending' THEN commission_amount ELSE 0 END) as pending_commission,
                    SUM(CASE WHEN status = 'paid' THEN commission_amount ELSE 0 END) as paid_commission,
                    COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending_count,
                    COUNT(CASE WHEN status = 'paid' THEN 1 END) as paid_count
                FROM affiliate_sales
            `;
            
            const params = [];
            if (affiliateId) {
                query += ' WHERE affiliate_id = ?';
                params.push(affiliateId);
            }

            const result = await executeTenantQuery(dbName, query, params);
            return {
                total_sales: parseInt(result[0].total_sales),
                total_commission: parseFloat(result[0].total_commission || 0),
                pending_commission: parseFloat(result[0].pending_commission || 0),
                paid_commission: parseFloat(result[0].paid_commission || 0),
                pending_count: parseInt(result[0].pending_count),
                paid_count: parseInt(result[0].paid_count)
            };
        } catch (error) {
            console.error('Komisyon özeti getirme hatası:', error.message);
            throw new Error('Komisyon özeti alınamadı');
        }
    }
}

module.exports = AffiliateSale; 