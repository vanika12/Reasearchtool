import puppeteer from "puppeteer"
import fs from "fs";
import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  AlignmentType,
  convertInchesToTwip,
  Header,
  Footer,
  Table,
  TableRow,
  TableCell,
  WidthType,
  BorderStyle,
  PageNumber,
  ImageRun,
} from "docx";
// import { Document, Packer, Paragraph, TextRun, AlignmentType, convertInchesToTwip } from "docx"
import { applyLatexFormatting, formatCitations, formatTablesAndFigures } from "./formatter.js"
import { generateCompleteLatexDocument } from "./latex-converter.js"
import path from "path";

import { fileURLToPath } from "url";

// Fix __dirname for ES Modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ✅ Go two levels up (from server/utils → project root)
const imagePath = path.join(__dirname, "..", "..", "public", "rsis.jpg");
const imageBuffer = fs.readFileSync(imagePath);
const imageBase64 = imageBuffer.toString("base64");
const imageSrc = `data:image/jpeg;base64,${imageBase64}`;

export const exportToHTML = async (formattedDocument) => {
  const {
    metadata,
    header,
    title,
    authors,
    affiliations,
    abstract,
    keywords,
    sections,
    references,
    footer,
    publicationInfo,
  } = formattedDocument

  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${title.text}</title>
    <style>
        @page {
            size: A4;
            margin: ${metadata.formatSpecs.margins.top} ${metadata.formatSpecs.margins.right} ${metadata.formatSpecs.margins.bottom} ${metadata.formatSpecs.margins.left};
        }
        
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            font-family: 'Times New Roman', serif;
            font-size: 12pt;
            line-height: 1.0;
            color: #000;
            background: #fff;
            text-align: justify;
        }
        
        .document-container {
            max-width: 8.5in;
            margin: 0 auto;
            padding: 0;
        }
        
        .header {
            text-align: center;
            font-size: 10pt;
            font-weight: bold;
            border-bottom: 1px solid #000;
            padding-bottom: 10pt;
            margin-bottom: 20pt;
            border-top:1px solid #000;
        }
        
        .header-line {
            margin-bottom: 5pt;
        }
        
        .title {
            ${title.style}
            margin: 20pt 0;
        }
        
        .authors {
            ${authors.style}
            margin: 10pt 0;
        }
            /* Table formatting */
.journal-table {
  width: 100%;
  border-collapse: collapse;
  table-layout: fixed;
  margin: 12pt 0;
  font-size: 12pt;
  font-family: 'Times New Roman', serif;
}

.journal-table th,
.journal-table td {
  border: 1px solid #000;
  padding: 6pt;
  text-align: left;
  vertical-align: middle;
  word-break: break-word;
}

.journal-table thead { display: table-header-group; }
.journal-table tfoot { display: table-footer-group; }
.journal-table tr { page-break-inside: avoid; break-inside: avoid; }

/* Captions */
.table-caption, .figure-caption {
  font-weight: bold;
  text-align: center;
  margin: 8pt 0 4pt 0;
}

/* Key-Value tables */
.kv-key { width: 40%; font-weight: bold; }
.kv-val { width: 60%; }

        
        .affiliations {
            text-align: center;
            font-size: 12pt;
            margin: 10pt 0;
        }
        
        .affiliation {
            margin-bottom: 6pt;
        }
        
        .publication-info {
            ${publicationInfo?.style || "text-align: center; font-size: 12pt; margin: 15pt 0;"}
        }
        
        .abstract {
            margin: 20pt 0;
        }
        
        .abstract-heading {
            ${abstract.style.heading}
            margin-bottom: 10pt;
        }
        
        .abstract-content {
            ${abstract.style.content}
            margin-bottom: 15pt;
        }

        .abstract-content p, .section-content p {
            margin-bottom: 12pt; /* Adds space between paragraphs */
        }

        .abstract-content p:last-child, .section-content p:last-child {
            margin-bottom: 0; /* Removes space after the last paragraph in a section */
        }
        
        .keywords {
            margin: 15pt 0;
        }
        
        .keywords-heading {
            ${keywords.style.heading}
        }
        
        .keywords-content {
            ${keywords.style.content}
        }
        
        .section {
            margin: 20pt 0;
        }
        
        .section-heading {
            margin-bottom: 10pt;
        }
        
        .section-content {
            text-align: justify;
            margin-bottom: 15pt;
        }
        
        .subsection {
            margin: 15pt 0;
        }
        
        .subsection-heading {
            font-size: 12pt;
            font-weight: bold;
            margin-bottom: 6pt;
        }
        
        .references {
            margin: 20pt 0;
        }
        
        .references-heading {
            ${references.style.heading}
            margin-bottom: 10pt;
        }
        
        .reference-item {
            margin-bottom: 6pt;
            margin-left: 30pt; /* push references slightly to the right */
            text-align: justify; /* optional for neat alignment */
            // text-indent: -0.5in; /* Pull back the first line for the number */
        }
        
        /* Citation and formatting styles */
        sup {
            font-size: 10pt;
            vertical-align: super;
        }
        
        .equation {
            text-align: center;
            margin: 12pt 0;
            font-style: italic;
        }
        
        .inline-equation {
            font-style: italic;
        }
        
        .table-caption, .figure-caption {
            font-weight: bold;
            text-align: center;
            margin: 12pt 0 6pt 0;
        }
        
        /* Print styles */
        @media print {
            .document-container {
                max-width: none;
            }
            
            .section-heading {
                page-break-after: avoid;
            }
        }
    </style>
