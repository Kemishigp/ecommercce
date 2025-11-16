import express from 'express';
import {createProduct, getAllProducts, getProductById, updateProduct, deleteProduct} from '../controllers/product.controllers.js';

const router = express.Router();

router.get("/", protectRoute, adminRoute, getAllProducts);
router.post("/", createProduct);
router.get("/:id", getProductById);
router.put("/:id", updateProduct);
router.delete("/:id", deleteProduct);

export default router;