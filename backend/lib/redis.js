import Redis from "ioredis";
import dotenv from "dotenv";

dotenv.config();

// Create client using Upstash Redis URL
const redis = new Redis(process.env.UPSTASH_REDIS_URL);

// Test connection (optional)
redis.set("test-key", "connected").catch(console.error);

export default redis;
