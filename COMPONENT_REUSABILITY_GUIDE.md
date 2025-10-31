# 🧩 Component Reusability Rehberi - SaaS E-Ticaret Platformu

Bu rehber, projedeki tekrarlayan UI component'larının tek yerden yönetilmesi ve yeniden kullanılabilirliği için best practice'leri içerir.

## 🎯 Component Sistemi Genel Bakış

### 📁 Component Organizasyonu
```
views/partials/components/
├── README.md              # Component dokümantasyonu
├── include.ejs           # Helper functions
├── modal.ejs             # Modal component
├── table.ejs             # Table component
├── form-group.ejs        # Form input component
├── button.ejs            # Button component
├── status-badge.ejs      # Status indicator
├── pagination.ejs        # Pagination component
├── breadcrumb.ejs        # Breadcrumb navigation
├── alert.ejs            # Alert/notification component
├── loading.ejs          # Loading spinner
├── empty-state.ejs      # Empty state component
└── card.ejs             # Card wrapper component
```

### 🎨 Layout Components
```
views/partials/
├── components/           # Reusable UI components
├── layouts/
│   ├── base.ejs         # Base HTML template
│   ├── dashboard.ejs    # Dashboard layout
│   └── auth.ejs         # Authentication layout
├── navigation/
│   ├── admin-sidebar.ejs    # Admin sidebar
│   ├── tenant-sidebar.ejs   # Tenant sidebar
│   ├── top-bar.ejs         # Top navigation bar
│   └── mobile-menu.ejs     # Mobile menu
└── shared/
    ├── head.ejs         # Common head tags
    ├── scripts.ejs      # Common scripts
    └── footer.ejs       # Footer component
```

## 🏗️ Base Layout System

### 1. Base Template (views/partials/layouts/base.ejs)
```ejs
<!DOCTYPE html>
<html lang="tr">
<head>
    <%- include('../shared/head', { 
        title: title || 'SaaS Platform',
        description: description || 'Multi-tenant e-ticaret platformu',
        additionalCSS: additionalCSS || []
    }) %>
</head>
<body class="<%= bodyClass || '' %>">
    <!-- Page Content -->
    <%- content %>
    
    <!-- Common Scripts -->
    <%- include('../shared/scripts', { 
        additionalJS: additionalJS || []
    }) %>
</body>
</html>
```

### 2. Dashboard Layout (views/partials/layouts/dashboard.ejs)
```ejs
<%- include('./base', { 
    title: title,
    bodyClass: `dashboard ${userType || 'tenant'}`,
    content: `
        <div class="dashboard-layout">
            ${userType === 'admin' ? 
                include('../navigation/admin-sidebar', { activePage }) : 
                include('../navigation/tenant-sidebar', { activePage, tenantName })
            }
            
            <main class="main-content">
                ${include('../navigation/top-bar', { 
                    title: pageTitle || title,
                    userType,
                    tenantName: tenantName || null
                })}
                
                <div class="content">
                    ${content}
                </div>
            </main>
        </div>
        
        <!-- Mobile Overlay -->
        <div class="overlay" id="mobileOverlay"></div>
    `,
    additionalCSS: ['dashboard.css', 'components.css'],
    additionalJS: ['dashboard.js', 'ui.js']
}) %>
```

