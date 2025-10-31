import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:webview_flutter/webview_flutter.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:url_launcher/url_launcher.dart';
import '../utils/app_constants.dart';
import '../widgets/loading_button.dart';
import 'domain_input_screen.dart';

class WebViewScreen extends StatefulWidget {
  final String? initialDomain;

  const WebViewScreen({super.key, this.initialDomain});

  @override
  State<WebViewScreen> createState() => _WebViewScreenState();
}

class _WebViewScreenState extends State<WebViewScreen> {
  late final WebViewController _controller;
  
  bool _isLoading = true;
  bool _hasError = false;
  String? _currentUrl;
  String? _pageTitle;
  double _progress = 0.0;
  
  @override
  void initState() {
    super.initState();
    _initializeWebView();
  }

  void _initializeWebView() {
    final initialUrl = AppConstants.buildTenantUrl(widget.initialDomain!);
    
    _controller = WebViewController()
      ..setJavaScriptMode(JavaScriptMode.unrestricted)
      ..setBackgroundColor(AppConstants.backgroundColor)
      ..setUserAgent(AppConstants.userAgentKey)
      ..setNavigationDelegate(
        NavigationDelegate(
          onProgress: (int progress) {
            setState(() {
              _progress = progress / 100.0;
            });
          },
          onPageStarted: (String url) {
            setState(() {
              _isLoading = true;
              _hasError = false;
              _currentUrl = url;
            });
            AppConstants.debugPrint('Sayfa yükleniyor: $url');
          },
          onPageFinished: (String url) {
            setState(() {
              _isLoading = false;
            });
            _getPageTitle();
            AppConstants.debugPrint('Sayfa yüklendi: $url');
          },
          onWebResourceError: (WebResourceError error) {
            setState(() {
              _isLoading = false;
              _hasError = true;
            });
            AppConstants.debugPrint('WebView hata: ${error.description}');
          },
          onNavigationRequest: (NavigationRequest request) {
            final url = request.url;
            
            // Güvenlik kontrolleri
            if (AppConstants.isBlockedScheme(url)) {
              AppConstants.debugPrint('Blocked scheme: $url');
              return NavigationDecision.prevent;
            }
            
            // İzin verilen domainler kontrolü
            if (!AppConstants.isAllowedUrl(url)) {
              AppConstants.debugPrint('Dış link tespit edildi: $url');
              _showExternalLinkDialog(url);
              return NavigationDecision.prevent;
            }
            
            return NavigationDecision.navigate;
          },
        ),
      )
      ..addJavaScriptChannel(
        AppConstants.jsChannelName,
        onMessageReceived: (JavaScriptMessage message) {
          AppConstants.debugPrint('JS Message: ${message.message}');
          _handleJavaScriptMessage(message.message);
        },
      )
      ..loadRequest(Uri.parse(initialUrl));
  }

  Future<void> _getPageTitle() async {
    try {
      final title = await _controller.getTitle();
      setState(() {
        _pageTitle = title;
      });
    } catch (e) {
      AppConstants.debugPrint('Sayfa başlığı alınamadı: $e');
    }
  }

  void _handleJavaScriptMessage(String message) {
    // JavaScript'ten gelen mesajları işle
    try {
      // Örnek: {"action": "notification", "data": {...}}
      // Bu kısımda SaaS panelinden gelen özel mesajları işleyebiliriz
      AppConstants.debugPrint('JS mesajı işleniyor: $message');
    } catch (e) {
      AppConstants.debugPrint('JS mesajı işlenirken hata: $e');
    }
  }

