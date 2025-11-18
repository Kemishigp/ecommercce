import express from 'express';
import { getCoupons, validateCoupon } from '../controllers/coupon.controllers.js';

import { protectRoute } from '../middleware/auth.middleware.js';

const router = express.Router();
router.get("/", protectRoute, getCoupons )
router.get("/validate", protectRoute, validateCoupon )


export default router;