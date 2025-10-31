const { executeTenantQuery } = require('../utils/db');

class Brand {
    constructor(data = {}) {
        this.id = data.id || null;
        this.name = data.name || '';
        this.slug = data.slug || '';
        this.description = data.description || '';
        this.logo = data.logo || null;
        this.status = data.status || 'active';
        this.created_at = data.created_at || null;
        this.updated_at = data.updated_at || null;
    }

    /**
     * String'den slug oluştur
     */
    static createSlug(str) {
        return str
            .toLowerCase()
            .replace(/[çğıöşü]/g, (match) => {
                const tr = { 'ç': 'c', 'ğ': 'g', 'ı': 'i', 'ö': 'o', 'ş': 's', 'ü': 'u' };
                return tr[match] || match;
            })
            .replace(/[^a-z0-9\s-]/g, '')
            .replace(/\s+/g, '-')
            .replace(/-+/g, '-')
            .trim('-');
    }

    /**
     * Tüm markaları getir
     */
    static async getAllBrands(dbName) {
        try {
            const query = `
                SELECT id, name, slug, description, logo, status, created_at, updated_at 
                FROM brands 
                ORDER BY created_at DESC
            `;
            const rows = await executeTenantQuery(dbName, query);
            return rows.map(row => new Brand(row));
        } catch (error) {
            console.error('Marka listesi getirme hatası:', error.message);
            throw new Error('Marka listesi alınamadı');
        }
    }

    /**
     * ID ile marka bul
     */
    static async findById(dbName, id) {
        try {
            const query = `
                SELECT id, name, slug, description, logo, status, created_at, updated_at 
                FROM brands 
                WHERE id = ?
            `;
            const rows = await executeTenantQuery(dbName, query, [id]);
            return rows.length > 0 ? new Brand(rows[0]) : null;
        } catch (error) {
            console.error('Marka bulma hatası:', error.message);
            throw new Error('Marka bulunamadı');
        }
    }

    /**
     * Slug ile marka bul
     */
    static async findBySlug(dbName, slug) {
        try {
            const query = `
                SELECT id, name, slug, description, logo, status, created_at, updated_at 
                FROM brands 
                WHERE slug = ?
            `;
            const rows = await executeTenantQuery(dbName, query, [slug]);
            return rows.length > 0 ? new Brand(rows[0]) : null;
        } catch (error) {
            console.error('Slug ile marka bulma hatası:', error.message);
            throw new Error('Slug ile marka bulunamadı');
        }
    }

    /**
     * Aktif markaları getir
     */
    static async getActiveBrands(dbName) {
        try {
            const query = `
                SELECT id, name, slug, description, logo, status, created_at, updated_at 
                FROM brands 
                WHERE status = 'active'
                ORDER BY name ASC
            `;
            const rows = await executeTenantQuery(dbName, query);
            return rows.map(row => new Brand(row));
        } catch (error) {
            console.error('Aktif marka listesi getirme hatası:', error.message);
            throw new Error('Aktif marka listesi alınamadı');
        }
    }

    /**
     * Yeni marka oluştur
     */
    static async createBrand(dbName, brandData) {
        try {
            const { name, description, logo, status = 'active' } = brandData;
            
            // Gerekli alanları kontrol et
            if (!name || name.trim() === '') {
                throw new Error('Marka adı zorunludur');
            }

            // Slug oluştur
            const slug = Brand.createSlug(name.trim());
            
            // Aynı slug'da marka var mı kontrol et
            const existingBrand = await Brand.findBySlug(dbName, slug);
            if (existingBrand) {
                throw new Error('Bu isimde bir marka zaten mevcut');
            }

            const query = `
                INSERT INTO brands (name, slug, description, logo, status) 
                VALUES (?, ?, ?, ?, ?)
            `;
            const result = await executeTenantQuery(dbName, query, [
                name.trim(),
                slug,
                description || '',
                logo || null,
                status
            ]);
            
            // Yeni oluşturulan markayı geri döndür
            return await Brand.findById(dbName, result.insertId);
        } catch (error) {
            console.error('Marka oluşturma hatası:', error.message);
            throw error;
        }
    }

    /**
     * Marka güncelle
     */
    static async updateBrand(dbName, id, brandData) {
        try {
            const { name, description, logo, status } = brandData;
            
            // Mevcut markayı kontrol et
            const existingBrand = await Brand.findById(dbName, id);
            if (!existingBrand) {
                throw new Error('Güncellenecek marka bulunamadı');
            }

            // İsim değişiyorsa slug'ı yeniden oluştur
            let slug = existingBrand.slug;
            if (name && name.trim() !== existingBrand.name) {
                slug = Brand.createSlug(name.trim());
                
                // Yeni slug'da başka marka var mı kontrol et
                const duplicateBrand = await Brand.findBySlug(dbName, slug);
                if (duplicateBrand && duplicateBrand.id !== parseInt(id)) {
                    throw new Error('Bu isimde bir marka zaten mevcut');
                }
            }

            const query = `
                UPDATE brands 
                SET name = ?, slug = ?, description = ?, logo = ?, status = ?, updated_at = CURRENT_TIMESTAMP
                WHERE id = ?
            `;
            
            await executeTenantQuery(dbName, query, [
                name ? name.trim() : existingBrand.name,
                slug,
                description !== undefined ? description : existingBrand.description,
                logo !== undefined ? logo : existingBrand.logo,
                status || existingBrand.status,
                id
            ]);
            
            // Güncellenmiş markayı geri döndür
            return await Brand.findById(dbName, id);
        } catch (error) {
            console.error('Marka güncelleme hatası:', error.message);
            throw error;
        }
    }

