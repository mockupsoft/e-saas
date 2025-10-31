# ⚡ Cursor Token Optimizasyon Rehberi - SaaS E-Ticaret Platformu

Bu rehber, Cursor AI ile çalışırken token kullanımını minimize etmek ve verimli geliştirme sağlamak için stratejiler içerir.

## 🎯 Token Optimizasyon Stratejileri

### 📊 Token Kullanım Analizi

#### Yüksek Token Tüketen İşlemler
```
❌ Verimsiz İşlemler:
- Tüm codebase'i okuma (5000+ token)
- Gereksiz dosya analizi (2000+ token)
- Tekrarlı aynı sorular (1000+ token)
- Belirsiz promptlar (500+ token)

✅ Verimli İşlemler:
- Spesifik dosya okuma (200-500 token)
- Targeted semantic search (300-800 token)
- Pattern-based development (100-300 token)
- Context-aware prompts (50-200 token)
```

### 🎯 Efficient Prompting Strategies

#### 1. Context-First Approach
```
❌ Verimsiz:
"Bu projeye yeni bir özellik ekle"

✅ Verimli:
"src/controllers/CategoryController.js pattern'ini takip ederek ProductController.js'ye search functionality ekle. Mevcut CRUD response formatını koru."
```

#### 2. Pattern Reference Method
```
❌ Verimsiz:
"Yeni bir modal oluştur"

✅ Verimli:
"views/partials/components/modal.ejs template'ini kullanarak category-edit-modal.ejs oluştur. Parametreler: id='editCategoryModal', title='Kategori Düzenle'"
```

#### 3. Batch Operations
```
❌ Verimsiz: 3 ayrı prompt
1. "CategoryController'a pagination ekle"
2. "ProductController'a pagination ekle"  
3. "OrderController'a pagination ekle"

✅ Verimli: 1 prompt
"Bu 3 controller'a aynı pagination pattern'ini ekle: CategoryController.js, ProductController.js, OrderController.js. Mevcut getAll metodlarını güncelle."
```

## 🔍 Smart Semantic Search

### 📝 Effective Search Queries

#### ✅ İyi Semantic Search Örnekleri
```javascript
// Spesifik ve hedefli sorgular
"How does category CRUD work in this project?"
"Where are tenant database connections managed?"
"What is the authentication middleware pattern?"
"How are API responses formatted in this codebase?"
"Where is the modal component defined and how is it used?"
```

#### ❌ Kötü Semantic Search Örnekleri
```javascript
// Belirsiz ve genel sorgular
"CategoryController"
"database"
"modal"
"authentication"
"API"
```

### 🎯 Search Strategy Framework

#### 1. Hierarchical Search Pattern
```javascript
// Level 1: High-level understanding
"How does the multi-tenant architecture work?"

// Level 2: Specific component analysis  
"How are tenant databases created and managed?"

// Level 3: Implementation details
"What is the pattern for tenant database migrations?"
```

#### 2. Context Building Sequence
```javascript
// Step 1: Architecture understanding
"What is the overall project structure and technology stack?"

// Step 2: Pattern identification
"What are the common patterns for CRUD operations?"

// Step 3: Specific implementation
"How should I implement product search following existing patterns?"
```

## 📋 Context Management

### 🧠 Context Preservation Techniques

#### 1. Reference Documentation
```markdown
<!-- Dosya başına context ekle -->
/**
 * CONTEXT: Multi-tenant category management
 * PATTERN: Standard CRUD with soft delete
 * DEPENDENCIES: src/utils/db.js (executeTenantQuery)
 * RELATED: views/tenant/categories.ejs, CategoryController.js
 * RESPONSE_FORMAT: {success, data, message, timestamp}
 */
```

#### 2. Pattern Documentation
```javascript
// Pattern reference comments
/**
 * STANDARD_CRUD_PATTERN:
 * - GET /api/resource -> getAll() method
 * - POST /api/resource -> create() method  
 * - PUT /api/resource/:id -> update() method
 * - DELETE /api/resource/:id -> delete() method (soft delete)
 * - Response format: {success, data, message, timestamp}
 */
```

### 📚 Knowledge Base Creation

#### 1. Component Registry
```javascript
// components.json - Component reference
{
  "modal": {
    "path": "views/partials/components/modal.ejs",
    "parameters": ["id", "title", "size", "content", "buttons"],
    "example": "include('components/modal', {id: 'test', title: 'Test'})"
  },
  "table": {
    "path": "views/partials/components/table.ejs", 
    "parameters": ["headers", "rows", "actions", "loadUrl"],
    "example": "include('components/table', {headers: [], loadUrl: '/api/data'})"
  }
}
```

