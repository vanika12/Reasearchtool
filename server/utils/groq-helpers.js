import Groq from "groq-sdk"

const getGroqClient = () => {
  if (!process.env.GROQ_API_KEY) {
    throw new Error("GROQ_API_KEY environment variable is missing or empty")
  }
  return new Groq({
    apiKey: process.env.GROQ_API_KEY,
  })
}

export const analyzeDocumentStructure = async (text) => {
  const prompt = `
Analyze this research paper text and identify its structural components. Focus on:

1. Document sections and their boundaries
2. Heading hierarchy and formatting
3. Content organization patterns
4. Citation and reference patterns

Text to analyze:
${text.substring(0, 2000)}...

Return a JSON object with structural analysis:
{
  "documentStructure": {
    "hasAbstract": boolean,
    "hasKeywords": boolean,
    "mainSections": ["section1", "section2"],
    "citationStyle": "APA|MLA|Chicago|IEEE|other",
    "headingPattern": "description of heading format"
  }
}
`

  try {
    const groq = getGroqClient()

    const completion = await groq.chat.completions.create({
      messages: [{ role: "user", content: prompt }],
      model: "llama3-8b-8192",
      temperature: 0.1,
      max_tokens: 1000,
    })

    return JSON.parse(completion.choices[0]?.message?.content || "{}")
  } catch (error) {
    console.error("Structure analysis error:", error)
    return null
  }
}

export const extractSpecificSection = async (text, sectionType) => {
  const prompt = `
Extract the ${sectionType} section from this research paper text. 
Preserve the exact formatting and content.

Text:
${text}

Return only the ${sectionType} content, maintaining original formatting.
`

  try {
    const groq = getGroqClient()

    const completion = await groq.chat.completions.create({
      messages: [{ role: "user", content: prompt }],
      model: "llama3-8b-8192",
      temperature: 0.1,
      max_tokens: 2000,
    })

    return completion.choices[0]?.message?.content || ""
  } catch (error) {
    console.error(`${sectionType} extraction error:`, error)
    return ""
  }
}

export const validateExtractedData = async (extractedData, originalText) => {
  const prompt = `
Review this extracted data from a research paper and identify any issues:

Original text length: ${originalText.length} characters
Extracted data: ${JSON.stringify(extractedData, null, 2)}

Check for:
1. Missing important sections
2. Incorrectly categorized content
3. Truncated or incomplete extractions
4. Formatting issues

Return suggestions for improvement as JSON:
{
  "issues": ["issue1", "issue2"],
  "suggestions": ["suggestion1", "suggestion2"],
  "confidence": 0.0-1.0
}
`

  try {
    const groq = getGroqClient()

    const completion = await groq.chat.completions.create({
      messages: [{ role: "user", content: prompt }],
      model: "llama3-8b-8192",
      temperature: 0.2,
      max_tokens: 1000,
    })

    return JSON.parse(completion.choices[0]?.message?.content || "{}")
  } catch (error) {
    console.error("Validation error:", error)
    return { issues: [], suggestions: [], confidence: 0.5 }
  }
}
