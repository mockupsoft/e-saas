const { executeTenantQuery } = require('../utils/db');

/**
 * Order Controller
 * Handles all order operations with filtering, sorting, pagination, and status updates
 */
class OrderController {
    /**
     * GET /api/orders - List orders with filtering, sorting, pagination
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
            const sortColumn = ['customer_name', 'total_amount', 'status', 'created_at'].includes(sort) 
                ? sort 
                : 'created_at';
            const sortOrder = order.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

            // Build WHERE clause
            const whereConditions = [];
            const whereParams = [];

            // Status filter
            if (status && ['pending', 'paid', 'processing', 'shipped', 'delivered', 'cancelled'].includes(status)) {
                whereConditions.push('status = ?');
                whereParams.push(status);
            }

            // Customer name search
            if (q && q.trim()) {
                whereConditions.push('customer_name LIKE ?');
                whereParams.push(`%${q.trim()}%`);
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
            const countQuery = `SELECT COUNT(*) as total FROM orders ${whereClause}`;
            const countResult = await executeTenantQuery(dbName, countQuery, whereParams);
            const total = countResult[0]?.total || 0;

            // Get orders
            // Check if order_no column exists, if not use id as order_no
            const ordersQuery = `
                SELECT 
                    id,
                    customer_name,
                    customer_email,
                    total_amount as total,
                    status,
                    created_at,
                    updated_at
                FROM orders 
                ${whereClause}
                ORDER BY ${sortColumn} ${sortOrder}
                LIMIT ? OFFSET ?
            `;

            const allParams = [...whereParams, perPage, offset];
            const orders = await executeTenantQuery(dbName, ordersQuery, allParams);

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
        console.log('🔍 HTMX Check:', req.headers['hx-request'], typeof req.headers['hx-request']);
        if (req.headers['hx-request']) {
                // Prepare rows with rendered values
                const renderedRows = orders.map(order => {
                    const statusMap = {
                        'pending': { text: 'Beklemede', class: 'status-pending' },
                        'paid': { text: 'Ödendi', class: 'status-active' },
                        'processing': { text: 'İşleniyor', class: 'status-info' },
                        'shipped': { text: 'Kargoda', class: 'status-info' },
                        'delivered': { text: 'Teslim Edildi', class: 'status-active' },
                        'cancelled': { text: 'İptal Edildi', class: 'status-inactive' }
                    };
                    const statusInfo = statusMap[order.status] || { text: order.status, class: 'status-default' };
                    
                    return {
                        ...order,
                        _rendered: {
                            _total: `₺${Number(order.total || 0).toFixed(2)}`,
                            _status: `<span class="status-badge ${statusInfo.class}">${statusInfo.text}</span>`,
                            _created_at: new Date(order.created_at).toLocaleDateString('tr-TR')
                        }
                    };
                });
                
                return res.render('partials/components/table', {
                    id: 'ordersTable',
                    headers: [
                        { text: 'ID', key: 'id', sortable: true },
                        { text: 'Müşteri', key: 'customer_name', sortable: true },
                        { text: 'Tutar', key: 'total', sortable: true, renderKey: '_total' },
                        { text: 'Durum', key: 'status', renderKey: '_status' },
                        { text: 'Tarih', key: 'created_at', sortable: true, renderKey: '_created_at' }
                    ],
                    actions: [
                        { icon: '👁️', text: 'Görüntüle', action: 'view-order', class: 'btn-outline', dataKey: 'id', dataValue: 'id' },
                        { icon: '✏️', text: 'Durum Değiştir', action: 'update-status', class: 'btn-outline', dataKey: 'id', dataValue: 'id' }
                    ],
                    rows: renderedRows,
                    pagination: pagination,
                    emptyMessage: 'Henüz sipariş bulunmuyor',
                    sortable: true,
                    searchable: true,
                    paginated: true
                });
            }

            res.json({
                success: true,
                data: {
                    orders,
                    pagination
                },
                message: 'Siparişler başarıyla getirildi',
                timestamp: new Date().toISOString()
            });
        } catch (error) {
            console.error('Order list error:', error);
            res.status(500).json({
                success: false,
                message: 'Siparişler getirilemedi',
                error: error.message,
                timestamp: new Date().toISOString()
            });
        }
    }

    /**
     * GET /api/orders/:id - Get single order with details
     */
    static async getById(req, res) {
        try {
            const dbName = req.db_name;
            const { id } = req.params;

            const orders = await executeTenantQuery(
                dbName,
                `SELECT * FROM orders WHERE id = ?`,
                [id]
            );

            if (orders.length === 0) {
                return res.status(404).json({
                    success: false,
                    message: 'Sipariş bulunamadı',
                    timestamp: new Date().toISOString()
                });
            }

            res.json({
                success: true,
                data: { order: orders[0] },
                message: 'Sipariş başarıyla getirildi',
                timestamp: new Date().toISOString()
            });
        } catch (error) {
            console.error('Order get error:', error);
            res.status(500).json({
                success: false,
                message: 'Sipariş getirilemedi',
                error: error.message,
                timestamp: new Date().toISOString()
            });
        }
    }

