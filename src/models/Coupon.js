const { executeTenantQuery } = require('../utils/db');

class Coupon {
    constructor(data = {}) {
        this.id = data.id || null;
        this.code = data.code || '';
        this.type = data.type || 'percentage';
        this.amount = data.amount || 0;
        this.min_cart_total = data.min_cart_total || 0;
        this.expires_at = data.expires_at || null;
        this.status = data.status || 'active';
        this.created_at = data.created_at || null;
        this.updated_at = data.updated_at || null;
    }

    static async getAllCoupons(dbName) {
        try {
            const query = `
                SELECT id, code, type, amount, min_cart_total, expires_at, status, created_at, updated_at 
                FROM coupons 
                ORDER BY created_at DESC
            `;
            const rows = await executeTenantQuery(dbName, query);
            return rows.map(row => new Coupon(row));
        } catch (error) {
            console.error('Kupon listesi getirme hatası:', error.message);
            throw new Error('Kupon listesi alınamadı');
        }
    }

    static async findById(dbName, id) {
        try {
            const query = `
                SELECT id, code, type, amount, min_cart_total, expires_at, status, created_at, updated_at 
                FROM coupons 
                WHERE id = ?
            `;
            const rows = await executeTenantQuery(dbName, query, [id]);
            return rows.length > 0 ? new Coupon(rows[0]) : null;
        } catch (error) {
            console.error('Kupon bulma hatası:', error.message);
            throw new Error('Kupon bulunamadı');
        }
    }

    static async findByCode(dbName, code) {
        try {
            const query = `
                SELECT id, code, type, amount, min_cart_total, expires_at, status, created_at, updated_at 
                FROM coupons 
                WHERE code = ?
            `;
            const rows = await executeTenantQuery(dbName, query, [code]);
            return rows.length > 0 ? new Coupon(rows[0]) : null;
        } catch (error) {
            console.error('Kod ile kupon bulma hatası:', error.message);
            throw new Error('Kod ile kupon bulunamadı');
        }
    }

    static async createCoupon(dbName, couponData) {
        try {
            const { code, type, amount, min_cart_total, expires_at, status = 'active' } = couponData;
            
            if (!code || !type || !amount) {
                throw new Error('Kod, tip ve tutar alanları zorunludur');
            }

            const validTypes = ['percentage', 'fixed'];
            if (!validTypes.includes(type)) {
                throw new Error('Geçersiz kupon tipi');
            }

            const numericAmount = parseFloat(amount);
            if (isNaN(numericAmount) || numericAmount <= 0) {
                throw new Error('Geçerli bir tutar giriniz');
            }

            if (type === 'percentage' && numericAmount > 100) {
                throw new Error('Yüzde indirim 100\'den fazla olamaz');
            }

            const existingCoupon = await Coupon.findByCode(dbName, code);
            if (existingCoupon) {
                throw new Error('Bu kupon kodu zaten kullanımda');
            }

            const query = `
                INSERT INTO coupons (code, type, amount, min_cart_total, expires_at, status) 
                VALUES (?, ?, ?, ?, ?, ?)
            `;
            const result = await executeTenantQuery(dbName, query, [
                code.toUpperCase().trim(), 
                type, 
                numericAmount, 
                parseFloat(min_cart_total) || 0, 
                expires_at || null, 
                status
            ]);
            
            return await Coupon.findById(dbName, result.insertId);
        } catch (error) {
            console.error('Kupon oluşturma hatası:', error.message);
            throw error;
        }
    }

    static async updateCoupon(dbName, id, updateData) {
        try {
            const { code, type, amount, min_cart_total, expires_at, status } = updateData;
            
            if (!code || !type || !amount) {
                throw new Error('Kod, tip ve tutar alanları zorunludur');
            }

            const validTypes = ['percentage', 'fixed'];
            if (!validTypes.includes(type)) {
                throw new Error('Geçersiz kupon tipi');
            }

            const numericAmount = parseFloat(amount);
            if (isNaN(numericAmount) || numericAmount <= 0) {
                throw new Error('Geçerli bir tutar giriniz');
            }

            if (type === 'percentage' && numericAmount > 100) {
                throw new Error('Yüzde indirim 100\'den fazla olamaz');
            }

            const existingCoupon = await Coupon.findByCode(dbName, code);
            if (existingCoupon && existingCoupon.id !== parseInt(id)) {
                throw new Error('Bu kupon kodu zaten kullanımda');
            }

            const query = `
                UPDATE coupons 
                SET code = ?, type = ?, amount = ?, min_cart_total = ?, expires_at = ?, status = ?, updated_at = CURRENT_TIMESTAMP
                WHERE id = ?
            `;
            await executeTenantQuery(dbName, query, [
                code.toUpperCase().trim(), 
                type, 
                numericAmount, 
                parseFloat(min_cart_total) || 0, 
                expires_at || null, 
                status, 
                id
            ]);
            
            return await Coupon.findById(dbName, id);
        } catch (error) {
            console.error('Kupon güncelleme hatası:', error.message);
            throw error;
        }
    }

    static async deleteCoupon(dbName, id) {
        try {
            const query = `DELETE FROM coupons WHERE id = ?`;
            const result = await executeTenantQuery(dbName, query, [id]);
            return result.affectedRows > 0;
        } catch (error) {
            console.error('Kupon silme hatası:', error.message);
            throw new Error('Kupon silinemedi');
        }
    }

    static async getCount(dbName) {
        try {
            const query = `SELECT COUNT(*) as count FROM coupons`;
            const rows = await executeTenantQuery(dbName, query);
            return rows[0].count;
        } catch (error) {
            console.error('Kupon sayısı getirme hatası:', error.message);
            return 0;
        }
    }

    static async getActiveCount(dbName) {
        try {
            const query = `SELECT COUNT(*) as count FROM coupons WHERE status = 'active' AND (expires_at IS NULL OR expires_at > NOW())`;
            const rows = await executeTenantQuery(dbName, query);
            return rows[0].count;
        } catch (error) {
            console.error('Aktif kupon sayısı getirme hatası:', error.message);
            return 0;
        }
    }

    isValid() {
        if (this.status !== 'active') {
            return false;
        }
        
        if (this.expires_at && new Date(this.expires_at) <= new Date()) {
            return false;
        }
        
        return true;
    }

    toJSON() {
        return {
            id: this.id,
            code: this.code,
            type: this.type,
            amount: this.amount,
            min_cart_total: this.min_cart_total,
            expires_at: this.expires_at,
            status: this.status,
            created_at: this.created_at,
            updated_at: this.updated_at,
            is_valid: this.isValid(),
            is_expired: this.expires_at && new Date(this.expires_at) <= new Date()
        };
    }
}

module.exports = Coupon;
