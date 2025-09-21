import express from "express"
import Groq from "groq-sdk"

const router = express.Router()

const getGroqClient = () => {
  if (!process.env.GROQ_API_KEY) {
    throw new Error("GROQ_API_KEY environment variable is missing or empty")
  }
  return new Groq({
    apiKey: process.env.GROQ_API_KEY,
  })
}

export const processRoute = router.post("/", async (req, res) => {
  try {
    const { text, filename } = req.body

    if (!text) {
      return res.status(400).json({ error: "No text provided for processing" })
    }

    if (!process.env.GROQ_API_KEY) {
      return res.status(500).json({ error: "GROQ API key not configured" })
    }

    console.log("[v0] Processing document with GROQ AI...")
    console.log("[v0] Document length:", text.length, "characters")
    console.log("[v0] Filename:", filename)

    const groq = getGroqClient()

    const maxTextLength = 15000 // Approximately 3000-4000 tokens
    const truncatedText = text.length > maxTextLength ? text.substring(0, maxTextLength) + "..." : text

    console.log("[v0] Using text length:", truncatedText.length, "characters")

    const prompt = `
You are an expert academic document analyzer specializing in research paper structure and content extraction. Your task is to analyze the following research paper text and extract structured information while preserving the original formatting and paragraph indentation.

CRITICAL REQUIREMENTS:
1. Preserve ALL original paragraph breaks and indentation exactly as they appear
2. Do NOT modify, summarize, or paraphrase the content - extract it as-is
3. Identify section boundaries accurately based on headings and content flow
4. Extract complete paragraphs, not fragments
5. Maintain the academic writing style and technical terminology

Please analyze and extract the following components in JSON format:

{
  "title": "Main paper title (extract exactly as written)",
  "authors": [
    {
      "name": "Full author name",
      "affiliation": "Institution/Department",
      "email": "email if provided",
      "corresponding": true/false
    }
  ],
  "abstract": {
    "heading": "Abstract heading as written",
    "content": "Complete abstract text with original formatting"
  },
  "keywords": {
    "heading": "Keywords heading as written", 
    "content": "All keywords as a single string or array"
  },
  "sections": [
    {
      "heading": "Section heading exactly as written",
      "content": "Complete section content with original paragraph breaks",
      "type": "introduction|methodology|methods|results|discussion|conclusion|literature_review|other",
      "subsections": [
        {
          "heading": "Subsection heading if any",
          "content": "Subsection content"
        }
      ]
    }
  ],
  "references": {
    "heading": "References/Bibliography heading as written",
    "content": ["Individual reference 1", "Individual reference 2", "..."]
  },
  "figures_tables": [
    {
      "type": "figure|table",
      "caption": "Caption text if found",
      "position": "approximate position in text"
    }
  ],
  "metadata": {
    "wordCount": estimated_word_count,
    "pageCount": estimated_page_count,
    "documentType": "research_paper|conference_paper|journal_article|thesis|other",
    "language": "detected language",
    "hasAbstract": true/false,
    "hasKeywords": true/false,
    "sectionCount": number_of_main_sections
  }
}

Document text to analyze:
${truncatedText}

Return ONLY the JSON object, no additional text or explanations.
`

    console.log("[v0] Making GROQ API call...")

    const completion = await Promise.race([
      groq.chat.completions.create({
        messages: [
          {
            role: "system",
            content:
              "You are a precise academic document analyzer. Extract information exactly as written, preserving all formatting and structure. Return only valid JSON.",
          },
          {
            role: "user",
            content: prompt,
          },
        ],
        model: "llama3-70b-8192",
        temperature: 0.1,
        max_tokens: 6000, // Reduced max tokens to avoid limits
      }),
      new Promise((_, reject) => setTimeout(() => reject(new Error("GROQ API timeout after 30 seconds")), 30000)),
    ])

    console.log("[v0] GROQ API call completed")

    const responseText = completion.choices[0]?.message?.content

    if (!responseText) {
      console.log("[v0] No response from GROQ API, using fallback")
      throw new Error("No response from GROQ API")
    }

    console.log("[v0] Raw GROQ response length:", responseText.length)
    console.log("[v0] Response preview:", responseText.substring(0, 200) + "...")

    let processedData
    try {
      // Clean the response - remove any markdown formatting or extra text
      let cleanedResponse = responseText.trim()

      // Remove markdown code blocks if present
      cleanedResponse = cleanedResponse.replace(/```json\s*/, "").replace(/```\s*$/, "")

      // Find JSON object boundaries
      const jsonStart = cleanedResponse.indexOf("{")
      const jsonEnd = cleanedResponse.lastIndexOf("}") + 1

      if (jsonStart === -1 || jsonEnd === 0) {
        throw new Error("No JSON object found in response")
      }

      const jsonString = cleanedResponse.substring(jsonStart, jsonEnd)
      console.log("[v0] Attempting to parse JSON...")
      processedData = JSON.parse(jsonString)

      console.log("[v0] Successfully parsed JSON response")

      // Post-process to ensure paragraph breaks are consistent
      const ensureParagraphs = (text) => {
        if (!text || typeof text !== 'string') return text;
        // Replace single newlines between paragraphs with double newlines,
        // but preserve intentional single newlines within a paragraph if possible.
        // This regex looks for a newline that is not followed by another newline.
        return text.replace(/(?<!\n)\n(?!\n)/g, '\n\n');
      };

      if (processedData.abstract) {
        processedData.abstract.content = ensureParagraphs(processedData.abstract.content);
      }
      if (processedData.sections) {
        processedData.sections.forEach(section => section.content = ensureParagraphs(section.content));
      }
    } catch (parseError) {
      console.error("[v0] JSON parsing error:", parseError.message)
      console.log("[v0] Raw response sample:", responseText.substring(0, 500) + "...")

      console.log("[v0] Using enhanced fallback processing...")
      processedData = await fallbackProcessing(text, filename)
    }

    processedData = validateAndCleanData(processedData, filename, text)

    console.log("[v0] Document processed successfully")
    console.log("[v0] Extracted sections:", processedData.sections?.length || 0)
    console.log("[v0] Extracted references:", processedData.references?.content?.length || 0)

    res.json({
      ...processedData,
      originalFilename: filename,
      processingTimestamp: new Date().toISOString(),
      processingModel: "llama3-70b-8192",
    })
  } catch (error) {
    console.error("[v0] Processing error:", error.message)
    console.error("[v0] Error stack:", error.stack)

    if (error.message.includes("API key") || error.message.includes("authentication")) {
      res.status(500).json({
        error: "GROQ API authentication failed",
        details: "Please check your GROQ API key configuration",
      })
    } else if (error.message.includes("rate limit") || error.message.includes("quota")) {
      res.status(429).json({
        error: "API rate limit exceeded",
        details: "Please try again in a few moments",
      })
    } else if (error.message.includes("timeout")) {
      res.status(408).json({
        error: "Processing timeout",
        details: "The document took too long to process. Try with a shorter document.",
      })
    } else if (error.message.includes("token")) {
      res.status(413).json({
        error: "Document too large",
        details: "The document is too large to process. Please try with a shorter document.",
      })
    } else {
      console.log("[v0] Attempting fallback processing due to error...")
      try {
        const fallbackData = await fallbackProcessing(req.body.text, req.body.filename)
        const validatedData = validateAndCleanData(fallbackData, req.body.filename, req.body.text)

        res.json({
          ...validatedData,
          originalFilename: req.body.filename,
          processingTimestamp: new Date().toISOString(),
          processingModel: "fallback",
          warning: "Processed using fallback method due to AI processing error",
        })
      } catch (fallbackError) {
        console.error("[v0] Fallback processing also failed:", fallbackError.message)
        res.status(500).json({
          error: "Failed to process document",
          details: error.message,
        })
      }
    }
  }
})

