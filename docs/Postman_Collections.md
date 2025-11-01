# Postman Collections for BlockTrade API

## 📋 Overview

This document provides comprehensive Postman collections for testing BlockTrade's Authentication and Letter of Credit APIs. The collections include complete authentication flows, user management, profile operations, and all LC lifecycle management.

## 🚀 Quick Start

### Import Instructions

1. **Download Collection**: Use the complete Postman collection file: `blocktrade-auth-lc-api.postman_collection.json`
2. **Import to Postman**:
   - Open Postman
   - Click "Import" button
   - Select "Upload Files" tab
   - Choose the downloaded collection file
   - Click "Import"

### Environment Setup

Create a Postman environment with these variables:

```json
{
  "name": "BlockTrade API Environment",
  "values": [
    {
      "key": "base_url",
      "value": "http://localhost:3000/api",
      "enabled": true
    },
    {
      "key": "access_token",
      "value": "",
      "enabled": true
    },
    {
      "key": "refresh_token",
      "value": "",
      "enabled": true
    },
    {
      "key": "user_id",
      "value": "",
      "enabled": true
    },
    {
      "key": "organization_id",
      "value": "",
      "enabled": true
    },
    {
      "key": "lc_id",
      "value": "",
      "enabled": true
    }
  ]
}
```

## 🔐 Authentication Endpoints Collection

The authentication collection includes comprehensive user management and security features:

### 👤 User Registration

- **Register - Bank Admin**: Complete registration with admin privileges
- **Register - Bank Officer**: Standard bank officer registration
- **Register - Corporate User**: Corporate entity registration
- **Error Testing**: Invalid data validation testing

### 🔑 User Login

- **Login - Bank Admin**: Admin authentication with token management
- **Login - Bank Officer**: Officer authentication
- **Login - Corporate User**: Corporate user authentication
- **Login - Invalid Credentials**: Error handling validation
- **Auto Token Management**: Automatic token storage and refresh

### 👤 Profile Management

- **Get Current User Profile**: Retrieve authenticated user details
- **Update User Profile**: Modify profile information, preferences, notifications
- **Profile Validation**: Input validation and error handling

### 🔒 Password Management

- **Change Password**: Secure password update for authenticated users
- **Forgot Password**: Password reset request via email
- **Reset Password**: Password reset using email token
- **Password Validation**: Strength requirements testing

### 🔄 Token Management

- **Refresh Access Token**: Automatic token renewal
- **Logout**: Secure session termination
- **Token Expiry Handling**: Automatic token refresh workflows

### ⚠️ Error Testing

- **Duplicate Registration**: Username/email conflict handling
- **Invalid Email Format**: Email validation testing
- **Weak Password**: Password strength validation
- **Unauthorized Access**: Authentication requirement testing

## 📄 Letter of Credit Collection

Comprehensive LC lifecycle management with all business operations:

### 📋 LC Operations

- **Create Letter of Credit**: Full LC creation with trade details
- **Get LC by ID**: Detailed LC information retrieval
- **Get All LCs**: Paginated LC listing with filters
- **Search LCs**: Advanced filtering and search capabilities

### 🔄 Status Management

- **Update LC Status - Issue**: Bank approval and issuance
- **Update LC Status - Advise**: Advising bank notification
- **Update LC Status - Confirm**: LC confirmation process
- **Update LC Status - Reject**: Rejection with detailed reasons

### 📊 Analytics & Search

- **Search by Beneficiary**: Beneficiary-based filtering
- **Search by Date Range**: Time-based LC queries
- **Get LC Statistics**: Comprehensive analytics (future implementation)

### ⚠️ Error Scenarios

- **Create LC - Invalid Data**: Validation error testing
- **Get Non-existent LC**: 404 error handling
- **Update Status - Invalid Transition**: Business rule validation

## 👥 User Management Collection

Administrative user management capabilities:

### Admin Functions

- **Get All Users**: User listing with pagination and filters
- **Update User Status**: Account activation/deactivation
- **Permission Management**: Role-based access control testing

## 🛠️ Testing Workflows

### 1. Complete Authentication Flow

```javascript
// Pre-request Script for automatic testing
pm.test("Complete Auth Flow", function () {
  // 1. Register new user
  pm.sendRequest(
    {
      url: pm.environment.get("base_url") + "/auth/register",
      method: "POST",
      header: { "Content-Type": "application/json" },
      body: {
        mode: "raw",
        raw: JSON.stringify({
          username: "test_user_" + Date.now(),
          email: "test@example.com",
          password: "SecurePass123!",
          confirmPassword: "SecurePass123!",
          firstName: "Test",
          lastName: "User",
          role: "bank_officer",
          organizationId: "123e4567-e89b-12d3-a456-426614174000",
          organizationName: "Test Bank",
          organizationType: "bank",
          acceptTerms: true,
        }),
      },
    },
    function (err, res) {
      if (res.code === 201) {
        const data = res.json().data;
        pm.environment.set("access_token", data.tokens.accessToken);
        pm.environment.set("user_id", data.user.id);
        console.log("✅ Registration successful");
      }
    }
  );
});
```

### 2. LC Lifecycle Testing