### 3. Page Template Usage
```ejs
<!-- views/tenant/categories.ejs -->
<%- include('../partials/layouts/dashboard', {
    title: 'Kategori Yönetimi',
    pageTitle: 'Kategoriler',
    userType: 'tenant',
    tenantName: tenantName,
    activePage: 'categories',
    content: `
        <!-- Page Header -->
        ${include('../partials/components/page-header', {
            title: 'Kategori Yönetimi',
            subtitle: 'Mağaza kategorilerinizi yönetin',
            actions: [
                {
                    text: 'Yeni Kategori',
                    icon: '➕',
                    class: 'btn-primary',
                    action: 'open-modal',
                    modal: 'createCategoryModal'
                }
            ]
        })}
        
        <!-- Categories Table -->
        <div class="card">
            ${include('../partials/components/table', {
                id: 'categoriesTable',
                headers: [
                    { text: 'Ad', key: 'name', sortable: true },
                    { text: 'Açıklama', key: 'description' },
                    { text: 'Durum', key: 'status', render: (status) => include('../partials/components/status-badge', { status }) },
                    { text: 'Oluşturulma', key: 'created_at', render: (date) => new Date(date).toLocaleDateString('tr-TR') }
                ],
                actions: [
                    { icon: '✏️', text: 'Düzenle', action: 'edit-category', class: 'btn-outline' },
                    { icon: '🗑️', text: 'Sil', action: 'delete-category', class: 'btn-danger' }
                ],
                emptyMessage: 'Henüz kategori eklenmemiş',
                loadUrl: '/api/categories'
            })}
        </div>
        
        <!-- Create Modal -->
        ${include('../partials/components/modal', {
            id: 'createCategoryModal',
            title: 'Yeni Kategori Oluştur',
            size: 'md',
            form: {
                hxPost: '/api/categories',
                hxTarget: '#categoriesTable',
                hxSwap: 'outerHTML'
            },
            content: include('../partials/forms/category-form', { mode: 'create' }),
            buttons: [
                { text: 'İptal', class: 'btn-outline', action: 'close-modal' },
                { text: 'Kaydet', type: 'submit', class: 'btn-primary' }
            ]
        })}
    `
}) %>
```

## 🧩 Reusable Components

### 1. Enhanced Modal Component
```ejs
<!-- views/partials/components/modal.ejs -->
<%
/**
 * Modal Component
 * @param {string} id - Modal unique ID
 * @param {string} title - Modal title
 * @param {string} size - Modal size: 'sm', 'md', 'lg', 'xl'
 * @param {object} form - Form configuration
 * @param {string} content - Modal body content
 * @param {array} buttons - Button configuration
 * @param {boolean} closable - Can be closed by clicking outside
 * @param {string} className - Additional CSS classes
 */
const modalId = id || 'modal';
const modalSize = size || 'md';
const isClosable = closable !== false;
%>

<div class="modal <%= className || '' %>" 
     id="<%= modalId %>" 
     data-closable="<%= isClosable %>">
    <div class="modal-backdrop" 
         <% if (isClosable) { %>onclick="closeModal('<%= modalId %>')"<% } %>></div>
    
    <div class="modal-content modal-<%= modalSize %>">
        <!-- Modal Header -->
        <div class="modal-header">
            <h3 class="modal-title">
                <% if (typeof icon !== 'undefined') { %>
                <span class="modal-icon"><%= icon %></span>
                <% } %>
                <%= title %>
            </h3>
            <% if (isClosable) { %>
            <button class="modal-close" 
                    onclick="closeModal('<%= modalId %>')" 
                    type="button">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                    <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" stroke-width="2"/>
                </svg>
            </button>
            <% } %>
        </div>
        
        <!-- Modal Body -->
        <% if (typeof form !== 'undefined' && form) { %>
        <form id="<%= modalId %>Form" 
              <% if (form.action) { %>action="<%= form.action %>"<% } %>
              <% if (form.method) { %>method="<%= form.method %>"<% } %>
              <% if (form.hxPost) { %>hx-post="<%= form.hxPost %>"<% } %>
              <% if (form.hxPut) { %>hx-put="<%= form.hxPut %>"<% } %>
              <% if (form.hxTarget) { %>hx-target="<%= form.hxTarget %>"<% } %>
              <% if (form.hxSwap) { %>hx-swap="<%= form.hxSwap %>"<% } %>
              <% if (form.hxIndicator) { %>hx-indicator="<%= form.hxIndicator %>"<% } %>
              onsubmit="return handleFormSubmit(event, '<%= modalId %>')">
        <% } %>
        
        <div class="modal-body">
            <% if (typeof loading !== 'undefined' && loading) { %>
            <div class="modal-loading" id="<%= modalId %>Loading">
                <%- include('./loading', { text: 'Yükleniyor...' }) %>
            </div>
            <% } %>
            
            <div class="modal-content-wrapper" id="<%= modalId %>Content">
                <%- content %>
            </div>
        </div>
        
        <!-- Modal Footer -->
        <% if (typeof buttons !== 'undefined' && buttons && buttons.length > 0) { %>
        <div class="modal-footer">
            <% buttons.forEach(function(button) { %>
                <%- include('./button', {
                    text: button.text,
                    type: button.type || 'button',
                    class: button.class || 'btn-outline',
                    icon: button.icon,
                    action: button.action,
                    modal: button.modal || modalId,
                    disabled: button.disabled,
                    loading: button.loading
                }) %>
            <% }); %>
        </div>
        <% } %>
        
        <% if (typeof form !== 'undefined' && form) { %>
        </form>
        <% } %>
    </div>
</div>

<script>
// Modal-specific JavaScript
document.addEventListener('DOMContentLoaded', function() {
    const modal = document.getElementById('<%= modalId %>');
    if (modal) {
        // Initialize modal behavior
        initializeModal('<%= modalId %>');
    }
});
</script>
```

