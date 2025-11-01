const { MongoClient } = require("mongodb");
require("dotenv").config();

async function testMongoDBConnection() {
  console.log("🔍 Testing MongoDB Connection...");
  console.log("================================");

  const uri =
    process.env.MONGO_URI ||
    "mongodb://admin:password@localhost:27017/blocktrade?authSource=admin";
  console.log(
    `Connection URI: ${uri.replace(/\/\/[^:]+:[^@]+@/, "//***:***@")}`
  );

  const client = new MongoClient(uri);

  try {
    // Connect to MongoDB
    console.log("\n📡 Connecting to MongoDB...");
    await client.connect();
    console.log("✅ Connected successfully");

    // Test the connection
    console.log("\n🏓 Testing ping...");
    await client.db("blocktrade").admin().ping();
    console.log("✅ Ping successful");

    // Get database info
    console.log("\n📊 Database Information:");
    const admin = client.db("blocktrade").admin();
    const dbStats = await client.db("blocktrade").stats();

    console.log(`Database Name: ${dbStats.db}`);
    console.log(`Collections: ${dbStats.collections}`);
    console.log(`Documents: ${dbStats.objects}`);
    console.log(`Data Size: ${(dbStats.dataSize / 1024 / 1024).toFixed(2)} MB`);

    // List collections
    console.log("\n📁 Available Collections:");
    const collections = await client
      .db("blocktrade")
      .listCollections()
      .toArray();

    if (collections.length === 0) {
      console.log(
        "No collections found. Database initialization may be needed."
      );
      console.log(
        "📖 Please follow the steps in DATABASE_SETUP.md to initialize the database."
      );
    } else {
      collections.forEach((collection) => {
        console.log(`  - ${collection.name}`);
      });
    }

    // Test basic operations
    console.log("\n🧪 Testing Basic Operations:");

    // Test write operation
    const testCollection = client.db("blocktrade").collection("test");
    const testDoc = {
      test: true,
      timestamp: new Date(),
      message: "Connection test successful",
    };

    const insertResult = await testCollection.insertOne(testDoc);
    console.log("✅ Write operation successful");

    // Test read operation
    const foundDoc = await testCollection.findOne({
      _id: insertResult.insertedId,
    });
    if (foundDoc) {
      console.log("✅ Read operation successful");
    }

    // Clean up test document
    await testCollection.deleteOne({ _id: insertResult.insertedId });
    console.log("✅ Delete operation successful");

    console.log("\n🎉 All tests passed! MongoDB is working correctly.");
  } catch (error) {
    console.error("\n❌ MongoDB connection test failed:");
    console.error(error.message);

    console.log("\n🔧 Troubleshooting Tips:");
    console.log("1. Make sure MongoDB Docker container is running:");
    console.log("   docker ps | grep mongodb");
    console.log("");
    console.log("2. Check if the container is accessible:");
    console.log(
      "   docker exec mongodb mongosh -u admin -p password --authenticationDatabase admin"
    );
    console.log("");
    console.log("3. Verify your .env file has the correct MONGO_URI:");
    console.log(
      "   MONGO_URI=mongodb://admin:password@localhost:27017/blocktrade?authSource=admin"
    );
    console.log("");
    console.log("4. If container doesn't exist, run the setup script:");
    console.log("   chmod +x setup-mongodb.sh && ./setup-mongodb.sh");

    process.exit(1);
  } finally {
    await client.close();
    console.log("\n🔌 Connection closed");
  }
}

// Run the test
testMongoDBConnection().catch(console.error);
