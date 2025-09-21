export const groqRateLimit = (req, res, next) => {
  // Simple rate limiting for GROQ API calls
  const now = Date.now()
  const windowMs = 60 * 1000 // 1 minute
  const maxRequests = 10

  if (!req.session) {
    req.session = {}
  }

  if (!req.session.groqRequests) {
    req.session.groqRequests = []
  }

  // Clean old requests
  req.session.groqRequests = req.session.groqRequests.filter((timestamp) => now - timestamp < windowMs)

  if (req.session.groqRequests.length >= maxRequests) {
    return res.status(429).json({
      error: "Rate limit exceeded",
      details: "Too many AI processing requests. Please wait a moment.",
    })
  }

  req.session.groqRequests.push(now)
  next()
}

export const validateGroqConfig = (req, res, next) => {
  if (!process.env.GROQ_API_KEY) {
    return res.status(500).json({
      error: "GROQ API not configured",
      details: "Please set GROQ_API_KEY environment variable",
    })
  }
  next()
}
