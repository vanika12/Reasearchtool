import express from "express"
import { formatToAcademicStandard } from "../utils/formatter.js"

const router = express.Router()

export const formatRoute = router.post("/", async (req, res) => {
  try {
    const { processedData } = req.body
    if (!processedData) {
      return res.status(400).json({ error: "No processed data provided" })
    }

    console.log("[v0] Applying academic formatting...")
    console.log("[v0] Processing data keys:", Object.keys(processedData))

    const formattedDocument = await formatToAcademicStandard(processedData)

    console.log("[v0] Academic formatting completed successfully")

    res.json({
      formattedDocument,
      formatApplied: "Academic Standard",
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error("[v0] Formatting error:", error.message)
    console.error("[v0] Error stack:", error.stack)
    res.status(500).json({
      error: "Failed to format document",
      details: error.message,
    })
  }
})

export default router
