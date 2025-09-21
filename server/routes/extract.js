import express from "express"
import mammoth from "mammoth"
import { createRequire } from "module"

const require = createRequire(import.meta.url)
const router = express.Router()

export const extractRoute = router.post("/", async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded" })
    }

    const { buffer, mimetype, originalname } = req.file
    let extractedText = ""

    console.log(`Processing file: ${originalname} (${mimetype})`)

    if (mimetype === "application/pdf") {
      try {
        const pdfParse = require("pdf-parse")
        const pdfData = await pdfParse(buffer)
        extractedText = pdfData.text
      } catch (pdfError) {
        console.error("PDF parsing error:", pdfError)
        return res.status(500).json({
          error: "Failed to parse PDF. Please try converting to DOCX format.",
        })
      }
    } else if (
      mimetype === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
      mimetype === "application/msword"
    ) {
      // Extract text from DOCX/DOC
      const result = await mammoth.extractRawText({ buffer })
      extractedText = result.value
    } else {
      return res.status(400).json({ error: "Unsupported file type" })
    }

    if (!extractedText.trim()) {
      return res.status(400).json({ error: "No text could be extracted from the document" })
    }

    console.log(`Extracted ${extractedText.length} characters`)

    res.json({
      text: extractedText,
      filename: originalname,
      fileType: mimetype,
      wordCount: extractedText.split(/\s+/).length,
    })
  } catch (error) {
    console.error("Text extraction error:", error)
    res.status(500).json({ error: "Failed to extract text from document" })
  }
})