### 2. Advanced Table Component
```ejs
<!-- views/partials/components/table.ejs -->
<%
/**
 * Advanced Table Component
 * @param {string} id - Table unique ID
 * @param {array} headers - Column definitions
 * @param {array} rows - Data rows (optional for HTMX loading)
 * @param {array} actions - Row action buttons
 * @param {string} emptyMessage - Message when no data
 * @param {string} loadUrl - HTMX load URL
 * @param {object} pagination - Pagination config
 * @param {boolean} sortable - Enable sorting
 * @param {boolean} searchable - Enable search
 * @param {string} className - Additional CSS classes
 */
const tableId = id || 'dataTable';
const isSearchable = searchable !== false;
const isSortable = sortable !== false;
const hasPagination = typeof pagination !== 'undefined' && pagination;
%>

<div class="table-wrapper <%= className || '' %>" id="<%= tableId %>Wrapper">
    <!-- Table Controls -->
    <% if (isSearchable || (typeof filters !== 'undefined' && filters)) { %>
    <div class="table-controls">
        <% if (isSearchable) { %>
        <div class="table-search">
            <input type="text" 
                   class="search-input" 
                   placeholder="Ara..." 
                   id="<%= tableId %>Search"
                   oninput="searchTable('<%= tableId %>', this.value)">
            <span class="search-icon">🔍</span>
        </div>
        <% } %>
        
        <% if (typeof filters !== 'undefined' && filters) { %>
        <div class="table-filters">
            <% filters.forEach(function(filter) { %>
            <select class="filter-select" 
                    onchange="filterTable('<%= tableId %>', '<%= filter.key %>', this.value)">
                <option value="">Tüm <%= filter.label %></option>
                <% filter.options.forEach(function(option) { %>
                <option value="<%= option.value %>"><%= option.label %></option>
                <% }); %>
            </select>
            <% }); %>
        </div>
        <% } %>
        
        <% if (typeof actions !== 'undefined' && actions && actions.bulk) { %>
        <div class="bulk-actions" id="<%= tableId %>BulkActions" style="display: none;">
            <span class="bulk-count">0 öğe seçildi</span>
            <% actions.bulk.forEach(function(action) { %>
            <%- include('./button', {
                text: action.text,
                class: action.class || 'btn-outline btn-sm',
                icon: action.icon,
                onclick: `bulkAction('${tableId}', '${action.action}')`
            }) %>
            <% }); %>
        </div>
        <% } %>
    </div>
    <% } %>
    
    <!-- Table Container -->
    <div class="table-container" id="<%= tableId %>Container">
        <% if (typeof loadUrl !== 'undefined' && loadUrl) { %>
        <!-- HTMX Loading -->
        <div hx-get="<%= loadUrl %>" 
             hx-trigger="load" 
             hx-target="#<%= tableId %>Content"
             hx-swap="innerHTML"
             hx-indicator="#<%= tableId %>Loading">
            <%- include('./loading', { text: 'Veriler yükleniyor...' }) %>
        </div>
        <% } %>
        
        <div id="<%= tableId %>Content">
            <table class="data-table" id="<%= tableId %>">
                <thead>
                    <tr>
                        <% if (typeof actions !== 'undefined' && actions && actions.bulk) { %>
                        <th class="select-column">
                            <input type="checkbox" 
                                   id="<%= tableId %>SelectAll"
                                   onchange="toggleSelectAll('<%= tableId %>', this.checked)">
                        </th>
                        <% } %>
                        
                        <% headers.forEach(function(header, index) { %>
                        <th class="<%= header.className || '' %> <%= header.sortable && isSortable ? 'sortable' : '' %>"
                            <% if (header.sortable && isSortable) { %>
                            onclick="sortTable('<%= tableId %>', '<%= header.key %>')"
                            data-sort-key="<%= header.key %>"
                            <% } %>
                            <% if (header.width) { %>style="width: <%= header.width %>"<% } %>>
                            <%= header.text %>
                            <% if (header.sortable && isSortable) { %>
                            <span class="sort-indicator">
                                <svg class="sort-icon" width="16" height="16" viewBox="0 0 16 16">
                                    <path d="M8 2l3 3H5l3-3zM8 14l-3-3h6l-3 3z" fill="currentColor"/>
                                </svg>
                            </span>
                            <% } %>
                        </th>
                        <% }); %>
                        
                        <% if (typeof actions !== 'undefined' && actions && (actions.row || actions.items)) { %>
                        <th class="actions-column">İşlemler</th>
                        <% } %>
                    </tr>
                </thead>
                <tbody id="<%= tableId %>Body">
                    <% if (typeof rows !== 'undefined' && rows && rows.length > 0) { %>
                        <% rows.forEach(function(row, rowIndex) { %>
                        <tr data-id="<%= row.id || rowIndex %>">
                            <% if (typeof actions !== 'undefined' && actions && actions.bulk) { %>
                            <td class="select-column">
                                <input type="checkbox" 
                                       class="row-select"
                                       value="<%= row.id || rowIndex %>"
                                       onchange="updateBulkActions('<%= tableId %>')">
                            </td>
                            <% } %>
                            
                            <% headers.forEach(function(header) { %>
                            <td class="<%= header.cellClassName || '' %>">
                                <% if (header.render && typeof header.render === 'function') { %>
                                    <%- header.render(row[header.key], row, rowIndex) %>
                                <% } else if (header.component) { %>
                                    <%- include(header.component, { 
                                        value: row[header.key], 
                                        row: row, 
                                        ...header.componentProps 
                                    }) %>
                                <% } else { %>
                                    <%= row[header.key] || '-' %>
                                <% } %>
                            </td>
                            <% }); %>
                            
                            <% if (typeof actions !== 'undefined' && actions && (actions.row || actions.items)) { %>
                            <td class="actions-column">
                                <div class="action-buttons">
                                    <% (actions.row || actions.items).forEach(function(action) { %>
                                    <%- include('./button', {
                                        text: action.text,
                                        class: `btn-sm ${action.class || 'btn-outline'}`,
                                        icon: action.icon,
                                        onclick: `rowAction('${action.action}', '${row.id || rowIndex}', this)`,
                                        disabled: action.disabled && action.disabled(row),
                                        title: action.title
                                    }) %>
                                    <% }); %>
                                </div>
                            </td>
                            <% } %>
                        </tr>
                        <% }); %>
                    <% } else if (typeof loadUrl === 'undefined') { %>
                    <!-- Empty State -->
                    <tr>
                        <td colspan="<%= headers.length + (actions && actions.bulk ? 1 : 0) + (actions && (actions.row || actions.items) ? 1 : 0) %>">
                            <%- include('./empty-state', { 
                                message: emptyMessage || 'Veri bulunamadı',
                                icon: '📄'
                            }) %>
                        </td>
                    </tr>
                    <% } %>
                </tbody>
            </table>
        </div>
    </div>
    
    <!-- Pagination -->
    <% if (hasPagination) { %>
    <div class="table-pagination" id="<%= tableId %>Pagination">
        <%- include('./pagination', pagination) %>
    </div>
    <% } %>
    
    <!-- Loading Indicator -->
    <div class="loading-indicator" id="<%= tableId %>Loading" style="display: none;">
        <%- include('./loading', { text: 'İşleniyor...' }) %>
    </div>
</div>

<script>
// Table-specific JavaScript
document.addEventListener('DOMContentLoaded', function() {
    initializeTable('<%= tableId %>', {
        sortable: <%= isSortable %>,
        searchable: <%= isSearchable %>,
        hasBulkActions: <%= typeof actions !== 'undefined' && actions && actions.bulk ? 'true' : 'false' %>
    });
});
</script>
```

