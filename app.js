import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";
import express from "express";
import rateLimit from "express-rate-limit";
import cors from "cors";
import helmet from "helmet";
import v1Router from "./v1/v1.routes.js";
import { notFoundMiddleware } from "./v1/middlewares/notFound.middleware.js";
import { errorMiddleware } from "./v1/middlewares/error.middleware.js";
import connectDB from "./v1/config/db.config.js";
import { sanitizeMiddleware } from "./v1/middlewares/sanitize.middleware.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config();
connectDB();

const app = express();
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 300,
  message: {
    success: false,
    message: "Demasiadas peticiones, intenta nuevamente más tarde.",
  },
  standardHeaders: true,
  legacyHeaders: false,
});

const allowedOrigins = [
  "http://localhost:3000",
  "http://localhost:5500",
  "http://127.0.0.1:5500",
  "https://economia-web.vercel.app",
];

app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],

        scriptSrc: [
          "'self'",
          "'unsafe-inline'",
          "https://cdn.jsdelivr.net",
          "https://cdn.sheetjs.com",
        ],

        scriptSrcElem: [
          "'self'",
          "'unsafe-inline'",
          "https://cdn.jsdelivr.net",
          "https://cdn.sheetjs.com",
        ],

        connectSrc: [
          "'self'",
          "https://economia-web.vercel.app",
          "http://localhost:3000",
        ],

        imgSrc: ["'self'", "data:"],

        styleSrc: ["'self'", "'unsafe-inline'"],
      },
    },
  }),
);
app.use(limiter);

app.use(
  cors({
    origin: function (origin, callback) {
      if (!origin || allowedOrigins.includes(origin)) {
        return callback(null, true);
      }

      return callback(new Error("Origen no permitido por CORS"));
    },
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE"],
    allowedHeaders: ["Content-Type", "Authorization"],
  }),
);

app.use(express.static(path.join(__dirname, "public")));
app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true, limit: "1mb" }));
app.use(sanitizeMiddleware);

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

app.use("/v1", v1Router);

app.use((req, res, next) => {
  if (req.originalUrl.startsWith("/v1")) {
    return notFoundMiddleware(req, res, next);
  }

  res.status(404).sendFile(path.join(__dirname, "public", "404.html"));
});
app.use(errorMiddleware);

export default app;
