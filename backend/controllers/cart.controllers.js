// Add items to Cart
export const addToCart = async (req, res) => {
    try {
        const { productId } = req.body;

        if (!productId) {
            return res.status(400).json({ message: "productId is required" });
        }

        const user = req.user;

        let existingItem = user.cartItems.find(
            item => item.id.toString() === productId
        );

        if (existingItem) {
            existingItem.quantity += 1;
        } else {
            user.cartItems.push({ id: productId, quantity: 1 });
        }

        await user.save();

        return res.status(200).json({
            message: "Product added to cart",
            cartItems: user.cartItems
        });

    } catch (error) {
        return res.status(500).json({ error: error.message });
    }
};
// Remove items from cart
export const removeAllFromCart = async (req, res) => {
    try {
        const { productId } = req.body;
        const user = req.user;

        // Prevent accidental full-cart deletion
        if (!productId) {
            return res.status(400).json({
                message: "productId is required to remove a single item. To clear the entire cart, use the /clear-cart endpoint."
            });
        }

        user.cartItems = user.cartItems.filter(
            (item) => item.id.toString() !== productId
        );

        await user.save();
        res.json(user.cartItems);

    } catch (error) {
        res.status(500).json({
            message: "Server error",
            error: error.message
        });
    }
};
// update item quanity in the cart
export const updateQuantity = async (req, res) => {
    try {
        const { id: productId } = req.params;
        let { quantity } = req.body;
        const user = req.user;

        // Validate quantity
        if (quantity === undefined || quantity === null) {
            return res.status(400).json({ message: "Quantity is required" });
        }

        quantity = Number(quantity);

        if (isNaN(quantity) || quantity < 0) {
            return res.status(400).json({ message: "Quantity must be a non-negative number" });
        }

        const existingItem = user.cartItems.find(
            (item) => item.id.toString() === productId
        );

        if (!existingItem) {
            return res.status(404).json({ message: "Product not found in cart" });
        }

        // Remove item if quantity is 0
        if (quantity === 0) {
            user.cartItems = user.cartItems.filter(
                (item) => item.id.toString() !== productId
            );
            await user.save();
            return res.json(user.cartItems);
        }

        // Update quantity
        existingItem.quantity = quantity;
        await user.save();
        return res.json(user.cartItems);

    } catch (error) {
        return res.status(500).json({ error: error.message });
    }
};
// Get cart items
export const getCartItems = async (req, res) => {
    try {
        const user = req.user;

        // Extract only product IDs from the user's cart
        const productIds = user.cartItems.map(item => item.id);

        if (productIds.length === 0) {
            return res.status(200).json({ cartItems: [] });
        }

        // Fetch the product documents
        const products = await Product.find({ _id: { $in: productIds } });

        // Merge product info + quantity
        const cartItems = products.map(product => {
            const matchedItem = user.cartItems.find(
                item => item.id.toString() === product._id.toString()
            );

            return {
                ...product.toJSON(),
                quantity: matchedItem.quantity
            };
        });

        return res.status(200).json({ cartItems });

    } catch (error) {
        return res.status(500).json({ error: error.message });
    }
};

