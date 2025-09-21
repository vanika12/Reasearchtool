"use client"

import { useCallback } from "react"
import { useDropzone } from "react-dropzone"
import { Upload, FileText, File } from "lucide-react"

const UploadSection = ({ onFileUpload }) => {
  const onDrop = useCallback(
    (acceptedFiles) => {
      if (acceptedFiles.length > 0) {
        onFileUpload(acceptedFiles[0])
      }
    },
    [onFileUpload],
  )

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "application/pdf": [".pdf"],
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document": [".docx"],
      "application/msword": [".doc"],
    },
    multiple: false,
  })

  return (
    <div className="card">
      <div className="text-center mb-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Upload Your Research Paper</h2>
        <p className="text-gray-600">Upload your PDF or DOCX file to get started with automatic formatting</p>
      </div>

      <div
        {...getRootProps()}
        className={`border-2 border-dashed rounded-xl p-12 text-center cursor-pointer transition-colors ${
          isDragActive
            ? "border-primary-500 bg-primary-50"
            : "border-gray-300 hover:border-primary-400 hover:bg-gray-50"
        }`}
      >
        <input {...getInputProps()} />

        <div className="flex flex-col items-center space-y-4">
          <div className="flex items-center justify-center w-16 h-16 bg-gray-100 rounded-full">
            <Upload className="w-8 h-8 text-gray-600" />
          </div>

          {isDragActive ? (
            <p className="text-lg font-medium text-primary-600">Drop your file here...</p>
          ) : (
            <>
              <p className="text-lg font-medium text-gray-900">Drag & drop your file here, or click to browse</p>
              <p className="text-sm text-gray-500">Supports PDF, DOC, and DOCX files up to 10MB</p>
            </>
          )}

          <div className="flex items-center space-x-6 text-sm text-gray-500">
            <div className="flex items-center space-x-2">
              <FileText className="w-4 h-4" />
              <span>PDF</span>
            </div>
            <div className="flex items-center space-x-2">
              <File className="w-4 h-4" />
              <span>DOCX</span>
            </div>
            <div className="flex items-center space-x-2">
              <File className="w-4 h-4" />
              <span>DOC</span>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-6 p-4 bg-blue-50 rounded-lg">
        <h3 className="font-medium text-blue-900 mb-2">What happens next?</h3>
        <ul className="text-sm text-blue-800 space-y-1">
          <li>• AI analyzes your document structure and content</li>
          <li>• Extracts title, authors, abstract, and sections</li>
          <li>• Applies proper academic formatting standards</li>
          <li>• Provides editing options for customization</li>
        </ul>
      </div>
    </div>
  )
}

export default UploadSection