```javascript
// Complete LC workflow test
const testLCLifecycle = {
  // Step 1: Create LC
  createLC: function () {
    pm.sendRequest(
      {
        url: pm.environment.get("base_url") + "/lc",
        method: "POST",
        header: {
          "Content-Type": "application/json",
          Authorization: "Bearer " + pm.environment.get("access_token"),
        },
        body: {
          mode: "raw",
          raw: JSON.stringify({
            type: "commercial",
            applicant: {
              name: "Test Applicant Corp",
              // ... other details
            },
            amount: { value: 100000, currency: "USD" },
            // ... other LC details
          }),
        },
      },
      function (err, res) {
        if (res.code === 201) {
          pm.environment.set("lc_id", res.json().data.id);
          console.log("✅ LC Created:", res.json().data.lcNumber);
        }
      }
    );
  },

  // Step 2: Update Status
  updateStatus: function (status, reason) {
    pm.sendRequest(
      {
        url:
          pm.environment.get("base_url") +
          "/lc/" +
          pm.environment.get("lc_id") +
          "/status",
        method: "PATCH",
        header: {
          "Content-Type": "application/json",
          Authorization: "Bearer " + pm.environment.get("access_token"),
        },
        body: {
          mode: "raw",
          raw: JSON.stringify({ status: status, reason: reason }),
        },
      },
      function (err, res) {
        if (res.code === 200) {
          console.log("✅ LC Status Updated:", status);
        }
      }
    );
  },
};
```

## 📋 Environment Configuration

### Development Environment

```json
{
  "id": "dev-environment-id",
  "name": "BlockTrade Development",
  "values": [
    {
      "key": "base_url",
      "value": "http://localhost:3000/api",
      "enabled": true,
      "type": "default"
    },
    {
      "key": "frontend_url",
      "value": "http://localhost:4200",
      "enabled": true,
      "type": "default"
    },
    {
      "key": "access_token",
      "value": "",
      "enabled": true,
      "type": "secret"
    },
    {
      "key": "refresh_token",
      "value": "",
      "enabled": true,
      "type": "secret"
    },
    {
      "key": "user_id",
      "value": "",
      "enabled": true,
      "type": "default"
    },
    {
      "key": "organization_id",
      "value": "",
      "enabled": true,
      "type": "default"
    },
    {
      "key": "lc_id",
      "value": "",
      "enabled": true,
      "type": "default"
    }
  ]
}
```

### Production Environment

```json
{
  "id": "prod-environment-id",
  "name": "BlockTrade Production",
  "values": [
    {
      "key": "base_url",
      "value": "https://api.blocktrade.com/api",
      "enabled": true,
      "type": "default"
    },
    {
      "key": "frontend_url",
      "value": "https://app.blocktrade.com",
      "enabled": true,
      "type": "default"
    },
    {
      "key": "access_token",
      "value": "",
      "enabled": true,
      "type": "secret"
    },
    {
      "key": "refresh_token",
      "value": "",
      "enabled": true,
      "type": "secret"
    },
    {
      "key": "user_id",
      "value": "",
      "enabled": true,
      "type": "default"
    },
    {
      "key": "organization_id",
      "value": "",
      "enabled": true,
      "type": "default"
    },
    {
      "key": "lc_id",
      "value": "",
      "enabled": true,
      "type": "default"
    }
  ]
}
```

## BlockTrade API Collection

