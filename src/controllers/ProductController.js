const { executeTenantQuery } = require('../utils/db');

/**
 * Product Controller
 * Handles all product CRUD operations with server-side filtering, sorting, and pagination
 */
class ProductController {
    /**
     * GET /api/products - List products with filtering, sorting, pagination
     */
    static async getAll(req, res) {
        try {
            const dbName = req.db_name;
            if (!dbName) {
                return res.status(400).json({
                    success: false,
                    message: 'Tenant database bilgisi bulunamadı',
                    timestamp: new Date().toISOString()
                });
            }

            // Query parameters
            const {
                page = 1,
                limit = 10,
                sort = 'created_at',
                order = 'DESC',
                q = '', // Search query
                status = '', // Filter by status
                created_from = '', // Date range start
                created_to = '', // Date range end
                created_preset = '' // Date preset selector
            } = req.query;
            
            console.log('📅 Date filter params:', { created_preset, created_from, created_to });

            const offset = (parseInt(page) - 1) * parseInt(limit);
            const perPage = parseInt(limit);
            const sortColumn = ['name', 'price', 'stock_quantity', 'status', 'created_at'].includes(sort) ? sort : 'created_at';
            const sortOrder = order.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

            // Build WHERE clause
            const whereConditions = [];
            const whereParams = [];

            // Status filter
            if (status && ['active', 'inactive'].includes(status)) {
                whereConditions.push('status = ?');
                whereParams.push(status);
            }

            // Search query (name, SKU, description)
            if (q && q.trim()) {
                whereConditions.push('(name LIKE ? OR description LIKE ?)');
                const searchTerm = `%${q.trim()}%`;
                whereParams.push(searchTerm, searchTerm);
            }

            // Date range filter - only add if values are not empty
            if (created_from && created_from.trim() !== '') {
                whereConditions.push('DATE(created_at) >= ?');
                whereParams.push(created_from.trim());
            }
            if (created_to && created_to.trim() !== '') {
                whereConditions.push('DATE(created_at) <= ?');
                whereParams.push(created_to.trim());
            }

            const whereClause = whereConditions.length > 0 
                ? 'WHERE ' + whereConditions.join(' AND ')
                : '';

            // Get total count
            const countQuery = `SELECT COUNT(*) as total FROM products ${whereClause}`;
            const countResult = await executeTenantQuery(dbName, countQuery, whereParams);
            const total = countResult[0]?.total || 0;

            // Get products (check if sku column exists)
            // Try to get SKU if exists, otherwise use NULL
            const productsQuery = `
                SELECT 
                    id, name, description, price, stock_quantity as stock, 
                    status, created_at, updated_at
                FROM products 
                ${whereClause}
                ORDER BY ${sortColumn} ${sortOrder}
                LIMIT ? OFFSET ?
            `;

            const allParams = [...whereParams, perPage, offset];
            const products = await executeTenantQuery(dbName, productsQuery, allParams);

            // Calculate pagination
            const totalPages = Math.ceil(total / perPage);
            
            const pagination = {
                currentPage: parseInt(page),
                perPage,
                total,
                totalPages,
                hasNext: parseInt(page) < totalPages,
                hasPrev: parseInt(page) > 1
            };

        // If HTMX request, render table component HTML  
        // Debug: Check all possible HTMX headers
        const isHTMX = req.headers['hx-request'] || req.headers['HX-Request'] || req.headers['x-requested-with'] === 'XMLHttpRequest';
        console.log('🔍 HTMX Headers Check:', isHTMX);
        
        if (isHTMX) {
            // Prepare rows with rendered values
            const renderedRows = products.map(product => ({
                ...product,
                _rendered: {
                    _price: `₺${Number(product.price || 0).toFixed(2)}`,
                    _status: `<span class="status-badge ${product.status === 'active' ? 'status-active' : 'status-inactive'}">${product.status === 'active' ? 'Aktif' : 'Pasif'}</span>`
                }
            }));
            
            return res.render('partials/components/table', {
                id: 'productsTable',
                headers: [
                    { text: 'Ad', key: 'name', sortable: true },
                    { text: 'Fiyat', key: 'price', sortable: true, renderKey: '_price' },
                    { text: 'Stok', key: 'stock_quantity', sortable: true },
                    { text: 'Durum', key: 'status', renderKey: '_status' }
                ],
                actions: [
                    { icon: '✏️', text: 'Düzenle', action: 'edit-product', class: 'btn-outline' },
                    { icon: '🗑️', text: 'Sil', action: 'delete-product', class: 'btn-danger' }
                ],
                rows: renderedRows,
                pagination: pagination,
                emptyMessage: 'Henüz ürün eklenmemiş',
                sortable: true,
                searchable: true,
                paginated: true
            });
        }

            res.json({
                success: true,
                data: {
                    products,
                    pagination
                },
                message: 'Ürünler başarıyla getirildi',
                timestamp: new Date().toISOString()
            });
        } catch (error) {
            console.error('Product list error:', error);
            res.status(500).json({
                success: false,
                message: 'Ürünler getirilemedi',
                error: error.message,
                timestamp: new Date().toISOString()
            });
        }
    }

    /**
     * GET /api/products/:id - Get single product
     */
    static async getById(req, res) {
        try {
            const dbName = req.db_name;
            const { id } = req.params;

            const products = await executeTenantQuery(
                dbName,
                'SELECT * FROM products WHERE id = ?',
                [id]
            );

            if (products.length === 0) {
                return res.status(404).json({
                    success: false,
                    message: 'Ürün bulunamadı',
                    timestamp: new Date().toISOString()
                });
            }

            res.json({
                success: true,
                data: { product: products[0] },
                message: 'Ürün başarıyla getirildi',
                timestamp: new Date().toISOString()
            });
        } catch (error) {
            console.error('Product get error:', error);
            res.status(500).json({
                success: false,
                message: 'Ürün getirilemedi',
                error: error.message,
                timestamp: new Date().toISOString()
            });
        }
    }

