"use client"

import { useState } from "react"
import Header from "./components/Header"
import UploadSection from "./components/UploadSection"
import ProcessingSection from "./components/ProcessingSection"
import EditingSection from "./components/EditingSection"
import ExportSection from "./components/ExportSection"

function App() {
  const [currentStep, setCurrentStep] = useState("upload")
  const [documentData, setDocumentData] = useState(null)
  const [processedData, setProcessedData] = useState(null)

  const handleFileUpload = (file) => {
    setDocumentData({ file, name: file.name })
    setCurrentStep("processing")
  }

  const handleProcessingComplete = (data) => {
    setProcessedData(data)
    setCurrentStep("editing")
  }

  const handleEditingComplete = (editedData) => {
    setProcessedData(editedData)
    setCurrentStep("export")
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />

      <main className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          {/* Progress Steps */}
          <div className="flex items-center justify-center mb-8">
            <div className="flex items-center space-x-4">
              {[
                { key: "upload", label: "Upload", icon: "📄" },
                { key: "processing", label: "Process", icon: "⚙️" },
                { key: "editing", label: "Edit", icon: "✏️" },
                { key: "export", label: "Export", icon: "📥" },
              ].map((step, index) => (
                <div key={step.key} className="flex items-center">
                  <div
                    className={`flex items-center justify-center w-10 h-10 rounded-full text-sm font-medium ${
                      currentStep === step.key
                        ? "bg-primary-500 text-white"
                        : index < ["upload", "processing", "editing", "export"].indexOf(currentStep)
                          ? "bg-green-500 text-white"
                          : "bg-gray-200 text-gray-600"
                    }`}
                  >
                    {step.icon}
                  </div>
                  <span className="ml-2 text-sm font-medium text-gray-700">{step.label}</span>
                  {index < 3 && <div className="w-8 h-0.5 bg-gray-300 mx-4" />}
                </div>
              ))}
            </div>
          </div>

          {/* Content Sections */}
          {currentStep === "upload" && <UploadSection onFileUpload={handleFileUpload} />}

          {currentStep === "processing" && (
            <ProcessingSection documentData={documentData} onProcessingComplete={handleProcessingComplete} />
          )}

          {currentStep === "editing" && (
            <EditingSection processedData={processedData} onEditingComplete={handleEditingComplete} />
          )}

          {currentStep === "export" && (
            <ExportSection processedData={processedData} onBack={() => setCurrentStep("editing")} />
          )}
        </div>
      </main>
    </div>
  )
}

export default App
