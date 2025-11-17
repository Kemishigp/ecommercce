import express from 'express';
import {getAllProducts, getFeaturedProducts, createProduct, deleteProduct, getRecommendedProducts, getProductCategory, toggleFeatureProduct} from '../controllers/product.controllers.js';
import { protectRoute, adminRoute } from '../middleware/auth.middleware.js';

const router = express.Router();

router.get("/", protectRoute, adminRoute, getAllProducts);
router.get("/featured",   getFeaturedProducts);
router.post("/", protectRoute, adminRoute, createProduct);
router.delete("/:id", protectRoute, adminRoute,  deleteProduct);
router.get("/recommendations", getRecommendedProducts);
router.get("category/:category", getProductCategory);
router.patch("/:id", protectRoute, adminRoute,  toggleFeatureProduct);
// router.get("/:id", getProductById);
// router.put("/:id", updateProduct);

export default router;