```json
{
  "info": {
    "name": "BlockTrade API",
    "description": "Comprehensive API collection for BlockTrade - Blockchain Trade Finance Platform",
    "version": "1.0.0",
    "schema": "https://schema.getpostman.com/json/collection/v2.1.0/collection.json"
  },
  "variable": [
    {
      "key": "base_url",
      "value": "http://localhost:3000/api",
      "type": "string"
    }
  ],
  "auth": {
    "type": "bearer",
    "bearer": [
      {
        "key": "token",
        "value": "{{auth_token}}",
        "type": "string"
      }
    ]
  },
  "event": [
    {
      "listen": "prerequest",
      "script": {
        "exec": [
          "// Set common headers",
          "pm.request.headers.add({",
          "    key: 'Content-Type',",
          "    value: 'application/json'",
          "});",
          "",
          "// Add timestamp for audit",
          "pm.globals.set('timestamp', new Date().toISOString());"
        ],
        "type": "text/javascript"
      }
    },
    {
      "listen": "test",
      "script": {
        "exec": [
          "// Global test scripts",
          "pm.test('Response time is less than 2000ms', function () {",
          "    pm.expect(pm.response.responseTime).to.be.below(2000);",
          "});",
          "",
          "pm.test('Response has success field', function () {",
          "    const jsonData = pm.response.json();",
          "    pm.expect(jsonData).to.have.property('success');",
          "});",
          "",
          "// Log response for debugging",
          "console.log('Response:', pm.response.json());"
        ],
        "type": "text/javascript"
      }
    }
  ],
  "item": [
    {
      "name": "Authentication",
      "item": [
        {
          "name": "Login",
          "event": [
            {
              "listen": "test",
              "script": {
                "exec": [
                  "pm.test('Login successful', function () {",
                  "    pm.response.to.have.status(200);",
                  "    const jsonData = pm.response.json();",
                  "    pm.expect(jsonData.success).to.be.true;",
                  "    pm.expect(jsonData.data).to.have.property('token');",
                  "    pm.expect(jsonData.data).to.have.property('user');",
                  "});",
                  "",
                  "// Store auth token and user data",
                  "if (pm.response.code === 200) {",
                  "    const response = pm.response.json();",
                  "    pm.environment.set('auth_token', response.data.token);",
                  "    pm.environment.set('refresh_token', response.data.refreshToken);",
                  "    pm.environment.set('user_id', response.data.user.id);",
                  "    pm.environment.set('organization_id', response.data.user.organizationId);",
                  "    pm.environment.set('user_role', response.data.user.role);",
                  "}"
                ]
              }
            }
          ],
          "request": {
            "method": "POST",
            "header": [
              {
                "key": "Content-Type",
                "value": "application/json"
              }
            ],
            "body": {
              "mode": "raw",
              "raw": "{\n  \"email\": \"john.doe@bank.com\",\n  \"password\": \"securePassword123\"\n}"
            },
            "url": {
              "raw": "{{base_url}}/auth/login",
              "host": ["{{base_url}}"],
              "path": ["auth", "login"]
            },
            "description": "Authenticate user and receive JWT token"
          }
        },
        {
          "name": "Refresh Token",
          "event": [
            {
              "listen": "test",
              "script": {
                "exec": [
                  "pm.test('Token refresh successful', function () {",
                  "    pm.response.to.have.status(200);",
                  "    const jsonData = pm.response.json();",
                  "    pm.expect(jsonData.success).to.be.true;",
                  "    pm.expect(jsonData.data).to.have.property('token');",
                  "});",
                  "",
                  "// Update auth token",
                  "if (pm.response.code === 200) {",
                  "    const response = pm.response.json();",
                  "    pm.environment.set('auth_token', response.data.token);",
                  "}"
                ]
              }
            }
          ],
          "request": {
            "method": "POST",
            "header": [
              {
                "key": "Content-Type",
                "value": "application/json"
              }
            ],
            "body": {
              "mode": "raw",
              "raw": "{\n  \"refreshToken\": \"{{refresh_token}}\"\n}"
            },
            "url": {
              "raw": "{{base_url}}/auth/refresh",
              "host": ["{{base_url}}"],
              "path": ["auth", "refresh"]
            },
            "description": "Refresh JWT token using refresh token"
          }
        },
        {
          "name": "Logout",
          "event": [
            {
              "listen": "test",
              "script": {
                "exec": [
                  "pm.test('Logout successful', function () {",
                  "    pm.response.to.have.status(200);",
                  "    const jsonData = pm.response.json();",
                  "    pm.expect(jsonData.success).to.be.true;",
                  "});",
                  "",
                  "// Clear stored tokens",
                  "pm.environment.unset('auth_token');",
                  "pm.environment.unset('refresh_token');",
                  "pm.environment.unset('user_id');",
                  "pm.environment.unset('organization_id');"
                ]
              }
            }
          ],
          "request": {
            "auth": {
              "type": "bearer",
              "bearer": [
                {
                  "key": "token",
                  "value": "{{auth_token}}",
                  "type": "string"
                }
              ]
            },
            "method": "POST",
            "header": [],
            "url": {
              "raw": "{{base_url}}/auth/logout",
              "host": ["{{base_url}}"],
              "path": ["auth", "logout"]
            },
            "description": "Logout and invalidate current session"
          }
        }
      ],
      "description": "Authentication endpoints for login, logout, and token management"
    },
    {
      "name": "Letters of Credit",
      "item": [
        {
          "name": "Get All LCs",
          "event": [
            {
              "listen": "test",
              "script": {
                "exec": [
                  "pm.test('Get LCs successful', function () {",
                  "    pm.response.to.have.status(200);",
                  "    const jsonData = pm.response.json();",
                  "    pm.expect(jsonData.success).to.be.true;",
                  "    pm.expect(jsonData.data).to.have.property('lcs');",
                  "    pm.expect(jsonData.data).to.have.property('pagination');",
                  "});",
                  "",
                  "// Store first LC ID for other tests",
                  "if (pm.response.code === 200) {",
                  "    const response = pm.response.json();",
                  "    if (response.data.lcs.length > 0) {",
                  "        pm.environment.set('lc_id', response.data.lcs[0].id);",
                  "        pm.environment.set('lc_number', response.data.lcs[0].lcNumber);",
                  "    }",
                  "}"
                ]
              }
            }
          ],
          "request": {
            "auth": {
              "type": "bearer",
              "bearer": [
                {
                  "key": "token",
                  "value": "{{auth_token}}",
                  "type": "string"
                }
              ]
            },
            "method": "GET",
            "header": [],
            "url": {
              "raw": "{{base_url}}/letters-of-credit?page=1&limit=10",
              "host": ["{{base_url}}"],
              "path": ["letters-of-credit"],
              "query": [
                {
                  "key": "page",
                  "value": "1"
                },
                {
                  "key": "limit",
                  "value": "10"
                },
                {
                  "key": "status",
                  "value": "approved",
                  "disabled": true
                },
                {
                  "key": "dateFrom",
                  "value": "2023-01-01",
                  "disabled": true
                },
                {
                  "key": "dateTo",
                  "value": "2023-12-31",
                  "disabled": true
                }
              ]
            },
            "description": "Retrieve paginated list of Letters of Credit"
          }
        },
        {
          "name": "Create LC",
          "event": [
            {
              "listen": "test",
              "script": {
                "exec": [
                  "pm.test('LC creation successful', function () {",
                  "    pm.response.to.have.status(201);",
                  "    const jsonData = pm.response.json();",
                  "    pm.expect(jsonData.success).to.be.true;",
                  "    pm.expect(jsonData.data).to.have.property('id');",
                  "    pm.expect(jsonData.data).to.have.property('lcNumber');",
                  "});",
                  "",
                  "// Store created LC ID",
                  "if (pm.response.code === 201) {",
                  "    const response = pm.response.json();",
                  "    pm.environment.set('new_lc_id', response.data.id);",
                  "    pm.environment.set('new_lc_number', response.data.lcNumber);",
                  "}"
                ]
              }
            }
          ],
          "request": {
            "auth": {
              "type": "bearer",
              "bearer": [
                {
                  "key": "token",
                  "value": "{{auth_token}}",
                  "type": "string"
                }
              ]
            },
            "method": "POST",
            "header": [
              {
                "key": "Content-Type",
                "value": "application/json"
              }
            ],
            "body": {
              "mode": "raw",
              "raw": "{\n  \"applicant\": {\n    \"id\": \"123e4567-e89b-12d3-a456-426614174001\",\n    \"name\": \"ABC Corporation\"\n  },\n  \"beneficiary\": {\n    \"id\": \"123e4567-e89b-12d3-a456-426614174002\",\n    \"name\": \"XYZ Suppliers Ltd\"\n  },\n  \"advisingBank\": {\n    \"id\": \"123e4567-e89b-12d3-a456-426614174004\",\n    \"name\": \"Local Advising Bank\"\n  },\n  \"amount\": 100000.00,\n  \"currency\": \"USD\",\n  \"expiryDate\": \"2024-01-15\",\n  \"terms\": {\n    \"paymentTerms\": \"At sight\",\n    \"goodsDescription\": \"Electronic components as per proforma invoice PI-2023-001\",\n    \"portOfLoading\": \"Shanghai\",\n    \"portOfDischarge\": \"New York\",\n    \"latestShipmentDate\": \"2023-12-15\",\n    \"requiredDocuments\": [\n      \"commercial_invoice\",\n      \"bill_of_lading\",\n      \"packing_list\",\n      \"certificate_of_origin\"\n    ],\n    \"specialConditions\": [\n      \"Insurance coverage 110% of invoice value\",\n      \"Partial shipments not allowed\"\n    ]\n  }\n}"
            },
            "url": {
              "raw": "{{base_url}}/letters-of-credit",
              "host": ["{{base_url}}"],
              "path": ["letters-of-credit"]
            },
            "description": "Create a new Letter of Credit"
          }
        },
        {
          "name": "Get LC by ID",
          "event": [
            {
              "listen": "test",
              "script": {
                "exec": [
                  "pm.test('Get LC by ID successful', function () {",
                  "    pm.response.to.have.status(200);",
                  "    const jsonData = pm.response.json();",
                  "    pm.expect(jsonData.success).to.be.true;",
                  "    pm.expect(jsonData.data).to.have.property('id');",
                  "    pm.expect(jsonData.data).to.have.property('lcNumber');",
                  "    pm.expect(jsonData.data).to.have.property('applicant');",
                  "    pm.expect(jsonData.data).to.have.property('beneficiary');",
                  "});"
                ]
              }
            }
          ],
          "request": {
            "auth": {
              "type": "bearer",
              "bearer": [
                {
                  "key": "token",
                  "value": "{{auth_token}}",
                  "type": "string"
                }
              ]
            },
            "method": "GET",
            "header": [],
            "url": {
              "raw": "{{base_url}}/letters-of-credit/{{lc_id}}",
              "host": ["{{base_url}}"],
              "path": ["letters-of-credit", "{{lc_id}}"]
            },
            "description": "Get detailed information about a specific Letter of Credit"
          }
        },
        {
          "name": "Approve LC",
          "event": [
            {
              "listen": "test",
              "script": {
                "exec": [
                  "pm.test('LC approval successful', function () {",
                  "    pm.response.to.have.status(200);",
                  "    const jsonData = pm.response.json();",
                  "    pm.expect(jsonData.success).to.be.true;",
                  "    pm.expect(jsonData.data).to.have.property('status');",
                  "    pm.expect(jsonData.data.status).to.equal('approved');",
                  "});"
                ]
              }
            }
          ],
          "request": {
            "auth": {
              "type": "bearer",
              "bearer": [
                {
                  "key": "token",
                  "value": "{{auth_token}}",
                  "type": "string"
                }
              ]
            },
            "method": "POST",
            "header": [
              {
                "key": "Content-Type",
                "value": "application/json"
              }
            ],
            "body": {
              "mode": "raw",
              "raw": "{\n  \"comments\": \"Approved after thorough review\",\n  \"initializeEscrow\": true\n}"
            },
            "url": {
              "raw": "{{base_url}}/letters-of-credit/{{lc_id}}/approve",
              "host": ["{{base_url}}"],
              "path": ["letters-of-credit", "{{lc_id}}", "approve"]
            },
            "description": "Approve a Letter of Credit (requires bank admin or officer role)"
          }
        },
        {
          "name": "Submit Documents",
          "event": [
            {
              "listen": "test",
              "script": {
                "exec": [
                  "pm.test('Document submission successful', function () {",
                  "    pm.response.to.have.status(200);",
                  "    const jsonData = pm.response.json();",
                  "    pm.expect(jsonData.success).to.be.true;",
                  "    pm.expect(jsonData.data).to.have.property('documentsSubmitted');",
                  "    pm.expect(jsonData.data.documentsSubmitted).to.be.an('array');",
                  "});",
                  "",
                  "// Store document IDs for verification tests",
                  "if (pm.response.code === 200) {",
                  "    const response = pm.response.json();",
                  "    if (response.data.documentsSubmitted.length > 0) {",
                  "        pm.environment.set('document_id', response.data.documentsSubmitted[0].id);",
                  "    }",
                  "}"
                ]
              }
            }
          ],
          "request": {
            "auth": {
              "type": "bearer",
              "bearer": [
                {
                  "key": "token",
                  "value": "{{auth_token}}",
                  "type": "string"
                }
              ]
            },
            "method": "POST",
            "header": [],
            "body": {
              "mode": "formdata",
              "formdata": [
                {
                  "key": "documents",
                  "type": "file",
                  "src": "sample_invoice.pdf",
                  "disabled": true
                },
                {
                  "key": "metadata",
                  "value": "[\n  {\n    \"type\": \"commercial_invoice\",\n    \"description\": \"Commercial invoice for LC-2023-001\"\n  }\n]",
                  "type": "text"
                }
              ]
            },
            "url": {
              "raw": "{{base_url}}/letters-of-credit/{{lc_id}}/documents",
              "host": ["{{base_url}}"],
              "path": ["letters-of-credit", "{{lc_id}}", "documents"]
            },
            "description": "Submit documents for a Letter of Credit. Note: Enable file upload and provide actual PDF files for testing."
          }
        }
      ],
      "description": "Letter of Credit management endpoints"
    },
    {
      "name": "Documents",
      "item": [
        {
          "name": "Get Documents",
          "event": [
            {
              "listen": "test",
              "script": {
                "exec": [
                  "pm.test('Get documents successful', function () {",
                  "    pm.response.to.have.status(200);",
                  "    const jsonData = pm.response.json();",
                  "    pm.expect(jsonData.success).to.be.true;",
                  "    pm.expect(jsonData.data).to.have.property('documents');",
                  "    pm.expect(jsonData.data).to.have.property('pagination');",
                  "});"
                ]
              }
            }
          ],
          "request": {
            "auth": {
              "type": "bearer",
              "bearer": [
                {
                  "key": "token",
                  "value": "{{auth_token}}",
                  "type": "string"
                }
              ]
            },
            "method": "GET",
            "header": [],
            "url": {
              "raw": "{{base_url}}/documents?lcId={{lc_id}}&page=1&limit=10",
              "host": ["{{base_url}}"],
              "path": ["documents"],
              "query": [
                {
                  "key": "lcId",
                  "value": "{{lc_id}}"
                },
                {
                  "key": "page",
                  "value": "1"
                },
                {
                  "key": "limit",
                  "value": "10"
                },
                {
                  "key": "type",
                  "value": "commercial_invoice",
                  "disabled": true
                },
                {
                  "key": "verificationStatus",
                  "value": "verified",
                  "disabled": true
                }
              ]
            },
            "description": "Get documents for a specific Letter of Credit"
          }
        },
        {
          "name": "Verify Document",
          "event": [
            {
              "listen": "test",
              "script": {
                "exec": [
                  "pm.test('Document verification successful', function () {",
                  "    pm.response.to.have.status(200);",
                  "    const jsonData = pm.response.json();",
                  "    pm.expect(jsonData.success).to.be.true;",
                  "    pm.expect(jsonData.data).to.have.property('verificationStatus');",
                  "    pm.expect(jsonData.data.verificationStatus).to.equal('verified');",
                  "});"
                ]
              }
            }
          ],
          "request": {
            "auth": {
              "type": "bearer",
              "bearer": [
                {
                  "key": "token",
                  "value": "{{auth_token}}",
                  "type": "string"
                }
              ]
            },
            "method": "POST",
            "header": [
              {
                "key": "Content-Type",
                "value": "application/json"
              }
            ],
            "body": {
              "mode": "raw",
              "raw": "{\n  \"status\": \"verified\",\n  \"comments\": \"All details match LC terms\",\n  \"discrepancies\": []\n}"
            },
            "url": {
              "raw": "{{base_url}}/documents/{{document_id}}/verify",
              "host": ["{{base_url}}"],
              "path": ["documents", "{{document_id}}", "verify"]
            },
            "description": "Verify a submitted document (requires bank officer role)"
          }
        },
        {
          "name": "Reject Document",
          "event": [
            {
              "listen": "test",
              "script": {
                "exec": [
                  "pm.test('Document rejection successful', function () {",
                  "    pm.response.to.have.status(200);",
                  "    const jsonData = pm.response.json();",
                  "    pm.expect(jsonData.success).to.be.true;",
                  "    pm.expect(jsonData.data).to.have.property('verificationStatus');",
                  "    pm.expect(jsonData.data.verificationStatus).to.equal('rejected');",
                  "});"
                ]
              }
            }
          ],
          "request": {
            "auth": {
              "type": "bearer",
              "bearer": [
                {
                  "key": "token",
                  "value": "{{auth_token}}",
                  "type": "string"
                }
              ]
            },
            "method": "POST",
            "header": [
              {
                "key": "Content-Type",
                "value": "application/json"
              }
            ],
            "body": {
              "mode": "raw",
              "raw": "{\n  \"status\": \"rejected\",\n  \"comments\": \"Invoice amount does not match LC amount\",\n  \"discrepancies\": [\n    {\n      \"field\": \"amount\",\n      \"expected\": \"100000.00\",\n      \"actual\": \"95000.00\",\n      \"description\": \"Invoice amount is less than LC amount\"\n    }\n  ]\n}"
            },
            "url": {
              "raw": "{{base_url}}/documents/{{document_id}}/verify",
              "host": ["{{base_url}}"],
              "path": ["documents", "{{document_id}}", "verify"]
            },
            "description": "Reject a submitted document with discrepancies"
          }
        }
      ],
      "description": "Document management and verification endpoints"
    },
    {
      "name": "Payments",
      "item": [
        {
          "name": "Get Payments",
          "event": [
            {
              "listen": "test",
              "script": {
                "exec": [
                  "pm.test('Get payments successful', function () {",
                  "    pm.response.to.have.status(200);",
                  "    const jsonData = pm.response.json();",
                  "    pm.expect(jsonData.success).to.be.true;",
                  "    pm.expect(jsonData.data).to.have.property('payments');",
                  "    pm.expect(jsonData.data).to.have.property('pagination');",
                  "});",
                  "",
                  "// Store payment ID for processing test",
                  "if (pm.response.code === 200) {",
                  "    const response = pm.response.json();",
                  "    if (response.data.payments.length > 0) {",
                  "        pm.environment.set('payment_id', response.data.payments[0].id);",
                  "    }",
                  "}"
                ]
              }
            }
          ],
          "request": {
            "auth": {
              "type": "bearer",
              "bearer": [
                {
                  "key": "token",
                  "value": "{{auth_token}}",
                  "type": "string"
                }
              ]
            },
            "method": "GET",
            "header": [],
            "url": {
              "raw": "{{base_url}}/payments?lcId={{lc_id}}&page=1&limit=10",
              "host": ["{{base_url}}"],
              "path": ["payments"],
              "query": [
                {
                  "key": "lcId",
                  "value": "{{lc_id}}"
                },
                {
                  "key": "page",
                  "value": "1"
                },
                {
                  "key": "limit",
                  "value": "10"
                },
                {
                  "key": "status",
                  "value": "pending",
                  "disabled": true
                },
                {
                  "key": "type",
                  "value": "release",
                  "disabled": true
                }
              ]
            },
            "description": "Get payments for a specific Letter of Credit"
          }
        },
        {
          "name": "Process Payment",
          "event": [
            {
              "listen": "test",
              "script": {
                "exec": [
                  "pm.test('Payment processing successful', function () {",
                  "    pm.response.to.have.status(200);",
                  "    const jsonData = pm.response.json();",
                  "    pm.expect(jsonData.success).to.be.true;",
                  "    pm.expect(jsonData.data).to.have.property('status');",
                  "    pm.expect(jsonData.data.status).to.equal('completed');",
                  "});"
                ]
              }
            }
          ],
          "request": {
            "auth": {
              "type": "bearer",
              "bearer": [
                {
                  "key": "token",
                  "value": "{{auth_token}}",
                  "type": "string"
                }
              ]
            },
            "method": "POST",
            "header": [
              {
                "key": "Content-Type",
                "value": "application/json"
              }
            ],
            "body": {
              "mode": "raw",
              "raw": "{\n  \"bankReference\": \"BNK-REF-001\",\n  \"comments\": \"Payment processed successfully\"\n}"
            },
            "url": {
              "raw": "{{base_url}}/payments/{{payment_id}}/process",
              "host": ["{{base_url}}"],
              "path": ["payments", "{{payment_id}}", "process"]
            },
            "description": "Process a payment (requires bank admin or payment processor role)"
          }
        }
      ],
      "description": "Payment processing endpoints"
    },
    {
      "name": "Organizations",
      "item": [
        {
          "name": "Get Organizations",
          "event": [
            {
              "listen": "test",
              "script": {
                "exec": [
                  "pm.test('Get organizations successful', function () {",
                  "    pm.response.to.have.status(200);",
                  "    const jsonData = pm.response.json();",
                  "    pm.expect(jsonData.success).to.be.true;",
                  "    pm.expect(jsonData.data).to.be.an('array');",
                  "});",
                  "",
                  "// Store organization ID",
                  "if (pm.response.code === 200) {",
                  "    const response = pm.response.json();",
                  "    if (response.data.length > 0) {",
                  "        pm.environment.set('org_id', response.data[0].id);",
                  "    }",
                  "}"
                ]
              }
            }
          ],
          "request": {
            "auth": {
              "type": "bearer",
              "bearer": [
                {
                  "key": "token",
                  "value": "{{auth_token}}",
                  "type": "string"
                }
              ]
            },
            "method": "GET",
            "header": [],
            "url": {
              "raw": "{{base_url}}/organizations",
              "host": ["{{base_url}}"],
              "path": ["organizations"]
            },
            "description": "Get list of all organizations"
          }
        },
        {
          "name": "Get Organization by ID",
          "event": [
            {
              "listen": "test",
              "script": {
                "exec": [
                  "pm.test('Get organization by ID successful', function () {",
                  "    pm.response.to.have.status(200);",
                  "    const jsonData = pm.response.json();",
                  "    pm.expect(jsonData.success).to.be.true;",
                  "    pm.expect(jsonData.data).to.have.property('id');",
                  "    pm.expect(jsonData.data).to.have.property('name');",
                  "    pm.expect(jsonData.data).to.have.property('type');",
                  "});"
                ]
              }
            }
          ],
          "request": {
            "auth": {
              "type": "bearer",
              "bearer": [
                {
                  "key": "token",
                  "value": "{{auth_token}}",
                  "type": "string"
                }
              ]
            },
            "method": "GET",
            "header": [],
            "url": {
              "raw": "{{base_url}}/organizations/{{org_id}}",
              "host": ["{{base_url}}"],
              "path": ["organizations", "{{org_id}}"]
            },
            "description": "Get detailed information about a specific organization"
          }
        }
      ],
      "description": "Organization management endpoints"
    },
    {
      "name": "User Management",
      "item": [
        {
          "name": "Get Users",
          "event": [
            {
              "listen": "test",
              "script": {
                "exec": [
                  "pm.test('Get users successful', function () {",
                  "    pm.response.to.have.status(200);",
                  "    const jsonData = pm.response.json();",
                  "    pm.expect(jsonData.success).to.be.true;",
                  "    pm.expect(jsonData.data).to.have.property('users');",
                  "    pm.expect(jsonData.data).to.have.property('pagination');",
                  "});"
                ]
              }
            }
          ],
          "request": {
            "auth": {
              "type": "bearer",
              "bearer": [
                {
                  "key": "token",
                  "value": "{{auth_token}}",
                  "type": "string"
                }
              ]
            },
            "method": "GET",
            "header": [],
            "url": {
              "raw": "{{base_url}}/users?page=1&limit=10",
              "host": ["{{base_url}}"],
              "path": ["users"],
              "query": [
                {
                  "key": "page",
                  "value": "1"
                },
                {
                  "key": "limit",
                  "value": "10"
                },
                {
                  "key": "organizationId",
                  "value": "{{organization_id}}",
                  "disabled": true
                },
                {
                  "key": "role",
                  "value": "bank_officer",
                  "disabled": true
                },
                {
                  "key": "isActive",
                  "value": "true",
                  "disabled": true
                }
              ]
            },
            "description": "Get list of users (admin only)"
          }
        },
        {
          "name": "Create User",
          "event": [
            {
              "listen": "test",
              "script": {
                "exec": [
                  "pm.test('User creation successful', function () {",
                  "    pm.response.to.have.status(201);",
                  "    const jsonData = pm.response.json();",
                  "    pm.expect(jsonData.success).to.be.true;",
                  "    pm.expect(jsonData.data).to.have.property('id');",
                  "    pm.expect(jsonData.data).to.have.property('email');",
                  "});"
                ]
              }
            }
          ],
          "request": {
            "auth": {
              "type": "bearer",
              "bearer": [
                {
                  "key": "token",
                  "value": "{{auth_token}}",
                  "type": "string"
                }
              ]
            },
            "method": "POST",
            "header": [
              {
                "key": "Content-Type",
                "value": "application/json"
              }
            ],
            "body": {
              "mode": "raw",
              "raw": "{\n  \"email\": \"new.user@bank.com\",\n  \"firstName\": \"Jane\",\n  \"lastName\": \"Smith\",\n  \"role\": \"bank_officer\",\n  \"organizationId\": \"{{organization_id}}\",\n  \"permissions\": [\"lc:view\", \"document:verify\"],\n  \"sendWelcomeEmail\": true\n}"
            },
            "url": {
              "raw": "{{base_url}}/users",
              "host": ["{{base_url}}"],
              "path": ["users"]
            },
            "description": "Create a new user (admin only)"
          }
        }
      ],
      "description": "User management endpoints (admin only)"
    },
    {
      "name": "Utility",
      "item": [
        {
          "name": "Health Check",
          "event": [
            {
              "listen": "test",
              "script": {
                "exec": [
                  "pm.test('Health check successful', function () {",
                  "    pm.response.to.have.status(200);",
                  "    const jsonData = pm.response.json();",
                  "    pm.expect(jsonData).to.have.property('status');",
                  "    pm.expect(jsonData.status).to.equal('OK');",
                  "});"
                ]
              }
            }
          ],
          "request": {
            "method": "GET",
            "header": [],
            "url": {
              "raw": "{{base_url}}/health",
              "host": ["{{base_url}}"],
              "path": ["health"]
            },
            "description": "Check API health status"
          }
        },
        {
          "name": "API Info",
          "event": [
            {
              "listen": "test",
              "script": {
                "exec": [
                  "pm.test('API info successful', function () {",
                  "    pm.response.to.have.status(200);",
                  "    const jsonData = pm.response.json();",
                  "    pm.expect(jsonData).to.have.property('version');",
                  "    pm.expect(jsonData).to.have.property('name');",
                  "});"
                ]
              }
            }
          ],
          "request": {
            "method": "GET",
            "header": [],
            "url": {
              "raw": "{{base_url}}/info",
              "host": ["{{base_url}}"],
              "path": ["info"]
            },
            "description": "Get API version and information"
          }
        }
      ],
      "description": "Utility endpoints for health checks and API information"
    }
  ]
}
```

