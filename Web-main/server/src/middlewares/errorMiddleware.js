// Global Error Handling Middleware
const globalErrorHandler = (err, req, res, next) => {
  console.error(`[${new Date().toISOString()}] ERROR: ${err.message}`, err.stack);

  const statusCode = err.statusCode || 500;
  const message = err.message || 'Đã xảy ra lỗi hệ thống nội bộ.';

  res.status(statusCode).json({
    success: false,
    message: message
  });
};

module.exports = globalErrorHandler;
