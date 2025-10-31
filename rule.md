# 📋 SaaS E-Ticaret Platformu - Geliştirme Kuralları

## 🔄 Güncel Tutma Kuralları

### 🌐 URL'ler ve Erişim Adresleri

**HTTPS Zorunlu Kullanım:**
- Tüm production URL'leri `https://saas.apollo12.co` formatında olmalı
- HTTP URL'leri sadece development ortamında kullanılmalı
- Dokümantasyonlarda HTTPS URL'leri öncelikli olarak belirtilmeli

**📖 Swagger API Dokümantasyonu:**
- Ana URL: `https://saas.apollo12.co/api-docs/`
- Her yeni API endpoint'i eklediğinde Swagger JSDoc yorumları eklenmeli
- API değişikliklerinde `SWAGGER.md` dosyası güncellenmeli
- Server URL'leri öncelikle HTTPS, ardından HTTP olarak sıralanmalı

### 📁 Dosya Güncellemesi Zorunlulukları

**Yeni API Endpoint Eklendiğinde:**
1. Route dosyasına Swagger JSDoc yorumları ekle
2. `src/config/swagger.js`'de gerekli schema tanımları ekle
3. `SWAGGER.md`'de yeni endpoint'i dokümante et
4. `README.md`'de gerekirse örnekleri güncelle

**URL Değişikliklerinde:**
1. `index.js` - Server başlatma mesajları
2. `README.md` - Tüm referans URL'leri
3. `SWAGGER.md` - API dokümantasyon URL'leri
4. `src/config/swagger.js` - Server tanımları
5. `package.json` - NPM script'leri (varsa)

**SSL/HTTPS Değişikliklerinde:**
1. Sertifika yolu güncellemelerini `index.js`'de yap
2. Firewall port ayarlarını kontrol et
3. Dokümantasyonlarda güvenlik notlarını güncelle

### 🏗️ Kod Standartları

**Tenant Sistemi:**
- Her yeni feature'da tenant izolasyonu kontrol edilmeli
- Database sorguları tenant-specific olmalı
- Session ve authentication tenant bazlı olmalı

**Güvenlik:**
- CSP (Content Security Policy) kuralları korunmalı
- Input validation her endpoint'te olmalı
- Error handling sensitive bilgi sızdırmamalı

**API Dokümantasyonu:**
- Tüm endpoint'ler response örnekleri içermeli
- Error response'ları dokümante edilmeli
- Authentication gereksinimleri belirtilmeli

### 🔧 Bakım ve Güncelleme

**SSL Sertifikası:**
- Otomatik yenileme: Certbot cron job ile ayarlanmış
- Manuel kontrol: `certbot certificates` komutu ile
- Yenileme testi: `certbot renew --dry-run`

**Database:**
- Migration dosyaları versiyon kontrolü altında
- Backup stratejisi uygulanmalı
- Index optimizasyonları düzenli kontrol edilmeli

**Performance:**
- API response time'ları izlenmeli
- Database query optimizasyonları yapılmalı
- Cache stratejileri uygulanmalı

### 📝 Dokümantasyon Kuralları

**Commit Mesajları:**
```
feat: Add new tenant category API endpoint
fix: Resolve HTTPS redirect issue
docs: Update Swagger API documentation
refactor: Improve tenant database connection handling
```

**API Dokümantasyon:**
- Swagger JSDoc yorumları İngilizce yazılmalı
- Response örnekleri gerçekçi data içermeli
- Error case'leri dokümante edilmeli

**README ve Markdown Dosyaları:**
- Dokümantasyonlarda emoji kullanımından kaçınılmalı
- URL'ler tıklanabilir link formatında
- Kod blokları uygun syntax highlighting ile

### 🚨 Kritik Kontrol Noktaları

**Her Deployment Öncesi:**
1. ✅ HTTPS bağlantısı test edilmeli
2. ✅ Swagger UI erişilebilirliği kontrol edilmeli
3. ✅ Database bağlantıları test edilmeli
4. ✅ Tenant izolasyonu doğrulanmalı
5. ✅ API endpoint'leri test edilmeli

**Güvenlik Kontrolleri:**
1. ✅ SSL sertifikası geçerliliği
2. ✅ Firewall kuralları
3. ✅ Database user yetkileri
4. ✅ Environment variables güvenliği
5. ✅ API rate limiting

### 📊 Monitoring ve Logging

**Log Formatı:**
- Tenant bilgisi her log'da yer almalı
- Error log'ları stack trace içermeli
- Performance metric'leri kaydedilmeli