#### 2. Pattern Library
```javascript
// patterns.json - Code patterns
{
  "crud_controller": {
    "template": "src/controllers/CategoryController.js",
    "methods": ["getAll", "create", "update", "delete"],
    "response_format": "{success, data, message, timestamp}"
  },
  "api_route": {
    "template": "src/routes/tenant.js",
    "pattern": "router.get('/api/resource', Controller.method)"
  }
}
```

## 🚀 Development Workflow Optimization

### ⚡ Fast Development Patterns

#### 1. Template-Based Development
```
Workflow:
1. Identify similar existing component
2. Reference exact file path and pattern
3. Specify only the differences
4. Use batch operations for multiple files

Example:
"src/controllers/CategoryController.js pattern'ini kopyalayarak BrandController.js oluştur. Sadece model adını 'brands' olarak değiştir."
```

#### 2. Incremental Enhancement
```
Workflow:
1. Start with minimal viable implementation
2. Add features one by one with specific prompts
3. Reference existing patterns for each addition
4. Test incrementally

Example:
"Mevcut CategoryController.js'ye search functionality ekle. ProductController.js'deki search pattern'ini kullan."
```

### 🔄 Iterative Development Prevention

#### 1. Comprehensive Initial Analysis
```
Before starting development:
✅ Analyze existing similar implementations
✅ Identify all required dependencies  
✅ Map out component relationships
✅ Plan the complete feature scope

Prompt example:
"ProductController.js'ye benzer şekilde CategoryController.js oluşturmadan önce, mevcut CRUD pattern'ini, database schema'sını ve response format'ını analiz et."
```

#### 2. Dependency Mapping
```
Always include in prompts:
✅ Related files that need updates
✅ Database schema requirements
✅ Frontend component dependencies
✅ API endpoint impacts

Example:
"CategoryController.js oluştururken şu dosyaları da güncelle: src/routes/tenant.js (route tanımları), views/tenant/categories.ejs (frontend), src/models/Category.js (model)"
```

## 📊 Performance Monitoring

### 📈 Token Usage Tracking

#### 1. Session Metrics
```javascript
// Token usage tracker
class TokenTracker {
    constructor() {
        this.session = {
            totalPrompts: 0,
            totalTokens: 0,
            averageTokensPerPrompt: 0,
            efficientPrompts: 0,
            wastedTokens: 0
        };
    }
    
    logPrompt(prompt, tokenCount, wasEfficient) {
        this.session.totalPrompts++;
        this.session.totalTokens += tokenCount;
        this.session.averageTokensPerPrompt = 
            this.session.totalTokens / this.session.totalPrompts;
            
        if (wasEfficient) {
            this.session.efficientPrompts++;
        } else {
            this.session.wastedTokens += tokenCount;
        }
    }
    
    getEfficiencyReport() {
        return {
            efficiency: (this.session.efficientPrompts / this.session.totalPrompts) * 100,
            wastedPercentage: (this.session.wastedTokens / this.session.totalTokens) * 100,
            averageTokens: this.session.averageTokensPerPrompt
        };
    }
}
```

#### 2. Efficiency Benchmarks
```
Token Efficiency Targets:
🎯 Excellent: <200 tokens per feature implementation
✅ Good: 200-500 tokens per feature implementation  
⚠️ Acceptable: 500-1000 tokens per feature implementation
❌ Poor: >1000 tokens per feature implementation

Prompt Efficiency Targets:
🎯 Excellent: >80% successful first-try implementations
✅ Good: 60-80% successful first-try implementations
⚠️ Acceptable: 40-60% successful first-try implementations  
❌ Poor: <40% successful first-try implementations
```

## 🎯 Specific Optimization Techniques

### 🔧 Code Generation Shortcuts

#### 1. Pattern Replication
```
Instead of explaining everything:
"CategoryController.js'yi ProductController.js olarak kopyala, sadece 'categories' -> 'products' değiştir"

Instead of building from scratch:
"views/tenant/categories.ejs template'ini kullanarak products.ejs oluştur"
```

#### 2. Diff-Based Updates
```
Instead of rewriting entire files:
"CategoryController.js'de sadece getAll metoduna pagination ekle, diğer metodları değiştirme"

Instead of full component recreation:
"modal.ejs'ye sadece size='xl' seçeneği ekle, mevcut functionality'yi koru"
```

### 📝 Documentation Shortcuts