  void _showExternalLinkDialog(String url) {
    showDialog(
      context: context,
      builder: (BuildContext context) {
        return AlertDialog(
          title: const Text('Dış Link'),
          content: Text(
            'Bu link dış bir web sitesine yönlendiriyor:\n\n$url\n\nBu linki tarayıcıda açmak istiyor musunuz?',
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.of(context).pop(),
              child: const Text('İptal'),
            ),
            TextButton(
              onPressed: () async {
                Navigator.of(context).pop();
                await _launchExternalUrl(url);
              },
              child: const Text('Aç'),
            ),
          ],
        );
      },
    );
  }

  Future<void> _launchExternalUrl(String url) async {
    try {
      final uri = Uri.parse(url);
      if (await canLaunchUrl(uri)) {
        await launchUrl(uri, mode: LaunchMode.externalApplication);
      } else {
        _showSnackBar('Bu link açılamadı');
      }
    } catch (e) {
      _showSnackBar('Link açılırken hata oluştu');
    }
  }

  void _showSnackBar(String message) {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text(message),
        behavior: SnackBarBehavior.floating,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(AppConstants.borderRadius),
        ),
      ),
    );
  }

  Future<void> _reload() async {
    setState(() {
      _isLoading = true;
      _hasError = false;
    });
    await _controller.reload();
  }

  Future<void> _goBack() async {
    if (await _controller.canGoBack()) {
      await _controller.goBack();
    }
  }

  Future<void> _goForward() async {
    if (await _controller.canGoForward()) {
      await _controller.goForward();
    }
  }

  Future<void> _clearCacheAndLogout() async {
    try {
      await _controller.clearCache();
      await _controller.clearLocalStorage();
      
      final prefs = await SharedPreferences.getInstance();
      await prefs.remove(AppConstants.savedDomainKey);
      
      if (mounted) {
        Navigator.of(context).pushReplacement(
          MaterialPageRoute(
            builder: (context) => const DomainInputScreen(),
          ),
        );
      }
      
      _showSnackBar(AppConstants.cacheCleared);
    } catch (e) {
      _showSnackBar('Çıkış yapılırken hata oluştu');
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Text(
          _pageTitle ?? widget.initialDomain ?? 'SaaS App',
          overflow: TextOverflow.ellipsis,
        ),
        bottom: _isLoading
            ? PreferredSize(
                preferredSize: const Size.fromHeight(4.0),
                child: LinearProgressIndicator(
                  value: _progress,
                  backgroundColor: Colors.grey.shade300,
                  valueColor: AlwaysStoppedAnimation<Color>(
                    AppConstants.primaryColor,
                  ),
                ),
              )
            : null,
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh),
            onPressed: _reload,
            tooltip: 'Yenile',
          ),
          PopupMenuButton<String>(
            onSelected: (value) async {
              switch (value) {
                case 'back':
                  await _goBack();
                  break;
                case 'forward':
                  await _goForward();
                  break;
                case 'reload':
                  await _reload();
                  break;
                case 'logout':
                  _showLogoutDialog();
                  break;
              }
            },
            itemBuilder: (BuildContext context) {
              return [
                const PopupMenuItem(
                  value: 'back',
                  child: Row(
                    children: [
                      Icon(Icons.arrow_back),
                      SizedBox(width: 8),
                      Text('Geri'),
                    ],
                  ),
                ),
                const PopupMenuItem(
                  value: 'forward',
                  child: Row(
                    children: [
                      Icon(Icons.arrow_forward),
                      SizedBox(width: 8),
                      Text('İleri'),
                    ],
                  ),
                ),
                const PopupMenuItem(
                  value: 'reload',
                  child: Row(
                    children: [
                      Icon(Icons.refresh),
                      SizedBox(width: 8),
                      Text('Yenile'),
                    ],
                  ),
                ),
                const PopupMenuDivider(),
                const PopupMenuItem(
                  value: 'logout',
                  child: Row(
                    children: [
                      Icon(Icons.logout, color: Colors.red),
                      SizedBox(width: 8),
                      Text('Çıkış Yap', style: TextStyle(color: Colors.red)),
                    ],
                  ),
                ),
              ];
            },
          ),
        ],
      ),
      body: Stack(
        children: [
          if (!_hasError)
            WebViewWidget(controller: _controller)
          else
            _buildErrorView(),
        ],
      ),
    );
  }

  Widget _buildErrorView() {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(AppConstants.largePadding),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(
              Icons.error_outline,
              size: 80,
              color: Colors.grey[400],
            ),
            const SizedBox(height: 24),
            Text(
              'Sayfa Yüklenemedi',
              style: TextStyle(
                fontSize: 24,
                fontWeight: FontWeight.bold,
                color: Colors.grey[700],
              ),
            ),
            const SizedBox(height: 16),
            Text(
              AppConstants.loadingError,
              textAlign: TextAlign.center,
              style: TextStyle(
                fontSize: 16,
                color: Colors.grey[600],
              ),
            ),
            const SizedBox(height: 32),
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceEvenly,
              children: [
                LoadingButton(
                  onPressed: _reload,
                  isLoading: false,
                  text: 'Yeniden Dene',
                  icon: Icons.refresh,
                  width: 140,
                ),
                LoadingButton(
                  onPressed: () {
                    Navigator.of(context).pushReplacement(
                      MaterialPageRoute(
                        builder: (context) => const DomainInputScreen(),
                      ),
                    );
                  },
                  isLoading: false,
                  text: 'Domain Değiştir',
                  icon: Icons.home,
                  backgroundColor: Colors.grey[600],
                  width: 140,
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }

  void _showLogoutDialog() {
    showDialog(
      context: context,
      builder: (BuildContext context) {
        return AlertDialog(
          title: const Text('Çıkış Yap'),
          content: const Text(
            'Çıkış yapmak istediğinizden emin misiniz? Önbellek temizlenecek ve domain seçim ekranına yönlendirileceksiniz.',
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.of(context).pop(),
              child: const Text('İptal'),
            ),
            TextButton(
              onPressed: () {
                Navigator.of(context).pop();
                _clearCacheAndLogout();
              },
              style: TextButton.styleFrom(
                foregroundColor: Colors.red,
              ),
              child: const Text('Çıkış Yap'),
            ),
          ],
        );
      },
    );
  }
} 