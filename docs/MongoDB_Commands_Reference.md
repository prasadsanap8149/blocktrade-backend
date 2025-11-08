# MongoDB Commands Reference Guide

## Database Operations

### Connect to MongoDB

```bash
# Connect to local MongoDB
mongosh

# Connect to remote MongoDB with URI
mongosh "mongodb://username:password@host:port/database"
```

### Database Management

```bash
# Show all databases
show dbs

# Create/Switch to database
use databaseName

# Show current database
db

# Drop database
db.dropDatabase()
```

## Collection Operations

### Basic Collection Commands

```bash
# List all collections in current database
show collections

# Create collection
db.createCollection("collectionName")

# Drop collection
db.collectionName.drop()

# Rename collection
db.collectionName.renameCollection("newName")
```

### CRUD Operations

#### Create (Insert)

```bash
# Insert one document
db.collectionName.insertOne({
    name: "John Doe",
    email: "john@example.com"
})

# Insert multiple documents
db.collectionName.insertMany([
    { name: "Jane Doe", email: "jane@example.com" },
    { name: "Bob Smith", email: "bob@example.com" }
])
```

#### Read (Query)

```bash
# Find all documents
db.collectionName.find()

# Find with pretty printing
db.collectionName.find().pretty()

# Find first document
db.collectionName.findOne()

# Find with specific criteria
db.collectionName.find({ field: "value" })

# Count documents
db.collectionName.countDocuments()

# Find with specific fields (projection)
db.collectionName.find({}, { field1: 1, field2: 1, _id: 0 })
```

#### Update

```bash
# Update one document
db.collectionName.updateOne(
    { field: "value" },
    { $set: { newField: "newValue" } }
)

# Update multiple documents
db.collectionName.updateMany(
    { field: "value" },
    { $set: { newField: "newValue" } }
)

# Replace entire document
db.collectionName.replaceOne(
    { field: "value" },
    { newDocument: "content" }
)
```

#### Delete

```bash
# Delete one document
db.collectionName.deleteOne({ field: "value" })

# Delete multiple documents
db.collectionName.deleteMany({ field: "value" })

# Delete all documents
db.collectionName.deleteMany({})
```

## Query Operators

### Comparison Operators

```bash
# Equals
db.collectionName.find({ field: { $eq: value } })

# Not equals
db.collectionName.find({ field: { $ne: value } })

# Greater than
db.collectionName.find({ field: { $gt: value } })

# Greater than or equal
db.collectionName.find({ field: { $gte: value } })

# Less than
db.collectionName.find({ field: { $lt: value } })

# Less than or equal
db.collectionName.find({ field: { $lte: value } })

# In array
db.collectionName.find({ field: { $in: [value1, value2] } })

# Not in array
db.collectionName.find({ field: { $nin: [value1, value2] } })
```

### Logical Operators

```bash
# AND
db.collectionName.find({
    $and: [
        { field1: "value1" },
        { field2: "value2" }
    ]
})

# OR
db.collectionName.find({
    $or: [
        { field1: "value1" },
        { field2: "value2" }
    ]
})

# NOT
db.collectionName.find({
    field: { $not: { $eq: "value" } }
})
```

## Aggregation Operations

```bash
# Basic aggregation pipeline
db.collectionName.aggregate([
    { $match: { field: "value" } },
    { $group: { _id: "$field", total: { $sum: 1 } } }
])

# Sort documents
db.collectionName.find().sort({ field: 1 })  # 1 for ascending, -1 for descending

# Limit results
db.collectionName.find().limit(10)

# Skip results
db.collectionName.find().skip(10)
```

## Indexing

```bash
# Create index
db.collectionName.createIndex({ field: 1 })

# Create unique index
db.collectionName.createIndex({ field: 1 }, { unique: true })

# List all indexes
db.collectionName.getIndexes()

# Drop index
db.collectionName.dropIndex("indexName")

# Drop all indexes
db.collectionName.dropIndexes()
```

## Data Export/Import

```bash
# Export collection to JSON file (from terminal/command prompt)
mongoexport --db=dbName --collection=collectionName --out=output.json

# Import JSON file to collection
mongoimport --db=dbName --collection=collectionName --file=input.json

# Export entire database (from terminal/command prompt)
mongodump --db=dbName --out=./backup

# Restore database from dump
mongorestore --db=dbName ./backup/dbName
```

## Administrative Commands

### User Management

```bash
# Create user
db.createUser({
    user: "username",
    pwd: "password",
    roles: ["readWrite", "dbAdmin"]
})

# Show users
show users

# Drop user
db.dropUser("username")
```

### Server Status

```bash
# Get server status
db.serverStatus()

# Get server statistics
db.stats()

# Get collection statistics
db.collectionName.stats()
```

### Performance Analysis

```bash
# Explain query plan
db.collectionName.find({ field: "value" }).explain("executionStats")

# Get current operations
db.currentOp()

# Kill operation
db.killOp(opId)
```

## Best Practices Tips

1. Always use indexes for frequently queried fields
2. Use projection to limit fields returned
3. Use limit() to restrict number of documents
4. Use proper data types for fields
5. Implement proper error handling
6. Regular backup of important data
7. Monitor database performance
8. Use appropriate security measures

## Common Examples for BlockTrade Backend

### User Collection Operations

```bash
# Find user by email
db.users.findOne({ email: "user@example.com" })

# Find users by role
db.users.find({ role: "TRADER" })

# Update user status
db.users.updateOne(
    { email: "user@example.com" },
    { $set: { status: "ACTIVE" } }
)
```

### Transaction Operations

```bash
# Find recent transactions
db.transactions.find().sort({ createdAt: -1 }).limit(10)

# Get transaction count by status
db.transactions.aggregate([
    { $group: { _id: "$status", count: { $sum: 1 } } }
])
```

### Organization Operations

```bash
# Find organizations with active status
db.organizations.find({ status: "ACTIVE" })

# Update organization details
db.organizations.updateOne(
    { _id: ObjectId("...") },
    { $set: { name: "New Name", updatedAt: new Date() } }
)
```

Note: This document covers most common MongoDB operations. For more specific operations or advanced features, refer to the [official MongoDB documentation](https://docs.mongodb.com/).
