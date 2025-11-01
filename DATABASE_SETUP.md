# MongoDB Database Setup Guide

## Docker MongoDB Setup for BlockTrade

This guide covers setting up MongoDB using Docker with the credentials you've already configured.

## 🐳 Docker MongoDB Configuration

### Current Setup (Based on your configuration)

```bash
# Your current Docker MongoDB setup
docker volume create mongodb_data
docker run --name mongodb -d -p 27017:27017 -v mongodb_data:/data/db \
  -e MONGO_INITDB_ROOT_USERNAME=admin \
  -e MONGO_INITDB_ROOT_PASSWORD=password \
  mongodb/mongodb-community-server
```

### MongoDB Connection String

Update your `.env` file with the correct MongoDB URI:

```env
# MongoDB (Docker Configuration with Authentication)
MONGO_URI=mongodb://admin:password@localhost:27017/blocktrade?authSource=admin
```

## 📊 Database Initialization Commands

### 1. Connect to MongoDB Shell

```bash
# Connect to MongoDB using your credentials
docker exec -it mongodb mongosh -u admin -p password --authenticationDatabase admin
```

### 2. Create BlockTrade Database

```javascript
// Switch to blocktrade database (creates it if doesn't exist)
use blocktrade

// Create database user for the application
db.createUser({
  user: "blocktrade_user",
  pwd: "blocktrade_password",
  roles: [
    { role: "readWrite", db: "blocktrade" },
    { role: "dbAdmin", db: "blocktrade" }
  ]
})
```

### 3. Create Collections and Indexes

```javascript
// ======================================
// USERS COLLECTION
// ======================================
db.createCollection("users");

// Create indexes for users collection
db.users.createIndex({ email: 1 }, { unique: true });
db.users.createIndex({ organizationId: 1 });
db.users.createIndex({ role: 1 });
db.users.createIndex({ isActive: 1 });
db.users.createIndex({ createdAt: 1 });

// ======================================
// ORGANIZATIONS COLLECTION
// ======================================
db.createCollection("organizations");

// Create indexes for organizations collection
db.organizations.createIndex({ name: 1 });
db.organizations.createIndex({ type: 1 });
db.organizations.createIndex({ kycStatus: 1 });
db.organizations.createIndex({ countryCode: 1 });
db.organizations.createIndex(
  { registrationNumber: 1 },
  { unique: true, sparse: true }
);
db.organizations.createIndex({ swiftCode: 1 }, { sparse: true });

// ======================================
// LETTERS OF CREDIT COLLECTION
// ======================================
db.createCollection("letters_of_credit");

// Create indexes for letters of credit collection
db.letters_of_credit.createIndex({ lcNumber: 1 }, { unique: true });
db.letters_of_credit.createIndex({ applicantId: 1 });
db.letters_of_credit.createIndex({ beneficiaryId: 1 });
db.letters_of_credit.createIndex({ issuingBankId: 1 });
db.letters_of_credit.createIndex({ advisingBankId: 1 });
db.letters_of_credit.createIndex({ status: 1 });
db.letters_of_credit.createIndex({ applicationDate: 1 });
db.letters_of_credit.createIndex({ expiryDate: 1 });
db.letters_of_credit.createIndex({ amount: 1, currency: 1 });
db.letters_of_credit.createIndex({ createdAt: 1 });

// Compound indexes for common queries
db.letters_of_credit.createIndex({ applicantId: 1, status: 1 });
db.letters_of_credit.createIndex({ issuingBankId: 1, status: 1 });
db.letters_of_credit.createIndex({ status: 1, createdAt: -1 });

// ======================================
// DOCUMENTS COLLECTION
// ======================================
db.createCollection("documents");

// Create indexes for documents collection
db.documents.createIndex({ lcId: 1 });
db.documents.createIndex({ organizationId: 1 });
db.documents.createIndex({ documentType: 1 });
db.documents.createIndex({ verificationStatus: 1 });
db.documents.createIndex({ submittedBy: 1 });
db.documents.createIndex({ verifiedBy: 1 });
db.documents.createIndex({ fileHash: 1 }, { unique: true });
db.documents.createIndex({ createdAt: 1 });

// Compound indexes
db.documents.createIndex({ lcId: 1, documentType: 1 });
db.documents.createIndex({ lcId: 1, verificationStatus: 1 });

// ======================================
// PAYMENTS COLLECTION
// ======================================
db.createCollection("payments");

// Create indexes for payments collection
db.payments.createIndex({ lcId: 1 });
db.payments.createIndex({ paymentType: 1 });
db.payments.createIndex({ status: 1 });
db.payments.createIndex({ processedBy: 1 });
db.payments.createIndex({ escrowId: 1 });
db.payments.createIndex({ createdAt: 1 });
db.payments.createIndex({ processedAt: 1 });

// Compound indexes
db.payments.createIndex({ lcId: 1, paymentType: 1 });
db.payments.createIndex({ status: 1, createdAt: -1 });

// ======================================
// AUDIT TRAIL COLLECTION
// ======================================
db.createCollection("audit_trail");

// Create indexes for audit trail collection
db.audit_trail.createIndex({ entityType: 1, entityId: 1 });
db.audit_trail.createIndex({ userId: 1 });
db.audit_trail.createIndex({ action: 1 });
db.audit_trail.createIndex({ createdAt: 1 });
db.audit_trail.createIndex({ blockchainTxId: 1 }, { sparse: true });

// ======================================
// NOTIFICATIONS COLLECTION
// ======================================
db.createCollection("notifications");

// Create indexes for notifications collection
db.notifications.createIndex({ userId: 1 });
db.notifications.createIndex({ type: 1 });
db.notifications.createIndex({ readAt: 1 });
db.notifications.createIndex({ createdAt: 1 });

// Compound indexes
db.notifications.createIndex({ userId: 1, readAt: 1 });
db.notifications.createIndex({ userId: 1, createdAt: -1 });
```