## CURL Commands for Testing

### Authentication

#### Login

```bash
curl -X POST {{base_url}}/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "john.doe@bank.com",
    "password": "securePassword123"
  }'
```

#### Refresh Token

```bash
curl -X POST {{base_url}}/auth/refresh \
  -H "Content-Type: application/json" \
  -d '{
    "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }'
```

#### Logout

```bash
curl -X POST {{base_url}}/auth/logout \
  -H "Authorization: Bearer {{auth_token}}"
```

### Letters of Credit

#### Get All LCs

```bash
curl -X GET "{{base_url}}/letters-of-credit?page=1&limit=10&status=approved" \
  -H "Authorization: Bearer {{auth_token}}"
```

#### Create LC

```bash
curl -X POST {{base_url}}/letters-of-credit \
  -H "Authorization: Bearer {{auth_token}}" \
  -H "Content-Type: application/json" \
  -d '{
    "applicant": {
      "id": "123e4567-e89b-12d3-a456-426614174001",
      "name": "ABC Corporation"
    },
    "beneficiary": {
      "id": "123e4567-e89b-12d3-a456-426614174002",
      "name": "XYZ Suppliers Ltd"
    },
    "amount": 100000.00,
    "currency": "USD",
    "expiryDate": "2024-01-15",
    "terms": {
      "paymentTerms": "At sight",
      "goodsDescription": "Electronic components",
      "portOfLoading": "Shanghai",
      "portOfDischarge": "New York",
      "requiredDocuments": ["commercial_invoice", "bill_of_lading"]
    }
  }'
```