</head>
<body>
    <div class="document-container">
        <!-- Removed duplicate header from body since it's handled by PDF header template -->
        
        <div class="title">${title.text}</div>
        
        <div class="authors">${authors.text}</div>
        
        ${
          affiliations && affiliations.length > 0
            ? `
        <div class="affiliations">
            ${affiliations
              .map(
                (aff) => `
                <div class="affiliation">
                    ${aff.text}
                </div>
            `,
              )
              .join("")}
        </div>
        `
            : ""
        }
        
        ${
          publicationInfo
            ? `
        <div class="publication-info">
            <strong>DOI:</strong> <a href="${publicationInfo.doi}" style="color: blue; text-decoration: underline;">${publicationInfo.doi}</a><br>
            <strong>Received:</strong> ${publicationInfo.received}; <strong>Accepted:</strong> ${publicationInfo.accepted}; <strong>Published:</strong> ${publicationInfo.published}
        </div>
        `
            : ""
        }
        
        ${
          abstract.content
            ? `
        <div class="abstract">
            <div class="abstract-heading">${abstract.heading}</div>
            <div class="abstract-content">${applyLatexFormatting(formatCitations(abstract.content))
              .split(/\n\s*\n/)
              .map((p) => p.trim())
              .filter((p) => p)
              // .map((p) => `<p>${p.replace(/\n/g, "<br>")}</p>`)
              .map((p) => `<p>${p}</p>`)
              .join("")}</div>
        </div>
        `
            : ""
        }
        
        ${
          keywords.content
            ? `
        <div class="keywords">
            <span class="keywords-heading">${keywords.heading}:</span>
            <span class="keywords-content">${keywords.content}</span>
        </div>
        `
            : ""
        }
        
        ${sections
          .map(
            (section) => `
            <div class="section">
                <div class="section-heading" style="${section.formatting.headingStyle}">
                    ${section.heading}
                </div>
                <div class="section-content" style="${section.formatting.contentStyle}">
                    ${applyLatexFormatting(formatCitations(formatTablesAndFigures(section.content)))
                      .split(/\n\s*\n/)
                      .map((p) => p.trim())
                      .filter((p) => p)
                      .map((p) => `<p>${p}</p>`)
                      // .map((p) => `<p>${p.replace(/\n/g, "<br>")}</p>`)
                      .join("")}
                </div>
                
                ${
                  section.subsections && section.subsections.length > 0
                    ? section.subsections
                        .map(
                          (subsection) => `
                        <div class="subsection">
                            <div class="subsection-heading" style="${subsection.formatting.headingStyle}">
                                ${subsection.heading}
                            </div>
                            <div class="section-content" style="${subsection.formatting.contentStyle}">
                                ${applyLatexFormatting(formatCitations(formatTablesAndFigures(subsection.content)))
                                  .split(/\n\s*\n/)
                                  .map((p) => p.trim())
                                  .filter((p) => p)
                                  .map((p) => `<p>${p}</p>`)
                                  // .map((p) => `<p>${p.replace(/\n/g, "<br>")}</p>`)
                                  .join("")}
                            </div>
                        </div>
                    `,
                        )
                        .join("")
                    : ""
                }
            </div>
        `,
          )
          .join("")}
        
        ${
          references.content && references.content.length > 0
            ? `
        <div class="references">
            <div class="references-heading">${references.heading}</div>
            ${references.content
              .map((ref) => `<div class="reference-item">${ref.number}.&nbsp;&nbsp;${ref.text}</div>`)
              .join("")}
        </div>
        `
            : ""
        }
    </div>
