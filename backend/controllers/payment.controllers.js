// controllers/checkout.controllers.js
import Coupon from "../models/coupon.model.js";
import Order from "../models/order.model.js";
import User from "../models/user.model.js";
import { stripe } from "../lib/stripe.js";

/**
 * In-memory cache for Stripe coupon IDs keyed by discount percentage.
 * This is simple and effective to avoid creating many duplicate coupons.
 * Note: cache resets on process restart. For long-term stability consider
 * storing created Stripe coupon IDs in your DB.
 */
const stripeCouponCache = new Map();

/** Helper: create (or reuse) a Stripe coupon for given percentage */
async function getOrCreateStripeCoupon(discountPercentage) {
  const key = Number(discountPercentage);
  if (stripeCouponCache.has(key)) return stripeCouponCache.get(key);

  // Create a new Stripe coupon (one-time percent_off)
  const stripeCoupon = await stripe.coupons.create({
    percent_off: key,
    duration: "once",
  });

  stripeCouponCache.set(key, stripeCoupon.id);
  return stripeCoupon.id;
}

/** Helper: generate a unique coupon code */
function generateCouponCode(prefix = "GIFT", len = 6) {
  return `${prefix}${Math.random().toString(36).substring(2, 2 + len).toUpperCase()}`;
}

/**
 * Create Checkout Session
 * Request body:
 *  { products: [{ _id, name, price, image, quantity }], couponCode?: string }
 */
export const createCheckoutSession = async (req, res) => {
  try {
    const { products, couponCode } = req.body;
    const userId = req.user && req.user._id ? req.user._id.toString() : null;

    // Validate incoming products
    if (!Array.isArray(products) || products.length === 0) {
      return res.status(400).json({ error: "Invalid or empty products array" });
    }

    // Validate each product shape
    for (const p of products) {
      if (!p._id || !p.price || !p.name) {
        return res.status(400).json({ error: "Each product must include _id, name and price" });
      }
    }

    // Build Stripe line items and compute total in cents
    let totalCents = 0;
    const lineItems = products.map((product) => {
      const quantity = Number(product.quantity) || 1;
      const unitAmountCents = Math.round(Number(product.price) * 100); // cents
      totalCents += unitAmountCents * quantity;

      return {
        price_data: {
          currency: "usd",
          product_data: {
            name: product.name,
            images: product.image ? [product.image] : [],
          },
          unit_amount: unitAmountCents,
        },
        quantity,
      };
    });

    // Validate coupon (global coupon logic)
    let coupon = null;
    let discountPercentage = 0;
    if (couponCode) {
      coupon = await Coupon.findOne({ code: couponCode.toUpperCase(), isActive: true });
      if (!coupon) {
        return res.status(404).json({ error: "Coupon not found or inactive" });
      }
      if (coupon.expirationDate < new Date()) {
        return res.status(400).json({ error: "Coupon expired" });
      }
      discountPercentage = Number(coupon.discountPercentage) || 0;
    }

    // Compute discounted total in cents
    const discountedCents = discountPercentage
      ? Math.round(totalCents * (100 - discountPercentage) / 100)
      : totalCents;

    // Prepare discounts for Stripe (if coupon provided)
    const discounts = [];
    if (coupon && discountPercentage > 0) {
      const stripeCouponId = await getOrCreateStripeCoupon(discountPercentage);
      discounts.push({ coupon: stripeCouponId });
    }

    // Create Stripe session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      line_items: lineItems,
      mode: "payment",
      success_url: `${process.env.CLIENT_URL}/purchase-success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.CLIENT_URL}/purchase-cancel`,
      discounts,
      metadata: {
        userId: userId || "",
        couponCode: couponCode ? couponCode.toUpperCase() : "",
        products: JSON.stringify(products.map(p => ({
          id: p._id,
          quantity: Number(p.quantity) || 1,
          price: Number(p.price)
        }))),
      },
      // Optional: you can set `amount_subtotal` or `amount_total` via line items + discounts,
      // Stripe will compute final amount for you.
    });

    // Reward issuance logic: if the final charged amount (discountedCents) >= $200.00 -> create gift coupon
    // We check discountedCents here (the expected charged amount), not the original total.
    let rewardCoupon = null;
    if (discountedCents >= 20000) {
      // Create a global coupon as a reward (you may want to email it to user)
      const code = generateCouponCode("GIFT", 6);
      rewardCoupon = new Coupon({
        code,
        discountPercentage: 10,
        expirationDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        isActive: true,
      });
      await rewardCoupon.save();
      // Note: we do NOT tie this to user in schema (global coupon). You may send `code` to the user.
    }

    return res.status(200).json({
      id: session.id,
      // inform client what the expected totals are (in dollars)
      totalBeforeDiscount: (totalCents / 100).toFixed(2),
      totalAfterDiscount: (discountedCents / 100).toFixed(2),
      rewardCouponCode: rewardCoupon ? rewardCoupon.code : null
    });
  } catch (error) {
    console.error("Error creating checkout session:", error);
    return res.status(500).json({ message: "Error creating checkout session", error: error.message });
  }
};


/**
 * Checkout success endpoint
 * Body: { sessionId: "..." }
 *
 * This endpoint verifies the Stripe session, ensures payment succeeded,
 * creates an Order record (with coupon and discount info), clears the user's cart,
 * and returns the created order id.
 */
export const checkoutSuccess = async (req, res) => {
  try {
    const { sessionId } = req.body;
    if (!sessionId) {
      return res.status(400).json({ message: "sessionId is required" });
    }

    const session = await stripe.checkout.sessions.retrieve(sessionId);

    if (!session) {
      return res.status(404).json({ message: "Session not found" });
    }

    if (session.payment_status !== "paid") {
      return res.status(400).json({ message: "Payment not completed" });
    }

    // Parse metadata
    const metadata = session.metadata || {};
    const userId = metadata.userId || null;
    const couponCode = metadata.couponCode || null;
    const productsMeta = metadata.products ? JSON.parse(metadata.products) : [];

    // Calculate totals and discount from metadata/products
    // (session.amount_total is authoritative for the charged amount in cents)
    const chargedCents = session.amount_total || 0;
    const chargedDollars = chargedCents / 100;

    // Determine discount amount by comparing subtotal from metadata to charged amount
    let subtotalCents = 0;
    for (const p of productsMeta) {
      subtotalCents += Math.round(Number(p.price) * 100) * Number(p.quantity);
    }
    const discountAmountCents = Math.max(0, subtotalCents - chargedCents);
    const discountAmount = discountAmountCents / 100;

    // Create Order document (assumes Order schema has coupon & discountAmount fields)
    const order = new Order({
      user: userId || undefined,
      products: productsMeta.map(p => ({
        product: p.id,
        quantity: p.quantity,
        price: p.price
      })),
      totalAmount: chargedDollars,
      coupon: couponCode || null,
      discountAmount: discountAmount,
      status: "paid",
      stripeSessionId: sessionId,
    });

    await order.save();

    // Clear user's cart if we have a userId
    if (userId) {
      await User.findByIdAndUpdate(userId, { $set: { cartItems: [] } });
    }

    return res.status(200).json({
      success: true,
      message: "Payment verified, order created",
      orderId: order._id
    });

  } catch (error) {
    console.error("Error processing successful checkout:", error);
    return res.status(500).json({ message: "Error processing successful checkout", error: error.message });
  }
};
