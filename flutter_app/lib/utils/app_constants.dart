import 'package:flutter/material.dart';

class AppConstants {
  // Uygulama renkler
  static const Color primaryColor = Color(0xFF2563EB);
  static const Color secondaryColor = Color(0xFF64748B);
  static const Color successColor = Color(0xFF10B981);
  static const Color warningColor = Color(0xFFF59E0B);
  static const Color errorColor = Color(0xFFEF4444);
  static const Color backgroundColor = Color(0xFFF8FAFC);

  // Uygulama ayarları
  static const String appName = 'SaaS Mobile';
  static const String baseUrl = 'https://saas.apollo12.co';
  static const String savedDomainKey = 'saved_tenant_domain';
  static const String userAgentKey = 'SaaS-Mobile-App/1.0';

  // WebView ayarları
  static const int connectionTimeout = 30; // saniye
  static const bool debugMode = true;
  
  // Domain validasyon
  static const String domainPattern = r'^[a-zA-Z0-9][a-zA-Z0-9-]*[a-zA-Z0-9]$';
  static const int minDomainLength = 2;
  static const int maxDomainLength = 63;

  // UI sabitleri
  static const double borderRadius = 12.0;
  static const double padding = 16.0;
  static const double largePadding = 24.0;
  static const double iconSize = 24.0;
  static const double largeIconSize = 48.0;

  // Animasyon süreleri
  static const Duration fastAnimation = Duration(milliseconds: 200);
  static const Duration normalAnimation = Duration(milliseconds: 300);
  static const Duration slowAnimation = Duration(milliseconds: 500);

  // Splash screen
  static const Duration splashDuration = Duration(seconds: 2);

  // Hata mesajları
  static const String networkError = 'İnternet bağlantınızı kontrol edin';
  static const String invalidDomain = 'Geçersiz domain adı';
  static const String domainNotFound = 'Bu domain bulunamadı';
  static const String sslError = 'Güvenli bağlantı kurulamadı';
  static const String loadingError = 'Sayfa yüklenirken hata oluştu';

  // Başarı mesajları
  static const String domainSaved = 'Domain başarıyla kaydedildi';
  static const String cacheCleared = 'Önbellek temizlendi';

  // Güvenlik ayarları
  static const List<String> allowedDomains = [
    'saas.apollo12.co',
    '*.saas.apollo12.co',
  ];

  static const List<String> blockedSchemes = [
    'file://',
    'javascript:',
    'data:',
  ];

  // WebView JavaScript kanalları
  static const String jsChannelName = 'SaasApp';
  
  // Debug ayarları
  static void debugPrint(String message) {
    if (debugMode) {
      print('[SaasApp] $message');
    }
  }

  // URL yardımcı metodları
  static String buildTenantUrl(String tenantDomain) {
    return 'https://$tenantDomain.saas.apollo12.co';
  }

  static bool isValidDomain(String domain) {
    if (domain.length < minDomainLength || domain.length > maxDomainLength) {
      return false;
    }
    return RegExp(domainPattern).hasMatch(domain);
  }

  static bool isAllowedUrl(String url) {
    final uri = Uri.tryParse(url);
    if (uri == null) return false;

    // HTTPS zorunluluğu
    if (uri.scheme != 'https') return false;

    // İzin verilen domainleri kontrol et
    for (final allowedDomain in allowedDomains) {
      if (allowedDomain.startsWith('*')) {
        final pattern = allowedDomain.substring(2); // *.saas.apollo12.co -> saas.apollo12.co
        if (uri.host.endsWith(pattern)) return true;
      } else {
        if (uri.host == allowedDomain) return true;
      }
    }

    return false;
  }

  static bool isBlockedScheme(String url) {
    return blockedSchemes.any((scheme) => url.startsWith(scheme));
  }
} 