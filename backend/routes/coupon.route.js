import express from 'express';
import { addToCart, getCartItems, removeAllFromCart, updateQuantity } from '../controllers/cart.controllers.js';
import { protectRoute } from '../middleware/auth.middleware.js';

const router = express.Router();
router.get("/", )
router.get("/", protectRoute, getCartItems)
router.post("/", protectRoute, addToCart)
router.delete("/", protectRoute, removeAllFromCart)
router.put("/:id", protectRoute, updateQuantity)

export default router;