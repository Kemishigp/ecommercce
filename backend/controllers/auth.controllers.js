import User from '../models/user.model.js';
import jwt from 'jsonwebtoken'; 
import redis from '../lib/redis.js';


// Dummy token generation function
const generateToken = (userId) => {
    const accessToken = jwt.sign({ userId }, process.env.ACCESS_TOKEN_SECRET, { expiresIn: '15m' });
    const refreshToken = jwt.sign({ userId }, process.env.REFRESH_TOKEN_SECRET, { expiresIn: '7d' });
    return { accessToken, refreshToken };
};

// Store refresh token in Redis
const storeRefreshToken = async (userId, refreshToken) => {
    await redis.set( `refreshToken:${userId}`,refreshToken,
        "EX",
        7 * 24 * 60 * 60 // 7 days
    );
};


// Set cookies helper function
const setCookies = (res, accessToken, refreshToken) => {
    res.cookie('accessToken', accessToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'Strict',
        maxAge: 15 * 60 * 1000, // 15 minutes
    });
    res.cookie('refreshToken', refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'Strict',
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });
}

export const signup = async (req, res) => {
    const {email, password, username} = req.body;
try {
    if (!email || !password || !username) {
    return res.status(400).json({ message: "All fields are required" });
}
    // Check if user already exists
        const userExists = await User.findOne({ email });
    if (userExists) {
        return res.status(400).json({ message: 'User already exists' });
    }
    // Create new user
    const user = await User.create({ email, password, username });
    // Generate tokens
    const {accessToken, refreshToken} = generateToken(user._id);
    await storeRefreshToken(user._id, refreshToken);
    // Set cookies
    setCookies(res, accessToken, refreshToken);
    // Respond with user data (excluding password)
    res.status(201).json({ message: 'User created successfully', 
        user:{_id: user._id, username: user.username, email: user.email, role: user.role} });
//   res.send("Signup Route");
} catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
    
}
};

// Implement logout logic: clear cookies, invalidate tokens, etc.
export const logout = async (req, res) => {
    try {
        const refreshToken = req.cookies.refreshToken;
        // Invalidate refresh token in store
        if (refreshToken) {
            // Verify token to get userId
            const decoded = jwt.verify(refreshToken, process.env.REFRESH_TOKEN_SECRET);
            const userId = decoded.userId;
            await redis.del(`refreshToken:${userId}`); 
            // Remove refresh token from store
        }
        // Clear cookies
        res.clearCookie('accessToken');
        res.clearCookie('refreshToken');
        res.status(200).json({ message: 'Logged out successfully' });

    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};  


export const login = async (req, res) => {
    const { email, password } = req.body;
    try {
        if (!email || !password) {
            return res.status(400).json({ message: "Email and password are required" });
        }
        // Find user by email
        const user = await User.findOne({ email });
        if (!user) {
            return res.status(400).json({ message: 'Invalid email or password' });
        }
        // Compare password
        const isMatch = await user.comparePassword(password);
        if (!isMatch) {
            return res.status(400).json({ message: 'Invalid email or password' });
        }
        // Generate tokens
        const { accessToken, refreshToken } = generateToken(user._id);
        await storeRefreshToken(user._id, refreshToken);
        // Set cookies
        setCookies(res, accessToken, refreshToken);
        // Respond with user data (excluding password)
        res.status(200).json({
            message: 'Login successful',
            user: { _id: user._id, username: user.username, email: user.email, role: user.role }
        });
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

// Handle token refresh
export const refreshToken = async (req, res) => {
    try { 
        const refreshToken = req.cookies.refreshToken;
        if (!refreshToken) {
            return res.status(401).json({ message: 'No refresh token provided' });
        }
        // Verify refresh token
        const decoded = jwt.verify(refreshToken, process.env.REFRESH_TOKEN_SECRET);
        const userId = decoded.userId;
        // Check if refresh token is valid (exists in store)
        const storedToken = await redis.get(`refreshToken:${userId}`);
        if (storedToken !== refreshToken) {
            return res.status(401).json({ message: 'Invalid refresh token' });
        }
        // Generate new tokens
        const { accessToken: newAccessToken, refreshToken: newRefreshToken } = generateToken(userId);
        await storeRefreshToken(userId, newRefreshToken);
        // Set new cookies
        res.cookie('accessToken', newAccessToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'Strict',
            maxAge: 15 * 60 * 1000, // 15 minutes
        });
        res.cookie ('refreshToken', newRefreshToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'Strict',
            maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
        });
        // Alternatively, use the setCookies helper
        // setCookies(res, newAccessToken, newRefreshToken);
        res.status(200).json({ message: 'Token refreshed successfully' });
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
}; 