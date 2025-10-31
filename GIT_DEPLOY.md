# 🚀 GitHub'a Deploy Talimatları

Bu dosya, projeyi GitHub'a v1.0.0 olarak göndermek için gerekli adımları içerir.

## 📋 Ön Gereksinimler

### 1. Git Kurulumu

```bash
# CentOS/RHEL için
sudo yum install git -y

# veya Ubuntu/Debian için
sudo apt-get update && sudo apt-get install git -y
```

### 2. Git Yapılandırması

```bash
# Git kullanıcı bilgilerini ayarla
git config --global user.name "Your Name"
git config --global user.email "your.email@example.com"
```

### 3. GitHub Erişim

GitHub hesabınızda SSH key veya Personal Access Token kullanarak erişim sağlayın:

- **SSH Key**: `ssh-keygen -t ed25519 -C "your.email@example.com"`
- **Personal Access Token**: GitHub Settings > Developer settings > Personal access tokens

## 🔄 GitHub'a İlk Push İşlemi

### Adım 1: Git Repository Initialize

```bash
cd /www/wwwroot/saas-panel

# Git repository başlat
git init

# Mevcut durumu kontrol et
git status
```

### Adım 2: Dosyaları Stage Et

```bash
# Tüm dosyaları ekle ( .gitignore'a göre filtrelenir)
git add .

# Eklenen dosyaları kontrol et
git status
```

### Adım 3: İlk Commit

```bash
git commit -m "Initial commit - v1.0.0

- Multi-tenant SaaS e-ticaret platformu
- Express.js backend
- EJS templates
- MySQL/MariaDB database
- HTMX frontend
- Swagger API documentation
- Backup system
- Admin panel
- Tenant management"
```

### Adım 4: GitHub Remote Ekle

```bash
# GitHub repository URL'ini ekle
git remote add origin https://github.com/mockupsoft/e-saas.git

# Remote'u kontrol et
git remote -v
```

### Adım 5: Ana Branch'i Main Olarak Ayarla

```bash
# Branch'i main olarak ayarla (GitHub default)
git branch -M main
```

### Adım 6: GitHub'a Push Et

```bash
# İlk push (main branch)
git push -u origin main

# Eğer SSH kullanıyorsanız:
# git remote set-url origin git@github.com:mockupsoft/e-saas.git
# git push -u origin main
```

### Adım 7: v1.0.0 Tag Oluştur ve Push Et

```bash
# v1.0.0 tag'i oluştur
git tag -a v1.0.0 -m "Release version 1.0.0 - Initial stable release"

# Tag'i GitHub'a push et
git push origin v1.0.0

# Tüm tag'leri push etmek için:
git push origin --tags
```

## ✅ Doğrulama

GitHub repository'nizi kontrol edin:
- https://github.com/mockupsoft/e-saas

### Kontrol Komutları

```bash
# Remote repository bilgisi
git remote show origin

# Mevcut tag'ler
git tag -l

# Son commit'leri göster
git log --oneline -10

# Branch bilgisi
git branch -a
```

## 🔄 Sonraki Güncellemeler

Gelecekte değişiklikleri GitHub'a göndermek için:

```bash
# Değişiklikleri stage et
git add .

# Commit yap
git commit -m "Description of changes"

# GitHub'a push et
git push origin main

# Yeni version tag'i
git tag -a v1.1.0 -m "Release version 1.1.0"
git push origin v1.1.0
```

## 🛠️ Sorun Giderme

### Push Hatası: Authentication Failed

```bash
# Personal Access Token kullan
git remote set-url origin https://USERNAME:TOKEN@github.com/mockupsoft/e-saas.git

# veya SSH kullan
git remote set-url origin git@github.com:mockupsoft/e-saas.git
```

### .gitignore Çalışmıyor

```bash
# Önbelleği temizle
git rm -r --cached .
git add .
git commit -m "Fix .gitignore"
```

### Tag Silme ve Yeniden Oluşturma

```bash
# Local tag'i sil
git tag -d v1.0.0

# Remote tag'i sil
git push origin :refs/tags/v1.0.0

# Yeniden oluştur
git tag -a v1.0.0 -m "Release version 1.0.0"
git push origin v1.0.0
```

## 📝 Notlar

- `.env` dosyası `.gitignore`'da olduğu için GitHub'a gönderilmeyecek (güvenlik)
- `node_modules` otomatik olarak ignore edilir
- `uploads/` ve `storage/` klasörleri ignore edilir (kullanıcı içeriği)
- `backups/` klasörü ignore edilir

---

**🎉 v1.0.0 başarıyla GitHub'a gönderildi!**

