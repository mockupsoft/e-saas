const { executeTenantQuery } = require('../utils/db');

class Affiliate {
    constructor(data = {}) {
        this.id = data.id || null;
        this.affiliate_code = data.affiliate_code || '';
        this.owner_customer_id = data.owner_customer_id || null;
        this.commission_rate = data.commission_rate || 5.00;
        this.total_sales = data.total_sales || 0.00;
        this.total_commission = data.total_commission || 0.00;
        this.status = data.status || 'active';
        this.created_at = data.created_at || null;
        this.updated_at = data.updated_at || null;
    }

    /**
     * Affiliate nesnesini JSON formatına çevir
     */
    toJSON() {
        return {
            id: this.id,
            affiliate_code: this.affiliate_code,
            owner_customer_id: this.owner_customer_id,
            commission_rate: parseFloat(this.commission_rate),
            total_sales: parseFloat(this.total_sales),
            total_commission: parseFloat(this.total_commission),
            status: this.status,
            created_at: this.created_at,
            updated_at: this.updated_at
        };
    }

    /**
     * Tüm affiliate kodlarını getir
     */
    static async getAllAffiliates(dbName) {
        try {
            const query = `
                SELECT a.*, c.name as customer_name, c.email as customer_email,
                       COUNT(DISTINCT as2.id) as total_sales_count,
                       COALESCE(SUM(CASE WHEN as2.status = 'pending' THEN as2.commission_amount ELSE 0 END), 0) as pending_commission,
                       COALESCE(SUM(CASE WHEN as2.status = 'paid' THEN as2.commission_amount ELSE 0 END), 0) as paid_commission
                FROM affiliates a
                LEFT JOIN customers c ON a.owner_customer_id = c.id
                LEFT JOIN affiliate_sales as2 ON a.id = as2.affiliate_id
                GROUP BY a.id, c.name, c.email
                ORDER BY a.created_at DESC
            `;
            const rows = await executeTenantQuery(dbName, query);
            return rows.map(row => ({
                ...new Affiliate(row).toJSON(),
                customer_name: row.customer_name,
                customer_email: row.customer_email,
                total_sales_count: parseInt(row.total_sales_count),
                pending_commission: parseFloat(row.pending_commission),
                paid_commission: parseFloat(row.paid_commission)
            }));
        } catch (error) {
            console.error('Affiliate listesi getirme hatası:', error.message);
            throw new Error('Affiliate listesi alınamadı');
        }
    }

    /**
     * ID ile affiliate getir
     */
    static async findById(dbName, id) {
        try {
            const query = `
                SELECT a.*, c.name as customer_name, c.email as customer_email
                FROM affiliates a
                LEFT JOIN customers c ON a.owner_customer_id = c.id
                WHERE a.id = ?
            `;
            const rows = await executeTenantQuery(dbName, query, [id]);
            if (rows.length > 0) {
                const affiliate = new Affiliate(rows[0]);
                return {
                    ...affiliate.toJSON(),
                    customer_name: rows[0].customer_name,
                    customer_email: rows[0].customer_email
                };
            }
            return null;
        } catch (error) {
            console.error('Affiliate getirme hatası:', error.message);
            throw new Error('Affiliate bulunamadı');
        }
    }

    /**
     * Affiliate koda göre affiliate getir
     */
    static async findByCode(dbName, affiliateCode) {
        try {
            const query = `
                SELECT a.*, c.name as customer_name, c.email as customer_email
                FROM affiliates a
                LEFT JOIN customers c ON a.owner_customer_id = c.id
                WHERE a.affiliate_code = ? AND a.status = 'active'
            `;
            const rows = await executeTenantQuery(dbName, query, [affiliateCode]);
            if (rows.length > 0) {
                const affiliate = new Affiliate(rows[0]);
                return {
                    ...affiliate.toJSON(),
                    customer_name: rows[0].customer_name,
                    customer_email: rows[0].customer_email
                };
            }
            return null;
        } catch (error) {
            console.error('Affiliate kod ile getirme hatası:', error.message);
            throw new Error('Affiliate bulunamadı');
        }
    }

    /**
     * Yeni affiliate kodu oluştur
     */
    static async createAffiliate(dbName, affiliateData) {
        try {
            // Validation
            if (!affiliateData.owner_customer_id) {
                throw new Error('Müşteri ID zorunludur');
            }

            // Müşterinin zaten bir affiliate kodu var mı kontrol et
            const existingAffiliate = await executeTenantQuery(
                dbName,
                'SELECT id FROM affiliates WHERE owner_customer_id = ?',
                [affiliateData.owner_customer_id]
            );

            if (existingAffiliate.length > 0) {
                throw new Error('Bu müşteri için zaten bir affiliate kodu mevcut');
            }

            // Müşterinin var olup olmadığını kontrol et
            const customer = await executeTenantQuery(
                dbName,
                'SELECT id, name FROM customers WHERE id = ?',
                [affiliateData.owner_customer_id]
            );

            if (customer.length === 0) {
                throw new Error('Geçerli bir müşteri seçiniz');
            }

            // Unique affiliate code oluştur
            const affiliateCode = affiliateData.affiliate_code || await this.generateUniqueCode(dbName);

            // Affiliate kodu zaten kullanılıyor mu kontrol et
            const existingCode = await executeTenantQuery(
                dbName,
                'SELECT id FROM affiliates WHERE affiliate_code = ?',
                [affiliateCode]
            );

            if (existingCode.length > 0) {
                throw new Error('Bu affiliate kodu zaten kullanılıyor');
            }

            const query = `
                INSERT INTO affiliates (
                    affiliate_code, owner_customer_id, commission_rate, status, 
                    created_at, updated_at
                ) VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
            `;
            
            const params = [
                affiliateCode,
                affiliateData.owner_customer_id,
                affiliateData.commission_rate || 5.00,
                affiliateData.status || 'active'
            ];

            const result = await executeTenantQuery(dbName, query, params);
            return await Affiliate.findById(dbName, result.insertId);
        } catch (error) {
            console.error('Affiliate oluşturma hatası:', error.message);
            throw error;
        }
    }

