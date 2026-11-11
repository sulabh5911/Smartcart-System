import rateLimit from 'express-rate-limit';

/**
 * Login Rate Limiter Middleware
 * Protects against brute-force password guessing and credential stuffing attacks.
 * Limits failed/total attempts from a single IP within a sliding 15-minute window.
 */
export const loginRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20, // Limit each IP to 20 requests per windowMs
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  handler: (req, res) => {
    res.status(429).json({
      success: false,
      statusCode: 429,
      message: 'Too many login attempts from this IP. Please try again after 15 minutes.',
      errors: ['Rate limit exceeded. Temporary lock to prevent brute-force attacks.']
    });
  }
});
