import Coupon from "../models/coupon.model.js";

// Get all active coupons
export const getCoupons = async (req, res) => {
	try {
		const coupons = await Coupon.find({ isActive: true });
		res.json(coupons);
	} catch (error) {
		console.log("Error in getCoupons controller", error.message);
		res.status(500).json({ message: "Server error", error: error.message });
	}
};

// Validate a coupon
export const validateCoupon = async (req, res) => {
	try {
		let { code } = req.body;

		if (!code) {
			return res.status(400).json({ message: "Coupon code is required" });
		}

		code = code.toUpperCase();

		const coupon = await Coupon.findOne({ code, isActive: true });

		if (!coupon) {
			return res.status(404).json({ message: "Coupon not found" });
		}

		// Check expiration date
		if (coupon.expirationDate < new Date()) {
			return res.status(400).json({ message: "Coupon expired" });
		}

		res.json({
			message: "Coupon is valid",
			code: coupon.code,
			discountPercentage: coupon.discountPercentage,
		});
	} catch (error) {
		console.log("Error in validateCoupon controller", error.message);
		res.status(500).json({ message: "Server error", error: error.message });
	}
};