    /**
     * Affiliate güncelle
     */
    static async updateAffiliate(dbName, id, affiliateData) {
        try {
            // Önce affiliate'ın varlığını kontrol et
            const existing = await this.findById(dbName, id);
            if (!existing) {
                throw new Error('Güncellenecek affiliate bulunamadı');
            }

            // Affiliate code değişiyorsa, unique olduğunu kontrol et
            if (affiliateData.affiliate_code && affiliateData.affiliate_code !== existing.affiliate_code) {
                const existingCode = await executeTenantQuery(
                    dbName,
                    'SELECT id FROM affiliates WHERE affiliate_code = ? AND id != ?',
                    [affiliateData.affiliate_code, id]
                );

                if (existingCode.length > 0) {
                    throw new Error('Bu affiliate kodu zaten kullanılıyor');
                }
            }

            const query = `
                UPDATE affiliates SET 
                    affiliate_code = ?, commission_rate = ?, status = ?, 
                    updated_at = CURRENT_TIMESTAMP
                WHERE id = ?
            `;
            
            const params = [
                affiliateData.affiliate_code || existing.affiliate_code,
                affiliateData.commission_rate || existing.commission_rate,
                affiliateData.status || existing.status,
                id
            ];

            await executeTenantQuery(dbName, query, params);
            return await Affiliate.findById(dbName, id);
        } catch (error) {
            console.error('Affiliate güncelleme hatası:', error.message);
            throw error;
        }
    }

    /**
     * Affiliate sil
     */
    static async deleteAffiliate(dbName, id) {
        try {
            // Önce affiliate'ın varlığını kontrol et
            const existing = await this.findById(dbName, id);
            if (!existing) {
                throw new Error('Silinecek affiliate bulunamadı');
            }

            // Affiliate'a ait satışlar var mı kontrol et
            const sales = await executeTenantQuery(
                dbName,
                'SELECT COUNT(*) as count FROM affiliate_sales WHERE affiliate_id = ?',
                [id]
            );

            if (sales[0].count > 0) {
                throw new Error('Bu affiliate koduna ait satışlar bulunduğu için silinemez. Statüsünü pasif yapabilirsiniz.');
            }

            await executeTenantQuery(dbName, 'DELETE FROM affiliates WHERE id = ?', [id]);
            return true;
        } catch (error) {
            console.error('Affiliate silme hatası:', error.message);
            throw error;
        }
    }

    /**
     * Benzersiz affiliate kodu oluştur
     */
    static async generateUniqueCode(dbName, prefix = 'AFF') {
        let attempts = 0;
        const maxAttempts = 10;

        while (attempts < maxAttempts) {
            const randomSuffix = Math.random().toString(36).substring(2, 8).toUpperCase();
            const code = `${prefix}${randomSuffix}`;

            const existing = await executeTenantQuery(
                dbName,
                'SELECT id FROM affiliates WHERE affiliate_code = ?',
                [code]
            );

            if (existing.length === 0) {
                return code;
            }

            attempts++;
        }

        throw new Error('Benzersiz affiliate kodu oluşturulamadı');
    }

    /**
     * Affiliate istatistiklerini güncelle
     */
    static async updateAffiliateStats(dbName, affiliateId) {
        try {
            const statsQuery = `
                SELECT 
                    COUNT(*) as total_sales_count,
                    COALESCE(SUM(commission_amount), 0) as total_commission,
                    COALESCE(SUM(
                        SELECT o.total_amount 
                        FROM orders o 
                        JOIN affiliate_sales asa ON o.id = asa.order_id 
                        WHERE asa.affiliate_id = ?
                    ), 0) as total_sales
                FROM affiliate_sales 
                WHERE affiliate_id = ?
            `;

            const stats = await executeTenantQuery(dbName, statsQuery, [affiliateId, affiliateId]);
            
            if (stats.length > 0) {
                await executeTenantQuery(
                    dbName,
                    `UPDATE affiliates SET 
                        total_sales = ?, 
                        total_commission = ?, 
                        updated_at = CURRENT_TIMESTAMP 
                    WHERE id = ?`,
                    [stats[0].total_sales, stats[0].total_commission, affiliateId]
                );
            }

            return true;
        } catch (error) {
            console.error('Affiliate istatistik güncelleme hatası:', error.message);
            return false;
        }
    }
}

module.exports = Affiliate; 