    /**
     * POST /api/products - Create new product
     */
    static async create(req, res) {
        try {
            const dbName = req.db_name;
            const { name, description, price, stock_quantity, status = 'active' } = req.body;

            // Validation
            if (!name || !name.trim()) {
                return res.status(400).json({
                    success: false,
                    message: 'Ürün adı zorunludur',
                    timestamp: new Date().toISOString()
                });
            }

            if (price === undefined || price === null || isNaN(parseFloat(price))) {
                return res.status(400).json({
                    success: false,
                    message: 'Geçerli bir fiyat giriniz',
                    timestamp: new Date().toISOString()
                });
            }

            // Insert product
            const result = await executeTenantQuery(
                dbName,
                `INSERT INTO products (name, description, price, stock_quantity, status, created_at, updated_at) 
                 VALUES (?, ?, ?, ?, ?, NOW(), NOW())`,
                [
                    name.trim(),
                    description || null,
                    parseFloat(price),
                    parseInt(stock_quantity) || 0,
                    status
                ]
            );

            // Get created product
            const products = await executeTenantQuery(
                dbName,
                'SELECT * FROM products WHERE id = ?',
                [result.insertId]
            );

            res.status(201).json({
                success: true,
                data: { product: products[0] },
                message: 'Ürün başarıyla oluşturuldu',
                timestamp: new Date().toISOString()
            });
        } catch (error) {
            console.error('Product create error:', error);
            res.status(500).json({
                success: false,
                message: 'Ürün oluşturulamadı',
                error: error.message,
                timestamp: new Date().toISOString()
            });
        }
    }

    /**
     * PUT /api/products/:id - Update product
     */
    static async update(req, res) {
        try {
            const dbName = req.db_name;
            const { id } = req.params;
            const { name, description, price, stock_quantity, status } = req.body;

            // Check if product exists
            const existing = await executeTenantQuery(
                dbName,
                'SELECT id FROM products WHERE id = ?',
                [id]
            );

            if (existing.length === 0) {
                return res.status(404).json({
                    success: false,
                    message: 'Ürün bulunamadı',
                    timestamp: new Date().toISOString()
                });
            }

            // Validation
            if (name !== undefined && (!name || !name.trim())) {
                return res.status(400).json({
                    success: false,
                    message: 'Ürün adı boş olamaz',
                    timestamp: new Date().toISOString()
                });
            }

            // Build update query dynamically
            const updateFields = [];
            const updateParams = [];

            if (name !== undefined) {
                updateFields.push('name = ?');
                updateParams.push(name.trim());
            }
            if (description !== undefined) {
                updateFields.push('description = ?');
                updateParams.push(description || null);
            }
            if (price !== undefined) {
                if (isNaN(parseFloat(price))) {
                    return res.status(400).json({
                        success: false,
                        message: 'Geçerli bir fiyat giriniz',
                        timestamp: new Date().toISOString()
                    });
                }
                updateFields.push('price = ?');
                updateParams.push(parseFloat(price));
            }
            if (stock_quantity !== undefined) {
                updateFields.push('stock_quantity = ?');
                updateParams.push(parseInt(stock_quantity) || 0);
            }
            if (status !== undefined && ['active', 'inactive'].includes(status)) {
                updateFields.push('status = ?');
                updateParams.push(status);
            }

            updateFields.push('updated_at = NOW()');
            updateParams.push(id);

            // Update product
            await executeTenantQuery(
                dbName,
                `UPDATE products SET ${updateFields.join(', ')} WHERE id = ?`,
                updateParams
            );

            // Get updated product
            const products = await executeTenantQuery(
                dbName,
                'SELECT * FROM products WHERE id = ?',
                [id]
            );

            res.json({
                success: true,
                data: { product: products[0] },
                message: 'Ürün başarıyla güncellendi',
                timestamp: new Date().toISOString()
            });
        } catch (error) {
            console.error('Product update error:', error);
            res.status(500).json({
                success: false,
                message: 'Ürün güncellenemedi',
                error: error.message,
                timestamp: new Date().toISOString()
            });
        }
    }

    /**
     * DELETE /api/products/:id - Soft delete product
     */
    static async delete(req, res) {
        try {
            const dbName = req.db_name;
            const { id } = req.params;

            // Check if product exists
            const existing = await executeTenantQuery(
                dbName,
                'SELECT id, name FROM products WHERE id = ?',
                [id]
            );

            if (existing.length === 0) {
                return res.status(404).json({
                    success: false,
                    message: 'Ürün bulunamadı',
                    timestamp: new Date().toISOString()
                });
            }

            // Soft delete (status = 'inactive')
            await executeTenantQuery(
                dbName,
                'UPDATE products SET status = ?, updated_at = NOW() WHERE id = ?',
                ['inactive', id]
            );

            res.json({
                success: true,
                message: 'Ürün başarıyla silindi',
                timestamp: new Date().toISOString()
            });
        } catch (error) {
            console.error('Product delete error:', error);
            res.status(500).json({
                success: false,
                message: 'Ürün silinemedi',
                error: error.message,
                timestamp: new Date().toISOString()
            });
        }
    }
}

module.exports = ProductController;

