// Load environment variables first
require('dotenv').config();

const express = require('express');
const cors = require('cors');
const connectDB = require('./config/database');

// Initialize Express app
const app = express();

// Connect to MongoDB
connectDB();

// Middleware
app.use(cors());            // Enable Cross-Origin Resource Sharing
app.use(express.json());    // Parse incoming JSON requests

// Routes
app.use('/api/auth', require('./routes/auth'));   // Auth routes (signup/login)
app.use('/api/users', require('./routes/users')); // User-related routes
// You can add more routes here as features are built

// Test route
app.get('/api/test', (req, res) => {
  res.json({ message: 'Backend is working!' });
});

// Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Server started on port ${PORT}`);
});
