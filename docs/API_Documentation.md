# BlockTrade Backend API Documentation

# MySQL Database Integration

## Table of Contents

1. [Database Schema](#database-schema)
2. [API Endpoints](#api-endpoints)
3. [Authentication](#authentication)
4. [Error Handling](#error-handling)
5. [Postman Collections](#postman-collections)

## Database Schema

### MySQL Tables Structure

#### Users Table

```sql
CREATE TABLE users (
    id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    role ENUM('bank_admin', 'bank_officer', 'corporate_admin', 'corporate_user', 'nbfc_admin', 'nbfc_user') NOT NULL,
    organization_id VARCHAR(36) NOT NULL,
    permissions JSON,
    is_active BOOLEAN DEFAULT TRUE,
    email_verified_at TIMESTAMP NULL,
    last_login TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_users_email (email),
    INDEX idx_users_organization (organization_id),
    INDEX idx_users_role (role)
);
```

#### Organizations Table

```sql
CREATE TABLE organizations (
    id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
    name VARCHAR(255) NOT NULL,
    type ENUM('bank', 'nbfc', 'corporate', 'logistics', 'insurance') NOT NULL,
    registration_number VARCHAR(100),
    country_code VARCHAR(3) NOT NULL,
    address JSON,
    contact_person JSON,
    kyc_status ENUM('pending', 'in_review', 'verified', 'rejected') DEFAULT 'pending',
    swift_code VARCHAR(11),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_organizations_type (type),
    INDEX idx_organizations_kyc_status (kyc_status),
    INDEX idx_organizations_country (country_code)
);
```

#### Letters of Credit Table

```sql
CREATE TABLE letters_of_credit (
    id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
    lc_number VARCHAR(50) UNIQUE NOT NULL,
    applicant_id VARCHAR(36) NOT NULL,
    beneficiary_id VARCHAR(36) NOT NULL,
    issuing_bank_id VARCHAR(36) NOT NULL,
    advising_bank_id VARCHAR(36),
    amount DECIMAL(15,2) NOT NULL,
    currency VARCHAR(3) NOT NULL,
    application_date DATE NOT NULL,
    expiry_date DATE NOT NULL,
    status ENUM('draft', 'pending_approval', 'approved', 'documents_submitted', 'documents_compliant', 'documents_submitted_with_discrepancies', 'payment_processed', 'completed', 'cancelled', 'expired') DEFAULT 'draft',
    terms JSON,
    workflow JSON,
    version INT DEFAULT 1,
    blockchain_tx_id VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (applicant_id) REFERENCES organizations(id),
    FOREIGN KEY (beneficiary_id) REFERENCES organizations(id),
    FOREIGN KEY (issuing_bank_id) REFERENCES organizations(id),
    FOREIGN KEY (advising_bank_id) REFERENCES organizations(id),
    INDEX idx_lc_status (status),
    INDEX idx_lc_applicant (applicant_id),
    INDEX idx_lc_beneficiary (beneficiary_id),
    INDEX idx_lc_issuing_bank (issuing_bank_id),
    INDEX idx_lc_dates (application_date, expiry_date),
    INDEX idx_lc_amount (amount, currency)
);
```

#### Documents Table

```sql
CREATE TABLE documents (
    id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
    lc_id VARCHAR(36),
    organization_id VARCHAR(36),
    document_type ENUM('commercial_invoice', 'bill_of_lading', 'packing_list', 'certificate_of_origin', 'insurance_certificate', 'incorporation_certificate', 'tax_certificate', 'bank_statement') NOT NULL,
    file_name VARCHAR(255) NOT NULL,
    file_url TEXT NOT NULL,
    file_hash VARCHAR(255) NOT NULL,
    file_size INT,
    mime_type VARCHAR(100),
    content JSON,
    submitted_by VARCHAR(36) NOT NULL,
    verification_status ENUM('pending', 'verified', 'rejected') DEFAULT 'pending',
    verified_by VARCHAR(36),
    verified_at TIMESTAMP NULL,
    discrepancies JSON,
    blockchain_tx_id VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (lc_id) REFERENCES letters_of_credit(id),
    FOREIGN KEY (organization_id) REFERENCES organizations(id),
    FOREIGN KEY (submitted_by) REFERENCES users(id),
    FOREIGN KEY (verified_by) REFERENCES users(id),
    INDEX idx_documents_lc (lc_id),
    INDEX idx_documents_org (organization_id),
    INDEX idx_documents_type (document_type),
    INDEX idx_documents_status (verification_status)
);
```

#### Payments Table

```sql
CREATE TABLE payments (
    id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
    lc_id VARCHAR(36) NOT NULL,
    payment_type ENUM('escrow', 'release', 'fee', 'refund') NOT NULL,
    amount DECIMAL(15,2) NOT NULL,
    currency VARCHAR(3) NOT NULL,
    from_account VARCHAR(100),
    to_account VARCHAR(100),
    bank_reference VARCHAR(100),
    status ENUM('pending', 'processing', 'completed', 'failed', 'cancelled') DEFAULT 'pending',
    processed_by VARCHAR(36),
    processed_at TIMESTAMP NULL,
    failure_reason TEXT,
    blockchain_tx_id VARCHAR(255),
    escrow_id VARCHAR(36),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (lc_id) REFERENCES letters_of_credit(id),
    FOREIGN KEY (processed_by) REFERENCES users(id),
    INDEX idx_payments_lc (lc_id),
    INDEX idx_payments_status (status),
    INDEX idx_payments_type (payment_type),
    INDEX idx_payments_dates (created_at, processed_at)
);
```

#### Audit Trail Table

```sql
CREATE TABLE audit_trail (
    id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
    entity_type VARCHAR(50) NOT NULL,
    entity_id VARCHAR(36) NOT NULL,
    action VARCHAR(50) NOT NULL,
    old_values JSON,
    new_values JSON,
    user_id VARCHAR(36),
    ip_address VARCHAR(45),
    user_agent TEXT,
    blockchain_tx_id VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id),
    INDEX idx_audit_entity (entity_type, entity_id),
    INDEX idx_audit_user (user_id),
    INDEX idx_audit_action (action),
    INDEX idx_audit_date (created_at)
);
```

#### Notifications Table

```sql
CREATE TABLE notifications (
    id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
    user_id VARCHAR(36) NOT NULL,
    type VARCHAR(50) NOT NULL,
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    data JSON,
    read_at TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id),
    INDEX idx_notifications_user (user_id),
    INDEX idx_notifications_type (type),
    INDEX idx_notifications_read (read_at),
    INDEX idx_notifications_date (created_at)
);
```

## API Endpoints

### Base URL

```
Development: http://localhost:3000/api
Production: https://api.blocktrade.com/api
```

### Authentication Endpoints

#### POST /auth/register

Register a new user account.

```typescript
// Request
{
  "username": "bank_admin_001",
  "email": "admin@globalbank.com",
  "password": "SecurePass123!",
  "confirmPassword": "SecurePass123!",
  "firstName": "John",
  "lastName": "Admin",
  "role": "bank_admin",
  "organizationId": "123e4567-e89b-12d3-a456-426614174000",
  "organizationName": "Global Bank Corp",
  "organizationType": "bank",
  "permissions": ["lc:create", "lc:view", "lc:edit", "user:manage"],
  "phone": "+1234567890",
  "acceptTerms": true,
  "address": {
    "street": "123 Banking Street",
    "city": "New York",
    "state": "NY",
    "country": "USA",
    "postalCode": "10001"
  }
}

// Response
{
  "success": true,
  "message": "User registered successfully",
  "data": {
    "user": {
      "id": "123e4567-e89b-12d3-a456-426614174000",
      "username": "bank_admin_001",
      "email": "admin@globalbank.com",
      "firstName": "John",
      "lastName": "Admin",
      "role": "bank_admin",
      "organizationId": "123e4567-e89b-12d3-a456-426614174000",
      "organizationName": "Global Bank Corp",
      "organizationType": "bank",
      "permissions": ["lc:create", "lc:view", "lc:edit", "user:manage"],
      "isActive": true,
      "emailVerified": false,
      "createdAt": "2024-11-01T10:30:00.000Z"
    },
    "tokens": {
      "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
      "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
      "expiresIn": 3600
    }
  }
}
```

#### POST /auth/login

Authenticate user and get access tokens.

```typescript
// Request
{
  "username": "bank_admin_001",
  "password": "SecurePass123!",
  "mfaCode": "123456", // Optional, required if MFA is enabled
  "rememberMe": true   // Optional, extends token expiry
}

// Response
{
  "success": true,
  "message": "Login successful",
  "data": {
    "user": {
      "id": "123e4567-e89b-12d3-a456-426614174000",
      "username": "bank_admin_001",
      "email": "admin@globalbank.com",
      "firstName": "John",
      "lastName": "Admin",
      "role": "bank_admin",
      "organizationId": "123e4567-e89b-12d3-a456-426614174000",
      "organizationName": "Global Bank Corp",
      "organizationType": "bank",
      "permissions": ["lc:create", "lc:view", "lc:edit", "user:manage"],
      "lastLogin": "2024-11-01T09:15:00.000Z",
      "isActive": true,
      "emailVerified": true
    },
    "tokens": {
      "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
      "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
      "expiresIn": 3600
    }
  }
}
```

#### GET /auth/me

Get current authenticated user profile.

```typescript
// Request Headers
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

// Response
{
  "success": true,
  "message": "User profile retrieved successfully",
  "data": {
    "user": {
      "id": "123e4567-e89b-12d3-a456-426614174000",
      "username": "bank_admin_001",
      "email": "admin@globalbank.com",
      "firstName": "John",
      "lastName": "Admin",
      "role": "bank_admin",
      "organizationId": "123e4567-e89b-12d3-a456-426614174000",
      "organizationName": "Global Bank Corp",
      "organizationType": "bank",
      "permissions": ["lc:create", "lc:view", "lc:edit", "user:manage"],
      "phone": "+1234567890",
      "address": {
        "street": "123 Banking Street",
        "city": "New York",
        "state": "NY",
        "country": "USA",
        "postalCode": "10001"
      },
      "bio": "Senior Banking Administrator",
      "timezone": "America/New_York",
      "language": "en",
      "notifications": {
        "email": true,
        "sms": false,
        "push": true,
        "marketing": false
      },
      "isActive": true,
      "emailVerified": true,
      "emailVerifiedAt": "2024-11-01T10:35:00.000Z",
      "lastLogin": "2024-11-01T09:15:00.000Z",
      "mfaEnabled": false,
      "createdAt": "2024-11-01T10:30:00.000Z",
      "updatedAt": "2024-11-01T11:45:00.000Z"
    }
  }
}
```

#### PUT /auth/profile

Update user profile information.

```typescript
// Request Headers
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

// Request
{
  "firstName": "John Updated",
  "lastName": "Admin Updated",
  "phone": "+1234567899",
  "bio": "Senior Banking Administrator with 10+ years experience",
  "timezone": "America/New_York",
  "language": "en",
  "notifications": {
    "email": true,
    "sms": false,
    "push": true,
    "marketing": false
  },
  "address": {
    "street": "456 Updated Banking Street",
    "city": "New York",
    "state": "NY",
    "country": "USA",
    "postalCode": "10002"
  }
}

// Response
{
  "success": true,
  "message": "Profile updated successfully",
  "data": {
    "user": {
      "id": "123e4567-e89b-12d3-a456-426614174000",
      "username": "bank_admin_001",
      "email": "admin@globalbank.com",
      "firstName": "John Updated",
      "lastName": "Admin Updated",
      "bio": "Senior Banking Administrator with 10+ years experience",
      "phone": "+1234567899",
      "updatedAt": "2024-11-01T12:30:00.000Z"
    }
  }
}
```

#### POST /auth/change-password

Change password for authenticated user.

```typescript
// Request Headers
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

// Request
{
  "currentPassword": "SecurePass123!",
  "newPassword": "NewSecurePass123!",
  "confirmPassword": "NewSecurePass123!"
}

// Response
{
  "success": true,
  "message": "Password changed successfully"
}
```

#### POST /auth/forgot-password

Request password reset email.

```typescript
// Request
{
  "email": "admin@globalbank.com"
}

// Response
{
  "success": true,
  "message": "If an account with that email exists, we've sent a password reset link."
}
```

#### POST /auth/reset-password

Reset password using reset token.

```typescript
// Request
{
  "token": "reset-token-from-email",
  "newPassword": "NewSecurePass123!",
  "confirmPassword": "NewSecurePass123!"
}

// Response
{
  "success": true,
  "message": "Password reset successful. You can now login with your new password."
}
```

#### POST /auth/refresh

Refresh access token using refresh token.

```typescript
// Request
{
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}

// Response
{
  "success": true,
  "message": "Token refreshed successfully",
  "data": {
    "tokens": {
      "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
      "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
      "expiresIn": 3600
    }
  }
}
```

#### POST /auth/logout

Logout current user.

```typescript
// Request Headers
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

// Response
{
  "success": true,
  "message": "Logout successful",
  "data": null
}
```

### Letter of Credit Endpoints

#### GET /letters-of-credit

```typescript
// Query Parameters
{
  "page": 1,
  "limit": 10,
  "status": "approved",
  "applicantId": "123e4567-e89b-12d3-a456-426614174000",
  "dateFrom": "2023-01-01",
  "dateTo": "2023-12-31",
  "amountFrom": 10000,
  "amountTo": 100000,
  "currency": "USD"
}

// Response
{
  "success": true,
  "data": {
    "lcs": [
      {
        "id": "lc-123e4567-e89b-12d3-a456-426614174000",
        "lcNumber": "LC-2023-001",
        "applicant": {
          "id": "123e4567-e89b-12d3-a456-426614174001",
          "name": "ABC Corporation",
          "type": "corporate"
        },
        "beneficiary": {
          "id": "123e4567-e89b-12d3-a456-426614174002",
          "name": "XYZ Suppliers Ltd",
          "type": "corporate"
        },
        "issuingBank": {
          "id": "123e4567-e89b-12d3-a456-426614174003",
          "name": "Global Bank",
          "type": "bank"
        },
        "amount": 100000.00,
        "currency": "USD",
        "applicationDate": "2023-10-15",
        "expiryDate": "2024-01-15",
        "status": "approved",
        "createdAt": "2023-10-15T10:30:00Z",
        "updatedAt": "2023-10-15T14:30:00Z"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 10,
      "total": 25,
      "totalPages": 3
    }
  }
}
```

#### POST /letters-of-credit

```typescript
// Request
{
  "applicant": {
    "id": "123e4567-e89b-12d3-a456-426614174001",
    "name": "ABC Corporation"
  },
  "beneficiary": {
    "id": "123e4567-e89b-12d3-a456-426614174002",
    "name": "XYZ Suppliers Ltd"
  },
  "advisingBank": {
    "id": "123e4567-e89b-12d3-a456-426614174004",
    "name": "Local Advising Bank"
  },
  "amount": 100000.00,
  "currency": "USD",
  "expiryDate": "2024-01-15",
  "terms": {
    "paymentTerms": "At sight",
    "goodsDescription": "Electronic components as per proforma invoice PI-2023-001",
    "portOfLoading": "Shanghai",
    "portOfDischarge": "New York",
    "latestShipmentDate": "2023-12-15",
    "requiredDocuments": [
      "commercial_invoice",
      "bill_of_lading",
      "packing_list",
      "certificate_of_origin"
    ],
    "specialConditions": [
      "Insurance coverage 110% of invoice value",
      "Partial shipments not allowed"
    ]
  }
}

// Response
{
  "success": true,
  "data": {
    "id": "lc-123e4567-e89b-12d3-a456-426614174000",
    "lcNumber": "LC-2023-002",
    "status": "draft",
    "message": "Letter of Credit created successfully",
    "createdAt": "2023-10-20T09:15:00Z"
  }
}
```

#### GET /letters-of-credit/:id

```typescript
// Response
{
  "success": true,
  "data": {
    "id": "lc-123e4567-e89b-12d3-a456-426614174000",
    "lcNumber": "LC-2023-001",
    "applicant": {
      "id": "123e4567-e89b-12d3-a456-426614174001",
      "name": "ABC Corporation",
      "type": "corporate",
      "address": {
        "street": "123 Business Street",
        "city": "New York",
        "state": "NY",
        "country": "USA",
        "postalCode": "10001"
      }
    },
    "beneficiary": {
      "id": "123e4567-e89b-12d3-a456-426614174002",
      "name": "XYZ Suppliers Ltd",
      "type": "corporate",
      "address": {
        "street": "456 Export Avenue",
        "city": "Shanghai",
        "state": "Shanghai",
        "country": "China",
        "postalCode": "200000"
      }
    },
    "issuingBank": {
      "id": "123e4567-e89b-12d3-a456-426614174003",
      "name": "Global Bank",
      "type": "bank",
      "swiftCode": "GLBBUSNY"
    },
    "amount": 100000.00,
    "currency": "USD",
    "applicationDate": "2023-10-15",
    "expiryDate": "2024-01-15",
    "status": "approved",
    "terms": {
      "paymentTerms": "At sight",
      "goodsDescription": "Electronic components",
      "portOfLoading": "Shanghai",
      "portOfDischarge": "New York",
      "latestShipmentDate": "2023-12-15",
      "requiredDocuments": [
        "commercial_invoice",
        "bill_of_lading",
        "packing_list"
      ]
    },
    "documents": [
      {
        "id": "doc-123e4567-e89b-12d3-a456-426614174001",
        "type": "commercial_invoice",
        "fileName": "commercial_invoice_001.pdf",
        "submittedAt": "2023-10-20T14:30:00Z",
        "verificationStatus": "verified"
      }
    ],
    "workflow": {
      "created": {
        "timestamp": "2023-10-15T10:30:00Z",
        "user": "john.doe@bank.com"
      },
      "approved": {
        "timestamp": "2023-10-15T14:30:00Z",
        "user": "manager@bank.com",
        "comments": "Approved after due diligence"
      }
    },
    "version": 1,
    "createdAt": "2023-10-15T10:30:00Z",
    "updatedAt": "2023-10-15T14:30:00Z"
  }
}
```

#### POST /letters-of-credit/:id/approve

```typescript
// Request
{
  "comments": "Approved after thorough review",
  "initializeEscrow": true
}

// Response
{
  "success": true,
  "data": {
    "id": "lc-123e4567-e89b-12d3-a456-426614174000",
    "status": "approved",
    "approvedAt": "2023-10-20T15:45:00Z",
    "approvedBy": "manager@bank.com",
    "escrowId": "escrow-123e4567-e89b-12d3-a456-426614174001"
  },
  "message": "Letter of Credit approved successfully"
}
```

#### POST /letters-of-credit/:id/documents

```typescript
// Request (multipart/form-data)
{
  "documents": [File, File], // Binary file data
  "metadata": [
    {
      "type": "commercial_invoice",
      "description": "Commercial invoice for LC-2023-001"
    },
    {
      "type": "bill_of_lading",
      "description": "Bill of lading for shipment"
    }
  ]
}

// Response
{
  "success": true,
  "data": {
    "lcId": "lc-123e4567-e89b-12d3-a456-426614174000",
    "status": "documents_submitted",
    "documentsSubmitted": [
      {
        "id": "doc-123e4567-e89b-12d3-a456-426614174001",
        "type": "commercial_invoice",
        "fileName": "invoice_001.pdf",
        "fileUrl": "https://storage.blocktrade.com/documents/invoice_001.pdf",
        "hash": "sha256:abcd1234...",
        "verificationStatus": "pending"
      },
      {
        "id": "doc-123e4567-e89b-12d3-a456-426614174002",
        "type": "bill_of_lading",
        "fileName": "bl_001.pdf",
        "fileUrl": "https://storage.blocktrade.com/documents/bl_001.pdf",
        "hash": "sha256:efgh5678...",
        "verificationStatus": "pending"
      }
    ]
  },
  "message": "Documents submitted successfully"
}
```

### Document Endpoints

#### GET /documents

```typescript
// Query Parameters
{
  "lcId": "lc-123e4567-e89b-12d3-a456-426614174000",
  "type": "commercial_invoice",
  "verificationStatus": "verified",
  "page": 1,
  "limit": 10
}

// Response
{
  "success": true,
  "data": {
    "documents": [
      {
        "id": "doc-123e4567-e89b-12d3-a456-426614174001",
        "lcId": "lc-123e4567-e89b-12d3-a456-426614174000",
        "type": "commercial_invoice",
        "fileName": "invoice_001.pdf",
        "fileUrl": "https://storage.blocktrade.com/documents/invoice_001.pdf",
        "fileSize": 245760,
        "mimeType": "application/pdf",
        "hash": "sha256:abcd1234...",
        "submittedBy": "exporter@company.com",
        "submittedAt": "2023-10-20T14:30:00Z",
        "verificationStatus": "verified",
        "verifiedBy": "officer@bank.com",
        "verifiedAt": "2023-10-20T16:00:00Z"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 10,
      "total": 5,
      "totalPages": 1
    }
  }
}
```

#### POST /documents/:id/verify

```typescript
// Request
{
  "status": "verified",
  "comments": "All details match LC terms",
  "discrepancies": []
}

// Response
{
  "success": true,
  "data": {
    "id": "doc-123e4567-e89b-12d3-a456-426614174001",
    "verificationStatus": "verified",
    "verifiedAt": "2023-10-20T16:00:00Z",
    "verifiedBy": "officer@bank.com"
  },
  "message": "Document verified successfully"
}
```

### Payment Endpoints

#### GET /payments

```typescript
// Query Parameters
{
  "lcId": "lc-123e4567-e89b-12d3-a456-426614174000",
  "status": "completed",
  "type": "release",
  "page": 1,
  "limit": 10
}

// Response
{
  "success": true,
  "data": {
    "payments": [
      {
        "id": "pay-123e4567-e89b-12d3-a456-426614174001",
        "lcId": "lc-123e4567-e89b-12d3-a456-426614174000",
        "type": "release",
        "amount": 100000.00,
        "currency": "USD",
        "fromAccount": "ACC-123456789",
        "toAccount": "ACC-987654321",
        "bankReference": "BNK-REF-001",
        "status": "completed",
        "processedAt": "2023-10-20T17:30:00Z",
        "processedBy": "payments@bank.com"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 10,
      "total": 3,
      "totalPages": 1
    }
  }
}
```

#### POST /payments/:id/process

```typescript
// Request
{
  "bankReference": "BNK-REF-001",
  "comments": "Payment processed successfully"
}

// Response
{
  "success": true,
  "data": {
    "id": "pay-123e4567-e89b-12d3-a456-426614174001",
    "status": "completed",
    "processedAt": "2023-10-20T17:30:00Z",
    "bankReference": "BNK-REF-001",
    "transactionId": "TXN-123456789"
  },
  "message": "Payment processed successfully"
}
```

### Organization Endpoints

#### GET /organizations

```typescript
// Response
{
  "success": true,
  "data": [
    {
      "id": "123e4567-e89b-12d3-a456-426614174001",
      "name": "ABC Corporation",
      "type": "corporate",
      "registrationNumber": "REG-123456",
      "countryCode": "USA",
      "kycStatus": "verified",
      "address": {
        "street": "123 Business Street",
        "city": "New York",
        "state": "NY",
        "country": "USA",
        "postalCode": "10001"
      }
    }
  ]
}
```

#### GET /organizations/:id

```typescript
// Response
{
  "success": true,
  "data": {
    "id": "123e4567-e89b-12d3-a456-426614174001",
    "name": "ABC Corporation",
    "type": "corporate",
    "registrationNumber": "REG-123456",
    "countryCode": "USA",
    "kycStatus": "verified",
    "address": {
      "street": "123 Business Street",
      "city": "New York",
      "state": "NY",
      "country": "USA",
      "postalCode": "10001"
    },
    "contactPerson": {
      "name": "John Smith",
      "email": "john.smith@abc-corp.com",
      "phone": "+1-555-123-4567",
      "designation": "Finance Manager"
    },
    "verificationDocuments": [
      {
        "id": "doc-123e4567-e89b-12d3-a456-426614174001",
        "type": "incorporation_certificate",
        "fileName": "incorporation.pdf",
        "verificationStatus": "verified"
      }
    ],
    "createdAt": "2023-01-15T10:00:00Z",
    "updatedAt": "2023-10-15T14:30:00Z"
  }
}
```

### User Management Endpoints

#### GET /users

```typescript
// Query Parameters (Admin only)
{
  "organizationId": "123e4567-e89b-12d3-a456-426614174001",
  "role": "bank_officer",
  "isActive": true,
  "page": 1,
  "limit": 10
}

// Response
{
  "success": true,
  "data": {
    "users": [
      {
        "id": "123e4567-e89b-12d3-a456-426614174000",
        "email": "john.doe@bank.com",
        "firstName": "John",
        "lastName": "Doe",
        "role": "bank_admin",
        "organizationId": "123e4567-e89b-12d3-a456-426614174001",
        "organizationName": "ABC Bank",
        "isActive": true,
        "lastLogin": "2023-10-20T08:30:00Z",
        "createdAt": "2023-01-15T10:00:00Z"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 10,
      "total": 15,
      "totalPages": 2
    }
  }
}
```

#### POST /users

```typescript
// Request (Admin only)
{
  "email": "new.user@bank.com",
  "firstName": "Jane",
  "lastName": "Smith",
  "role": "bank_officer",
  "organizationId": "123e4567-e89b-12d3-a456-426614174001",
  "permissions": ["lc:view", "document:verify"],
  "sendWelcomeEmail": true
}

// Response
{
  "success": true,
  "data": {
    "id": "123e4567-e89b-12d3-a456-426614174010",
    "email": "new.user@bank.com",
    "firstName": "Jane",
    "lastName": "Smith",
    "role": "bank_officer",
    "isActive": true,
    "temporaryPassword": "TempPass123!"
  },
  "message": "User created successfully. Welcome email sent."
}
```

## Authentication

### JWT Token Structure

```typescript
// JWT Payload
{
  "sub": "123e4567-e89b-12d3-a456-426614174000", // User ID
  "email": "john.doe@bank.com",
  "role": "bank_admin",
  "organizationId": "123e4567-e89b-12d3-a456-426614174001",
  "permissions": ["lc:create", "lc:approve", "user:manage"],
  "iat": 1634567890,  // Issued at
  "exp": 1634571490   // Expires at (1 hour)
}
```

### Authorization Headers

```typescript
// Required for all protected endpoints
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### Permission-Based Access Control

```typescript
// Endpoint permissions mapping
{
  "POST /letters-of-credit": ["lc:create"],
  "POST /letters-of-credit/:id/approve": ["lc:approve"],
  "GET /letters-of-credit": ["lc:view"],
  "POST /users": ["user:manage"],
  "POST /documents/:id/verify": ["document:verify"],
  "POST /payments/:id/process": ["payment:process"]
}
```

## Error Handling

### Standard Error Response Format

```typescript
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Validation failed",
    "details": [
      {
        "field": "amount",
        "message": "Amount must be greater than zero"
      },
      {
        "field": "currency",
        "message": "Currency is required"
      }
    ]
  },
  "timestamp": "2023-10-20T15:30:00Z",
  "path": "/api/letters-of-credit",
  "requestId": "req-123e4567-e89b-12d3-a456-426614174000"
}
```

### HTTP Status Codes

```typescript
200 - OK: Successful request
201 - Created: Resource created successfully
400 - Bad Request: Invalid request data
401 - Unauthorized: Authentication required
403 - Forbidden: Insufficient permissions
404 - Not Found: Resource not found
409 - Conflict: Resource already exists
422 - Unprocessable Entity: Validation failed
429 - Too Many Requests: Rate limit exceeded
500 - Internal Server Error: Server error
503 - Service Unavailable: Service temporarily unavailable
```

### Error Codes

```typescript
// Authentication Errors
AUTH_001 - Invalid credentials
AUTH_002 - Token expired
AUTH_003 - Token invalid
AUTH_004 - Account locked
AUTH_005 - Email not verified

// Validation Errors
VAL_001 - Required field missing
VAL_002 - Invalid field format
VAL_003 - Field value out of range
VAL_004 - Invalid file type
VAL_005 - File size too large

// Business Logic Errors
BIZ_001 - LC amount exceeds limit
BIZ_002 - Organization not verified
BIZ_003 - Document verification failed
BIZ_004 - Payment processing failed
BIZ_005 - LC already approved

// System Errors
SYS_001 - Database connection error
SYS_002 - External service unavailable
SYS_003 - File upload failed
SYS_004 - Blockchain transaction failed
```
