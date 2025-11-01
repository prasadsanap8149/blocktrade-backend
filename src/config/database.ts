import { MongoClient, Db } from 'mongodb';
import { logger } from '../utils/logger';

class DatabaseConnection {
  private client: MongoClient | null = null;
  private db: Db | null = null;
  private uri: string | null = null;
  private readonly dbName: string = 'blocktrade';

  constructor() {
    // Don't load environment variables in constructor
    // They will be loaded when connect() is called
  }

  private getUri(): string {
    if (!this.uri) {
      this.uri = process.env.MONGO_URI || '';
      if (!this.uri) {
        throw new Error('MONGO_URI environment variable is required');
      }
    }
    return this.uri;
  }

  async connect(): Promise<Db> {
    try {
      if (this.db) {
        return this.db;
      }

      logger.info('🔌 Connecting to MongoDB...');
      
      const uri = this.getUri(); // Get URI with validation
      
      this.client = new MongoClient(uri, {
        maxPoolSize: 10,
        serverSelectionTimeoutMS: 5000,
        socketTimeoutMS: 45000,
      });

      await this.client.connect();
      
      // Test the connection
      await this.client.db(this.dbName).admin().ping();
      
      this.db = this.client.db(this.dbName);
      
      logger.info('✅ Successfully connected to MongoDB');
      logger.info(`📊 Database: ${this.dbName}`);
      
      return this.db;
    } catch (error) {
      logger.error('❌ MongoDB connection failed:', error);
      throw error;
    }
  }

  async disconnect(): Promise<void> {
    try {
      if (this.client) {
        await this.client.close();
        this.client = null;
        this.db = null;
        logger.info('🔌 Disconnected from MongoDB');
      }
    } catch (error) {
      logger.error('❌ Error disconnecting from MongoDB:', error);
    }
  }

  getDb(): Db {
    if (!this.db) {
      throw new Error('Database not connected. Call connect() first.');
    }
    return this.db;
  }

  isConnected(): boolean {
    return this.db !== null;
  }
}

// Export singleton instance
export const database = new DatabaseConnection();
export default database;