const fallbackProcessing = async (text, filename) => {
  console.log("[v0] Using enhanced fallback processing...")

  const lines = text.split("\n")
  const words = text.split(/\s+/).length

  // Better title extraction - look for the first substantial line that's not metadata
  let title = filename.replace(/\.[^/.]+$/, "")
  for (let i = 0; i < Math.min(10, lines.length); i++) {
    const line = lines[i]
    if (
      line.length > 10 &&
      line.length < 200 &&
      !line.match(/^(page|issn|doi|volume|received|accepted|published)/i) &&
      !line.match(/^\d+$/) &&
      !line.includes("@") &&
      !line.startsWith("http")
    ) {
      title = line
      break
    }
  }

  // Enhanced author extraction
  let authorsText = ""
  for (let i = 0; i < Math.min(15, lines.length); i++) {
    const line = lines[i]
    // Look for lines that might contain author names
    if (
      line.match(/^[A-Z][a-z]+ [A-Z][a-z]+/) ||
      line.match(/[A-Z]\. [A-Z][a-z]+/) ||
      line.includes("Department") ||
      line.includes("University") ||
      line.includes("School")
    ) {
      if (!authorsText.includes(line)) {
        authorsText += (authorsText ? "\n" : "") + line
      }
    }
  }

  // Enhanced DOI extraction
  let doi = ""
  let publicationInfo = null
  for (const line of lines) {
    const doiMatch = line.match(/DOI:\s*(https?:\/\/dx\.doi\.org\/)?([^\s]+)/i) || line.match(/doi\.org\/([^\s]+)/i)
    if (doiMatch) {
      doi = doiMatch[2] || doiMatch[1]
      break
    }
  }

  // Extract publication dates
  const receivedMatch = text.match(/Received:\s*([^;]+)/i)
  const acceptedMatch = text.match(/Accepted:\s*([^;]+)/i)
  const publishedMatch = text.match(/Published:\s*([^;]+)/i)

  if (doi || receivedMatch || acceptedMatch || publishedMatch) {
    publicationInfo = {
      doi: doi || "",
      received: receivedMatch ? receivedMatch[1].trim() : "",
      accepted: acceptedMatch ? acceptedMatch[1].trim() : "",
      published: publishedMatch ? publishedMatch[1].trim() : "",
    }
  }

  // Enhanced abstract extraction
  const abstract = { heading: "ABSTRACT", content: "" }
  const abstractStart = text.search(/\bABSTRACT\b/i)
  if (abstractStart !== -1) {
    const abstractSection = text.substring(abstractStart)
    const nextSectionMatch = abstractSection.search(/\b(keywords?|introduction|1\.?\s+introduction)/i)
    if (nextSectionMatch !== -1) {
      const abstractContent = abstractSection.substring(8, nextSectionMatch).trim()
      abstract.content = abstractContent
    }
  }

  // Enhanced keywords extraction
  const keywords = { heading: "Keywords", content: "" }
  const keywordsMatch = text.match(/\b(keywords?|key\s*words?):\s*([^\n\r]+)/i)
  if (keywordsMatch) {
    keywords.content = keywordsMatch[2].trim()
  }

  // Enhanced section detection with better content preservation
  const sections = []
  let currentSection = null
  let inReferences = false
  let contentBuffer = []

  for (let i = 0; i < lines.length; i++) {
    const rawLine = lines[i]
    const line = rawLine.trim()

    // Skip if we're in title/author area
    if (i < 10 && (line === title || line === authorsText)) continue

    const isTableLine = line.includes("|") || line.match(/^\s*\w+\s+\w+\s+\w+/) || line.match(/^\s*\d+\.\d+\s+\d+\.\d+/)

    // Check if line looks like a section heading
    const isHeading =
      !isTableLine &&
      line.length < 100 &&
      line.length > 3 &&
      (line.match(
        /^(introduction|methodology|methods|results|discussion|conclusion|literature\s*review|background|related\s*work|experimental|analysis|findings|limitations|future\s*work)/i,
      ) ||
        line.match(/^\d+\.?\s+[A-Z]/) ||
        line.match(/^[A-Z\s]{3,50}$/) ||
        (line.toUpperCase() === line && line.length > 3 && line.length < 50))

    // Check for references section
    if (line.match(/^(references|bibliography|works?\s*cited)/i)) {
      inReferences = true
      if (currentSection && contentBuffer.length) {
        currentSection.content = contentBuffer.join('\n').trim()
        sections.push(currentSection)
      }
      currentSection = null
      contentBuffer = []
      continue
    }

    if (isHeading && !inReferences) {
      // Save previous section
      if (currentSection && contentBuffer.length) {
        currentSection.content = contentBuffer.join('\n').trim()
        sections.push(currentSection)
      }

      // Start new section
      currentSection = {
        heading: line,
        content: "", // Content will be added from buffer
        type: detectSectionType(line),
      }
      contentBuffer = [] // Reset buffer for new section
    } else if (currentSection && !inReferences) {
      contentBuffer.push(rawLine) // Add the original line to the buffer
    }
  }

  // Add final section
  if (currentSection && contentBuffer.length) {
    currentSection.content = contentBuffer.join('\n').trim()
    sections.push(currentSection)
  }

  // Enhanced references extraction
  const references = { heading: "REFERENCES", content: [] }
  if (inReferences) {
    const referencesStart = text.search(/\b(references|bibliography|works?\s*cited)\b/i)
    if (referencesStart !== -1) {
      const referencesText = text.substring(referencesStart)
      const refLines = referencesText
        .split("\n")
        .slice(1) // Skip the "References" heading
        .filter((line) => line.trim().length > 10)
        .map((line) => line.trim())

      references.content = refLines
    }
  }

  console.log("[v0] Fallback processing completed:")
  console.log("[v0] - Title:", title)
  console.log("[v0] - Authors found:", !!authorsText)
  console.log("[v0] - DOI found:", !!doi)
  console.log("[v0] - Abstract found:", !!abstract.content)
  console.log("[v0] - Keywords found:", !!keywords.content)
  console.log("[v0] - Sections found:", sections.length)
  console.log("[v0] - References found:", references.content.length)

  return {
    title: { text: title, style: "text-align: center; font-size: 16pt; font-weight: bold; margin: 20pt 0;" },
    authors: { text: authorsText, style: "text-align: center; font-size: 12pt; margin: 10pt 0;" },
    abstract,
    keywords,
    sections,
    references,
    publicationInfo,
    header: {
      content: "INTERNATIONAL JOURNAL OF RESEARCH AND INNOVATION IN SOCIAL SCIENCE (IJRISS)",
      issn: "ISSN No. 2454-6186",
      doi: "DOI: 10.47772/IJRISS",
      volume: "Volume IX Issue VIII August 2025",
      style: "text-align: center; font-size: 10pt; font-weight: bold;",
    },
    footer: {
      content: "www.rsisinternational.org",
      style: "text-align: center; font-size: 10pt;",
    },
    metadata: {
      wordCount: words,
      pageCount: Math.ceil(words / 250),
      documentType: "research_paper",
      hasAbstract: !!abstract.content,
      hasKeywords: !!keywords.content,
      sectionCount: sections.length,
      originalFilename: filename,
    },
  }
}

