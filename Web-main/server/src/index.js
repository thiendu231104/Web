const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
require('dotenv').config();

// Routes Imports
const packageRoutes = require('./routes/packageRoutes');
const authRoutes = require('./routes/authRoutes');
const userRoutes = require('./routes/userRoutes');
const chatbotRoutes = require('./routes/chatbotRoutes');
const transactionRoutes = require('./routes/transactionRoutes');
const subscriptionRoutes = require('./routes/subscriptionRoutes');
const surveyRoutes = require('./routes/surveyRoutes');
const compareRoutes = require('./routes/compareRoutes');
const contactRoutes = require('./routes/contactRoutes');
const notificationRoutes = require('./routes/notificationRoutes');

// Global Error Handler Import
const globalErrorHandler = require('./middlewares/errorMiddleware');

// Seed Services
const chatbotService = require('./services/chatbotService');
const surveyService = require('./services/surveyService');

const app = express();
const PORT = process.env.PORT || 5000;
const mongoUri = process.env.MONGODB_URI || process.env.MONGO_URI;

// Security Middlewares (Helmet Equivalent Security Headers)
app.use((req, res, next) => {
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  next();
});

// Basic Rate Limiter for Production API Protection
const rateLimitMap = new Map();
const apiRateLimiter = (req, res, next) => {
  const ip = req.ip || req.headers['x-forwarded-for'] || req.socket.remoteAddress;
  const now = Date.now();
  const limitWindow = 60000; // 1 minute
  const maxRequests = 120; // Max 120 requests/minute per IP
  
  if (!rateLimitMap.has(ip)) {
    rateLimitMap.set(ip, []);
  }
  
  const requestTimes = rateLimitMap.get(ip);
  const activeRequests = requestTimes.filter(time => now - time < limitWindow);
  activeRequests.push(now);
  rateLimitMap.set(ip, activeRequests);
  
  if (activeRequests.length > maxRequests) {
    return res.status(429).json({
      success: false,
      message: 'Hệ thống phát hiện yêu cầu quá tần suất cho phép (Rate Limit). Vui lòng thử lại sau.'
    });
  }
  next();
};
app.use('/api/', apiRateLimiter);

// Standard CORS configuration
app.use(cors({
  origin: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Connect to MongoDB
if (!mongoUri) {
  console.error("CRITICAL ERROR: MONGODB_URI environment variable is missing!");
  process.exit(1);
}

mongoose.connect(mongoUri, { dbName: 'goicuocviettel' })
  .then(() => {
    console.log("Successfully connected to MongoDB database: goicuocviettel");
    
    // Auto-seed FAQs and Chatbot Configuration on server startup if collections are empty
    chatbotService.checkAndSeedChatbot().catch(err => console.error("Chatbot seed failed:", err));
    surveyService.checkAndSeedSurveyConfigs().catch(err => console.error("Survey config seed failed:", err));
  })
  .catch((err) => {
    console.error("Database connection failure:", err);
  });

// Logging middleware
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  next();
});

// API Routes mounting
app.use('/api/packages', packageRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/chatbot', chatbotRoutes);
app.use('/api/transactions', transactionRoutes);
app.use('/api/subscriptions', subscriptionRoutes);
app.use('/api/survey', surveyRoutes);
app.use('/api/compare', compareRoutes);
app.use('/api/contact', contactRoutes);
app.use('/api/notifications', notificationRoutes);

// Base route
app.get('/', (req, res) => {
  res.json({
    name: "Viettel Mobile Package Management Backend API",
    status: "active",
    version: "1.1.0"
  });
});

// Global Error Handler Middleware
app.use(globalErrorHandler);

// Start Server
app.listen(PORT, () => {
  console.log(`Express API Server is running on port: ${PORT}`);
});