#### Get LC by ID

```bash
curl -X GET {{base_url}}/letters-of-credit/{{lc_id}} \
  -H "Authorization: Bearer {{auth_token}}"
```

#### Approve LC

```bash
curl -X POST {{base_url}}/letters-of-credit/{{lc_id}}/approve \
  -H "Authorization: Bearer {{auth_token}}" \
  -H "Content-Type: application/json" \
  -d '{
    "comments": "Approved after thorough review",
    "initializeEscrow": true
  }'
```

#### Submit Documents

```bash
curl -X POST {{base_url}}/letters-of-credit/{{lc_id}}/documents \
  -H "Authorization: Bearer {{auth_token}}" \
  -F "documents=@sample_invoice.pdf" \
  -F 'metadata=[{
    "type": "commercial_invoice",
    "description": "Commercial invoice for LC-2023-001"
  }]'
```

### Documents

#### Get Documents

```bash
curl -X GET "{{base_url}}/documents?lcId={{lc_id}}&page=1&limit=10" \
  -H "Authorization: Bearer {{auth_token}}"
```

#### Verify Document

```bash
curl -X POST {{base_url}}/documents/{{document_id}}/verify \
  -H "Authorization: Bearer {{auth_token}}" \
  -H "Content-Type: application/json" \
  -d '{
    "status": "verified",
    "comments": "All details match LC terms",
    "discrepancies": []
  }'
```

