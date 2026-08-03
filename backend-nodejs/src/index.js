import "dotenv/config";
import "express-async-errors";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import pinoHttp from "pino-http";
import pino from "pino";

import { errorHandler } from "./middleware/error.js";
import { requireAuth } from "./middleware/auth.js";
import * as authRoutes from "./routes/auth.js";
import * as productRoutes from "./routes/products.js";
import * as variantRoutes from "./routes/variants.js";
import * as listingRoutes from "./routes/listings.js";
import * as uploadRoutes from "./routes/uploads.js";
import { csvUpload, importCsv } from "./routes/imports.js";

const logger = pino({ level: process.env.LOG_LEVEL || "info" });
const app = express();

app.use(helmet());
app.use(cors({ origin: (process.env.CORS_ORIGINS || "*").split(",") }));
app.use(express.json({ limit: "1mb" }));
app.use(pinoHttp({ logger }));
app.use("/api", rateLimit({ windowMs: 60_000, max: 300 }));

app.get("/health", (_req, res) => res.json({ ok: true, ts: Date.now() }));

// -------- Public auth --------
app.post("/api/auth/signup", authRoutes.signup);
app.post("/api/auth/login", authRoutes.login);

// -------- Everything below requires a valid tenant JWT --------
app.use("/api", requireAuth);

app.get("/api/auth/me", authRoutes.me);

// Products
app.get("/api/products", productRoutes.listProducts);
app.post("/api/products", productRoutes.createProduct);
app.get("/api/products/:id", productRoutes.getProduct);
app.patch("/api/products/:id", productRoutes.updateProduct);
app.post("/api/products/:id/stock-mode", productRoutes.setStockMode);
app.post("/api/products/:id/auto-balance", productRoutes.autoBalanceStock);

// Variants (nested under product)
app.get("/api/products/:id/variants", variantRoutes.listVariants);
app.post("/api/products/:id/variants/regenerate", variantRoutes.regenerateVariants);
app.patch("/api/variants/:id", variantRoutes.updateVariant);

// Listings
app.get("/api/listings", listingRoutes.listListings);
app.post("/api/listings/publish", listingRoutes.publishToChannels);
app.patch("/api/listings/:id", listingRoutes.updateListing);

// Uploads (presigned S3 flow)
app.post("/api/uploads/presign", uploadRoutes.presignUpload);
app.post("/api/uploads/attach", uploadRoutes.attachImages);

// CSV import (multipart)
app.post("/api/imports/csv", csvUpload, importCsv);

app.use(errorHandler);

const port = parseInt(process.env.PORT || "8080", 10);
app.listen(port, () => logger.info({ port }, "listening"));
