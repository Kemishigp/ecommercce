import jwt from 'jsonwebtoken';
import User from '../models/user.model.js'; // <-- you MUST import User

// Middleware to protect routes
export const protectRoute = async (req, res, next) => {
    try {
        const accessToken = req.cookies.accessToken;

        if (!accessToken) {
            return res.status(401).json({ message: 'No token provided' });
        }

        // Verify access token  
        const decoded = jwt.verify(accessToken, process.env.JWT_SECRET);

        // Find user  
        const user = await User.findById(decoded.userId).select('-password');

        if (!user) {
            return res.status(401).json({ message: 'User not found' });
        }

        // Attach user to request
        req.user = user;
        next();

    } catch (error) {
        // Handle token-specific errors
        if (error.name === 'TokenExpiredError') {
            return res.status(401).json({ message: 'Token expired' });
        }
        if (error.name === 'JsonWebTokenError') {
            return res.status(401).json({ message: 'Invalid token' });
        }

        // General catch
        return res.status(401).json({ message: 'Unauthorized', error: error.message });
    }
};
// Middleware to check admin role
export const adminRoute = (req, res, next) => {
    if (req.user && req.user.role === 'admin') {
        next();
    } else {
        res.status(403).json({ message: 'Admin access required' });
    }
};