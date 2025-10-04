import { JSDOM } from "jsdom"

const FONT_FAMILY_TIMES = "font-family: 'Times New Roman';"
const FONT_SIZE_10 = "font-size: 10pt;"
const FONT_SIZE_12 = "font-size: 12pt;"
const FONT_SIZE_14 = "font-size: 14pt;"
const FONT_WEIGHT_BOLD = "font-weight: bold;"
const TEXT_ALIGN_CENTER = "text-align: center;"
const TEXT_ALIGN_JUSTIFY = "text-align: justify;"
const LINE_HEIGHT_1 = "line-height: 1.0;"


// Escape HTML safely inside cells
const escapeHtml = (s = "") =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

// Normalize tables to have our styling class in HTML/PDF
const normalizeTables = (html = "") => html.replace(/<table(?![^>]*class=)/gi, '<table class="journal-table"')

// Try to slice original HTML (from DOCX) into fragments per detected heading
const sliceHtmlIntoSections = (originalHtml = "", sectionHeadings = []) => {
  if (!originalHtml || !sectionHeadings.length) return {}
  const dom = new JSDOM(`<div id="root">${originalHtml}</div>`)
  const doc = dom.window.document
  const container = doc.querySelector('#root')
  if (!container) return {}
  const allNodes = Array.from(container.childNodes)
  const candidates = Array.from(container.querySelectorAll('h1,h2,h3,h4,h5,h6,p,strong,b'))
  const norm = (s) => (s || "").replace(/[\s\u00A0]+/g, ' ').trim().toLowerCase()
  const headingPositions = {}
  sectionHeadings.forEach((heading) => {
    const target = norm(heading)
    if (!target) return
    let found = null
    for (const el of candidates) {
      if (norm(el.textContent).includes(target)) { found = el; break }
    }
    if (found) {
      let node = found
      while (node && node.parentNode !== container) node = node.parentNode
      if (node) {
        const idx = allNodes.indexOf(node)
        if (idx >= 0) headingPositions[heading] = idx
      }
    }
  })
  const ordered = sectionHeadings.filter(h => headingPositions[h] !== undefined).sort((a,b)=>headingPositions[a]-headingPositions[b])
  const out = {}
  for (let i=0;i<ordered.length;i++) {
    const h = ordered[i]
    const start = headingPositions[h]
    const end = i+1<ordered.length ? headingPositions[ordered[i+1]] : allNodes.length
    const frag = allNodes.slice(start, end).map(n=>n.outerHTML||n.textContent||"").join("")
    out[h] = normalizeTables(frag)
  }
  return out
}

// Remove stray short lines immediately before the first table in a section
const cleanHtmlBeforeTable = (html = "") => {
  try {
    const dom = new JSDOM(`<div id="root">${html}</div>`)
    const root = dom.window.document.querySelector('#root')
    const table = root?.querySelector('table')
    if (!table) return html

    const isShort = (s) => {
      const t = (s || '').replace(/\s+/g, ' ').trim()
      if (!t) return true
      if (/^(table|figure)\b/i.test(t)) return false
      if (/^source\b/i.test(t)) return false
      return t.length <= 50
    }

    let node = table.previousSibling
    while (node) {
      const prev = node.previousSibling
      if (node.nodeType === 1 || node.nodeType === 3) {
        const txt = node.textContent || ''
        if (isShort(txt)) {
          node.parentNode?.removeChild(node)
          node = prev
          continue
        }
      }
      break
    }

    return root.innerHTML
  } catch {
    return html
  }
}

// New centralized function to format raw text content into final HTML
const formatContentToHtml = (text) => {
  if (!text) return "";

  // This logic was previously in exporter.js. It correctly handles paragraphs and tables.
  const contentWithTables = formatTablesAndFigures(text);
  const blocks = contentWithTables.split(/\n\s*\n/);

  return blocks.map(block => {
    const trimmedBlock = applyLatexFormatting(formatCitations(block.trim()));
    if (!trimmedBlock) return "";

    // Don't wrap existing block elements like tables in a <p> tag
    if (trimmedBlock.startsWith('<table') || trimmedBlock.startsWith('<div')) return trimmedBlock;
    return `<p>${trimmedBlock}</p>`;
  }).join("");
};