    /**
     * Marka durumunu değiştir
     */
    static async changeStatus(dbName, id, newStatus) {
        try {
            const validStatuses = ['active', 'inactive'];
            if (!validStatuses.includes(newStatus)) {
                throw new Error('Geçersiz status değeri');
            }

            const query = `UPDATE brands SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`;
            await executeTenantQuery(dbName, query, [newStatus, id]);
            return await Brand.findById(dbName, id);
        } catch (error) {
            console.error('Marka status güncelleme hatası:', error.message);
            throw new Error('Marka durumu güncellenemedi');
        }
    }

    /**
     * Marka sil (soft delete - status'u inactive yap)
     */
    static async deleteBrand(dbName, id) {
        try {
            const existingBrand = await Brand.findById(dbName, id);
            if (!existingBrand) {
                throw new Error('Silinecek marka bulunamadı');
            }

            // İlişkili ürünlerde brand_id'yi NULL yap
            await executeTenantQuery(dbName, 'UPDATE products SET brand_id = NULL WHERE brand_id = ?', [id]);

            // Markayı soft delete yap
            const query = `
                UPDATE brands 
                SET status = 'inactive', updated_at = CURRENT_TIMESTAMP
                WHERE id = ?
            `;
            
            await executeTenantQuery(dbName, query, [id]);
            return true;
        } catch (error) {
            console.error('Marka silme hatası:', error.message);
            throw error;
        }
    }

    /**
     * Marka hard delete (dikkatli kullanın!)
     */
    static async hardDeleteBrand(dbName, id) {
        try {
            const existingBrand = await Brand.findById(dbName, id);
            if (!existingBrand) {
                throw new Error('Silinecek marka bulunamadı');
            }

            // İlişkili ürünlerde brand_id'yi NULL yap
            await executeTenantQuery(dbName, 'UPDATE products SET brand_id = NULL WHERE brand_id = ?', [id]);

            // Markayı hard delete yap
            const query = `DELETE FROM brands WHERE id = ?`;
            await executeTenantQuery(dbName, query, [id]);
            
            return true;
        } catch (error) {
            console.error('Marka hard delete hatası:', error.message);
            throw error;
        }
    }

    /**
     * Marka sayısını getir
     */
    static async getCount(dbName, status = null) {
        try {
            let query = 'SELECT COUNT(*) as count FROM brands';
            let params = [];
            
            if (status) {
                query += ' WHERE status = ?';
                params.push(status);
            }
            
            const rows = await executeTenantQuery(dbName, query, params);
            return rows[0].count;
        } catch (error) {
            console.error('Marka sayısı getirme hatası:', error.message);
            return 0;
        }
    }

    /**
     * Markalarda arama yap
     */
    static async searchBrands(dbName, searchTerm) {
        try {
            const query = `
                SELECT id, name, slug, description, logo, status, created_at, updated_at 
                FROM brands 
                WHERE (name LIKE ? OR description LIKE ?)
                ORDER BY name ASC
            `;
            const searchPattern = `%${searchTerm}%`;
            const rows = await executeTenantQuery(dbName, query, [searchPattern, searchPattern]);
            return rows.map(row => new Brand(row));
        } catch (error) {
            console.error('Marka arama hatası:', error.message);
            throw new Error('Marka arama işlemi başarısız');
        }
    }

    /**
     * Marka istatistikleri
     */
    static async getBrandStats(dbName) {
        try {
            const statsQuery = `
                SELECT 
                    COUNT(*) as total_brands,
                    COUNT(CASE WHEN status = 'active' THEN 1 END) as active_brands,
                    COUNT(CASE WHEN status = 'inactive' THEN 1 END) as inactive_brands
                FROM brands
            `;
            
            const result = await executeTenantQuery(dbName, statsQuery);
            return result[0] || {};
        } catch (error) {
            console.error('Marka istatistikleri getirme hatası:', error.message);
            throw new Error('Marka istatistikleri alınamadı');
        }
    }

    /**
     * JSON formatına çevir
     */
    toJSON() {
        return {
            id: this.id,
            name: this.name,
            slug: this.slug,
            description: this.description,
            logo: this.logo,
            status: this.status,
            created_at: this.created_at,
            updated_at: this.updated_at
        };
    }
}

module.exports = Brand; 