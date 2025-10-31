# 🔐 GitHub Personal Access Token Oluşturma

## Adım 1: GitHub'a Giriş Yapın
- https://github.com adresine gidin
- `mockupsoft` hesabıyla giriş yapın

## Adım 2: Personal Access Token Oluşturun

1. **Settings'e gidin:**
   - Sağ üst köşedeki profil fotoğrafınıza tıklayın
   - "Settings" seçin

2. **Developer settings:**
   - Sol menüden en altta "Developer settings" tıklayın

3. **Personal access tokens:**
   - "Tokens (classic)" seçin
   - "Generate new token" > "Generate new token (classic)" tıklayın

4. **Token ayarları:**
   - **Note**: `saas-panel-v1-push` (açıklama)
   - **Expiration**: İstediğiniz süre (örn: 90 days veya No expiration)
   - **Scopes**: `repo` yetkisini seçin
     - ✅ `repo` (Full control of private repositories)

5. **Token'ı oluştur:**
   - "Generate token" butonuna tıklayın
   - **ÖNEMLİ**: Token'ı hemen kopyalayın! Bir daha gösterilmeyecek!

## Adım 3: Token'ı Güvenli Şekilde Paylaşın

Token'ı aldıktan sonra bana verin. Token formatı şöyle olacak:
```
ghp_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

## 🔒 Güvenlik Notu
- Token'ı kimseyle paylaşmayın
- Push işlemi tamamlandıktan sonra token'ı iptal edebilirsiniz
- Token'ı sadece bu işlem için kullanacağım

---

**Alternatif**: SSH Key kullanmak isterseniz, SSH private key'inizi paylaşabilirsiniz (daha güvenli ama daha karmaşık).

