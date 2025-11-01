# Technical Architecture Document

# BlockTrade: Blockchain Trade Finance Platform

## Table of Contents

1. [System Architecture Overview](#system-architecture-overview)
2. [Blockchain Layer](#blockchain-layer)
3. [Application Layer](#application-layer)
4. [Data Layer](#data-layer)
5. [Integration Layer](#integration-layer)
6. [Security Architecture](#security-architecture)
7. [Deployment Architecture](#deployment-architecture)

## System Architecture Overview

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Presentation Layer                        │
├─────────────────────────────────────────────────────────────┤
│  Web Portal  │  Mobile App  │  API Portal  │  Admin Panel  │
├─────────────────────────────────────────────────────────────┤
│                     API Gateway                             │
├─────────────────────────────────────────────────────────────┤
│                  Application Services                        │
├─────────────────┬─────────────┬─────────────┬─────────────────┤
│  Trade Finance  │  KYC/AML    │  Supply     │  Notification  │
│  Service        │  Service    │  Chain      │  Service       │
├─────────────────┼─────────────┼─────────────┼─────────────────┤
│  Payment        │  Document   │  Risk       │  Reporting     │
│  Service        │  Service    │  Assessment │  Service       │
├─────────────────────────────────────────────────────────────┤
│                  Blockchain Layer                           │
├─────────────────────────────────────────────────────────────┤
│  Hyperledger Fabric Network  │  Smart Contracts (Chaincode) │
├─────────────────────────────────────────────────────────────┤
│                     Data Layer                              │
├─────────────────┬─────────────┬─────────────┬─────────────────┤
│  PostgreSQL     │  Redis      │  MongoDB    │  File Storage  │
│  (Relational)   │  (Cache)    │  (Document) │  (IPFS/AWS S3) │
├─────────────────────────────────────────────────────────────┤
│                  Integration Layer                          │
├─────────────────┬─────────────┬─────────────┬─────────────────┤
│  Banking APIs   │  ERP        │  Logistics  │  Regulatory    │
│  (SWIFT/Core)   │  Systems    │  APIs       │  APIs          │
└─────────────────────────────────────────────────────────────┘
```

### Technology Stack

#### Frontend Technologies

- **Web Application**: React.js with TypeScript
- **Mobile Application**: React Native
- **State Management**: Redux Toolkit
- **UI Framework**: Material-UI / Ant Design
- **Charts/Visualization**: D3.js, Chart.js

#### Backend Technologies

- **Runtime**: Node.js with Express.js
- **Language**: TypeScript
- **API Framework**: GraphQL + REST APIs
- **Authentication**: JWT + OAuth 2.0
- **Validation**: Joi / Yup

#### Blockchain Technologies

- **Platform**: Hyperledger Fabric 2.4+
- **Smart Contracts**: JavaScript/Go Chaincode
- **SDK**: Fabric Node.js SDK
- **Identity**: Hyperledger Fabric CA
- **Consensus**: RAFT

#### Database Technologies

- **Primary Database**: PostgreSQL 14+
- **Caching**: Redis 6+
- **Document Storage**: MongoDB
- **File Storage**: IPFS + AWS S3
- **Search Engine**: Elasticsearch

#### DevOps & Infrastructure

- **Containerization**: Docker + Kubernetes
- **CI/CD**: Jenkins / GitHub Actions
- **Monitoring**: Prometheus + Grafana
- **Logging**: ELK Stack (Elasticsearch, Logstash, Kibana)
- **Cloud Platform**: AWS / Azure / GCP

## Blockchain Layer

### Hyperledger Fabric Network Design

#### Network Topology

```
┌─────────────────────────────────────────────────────────────┐
│                    Ordering Service                         │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐          │
│  │  Orderer 1  │  │  Orderer 2  │  │  Orderer 3  │          │
│  │   (RAFT)    │  │   (RAFT)    │  │   (RAFT)    │          │
│  └─────────────┘  └─────────────┘  └─────────────┘          │
└─────────────────────────────────────────────────────────────┘
                              │
┌─────────────────────────────────────────────────────────────┐
│                      Channel: trade-finance                 │
├─────────────────┬─────────────┬─────────────┬─────────────────┤
│  Bank Org       │  NBFC Org   │  Corporate  │  Logistics Org │
│                 │             │  Org        │                │
│  ┌───────────┐  │ ┌─────────┐ │ ┌─────────┐ │ ┌─────────────┐ │
│  │  Peer 1   │  │ │ Peer 1  │ │ │ Peer 1  │ │ │   Peer 1    │ │
│  │  Peer 2   │  │ │ Peer 2  │ │ │ Peer 2  │ │ │   Peer 2    │ │
│  └───────────┘  │ └─────────┘ │ └─────────┘ │ └─────────────┘ │
│                 │             │             │                │
│  ┌───────────┐  │ ┌─────────┐ │ ┌─────────┐ │ ┌─────────────┐ │
│  │    CA     │  │ │   CA    │ │ │   CA    │ │ │     CA      │ │
│  └───────────┘  │ └─────────┘ │ └─────────┘ │ └─────────────┘ │
└─────────────────┴─────────────┴─────────────┴─────────────────┘
```

#### Organizations Structure

1. **Bank Organization**

   - Primary issuer of Letters of Credit
   - Trade finance service provider
   - KYC/AML compliance entity

2. **NBFC Organization**

   - Alternative finance provider
   - Invoice financing specialist
   - Risk assessment entity

3. **Corporate Organization**

   - Importers and exporters
   - Supply chain participants
   - Document submitters

4. **Logistics Organization**
   - Shipping companies
   - Freight forwarders
   - Customs brokers

### Smart Contract Architecture

#### Contract Structure

```
contracts/
├── trade-finance/
│   ├── letter-of-credit.js
│   ├── invoice-financing.js
│   ├── supply-chain.js
│   └── shared/
│       ├── access-control.js
│       ├── validators.js
│       └── utils.js
├── compliance/
│   ├── kyc-aml.js
│   ├── sanctions-screening.js
│   └── regulatory-reporting.js
├── payments/
│   ├── escrow.js
│   ├── multi-currency.js
│   └── settlement.js
└── common/
    ├── identity-management.js
    ├── document-management.js
    └── audit-trail.js
```

#### Key Smart Contracts

##### 1. Letter of Credit Contract

```javascript
class LetterOfCreditContract extends Contract {
  async initLedger(ctx) {
    /* Initialize contract */
  }

  async createLC(ctx, lcData) {
    // Validate LC terms
    // Create LC on blockchain
    // Set up payment escrow
    // Notify relevant parties
  }

  async submitDocuments(ctx, lcId, documents) {
    // Validate document compliance
    // Update LC status
    // Trigger payment if compliant
  }

  async processPayment(ctx, lcId) {
    // Release escrowed funds
    // Update LC status to completed
    // Generate settlement records
  }
}
```

##### 2. Supply Chain Contract

```javascript
class SupplyChainContract extends Contract {
  async createShipment(ctx, shipmentData) {
    // Register new shipment
    // Initialize tracking
    // Set up insurance parameters
  }

  async updateLocation(ctx, shipmentId, locationData) {
    // Record location update
    // Check geofencing rules
    // Trigger alerts if needed
  }

  async confirmDelivery(ctx, shipmentId, deliveryProof) {
    // Validate delivery
    // Update shipment status
    // Trigger final payments
  }
}
```

##### 3. KYC/AML Contract

```javascript
class KYCAMLContract extends Contract {
  async registerEntity(ctx, entityData) {
    // Store KYC information
    // Generate compliance score
    // Set access permissions
  }

  async screenTransaction(ctx, transactionData) {
    // Check sanctions lists
    // Analyze transaction patterns
    // Flag suspicious activities
  }

  async updateComplianceStatus(ctx, entityId, status) {
    // Update entity status
    // Adjust access permissions
    // Log status change
  }
}
```

## Application Layer

### Microservices Architecture

#### Service Design Principles

- **Single Responsibility**: Each service handles one business domain
- **Autonomous**: Services can be developed and deployed independently
- **Resilient**: Built-in fault tolerance and graceful degradation
- **Observable**: Comprehensive logging and monitoring

#### Core Services

##### 1. Trade Finance Service

```
Responsibilities:
- LC creation and management
- Document processing
- Payment orchestration
- Status tracking

Endpoints:
POST /api/trade-finance/lc/create
GET /api/trade-finance/lc/{id}
POST /api/trade-finance/lc/{id}/documents
PUT /api/trade-finance/lc/{id}/approve
```

##### 2. KYC/AML Service

```
Responsibilities:
- Customer verification
- Sanctions screening
- Risk assessment
- Compliance reporting

Endpoints:
POST /api/kyc/verify
GET /api/kyc/status/{entityId}
POST /api/aml/screen
GET /api/compliance/report
```

##### 3. Document Management Service

```
Responsibilities:
- Document upload/storage
- Version control
- Digital signatures
- Template management

Endpoints:
POST /api/documents/upload
GET /api/documents/{id}
POST /api/documents/{id}/sign
GET /api/documents/templates
```

##### 4. Payment Service

```
Responsibilities:
- Escrow management
- Multi-currency handling
- Settlement processing
- Fee calculation

Endpoints:
POST /api/payments/escrow/create
POST /api/payments/release
GET /api/payments/status/{id}
POST /api/payments/calculate-fees
```

##### 5. Notification Service

```
Responsibilities:
- Real-time notifications
- Email/SMS alerts
- Push notifications
- Event broadcasting

Endpoints:
POST /api/notifications/send
GET /api/notifications/history
PUT /api/notifications/preferences
WebSocket: /api/notifications/real-time
```

### API Design

#### RESTful API Standards

- **HTTP Methods**: Proper use of GET, POST, PUT, DELETE
- **Status Codes**: Standardized HTTP response codes
- **URL Structure**: Resource-based URL design
- **Pagination**: Cursor-based pagination for large datasets
- **Versioning**: URL path versioning (/api/v1/)

#### GraphQL Schema

```graphql
type LetterOfCredit {
  id: ID!
  applicationDate: Date!
  expiryDate: Date!
  amount: Money!
  applicant: Organization!
  beneficiary: Organization!
  issuingBank: Organization!
  status: LCStatus!
  documents: [Document!]!
  amendments: [Amendment!]!
}

type Query {
  letterOfCredit(id: ID!): LetterOfCredit
  letterOfCredits(filter: LCFilter, pagination: Pagination): LCConnection
  organization(id: ID!): Organization
  document(id: ID!): Document
}

type Mutation {
  createLetterOfCredit(input: CreateLCInput!): LetterOfCredit!
  submitDocuments(lcId: ID!, documents: [DocumentInput!]!): LetterOfCredit!
  processPayment(lcId: ID!): PaymentResult!
}

type Subscription {
  lcStatusUpdated(lcId: ID!): LetterOfCredit!
  documentSubmitted(lcId: ID!): Document!
  paymentProcessed(lcId: ID!): Payment!
}
```

## Data Layer

### Database Design

#### PostgreSQL Schema (Primary Database)

##### Core Tables

```sql
-- Organizations table
CREATE TABLE organizations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    type VARCHAR(50) NOT NULL, -- 'bank', 'nbfc', 'corporate', 'logistics'
    country_code VARCHAR(3) NOT NULL,
    registration_number VARCHAR(100),
    kyc_status VARCHAR(20) DEFAULT 'pending',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Users table
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID REFERENCES organizations(id),
    email VARCHAR(255) UNIQUE NOT NULL,
    role VARCHAR(50) NOT NULL,
    permissions JSONB,
    is_active BOOLEAN DEFAULT true,
    last_login TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Letters of Credit table
CREATE TABLE letters_of_credit (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lc_number VARCHAR(50) UNIQUE NOT NULL,
    applicant_id UUID REFERENCES organizations(id),
    beneficiary_id UUID REFERENCES organizations(id),
    issuing_bank_id UUID REFERENCES organizations(id),
    amount DECIMAL(15,2) NOT NULL,
    currency VARCHAR(3) NOT NULL,
    application_date DATE NOT NULL,
    expiry_date DATE NOT NULL,
    status VARCHAR(20) DEFAULT 'draft',
    terms JSONB,
    blockchain_tx_id VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Documents table
CREATE TABLE documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lc_id UUID REFERENCES letters_of_credit(id),
    document_type VARCHAR(50) NOT NULL,
    document_number VARCHAR(100),
    file_hash VARCHAR(255) NOT NULL,
    file_url TEXT,
    submitted_by UUID REFERENCES users(id),
    status VARCHAR(20) DEFAULT 'pending',
    blockchain_tx_id VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Payments table
CREATE TABLE payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lc_id UUID REFERENCES letters_of_credit(id),
    amount DECIMAL(15,2) NOT NULL,
    currency VARCHAR(3) NOT NULL,
    payment_type VARCHAR(20) NOT NULL, -- 'escrow', 'release', 'fee'
    from_account VARCHAR(100),
    to_account VARCHAR(100),
    status VARCHAR(20) DEFAULT 'pending',
    blockchain_tx_id VARCHAR(255),
    processed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Audit trail table
CREATE TABLE audit_trail (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    entity_type VARCHAR(50) NOT NULL,
    entity_id UUID NOT NULL,
    action VARCHAR(50) NOT NULL,
    old_values JSONB,
    new_values JSONB,
    user_id UUID REFERENCES users(id),
    blockchain_tx_id VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
```

##### Indexes for Performance

```sql
-- Performance indexes
CREATE INDEX idx_lc_status ON letters_of_credit(status);
CREATE INDEX idx_lc_dates ON letters_of_credit(application_date, expiry_date);
CREATE INDEX idx_documents_lc ON documents(lc_id);
CREATE INDEX idx_payments_lc ON payments(lc_id);
CREATE INDEX idx_audit_entity ON audit_trail(entity_type, entity_id);
CREATE INDEX idx_users_org ON users(organization_id);

-- Composite indexes
CREATE INDEX idx_lc_org_status ON letters_of_credit(applicant_id, status);
CREATE INDEX idx_documents_type_status ON documents(document_type, status);
```

#### Redis Cache Strategy

##### Cache Patterns

```javascript
// User session cache
const userSessionKey = `user:session:${userId}`;
const sessionTTL = 3600; // 1 hour

// Organization data cache
const orgKey = `org:${organizationId}`;
const orgTTL = 86400; // 24 hours

// LC status cache
const lcStatusKey = `lc:status:${lcId}`;
const statusTTL = 300; // 5 minutes

// Document cache
const documentKey = `doc:${documentId}`;
const docTTL = 1800; // 30 minutes
```

##### Cache Implementation

```javascript
class CacheService {
  async getUserSession(userId) {
    const cached = await redis.get(`user:session:${userId}`);
    if (cached) return JSON.parse(cached);

    const session = await this.database.getUserSession(userId);
    await redis.setex(`user:session:${userId}`, 3600, JSON.stringify(session));
    return session;
  }

  async invalidateUserSession(userId) {
    await redis.del(`user:session:${userId}`);
  }

  async getLCStatus(lcId) {
    const cached = await redis.get(`lc:status:${lcId}`);
    if (cached) return JSON.parse(cached);

    const status = await this.blockchain.getLCStatus(lcId);
    await redis.setex(`lc:status:${lcId}`, 300, JSON.stringify(status));
    return status;
  }
}
```

#### MongoDB Document Storage

##### Document Schema

```javascript
// KYC Documents
const kycDocumentSchema = {
  _id: ObjectId,
  organizationId: String,
  documentType: String, // 'incorporation', 'tax_certificate', 'bank_statement'
  fileName: String,
  fileHash: String,
  fileUrl: String,
  verificationStatus: String,
  verifiedBy: String,
  verificationDate: Date,
  expiryDate: Date,
  metadata: {
    issuer: String,
    issueDate: Date,
    documentNumber: String,
  },
  createdAt: Date,
  updatedAt: Date,
};

// Trade History
const tradeHistorySchema = {
  _id: ObjectId,
  organizationId: String,
  counterpartyId: String,
  transactionType: String, // 'import', 'export', 'financing'
  amount: Number,
  currency: String,
  tradingPeriod: {
    startDate: Date,
    endDate: Date,
  },
  performance: {
    onTimeDelivery: Boolean,
    documentCompliance: Number, // percentage
    paymentDelays: Number, // days
  },
  riskIndicators: {
    defaultHistory: Boolean,
    disputeHistory: Boolean,
    sanctionsHit: Boolean,
  },
  createdAt: Date,
};
```

## Integration Layer

### Banking System Integration

#### SWIFT Integration

```javascript
class SWITFTIntegration {
  async sendMT700(lcData) {
    // Format LC data to SWIFT MT700 message
    const mt700Message = this.formatMT700(lcData);

    // Send via SWIFT network
    const response = await this.swiftClient.send({
      messageType: "MT700",
      recipient: lcData.advisingBank.swiftCode,
      message: mt700Message,
    });

    return response;
  }

  async receiveMT710(message) {
    // Parse MT710 (LC amendment)
    const amendment = this.parseMT710(message);

    // Update LC on blockchain
    await this.blockchainService.amendLC(amendment);

    return amendment;
  }
}
```

#### Core Banking Integration

```javascript
class CoreBankingIntegration {
  async checkCustomerLimit(customerId, amount, currency) {
    const response = await this.bankingAPI.post("/api/limits/check", {
      customerId,
      amount,
      currency,
      facilityType: "letter_of_credit",
    });

    return {
      approved: response.data.approved,
      availableLimit: response.data.availableLimit,
      conditions: response.data.conditions,
    };
  }

  async blockFunds(accountId, amount, currency, reference) {
    const response = await this.bankingAPI.post("/api/accounts/block-funds", {
      accountId,
      amount,
      currency,
      reference,
      blockType: "lc_margin",
    });

    return response.data;
  }
}
```

### ERP System Integration

#### SAP Integration

```javascript
class SAPIntegration {
  async syncPurchaseOrder(poData) {
    // Map PO data to SAP format
    const sapPO = this.mapToSAPFormat(poData);

    // Send to SAP via RFC
    const response = await this.sapConnector.call("BAPI_PO_CREATE1", sapPO);

    if (response.RETURN.TYPE === "S") {
      // Success - store mapping
      await this.storePOMapping(poData.id, response.PURCHASEORDER);
    }

    return response;
  }

  async getInvoiceStatus(invoiceNumber) {
    const response = await this.sapConnector.call(
      "BAPI_INCOMINGINVOICE_GETDETAIL",
      {
        INVOICEDOCNUMBER: invoiceNumber,
      }
    );

    return this.mapFromSAPFormat(response);
  }
}
```

### Logistics API Integration

#### Shipping Line APIs

```javascript
class ShippingIntegration {
  async trackContainer(containerNumber, shippingLine) {
    const api = this.getShippingLineAPI(shippingLine);

    const trackingData = await api.track(containerNumber);

    // Standardize tracking data format
    return {
      containerNumber,
      status: trackingData.status,
      currentLocation: {
        port: trackingData.location.port,
        country: trackingData.location.country,
        coordinates: trackingData.location.coordinates,
      },
      estimatedArrival: trackingData.eta,
      milestones: trackingData.events.map((event) => ({
        timestamp: event.date,
        location: event.location,
        description: event.description,
        status: this.normalizeStatus(event.status),
      })),
    };
  }
}
```

## Security Architecture

### Identity and Access Management

#### Multi-Factor Authentication

```javascript
class MFAService {
  async setupMFA(userId, method) {
    switch (method) {
      case "totp":
        const secret = speakeasy.generateSecret({
          name: `BlockTrade (${userId})`,
          issuer: "BlockTrade",
        });

        await this.storeMFASecret(userId, secret.base32);
        return secret.otpauth_url;

      case "sms":
        const phoneNumber = await this.getUserPhone(userId);
        const code = this.generateSMSCode();
        await this.sendSMS(phoneNumber, code);
        return { method: "sms", masked_phone: this.maskPhone(phoneNumber) };
    }
  }

  async verifyMFA(userId, code, method) {
    switch (method) {
      case "totp":
        const secret = await this.getMFASecret(userId);
        return speakeasy.totp.verify({
          secret,
          encoding: "base32",
          token: code,
          window: 2,
        });

      case "sms":
        const storedCode = await this.getSMSCode(userId);
        return code === storedCode && !this.isExpired(storedCode);
    }
  }
}
```

#### Role-Based Access Control

```javascript
const rolePermissions = {
  bank_admin: [
    "lc:create",
    "lc:approve",
    "lc:reject",
    "lc:amend",
    "user:manage",
    "reports:view",
    "compliance:manage",
  ],
  bank_officer: [
    "lc:view",
    "lc:process",
    "documents:verify",
    "customer:kyc",
    "reports:view",
  ],
  corporate_admin: [
    "lc:apply",
    "lc:view",
    "documents:submit",
    "invoice:finance",
    "shipment:track",
  ],
  corporate_user: ["lc:view", "documents:view", "shipment:track"],
  nbfc_admin: [
    "invoice:finance",
    "risk:assess",
    "customer:kyc",
    "reports:view",
  ],
};

class RBACService {
  async checkPermission(userId, resource, action) {
    const user = await this.getUser(userId);
    const permissions = rolePermissions[user.role] || [];

    return permissions.includes(`${resource}:${action}`);
  }

  async hasAnyPermission(userId, permissionList) {
    const user = await this.getUser(userId);
    const userPermissions = rolePermissions[user.role] || [];

    return permissionList.some((permission) =>
      userPermissions.includes(permission)
    );
  }
}
```

### Encryption and Key Management

#### Data Encryption

```javascript
class EncryptionService {
  constructor() {
    this.algorithm = "aes-256-gcm";
    this.keyLength = 32;
    this.ivLength = 16;
  }

  async encryptSensitiveData(data, keyId) {
    const key = await this.getEncryptionKey(keyId);
    const iv = crypto.randomBytes(this.ivLength);

    const cipher = crypto.createCipher(this.algorithm, key, iv);

    let encrypted = cipher.update(JSON.stringify(data), "utf8", "hex");
    encrypted += cipher.final("hex");

    const authTag = cipher.getAuthTag();

    return {
      encrypted,
      iv: iv.toString("hex"),
      authTag: authTag.toString("hex"),
      keyId,
    };
  }

  async decryptSensitiveData(encryptedData) {
    const key = await this.getEncryptionKey(encryptedData.keyId);
    const iv = Buffer.from(encryptedData.iv, "hex");
    const authTag = Buffer.from(encryptedData.authTag, "hex");

    const decipher = crypto.createDecipher(this.algorithm, key, iv);
    decipher.setAuthTag(authTag);

    let decrypted = decipher.update(encryptedData.encrypted, "hex", "utf8");
    decrypted += decipher.final("utf8");

    return JSON.parse(decrypted);
  }
}
```

#### Digital Signatures

```javascript
class DigitalSignatureService {
  async signDocument(documentHash, privateKey) {
    const sign = crypto.createSign("RSA-SHA256");
    sign.update(documentHash);

    const signature = sign.sign(privateKey, "base64");

    return {
      signature,
      algorithm: "RSA-SHA256",
      timestamp: new Date().toISOString(),
    };
  }

  async verifySignature(documentHash, signature, publicKey) {
    const verify = crypto.createVerify("RSA-SHA256");
    verify.update(documentHash);

    return verify.verify(publicKey, signature.signature, "base64");
  }

  async createCertificate(organizationData) {
    const { privateKey, publicKey } = crypto.generateKeyPairSync("rsa", {
      modulusLength: 2048,
      publicKeyEncoding: {
        type: "spki",
        format: "pem",
      },
      privateKeyEncoding: {
        type: "pkcs8",
        format: "pem",
      },
    });

    const certificate = {
      organizationId: organizationData.id,
      publicKey,
      issuer: "BlockTrade CA",
      validFrom: new Date(),
      validTo: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 year
      serialNumber: crypto.randomBytes(16).toString("hex"),
    };

    return { certificate, privateKey };
  }
}
```

## Deployment Architecture

### Kubernetes Deployment

#### Cluster Configuration

```yaml
# namespace.yaml
apiVersion: v1
kind: Namespace
metadata:
  name: blocktrade
  labels:
    name: blocktrade

---
# configmap.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: blocktrade-config
  namespace: blocktrade
data:
  DATABASE_HOST: postgresql-service
  REDIS_HOST: redis-service
  BLOCKCHAIN_NETWORK: fabric-network
  LOG_LEVEL: info
  NODE_ENV: production

---
# secret.yaml
apiVersion: v1
kind: Secret
metadata:
  name: blocktrade-secrets
  namespace: blocktrade
type: Opaque
data:
  DATABASE_PASSWORD: <base64-encoded-password>
  JWT_SECRET: <base64-encoded-jwt-secret>
  ENCRYPTION_KEY: <base64-encoded-encryption-key>
```

#### Application Deployment

```yaml
# api-deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: blocktrade-api
  namespace: blocktrade
spec:
  replicas: 3
  selector:
    matchLabels:
      app: blocktrade-api
  template:
    metadata:
      labels:
        app: blocktrade-api
    spec:
      containers:
        - name: api
          image: blocktrade/api:v1.0.0
          ports:
            - containerPort: 3000
          env:
            - name: DATABASE_PASSWORD
              valueFrom:
                secretKeyRef:
                  name: blocktrade-secrets
                  key: DATABASE_PASSWORD
          envFrom:
            - configMapRef:
                name: blocktrade-config
          resources:
            requests:
              memory: "512Mi"
              cpu: "500m"
            limits:
              memory: "1Gi"
              cpu: "1000m"
          livenessProbe:
            httpGet:
              path: /health
              port: 3000
            initialDelaySeconds: 30
            periodSeconds: 10
          readinessProbe:
            httpGet:
              path: /ready
              port: 3000
            initialDelaySeconds: 5
            periodSeconds: 5

---
# api-service.yaml
apiVersion: v1
kind: Service
metadata:
  name: blocktrade-api-service
  namespace: blocktrade
spec:
  selector:
    app: blocktrade-api
  ports:
    - port: 80
      targetPort: 3000
  type: ClusterIP

---
# api-hpa.yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: blocktrade-api-hpa
  namespace: blocktrade
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: blocktrade-api
  minReplicas: 3
  maxReplicas: 10
  metrics:
    - type: Resource
      resource:
        name: cpu
        target:
          type: Utilization
          averageUtilization: 70
    - type: Resource
      resource:
        name: memory
        target:
          type: Utilization
          averageUtilization: 80
```

#### Database Deployment

```yaml
# postgresql-deployment.yaml
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: postgresql
  namespace: blocktrade
spec:
  serviceName: postgresql-service
  replicas: 1
  selector:
    matchLabels:
      app: postgresql
  template:
    metadata:
      labels:
        app: postgresql
    spec:
      containers:
        - name: postgresql
          image: postgres:14
          ports:
            - containerPort: 5432
          env:
            - name: POSTGRES_DB
              value: blocktrade
            - name: POSTGRES_USER
              value: blocktrade
            - name: POSTGRES_PASSWORD
              valueFrom:
                secretKeyRef:
                  name: blocktrade-secrets
                  key: DATABASE_PASSWORD
          volumeMounts:
            - name: postgresql-storage
              mountPath: /var/lib/postgresql/data
          resources:
            requests:
              memory: "1Gi"
              cpu: "500m"
            limits:
              memory: "2Gi"
              cpu: "1000m"
  volumeClaimTemplates:
    - metadata:
        name: postgresql-storage
      spec:
        accessModes: ["ReadWriteOnce"]
        resources:
          requests:
            storage: 100Gi

---
# postgresql-service.yaml
apiVersion: v1
kind: Service
metadata:
  name: postgresql-service
  namespace: blocktrade
spec:
  selector:
    app: postgresql
  ports:
    - port: 5432
      targetPort: 5432
  type: ClusterIP
```

### Hyperledger Fabric Deployment

#### Fabric Network Configuration

```yaml
# fabric-orderer.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: orderer
  namespace: blocktrade
spec:
  replicas: 1
  selector:
    matchLabels:
      app: orderer
  template:
    metadata:
      labels:
        app: orderer
    spec:
      containers:
        - name: orderer
          image: hyperledger/fabric-orderer:2.4
          env:
            - name: ORDERER_GENERAL_LOGLEVEL
              value: INFO
            - name: ORDERER_GENERAL_LISTENADDRESS
              value: 0.0.0.0
            - name: ORDERER_GENERAL_GENESISMETHOD
              value: file
            - name: ORDERER_GENERAL_GENESISFILE
              value: /var/hyperledger/orderer/orderer.genesis.block
            - name: ORDERER_GENERAL_LOCALMSPID
              value: OrdererMSP
            - name: ORDERER_GENERAL_LOCALMSPDIR
              value: /var/hyperledger/orderer/msp
          ports:
            - containerPort: 7050
          volumeMounts:
            - name: fabric-config
              mountPath: /var/hyperledger/orderer
          resources:
            requests:
              memory: "512Mi"
              cpu: "500m"
            limits:
              memory: "1Gi"
              cpu: "1000m"
      volumes:
        - name: fabric-config
          configMap:
            name: fabric-config

---
# fabric-peer.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: peer0-bank
  namespace: blocktrade
spec:
  replicas: 1
  selector:
    matchLabels:
      app: peer0-bank
  template:
    metadata:
      labels:
        app: peer0-bank
    spec:
      containers:
        - name: peer
          image: hyperledger/fabric-peer:2.4
          env:
            - name: CORE_PEER_ID
              value: peer0.bank.blocktrade.com
            - name: CORE_PEER_ADDRESS
              value: peer0-bank-service:7051
            - name: CORE_PEER_LOCALMSPID
              value: BankMSP
            - name: CORE_PEER_MSPCONFIGPATH
              value: /opt/gopath/src/github.com/hyperledger/fabric/peer/msp
            - name: CORE_VM_ENDPOINT
              value: unix:///host/var/run/docker.sock
            - name: CORE_VM_DOCKER_HOSTCONFIG_NETWORKMODE
              value: blocktrade_default
          ports:
            - containerPort: 7051
            - containerPort: 7053
          volumeMounts:
            - name: fabric-peer-config
              mountPath: /opt/gopath/src/github.com/hyperledger/fabric/peer
            - name: docker-socket
              mountPath: /host/var/run/docker.sock
          resources:
            requests:
              memory: "1Gi"
              cpu: "500m"
            limits:
              memory: "2Gi"
              cpu: "1000m"
      volumes:
        - name: fabric-peer-config
          configMap:
            name: fabric-peer-config
        - name: docker-socket
          hostPath:
            path: /var/run/docker.sock
```

### Monitoring and Logging

#### Prometheus Configuration

```yaml
# prometheus-config.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: prometheus-config
  namespace: blocktrade
data:
  prometheus.yml: |
    global:
      scrape_interval: 15s
      evaluation_interval: 15s

    rule_files:
      - "alert_rules.yml"

    alerting:
      alertmanagers:
        - static_configs:
            - targets:
              - alertmanager:9093

    scrape_configs:
      - job_name: 'blocktrade-api'
        static_configs:
          - targets: ['blocktrade-api-service:80']
        metrics_path: '/metrics'
        scrape_interval: 30s
      
      - job_name: 'postgresql'
        static_configs:
          - targets: ['postgresql-service:5432']
        scrape_interval: 30s
      
      - job_name: 'fabric-peer'
        static_configs:
          - targets: ['peer0-bank-service:7051']
        scrape_interval: 30s

  alert_rules.yml: |
    groups:
      - name: blocktrade_alerts
        rules:
          - alert: HighErrorRate
            expr: rate(http_requests_total{status=~"5.."}[5m]) > 0.1
            for: 5m
            labels:
              severity: warning
            annotations:
              summary: "High error rate detected"
          
          - alert: HighMemoryUsage
            expr: (node_memory_MemTotal - node_memory_MemAvailable) / node_memory_MemTotal > 0.8
            for: 5m
            labels:
              severity: critical
            annotations:
              summary: "High memory usage detected"
```

#### ELK Stack Configuration

```yaml
# elasticsearch.yaml
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: elasticsearch
  namespace: blocktrade
spec:
  serviceName: elasticsearch-service
  replicas: 3
  selector:
    matchLabels:
      app: elasticsearch
  template:
    metadata:
      labels:
        app: elasticsearch
    spec:
      containers:
        - name: elasticsearch
          image: docker.elastic.co/elasticsearch/elasticsearch:7.15.0
          env:
            - name: cluster.name
              value: blocktrade-logs
            - name: node.name
              valueFrom:
                fieldRef:
                  fieldPath: metadata.name
            - name: discovery.seed_hosts
              value: "elasticsearch-service"
            - name: cluster.initial_master_nodes
              value: "elasticsearch-0,elasticsearch-1,elasticsearch-2"
            - name: ES_JAVA_OPTS
              value: "-Xms512m -Xmx512m"
          ports:
            - containerPort: 9200
            - containerPort: 9300
          volumeMounts:
            - name: elasticsearch-storage
              mountPath: /usr/share/elasticsearch/data
          resources:
            requests:
              memory: "1Gi"
              cpu: "500m"
            limits:
              memory: "2Gi"
              cpu: "1000m"
  volumeClaimTemplates:
    - metadata:
        name: elasticsearch-storage
      spec:
        accessModes: ["ReadWriteOnce"]
        resources:
          requests:
            storage: 50Gi
```

This comprehensive technical architecture document provides developers with all the necessary information to build and deploy the BlockTrade platform. Each section includes detailed implementation guidance, code examples, and configuration files needed for production deployment.