### 3. Smart Form Component
```ejs
<!-- views/partials/components/form-group.ejs -->
<%
/**
 * Smart Form Group Component
 * @param {string} type - Input type
 * @param {string} name - Input name
 * @param {string} label - Field label
 * @param {string} value - Current value
 * @param {boolean} required - Required field
 * @param {string} placeholder - Placeholder text
 * @param {array} options - Options for select/radio
 * @param {object} validation - Validation rules
 * @param {string} help - Help text
 * @param {string} error - Error message
 * @param {object} attributes - Additional HTML attributes
 */
const inputId = `${name}_${Math.random().toString(36).substr(2, 9)}`;
const isRequired = required === true;
const hasError = typeof error !== 'undefined' && error;
%>

<div class="form-group <%= hasError ? 'has-error' : '' %> <%= className || '' %>">
    <!-- Label -->
    <% if (label) { %>
    <label for="<%= inputId %>" class="form-label <%= isRequired ? 'required' : '' %>">
        <%= label %>
        <% if (isRequired) { %><span class="required-indicator">*</span><% } %>
    </label>
    <% } %>
    
    <!-- Input Field -->
    <div class="form-input-wrapper">
        <% if (type === 'select') { %>
        <!-- Select Dropdown -->
        <select id="<%= inputId %>" 
                name="<%= name %>" 
                class="form-input form-select <%= hasError ? 'error' : '' %>"
                <% if (isRequired) { %>required<% } %>
                <% if (typeof attributes !== 'undefined') { %>
                    <% Object.keys(attributes).forEach(function(attr) { %>
                        <%= attr %>="<%= attributes[attr] %>"
                    <% }); %>
                <% } %>>
            <% if (placeholder) { %>
            <option value="" disabled <%= !value ? 'selected' : '' %>><%= placeholder %></option>
            <% } %>
            <% if (options && options.length > 0) { %>
                <% options.forEach(function(option) { %>
                <option value="<%= option.value %>" 
                        <%= value == option.value ? 'selected' : '' %>>
                    <%= option.label || option.text %>
                </option>
                <% }); %>
            <% } %>
        </select>
        
        <% } else if (type === 'textarea') { %>
        <!-- Textarea -->
        <textarea id="<%= inputId %>" 
                  name="<%= name %>" 
                  class="form-input form-textarea <%= hasError ? 'error' : '' %>"
                  <% if (placeholder) { %>placeholder="<%= placeholder %>"<% } %>
                  <% if (isRequired) { %>required<% } %>
                  <% if (typeof attributes !== 'undefined') { %>
                      <% Object.keys(attributes).forEach(function(attr) { %>
                          <%= attr %>="<%= attributes[attr] %>"
                      <% }); %>
                  <% } %>><%= value || '' %></textarea>
        
        <% } else if (type === 'checkbox') { %>
        <!-- Checkbox -->
        <div class="form-checkbox-wrapper">
            <input type="checkbox" 
                   id="<%= inputId %>" 
                   name="<%= name %>" 
                   class="form-checkbox <%= hasError ? 'error' : '' %>"
                   value="<%= checkboxValue || '1' %>"
                   <%= value ? 'checked' : '' %>
                   <% if (isRequired) { %>required<% } %>
                   <% if (typeof attributes !== 'undefined') { %>
                       <% Object.keys(attributes).forEach(function(attr) { %>
                           <%= attr %>="<%= attributes[attr] %>"
                       <% }); %>
                   <% } %>>
            <label for="<%= inputId %>" class="checkbox-label">
                <span class="checkbox-indicator"></span>
                <%= checkboxLabel || label %>
            </label>
        </div>
        
        <% } else if (type === 'radio' && options) { %>
        <!-- Radio Group -->
        <div class="form-radio-group">
            <% options.forEach(function(option, index) { %>
            <div class="form-radio-wrapper">
                <input type="radio" 
                       id="<%= inputId %>_<%= index %>" 
                       name="<%= name %>" 
                       class="form-radio <%= hasError ? 'error' : '' %>"
                       value="<%= option.value %>"
                       <%= value == option.value ? 'checked' : '' %>
                       <% if (isRequired && index === 0) { %>required<% } %>>
                <label for="<%= inputId %>_<%= index %>" class="radio-label">
                    <span class="radio-indicator"></span>
                    <%= option.label || option.text %>
                </label>
            </div>
            <% }); %>
        </div>
        
        <% } else if (type === 'file') { %>
        <!-- File Input -->
        <div class="form-file-wrapper">
            <input type="file" 
                   id="<%= inputId %>" 
                   name="<%= name %>" 
                   class="form-file <%= hasError ? 'error' : '' %>"
                   <% if (accept) { %>accept="<%= accept %>"<% } %>
                   <% if (multiple) { %>multiple<% } %>
                   <% if (isRequired) { %>required<% } %>
                   <% if (typeof attributes !== 'undefined') { %>
                       <% Object.keys(attributes).forEach(function(attr) { %>
                           <%= attr %>="<%= attributes[attr] %>"
                       <% }); %>
                   <% } %>>
            <label for="<%= inputId %>" class="file-label">
                <span class="file-icon">📁</span>
                <span class="file-text"><%= placeholder || 'Dosya seçin' %></span>
            </label>
            <div class="file-info" id="<%= inputId %>Info"></div>
        </div>
        
        <% } else { %>
        <!-- Standard Input -->
        <input type="<%= type || 'text' %>" 
               id="<%= inputId %>" 
               name="<%= name %>" 
               class="form-input <%= hasError ? 'error' : '' %>"
               <% if (value) { %>value="<%= value %>"<% } %>
               <% if (placeholder) { %>placeholder="<%= placeholder %>"<% } %>
               <% if (isRequired) { %>required<% } %>
               <% if (typeof validation !== 'undefined') { %>
                   <% if (validation.minLength) { %>minlength="<%= validation.minLength %>"<% } %>
                   <% if (validation.maxLength) { %>maxlength="<%= validation.maxLength %>"<% } %>
                   <% if (validation.min) { %>min="<%= validation.min %>"<% } %>
                   <% if (validation.max) { %>max="<%= validation.max %>"<% } %>
                   <% if (validation.pattern) { %>pattern="<%= validation.pattern %>"<% } %>
               <% } %>
               <% if (typeof attributes !== 'undefined') { %>
                   <% Object.keys(attributes).forEach(function(attr) { %>
                       <%= attr %>="<%= attributes[attr] %>"
                   <% }); %>
               <% } %>>
        <% } %>
        
        <!-- Input Icons/Addons -->
        <% if (typeof icon !== 'undefined' && icon) { %>
        <span class="form-icon"><%= icon %></span>
        <% } %>
        
        <% if (typeof addon !== 'undefined' && addon) { %>
        <span class="form-addon"><%= addon %></span>
        <% } %>
    </div>
    
    <!-- Help Text -->
    <% if (help) { %>
    <div class="form-help">
        <small class="help-text"><%= help %></small>
    </div>
    <% } %>
    
    <!-- Error Message -->
    <% if (hasError) { %>
    <div class="form-error">
        <small class="error-text"><%= error %></small>
    </div>
    <% } %>
    
    <!-- Validation Feedback -->
    <div class="form-feedback" id="<%= inputId %>Feedback"></div>
</div>

<script>
// Form field specific JavaScript
document.addEventListener('DOMContentLoaded', function() {
    const field = document.getElementById('<%= inputId %>');
    if (field) {
        initializeFormField('<%= inputId %>', {
            type: '<%= type %>',
            validation: <%- JSON.stringify(validation || {}) %>,
            required: <%= isRequired %>
        });
    }
});
</script>
```

