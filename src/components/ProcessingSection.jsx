"use client"

import { useState, useEffect } from "react"
import { Loader2, CheckCircle, AlertCircle } from "lucide-react"
import axios from "axios"

const ProcessingSection = ({ documentData, onProcessingComplete }) => {
  const [status, setStatus] = useState("uploading")
  const [progress, setProgress] = useState(0)
  const [error, setError] = useState(null)

  useEffect(() => {
    processDocument()
  }, [])

  const processDocument = async () => {
    try {
      setStatus("uploading")
      setProgress(20)

      const formData = new FormData()
      formData.append("document", documentData.file)

      // Upload and extract text
      setStatus("extracting")
      setProgress(40)

      const extractResponse = await axios.post("http://localhost:5000/api/extract", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      })

      // Process with GROQ AI
      setStatus("analyzing")
      setProgress(60)

      const processResponse = await axios.post("http://localhost:5000/api/process", {
        text: extractResponse.data.text,
        filename: documentData.name,
      })

      // Format document
      setStatus("formatting")
      setProgress(80)

      const formatResponse = await axios.post("http://localhost:5000/api/format", {
        processedData: processResponse.data,
      })

      setProgress(100)
      setStatus("complete")

      setTimeout(() => {
        onProcessingComplete(formatResponse.data)
      }, 1000)
    } catch (err) {
      console.error("Processing error:", err)
      setError(err.response?.data?.error || err.message || "Processing failed")
      setStatus("error")
    }
  }

  const getStatusInfo = () => {
    switch (status) {
      case "uploading":
        return { text: "Uploading document...", icon: Loader2, color: "text-blue-600" }
      case "extracting":
        return { text: "Extracting text content...", icon: Loader2, color: "text-blue-600" }
      case "analyzing":
        return { text: "Analyzing with AI...", icon: Loader2, color: "text-blue-600" }
      case "formatting":
        return { text: "Applying formatting...", icon: Loader2, color: "text-blue-600" }
      case "complete":
        return { text: "Processing complete!", icon: CheckCircle, color: "text-green-600" }
      case "error":
        return { text: "Processing failed", icon: AlertCircle, color: "text-red-600" }
      default:
        return { text: "Processing...", icon: Loader2, color: "text-blue-600" }
    }
  }

  const statusInfo = getStatusInfo()
  const StatusIcon = statusInfo.icon

  return (
    <div className="card">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-gray-900 mb-6">Processing Your Document</h2>

        <div className="flex flex-col items-center space-y-6">
          <div className="flex items-center justify-center w-20 h-20 bg-gray-100 rounded-full">
            <StatusIcon
              className={`w-10 h-10 ${statusInfo.color} ${status !== "complete" && status !== "error" ? "animate-spin" : ""}`}
            />
          </div>

          <div className="w-full max-w-md">
            <div className="flex justify-between text-sm text-gray-600 mb-2">
              <span>{statusInfo.text}</span>
              <span>{progress}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-primary-500 h-2 rounded-full transition-all duration-500"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>

          {error && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-red-800 font-medium">Error: {error}</p>
              <button onClick={processDocument} className="mt-2 btn-primary text-sm">
                Retry
              </button>
            </div>
          )}
        </div>

        <div className="mt-8 p-4 bg-gray-50 rounded-lg text-left">
          <h3 className="font-medium text-gray-900 mb-2">Processing Steps:</h3>
          <div className="space-y-2 text-sm text-gray-600">
            <div className={`flex items-center space-x-2 ${progress >= 20 ? "text-green-600" : ""}`}>
              <div className={`w-2 h-2 rounded-full ${progress >= 20 ? "bg-green-500" : "bg-gray-300"}`} />
              <span>Document upload</span>
            </div>
            <div className={`flex items-center space-x-2 ${progress >= 40 ? "text-green-600" : ""}`}>
              <div className={`w-2 h-2 rounded-full ${progress >= 40 ? "bg-green-500" : "bg-gray-300"}`} />
              <span>Text extraction</span>
            </div>
            <div className={`flex items-center space-x-2 ${progress >= 60 ? "text-green-600" : ""}`}>
              <div className={`w-2 h-2 rounded-full ${progress >= 60 ? "bg-green-500" : "bg-gray-300"}`} />
              <span>AI analysis and structure detection</span>
            </div>
            <div className={`flex items-center space-x-2 ${progress >= 80 ? "text-green-600" : ""}`}>
              <div className={`w-2 h-2 rounded-full ${progress >= 80 ? "bg-green-500" : "bg-gray-300"}`} />
              <span>Academic formatting application</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default ProcessingSection
