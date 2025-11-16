import User from '../models/user.model.js';
import jwt from 'jsonwebtoken'; 
import redis from '../lib/redis.js';


// Dummy token generation function
const generateToken = (userId) => {
    const accessToken = jwt.sign({ userId }, process.env.ACCESS_TOKEN_SECRET, { expiresIn: '15m' });
    const refreshToken = jwt.sign({ userId }, process.env.REFRESH_TOKEN_SECRET, { expiresIn: '7d' });
    return { accessToken, refreshToken };
};

const storeRefreshToken = async (userId, refreshToken) => {
    await redis.set(`refreshToken:${userId}`, refreshToken, {
    EX: 7 * 24 * 60 * 60
});    // Implement storing refresh token in Redis or database
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

export const login = async (req, res) => {
  res.send("Login Route");
};

export const logout = async (req, res) => {
  res.send("Logout Route");
};  