### 4. Insert Sample Data

```javascript
// ======================================
// SAMPLE ORGANIZATIONS
// ======================================

// Insert sample bank
db.organizations.insertOne({
  _id: ObjectId(),
  name: "Global Trade Bank",
  type: "bank",
  registrationNumber: "GTB-001",
  countryCode: "USA",
  address: {
    street: "123 Financial Street",
    city: "New York",
    state: "NY",
    country: "United States",
    postalCode: "10001",
  },
  contactPerson: {
    name: "John Smith",
    email: "john.smith@globaltrade.com",
    phone: "+1-555-0123",
    designation: "Trade Finance Manager",
  },
  kycStatus: "verified",
  swiftCode: "GTBKUSNY",
  isVerified: true,
  verificationDate: new Date(),
  createdAt: new Date(),
  updatedAt: new Date(),
});

// Insert sample NBFC
db.organizations.insertOne({
  _id: ObjectId(),
  name: "FinTech Solutions NBFC",
  type: "nbfc",
  registrationNumber: "NBFC-002",
  countryCode: "IND",
  address: {
    street: "456 Business Park",
    city: "Mumbai",
    state: "Maharashtra",
    country: "India",
    postalCode: "400001",
  },
  contactPerson: {
    name: "Rajesh Kumar",
    email: "rajesh.kumar@fintech.com",
    phone: "+91-9876543210",
    designation: "Credit Manager",
  },
  kycStatus: "verified",
  licenseNumber: "NBFC-LIC-002",
  isVerified: true,
  verificationDate: new Date(),
  createdAt: new Date(),
  updatedAt: new Date(),
});

// Insert sample corporate
db.organizations.insertOne({
  _id: ObjectId(),
  name: "ABC Trading Corporation",
  type: "corporate",
  registrationNumber: "CRP-003",
  countryCode: "USA",
  address: {
    street: "789 Trade Avenue",
    city: "Los Angeles",
    state: "CA",
    country: "United States",
    postalCode: "90001",
  },
  contactPerson: {
    name: "Sarah Johnson",
    email: "sarah.johnson@abctrading.com",
    phone: "+1-555-0456",
    designation: "Finance Director",
  },
  kycStatus: "verified",
  tradingLicense: "TRD-LIC-003",
  isVerified: true,
  verificationDate: new Date(),
  createdAt: new Date(),
  updatedAt: new Date(),
});

// ======================================
// SAMPLE USERS
// ======================================

// Get organization IDs for reference
var bankId = db.organizations.findOne({ name: "Global Trade Bank" })._id;
var nbfcId = db.organizations.findOne({ name: "FinTech Solutions NBFC" })._id;
var corporateId = db.organizations.findOne({
  name: "ABC Trading Corporation",
})._id;

// Insert bank admin user
db.users.insertOne({
  _id: ObjectId(),
  email: "admin@globaltrade.com",
  password: "$2b$10$rQZ9QmSTqrndhJHGFJcVxO0M8V7J1gQZ1JN8qgZxAOZRY6hGzFRmS", // password: Admin123!
  firstName: "John",
  lastName: "Smith",
  role: "bank_admin",
  organizationId: bankId,
  organizationName: "Global Trade Bank",
  organizationType: "bank",
  permissions: [
    "lc:create",
    "lc:approve",
    "lc:reject",
    "lc:amend",
    "user:manage",
    "reports:view",
    "compliance:manage",
    "document:verify",
    "payment:process",
  ],
  isActive: true,
  isVerified: true,
  phone: "+1-555-0123",
  address: {
    street: "123 Admin Street",
    city: "New York",
    state: "NY",
    country: "United States",
    postalCode: "10001",
  },
  kycStatus: "approved",
  mfaEnabled: false,
  loginAttempts: 0,
  createdAt: new Date(),
  updatedAt: new Date(),
});

// Insert bank officer user
db.users.insertOne({
  _id: ObjectId(),
  email: "officer@globaltrade.com",
  password: "$2b$10$rQZ9QmSTqrndhJHGFJcVxO0M8V7J1gQZ1JN8qgZxAOZRY6hGzFRmS", // password: Officer123!
  firstName: "Jane",
  lastName: "Doe",
  role: "bank_officer",
  organizationId: bankId,
  organizationName: "Global Trade Bank",
  organizationType: "bank",
  permissions: [
    "lc:view",
    "lc:process",
    "document:verify",
    "customer:kyc",
    "reports:view",
  ],
  isActive: true,
  isVerified: true,
  phone: "+1-555-0124",
  kycStatus: "approved",
  mfaEnabled: false,
  loginAttempts: 0,
  createdAt: new Date(),
  updatedAt: new Date(),
});

// Insert corporate admin user
db.users.insertOne({
  _id: ObjectId(),
  email: "admin@abctrading.com",
  password: "$2b$10$rQZ9QmSTqrndhJHGFJcVxO0M8V7J1gQZ1JN8qgZxAOZRY6hGzFRmS", // password: Corporate123!
  firstName: "Sarah",
  lastName: "Johnson",
  role: "corporate_admin",
  organizationId: corporateId,
  organizationName: "ABC Trading Corporation",
  organizationType: "corporate",
  permissions: [
    "lc:apply",
    "lc:view",
    "document:submit",
    "invoice:finance",
    "shipment:track",
  ],
  isActive: true,
  isVerified: true,
  phone: "+1-555-0456",
  kycStatus: "approved",
  mfaEnabled: false,
  loginAttempts: 0,
  createdAt: new Date(),
  updatedAt: new Date(),
});

// Insert NBFC admin user
db.users.insertOne({
  _id: ObjectId(),
  email: "admin@fintech.com",
  password: "$2b$10$rQZ9QmSTqrndhJHGFJcVxO0M8V7J1gQZ1JN8qgZxAOZRY6hGzFRmS", // password: NBFC123!
  firstName: "Rajesh",
  lastName: "Kumar",
  role: "nbfc_admin",
  organizationId: nbfcId,
  organizationName: "FinTech Solutions NBFC",
  organizationType: "nbfc",
  permissions: [
    "invoice:finance",
    "risk:assess",
    "customer:kyc",
    "reports:view",
  ],
  isActive: true,
  isVerified: true,
  phone: "+91-9876543210",
  kycStatus: "approved",
  mfaEnabled: false,
  loginAttempts: 0,
  createdAt: new Date(),
  updatedAt: new Date(),
});

// Verify data insertion
print("Sample data inserted successfully!");
print("Organizations count:", db.organizations.countDocuments());
print("Users count:", db.users.countDocuments());
```

