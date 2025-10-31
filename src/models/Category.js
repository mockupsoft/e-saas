const { executeTenantQuery } = require('../utils/db');

class Category {
    constructor(data = {}) {
        this.id = data.id || null;
        this.name = data.name || '';
        this.description = data.description || '';
        this.status = data.status || 'active';
        this.created_at = data.created_at || null;
        this.updated_at = data.updated_at || null;
    }

    /**
     * Tüm kategorileri getir
     */
    static async getAllCategories(dbName) {
        try {
            const query = `
                SELECT id, name, description, status, created_at, updated_at 
                FROM categories 
                ORDER BY created_at DESC
            `;
            const rows = await executeTenantQuery(dbName, query);
            return rows.map(row => new Category(row));
        } catch (error) {
            console.error('Kategori listesi getirme hatası:', error.message);
            throw new Error('Kategori listesi alınamadı');
        }
    }

    /**
     * ID ile kategori bul
     */
    static async findById(dbName, id) {
        try {
            const query = `
                SELECT id, name, description, status, created_at, updated_at 
                FROM categories 
                WHERE id = ?
            `;
            const rows = await executeTenantQuery(dbName, query, [id]);
            return rows.length > 0 ? new Category(rows[0]) : null;
        } catch (error) {
            console.error('Kategori bulma hatası:', error.message);
            throw new Error('Kategori bulunamadı');
        }
    }

    /**
     * Aktif kategorileri getir
     */
    static async getActiveCategories(dbName) {
        try {
            const query = `
                SELECT id, name, description, status, created_at, updated_at 
                FROM categories 
                WHERE status = 'active'
                ORDER BY name ASC
            `;
            const rows = await executeTenantQuery(dbName, query);
            return rows.map(row => new Category(row));
        } catch (error) {
            console.error('Aktif kategori listesi getirme hatası:', error.message);
            throw new Error('Aktif kategori listesi alınamadı');
        }
    }

    /**
     * İsme göre kategori ara
     */
    static async findByName(dbName, name) {
        try {
            const query = `
                SELECT id, name, description, status, created_at, updated_at 
                FROM categories 
                WHERE name = ?
            `;
            const rows = await executeTenantQuery(dbName, query, [name]);
            return rows.length > 0 ? new Category(rows[0]) : null;
        } catch (error) {
            console.error('İsme göre kategori bulma hatası:', error.message);
            throw new Error('İsme göre kategori bulunamadı');
        }
    }

    /**
     * Yeni kategori oluştur
     */
    static async createCategory(dbName, categoryData) {
        try {
            const { name, description, status = 'active' } = categoryData;
            
            // Gerekli alanları kontrol et
            if (!name || name.trim() === '') {
                throw new Error('Kategori adı zorunludur');
            }

            // Aynı isimde kategori var mı kontrol et
            const existingCategory = await Category.findByName(dbName, name.trim());
            if (existingCategory) {
                throw new Error('Bu isimde bir kategori zaten mevcut');
            }

            const query = `
                INSERT INTO categories (name, description, status) 
                VALUES (?, ?, ?)
            `;
            const result = await executeTenantQuery(dbName, query, [
                name.trim(),
                description || '',
                status
            ]);
            
            // Yeni oluşturulan kategoriyi geri döndür
            return await Category.findById(dbName, result.insertId);
        } catch (error) {
            console.error('Kategori oluşturma hatası:', error.message);
            throw error;
        }
    }

    /**
     * Kategori güncelle
     */
    static async updateCategory(dbName, id, updateData) {
        try {
            const { name, description, status } = updateData;
            
            // Mevcut kategoriyi kontrol et
            const existingCategory = await Category.findById(dbName, id);
            if (!existingCategory) {
                throw new Error('Güncellenecek kategori bulunamadı');
            }

            // Kategori adı değişiyorsa, aynı isimde başka kategori var mı kontrol et
            if (name && name.trim() !== existingCategory.name) {
                const duplicateCategory = await Category.findByName(dbName, name.trim());
                if (duplicateCategory && duplicateCategory.id !== parseInt(id)) {
                    throw new Error('Bu isimde bir kategori zaten mevcut');
                }
            }

            const query = `
                UPDATE categories 
                SET name = ?, description = ?, status = ?, updated_at = CURRENT_TIMESTAMP
                WHERE id = ?
            `;
            
            await executeTenantQuery(dbName, query, [
                name ? name.trim() : existingCategory.name,
                description !== undefined ? description : existingCategory.description,
                status || existingCategory.status,
                id
            ]);
            
            // Güncellenmiş kategoriyi geri döndür
            return await Category.findById(dbName, id);
        } catch (error) {
            console.error('Kategori güncelleme hatası:', error.message);
            throw error;
        }
    }

    /**
     * Kategori sil (soft delete - status'u inactive yap)
     */
    static async deleteCategory(dbName, id) {
        try {
            // Mevcut kategoriyi kontrol et
            const existingCategory = await Category.findById(dbName, id);
            if (!existingCategory) {
                throw new Error('Silinecek kategori bulunamadı');
            }

            const query = `
                UPDATE categories 
                SET status = 'inactive', updated_at = CURRENT_TIMESTAMP
                WHERE id = ?
            `;
            
            await executeTenantQuery(dbName, query, [id]);
            
            return true;
        } catch (error) {
            console.error('Kategori silme hatası:', error.message);
            throw error;
        }
    }

    /**
     * Kategori sayısını getir
     */
    static async getCount(dbName, status = null) {
        try {
            let query = 'SELECT COUNT(*) as count FROM categories';
            let params = [];
            
            if (status) {
                query += ' WHERE status = ?';
                params.push(status);
            }
            
            const rows = await executeTenantQuery(dbName, query, params);
            return rows[0].count;
        } catch (error) {
            console.error('Kategori sayısı getirme hatası:', error.message);
            return 0;
        }
    }

    /**
     * Kategorilerde arama yap
     */
    static async searchCategories(dbName, searchTerm) {
        try {
            const query = `
                SELECT id, name, description, status, created_at, updated_at 
                FROM categories 
                WHERE (name LIKE ? OR description LIKE ?)
                ORDER BY name ASC
            `;
            const searchPattern = `%${searchTerm}%`;
            const rows = await executeTenantQuery(dbName, query, [searchPattern, searchPattern]);
            return rows.map(row => new Category(row));
        } catch (error) {
            console.error('Kategori arama hatası:', error.message);
            throw new Error('Kategori arama işlemi başarısız');
        }
    }

    /**
     * Kategori hard delete (dikkatli kullanın!)
     */
    static async hardDeleteCategory(dbName, id) {
        try {
            // Mevcut kategoriyi kontrol et
            const existingCategory = await Category.findById(dbName, id);
            if (!existingCategory) {
                throw new Error('Silinecek kategori bulunamadı');
            }

            const query = `DELETE FROM categories WHERE id = ?`;
            await executeTenantQuery(dbName, query, [id]);
            
            return true;
        } catch (error) {
            console.error('Kategori hard delete hatası:', error.message);
            throw error;
        }
    }
}

module.exports = Category; 