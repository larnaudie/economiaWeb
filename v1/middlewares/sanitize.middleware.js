function sanitizeObject(obj) {
  if (!obj || typeof obj !== "object") return;

  for (const key of Object.keys(obj)) {
    if (key.startsWith("$") || key.includes(".")) {
      delete obj[key];
      continue;
    }

    sanitizeObject(obj[key]);
  }
}

export const sanitizeMiddleware = (req, res, next) => {
  sanitizeObject(req.body);
  sanitizeObject(req.params);

  next();
};