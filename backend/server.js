import express from "express";
import cors from "cors";
import routes from "./routes.js";

// Keep server alive on errors
process.on("uncaughtException", (err) => {
  console.error("Uncaught Exception:", err);
});
process.on("unhandledRejection", (err) => {
  console.error("Unhandled Rejection:", err);
});

const app = express();

const allowedOrigins = process.env.FRONTEND_URL
  ? [process.env.FRONTEND_URL, "http://localhost:3000", "http://localhost:3001"]
  : ["http://localhost:3000", "http://localhost:3001"];

app.use(cors({
  origin: allowedOrigins,
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  credentials: true,
}));
app.use(express.json());

// Simple request logger
app.use((req, res, next) => {
  console.log(`${req.method} ${req.url}`);
  next();
});

app.use("/", routes);

const PORT = process.env.PORT || 5000;
const server = app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

server.on("error", (err) => {
  console.error("Server error:", err);
});