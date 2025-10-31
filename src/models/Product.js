const { executeTenantQuery } = require('../utils/db');

class Product {
    constructor(data = {}) {
        this.id = data.id || null;
        this.name = data.name || '';
        this.description = data.description || '';
        this.price = data.price || 0.00;
        this.stock_quantity = data.stock_quantity || 0;
        this.brand_id = data.brand_id || null;
        this.status = data.status || 'active';
        this.created_at = data.created_at || null;
        this.updated_at = data.updated_at || null;
    }

    /**
     * Tüm ürünleri getir
     */
    static async getAllProducts(dbName) {
        try {
            const query = `
                SELECT id, name, description, price, stock_quantity, brand_id, status, created_at, updated_at 
                FROM products 
                ORDER BY created_at DESC
            `;
            const rows = await executeTenantQuery(dbName, query);
            return rows.map(row => new Product(row));
        } catch (error) {
            console.error('Ürün listesi getirme hatası:', error.message);
            throw new Error('Ürün listesi alınamadı');
        }
    }

    /**
     * ID ile ürün bul
     */
    static async findById(dbName, id) {
        try {
            const query = `
                SELECT id, name, description, price, stock_quantity, brand_id, status, created_at, updated_at 
                FROM products 
                WHERE id = ?
            `;
            const rows = await executeTenantQuery(dbName, query, [id]);
            return rows.length > 0 ? new Product(rows[0]) : null;
        } catch (error) {
            console.error('Ürün bulma hatası:', error.message);
            throw new Error('Ürün bulunamadı');
        }
    }

    /**
     * Aktif ürünleri getir
     */
    static async getActiveProducts(dbName) {
        try {
            const query = `
                SELECT id, name, description, price, stock_quantity, brand_id, status, created_at, updated_at 
                FROM products 
                WHERE status = 'active'
                ORDER BY name ASC
            `;
            const rows = await executeTenantQuery(dbName, query);
            return rows.map(row => new Product(row));
        } catch (error) {
            console.error('Aktif ürün listesi getirme hatası:', error.message);
            throw new Error('Aktif ürün listesi alınamadı');
        }
    }

    /**
     * Düşük stoklu ürünleri getir
     */
    static async getLowStockProducts(dbName, threshold = 10) {
        try {
            const query = `
                SELECT id, name, description, price, stock_quantity, brand_id, status, created_at, updated_at 
                FROM products 
                WHERE stock_quantity <= ? AND status = 'active'
                ORDER BY stock_quantity ASC
            `;
            const rows = await executeTenantQuery(dbName, query, [threshold]);
            return rows.map(row => new Product(row));
        } catch (error) {
            console.error('Düşük stoklu ürün listesi getirme hatası:', error.message);
            throw new Error('Düşük stoklu ürün listesi alınamadı');
        }
    }

    /**
     * Yeni ürün oluştur
     */
    static async createProduct(dbName, productData) {
        try {
            const { name, description, price, stock_quantity, brand_id, status = 'active' } = productData;
            
            // Gerekli alanları kontrol et
            if (!name || price === undefined) {
                throw new Error('Ürün adı ve fiyat alanları zorunludur');
            }

            // Fiyat validation
            const numericPrice = parseFloat(price);
            if (isNaN(numericPrice) || numericPrice < 0) {
                throw new Error('Geçerli bir fiyat giriniz');
            }

            // Stok validation
            const numericStock = parseInt(stock_quantity) || 0;
            if (numericStock < 0) {
                throw new Error('Stok miktarı negatif olamaz');
            }

            const query = `
                INSERT INTO products (name, description, price, stock_quantity, brand_id, status) 
                VALUES (?, ?, ?, ?, ?, ?)
            `;
            const result = await executeTenantQuery(dbName, query, [
                name.trim(), 
                description || '', 
                numericPrice, 
                numericStock, 
                brand_id || null,
                status
            ]);
            
            // Yeni oluşturulan ürünü geri döndür
            return await Product.findById(dbName, result.insertId);
        } catch (error) {
            console.error('Ürün oluşturma hatası:', error.message);
            throw error;
        }
    }

    /**
     * Ürün güncelle
     */
    static async updateProduct(dbName, id, productData) {
        try {
            const { name, description, price, stock_quantity, brand_id, status } = productData;
            
            // Önce mevcut ürünü al
            const existingProduct = await Product.findById(dbName, id);
            if (!existingProduct) {
                throw new Error('Güncellenecek ürün bulunamadı');
            }

            // Gerekli alanları kontrol et
            if (!name || price === undefined) {
                throw new Error('Ürün adı ve fiyat alanları zorunludur');
            }

            // Fiyat validation
            const numericPrice = parseFloat(price);
            if (isNaN(numericPrice) || numericPrice < 0) {
                throw new Error('Geçerli bir fiyat giriniz');
            }

            // Stok validation
            const numericStock = parseInt(stock_quantity);
            if (isNaN(numericStock) || numericStock < 0) {
                throw new Error('Geçerli bir stok miktarı giriniz');
            }

            // Stok kritik seviyede mi kontrol et
            const lowStockThreshold = 10;
            const oldStock = existingProduct.stock_quantity;
            
            const query = `
                UPDATE products 
                SET name = ?, description = ?, price = ?, stock_quantity = ?, brand_id = ?, status = ?, updated_at = CURRENT_TIMESTAMP
                WHERE id = ?
            `;
            await executeTenantQuery(dbName, query, [
                name.trim(), 
                description || '', 
                numericPrice, 
                numericStock, 
                brand_id || null,
                status, 
                id
            ]);
            
            // Güncellenmiş ürünü al
            const updatedProduct = await Product.findById(dbName, id);

            // Stok düşürüldü ve kritik seviyeye indilyse bildirim gönder
            if (numericStock <= lowStockThreshold && numericStock < oldStock && status === 'active') {
                try {
                    const NotificationService = require('../utils/notificationService');
                    // Tenant ID'yi veritabanı adından çıkar
                    const tenantId = parseInt(dbName.replace('saas_test', '').replace('saas_', '') || '1');
                    await NotificationService.notifyLowStock(dbName, tenantId, updatedProduct);
                } catch (notificationError) {
                    console.error('Stok bildirimi oluşturma hatası:', notificationError.message);
                    // Bildirim hatası ürün güncellemesini engellemez
                }
            }
            
            return updatedProduct;
        } catch (error) {
            console.error('Ürün güncelleme hatası:', error.message);
            throw error;
        }
    }

