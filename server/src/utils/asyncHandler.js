/**
 * Async Handler Wrapper
 * Har async controller function ko wrap karta hai.
 * Fayda: Controller me baar-baar try-catch likhne ki zaroorat nahi padti!
 * Agar koi Promise reject hota hai ya error throw hota hai, yeh automatically next(err) call karta hai.
 *
 * @param {Function} requestHandler - (req, res, next) async function
 * @returns {Function} Express middleware wrapper
 */
export const asyncHandler = (requestHandler) => {
  return (req, res, next) => {
    Promise.resolve(requestHandler(req, res, next)).catch((err) => next(err));
  };
};
