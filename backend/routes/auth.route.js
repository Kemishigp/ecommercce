import express from 'express';
import {login, logout, refreshToken, signup, getProfile} from '../controllers/auth.controllers.js';
import { get } from 'mongoose';

const router = express.Router();

router.post("/signup", signup);
router.post("/login", login);
router.post("/logout", logout);
router.post("/refresh-token", refreshToken);
router.get("/profile", getProfile);

export default router;