### 5. Verify Database Setup

```javascript
// Check all collections
show collections

// Verify indexes
db.users.getIndexes()
db.organizations.getIndexes()
db.letters_of_credit.getIndexes()
db.documents.getIndexes()
db.payments.getIndexes()
db.audit_trail.getIndexes()
db.notifications.getIndexes()

// Check sample data
db.organizations.find().pretty()
db.users.find({}, {password: 0}).pretty() // Exclude password field

// Database statistics
db.stats()
```

## 🔧 Alternative MongoDB Connection String

If you want to create a dedicated user for the application (recommended for production):

```env
# Using dedicated application user
MONGO_URI=mongodb://blocktrade_user:blocktrade_password@localhost:27017/blocktrade?authSource=blocktrade
```

## 🐳 Docker Commands Reference

### Essential Docker MongoDB Commands

```bash
# Start MongoDB container
docker start mongodb

# Stop MongoDB container
docker stop mongodb

# Restart MongoDB container
docker restart mongodb

# View MongoDB logs
docker logs mongodb

# View running containers
docker ps

# Connect to MongoDB shell
docker exec -it mongodb mongosh -u admin -p password --authenticationDatabase admin

# Backup database
docker exec mongodb mongodump --username admin --password password --authenticationDatabase admin --db blocktrade --out /tmp/backup

# Restore database
docker exec mongodb mongorestore --username admin --password password --authenticationDatabase admin /tmp/backup

# Remove container (WARNING: This will delete all data)
docker rm -f mongodb

# Remove volume (WARNING: This will delete all data permanently)
docker volume rm mongodb_data
```

