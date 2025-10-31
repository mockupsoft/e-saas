const swaggerJSDoc = require('swagger-jsdoc');
const swaggerUi = require('swagger-ui-express');

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'SaaS E-Ticaret Platformu API',
      version: '1.0.0',
      description: 'Multi-tenant SaaS e-ticaret platformu için API dokümantasyonu',
      contact: {
        name: 'API Desteği',
        email: 'support@saas.apollo12.co'
      },
      license: {
        name: 'MIT',
        url: 'https://opensource.org/licenses/MIT'
      }
    },
    servers: [
      {
        url: 'https://saas.apollo12.co',
        description: 'Production Server (HTTPS)'
      },
      {
        url: 'http://saas.apollo12.co:3000',
        description: 'Development Server (HTTP)'
      },
      {
        url: 'http://localhost:3000',
        description: 'Development Server'
      }
    ],
    components: {
      securitySchemes: {
        BearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT'
        },
        SessionAuth: {
          type: 'apiKey',
          in: 'cookie',
          name: 'connect.sid'
        }
      },
      schemas: {
        Category: {
          type: 'object',
          required: ['name', 'status'],
          properties: {
            id: {
              type: 'integer',
              description: 'Kategori ID',
              example: 1
            },
            name: {
              type: 'string',
              description: 'Kategori adı',
              example: 'Elektronik'
            },
            description: {
              type: 'string',
              description: 'Kategori açıklaması',
              example: 'Elektronik ürünler kategorisi'
            },
            status: {
              type: 'string',
              enum: ['active', 'inactive'],
              description: 'Kategori durumu',
              example: 'active'
            },
            created_at: {
              type: 'string',
              format: 'date-time',
              description: 'Oluşturulma tarihi'
            },
            updated_at: {
              type: 'string',
              format: 'date-time',
              description: 'Güncellenme tarihi'
            }
          }
        },
        CategoryInput: {
          type: 'object',
          required: ['name', 'status'],
          properties: {
            name: {
              type: 'string',
              description: 'Kategori adı',
              example: 'Elektronik'
            },
            description: {
              type: 'string',
              description: 'Kategori açıklaması',
              example: 'Elektronik ürünler kategorisi'
            },
            status: {
              type: 'string',
              enum: ['active', 'inactive'],
              description: 'Kategori durumu',
              example: 'active'
            }
          }
        },
        Tenant: {
          type: 'object',
          properties: {
            id: {
              type: 'integer',
              description: 'Tenant ID',
              example: 1
            },
            name: {
              type: 'string',
              description: 'Tenant adı',
              example: 'Test Mağaza'
            },
            domain: {
              type: 'string',
              description: 'Tenant domain',
              example: 'test1'
            },
            db_name: {
              type: 'string',
              description: 'Tenant veritabanı adı',
              example: 'saas_test1'
            },
            status: {
              type: 'string',
              enum: ['active', 'inactive'],
              description: 'Tenant durumu',
              example: 'active'
            },
            created_at: {
              type: 'string',
              format: 'date-time',
              description: 'Oluşturulma tarihi'
            }
          }
        },
        ApiResponse: {
          type: 'object',
          properties: {
            success: {
              type: 'boolean',
              description: 'İşlem başarı durumu'
            },
            data: {
              type: 'object',
              description: 'Yanıt verisi'
            },
            message: {
              type: 'string',
              description: 'İşlem mesajı'
            },
            timestamp: {
              type: 'string',
              format: 'date-time',
              description: 'Yanıt zamanı'
            }
          }
        },
        Coupon: {
          type: 'object',
          required: ['code', 'type', 'amount'],
          properties: {
            id: {
              type: 'integer',
              description: 'Kupon ID\'si',
              example: 1
            },
            code: {
              type: 'string',
              description: 'Kupon kodu',
              maxLength: 50,
              example: 'INDIRIM20'
            },
            type: {
              type: 'string',
              enum: ['percentage', 'fixed'],
              description: 'Kupon tipi (yüzde veya sabit tutar)',
              example: 'percentage'
            },
            amount: {
              type: 'number',
              format: 'decimal',
              description: 'İndirim miktarı',
              minimum: 0,
              example: 20
            },
            min_cart_total: {
              type: 'number',
              format: 'decimal',
              description: 'Minimum sepet tutarı',
              minimum: 0,
              example: 100
            },
            expires_at: {
              type: 'string',
              format: 'date-time',
              description: 'Son kullanma tarihi',
              nullable: true,
              example: '2024-12-31T23:59:59Z'
            },
            status: {
              type: 'string',
              enum: ['active', 'inactive'],
              description: 'Kupon durumu',
              example: 'active'
            },
            created_at: {
              type: 'string',
              format: 'date-time',
              description: 'Oluşturulma tarihi'
            },
            updated_at: {
              type: 'string',
              format: 'date-time',
              description: 'Güncellenme tarihi'
            },
            is_valid: {
              type: 'boolean',
              description: 'Kuponun geçerli olup olmadığı'
            },
            is_expired: {
              type: 'boolean',
              description: 'Kuponun süresi dolmuş mu'
            }
          }
        },
        CouponInput: {
          type: 'object',
          required: ['code', 'type', 'amount'],
          properties: {
            code: {
              type: 'string',
              description: 'Kupon kodu',
              maxLength: 50,
              example: 'INDIRIM20'
            },
            type: {
              type: 'string',
              enum: ['percentage', 'fixed'],
              description: 'Kupon tipi',
              example: 'percentage'
            },
            amount: {
              type: 'number',
              format: 'decimal',
              description: 'İndirim miktarı',
              minimum: 0,
              example: 20
            },
            min_cart_total: {
              type: 'number',
              format: 'decimal',
              description: 'Minimum sepet tutarı',
              minimum: 0,
              example: 100
            },
            expires_at: {
              type: 'string',
              format: 'date-time',
              description: 'Son kullanma tarihi',
              nullable: true,
              example: '2024-12-31T23:59:59Z'
            },
            status: {
              type: 'string',
              enum: ['active', 'inactive'],
              description: 'Kupon durumu',
              example: 'active'
            }
          }
        },
        Error: {
          type: 'object',
          properties: {
            success: {
              type: 'boolean',
              example: false
            },
            error: {
              type: 'string',
              description: 'Hata mesajı'
            },
            timestamp: {
              type: 'string',
              format: 'date-time',
              description: 'Hata zamanı'
            }
          }
        }
      }
    },
    security: [
      {
        SessionAuth: []
      }
    ]
  },
  apis: [
    './src/routes/*.js',
    './src/models/*.js',
    './index.js'
  ]
};

const specs = swaggerJSDoc(options);

module.exports = {
  specs,
  swaggerUi,
  swaggerSetup: swaggerUi.setup(specs, {
    customCss: `
      .swagger-ui .topbar { display: none }
      .swagger-ui .info { margin: 50px 0 }
      .swagger-ui .info .title { 
        color: #3b82f6; 
        font-size: 36px;
      }
    `,
    customSiteTitle: "SaaS E-Ticaret API Docs",
    customfavIcon: "/favicon.ico"
  })
}; 