### 4. Navigation Components

#### Admin Sidebar
```ejs
<!-- views/partials/navigation/admin-sidebar.ejs -->
<%
const menuItems = [
    {
        title: 'Dashboard',
        icon: '📊',
        url: '/admin/dashboard',
        key: 'dashboard'
    },
    {
        title: 'Tenant Yönetimi',
        icon: '🏢',
        url: '/admin/tenants',
        key: 'tenants'
    },
    {
        title: 'Sistem Ayarları',
        icon: '⚙️',
        key: 'settings',
        submenu: [
            { title: 'Genel Ayarlar', url: '/admin/settings/general', key: 'general' },
            { title: 'Güvenlik', url: '/admin/settings/security', key: 'security' },
            { title: 'Backup', url: '/admin/backup', key: 'backup' }
        ]
    },
    {
        title: 'Raporlar',
        icon: '📈',
        url: '/admin/reports',
        key: 'reports'
    }
];
%>

<%- include('./sidebar-base', {
    userType: 'admin',
    title: 'Admin Panel',
    logo: '👑',
    menuItems: menuItems,
    activePage: activePage,
    user: {
        name: 'Super Admin',
        email: 'admin@saas.apollo12.co',
        avatar: '👤'
    }
}) %>
```

#### Tenant Sidebar
```ejs
<!-- views/partials/navigation/tenant-sidebar.ejs -->
<%
const menuItems = [
    {
        title: 'Dashboard',
        icon: '📊',
        url: '/dashboard',
        key: 'dashboard'
    },
    {
        title: 'Ürün Yönetimi',
        icon: '📦',
        key: 'products',
        submenu: [
            { title: 'Ürünler', url: '/products', key: 'products' },
            { title: 'Kategoriler', url: '/categories', key: 'categories' },
            { title: 'Markalar', url: '/brands', key: 'brands' }
        ]
    },
    {
        title: 'Sipariş Yönetimi',
        icon: '🛒',
        key: 'orders',
        submenu: [
            { title: 'Siparişler', url: '/orders', key: 'orders' },
            { title: 'Kuponlar', url: '/coupons', key: 'coupons' }
        ]
    },
    {
        title: 'Müşteri Yönetimi',
        icon: '👥',
        url: '/customers',
        key: 'customers'
    },
    {
        title: 'Affiliate Sistemi',
        icon: '🤝',
        url: '/affiliates',
        key: 'affiliates'
    },
    {
        title: 'Raporlar',
        icon: '📈',
        url: '/reports',
        key: 'reports'
    },
    {
        title: 'Ayarlar',
        icon: '⚙️',
        key: 'settings',
        submenu: [
            { title: 'Mağaza Ayarları', url: '/settings/store', key: 'store' },
            { title: 'Personel', url: '/staff', key: 'staff' }
        ]
    }
];
%>

<%- include('./sidebar-base', {
    userType: 'tenant',
    title: tenantName || 'Mağaza Paneli',
    logo: '🏪',
    menuItems: menuItems,
    activePage: activePage,
    tenantName: tenantName
}) %>
```

