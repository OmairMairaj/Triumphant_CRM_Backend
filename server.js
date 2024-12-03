const express = require('express');
const connectDB = require('./config/db');
const dotenv = require('dotenv');
const cors = require('cors');

// Load environment variables
dotenv.config();

// Connect to MongoDB
connectDB();

const app = express();

// Middleware
app.use(express.json());

// CORS Middleware
const allowedOrigins = ['http://localhost:3000', 'https://your-production-frontend-domain.com']; // Update with your domains
app.use(
    cors({
        origin: function (origin, callback) {
            // Allow requests with no origin (like mobile apps or curl requests)
            if (!origin) return callback(null, true);
            if (allowedOrigins.indexOf(origin) === -1) {
                const msg = 'The CORS policy for this site does not allow access from the specified Origin.';
                return callback(new Error(msg), false);
            }
            return callback(null, true);
        },
        methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
        allowedHeaders: ['Content-Type', 'x-auth-token'],
        credentials: true,
    })
);

// Preflight request handling
app.options('*', cors());

// Routes
app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/vehiclesales', require('./routes/vehicleSaleRoutes'));
app.use('/api/users', require('./routes/userRoutes'));

// Sample route for testing
app.get('/', (req, res) => res.send('API Running...'));

// Export the app for serverless deployment with Vercel
module.exports = app;

// Comment out this code when deploying to Vercel, since Vercel handles the serverless deployment
if (process.env.NODE_ENV !== 'production') {
    const PORT = process.env.PORT || 5000;
    app.listen(PORT, () => console.log(`Server started on port ${PORT}`));
}