### Payments

#### Get Payments

```bash
curl -X GET "{{base_url}}/payments?lcId={{lc_id}}&page=1&limit=10" \
  -H "Authorization: Bearer {{auth_token}}"
```

#### Process Payment

```bash
curl -X POST {{base_url}}/payments/{{payment_id}}/process \
  -H "Authorization: Bearer {{auth_token}}" \
  -H "Content-Type: application/json" \
  -d '{
    "bankReference": "BNK-REF-001",
    "comments": "Payment processed successfully"
  }'
```

### Organizations

#### Get Organizations

```bash
curl -X GET {{base_url}}/organizations \
  -H "Authorization: Bearer {{auth_token}}"
```

#### Get Organization by ID

```bash
curl -X GET {{base_url}}/organizations/{{org_id}} \
  -H "Authorization: Bearer {{auth_token}}"
```

### User Management

#### Get Users

```bash
curl -X GET "{{base_url}}/users?page=1&limit=10" \
  -H "Authorization: Bearer {{auth_token}}"
```

#### Create User

```bash
curl -X POST {{base_url}}/users \
  -H "Authorization: Bearer {{auth_token}}" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "new.user@bank.com",
    "firstName": "Jane",
    "lastName": "Smith",
    "role": "bank_officer",
    "organizationId": "{{organization_id}}",
    "permissions": ["lc:view", "document:verify"],
    "sendWelcomeEmail": true
  }'
```

