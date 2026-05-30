import path from "path";
import fs from "fs";
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
const publicPath = path.join(__dirname, "public");
const frontendDistCandidates = [
  path.join(__dirname, "frontend", "dist"),
  path.join(process.cwd(), "frontend", "dist"),
  path.join(__dirname, "..", "frontend", "dist"),
  path.join("/var/task", "frontend", "dist"),
].filter(Boolean);
const frontendDistPath =
  frontendDistCandidates.find((candidate) => fs.existsSync(path.join(candidate, "index.html"))) ||
  frontendDistCandidates[0];
const reactIndexPath = path.join(frontendDistPath, "index.html");
const hasReactBuild = fs.existsSync(reactIndexPath);

const legacyHtmlRoutes = [
  "/index.html",
  "/login.html",
  "/register.html",
  "/registro.html",
  "/crear-gasto.html",
  "/gastos-cuenta.html",
  "/gestionar-creaciones.html",
  "/cargar-excel.html",
  "/cargar-excel-personal.html",
  "/deudas.html",
  "/crear-banco.html",
  "/crear-cuenta.html",
  "/crear-categoria.html",
  "/categorias-grupo.html",
  "/perfil.html",
];

dotenv.config({
  path: path.join(__dirname, ".env"),
});
connectDB().catch(() => {
  // En serverless no apagamos la funcion: preflight, assets y fallbacks deben seguir respondiendo.
});

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
  "capacitor://localhost",
  "ionic://localhost",
  "https://localhost",
  "http://localhost",
  "http://localhost:3000",
  "http://localhost:5500",
  "http://localhost:5173",
  "http://127.0.0.1:5173",
  "http://127.0.0.1:5500",
  "https://economia-web.vercel.app",
];

const corsOptions = {
  origin: function (origin, callback) {
    const isLocalhost = /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin || "");
    const isVercel = /^https:\/\/.*\.vercel\.app$/.test(origin || "");

    if (!origin || allowedOrigins.includes(origin) || isLocalhost || isVercel) {
      return callback(null, true);
    }

    return callback(null, true);
  },
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
  optionsSuccessStatus: 204,
};

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
          "https://cdnjs.cloudflare.com",
        ],

        scriptSrcElem: [
          "'self'",
          "'unsafe-inline'",
          "https://cdn.jsdelivr.net",
          "https://cdn.sheetjs.com",
          "https://cdnjs.cloudflare.com",
        ],

        connectSrc: [
          "'self'",
          "capacitor://localhost",
          "ionic://localhost",
          "https://localhost",
          "https://economia-web.vercel.app",
          "http://localhost:3000",
          "https://cdn.jsdelivr.net",
        ],

        imgSrc: ["'self'", "data:", "blob:", "https://res.cloudinary.com"],

        styleSrc: ["'self'", "'unsafe-inline'", "https://cdnjs.cloudflare.com"],
      },
    },
  }),
);
app.use(cors(corsOptions));
app.options(/.*/, cors(corsOptions));
app.use(limiter);

app.use("/imagenes", express.static(path.join(publicPath, "imagenes")));
app.use("/uploads", express.static(path.join(publicPath, "uploads")));

if (hasReactBuild) {
  app.use(express.static(frontendDistPath));
} else {
  app.use(express.static(publicPath));
}

app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true, limit: "1mb" }));
app.use(sanitizeMiddleware);

app.use("/v1", v1Router);

if (hasReactBuild) {
  app.get(["/", ...legacyHtmlRoutes], (req, res) => {
    res.sendFile(reactIndexPath);
  });

  app.use((req, res, next) => {
    if (req.originalUrl.startsWith("/v1")) {
      return next();
    }

    if (
      req.originalUrl.startsWith("/assets/") ||
      req.originalUrl === "/favicon.svg" ||
      req.originalUrl === "/icons.svg"
    ) {
      return res.status(404).send("Asset no encontrado");
    }

    return res.sendFile(reactIndexPath);
  });
} else {
  app.get("/", (req, res) => {
    res.sendFile(path.join(publicPath, "index.html"));
  });
}

app.use((req, res, next) => {
  if (req.originalUrl.startsWith("/v1")) {
    return notFoundMiddleware(req, res, next);
  }

  res.status(404).sendFile(path.join(publicPath, "404.html"));
});
app.use(errorMiddleware);

export default app;
