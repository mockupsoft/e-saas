# 🚀 GitHub'a Push Komutları

Git repository başarıyla hazırlandı! Şimdi GitHub'a push etmek için aşağıdaki adımları takip edin:

## ✅ Hazırlanan İşlemler

- ✅ Git repository initialize edildi
- ✅ Tüm dosyalar commit edildi (93 dosya, 36,703 satır)
- ✅ v1.0.0 tag'i oluşturuldu
- ✅ Remote repository eklendi: https://github.com/mockupsoft/e-saas.git
- ✅ Branch main olarak ayarlandı

## 🔐 Authentication Yöntemleri

### Yöntem 1: Personal Access Token (Önerilen)

1. GitHub'da Personal Access Token oluşturun:
   - GitHub.com > Settings > Developer settings > Personal access tokens > Tokens (classic)
   - "Generate new token (classic)" tıklayın
   - `repo` yetkisini seçin
   - Token'ı kopyalayın

2. Push komutunu çalıştırın (token ile):

```bash
cd /www/wwwroot/saas-panel

# Token'ı kullanarak push et
git push -u origin main

# Token girişi istenirse:
# Username: mockupsoft
# Password: [YOUR_PERSONAL_ACCESS_TOKEN]
```

### Yöntem 2: SSH Key

1. SSH key oluşturun:

```bash
ssh-keygen -t ed25519 -C "your.email@example.com"
# Public key'i kopyalayın
cat ~/.ssh/id_ed25519.pub
```

2. GitHub'a SSH key ekleyin:
   - GitHub.com > Settings > SSH and GPG keys
   - "New SSH key" tıklayın
   - Key'i ekleyin

3. Remote URL'i SSH olarak değiştirin:

```bash
cd /www/wwwroot/saas-panel
git remote set-url origin git@github.com:mockupsoft/e-saas.git
```

4. Push edin:

```bash
git push -u origin main
```

## 📦 Push Komutları

### Ana Branch Push

```bash
cd /www/wwwroot/saas-panel

# Main branch'i push et
git push -u origin main
```

### v1.0.0 Tag Push

```bash
# Tag'i push et
git push origin v1.0.0

# veya tüm tag'leri push et
git push origin --tags
```

## 🔄 Tek Komut ile Her Şeyi Push Et

```bash
cd /www/wwwroot/saas-panel

# Branch ve tag'i birlikte push et
git push -u origin main && git push origin --tags
```

## ✅ Kontrol Komutları

```bash
# Remote kontrol
git remote -v

# Commit kontrol
git log --oneline -5

# Tag kontrol
git tag -l

# Branch kontrol
git branch -a

# Durum kontrol
git status
```

## 🎯 Sonuç

Push işlemi tamamlandıktan sonra:
- Repository: https://github.com/mockupsoft/e-saas
- Tag: https://github.com/mockupsoft/e-saas/releases/tag/v1.0.0
- Commit: https://github.com/mockupsoft/e-saas/commit/[COMMIT_HASH]

---

**Not**: İlk push'ta authentication gerekli olduğu için komutları manuel olarak çalıştırmanız gerekiyor.