## Testing Workflow

### 1. Authentication Flow

```bash
# Step 1: Login
export AUTH_TOKEN=$(curl -s -X POST {{base_url}}/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "john.doe@bank.com", "password": "securePassword123"}' \
  | jq -r '.data.token')

# Step 2: Use token for authenticated requests
curl -X GET {{base_url}}/letters-of-credit \
  -H "Authorization: Bearer $AUTH_TOKEN"
```

### 2. Complete LC Lifecycle

```bash
# Step 1: Create LC
LC_ID=$(curl -s -X POST {{base_url}}/letters-of-credit \
  -H "Authorization: Bearer $AUTH_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{...LC_DATA...}' \
  | jq -r '.data.id')

# Step 2: Approve LC
curl -X POST {{base_url}}/letters-of-credit/$LC_ID/approve \
  -H "Authorization: Bearer $AUTH_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"comments": "Approved", "initializeEscrow": true}'

# Step 3: Submit Documents
curl -X POST {{base_url}}/letters-of-credit/$LC_ID/documents \
  -H "Authorization: Bearer $AUTH_TOKEN" \
  -F "documents=@invoice.pdf" \
  -F 'metadata=[{"type": "commercial_invoice"}]'

# Step 4: Verify Documents
DOC_ID=$(curl -s -X GET {{base_url}}/documents?lcId=$LC_ID \
  -H "Authorization: Bearer $AUTH_TOKEN" \
  | jq -r '.data.documents[0].id')

curl -X POST {{base_url}}/documents/$DOC_ID/verify \
  -H "Authorization: Bearer $AUTH_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"status": "verified", "comments": "Document verified"}'
```

