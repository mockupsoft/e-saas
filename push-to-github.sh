#!/bin/bash

# GitHub Push Script
# Kullanım: ./push-to-github.sh YOUR_TOKEN

TOKEN=$1
REPO_URL="https://github.com/mockupsoft/e-saas.git"

if [ -z "$TOKEN" ]; then
    echo "❌ Token gerekli!"
    echo "Kullanım: ./push-to-github.sh YOUR_GITHUB_TOKEN"
    exit 1
fi

cd /www/wwwroot/saas-panel

# Remote URL'i token ile güncelle
git remote set-url origin https://${TOKEN}@github.com/mockupsoft/e-saas.git

# Main branch push
echo "📤 Main branch push ediliyor..."
git push -u origin main

if [ $? -eq 0 ]; then
    echo "✅ Main branch başarıyla push edildi!"
    
    # Tag push
    echo "📤 v1.0.0 tag'i push ediliyor..."
    git push origin v1.0.0
    
    if [ $? -eq 0 ]; then
        echo "✅ v1.0.0 tag başarıyla push edildi!"
        echo ""
        echo "🎉 Tamamlandı!"
        echo "Repository: https://github.com/mockupsoft/e-saas"
        echo "Release: https://github.com/mockupsoft/e-saas/releases/tag/v1.0.0"
        
        # Remote URL'i temizle (token'ı kaldır)
        git remote set-url origin https://github.com/mockupsoft/e-saas.git
        echo ""
        echo "🔒 Remote URL temizlendi (token kaldırıldı)"
    else
        echo "❌ Tag push hatası!"
    fi
else
    echo "❌ Main branch push hatası!"
fi
