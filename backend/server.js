const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
require('dotenv').config({ path: './config.env' });

// Import routes
const routes = require('./routes');

const app = express();
const PORT = process.env.PORT || 8000;

// Security middleware
app.use(helmet());

// General rate limiting (will be overridden by specific limiters in routes)
// Industry standard: 1000 requests per 15 minutes
const { generalLimiter } = require('./middleware/rateLimiter');
app.use(generalLimiter);

// CORS configuration
app.use(cors({
    origin: process.env.NODE_ENV === 'production'
        ? ['https://yourdomain.com']
        : true, // Allow all origins in development for React Native
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Logging middleware
if (process.env.NODE_ENV === 'development') {
    app.use(morgan('dev'));
}

// MongoDB connection
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/shivik_mart')
    .then(() => {
        console.log('✅ Connected to MongoDB successfully');
        
        // Setup accounting snapshot job (runs daily at 1:00 AM)
        // Install node-cron: npm install node-cron
        try {
            const cron = require('node-cron');
            const { generateBalanceSnapshots } = require('./jobs/accountingSnapshotJob');
            
            // Run daily at 1:00 AM
            cron.schedule('0 1 * * *', async () => {
                console.log('[Cron] Running daily balance snapshot job...');
                try {
                    const result = await generateBalanceSnapshots();
                    console.log(`[Cron] Snapshot job completed: ${result.created} created, ${result.skipped} skipped`);
                } catch (error) {
                    console.error('[Cron] Error generating balance snapshots:', error);
                }
            });
            
            console.log('✅ Accounting snapshot job scheduled (daily at 1:00 AM)');
        } catch (error) {
            // node-cron not installed - job will need to be run manually or via external scheduler
            console.log('⚠️  node-cron not installed. Install with: npm install node-cron');
            console.log('   Accounting snapshot job will need to be run manually or via external scheduler');
        }
    })
    .catch((error) => {
        console.error('❌ MongoDB connection error:', error);
        process.exit(1);
    });

// Routes
app.use('/', routes);

// 404 handler
app.use('*', (req, res) => {
    res.status(404).json({
        status: 'error',
        message: `Route ${req.originalUrl} not found`
    });
});

// Global error handler
app.use((err, req, res, next) => {
    console.error('Error:', err);

    res.status(err.status || 500).json({
        status: 'error',
        message: process.env.NODE_ENV === 'production' ? 'Something went wrong!' : err.message,
        ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
    });
});

// Start server - bind to all interfaces for React Native access
app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Server running on port ${PORT}`);
    console.log(`📱 Environment: ${process.env.NODE_ENV}`);
    console.log(`🌐 API Base URL: http://localhost:${PORT}/api/${process.env.API_VERSION || 'v1'}`);
    console.log(`📱 React Native URL: http://192.168.137.1:${PORT}/api/${process.env.API_VERSION || 'v1'}`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
    console.log('SIGTERM received. Shutting down gracefully...');
    mongoose.connection.close(() => {
        console.log('MongoDB connection closed.');
        process.exit(0);
    });
});

process.on('SIGINT', () => {
    console.log('SIGINT received. Shutting down gracefully...');
    mongoose.connection.close(() => {
        console.log('MongoDB connection closed.');
        process.exit(0);
    });
});
