const { MongoClient } = require("mongodb");

async function cleanAndFixUsers() {
  const uri =
    "mongodb://admin:password@localhost:27017/blocktrade?authSource=admin";
  const client = new MongoClient(uri);

  try {
    console.log("🔌 Connecting to MongoDB...");
    await client.connect();

    const db = client.db("blocktrade");
    const usersCollection = db.collection("users");

    console.log("📊 Checking existing users...");
    const users = await usersCollection.find({}).toArray();
    console.log(`Found ${users.length} users`);

    // Drop ALL existing indexes on users collection to start fresh
    try {
      console.log("🗑️ Dropping ALL existing indexes...");
      const indexes = await usersCollection.indexes();
      for (const index of indexes) {
        if (index.name !== "_id_") {
          // Don't drop the default _id index
          try {
            await usersCollection.dropIndex(index.name);
            console.log(`✅ Dropped index: ${index.name}`);
          } catch (error) {
            console.log(
              `ℹ️ Could not drop index ${index.name}: ${error.message}`
            );
          }
        }
      }
    } catch (error) {
      console.log("ℹ️ Error listing/dropping indexes:", error.message);
    }

    // Clear all usernames first to avoid conflicts
    console.log("🧹 Clearing all existing usernames...");
    await usersCollection.updateMany(
      {},
      {
        $unset: { username: 1 },
        $set: { updatedAt: new Date() },
      }
    );

    // Now update each user with a unique username
    console.log("📝 Assigning unique usernames...");
    let counter = 1;

    for (let user of users) {
      let username;

      // Generate unique username based on email and role
      const emailPrefix = user.email.split("@")[0];
      const domain = user.email.split("@")[1].split(".")[0]; // company name from email

      if (user.role === "bank_admin") {
        username = `${emailPrefix}_bank_admin`;
      } else if (user.role === "bank_officer") {
        username = `${emailPrefix}_bank_officer`;
      } else if (user.role === "corporate_admin") {
        username = `${emailPrefix}_corp_admin`;
      } else if (user.role === "nbfc_admin") {
        username = `${emailPrefix}_nbfc_admin`;
      } else {
        // Fallback: use email prefix + role + counter
        username = `${emailPrefix}_${user.role}_${counter}`;
        counter++;
      }

      // Additional safety: if username is still not unique, add timestamp
      const existingUser = await usersCollection.findOne({
        username: username,
      });
      if (existingUser) {
        username = `${username}_${Date.now()}`;
      }

      console.log(`📝 Updating user ${user.email} with username: ${username}`);

      await usersCollection.updateOne(
        { _id: user._id },
        {
          $set: {
            username: username,
            updatedAt: new Date(),
          },
        }
      );
    }

    // Now create indexes one by one with error handling
    console.log("📊 Creating indexes...");

    try {
      await usersCollection.createIndex({ username: 1 }, { unique: true });
      console.log("✅ Created username index");
    } catch (error) {
      console.log("❌ Failed to create username index:", error.message);
    }

    try {
      await usersCollection.createIndex({ email: 1 }, { unique: true });
      console.log("✅ Created email index");
    } catch (error) {
      console.log("❌ Failed to create email index:", error.message);
    }

    try {
      await usersCollection.createIndex({ role: 1 });
      console.log("✅ Created role index");
    } catch (error) {
      console.log("❌ Failed to create role index:", error.message);
    }

    try {
      await usersCollection.createIndex({ organizationId: 1 });
      console.log("✅ Created organizationId index");
    } catch (error) {
      console.log("❌ Failed to create organizationId index:", error.message);
    }

    try {
      await usersCollection.createIndex({ isActive: 1 });
      console.log("✅ Created isActive index");
    } catch (error) {
      console.log("❌ Failed to create isActive index:", error.message);
    }

    console.log("✅ Database users fixed successfully!");

    // Verify the fix
    const updatedUsers = await usersCollection
      .find({}, { password: 0, passwordHash: 0 })
      .toArray();
    console.log("\n📋 Final user list:");
    updatedUsers.forEach((user) => {
      console.log(`- ${user.username} (${user.email}) - ${user.role}`);
    });

    console.log("\n📊 Final indexes:");
    const finalIndexes = await usersCollection.indexes();
    finalIndexes.forEach((index) => {
      console.log(`- ${index.name}: ${JSON.stringify(index.key)}`);
    });
  } catch (error) {
    console.error("❌ Error fixing database users:", error);
  } finally {
    await client.close();
    console.log("🔌 MongoDB connection closed");
  }
}

cleanAndFixUsers();
