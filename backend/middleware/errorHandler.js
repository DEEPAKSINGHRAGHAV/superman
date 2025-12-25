// Global error handling middleware
const errorHandler = (err, req, res, next) => {
    let error = { ...err };
    error.message = err.message;

    // Log error
    console.error(err);

    // Mongoose bad ObjectId
    if (err.name === 'CastError') {
        const message = 'Resource not found';
        error = { message, statusCode: 404 };
    }

    // Mongoose duplicate key
    if (err.code === 11000) {
        const message = 'Duplicate field value entered';
        error = { message, statusCode: 400 };
    }

    // Mongoose validation error
    if (err.name === 'ValidationError') {
        const message = Object.values(err.errors).map(val => val.message);
        error = { message, statusCode: 400 };
    }

    // Standardize error response format
    const statusCode = error.statusCode || 500;
    const errorResponse = {
        success: false,
        error: {
            code: error.code || 'INTERNAL_SERVER_ERROR',
            message: error.message || 'Server Error',
            ...(process.env.NODE_ENV === 'development' && { stack: error.stack })
        }
    };

    // For validation errors, include details
    if (error.name === 'ValidationError' && error.errors) {
        errorResponse.error.details = Object.values(error.errors).map((err: any) => ({
            field: err.path,
            message: err.message
        }));
    }

    res.status(statusCode).json(errorResponse);
};

module.exports = errorHandler;
