export const convertToLatexStructure = (formattedDocument) => {
  const { title, authors, abstract, keywords, sections, references, affiliations } = formattedDocument

  const latexDocument = {
    documentClass: "article",
    packages: ["geometry", "times", "setspace", "fancyhdr", "graphicx", "amsmath", "cite"],
    geometry: {
      paper: "a4paper",
      top: "0.76in",
      bottom: "0.42in",
      left: "0.42in",
      right: "0.42in",
    },
    header: generateLatexHeader(formattedDocument.header),
    title: generateLatexTitle(title, authors, affiliations),
    abstract: generateLatexAbstract(abstract, keywords),
    body: generateLatexBody(sections),
    references: generateLatexReferences(references),
  }

  return latexDocument
}

const generateLatexHeader = (headerData) => {
  return `
\\fancypagestyle{firstpage}{
  \\fancyhf{}
  \\fancyhead[C]{\\fontsize{10}{12}\\selectfont\\textbf{${headerData.content}}\\\\
  ${headerData.issn} | ${headerData.doi} | ${headerData.volume}}
  \\renewcommand{\\headrulewidth}{1pt}
}
\\fancypagestyle{plain}{
  \\fancyhf{}
  \\fancyfoot[C]{\\fontsize{10}{12}\\selectfont Page \\thepage \\hfill www.rsisinternational.org}
  \\renewcommand{\\footrulewidth}{1pt}
}
`
}

const generateLatexTitle = (titleData, authorsData, affiliations) => {
  let titleSection = `
\\title{\\fontsize{18}{22}\\selectfont\\textbf{${titleData.text}}}
`

  if (authorsData.text) {
    titleSection += `
\\author{\\fontsize{12}{14}\\selectfont\\textbf{${authorsData.text}}}
`
  }

  if (affiliations && affiliations.length > 0) {
    const affiliationText = affiliations.map((aff, index) => `\\textsuperscript{${aff.number}}${aff.text}`).join("\\\\")

    titleSection += `
\\date{\\fontsize{12}{14}\\selectfont ${affiliationText}}
`
  } else {
    titleSection += `\\date{}`
  }

  return titleSection
}

const generateLatexAbstract = (abstractData, keywordsData) => {
  let abstractSection = ""

  if (abstractData.content) {
    abstractSection = `
\\begin{abstract}
\\noindent\\textbf{\\MakeUppercase{${abstractData.heading}}}\\\\[10pt]
${abstractData.content}
\\end{abstract}
`
  }

  if (keywordsData.content) {
    abstractSection += `
\\noindent\\textbf{${keywordsData.heading}:} \\textit{${keywordsData.content}}\\\\[15pt]
`
  }

  return abstractSection
}

const generateLatexBody = (sections) => {
  if (!sections || sections.length === 0) return ""

  return sections
    .map((section) => {
      let sectionLatex = ""

      // Main section heading
      if (["introduction", "methodology", "methods", "results", "discussion", "conclusion"].includes(section.type)) {
        sectionLatex += `\\section*{\\MakeUppercase{${section.heading}}}\n`
      } else {
        sectionLatex += `\\subsection*{${section.heading}}\n`
      }

      // Section content with preserved formatting
      sectionLatex += `${section.content}\n\n`

      // Subsections
      if (section.subsections && section.subsections.length > 0) {
        section.subsections.forEach((subsection) => {
          sectionLatex += `\\subsubsection*{${subsection.heading}}\n`
          sectionLatex += `${subsection.content}\n\n`
        })
      }

      return sectionLatex
    })
    .join("")
}

const generateLatexReferences = (referencesData) => {
  if (!referencesData.content || referencesData.content.length === 0) return ""

  let referencesSection = `
\\section*{\\MakeUppercase{${referencesData.heading}}}
\\begin{enumerate}
`

  referencesData.content.forEach((ref) => {
    referencesSection += `\\item ${ref.text}\n`
  })

  referencesSection += `\\end{enumerate}`

  return referencesSection
}

export const generateCompleteLatexDocument = (formattedDocument) => {
  const latexStructure = convertToLatexStructure(formattedDocument)

  return `
\\documentclass[12pt]{${latexStructure.documentClass}}

% Packages
${latexStructure.packages.map((pkg) => `\\usepackage{${pkg}}`).join("\n")}

% Geometry
\\geometry{${Object.entries(latexStructure.geometry)
    .map(([key, value]) => `${key}=${value}`)
    .join(", ")}}

% Font and spacing
\\usepackage{times}
\\linespread{1.0}
\\setlength{\\parskip}{12pt}

% Headers and footers
\\usepackage{fancyhdr}
${latexStructure.header}

% Title and authors
${latexStructure.title}

\\begin{document}

\\thispagestyle{firstpage}
\\pagestyle{plain}

\\maketitle

${latexStructure.abstract}

${latexStructure.body}

${latexStructure.references}

\\end{document}
`
}