export const formatToAcademicStandard = async (processedData) => {
  try {
    console.log("[v0] Starting academic formatting...")
    console.log("[v0] Input data structure:", Object.keys(processedData))

    const title = processedData.title?.text || processedData.title || "Untitled Research Paper"
    const authors = processedData.authors?.text || processedData.authors || ""
    const abstract = processedData.abstract || { heading: "ABSTRACT", content: "" }
    const keywords = processedData.keywords || { heading: "Keywords", content: "" }
    const sections = processedData.sections || []
    const references = processedData.references || { heading: "REFERENCES", content: [] }
    const metadata = processedData.metadata || {}
    const originalFilename = processedData.originalFilename || "document"
    const publicationInfo = processedData.publicationInfo || null
    const originalHtml = processedData.originalHtml || null

    console.log("[v0] Extracted title:", title)
    console.log("[v0] Extracted authors:", authors)
    console.log("[v0] Sections count:", sections.length)
     

        console.log("[v0] Sections count:", sections.length)

    const parseAuthorsAndAffiliations = (authorText) => {
      if (!authorText || typeof authorText !== "string") return { authors: "", affiliations: [] }

      const lines = authorText
        .split("\n")
        .map((l) => l.trim())
        .filter((l) => l)

      const authorLines = []
      const affiliationLines = []

      let contentStarted = false
      for (const line of lines) {
        // Heuristic: A long line with spaces is likely the start of the abstract.
        if (line.length > 150 && line.includes(" ")) {
          contentStarted = true
        }

        // Heuristic: Abstract often starts with "abstract" or "keywords".
        if (line.toLowerCase().startsWith("abstract") || line.toLowerCase().startsWith("keywords")) {
          contentStarted = true
        }

        if (contentStarted) {
          break // Stop processing at the beginning of the abstract
        }

        // Heuristic: Affiliations contain keywords.
        if (line.match(/department|school|university|college|institute|@/i)) {
          affiliationLines.push(line)
        } else {
          // Otherwise, assume it's part of the author list.
          if (line.length < 150) {
            authorLines.push(line)
          }
        }
      }

      // Join authors with a comma, and remove any trailing comma.
      const authors = authorLines.join(", ").replace(/,$/, "").trim()

      // Process unique affiliations
      const uniqueAffiliations = [...new Set(affiliationLines)]
      const affiliations = uniqueAffiliations.map((aff, index) => ({
        number: index + 1,
        text: aff,
        style: `${FONT_SIZE_12} ${FONT_FAMILY_TIMES} ${TEXT_ALIGN_CENTER} margin-bottom: 6pt;`,
      }))
      return { authors, affiliations }
    }



    // const parseAuthorsAndAffiliations = (authorText) => {
    //   if (!authorText) return { authors: "", affiliations: [] }

    //   // Split by common patterns that indicate affiliation
    //   const lines = authorText.split(/\n|Department|School|University|College|Institute/).filter((line) => line.trim())

    //   if (lines.length === 1) {
    //     // Single line - likely just authors
    //     return { authors: lines[0].trim(), affiliations: [] }
    //   }

    //   // First line is usually authors, rest are affiliations
    //   const authors = lines[0].trim()
    //   const affiliations = lines
    //     .slice(1)
    //     .map((line) => line.trim())
    //     .filter((line) => line.length > 0)
    //     .map((aff, index) => ({
    //       number: index + 1,
    //       text: aff.startsWith("Department") || aff.startsWith("School") ? aff : `Department ${aff}`,
    //       style: `${FONT_SIZE_12} ${FONT_FAMILY_TIMES} ${TEXT_ALIGN_CENTER} margin-bottom: 6pt;`,
    //     }))

    //   return { authors, affiliations }
    // }

    const { authors: parsedAuthors, affiliations: parsedAffiliations } = parseAuthorsAndAffiliations(authors)

    // Academic formatting specifications from the requirements
    const formatSpecs = {
      pageSize: "A4",
      margins: {
        top: "0.76in",
        bottom: "0.42in",
        left: "0.42in",
        right: "0.42in",
      },
      font: {
        family: "Times New Roman",
        size: "12pt",
        lineHeight: "1.0",
      },
      spacing: {
        paragraph: "12pt",
      },
      header: {
        distance: "0.24in",
        content: "INTERNATIONAL JOURNAL OF RESEARCH AND INNOVATION IN SOCIAL SCIENCE (IJRISS)",
        issn: "ISSN No. 2454-6186",
        doi: "DOI: 10.47772/IJRISS",
        volume: "Volume IX Issue VIII August 2025",
      },
      footer: {
        distance: "0.28in",
      },
    }

    const formatAuthors = (authorsList) => {
      if (!authorsList) return ""

      // Handle string format
      if (typeof authorsList === "string") {
        return authorsList
      }

      // Handle array format
      if (Array.isArray(authorsList)) {
        return authorsList
          .map((author, index) => {
            if (typeof author === "string") {
              return author
            }

            let authorText = author.name || `Author ${index + 1}`

            // Add superscript numbers for affiliations
            if (author.affiliation) {
              authorText += `¹`
            }

            // Mark corresponding author with asterisk
            if (author.corresponding) {
              authorText += "*"
            }

            return authorText
          })
          .join(", ")
      }

      return String(authorsList)
    }

    const formatSections = (sectionsList) => {
      if (!sectionsList || sectionsList.length === 0) return []

      const htmlSlices = originalHtml
        ? sliceHtmlIntoSections(
            originalHtml,
            sectionsList.map((s) => s.heading || ""),
          )
        : {}

      return sectionsList.map((section) => {
        const sectionType = section.type?.toLowerCase() || "other"
        const heading = section.heading || "Untitled Section"
        let htmlContent = htmlSlices[heading]
        let rawContent = (section.content || "").trim();

        // Universal duplicate heading removal logic
        const norm = (s) => (s || "").replace(/<[^>]+>|[*_~`#\d.\s]/g, "").toLowerCase();
        const normalizedHeading = norm(heading);

        if (htmlContent) {
            // If we have HTML content, parse it and remove the first element if it's the heading
            try {
                const dom = new JSDOM(`<div>${htmlContent}</div>`);
                const container = dom.window.document.body.firstChild;
                const firstElement = container.firstElementChild;
                if (firstElement && norm(firstElement.textContent) === normalizedHeading) {
                    firstElement.remove();
                    htmlContent = container.innerHTML; // Update htmlContent with the change
                }
            } catch (e) { /* ignore parsing errors */ }
        } else {
            // If we have raw text, check the first line
            const contentLines = rawContent.split('\n');
            const firstLine = (contentLines[0] || '').trim();
            if (contentLines.length > 0 && norm(firstLine) === normalizedHeading) {
                rawContent = contentLines.slice(1).join('\n').trim();
            }
        }

        const content = htmlContent
          ? cleanHtmlBeforeTable(htmlContent)
          : formatContentToHtml(rawContent)

        return {
          heading,
          content,
          type: sectionType,
          formatting: {
            headingStyle: getHeadingStyle(sectionType),
            contentStyle: `${FONT_SIZE_12} ${FONT_FAMILY_TIMES} ${LINE_HEIGHT_1} ${TEXT_ALIGN_JUSTIFY} margin-bottom: 12pt;`,
          },
          subsections:
            section.subsections?.map((sub) => ({
              heading: sub.heading,
              content: formatContentToHtml(sub.content || ""),
              formatting: {
                headingStyle: `${FONT_SIZE_12} ${FONT_WEIGHT_BOLD} ${FONT_FAMILY_TIMES} margin-top: 12pt; margin-bottom: 6pt;`,
                contentStyle: `${FONT_SIZE_12} ${FONT_FAMILY_TIMES} ${LINE_HEIGHT_1} ${TEXT_ALIGN_JUSTIFY} margin-bottom: 12pt;`,
              },
            })) || [],
        }
      })
    }

    const getHeadingStyle = (sectionType) => {
      const mainSections = [
        "introduction",
        "methodology",
        "methods",
        "results",
        "discussion",
        "conclusion",
        "abstract",
        "references",
      ]

      if (mainSections.includes(sectionType)) {
        return `${FONT_SIZE_14} ${FONT_WEIGHT_BOLD} text-transform: uppercase; ${FONT_FAMILY_TIMES} text-align: left; margin-top: 20pt; margin-bottom: 10pt;`
      }
      return `${FONT_SIZE_12} ${FONT_WEIGHT_BOLD} ${FONT_FAMILY_TIMES} text-align: left; margin-top: 12pt; margin-bottom: 6pt;`
    }

    const formatReferences = (referencesList) => {
      if (!referencesList) return []

      // Handle object with content property
      let refsToProcess = referencesList

      if (typeof referencesList === "object" && referencesList.content) {
        refsToProcess = referencesList.content
      }

      if (Array.isArray(refsToProcess)) {
        return refsToProcess
          .map((ref) => {
            // Handle object references properly
            if (typeof ref === "object" && ref !== null) {
              return ref.text || ref.content || JSON.stringify(ref)
            }
            return String(ref)
          })
          .filter((ref) => ref && ref.trim().length > 10 && !ref.includes("[object Object]"))
          .map((ref, index) => ({
            number: index + 1,
            text: ref.trim(),
            style: `${FONT_SIZE_12} ${FONT_FAMILY_TIMES} ${LINE_HEIGHT_1} ${TEXT_ALIGN_JUSTIFY} margin-bottom: 6pt; text-indent: -0.5in; padding-left: 0.5in;`,
          }))
      }

      // If it's a string, split by common reference separators
      if (typeof refsToProcess === "string" && refsToProcess.trim().length > 0) {
        return refsToProcess
          .split(/\n|\d+\./)
          .filter((ref) => ref.trim().length > 10)
          .map((ref, index) => ({
            number: index + 1,
            text: ref.trim(),
            style: `${FONT_SIZE_12} ${FONT_FAMILY_TIMES} ${LINE_HEIGHT_1} ${TEXT_ALIGN_JUSTIFY} margin-bottom: 6pt; text-indent: -0.5in; padding-left: 0.5in;`,
          }))
      }

      return []
    }

    // Fix 2: Clean up references duplicated in the last section's content
    const formattedSections = formatSections(sections)
    const formattedReferences = formatReferences(references)

    if (formattedSections.length > 0 && formattedReferences.length > 0) {
      const lastSection = formattedSections[formattedSections.length - 1]
      const refHeading = references?.heading || "REFERENCES"
      const refHeadingIndex = lastSection.content.toLowerCase().indexOf(refHeading.toLowerCase())

      if (refHeadingIndex !== -1) {
        lastSection.content = lastSection.content.substring(0, refHeadingIndex)
      }
    }

    const formatAffiliations = (authorsList) => {
      if (!authorsList || !Array.isArray(authorsList)) return []

      const affiliations = []
      const uniqueAffiliations = new Set()

      authorsList.forEach((author) => {
        if (typeof author === "object" && author.affiliation && !uniqueAffiliations.has(author.affiliation)) {
          uniqueAffiliations.add(author.affiliation)
          affiliations.push({
            number: affiliations.length + 1,
            text: author.affiliation,
            style: `${FONT_SIZE_12} ${FONT_FAMILY_TIMES} ${TEXT_ALIGN_CENTER} margin-bottom: 6pt;`,
          })
        }
      })

      return affiliations
    }




    const cleanAbstractContent = (abstractContent) => {
      if (!abstractContent) return ""

      const cleaned = abstractContent
        // Remove department/affiliation text that got mixed in
        .replace(/Department.*?Kenya/gi, "")
        // Remove date patterns
        .replace(/\b\d{1,2}\s+(July|August|September|October|November|December)\s+\d{4}/gi, "")
        // Remove author names that got mixed in
        .replace(/Nancy Njeri Mungai.*?Yusuf Kibet/gi, "")
        // Remove DOI patterns
        .replace(/DOI:.*?(?=\n|$)/gi, "")
        // Remove publication info patterns
        .replace(/Received:.*?Published:.*?(?=\n|$)/gi, "")
        // .replace(/^(Department|School|University|College|Institute).*?(?=This paper|The study|This research)/s, "")
        // Remove duplicate abstract content that appears after title
        // Remove duplicated abstract that appears before the actual ABSTRACT heading
        .replace(/^Department.*?(?=ABSTRACT)/is, "")


        .trim()

      // Validate abstract content
      if (
        cleaned.length < 100 ||
        cleaned.match(/^[a-z]{1,5}$/i) ||
        cleaned === "hn" ||
        cleaned.includes("[object Object]")
      ) {
        return ""
      }

      return cleaned
    }

    // Create formatted document structure
    // If slicing failed to produce any HTML content for sections, keep a full HTML body fallback
    const sliceHitCount = sections.filter(s => {
      const h = s.heading || ""
      const m = originalHtml ? sliceHtmlIntoSections(originalHtml, [h]) : {}
      return m[h]
    }).length

    const fullHtmlBody = originalHtml && sliceHitCount === 0 ? normalizeTables(originalHtml) : null

    const formattedDocument = {
      metadata: {
        ...metadata,
        formatSpecs,
        formattedAt: new Date().toISOString(),
        originalFilename,
        formatting: "Academic Standard - IJRISS Template",
      },
      header: {
        content: formatSpecs.header.content,
        issn: formatSpecs.header.issn,
        doi: formatSpecs.header.doi,
        volume: formatSpecs.header.volume,
        editable: true,
        style: `${TEXT_ALIGN_CENTER} ${FONT_SIZE_10} ${FONT_FAMILY_TIMES} ${FONT_WEIGHT_BOLD} border-bottom: 1px solid #000; padding-bottom: 10pt; margin-bottom: 20pt;`,
      },
      title: {
        text: title,
        style: `font-size: 18pt; ${FONT_WEIGHT_BOLD} ${TEXT_ALIGN_CENTER} ${FONT_FAMILY_TIMES} margin: 20pt 0; line-height: 1.2;`,
      },
      authors: {
        text: formatAuthors(parsedAuthors),
        style: `${FONT_SIZE_12} ${FONT_WEIGHT_BOLD} ${TEXT_ALIGN_CENTER} ${FONT_FAMILY_TIMES} margin: 10pt 0;`,
      },
      affiliations: parsedAffiliations,
      abstract: {
        heading: abstract?.heading || "ABSTRACT",
        content: cleanAbstractContent(abstract?.content || ""),
        style: {
          heading: `${FONT_SIZE_14} ${FONT_WEIGHT_BOLD} text-transform: uppercase; ${FONT_FAMILY_TIMES} text-align: left; margin-top: 20pt; margin-bottom: 10pt;`,
          content: `${FONT_SIZE_12} ${FONT_FAMILY_TIMES} ${LINE_HEIGHT_1} ${TEXT_ALIGN_JUSTIFY} margin-bottom: 15pt;`,
        },
      },
      keywords: {
        heading: keywords?.heading || "Keywords",
        content: Array.isArray(keywords?.content) ? keywords.content.join(", ") : keywords?.content || "",
        style: {
          heading: `${FONT_SIZE_12} ${FONT_WEIGHT_BOLD} ${FONT_FAMILY_TIMES} display: inline; margin-right: 5pt;`,
          content: `${FONT_SIZE_12} ${FONT_FAMILY_TIMES} font-style: italic; display: inline;`,
        },
      },
      sections: formattedSections, // Use the cleaned sections
      htmlBody: fullHtmlBody, // fallback raw HTML body (from DOCX) preserving tables and images
      references: {
        heading: references?.heading || "REFERENCES",
        content: formatReferences(references),
        style: {
          heading: `${FONT_SIZE_14} ${FONT_WEIGHT_BOLD} text-transform: uppercase; ${FONT_FAMILY_TIMES} text-align: left; margin-top: 20pt; margin-bottom: 10pt;`,
          content: `${FONT_SIZE_12} ${FONT_FAMILY_TIMES} ${LINE_HEIGHT_1}`,
        },
      },
      footer: {
        content: `Page {pageNumber}                                                    www.rsisinternational.org`,
        style: `${FONT_SIZE_10} ${FONT_FAMILY_TIMES} ${TEXT_ALIGN_CENTER} border-top: 1px solid #000; padding-top: 5pt ; margin-top: 5pt;`,
      },
      publicationInfo: publicationInfo || {
        doi: `https://dx.doi.org/10.47772/IJRISS.2025.908000330`,
        received: "29 July 2025",
        accepted: "08 August 2025",
        published: "09 September 2025",
        style: `${FONT_SIZE_12} ${FONT_FAMILY_TIMES} ${TEXT_ALIGN_CENTER} margin: 15pt 0;`,
      },
    }

    console.log("[v0] Academic formatting completed successfully")
    return formattedDocument
  } catch (error) {
    console.error("[v0] Formatting error:", error.message)
    throw new Error(`Academic formatting failed: ${error.message}`)
  }
}

export const applyLatexFormatting = (content) => {
  if (!content) return ""

  return (
    content
      // Preserve paragraph indentation
      .replace(/^\s+/gm, (match) => "&nbsp;".repeat(match.length))
      // Handle citations
      .replace(/\[(\d+)\]/g, "<sup>$1</sup>")
      // Handle emphasis
      .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
      .replace(/\*(.*?)\*/g, "<em>$1</em>")
      // Handle equations (basic)
      .replace(/\$\$(.*?)\$\$/g, '<div class="equation">$1</div>')
      .replace(/\$(.*?)\$/g, '<span class="inline-equation">$1</span>')
  )
}

export const formatCitations = (content) => {
  if (!content) return ""

  // Convert various citation formats to numbered format
  return content
    .replace(/$$([^)]+),\s*(\d{4})$$/g, "[$1, $2]") // (Author, Year) -> [Author, Year]
    .replace(/([A-Z][a-z]+\s+et\s+al\.,?\s*\d{4})/g, "[$1]") // Author et al., Year -> [Author et al., Year]
}

export const formatTablesAndFigures = (content) => {
  if (!content) return "";

  // Detect table-like blocks (multiple lines with tabs or 2+ spaces)
  const blocks = content.split(/\n\s*\n/);
  const converted = blocks.map((block) => {
    // Markdown pipe table | A | B |
    if (/^\s*\|.+\|\s*$/m.test(block)) {
      const rows = block
        .trim()
        .split(/\n/)
        .map((l) =>
          l
            .split("|")
            .map((c) => c.trim())
            .filter(Boolean)
        );
      let html = '<table class="journal-table"><thead><tr>';
      html += rows[0].map((h) => `<th>${escapeHtml(h)}</th>`).join("");
      html += "</tr></thead><tbody>";
      rows.slice(1).forEach((r) => {
        html += "<tr>" + r.map((c) => `<td>${escapeHtml(c)}</td>`).join("") + "</tr>";
      });
      html += "</tbody></table>";
      return html;
    }

    // Key/Value pairs
    const lines = block.split(/\n/).map((l) => l.trim()).filter(Boolean);
    if (lines.length > 2 && lines.length % 2 === 0) {
      return (
        '<table class="journal-table"><tbody>' +
        lines
          .map((l, i) =>
            i % 2 === 0
              ? `<tr><td class="kv-key">${escapeHtml(l)}</td>`
              : `<td class="kv-val">${escapeHtml(l)}</td></tr>`
          )
          .join("") +
        "</tbody></table>"
      );
    }

    return block;
  });

  let out = converted.join("\n\n");

  // Captions
  out = out
    .replace(/(Table\s+\d+[:.]\s*[^\n]+)/gi, '<div class="table-caption">$1</div>')
    .replace(/(Figure\s+\d+[:.]\s*[^\n]+)/gi, '<div class="figure-caption">$1</div>');

  return out;
}


// export const formatTablesAndFigures = (content) => {
//   if (!content) return ""

//   return content
//     .replace(/(Table\s+\d+[:.]\s*[^\n]+)/gi, '<div class="table-caption">$1</div>')
//     .replace(/(Figure\s+\d+[:.]\s*[^\n]+)/gi, '<div class="figure-caption">$1</div>')
// }
