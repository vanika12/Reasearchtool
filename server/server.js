import express from "express"
import cors from "cors"
import multer from "multer"
import dotenv from "dotenv"
import session from "express-session" // Added session support
import { extractRoute } from "./routes/extract.js"
import processRoute from "./routes/process.js" // Fixed import to use default export
import formatRoute from "./routes/format.js" // Fixed format route import to use default export
import { exportRoute } from "./routes/export.js"
import { groqRateLimit, validateGroqConfig } from "./middleware/groq-middleware.js" // Added GROQ middleware

dotenv.config()

const app = express()
const PORT = process.env.PORT || 5000

// Middleware
app.use(cors())
app.use(express.json({ limit: "50mb" }))
app.use(express.urlencoded({ extended: true, limit: "50mb" }))

app.use(
  session({
    secret: process.env.SESSION_SECRET || "research-formatter-secret",
    resave: false,
    saveUninitialized: true,
    cookie: { maxAge: 24 * 60 * 60 * 1000 }, // 24 hours
  }),
)

// Configure multer for file uploads
const storage = multer.memoryStorage()
const upload = multer({
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = [
      "application/pdf",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "application/msword",
    ]
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true)
    } else {
      cb(new Error("Invalid file type. Only PDF, DOC, and DOCX files are allowed."))
    }
  },
})

// Routes
app.use("/api/extract", upload.single("document"), extractRoute)
app.use("/api/process", validateGroqConfig, groqRateLimit, processRoute) // Added GROQ middleware
app.use("/api/format", formatRoute)
app.use("/api/export", exportRoute)

// Health check
app.get("/api/health", (req, res) => {
  res.json({
    status: "OK",
    message: "Research Formatter API is running",
    groqConfigured: !!process.env.GROQ_API_KEY,
  })
})

app.get("/api/groq-status", validateGroqConfig, (req, res) => {
  res.json({
    status: "configured",
    model: "llama3-70b-8192",
    rateLimit: {
      windowMs: 60000,
      maxRequests: 10,
    },
  })
})

// Error handling middleware
app.use((error, req, res, next) => {
  console.error("Error:", error)
  res.status(500).json({
    error: error.message || "Internal server error",
  })
})

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`)
  console.log(`GROQ API configured: ${!!process.env.GROQ_API_KEY}`)
})