</body>
</html>
`

  return html
}

export const exportToPDF = async (formattedDocument) => {
  console.log("[v0] Starting PDF generation...")

  const htmlContent = await exportToHTML(formattedDocument)
  console.log("[v0] HTML content generated, length:", htmlContent.length)

  let browser
  try {
    console.log("[v0] Launching Puppeteer browser...")
    browser = await puppeteer.launch({
      headless: "new",
      args: [
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-dev-shm-usage",
        "--disable-accelerated-2d-canvas",
        "--no-first-run",
        "--no-zygote",
        "--disable-gpu",
        "--disable-web-security",
        "--disable-features=VizDisplayCompositor",
      ],
      timeout: 60000,
    })

    console.log("[v0] Browser launched successfully")
    const page = await browser.newPage()

    // Set viewport for consistent rendering
    await page.setViewport({ width: 794, height: 1123 }) // A4 dimensions in pixels
    console.log("[v0] Viewport set")

    console.log("[v0] Setting page content...")
    await page.emulateMediaType("print");
    await page.setContent(htmlContent, {
      waitUntil: "networkidle0",
      timeout: 30000,
    })

    console.log("[v0] Content loaded, generating PDF...")

    const headerParts = []
    const headerData = formattedDocument.header || {}
    if (headerData.issn) {
      headerParts.push(headerData.issn)
    }
    if (headerData.doi) {
      headerParts.push(headerData.doi)
    }
    if (headerData.volume) {
      headerParts.push(headerData.volume)
    }
    const headerSecondLine = headerParts.join(" | ")

    const startPageNumber = formattedDocument.startPageNumber || 1;

    // Add this before page.pdf()
await page.addStyleTag({
  content: `
    @page {
      margin-bottom: 80px !important; /* Ensure enough space for footer */
    }
  `
});
    const pdfBuffer = await page.pdf({
      format: "A4",
      margin: {
        top: "0.76in",
        bottom: "0.42in",
        left: "0.42in",
        right: "0.42in",
        // top: "0.1in",
        // bottom: "0.8in",
        // left: "0.63in",
        // right: "0.63in",
      },
      printBackground: true,
      displayHeaderFooter: true,
       preferCSSPageSize: true,

      headerTemplate: `
        <div style="font-size: 10pt; width: 100%; text-align: center; font-family: 'Times New Roman', serif; font-weight: bold; padding: 0 0.42in;">
        <div style="border-bottom: 1px solid #000; padding-bottom: 10pt; display: flex; align-items: center; justify-content: space-between;">
          
           <!-- Logo at top-left -->
      <div style="flex: 0 0 auto; text-align: left;">
        <img src="${imageSrc}" alt="Logo" style="height:35px;"/>

      </div>
             <!-- Journal header content centered -->
      <div style="flex: 1; text-align: center;">
        ${headerData.content || ""}<br>
        <span style="font-size: 9pt; font-weight: normal;">
          ${headerSecondLine}
        </span>
      </div>

      <!-- Empty space on right to balance layout -->
      <div style="flex: 0 0 auto;"></div>
    </div>
        </div>
      `,
     

      footerTemplate: `
  <div style="
    font-size: 10pt; 
    width: 100%; 
    font-family: 'Times New Roman', serif; 
    padding: 0 0.42in;
    background-color: rgba(255,0,0,0.1); /* Light red background for debugging */
    height: 50px; /* Fixed height to ensure visibility */
  ">
    <!-- Very visible black line -->
    <div style="
      border-top: 1px solid #000000;
      margin: 0 auto; /* Center the line */
      width: 100%; /* Control the width of the line */
      max-width: 8in; /* Maximum width for the line */
      height: 1px;
    "></div>
    
    <div style="padding-top: 10pt; display: flex; justify-content: space-between; align-items: center;">
      <div style="flex: 1; text-align: left;">Page <span class="pageNumber"></span></div>
      <div style="flex: 1; text-align: center;">www.rsisinternational.org</div>
      <div style="flex: 1;"></div>
    </div>
  </div>
`,
  //  footerTemplate: `
  //       <div style="font-size: 10pt; width: 100%; font-family: 'Times New Roman', serif; padding: 0 0.42in;">
  //         <div style="border-top: 2px solid #000; margin-top: 5pt;"></div>
  //         <!-- Black line at the top -->
  //       <div style="flex: 0 0 auto; height: 1px; border-left: 1px solid #000; margin-bottom: 5pt;"></div>
  //         <div style="padding-top: 5pt; display: flex; justify-content: space-between; align-items: center;">
  //           <div style="flex: 1; text-align: left;">Page <span class="pageNumber"></span></div>
  //           <div style="flex: 1; text-align: center;">www.rsisinternational.org</div>
  //           <div style="flex: 1;"></div>
  //         </div>
  //       </div>
  //     `,

   




      preferCSSPageSize: true,
      timeout: 60000,
    })

    console.log("[v0] PDF generated successfully, size:", pdfBuffer.length, "bytes")
    
    fs.writeFileSync("debug.html", htmlContent, "utf8");

    return pdfBuffer
  } catch (error) {
    console.error("[v0] PDF generation error:", error.message)
    console.error("[v0] Error stack:", error.stack)
    throw new Error(`PDF generation failed: ${error.message}`)
  } finally {
    if (browser) {
      console.log("[v0] Closing browser...")
      await browser.close()
    }
  }
}