const detectSectionType = (heading) => {
  const lower = heading.toLowerCase()
  if (lower.includes("introduction")) return "introduction"
  if (lower.includes("method") || lower.includes("approach")) return "methodology"
  if (lower.includes("result") || lower.includes("finding")) return "results"
  if (lower.includes("discussion") || lower.includes("analysis")) return "discussion"
  if (lower.includes("conclusion") || lower.includes("summary")) return "conclusion"
  if (lower.includes("literature") || lower.includes("review")) return "literature_review"
  return "other"
}

const validateAndCleanData = (data, filename, originalText) => {
  // Ensure required fields exist
  if (!data.title || typeof data.title !== "object") {
    data.title = { text: filename.replace(/\.[^/.]+$/, "") || "Untitled Document", style: "" }
  }

  if (!data.authors || typeof data.authors !== "object") {
    data.authors = { text: "", style: "" }
  }

  if (!data.abstract || typeof data.abstract !== "object") {
    data.abstract = { heading: "Abstract", content: "" }
  }

  if (!data.keywords || typeof data.keywords !== "object") {
    data.keywords = { heading: "Keywords", content: "" }
  }

  if (!Array.isArray(data.sections)) {
    data.sections = []
  }

  if (!data.references || typeof data.references !== "object") {
    data.references = { heading: "References", content: [] }
  }

  // Validate metadata
  if (!data.metadata || typeof data.metadata !== "object") {
    data.metadata = {}
  }

  data.metadata.wordCount = data.metadata.wordCount || originalText.split(/\s+/).length
  data.metadata.pageCount = data.metadata.pageCount || Math.ceil(data.metadata.wordCount / 250)
  data.metadata.documentType = data.metadata.documentType || "research_paper"
  data.metadata.sectionCount = data.sections.length

  // Clean section content
  data.sections = data.sections.map((section) => ({
    heading: section.heading || "Untitled Section",
    content: section.content || "",
    type: section.type || "other",
    subsections: Array.isArray(section.subsections) ? section.subsections : [],
  }))

  return data
}

export default router
