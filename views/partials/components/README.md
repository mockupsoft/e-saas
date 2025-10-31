# Reusable Component System

Bu klasörde SaaS platformu için ortak UI component'ları bulunur. Tüm component'lar CSP uyumlu ve parametrik yapıdadır.

## Component'lar

### 1. Modal Component (`modal.ejs`)

**Parametreler:**
- `id`: Modal ID'si (required)
- `title`: Modal başlığı (required)
- `size`: 'sm', 'md', 'lg' (default: 'md')
- `form`: Form konfigürasyonu (isteğe bağlı)
- `content`: Modal içeriği (HTML string)
- `buttons`: Buton dizisi

**Kullanım:**
```ejs
<%- include('components/modal', {
    id: 'myModal',
    title: 'Başlık',
    size: 'md',
    content: '<p>Modal içeriği</p>',
    buttons: [
        { text: 'İptal', class: 'btn-outline', action: 'close-modal' },
        { text: 'Kaydet', type: 'submit', class: 'btn-primary' }
    ]
}) %>
```

### 2. Table Component (`table.ejs`)

**Parametreler:**
- `id`: Tablo ID'si
- `headers`: Başlık dizisi `[{text, key, sortable, render}]`
- `rows`: Veri dizisi
- `actions`: Eylem butonları
- `emptyText`: Boş durum metni

**Kullanım:**
```ejs
<%- include('components/table', {
    id: 'customersTable',
    headers: [
        { text: 'Ad', key: 'name' },
        { text: 'Email', key: 'email' },
        { text: 'Durum', key: 'status', render: (status) => `<span class="status-${status}">${status}</span>` }
    ],
    rows: customers,
    actions: [
        { icon: '✏️', text: 'Düzenle', action: 'edit-customer', class: 'btn-outline' },
        { icon: '🗑️', text: 'Sil', action: 'delete-customer', class: 'btn-danger' }
    ]
}) %>
```

### 3. Form Group Component (`form-group.ejs`)

**Parametreler:**
- `type`: Input tipi ('text', 'email', 'select', 'textarea', vb.)
- `name`: Input name attribute
- `label`: Etiket metni
- `value`: Varsayılan değer
- `placeholder`: Placeholder metni
- `required`: Zorunlu alan (boolean)
- `help`: Yardım metni
- `error`: Hata mesajı
- `options`: Select seçenekleri (select için)
- `attributes`: Ek HTML attributları

**Kullanım:**
```ejs
<%- include('components/form-group', {
    type: 'text',
    name: 'name',
    label: 'Adınız',
    placeholder: 'Adınızı girin',
    required: true,
    help: 'En az 2 karakter olmalıdır'
}) %>

<%- include('components/form-group', {
    type: 'select',
    name: 'status',
    label: 'Durum',
    options: [
        { value: 'active', text: 'Aktif' },
        { value: 'inactive', text: 'Pasif' }
    ]
}) %>
```

### 4. Status Badge Component (`status-badge.ejs`)

**Parametreler:**
- `status`: Durum ('active', 'inactive', 'pending', 'suspended', vb.)
- `text`: Görüntülenecek metin (isteğe bağlı)
- `size`: Boyut ('sm', 'md', 'lg')
- `className`: Ek CSS sınıfları

**Kullanım:**
```ejs
<%- include('components/status-badge', { status: 'active' }) %>
<%- include('components/status-badge', { status: 'pending', size: 'sm' }) %>
<%- include('components/status-badge', { status: 'custom', text: 'Özel Durum' }) %>
```

### 5. Button Component (`button.ejs`)

**Parametreler:**
- `type`: Button tipi ('button', 'submit', 'reset')
- `variant`: Stil ('primary', 'secondary', 'outline', 'danger')
- `size`: Boyut ('sm', 'md', 'lg')
- `text`: Buton metni
- `icon`: İkon (emoji veya HTML)
- `action`: data-action attribute
- `href`: Link olarak render etmek için
- `disabled`: Devre dışı durum
- `loading`: Yükleniyor durumu

**Kullanım:**
```ejs
<%- include('components/button', {
    text: 'Kaydet',
    variant: 'primary',
    type: 'submit'
}) %>

<%- include('components/button', {
    text: 'Düzenle',
    variant: 'outline',
    icon: '✏️',
    action: 'edit-item',
    size: 'sm'
}) %>
```

## CSS Sınıfları

### Status Badge Sınıfları
- `.status-active` - Aktif (yeşil)
- `.status-inactive` - Pasif (kırmızı)
- `.status-pending` - Beklemede (turuncu)
- `.status-suspended` - Askıda (gri)
- `.status-success` - Başarılı (yeşil)
- `.status-error` - Hata (kırmızı)
- `.status-warning` - Uyarı (turuncu)
- `.status-info` - Bilgi (mavi)

### Button Sınıfları
- `.btn-primary` - Birincil buton (gradyan)
- `.btn-secondary` - İkincil buton (gri)
- `.btn-outline` - Çerçeveli buton
- `.btn-danger` - Tehlike butonu (kırmızı)
- `.btn-success` - Başarı butonu (yeşil)
- `.btn-sm` - Küçük buton
- `.btn-lg` - Büyük buton

## JavaScript API

### UIManager Sınıfı

**Modal Management:**
```javascript
// Modal aç
UIManager.getInstance().openModal('modalId');

// Modal kapat
UIManager.getInstance().closeModal('modalId');
```

**Toast Notifications:**
```javascript
// Toast göster
UIManager.getInstance().showToast('Mesaj', 'success', 5000);

// Global fonksiyon
showToast('Başarılı!', 'success');
```

### Data Attributes

**Modal Kontrolleri:**
- `data-action="open-modal"` + `data-modal="modalId"`
- `data-action="close-modal"` + `data-modal="modalId"`

**CRUD İşlemleri:**
- `data-action="edit-customer"` + `data-customer-id="123"`
- `data-action="delete-customer"` + `data-customer-id="123"`
- `data-action="edit-tenant"` + `data-tenant-id="123"`

**Toast:**
- `data-action="show-toast"` + `data-message="Mesaj"` + `data-type="success"`

## Örnekler

### Tam Sayfa Örneği

```ejs
<!DOCTYPE html>
<html lang="tr">
<head>
    <%- include('components/include', { action: 'includeCommonHead' }) %>
    <title>Sayfa Başlığı</title>
</head>
<body class="admin">
    <!-- Ana içerik -->
    <div class="content">
        <!-- Tablo -->
        <%- include('components/table', {
            headers: [...],
            rows: data,
            actions: [...]
        }) %>
        
        <!-- Buton -->
        <%- include('components/button', {
            text: 'Yeni Ekle',
            variant: 'primary',
            action: 'open-modal',
            attributes: { 'data-modal': 'addModal' }
        }) %>
    </div>
    
    <!-- Modal -->
    <%- include('components/modal', {
        id: 'addModal',
        title: 'Yeni Ekle',
        content: '...'
    }) %>
    
    <%- include('components/include', { action: 'includeCommonScripts' }) %>
</body>
</html>
```

## Notlar

- Tüm component'lar CSP uyumludur
- HTMX ile uyumlu çalışır
- Admin ve tenant tema desteği vardır
- Responsive tasarım destekler
- Accessibility özellikleri içerir 