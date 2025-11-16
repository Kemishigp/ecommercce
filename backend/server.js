import express from 'express';
import dotenv from 'dotenv';
import { connectDB } from './lib/db.js';
import cookieParser from 'cookie-parser';
import authRoutes from './routes/auth.route.js';
import productRoutes from './routes/product.route.js';


// Load environment variables FIRST
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// connect to DB AFTER dotenv
connectDB();

app.use(express.json());
app.use(cookieParser());
app.use("/api/auth", authRoutes);
app.use("/api/products", productRoutes);


app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