### Database Backup & Restore

```bash
# Create backup
docker exec -it mongodb mongodump --uri "mongodb://admin:password@localhost:27017/blocktrade?authSource=admin" --out /tmp/backup

# Copy backup from container to host
docker cp mongodb:/tmp/backup ./mongodb_backup

# Restore from backup
docker exec -it mongodb mongorestore --uri "mongodb://admin:password@localhost:27017?authSource=admin" /tmp/backup
```

## 🔐 Environment Variables

Update your `.env` file with these MongoDB settings:

```env
# MongoDB Configuration
MONGO_URI=mongodb://admin:password@localhost:27017/blocktrade?authSource=admin
MONGO_DB_NAME=blocktrade

# Optional: Alternative user (if you created blocktrade_user)
# MONGO_URI=mongodb://blocktrade_user:blocktrade_password@localhost:27017/blocktrade?authSource=blocktrade
```

## ✅ Testing Database Connection

Create a simple test script to verify the connection:

```javascript
// test-db-connection.js
const { MongoClient } = require("mongodb");

async function testConnection() {
  const uri =
    "mongodb://admin:password@localhost:27017/blocktrade?authSource=admin";
  const client = new MongoClient(uri);

  try {
    await client.connect();
    await client.db("blocktrade").admin().ping();
    console.log("✅ Successfully connected to MongoDB");

    // List collections
    const collections = await client
      .db("blocktrade")
      .listCollections()
      .toArray();
    console.log(
      "📊 Collections:",
      collections.map((c) => c.name)
    );
  } catch (error) {
    console.error("❌ MongoDB connection failed:", error);
  } finally {
    await client.close();
  }
}

testConnection();
```

Run the test:

```bash
node test-db-connection.js
```

## 🚀 Next Steps

1. **Update your `.env` file** with the correct MongoDB URI
2. **Run the database initialization commands** in MongoDB shell
3. **Test the connection** using the provided test script
4. **Start your BlockTrade application** to verify everything works

## 📝 Important Notes

- **Security**: Change the default passwords in production
- **Backup**: Regularly backup your database using the provided commands
- **Monitoring**: Consider using MongoDB Compass for GUI management
- **Performance**: Monitor query performance and add indexes as needed
- **Scaling**: For production, consider MongoDB replica sets or Atlas

## 🔍 Troubleshooting

### Common Issues

1. **Connection refused**: Make sure MongoDB container is running (`docker ps`)
2. **Authentication failed**: Verify username/password in connection string
3. **Database not found**: Database is created automatically when first document is inserted
4. **Permission denied**: Ensure user has proper roles assigned

### Debug Commands

```bash
# Check MongoDB container logs
docker logs mongodb

# Check if MongoDB is listening on port 27017
netstat -an | grep 27017

# Test connection without authentication
docker exec -it mongodb mongosh

# Check MongoDB version
docker exec -it mongodb mongosh --eval "db.version()"
```