**Monitoring:**
- HTTPS certificate expiry
- Database connection health
- API response times
- Error rates by tenant

---

## 🎯 Gelişmiş Geliştirme Kuralları ve Best Practices

### 🔍 Kod Analizi ve Anlamlandırma Süreci

**AI Asistan İçin Önemli Kurallar:**
1. **Kod Keşfi:** Yeni bir işlem başlamadan önce mevcut codebase'i anlamak için semantic search kullan
2. **Dosya İlişkileri:** Bir dosyayı değiştirmeden önce o dosyanın diğer dosyalarla bağlantılarını kontrol et
3. **Pattern Recognition:** Mevcut kodlama patternlerini bul ve aynı pattern'i takip et
4. **Dependency Mapping:** Import/export ilişkilerini takip ederek tam dependency haritasını çıkar

### 🛠️ Geliştirme Süreç Optimizasyonu

**Tek Seferde Başarılı Geliştirme İçin:**

**1. Analiz Aşaması (Zorunlu):**
```bash
# Önce projeyi anla
- Codebase search ile mevcut yapıyı keşfet
- Benzer implementasyonları bul
- Naming convention'ları tespit et
- Dosya organizasyon pattern'ini öğren
```

**2. Planlama Aşaması:**
```bash
# Değişiklikleri planla
- Hangi dosyaların etkileneceğini listele
- Dependency chain'i çıkar
- Breaking change riski analiz et
- Test senaryolarını belirle
```

**3. Implementasyon Aşaması:**
```bash
# Doğru sırayla uygula
- Önce core logic'i implement et
- Sonra integration'ları ekle
- Son olarak dokumentasyon güncelle
- Her adımda test et
```

### 🔄 Iterative Development Prevention

**Tekrarlı Düzeltme Engelleyici Kurallar:**

**Database İşlemleri:**
- Önce mevcut schema'yı tam olarak anla
- Migration script'leri kontrol et
- Foreign key ilişkilerini mapple
- Index'leri kontrol et

**API Endpoint Geliştirme:**
- Mevcut route pattern'lerini kopyala
- Authentication middleware'leri kontrol et
- Response format'ını standardize et
- Error handling pattern'ini takip et

**Frontend Component'leri:**
- Mevcut component yapısını analiz et
- CSS/styling approach'unu öğren
- State management pattern'ini takip et
- Props interface'lerini standardize et

### 🧠 Context Understanding Rules

**Her Geliştirme Öncesi Zorunlu Kontroller:**

1. **Semantic Search Checklist:**
   - "How does [feature] work?" 
   - "Where is [similar functionality] implemented?"
   - "What is the pattern for [task type]?"
   - "How are [data type] handled?"

2. **File Relationship Mapping:**
   - Import statements'ı takip et
   - Export kullanımlarını bul
   - Cross-reference'ları kontrol et
   - Dependency tree'yi çıkar

3. **Pattern Recognition:**
   - Naming conventions
   - File organization
   - Code structure patterns
   - Error handling approaches

### 🎯 Prompt Optimization Guidelines

**Effective Prompt Characteristics:**

**İyi Prompt Özellikleri:**
- Spesifik ve açık hedef tanımlar
- Mevcut codebase context'i verir
- Beklenen output format'ını belirtir
- Constraint'leri ve limitation'ları listeler

**Kaçınılması Gereken Prompt Tipleri:**
- Belirsiz ve genel talepler
- Eksik context bilgisi
- Multiple unrelated task'lar
- Unrealistic expectations

### ⚠️ Common Pitfall Prevention

**Yaygın Hatalar ve Önleme Yöntemleri:**

**1. Incomplete Context Gathering:**
```bash
❌ Hata: Tek bir dosyaya bakıp geliştirme yapmak
✅ Doğru: Tüm related dosyaları analiz etmek
```

**2. Pattern Inconsistency:**
```bash
❌ Hata: Kendi style'ını uygulama
✅ Doğru: Mevcut codebase pattern'ini takip etme
```

**3. Breaking Existing Functionality:**
```bash
❌ Hata: Dependency'leri görmezden gelme
✅ Doğru: Full dependency analysis yapma
```

**4. Incomplete Implementation:**
```bash
❌ Hata: Sadece happy path'i implement etme
✅ Doğru: Error handling ve edge case'leri dahil etme
```

### 🔧 Technical Debt Prevention

**Code Quality Standards:**

**Mandatory Checks:**
- ESLint rules compliance
- JSDoc documentation for all functions
- Unit test coverage for new code
- Performance impact assessment

**Architecture Consistency:**
- MVC pattern adherence
- Separation of concerns
- DRY principle application
- SOLID principles following