#### Base Sidebar Template
```ejs
<!-- views/partials/navigation/sidebar-base.ejs -->
<aside class="sidebar <%= userType %>-sidebar" id="sidebar">
    <!-- Sidebar Header -->
    <div class="sidebar-header">
        <div class="sidebar-logo">
            <span class="logo-icon"><%= logo %></span>
            <span class="logo-text"><%= title %></span>
        </div>
        <button class="sidebar-toggle mobile-only" onclick="toggleSidebar()">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" stroke-width="2"/>
            </svg>
        </button>
    </div>
    
    <!-- Navigation Menu -->
    <nav class="sidebar-nav">
        <ul class="nav-menu">
            <% menuItems.forEach(function(item) { %>
            <li class="nav-item <%= item.key === activePage ? 'active' : '' %> <%= item.submenu ? 'has-submenu' : '' %>">
                <% if (item.submenu) { %>
                <!-- Menu with Submenu -->
                <button class="nav-link submenu-toggle" 
                        onclick="toggleSubmenu(this)"
                        data-key="<%= item.key %>">
                    <span class="nav-icon"><%= item.icon %></span>
                    <span class="nav-text"><%= item.title %></span>
                    <span class="submenu-arrow">
                        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                            <path d="M6 4l4 4-4 4" stroke="currentColor" stroke-width="2"/>
                        </svg>
                    </span>
                </button>
                
                <ul class="submenu">
                    <% item.submenu.forEach(function(subitem) { %>
                    <li class="submenu-item <%= subitem.key === activePage ? 'active' : '' %>">
                        <a href="<%= subitem.url %>" class="submenu-link">
                            <span class="submenu-text"><%= subitem.title %></span>
                        </a>
                    </li>
                    <% }); %>
                </ul>
                
                <% } else { %>
                <!-- Simple Menu Item -->
                <a href="<%= item.url %>" class="nav-link">
                    <span class="nav-icon"><%= item.icon %></span>
                    <span class="nav-text"><%= item.title %></span>
                </a>
                <% } %>
            </li>
            <% }); %>
        </ul>
    </nav>
    
    <!-- Sidebar Footer -->
    <div class="sidebar-footer">
        <% if (typeof user !== 'undefined' && user) { %>
        <div class="user-info">
            <div class="user-avatar"><%= user.avatar || '👤' %></div>
            <div class="user-details">
                <div class="user-name"><%= user.name %></div>
                <% if (user.email) { %>
                <div class="user-email"><%= user.email %></div>
                <% } %>
                <% if (tenantName) { %>
                <div class="tenant-name"><%= tenantName %></div>
                <% } %>
            </div>
        </div>
        <% } %>
        
        <div class="sidebar-actions">
            <button class="action-btn" onclick="showUserMenu()" title="Kullanıcı Menüsü">
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                    <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" fill="currentColor"/>
                    <path d="M10 4a2 2 0 100-4 2 2 0 000 4z" fill="currentColor"/>
                    <path d="M10 20a2 2 0 100-4 2 2 0 000 4z" fill="currentColor"/>
                </svg>
            </button>
            <button class="action-btn" onclick="logout()" title="Çıkış Yap">
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                    <path d="M3 3a2 2 0 012-2h10a2 2 0 012 2v14a2 2 0 01-2 2H5a2 2 0 01-2-2V3z" stroke="currentColor" stroke-width="2"/>
                    <path d="M9 9l3 3-3 3M12 12H3" stroke="currentColor" stroke-width="2"/>
                </svg>
            </button>
        </div>
    </div>
</aside>

<script>
// Sidebar-specific JavaScript
document.addEventListener('DOMContentLoaded', function() {
    initializeSidebar('<%= userType %>', '<%= activePage %>');
});
</script>
```