    /**
     * Ürün durumunu değiştir
     */
    static async changeStatus(dbName, id, newStatus) {
        try {
            const validStatuses = ['active', 'inactive'];
            if (!validStatuses.includes(newStatus)) {
                throw new Error('Geçersiz status değeri');
            }

            const query = `UPDATE products SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`;
            await executeTenantQuery(dbName, query, [newStatus, id]);
            return await Product.findById(dbName, id);
        } catch (error) {
            console.error('Ürün status güncelleme hatası:', error.message);
            throw new Error('Ürün durumu güncellenemedi');
        }
    }

    /**
     * Ürün stoğunu güncelle
     */
    static async updateStock(dbName, id, stockChange, operation = 'set') {
        try {
            const existingProduct = await Product.findById(dbName, id);
            if (!existingProduct) {
                throw new Error('Ürün bulunamadı');
            }

            let newStock;
            if (operation === 'add') {
                newStock = existingProduct.stock_quantity + parseInt(stockChange);
            } else if (operation === 'subtract') {
                newStock = existingProduct.stock_quantity - parseInt(stockChange);
            } else {
                newStock = parseInt(stockChange);
            }

            if (newStock < 0) {
                throw new Error('Stok miktarı negatif olamaz');
            }

            const query = `UPDATE products SET stock_quantity = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`;
            await executeTenantQuery(dbName, query, [newStock, id]);

            const updatedProduct = await Product.findById(dbName, id);

            // Stok kritik seviyede mi kontrol et
            const lowStockThreshold = 10;
            if (newStock <= lowStockThreshold && newStock < existingProduct.stock_quantity && updatedProduct.status === 'active') {
                try {
                    const NotificationService = require('../utils/notificationService');
                    // Tenant ID'yi veritabanı adından çıkar
                    const tenantId = parseInt(dbName.replace('saas_test', '').replace('saas_', '') || '1');
                    await NotificationService.notifyLowStock(dbName, tenantId, updatedProduct);
                } catch (notificationError) {
                    console.error('Stok bildirimi oluşturma hatası:', notificationError.message);
                }
            }

            return updatedProduct;
        } catch (error) {
            console.error('Stok güncelleme hatası:', error.message);
            throw error;
        }
    }

    /**
     * Ürün sil
     */
    static async deleteProduct(dbName, id) {
        try {
            const existingProduct = await Product.findById(dbName, id);
            if (!existingProduct) {
                throw new Error('Silinecek ürün bulunamadı');
            }

            await executeTenantQuery(dbName, 'DELETE FROM products WHERE id = ?', [id]);
            return true;
        } catch (error) {
            console.error('Ürün silme hatası:', error.message);
            throw error;
        }
    }

    /**
     * İstatistikleri getir
     */
    static async getProductStats(dbName) {
        try {
            const statsQuery = `
                SELECT 
                    COUNT(*) as total_products,
                    COUNT(CASE WHEN status = 'active' THEN 1 END) as active_products,
                    COUNT(CASE WHEN status = 'inactive' THEN 1 END) as inactive_products,
                    COUNT(CASE WHEN stock_quantity <= 10 AND status = 'active' THEN 1 END) as low_stock_products,
                    COUNT(CASE WHEN stock_quantity = 0 AND status = 'active' THEN 1 END) as out_of_stock_products,
                    COALESCE(SUM(price * stock_quantity), 0) as total_inventory_value,
                    COALESCE(AVG(price), 0) as average_price
                FROM products
            `;
            
            const result = await executeTenantQuery(dbName, statsQuery);
            return result[0] || {};
        } catch (error) {
            console.error('Ürün istatistikleri getirme hatası:', error.message);
            throw new Error('Ürün istatistikleri alınamadı');
        }
    }

    /**
     * Ürün ara
     */
    static async searchProducts(dbName, searchTerm) {
        try {
            const query = `
                SELECT id, name, description, price, stock_quantity, brand_id, status, created_at, updated_at 
                FROM products 
                WHERE (name LIKE ? OR description LIKE ?) AND status = 'active'
                ORDER BY name ASC
            `;
            const searchPattern = `%${searchTerm}%`;
            const rows = await executeTenantQuery(dbName, query, [searchPattern, searchPattern]);
            return rows.map(row => new Product(row));
        } catch (error) {
            console.error('Ürün arama hatası:', error.message);
            throw new Error('Ürün arama işlemi başarısız');
        }
    }

    /**
     * JSON formatına çevir
     */
    toJSON() {
        return {
            id: this.id,
            name: this.name,
            description: this.description,
            price: parseFloat(this.price),
            stock_quantity: this.stock_quantity,
            brand_id: this.brand_id,
            status: this.status,
            created_at: this.created_at,
            updated_at: this.updated_at,
            is_low_stock: this.stock_quantity <= 10,
            is_out_of_stock: this.stock_quantity === 0
        };
    }
}

module.exports = Product; 