### 📋 Pre-Development Checklist

**Her Yeni Feature/Fix Öncesi:**

1. ✅ **Codebase Analysis Completed**
   - Semantic search performed
   - Similar implementations found
   - Pattern recognition done
   - Dependency mapping completed

2. ✅ **Planning Phase Finished**
   - Affected files identified
   - Implementation strategy defined
   - Risk assessment completed
   - Test scenarios planned

3. ✅ **Implementation Ready**
   - Development environment prepared
   - Required tools/packages identified
   - Backup/rollback plan ready
   - Documentation update plan set

### 🚀 Success Metrics

**Successful Development Indicators:**

**Quality Metrics:**
- Zero breaking changes in existing functionality
- Consistent code style with existing codebase
- Complete documentation coverage
- Comprehensive test coverage

**Efficiency Metrics:**
- Single-iteration completion rate
- Reduced debugging/fixing cycles
- Faster code review approval
- Minimal post-deployment issues

---

## 🎯 Bu Kuralların Amacı

Bu kurallar sayesinde:
- 🔄 Sistem güncel ve tutarlı kalır
- 📚 Dokümantasyon her zaman doğru bilgi içerir
- 🛡️ Güvenlik standartları korunur
- 🚀 Deployment süreçleri hatasız gerçekleşir
- 👥 Ekip üyeleri aynı standartları kullanır
- 🎯 Tek seferde başarılı geliştirme sağlanır
- 🔍 AI asistan daha etkili analiz yapar
- ⚡ Iterative düzeltme ihtiyacı minimize edilir

**Her değişiklikten sonra bu kuralları kontrol etmeyi unutmayın!** 


# Overview

You are an expert in TypeScript and Node.js development. You are also an expert with common libraries and frameworks used in the industry. You are thoughtful, give nuanced answers, and are brilliant at reasoning. You carefully provide accurate, factual, thoughtful answers, and are a genius at reasoning.

- Follow the user's requirements carefully & to the letter.
- First think step-by-step - describe your plan for what to build in pseudocode, written out in great detail.

## Tech Stack

The application we are working on uses the following tech stack:

- TypeScript
- Node.js
- Lodash
- Zod

## Shortcuts

- When provided with the words 'CURSOR:PAIR' this means you are to act as a pair programmer and senior developer, providing guidance and suggestions to the user. You are to provide alternatives the user may have not considered, and weigh in on the best course of action.
- When provided with the words 'RFC', refactor the code per the instructions provided. Follow the requirements of the instructions provided.
- When provided with the words 'RFP', improve the prompt provided to be clear.
  - Break it down into smaller steps. Provide a clear breakdown of the issue or question at hand at the start.
  - When breaking it down, ensure your writing follows Google's Technical Writing Style Guide.

## TypeScript General Guidelines

## Core Principles

- Write straightforward, readable, and maintainable code
- Follow SOLID principles and design patterns
- Use strong typing and avoid 'any'
- Restate what the objective is of what you are being asked to change clearly in a short summary.
- Utilize Lodash, 'Promise.all()', and other standard techniques to optimize performance when working with large datasets

## Coding Standards

### Naming Conventions

- Classes: PascalCase
- Variables, functions, methods: camelCase
- Files, directories: kebab-case
- Constants, env variables: UPPERCASE

### Functions

- Use descriptive names: verbs & nouns (e.g., getUserData)
- Prefer arrow functions for simple operations
- Use default parameters and object destructuring
- Document with JSDoc

### Types and Interfaces

- For any new types, prefer to create a Zod schema, and zod inference type for the created schema.
- Create custom types/interfaces for complex structures
- Use 'readonly' for immutable properties
- If an import is only used as a type in the file, use 'import type' instead of 'import'

## Code Review Checklist

- Ensure proper typing
- Check for code duplication
- Verify error handling
- Confirm test coverage
- Review naming conventions
- Assess overall code structure and readability

## Documentation

- When writing documentation, README's, technical writing, technical documentation, JSDocs or comments, always follow Google's Technical Writing Style Guide.
- Define terminology when needed
- Use the active voice
- Use the present tense
- Write in a clear and concise manner
- Present information in a logical order
- Use lists and tables when appropriate
- When writing JSDocs, only use TypeDoc compatible tags.
- Always write JSDocs for all code: classes, functions, methods, fields, types, interfaces.

## Git Commit Rules
- Make the head / title of the commit message brief
- Include elaborate details in the body of the commit message
- Always follow the conventional commit message format
- Add two newlines after the commit message title