## Environment Setup

### Development Environment

```json
{
  "name": "BlockTrade Development",
  "values": [
    {
      "key": "base_url",
      "value": "http://localhost:3000/api",
      "enabled": true
    },
    {
      "key": "auth_token",
      "value": "",
      "enabled": true
    },
    {
      "key": "user_id",
      "value": "",
      "enabled": true
    },
    {
      "key": "organization_id",
      "value": "",
      "enabled": true
    }
  ]
}
```

### Production Environment

```json
{
  "name": "BlockTrade Production",
  "values": [
    {
      "key": "base_url",
      "value": "https://api.blocktrade.com/api",
      "enabled": true
    },
    {
      "key": "auth_token",
      "value": "",
      "enabled": true
    },
    {
      "key": "user_id",
      "value": "",
      "enabled": true
    },
    {
      "key": "organization_id",
      "value": "",
      "enabled": true
    }
  ]
}
```

## Notes

1. **Authentication**: All endpoints except `/auth/login`, `/health`, and `/info` require authentication via Bearer token.

2. **File Uploads**: For document uploads, use `multipart/form-data` encoding with actual PDF files.

3. **Environment Variables**: Update the Postman environment variables after login to automatically populate tokens and IDs.

4. **Error Handling**: All requests include comprehensive error checking in the test scripts.

5. **Rate Limiting**: The API may implement rate limiting. Refer to response headers for rate limit information.

6. **Testing Data**: Ensure you have proper test data (organizations, users) set up in your database before running the collection.

7. **Sequential Testing**: Some requests depend on previous requests (e.g., creating an LC before approving it). Run tests in sequence or use Postman's Collection Runner.

8. **SSL/TLS**: Production environment requires HTTPS. Ensure SSL certificate validation is enabled in Postman settings.