    /**
     * PUT /api/orders/:id/status - Update order status
     */
    static async updateStatus(req, res) {
        try {
            const dbName = req.db_name;
            const { id } = req.params;
            const { status } = req.body;

            // Validation
            const validStatuses = ['pending', 'paid', 'processing', 'shipped', 'delivered', 'cancelled'];
            if (!status || !validStatuses.includes(status)) {
                return res.status(400).json({
                    success: false,
                    message: `Geçerli bir durum seçiniz: ${validStatuses.join(', ')}`,
                    timestamp: new Date().toISOString()
                });
            }

            // Check if order exists
            const existing = await executeTenantQuery(
                dbName,
                'SELECT id, status FROM orders WHERE id = ?',
                [id]
            );

            if (existing.length === 0) {
                return res.status(404).json({
                    success: false,
                    message: 'Sipariş bulunamadı',
                    timestamp: new Date().toISOString()
                });
            }

            // Update status
            await executeTenantQuery(
                dbName,
                'UPDATE orders SET status = ?, updated_at = NOW() WHERE id = ?',
                [status, id]
            );

            // Get updated order
            const orders = await executeTenantQuery(
                dbName,
                `SELECT * FROM orders WHERE id = ?`,
                [id]
            );

            res.json({
                success: true,
                data: { order: orders[0] },
                message: 'Sipariş durumu başarıyla güncellendi',
                timestamp: new Date().toISOString()
            });
        } catch (error) {
            console.error('Order status update error:', error);
            res.status(500).json({
                success: false,
                message: 'Sipariş durumu güncellenemedi',
                error: error.message,
                timestamp: new Date().toISOString()
            });
        }
    }

    /**
     * PUT /api/orders/:id - Update order (full update)
     */
    static async update(req, res) {
        try {
            const dbName = req.db_name;
            const { id } = req.params;
            const updateData = req.body;

            // Check if order exists
            const existing = await executeTenantQuery(
                dbName,
                'SELECT id FROM orders WHERE id = ?',
                [id]
            );

            if (existing.length === 0) {
                return res.status(404).json({
                    success: false,
                    message: 'Sipariş bulunamadı',
                    timestamp: new Date().toISOString()
                });
            }

            // Build update query dynamically
            const updateFields = [];
            const updateParams = [];

            const allowedFields = ['customer_name', 'customer_email', 'total_amount', 'status'];
            
            allowedFields.forEach(field => {
                if (updateData[field] !== undefined) {
                    updateFields.push(`${field} = ?`);
                    updateParams.push(updateData[field]);
                }
            });

            if (updateFields.length === 0) {
                return res.status(400).json({
                    success: false,
                    message: 'Güncellenecek alan belirtilmedi',
                    timestamp: new Date().toISOString()
                });
            }

            updateFields.push('updated_at = NOW()');
            updateParams.push(id);

            // Update order
            await executeTenantQuery(
                dbName,
                `UPDATE orders SET ${updateFields.join(', ')} WHERE id = ?`,
                updateParams
            );

            // Get updated order
            const orders = await executeTenantQuery(
                dbName,
                `SELECT * FROM orders WHERE id = ?`,
                [id]
            );

            res.json({
                success: true,
                data: { order: orders[0] },
                message: 'Sipariş başarıyla güncellendi',
                timestamp: new Date().toISOString()
            });
        } catch (error) {
            console.error('Order update error:', error);
            res.status(500).json({
                success: false,
                message: 'Sipariş güncellenemedi',
                error: error.message,
                timestamp: new Date().toISOString()
            });
        }
    }
}

module.exports = OrderController;

