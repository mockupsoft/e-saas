import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:http/http.dart' as http;
import '../utils/app_constants.dart';
import '../widgets/loading_button.dart';
import '../widgets/custom_text_field.dart';
import 'webview_screen.dart';

class DomainInputScreen extends StatefulWidget {
  const DomainInputScreen({super.key});

  @override
  State<DomainInputScreen> createState() => _DomainInputScreenState();
}

class _DomainInputScreenState extends State<DomainInputScreen>
    with SingleTickerProviderStateMixin {
  final TextEditingController _domainController = TextEditingController();
  final FocusNode _focusNode = FocusNode();
  
  late AnimationController _animationController;
  late Animation<Offset> _slideAnimation;
  late Animation<double> _fadeAnimation;
  
  bool _isLoading = false;
  String? _errorMessage;

  @override
  void initState() {
    super.initState();
    _setupAnimations();
    _loadLastDomain();
  }

  void _setupAnimations() {
    _animationController = AnimationController(
      duration: AppConstants.normalAnimation,
      vsync: this,
    );

    _slideAnimation = Tween<Offset>(
      begin: const Offset(0, 0.3),
      end: Offset.zero,
    ).animate(
      CurvedAnimation(
        parent: _animationController,
        curve: Curves.easeOutBack,
      ),
    );

    _fadeAnimation = Tween<double>(
      begin: 0.0,
      end: 1.0,
    ).animate(
      CurvedAnimation(
        parent: _animationController,
        curve: Curves.easeInOut,
      ),
    );

    _animationController.forward();
  }

  Future<void> _loadLastDomain() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final lastDomain = prefs.getString('last_attempted_domain');
      if (lastDomain != null && lastDomain.isNotEmpty) {
        _domainController.text = lastDomain;
      }
    } catch (e) {
      AppConstants.debugPrint('Last domain yüklenirken hata: $e');
    }
  }

  Future<bool> _validateDomain(String domain) async {
    try {
      // Temel validasyon
      if (!AppConstants.isValidDomain(domain)) {
        throw Exception(AppConstants.invalidDomain);
      }

      // Domain erişilebilirlik kontrolü
      final url = AppConstants.buildTenantUrl(domain);
      final response = await http.head(
        Uri.parse(url),
        headers: {
          'User-Agent': AppConstants.userAgentKey,
        },
      ).timeout(
        Duration(seconds: AppConstants.connectionTimeout),
      );

      if (response.statusCode == 200 || response.statusCode == 302) {
        return true;
      } else {
        throw Exception(AppConstants.domainNotFound);
      }
    } on http.ClientException {
      throw Exception(AppConstants.networkError);
    } catch (e) {
      if (e.toString().contains('CERTIFICATE_VERIFY_FAILED')) {
        throw Exception(AppConstants.sslError);
      }
      rethrow;
    }
  }

  Future<void> _connectToDomain() async {
    final domain = _domainController.text.trim().toLowerCase();
    
    if (domain.isEmpty) {
      setState(() {
        _errorMessage = 'Lütfen domain adını girin';
      });
      return;
    }

    setState(() {
      _isLoading = true;
      _errorMessage = null;
    });

    try {
      // Domain validasyonu
      await _validateDomain(domain);

      // Domain'i kaydet
      final prefs = await SharedPreferences.getInstance();
      await prefs.setString(AppConstants.savedDomainKey, domain);
      await prefs.setString('last_attempted_domain', domain);

      // WebView ekranına geç
      if (mounted) {
        Navigator.of(context).pushReplacement(
          MaterialPageRoute(
            builder: (context) => WebViewScreen(initialDomain: domain),
          ),
        );
      }
    } catch (e) {
      setState(() {
        _errorMessage = e.toString().replaceAll('Exception: ', '');
        _isLoading = false;
      });

      // Hata feedback'i
      HapticFeedback.lightImpact();
    }
  }

  @override
  void dispose() {
    _domainController.dispose();
    _focusNode.dispose();
    _animationController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppConstants.backgroundColor,
      appBar: AppBar(
        title: const Text('Tenant Seçimi'),
        centerTitle: true,
      ),
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(AppConstants.largePadding),
          child: AnimatedBuilder(
            animation: _animationController,
            builder: (context, child) {
              return FadeTransition(
                opacity: _fadeAnimation,
                child: SlideTransition(
                  position: _slideAnimation,
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.stretch,
                    children: [
                      const SizedBox(height: 40),
                      
                      // Logo ve başlık
                      _buildHeader(),
                      
                      const SizedBox(height: 60),
                      
                      // Domain input formu
                      _buildDomainForm(),
                      
                      const SizedBox(height: 40),
                      
                      // Yardım metni
                      _buildHelpText(),
                      
                      const SizedBox(height: 20),
                      
                      // Örnek domainler
                      _buildExamples(),
                    ],
                  ),
                ),
              );
            },
          ),
        ),
      ),
    );
  }

  Widget _buildHeader() {
    return Column(
      children: [
        Container(
          width: 80,
          height: 80,
          decoration: BoxDecoration(
            color: AppConstants.primaryColor,
            borderRadius: BorderRadius.circular(20),
            boxShadow: [
              BoxShadow(
                color: AppConstants.primaryColor.withOpacity(0.3),
                blurRadius: 20,
                offset: const Offset(0, 10),
              ),
            ],
          ),
          child: const Icon(
            Icons.domain,
            size: 40,
            color: Colors.white,
          ),
        ),
        const SizedBox(height: 24),
        const Text(
          'Tenant Domain',
          style: TextStyle(
            fontSize: 28,
            fontWeight: FontWeight.bold,
            color: Colors.black87,
          ),
        ),
        const SizedBox(height: 8),
        Text(
          'Bağlanmak istediğiniz tenant domain adını girin',
          textAlign: TextAlign.center,
          style: TextStyle(
            fontSize: 16,
            color: Colors.grey[600],
          ),
        ),
      ],
    );
  }

  Widget _buildDomainForm() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        CustomTextField(
          controller: _domainController,
          focusNode: _focusNode,
          label: 'Tenant Domain',
          hint: 'test1',
          prefixIcon: Icons.language,
          suffix: '.saas.apollo12.co',
          keyboardType: TextInputType.url,
          textInputAction: TextInputAction.go,
          onSubmitted: (_) => _connectToDomain(),
          errorText: _errorMessage,
          enabled: !_isLoading,
        ),
        const SizedBox(height: 24),
        LoadingButton(
          onPressed: _connectToDomain,
          isLoading: _isLoading,
          text: 'Bağlan',
          icon: Icons.login,
        ),
      ],
    );
  }

  Widget _buildHelpText() {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.blue[50],
        borderRadius: BorderRadius.circular(AppConstants.borderRadius),
        border: Border.all(color: Colors.blue[200]!),
      ),
      child: Row(
        children: [
          Icon(
            Icons.info_outline,
            color: Colors.blue[600],
            size: 20,
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Text(
              'Sadece domain adını girin. Örnek: "test1" yazdığınızda "test1.saas.apollo12.co" adresine bağlanılır.',
              style: TextStyle(
                fontSize: 14,
                color: Colors.blue[700],
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildExamples() {
    final examples = ['test1', 'demo', 'dbtest'];
    
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          'Örnek Domainler:',
          style: TextStyle(
            fontSize: 16,
            fontWeight: FontWeight.w600,
            color: Colors.grey[700],
          ),
        ),
        const SizedBox(height: 12),
        Wrap(
          spacing: 8,
          runSpacing: 8,
          children: examples.map((example) {
            return Material(
              color: Colors.transparent,
              child: InkWell(
                onTap: _isLoading ? null : () {
                  _domainController.text = example;
                  _connectToDomain();
                },
                borderRadius: BorderRadius.circular(20),
                child: Container(
                  padding: const EdgeInsets.symmetric(
                    horizontal: 16,
                    vertical: 8,
                  ),
                  decoration: BoxDecoration(
                    color: Colors.grey[100],
                    borderRadius: BorderRadius.circular(20),
                    border: Border.all(color: Colors.grey[300]!),
                  ),
                  child: Text(
                    '$example.saas.apollo12.co',
                    style: TextStyle(
                      fontSize: 14,
                      color: Colors.grey[700],
                      fontWeight: FontWeight.w500,
                    ),
                  ),
                ),
              ),
            );
          }).toList(),
        ),
      ],
    );
  }
} 