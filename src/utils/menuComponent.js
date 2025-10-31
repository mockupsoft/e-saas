/**
 * Standardize Navigation Menu Component
 * Tüm tenant sayfalarında aynı menüyü kullanmak için
 */

/**
 * Standart navigasyon menüsü oluştur
 * @param {object} tenant - Tenant bilgileri
 * @param {string} activePage - Aktif sayfa (dashboard, products, orders, etc.)
 * @returns {string} HTML menü
 */
function generateNavigationMenu(tenant, activePage = '') {
    // tenant.domain zaten test1 formatında geliyor
    const tenantDomain = tenant.domain;
    
    return `
    <nav class="sidebar">
        <div class="sidebar-header">
            <div class="logo">
                <div class="logo-icon">🏪</div>
                <span class="logo-text">${tenant.name}</span>
            </div>
            <button class="sidebar-toggle">✕</button>
        </div>
        
        <div class="sidebar-nav">
            <div class="nav-section">
                <div class="nav-section-title">Ana Menü</div>
                <div class="nav-item">
                    <a href="/${tenantDomain}/dashboard" class="nav-link ${activePage === 'dashboard' ? 'active' : ''}">
                        <div class="nav-icon">📊</div>
                        <span class="nav-text">Dashboard</span>
                    </a>
                </div>
                <div class="nav-item">
                    <a href="/${tenantDomain}/products" class="nav-link ${activePage === 'products' ? 'active' : ''}">
                        <div class="nav-icon">📦</div>
                        <span class="nav-text">Ürün Yönetimi</span>
                    </a>
                </div>
                <div class="nav-item">
                    <a href="/${tenantDomain}/orders" class="nav-link ${activePage === 'orders' ? 'active' : ''}">
                        <div class="nav-icon">📋</div>
                        <span class="nav-text">Sipariş Yönetimi</span>
                    </a>
                </div>
                <div class="nav-item">
                    <a href="/${tenantDomain}/customers" class="nav-link ${activePage === 'customers' ? 'active' : ''}">
                        <div class="nav-icon">👥</div>
                        <span class="nav-text">Müşteri Yönetimi</span>
                    </a>
                </div>
                <div class="nav-item">
                    <a href="/${tenantDomain}/affiliates" class="nav-link ${activePage === 'affiliates' ? 'active' : ''}">
                        <div class="nav-icon">🤝</div>
                        <span class="nav-text">Affiliate Sistemi</span>
                    </a>
                </div>
            </div>
            
            <div class="nav-section">
                <div class="nav-section-title">Satış & Pazarlama</div>
                <div class="nav-item">
                    <a href="/${tenantDomain}/categories" class="nav-link ${activePage === 'categories' ? 'active' : ''}">
                        <div class="nav-icon">📁</div>
                        <span class="nav-text">Kategoriler</span>
                    </a>
                </div>
                <div class="nav-item">
                    <a href="/${tenantDomain}/coupons" class="nav-link ${activePage === 'coupons' ? 'active' : ''}">
                        <div class="nav-icon">🎫</div>
                        <span class="nav-text">Kupon Yönetimi</span>
                    </a>
                </div>
                <div class="nav-item">
                    <a href="/${tenantDomain}/affiliate-sales" class="nav-link ${activePage === 'affiliate-sales' ? 'active' : ''}">
                        <div class="nav-icon">💰</div>
                        <span class="nav-text">Komisyon Ödemeleri</span>
                    </a>
                </div>
                <div class="nav-item">
                    <a href="/${tenantDomain}/campaigns" class="nav-link ${activePage === 'campaigns' ? 'active' : ''}">
                        <div class="nav-icon">🎯</div>
                        <span class="nav-text">Kampanyalar</span>
                    </a>
                </div>
            </div>
            
            <div class="nav-section">
                <div class="nav-section-title">İçerik & Görünüm</div>
                <div class="nav-item">
                    <a href="/${tenantDomain}/inventory" class="nav-link ${activePage === 'inventory' ? 'active' : ''}">
                        <div class="nav-icon">📊</div>
                        <span class="nav-text">Stok Yönetimi</span>
                    </a>
                </div>
                <div class="nav-item">
                    <a href="/${tenantDomain}/themes" class="nav-link ${activePage === 'themes' ? 'active' : ''}">
                        <div class="nav-icon">🎨</div>
                        <span class="nav-text">Tema Ayarları</span>
                    </a>
                </div>
                <div class="nav-item">
                    <a href="/${tenantDomain}/pages" class="nav-link ${activePage === 'pages' ? 'active' : ''}">
                        <div class="nav-icon">📄</div>
                        <span class="nav-text">Sayfalar</span>
                    </a>
                </div>
            </div>
            
            <div class="nav-section">
                <div class="nav-section-title">Sistem</div>
                <div class="nav-item">
                    <a href="/${tenantDomain}/reports" class="nav-link ${activePage === 'reports' ? 'active' : ''}">
                        <div class="nav-icon">📈</div>
                        <span class="nav-text">Analytics</span>
                    </a>
                </div>
                <div class="nav-item">
                    <a href="/${tenantDomain}/settings" class="nav-link ${activePage === 'settings' ? 'active' : ''}">
                        <div class="nav-icon">⚙️</div>
                        <span class="nav-text">Ayarlar</span>
                    </a>
                </div>
                <div class="nav-item">
                    <a href="/${tenantDomain}/billing" class="nav-link ${activePage === 'billing' ? 'active' : ''}">
                        <div class="nav-icon">💳</div>
                        <span class="nav-text">Faturalandırma</span>
                    </a>
                </div>
                <div class="nav-item">
                    <a href="/${tenantDomain}/support" class="nav-link ${activePage === 'support' ? 'active' : ''}">
                        <div class="nav-icon">🎧</div>
                        <span class="nav-text">Destek</span>
                    </a>
                </div>
            </div>
        </div>
    </nav>
    `;
}

module.exports = {
    generateNavigationMenu
}; 