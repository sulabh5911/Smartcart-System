/**
 * Request Logger Middleware
 * Terminal me har incoming request ka method, route aur execution time print karta hai.
 */
export const requestLogger = (req, res, next) => {
  const start = Date.now();
  const { method, originalUrl } = req;

  res.on('finish', () => {
    const duration = Date.now() - start;
    const statusCode = res.statusCode;
    const statusColor = statusCode >= 500 ? '\x1b[31m' : statusCode >= 400 ? '\x1b[33m' : '\x1b[32m';
    const resetColor = '\x1b[0m';

    console.log(
      `[${new Date().toLocaleTimeString()}] ${method} ${originalUrl} ${statusColor}${statusCode}${resetColor} - ${duration}ms`
    );
  });

  next();
};
