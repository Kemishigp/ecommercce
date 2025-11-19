## 🛒 E-Commerce MERN App 

A full‑stack e-commerce application built with the **MERN stack**, featuring secure checkout with **Stripe**, image uploads via **Cloudinary**, user authentication, and admin analytics.

## 🚀 Features

* User authentication (JWT-based)
* Product catalog with search + filtering
* Cart + checkout flow
* Secure payments using **Stripe**
* Product image uploads via **Cloudinary**
* Admin dashboard for orders, products, and analytics
* API caching with **Redis**
* Responsive UI built with React

## 🧰 Tech Stack

**Frontend:** React, React Router, Context API / Redux
**Backend:** Node.js, Express.js
**Database:** MongoDB (Mongoose)
**Other:** Stripe, Redis, Cloudinary, JWT, Bcrypt

## 📦 Installation

```bash
git clone <your-repo-url>
cd ecommerce-app
npm install
cd server && npm install
```

Create a `.env` file:

```
MONGO_URI=your_mongo_connection
JWT_SECRET=your_jwt_secret
STRIPE_SECRET=your_stripe_key
CLOUDINARY_CLOUD=xxx
CLOUDINARY_KEY=xxx
CLOUDINARY_SECRET=xxx
REDIS_URL=redis://localhost:6379
```

Run the app:

```bash
npm run dev
```

## 📊 Analytics

Uses MongoDB Aggregation Pipelines to compute:

* Total revenue
* Total users
* Total products
* Order statistics