## 🎯 Component Usage Best Practices

### 1. Consistent Component Calling
```ejs
<!-- ✅ DOĞRU: Parametreli component kullanımı -->
<%- include('partials/components/modal', {
    id: 'editModal',
    title: 'Düzenle',
    size: 'lg',
    content: include('partials/forms/edit-form', { item: item })
}) %>

<!-- ❌ YANLIŞ: Hard-coded HTML -->
<div class="modal">
    <div class="modal-content">
        <!-- Tekrarlanan kod -->
    </div>
</div>
```

### 2. Component Composition
```ejs
<!-- Page composition with components -->
<%- include('partials/layouts/dashboard', {
    title: 'Ürün Yönetimi',
    content: `
        ${include('partials/components/page-header', {
            title: 'Ürünler',
            actions: [
                { text: 'Yeni Ürün', action: 'create-product' }
            ]
        })}
        
        ${include('partials/components/card', {
            title: 'Ürün Listesi',
            content: include('partials/components/table', {
                headers: productHeaders,
                loadUrl: '/api/products'
            })
        })}
        
        ${include('partials/components/modal', {
            id: 'productModal',
            title: 'Ürün İşlemleri',
            content: include('partials/forms/product-form')
        })}
    `
}) %>
```

### 3. Component State Management
```javascript
// Component state manager
class ComponentManager {
    constructor() {
        this.components = new Map();
        this.init();
    }
    
    init() {
        // Register all components
        this.registerModals();
        this.registerTables();
        this.registerForms();
    }
    
    registerComponent(id, type, config) {
        this.components.set(id, {
            type,
            config,
            element: document.getElementById(id),
            state: {}
        });
    }
    
    getComponent(id) {
        return this.components.get(id);
    }
    
    updateComponent(id, newState) {
        const component = this.components.get(id);
        if (component) {
            component.state = { ...component.state, ...newState };
            this.renderComponent(id);
        }
    }
}

// Global component manager
window.componentManager = new ComponentManager();
```

Bu component reusability rehberi, projenizde tekrarlayan kod yazımını önleyerek, tutarlı ve maintainable bir UI sistemi oluşturmanızı sağlar.