#### 1. Auto-Documentation
```javascript
// Self-documenting code patterns
/**
 * AUTO_GENERATED: Based on CategoryController.js pattern
 * MODIFICATIONS: Changed model from 'categories' to 'products'
 * DEPENDENCIES: Same as CategoryController.js
 */
class ProductController extends CategoryController {
    // Implementation follows same pattern
}
```

#### 2. Reference Links
```javascript
/**
 * REFERENCE: See CategoryController.js for pattern explanation
 * USAGE: Same CRUD operations, different model
 * TESTS: Use same test pattern as CategoryController
 */
```

## 🧪 Testing Optimization

### ⚡ Fast Testing Strategies

#### 1. Pattern-Based Testing
```
Instead of writing new tests:
"CategoryController.js test pattern'ini kullanarak ProductController.js testlerini oluştur"

Instead of manual testing:
"Mevcut category API test script'ini product API için adapt et"
```

#### 2. Batch Testing
```
Single prompt for multiple tests:
"Bu 3 controller için aynı test pattern'ini uygula: Category, Product, Brand. Her biri için CRUD operasyonlarını test et."
```

### 🔍 Debug Optimization

#### 1. Context-Aware Debugging
```
Efficient debug prompts:
"CategoryController.js'de getAll metodu 500 error veriyor. Mevcut tenant database connection pattern'ini kontrol et."

Instead of generic debugging:
"Bu error'ı çöz: Internal Server Error"
```

#### 2. Pattern-Based Fixes
```
Reference existing solutions:
"ProductController.js'deki aynı error'ı nasıl çözdüysek, CategoryController.js'ye de aynı fix'i uygula"
```

## 📋 Optimization Checklist

### ✅ Before Each Prompt
- [ ] Specific file/component reference included
- [ ] Existing pattern identified and referenced  
- [ ] Clear, single-purpose objective defined
- [ ] Dependencies and related files mapped
- [ ] Expected outcome clearly specified

### ✅ During Development
- [ ] Use batch operations when possible
- [ ] Reference existing implementations
- [ ] Avoid redundant analysis requests
- [ ] Build incrementally on previous work
- [ ] Test patterns before full implementation

### ✅ After Implementation
- [ ] Document patterns for future reference
- [ ] Update component registry if needed
- [ ] Note successful prompt patterns
- [ ] Identify reusable code snippets
- [ ] Plan next optimization opportunities

## 🎯 Advanced Optimization Techniques

### 🤖 AI-Assisted Pattern Recognition

#### 1. Pattern Templates
```javascript
// Create reusable prompt templates
const PROMPT_TEMPLATES = {
    crud_controller: (resource) => 
        `Create ${resource}Controller.js following CategoryController.js pattern. Change only model name from 'categories' to '${resource}'.`,
    
    api_routes: (resource) =>
        `Add ${resource} routes to tenant.js following category routes pattern. Use ${resource}Controller methods.`,
        
    frontend_view: (resource) =>
        `Create ${resource}.ejs view following categories.ejs pattern. Update table headers for ${resource} fields.`
};
```

#### 2. Context Injection
```javascript
// Automatic context injection
const injectContext = (prompt, context) => {
    return `
CONTEXT: ${context.projectType} - ${context.currentFeature}
PATTERN: ${context.referenceFile}
DEPENDENCIES: ${context.dependencies.join(', ')}

TASK: ${prompt}

CONSTRAINTS: 
- Follow existing code patterns
- Maintain response format consistency
- Update related files if needed
`;
};
```

### 🔄 Workflow Automation

#### 1. Development Sequences
```javascript
// Automated development sequences
const DEVELOPMENT_SEQUENCES = {
    new_crud_feature: [
        'Analyze existing CRUD pattern',
        'Create controller following pattern', 
        'Add routes to router',
        'Create frontend view',
        'Add navigation menu item',
        'Test API endpoints'
    ],
    
    component_enhancement: [
        'Identify target component',
        'Analyze current implementation',
        'Plan enhancement approach',
        'Implement changes',
        'Update documentation',
        'Test functionality'
    ]
};
```

#### 2. Quality Gates
```javascript
// Automated quality checks
const QUALITY_GATES = {
    before_prompt: [
        'Is the objective specific and clear?',
        'Are existing patterns referenced?',
        'Are dependencies identified?',
        'Is the scope appropriately limited?'
    ],
    
    after_implementation: [
        'Does code follow existing patterns?',
        'Are all dependencies updated?',
        'Is functionality tested?',
        'Is documentation updated?'
    ]
};
```

Bu optimizasyon rehberi, Cursor AI ile çalışırken token kullanımını minimize ederek, hızlı ve verimli geliştirme sağlamanızı mümkün kılar.
