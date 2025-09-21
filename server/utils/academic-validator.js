export const validateAcademicFormatting = (formattedDocument) => {
  const issues = []
  const suggestions = []

  // Check title
  if (!formattedDocument.title?.text || formattedDocument.title.text.length < 10) {
    issues.push("Title is missing or too short")
    suggestions.push("Provide a descriptive title of at least 10 characters")
  }

  // Check authors
  if (!formattedDocument.authors?.text) {
    issues.push("Author information is missing")
    suggestions.push("Add author names and affiliations")
  }

  // Check abstract
  if (!formattedDocument.abstract?.content || formattedDocument.abstract.content.length < 100) {
    issues.push("Abstract is missing or too short")
    suggestions.push("Abstract should be 250-300 words summarizing the research")
  }

  // Check sections
  const requiredSections = ["introduction", "methodology", "results", "discussion", "conclusion"]
  const presentSections = formattedDocument.sections?.map((s) => s.type.toLowerCase()) || []

  requiredSections.forEach((required) => {
    if (!presentSections.includes(required) && !presentSections.includes(required.replace("methodology", "methods"))) {
      issues.push(`Missing ${required} section`)
      suggestions.push(`Add a ${required} section to follow academic structure`)
    }
  })

  // Check references
  if (!formattedDocument.references?.content || formattedDocument.references.content.length === 0) {
    issues.push("References are missing")
    suggestions.push("Add references to support your research")
  }

  // Check word count
  const totalWords = calculateWordCount(formattedDocument)
  if (totalWords < 1000) {
    issues.push("Document appears to be too short for a research paper")
    suggestions.push("Research papers typically contain 3000+ words")
  }

  return {
    isValid: issues.length === 0,
    issues,
    suggestions,
    wordCount: totalWords,
    sectionCount: formattedDocument.sections?.length || 0,
  }
}

const calculateWordCount = (document) => {
  let wordCount = 0

  if (document.title?.text) wordCount += document.title.text.split(/\s+/).length
  if (document.abstract?.content) wordCount += document.abstract.content.split(/\s+/).length

  document.sections?.forEach((section) => {
    if (section.content) wordCount += section.content.split(/\s+/).length
    section.subsections?.forEach((sub) => {
      if (sub.content) wordCount += sub.content.split(/\s+/).length
    })
  })

  return wordCount
}

export const generateFormattingReport = (formattedDocument) => {
  const validation = validateAcademicFormatting(formattedDocument)

  return {
    ...validation,
    formatCompliance: {
      margins: "0.76in top, 0.42in bottom/left/right",
      font: "Times New Roman, 12pt",
      lineSpacing: "Single (1.0)",
      paragraphSpacing: "12pt before and after",
      headingFormat: "Bold, uppercase for main sections",
    },
    recommendations: [
      "Ensure all citations follow APA format",
      "Include DOI for all digital references",
      "Use consistent heading hierarchy",
      "Maintain justified text alignment",
      "Include page numbers in footer",
    ],
  }
}