export const exportToLatex = async (formattedDocument) => {
  return generateCompleteLatexDocument(formattedDocument)
}






export const exportToDocx = async (formattedDocument) => {
  const { header, title, authors, affiliations, abstract, keywords, sections, references } =
    formattedDocument;

  const docChildren = [];

  // ---------- Title ----------
  docChildren.push(
    new Paragraph({
      children: [new TextRun({ text: title.text, bold: true, size: 36 })],
      alignment: AlignmentType.CENTER,
      spacing: { after: 400 },
    }),
  );

  // ---------- Authors ----------
  docChildren.push(
    new Paragraph({
      children: [new TextRun({ text: authors.text, bold: true, size: 24 })],
      alignment: AlignmentType.CENTER,
      spacing: { after: 200 },
    }),
  );

  // ---------- Affiliations ----------
  if (affiliations && affiliations.length > 0) {
    affiliations.forEach((aff) => {
      docChildren.push(
        new Paragraph({
          children: [new TextRun({ text: aff.text, size: 24 })],
          alignment: AlignmentType.CENTER,
          spacing: { after: 120 },
        }),
      );
    });
    docChildren.push(new Paragraph({ text: "" }));
  }

  // ---------- Abstract ----------
  if (abstract && abstract.content) {
    docChildren.push(
      new Paragraph({
        children: [
          new TextRun({
            text: abstract.heading,
            bold: true,
            allCaps: true,
            size: 28,
          }),
        ],
        spacing: { before: 400, after: 200 },
      }),
    );

    const abstractParagraphs = (abstract.content || "")
      .replace(/<\/p>/gi, "\n")
      .replace(/<br\s*\/?>/gi, "\n")
      .replace(/<[^>]+>/g, "")
      .split(/\n+/)
      .map((p) => p.trim())
      .filter((p) => p);

    abstractParagraphs.forEach((p, index) => {
      docChildren.push(
        new Paragraph({
          children: [new TextRun({ text: p, size: 24 })],
          alignment: AlignmentType.JUSTIFIED,
          spacing: {
            after: index === abstractParagraphs.length - 1 ? 300 : 240,
          },
        }),
      );
    });
  }

  // ---------- Keywords ----------
  if (keywords && keywords.content) {
    docChildren.push(
      new Paragraph({
        children: [
          new TextRun({ text: `${keywords.heading}: `, bold: true, size: 24 }),
          new TextRun({ text: keywords.content, italic: true, size: 24 }),
        ],
        spacing: { after: 300 },
      }),
    );
  }

  // ---------- Sections ----------
  sections.forEach((section) => {
    docChildren.push(
      new Paragraph({
        children: [
          new TextRun({
            text: section.heading,
            bold: true,
            allCaps: true,
            size: 28,
          }),
        ],
        spacing: { before: 400, after: 200 },
      }),
    );

    // const cleanText = section.content
    //   .replace(/<[^>]+>/g, " ")
    //   .split(/\n+/)
    //   .map((p) => p.trim())
    //   .filter((p) => p);

    // cleanText.forEach((p) => {
    //   docChildren.push(
    //     new Paragraph({
    //       text: p,
    //       alignment: AlignmentType.JUSTIFIED,
    //       spacing: { after: 240 },
    //     }),
    //   );
    // });

    // Split on <p>, <br>, or multiple newlines
const cleanParagraphs = section.content
  .replace(/<\/p>/gi, "\n") // treat </p> as new line
  .replace(/<br\s*\/?>/gi, "\n") // treat <br> as new line
  .replace(/<[^>]+>/g, "") // remove other HTML tags
  .split(/\n+/) // split on newlines
  .map((p) => p.trim())
  .filter((p) => p.length > 0);

cleanParagraphs.forEach((p) => {
  docChildren.push(
    new Paragraph({
          children: [new TextRun({ text: p, size: 24 })],
      alignment: AlignmentType.JUSTIFIED,
      spacing: { after: 240 }, // ensures visible space between paragraphs
    }),
  );
});

    if (section.subsections && section.subsections.length > 0) {
      section.subsections.forEach((subsection) => {
        docChildren.push(
          new Paragraph({
            children: [
              new TextRun({
                text: subsection.heading,
                bold: true,
                size: 24,
              }),
            ],
            spacing: { before: 240, after: 120 },
          }),
        );

        const subCleanParagraphs = (subsection.content || "")
          .replace(/<\/p>/gi, "\n")
          .replace(/<br\s*\/?>/gi, "\n")
          .replace(/<[^>]+>/g, "")
          .split(/\n+/)
          .map((p) => p.trim())
          .filter((p) => p.length > 0);

        subCleanParagraphs.forEach((p) => {
          docChildren.push(
            new Paragraph({
              children: [new TextRun({ text: p, size: 24 })],
              alignment: AlignmentType.JUSTIFIED,
              spacing: { after: 240 },
            }),
          );
        });
      });
    }
  });

  // ---------- References ----------
  if (references.content && references.content.length > 0) {
    docChildren.push(
      new Paragraph({
        children: [
          new TextRun({
            text: references.heading,
            bold: true,
            allCaps: true,
            size: 28,
          }),
        ],
        spacing: { before: 400, after: 200 },
      }),
    );
    references.content.forEach((ref) => {
      docChildren.push(
        new Paragraph({
          children: [
            new TextRun({ text: `${ref.number}. ${ref.text}`, size: 24 }),
          ],
          alignment: AlignmentType.JUSTIFIED,
          indent: { left: convertInchesToTwip(0.5) },
          spacing: { after: 120 },
        }),
      );
    });
  }

  let logoImage;
if (header?.logoPath && fs.existsSync(header.logoPath)) {
  const logoBuffer = fs.readFileSync(header.logoPath);
  logoImage = new ImageRun({ data: logoBuffer, transformation: { width: 50, height: 50 } });
}

const headerChildren = [];

if (logoImage) {
  headerChildren.push(
    new Paragraph({
      children: [logoImage],
      alignment: AlignmentType.LEFT,
      spacing: { after: 100 },
    }),
  );
}

headerChildren.push(
  new Paragraph({
    children: [new TextRun({ text: header?.content || "", bold: true, size: 22 })],
    alignment: AlignmentType.CENTER,
    spacing: { after: 50 },
  }),
);

const headerParts = [];
if (header?.issn) headerParts.push(header.issn);
if (header?.doi) headerParts.push(header.doi);
if (header?.volume) headerParts.push(header.volume);

if (headerParts.length > 0) {
  headerChildren.push(
    new Paragraph({
      children: [new TextRun({ text: headerParts.join(" | "), size: 20 })],
      alignment: AlignmentType.CENTER,
    }),
  );
}

const docxHeader = new Header({
  children: [
    ...headerChildren,
    new Paragraph({
      border: {
        bottom: {
          color: "000000",
          style: BorderStyle.SINGLE,
          size: 6,
        },
      },
    }),
  ],
});

const docxFooter = new Footer({
  children: [
    new Paragraph({
      border: {
        top: {
          color: "000000",
          style: BorderStyle.SINGLE,
          size: 6,
        },
      },
    }),
    new Paragraph({
      children: [new TextRun({ text: "Page ", color: "000000" }), new TextRun({ children: [PageNumber.CURRENT], color: "000000" })],
      alignment: AlignmentType.LEFT,
    }),
    new Paragraph({
      children: [new TextRun({ text: "www.rsisinternational.org", size: 20, color: "000000" })],
      alignment: AlignmentType.CENTER,
    }),
  ],
});
  // ---------- Document ----------
  const doc = new Document({
    sections: [
      {
        headers: { default: docxHeader },
        footers: { default: docxFooter },
        properties: {
          page: {
            pageNumbers: { start: formattedDocument.startPageNumber || 1 },
            margin: {
              top: convertInchesToTwip(0.76),
              right: convertInchesToTwip(0.42),
              bottom: convertInchesToTwip(0.42),
              left: convertInchesToTwip(0.42),
            },
          },
        },
        children: docChildren,
      },
    ],
  });

  const buffer = await Packer.toBuffer(doc);
  return buffer;
};

export const validateExport = (format, content) => {
  const validFormats = ["html", "xml", "pdf", "latex", "docx"]

  if (!validFormats.includes(format.toLowerCase())) {
    throw new Error(`Unsupported export format: ${format}`)
  }

  if (!content || (typeof content === "string" && content.trim().length === 0)) {
    throw new Error("No content to export")
  }

  return true
}
