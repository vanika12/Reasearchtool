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
    let extractedHtml = ""

    console.log(`Processing file: ${originalname} (${mimetype})`)

    if (mimetype === "application/pdf") {
      try {
        const pdfParse = require("pdf-parse")
        const pdfData = await pdfParse(buffer)
        extractedText = pdfData.text
        extractedHtml = ""
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
      // Extract raw text and rich HTML from DOCX/DOC
      const [textResult, htmlResult] = await Promise.all([
        mammoth.extractRawText({ buffer }),
        mammoth.convertToHtml({ buffer }, {
          convertImage: mammoth.images.inline(async (element) => {
            const contentType = element.contentType
            const data = await element.read("base64")
            return { src: `data:${contentType};base64,${data}` }
          }),
        }),
      ])
      extractedText = textResult.value || ""
      extractedHtml = htmlResult.value || ""
    } else {
      return res.status(400).json({ error: "Unsupported file type" })
    }

    if (!extractedText.trim() && !extractedHtml.trim()) {
      return res.status(400).json({ error: "No content could be extracted from the document" })
    }

    console.log(`Extracted text length: ${extractedText.length}; HTML length: ${extractedHtml.length}`)

    res.json({
      text: extractedText,
      html: extractedHtml,
      filename: originalname,
      fileType: mimetype,
      wordCount: extractedText ? extractedText.split(/\s+/).length : 0,
    })
  } catch (error) {
    console.error("Text extraction error:", error)
    res.status(500).json({ error: "Failed to extract text from document" })
  }
})
