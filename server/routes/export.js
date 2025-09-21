import express from "express"
import {
  exportToHTML,
  exportToPDF,
  exportToLatex,
  exportToDocx,
  validateExport,
} from "../utils/exporter.js"
import { generateFormattingReport } from "../utils/academic-validator.js"

const router = express.Router()

export const exportRoute = router.post("/", async (req, res) => {
  try {
    const { formattedDocument, format, filename, includeReport } = req.body

    if (!formattedDocument || !format) {
      return res.status(400).json({ error: "Missing required parameters" })
    }

    console.log(`[v0] Exporting document to ${format.toUpperCase()}...`)
    console.log(`[v0] Document title:`, formattedDocument.title?.text || "No title")

    validateExport(format, formattedDocument)

    let exportedContent
    let contentType
    let fileExtension

    switch (format.toLowerCase()) {
      case "html":
        exportedContent = await exportToHTML(formattedDocument)
        contentType = "text/html"
        fileExtension = "html"
        break

      case "pdf":
        console.log("[v0] Starting PDF export...")
        exportedContent = await exportToPDF(formattedDocument)
        contentType = "application/pdf"
        fileExtension = "pdf"
        console.log("[v0] PDF export completed")
        break

      case "latex":
        exportedContent = await exportToLatex(formattedDocument)
        contentType = "application/x-latex"
        fileExtension = "tex"
        break

      case "docx":
        exportedContent = await exportToDocx(formattedDocument)
        contentType = "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
        fileExtension = "docx"
        break

      default:
        return res.status(400).json({ error: "Unsupported export format" })
    }

    const exportFilename = `${filename || "formatted-document"}.${fileExtension}`

    let formattingReport = null
    if (includeReport) {
      formattingReport = generateFormattingReport(formattedDocument)
    }

    if (format.toLowerCase() === "pdf" || format.toLowerCase() === "docx") {
      if (!exportedContent || exportedContent.length === 0) {
        throw new Error(`${format.toUpperCase()} generation resulted in an empty file`)
      }

      res.setHeader("Content-Type", contentType)
      res.setHeader("Content-Disposition", `attachment; filename="${exportFilename}"`)
      res.setHeader("Content-Length", exportedContent.length)
      if (formattingReport) {
        res.setHeader("X-Formatting-Report", JSON.stringify(formattingReport))
      }
      // res.send(exportedContent)// change1
      res.end(exportedContent)
    } else {
      // For other formats, send as JSON with content
      res.json({
        content: exportedContent,
        filename: exportFilename,
        contentType,
        size: Buffer.byteLength(exportedContent, "utf8"),
        formattingReport,
        exportedAt: new Date().toISOString(),
        format: format.toLowerCase(),
      })
    }

    console.log(`[v0] Successfully exported ${exportFilename}`)
  } catch (error) {
    console.error("[v0] Export error:", error.message)
    console.error("[v0] Error stack:", error.stack)
    res.status(500).json({
      error: "Failed to export document",
      details: error.message,
    })
  }
})

router.post("/preview", async (req, res) => {
  try {
    const { formattedDocument, format } = req.body

    if (!formattedDocument || !format) {
      return res.status(400).json({ error: "Missing required parameters" })
    }

    let previewContent = ""

    switch (format.toLowerCase()) {
      case "html":
        previewContent = await exportToHTML(formattedDocument)
        break
      case "latex":
        previewContent = await exportToLatex(formattedDocument)
        break
      default:
        return res.status(400).json({ error: "Preview not available for this format" })
    }

    res.json({
      preview: previewContent.substring(0, 5000), // First 5000 characters
      fullLength: previewContent.length,
      format: format.toLowerCase(),
    })
  } catch (error) {
    console.error("Preview error:", error)
    res.status(500).json({
      error: "Failed to generate preview",
      details: error.message,
    })
  }
})

router.post("/batch", async (req, res) => {
  try {
    const { formattedDocument, formats, filename } = req.body

    if (!formattedDocument || !formats || !Array.isArray(formats)) {
      return res.status(400).json({ error: "Missing required parameters" })
    }

    const exports = []

    for (const format of formats) {
      try {
        let exportedContent
        let contentType
        let fileExtension

        switch (format.toLowerCase()) {
          case "html":
            exportedContent = await exportToHTML(formattedDocument)
            contentType = "text/html"
            fileExtension = "html"
            break
          case "latex":
            exportedContent = await exportToLatex(formattedDocument)
            contentType = "application/x-latex"
            fileExtension = "tex"
            break
          default:
            continue
        }

        exports.push({
          format: format.toLowerCase(),
          content: exportedContent,
          filename: `${filename || "formatted-document"}.${fileExtension}`,
          contentType,
          size: Buffer.byteLength(exportedContent, "utf8"),
        })
      } catch (error) {
        console.error(`Error exporting ${format}:`, error)
      }
    }

    res.json({
      exports,
      exportedAt: new Date().toISOString(),
      totalFormats: exports.length,
    })
  } catch (error) {
    console.error("Batch export error:", error)
    res.status(500).json({
      error: "Failed to perform batch export",
      details: error.message,
    })
  }
})
