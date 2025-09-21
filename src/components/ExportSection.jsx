"use client"

import { useState } from "react"
import { Download, FileText, Code, File, ArrowLeft } from "lucide-react"
import axios from "axios"

const ExportSection = ({ processedData, onBack }) => {
  const [exportFormat, setExportFormat] = useState("pdf")
  const [isExporting, setIsExporting] = useState(false)
  const [exportError, setExportError] = useState(null)

  const exportFormats = [
    {
      key: "pdf",
      name: "PDF",
      description: "Formatted PDF document ready for submission",
      icon: FileText,
      color: "text-red-600",
      bgColor: "bg-red-50",
    },
    {
      key: "html",
      name: "HTML",
      description: "Web-ready HTML with embedded styles",
      icon: Code,
      color: "text-blue-600",
      bgColor: "bg-blue-50",
    },
    {
      key: "docx",
      name: "DOCX",
      description: "Editable Word document",
      icon: File,
      color: "text-blue-800",
      bgColor: "bg-blue-100",
    },
  ]

  const handleExport = async () => {
    if (!processedData?.formattedDocument) {
      setExportError("No document data available for export")
      return
    }

    setIsExporting(true)
    setExportError(null)

    try {
      const response = await axios.post(
        "http://localhost:5000/api/export",
        {
          formattedDocument: processedData.formattedDocument,
          format: exportFormat,
          filename:
            processedData.formattedDocument.metadata?.originalFilename?.replace(/\.[^/.]+$/, "") ||
            "formatted-document",
        },
        {
          responseType: exportFormat === "html" ? "json" : "blob",
        },
      )

      if (exportFormat === "html") {
        // Handle HTML download from JSON response
        const { content, filename } = response.data
        const blob = new Blob([content], {
          type: "text/html",
        })
        const url = window.URL.createObjectURL(blob)
        const link = document.createElement("a")
        link.href = url
        link.download = filename
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
        window.URL.revokeObjectURL(url)
      } else {
        // Handle direct blob download for PDF and DOCX
        // ✅ response.data is already a Blob from axios
        const url = window.URL.createObjectURL(response.data)

        // const url = window.URL.createObjectURL(new Blob([response.data]))// change 2
        const link = document.createElement("a")
        link.href = url
        const filename =
          processedData.formattedDocument.metadata?.originalFilename?.replace(/\.[^/.]+$/, "") || "formatted-document"
        link.setAttribute("download", `${filename}.${exportFormat}`)
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
        window.URL.revokeObjectURL(url)
      }
    } catch (error) {
      console.error("Export error:", error)
      setExportError(error.response?.data?.error || "Export failed")
    } finally {
      setIsExporting(false)
    }
  }

  return (
    <div className="card">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Export Your Document</h2>
          <p className="text-gray-600">Choose your preferred format and download</p>
        </div>

        <button onClick={onBack} className="flex items-center space-x-2 text-gray-600 hover:text-gray-800">
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Edit</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        {exportFormats.map((format) => {
          const Icon = format.icon
          const isSelected = exportFormat === format.key

          return (
            <div
              key={format.key}
              onClick={() => setExportFormat(format.key)}
              className={`p-6 border-2 rounded-xl cursor-pointer transition-all ${
                isSelected
                  ? "border-primary-500 bg-primary-50"
                  : "border-gray-200 hover:border-gray-300 hover:bg-gray-50"
              }`}
            >
              <div className="flex flex-col items-center text-center space-y-3">
                <div className={`p-3 rounded-full ${format.bgColor}`}>
                  <Icon className={`w-6 h-6 ${format.color}`} />
                </div>
                <div>
                  <h3 className="font-medium text-gray-900">{format.name}</h3>
                  <p className="text-sm text-gray-600 mt-1">{format.description}</p>
                </div>
                {isSelected && (
                  <div className="w-4 h-4 bg-primary-500 rounded-full flex items-center justify-center">
                    <div className="w-2 h-2 bg-white rounded-full" />
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>

      <div className="flex flex-col items-center space-y-4">
        <button
          onClick={handleExport}
          disabled={isExporting}
          className={`flex items-center space-x-3 px-8 py-4 rounded-xl font-medium text-lg transition-all ${
            isExporting
              ? "bg-gray-300 text-gray-500 cursor-not-allowed"
              : "bg-primary-500 hover:bg-primary-600 text-white"
          }`}
        >
          <Download className={`w-5 h-5 ${isExporting ? "animate-bounce" : ""}`} />
          <span>
            {isExporting ? `Exporting ${exportFormat.toUpperCase()}...` : `Download ${exportFormat.toUpperCase()}`}
          </span>
        </button>

        {exportError && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-red-800 font-medium">Export Error: {exportError}</p>
            <button onClick={handleExport} className="mt-2 text-sm text-red-600 hover:text-red-700">
              Try Again
            </button>
          </div>
        )}
      </div>

      <div className="mt-8 p-6 bg-gray-50 rounded-lg">
        <h3 className="font-medium text-gray-900 mb-3">Document Summary</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div>
            <span className="text-gray-600">Title:</span>
            <p className="font-medium truncate">{processedData?.formattedDocument?.title?.text || "N/A"}</p>
          </div>
          <div>
            <span className="text-gray-600">Authors:</span>
            <p className="font-medium truncate">{processedData?.formattedDocument?.authors?.text || "N/A"}</p>
          </div>
          <div>
            <span className="text-gray-600">Sections:</span>
            <p className="font-medium">{processedData?.formattedDocument?.sections?.length || 0}</p>
          </div>
          <div>
            <span className="text-gray-600">Format:</span>
            <p className="font-medium">Academic Standard</p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default ExportSection
