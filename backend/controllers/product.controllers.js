import Product from '../models/product.model.js';
import mongoose from 'mongoose';
import cloudinary from '../lib/cloudinary.js';
import redis from '../lib/redis.js';

// Get all products
export const getAllProducts = async (req, res) => {
    try {
        const products = await Product.find({});
        res.status(200).json(products);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};
// Get featured products
export const getFeaturedProducts = async (req, res) => {
    try {
        // Check cache first
        let featuredProducts = await redis.get("featured Products")
        if(featuredProducts){
            return res.status(200).json(JSON.parse(featuredProducts))
        }
        // If not in cache, fetch from database
        featuredProducts = await Product.find({ isFeatured: true }).lean();
        if (featuredProducts. length === 0) {
            return res.status(404).json({ message: 'No featured products found' });
        }
        // Store in cache for future requests
        await redis.set("featured Products", JSON.stringify(featuredProducts), 'EX', 3600);
        res.status(200).json(featuredProducts);
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
};
// Create a new product
export const createProduct = async (req, res) => {
    try {
        const {name, description, price, image, category} = req.body; 
        let cloudinaryResponse = null;
        if(image){
            cloudinaryResponse = await cloudinary.uploader.upload(image, {
                folder: 'products',
                resource_type: 'image',
            });
        }
        const product = await Product.create({
            name,
            description,
            price,
            image: cloudinaryResponse?.secure_url ? cloudinaryResponse.secure_url : "",
            category,
        });
        res.status(201).json(product);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
};
// Delete product by ID
export const deleteProduct = async (req, res) => {
    try {
        const product = await Product.findById(req.params.id);
        // Check if product exists
        if (!product) {
            return res.status(404).json({ message: 'Product not found' });
        }
        // Delete product from database
        if(product.image){
            // Extract public ID from URL
            const segments = product.image.split('/');
            const imageName = segments[segments.length - 1];
            const publicId = `products/${imageName.split('.')[0]}`; // Assuming the folder is 'products'
            
            // Delete from Cloudinary
            await cloudinary.uploader.destroy(publicId, { resource_type: 'image' });
        }
        res.status(200).json({ message: 'Product deleted successfully' });
        } catch (error) {
        res.status(500).json({ error: error.message });
    }
};
// Get recommended products
export const getRecommendedProducts = async (req, res) => {
    try {
        const products = await Product.aggregate([
            { $sample: { size: 5 } },
            { $project: {
                _id: 1,
                name: 1,
                description: 1,
                image: 1,
                price: 1 }
        }
        ]);
        res.status(200).json(products); 
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};
// Get products by category
export const getProductCategory = async (req, res) => {
    const category = req.params.category;
    try {
        const products = await Product.find({ category: category });
        if (products.length === 0) {
            return res.status(404).json({ message: 'No products found in this category' });
        }
        res.status(200).json(products);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};
// Toggle featured status of a product
export const toggleFeatureProduct = async (req, res) => {
    try {
        // 1. Find product
        const product = await Product.findById(req.params.id);
        if (!product) {
            return res.status(404).json({ message: 'Product not found' });
        }

        // 2. Toggle boolean
        product.isFeatured = !product.isFeatured;
        await product.save();

        // 3. Update Redis cache with new featured list
        const featuredProducts = await Product.find({ isFeatured: true }).lean();
        await redis.set("featured_products", JSON.stringify(featuredProducts), 'EX', 3600);

        // 4. Respond
        return res.status(200).json({
            message: 'Featured status updated',
            product
        });

    } catch (error) {
        return res.status(500).json({ error: error.message });
    }
};


 

// ######################### EXPERIMENTAL #########################

// Get product by ID
export const getProductById = async (req, res) => {
    try {
        const product = await Product.findById(req.params.id);
        if (!product) {
            return res.status(404).json({ message: 'Product not found' });
        }
        res.status(200).json(product);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};
// Update product by ID
export const updateProduct = async (req, res) => {
    try {
        const product = await Product.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
        if (!product) {
            return res.status(404).json({ message: 'Product not found' });
        }
        res.status(200).json(product);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
};

// export const createProduct = async (req, res) => {
//     try {
//         const { name, description, price, image, category } = req.body;

//         // Validate required fields
//         if (!name || !description || !price || !category) {
//             return res.status(400).json({ message: "All fields are required" });
//         }

//         let cloudinaryResponse = null;
//         if (image) {
//             cloudinaryResponse = await cloudinary.uploader.upload(image, {
//                 folder: "products",
//                 resource_type: "image",
//             });
//         } else {
//             return res.status(400).json({ message: "Product image is required" });
//         }

//         const product = await Product.create({
//             name,
//             description,
//             price,
//             image: cloudinaryResponse.secure_url,
//             category,
//         });

//         res.status(201).json(product);

//     } catch (error) {
//         res.status(400).json({ error: error.message });
//     }
// };