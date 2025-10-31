import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'screens/splash_screen.dart';
import 'screens/domain_input_screen.dart';
import 'screens/webview_screen.dart';
import 'utils/app_constants.dart';

void main() {
  runApp(const SaasApp());
}

class SaasApp extends StatelessWidget {
  const SaasApp({super.key});

  @override
  Widget build(BuildContext context) {
    // Sistem UI ayarları
    SystemChrome.setSystemUIOverlayStyle(
      const SystemUiOverlayStyle(
        statusBarColor: Colors.transparent,
        statusBarIconBrightness: Brightness.dark,
        systemNavigationBarColor: Colors.white,
        systemNavigationBarIconBrightness: Brightness.dark,
      ),
    );

    return MaterialApp(
      title: 'SaaS Mobile App',
      debugShowCheckedModeBanner: false,
      theme: ThemeData(
        primarySwatch: Colors.blue,
        primaryColor: AppConstants.primaryColor,
        fontFamily: 'SaasApp',
        useMaterial3: true,
        colorScheme: ColorScheme.fromSeed(
          seedColor: AppConstants.primaryColor,
          brightness: Brightness.light,
        ),
        appBarTheme: const AppBarTheme(
          elevation: 0,
          centerTitle: true,
          backgroundColor: Colors.transparent,
          foregroundColor: Colors.black87,
          systemOverlayStyle: SystemUiOverlayStyle.dark,
        ),
        elevatedButtonTheme: ElevatedButtonThemeData(
          style: ElevatedButton.styleFrom(
            backgroundColor: AppConstants.primaryColor,
            foregroundColor: Colors.white,
            padding: const EdgeInsets.symmetric(horizontal: 32, vertical: 16),
            shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(12),
            ),
            elevation: 2,
          ),
        ),
        inputDecorationTheme: InputDecorationTheme(
          border: OutlineInputBorder(
            borderRadius: BorderRadius.circular(12),
            borderSide: BorderSide(color: Colors.grey.shade300),
          ),
          focusedBorder: OutlineInputBorder(
            borderRadius: BorderRadius.circular(12),
            borderSide: BorderSide(color: AppConstants.primaryColor, width: 2),
          ),
          enabledBorder: OutlineInputBorder(
            borderRadius: BorderRadius.circular(12),
            borderSide: BorderSide(color: Colors.grey.shade300),
          ),
          filled: true,
          fillColor: Colors.grey.shade50,
        ),
      ),
      home: const AppNavigator(),
      routes: {
        '/domain-input': (context) => const DomainInputScreen(),
        '/webview': (context) => const WebViewScreen(),
      },
    );
  }
}

class AppNavigator extends StatefulWidget {
  const AppNavigator({super.key});

  @override
  State<AppNavigator> createState() => _AppNavigatorState();
}

class _AppNavigatorState extends State<AppNavigator> {
  bool _isLoading = true;
  String? _savedDomain;

  @override
  void initState() {
    super.initState();
    _checkSavedDomain();
  }

  Future<void> _checkSavedDomain() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final savedDomain = prefs.getString(AppConstants.savedDomainKey);
      
      await Future.delayed(const Duration(seconds: 2)); // Splash screen göster
      
      setState(() {
        _savedDomain = savedDomain;
        _isLoading = false;
      });
    } catch (e) {
      setState(() {
        _isLoading = false;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    if (_isLoading) {
      return const SplashScreen();
    }
    
    if (_savedDomain != null && _savedDomain!.isNotEmpty) {
      return WebViewScreen(initialDomain: _savedDomain);
    }
    
    return const DomainInputScreen();
  }
} 