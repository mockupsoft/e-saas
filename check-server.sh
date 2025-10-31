#!/bin/bash
echo "�� SaaS Panel Sunucu Durumu"
echo "=========================="
echo "📅 Tarih: $(date)"
echo ""

# Process kontrolü
if pgrep -f "node index.js" > /dev/null; then
    echo "✅ Sunucu çalışıyor (PID: $(pgrep -f 'node index.js'))"
else
    echo "❌ Sunucu kapalı"
    exit 1
fi

# Port kontrolü
if netstat -tlnp 2>/dev/null | grep ":3000 " > /dev/null; then
    echo "✅ Port 3000 dinleniyor"
else
    echo "❌ Port 3000 kapalı"
fi

# API test
if curl -s http://localhost:3000/ | grep -q "SaaS E-Ticaret"; then
    echo "✅ API yanıt veriyor"
else
    echo "❌ API yanıt vermiyor"
fi

echo ""
echo "🌐 Erişim URL'leri:"
echo "   - Ana API: http://localhost:3000/"
echo "   - Admin Panel: http://localhost:3000/admin/dashboard"
echo "   - Test Mağaza: http://localhost:3000/test1/dashboard"
echo "   - Raporlama: http://localhost:3000/test1/reports"
