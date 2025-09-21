"use client"

import { useState, useEffect } from "react"
import { Edit3, Eye, EyeOff, GripVertical, Trash2, Plus, RotateCcw } from "lucide-react"

const EditingSection = ({ processedData, onEditingComplete }) => {
  const [editableData, setEditableData] = useState(null)
  const [selectedSections, setSelectedSections] = useState({})
  const [editingSection, setEditingSection] = useState(null)
  const [previewMode, setPreviewMode] = useState(false)
  const [draggedItem, setDraggedItem] = useState(null)
  const [originalData, setOriginalData] = useState(null) 

  useEffect(() => {
    if (processedData?.formattedDocument) {
      const data = processedData.formattedDocument
      setEditableData(data)
      setOriginalData(JSON.parse(JSON.stringify(data))) // Deep copy for reset

      // Initialize all sections as selected by default
      const initialSelection = {}
      if (data.sections) {
        data.sections.forEach((section, index) => {
          initialSelection[`section_${index}`] = true
        })
      }

      // Add other components
      initialSelection.header = true
      initialSelection.header_issn = true
      initialSelection.header_doi = true
      initialSelection.header_volume = true
      initialSelection.title = true
      initialSelection.authors = true
      initialSelection.affiliations = !!(data.affiliations && data.affiliations.length > 0)
      initialSelection.publicationInfo_doi = !!data.publicationInfo?.doi
      initialSelection.publicationInfo_received = !!data.publicationInfo?.received
      initialSelection.publicationInfo_accepted = !!data.publicationInfo?.accepted
      initialSelection.publicationInfo_published = !!data.publicationInfo?.published
      initialSelection.abstract = !!(data.abstract?.content && data.abstract.content.trim().length > 0)
      initialSelection.keywords = !!(data.keywords?.content && data.keywords.content.trim().length > 0)
      initialSelection.references = !!(
        data.references?.content &&
        Array.isArray(data.references.content) &&
        data.references.content.length > 0
      )

      setSelectedSections(initialSelection)
    }
  }, [processedData])

  const handleSectionToggle = (sectionKey) => {
    setSelectedSections((prev) => ({
      ...prev,
      [sectionKey]: !prev[sectionKey],
    }))
  }

  const handleSectionEdit = (sectionKey, newContent, newHeading) => {
    setEditableData((prevData) => {
      if (!prevData) return null

      const updatedData = { ...prevData }

      if (sectionKey === "header") {
        updatedData.header = { ...prevData.header, content: newContent }
      } else if (sectionKey === "header_issn") {
        updatedData.header = { ...prevData.header, issn: newContent }
      } else if (sectionKey === "header_doi") {
        updatedData.header = { ...prevData.header, doi: newContent }
      } else if (sectionKey === "header_volume") {
        updatedData.header = { ...prevData.header, volume: newContent }
      } else if (sectionKey === "title") {
        updatedData.title = { ...prevData.title, text: newContent }
      } else if (sectionKey === "authors") {
        updatedData.authors = { ...prevData.authors, text: newContent }
      } else if (sectionKey === "affiliations") {
        const affiliationLines = newContent.split("\n").filter((line) => line.trim())
        updatedData.affiliations = affiliationLines.map((line, index) => ({
          number: index + 1,
          text: line,
          style:
            prevData.affiliations?.[0]?.style ||
            "font-size: 12pt; font-family: 'Times New Roman'; text-align: center; margin-bottom: 6pt;",
        }))
      } else if (sectionKey === "publicationInfo_doi") {
        updatedData.publicationInfo = { ...(prevData.publicationInfo || {}), doi: newContent }
      } else if (sectionKey === "publicationInfo_received") {
        updatedData.publicationInfo = { ...(prevData.publicationInfo || {}), received: newContent }
      } else if (sectionKey === "publicationInfo_accepted") {
        updatedData.publicationInfo = { ...(prevData.publicationInfo || {}), accepted: newContent }
      } else if (sectionKey === "publicationInfo_published") {
        updatedData.publicationInfo = { ...(prevData.publicationInfo || {}), published: newContent }
      } else if (sectionKey === "abstract") {
        updatedData.abstract = { ...prevData.abstract, content: newContent }
      } else if (sectionKey === "keywords") {
        updatedData.keywords = { ...prevData.keywords, content: newContent }
      } else if (sectionKey === "startPageNumber") {
        updatedData.startPageNumber = parseInt(newContent, 10) || 1
      } else if (sectionKey.startsWith("section_")) {
        const index = Number.parseInt(sectionKey.split("_")[1])
        const updatedSections = [...prevData.sections]
        if (updatedSections[index]) {
          const updatedSection = { ...updatedSections[index], content: newContent }
          if (newHeading !== undefined) {
            updatedSection.heading = newHeading
          }
          updatedSections[index] = updatedSection
          updatedData.sections = updatedSections
        }
      } else if (sectionKey === "references") {
        updatedData.references = {
          ...prevData.references,
          content: Array.isArray(newContent) ? newContent : newContent.split("\n").filter((ref) => ref.trim().length > 0),
        }
      }

      return updatedData
    })
  }

  const handleSectionReorder = (fromIndex, toIndex) => {
    if (!editableData?.sections) return

    const updatedSections = [...editableData.sections]
    const [movedSection] = updatedSections.splice(fromIndex, 1)
    updatedSections.splice(toIndex, 0, movedSection)

    setEditableData({
      ...editableData,
      sections: updatedSections,
    })

    // Update selection keys
    const newSelection = { ...selectedSections }
    const oldKeys = Object.keys(selectedSections).filter((key) => key.startsWith("section_"))
    const sectionSelections = oldKeys.map((key) => selectedSections[key])

    // Clear old section selections
    oldKeys.forEach((key) => delete newSelection[key])

    // Reapply selections with new indices
    sectionSelections.forEach((selected, index) => {
      newSelection[`section_${index}`] = selected
    })

    setSelectedSections(newSelection)
  }

  const handleDeleteSection = (sectionIndex) => {
    if (!editableData?.sections) return

    const updatedSections = editableData.sections.filter((_, index) => index !== sectionIndex)
    setEditableData({
      ...editableData,
      sections: updatedSections,
    })

    // Update selection keys
    const newSelection = { ...selectedSections }
    delete newSelection[`section_${sectionIndex}`]

    // Reindex remaining sections
    const remainingSections = {}
    Object.keys(newSelection)
      .filter((key) => key.startsWith("section_"))
      .forEach((key) => {
        const oldIndex = Number.parseInt(key.split("_")[1])
        if (oldIndex > sectionIndex) {
          remainingSections[`section_${oldIndex - 1}`] = newSelection[key]
          delete newSelection[key]
        }
      })

    setSelectedSections({ ...newSelection, ...remainingSections })
  }

  const handleAddSection = () => {
    if (!editableData) return

    const newSection = {
      heading: "New Section",
      content: "Enter your content here...",
      type: "other",
    }

    const updatedSections = [...(editableData.sections || []), newSection]
    setEditableData({
      ...editableData,
      sections: updatedSections,
    })

    // Add to selections
    setSelectedSections((prev) => ({
      ...prev,
      [`section_${updatedSections.length - 1}`]: true,
    }))
  }

  const handleReset = () => {
    if (originalData) {
      setEditableData(JSON.parse(JSON.stringify(originalData)))
      setEditingSection(null)
    }
  }

  const handleContinue = () => {
    if (!editableData) return

    // Filter out unselected sections
    const filteredData = { ...editableData }

    if (filteredData.sections) {
      filteredData.sections = filteredData.sections.filter((_, index) => selectedSections[`section_${index}`])
    }

    // Remove unselected components
    if (!selectedSections.title) filteredData.title = null
    if (!selectedSections.authors) filteredData.authors = null
    if (!selectedSections.affiliations) filteredData.affiliations = []
    if (filteredData.publicationInfo) {
      if (!selectedSections.publicationInfo_doi) filteredData.publicationInfo.doi = ""
      if (!selectedSections.publicationInfo_received) filteredData.publicationInfo.received = ""
      if (!selectedSections.publicationInfo_accepted) filteredData.publicationInfo.accepted = ""
      if (!selectedSections.publicationInfo_published) filteredData.publicationInfo.published = ""
    }
    if (!selectedSections.abstract) filteredData.abstract = null
    if (!selectedSections.keywords) filteredData.keywords = null
    if (!selectedSections.references) filteredData.references = null

    // Handle header parts
    if (filteredData.header) {
      if (!selectedSections.header) {
        filteredData.header.content = ""
      }
      if (!selectedSections.header_issn) {
        filteredData.header.issn = ""
      }
      if (!selectedSections.header_doi) {
        filteredData.header.doi = ""
      }
      if (!selectedSections.header_volume) {
        filteredData.header.volume = ""
      }
    }

    onEditingComplete({ formattedDocument: filteredData })
  }

  const getSelectedCount = () => {
    return Object.values(selectedSections).filter(Boolean).length
  }

  if (!editableData) {
    return (
      <div className="card">
        <div className="text-center">
          <p className="text-gray-600">Loading document for editing...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="card">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Edit Your Document</h2>
            <p className="text-gray-600">{getSelectedCount()} sections selected • Drag to reorder • Click to edit</p>
          </div>
           


          {/* <div className="flex items-center space-x-3"> */}
          <div className="flex items-center space-x-3">


            <button
              onClick={handleReset}
              className="flex items-center space-x-2 px-3 py-2 text-sm text-gray-600 hover:text-gray-800 border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              <RotateCcw className="w-4 h-4" />
              <span>Reset</span>
            </button>

            <button
              onClick={() => setPreviewMode(!previewMode)}
              className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-colors ${
                previewMode ? "bg-primary-500 text-white" : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
            >
              {previewMode ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              <span>{previewMode ? "Edit Mode" : "Preview"}</span>
            </button>

            <button onClick={handleContinue} className="btn-primary">
              Continue to Export
            </button>
          </div>
        </div>

        {previewMode ? (
          <DocumentPreview data={editableData} selectedSections={selectedSections} onEdit={handleSectionEdit} />
        ) : (
          <EditingInterface
            data={editableData}
            selectedSections={selectedSections}
            onSectionToggle={handleSectionToggle}
            onSectionEdit={handleSectionEdit}
            onSectionReorder={handleSectionReorder}
            onDeleteSection={handleDeleteSection}
            onAddSection={handleAddSection}
            editingSection={editingSection}
            setEditingSection={setEditingSection}
            draggedItem={draggedItem}
            setDraggedItem={setDraggedItem}
          />
        )}
      </div>
    </div>
  )
}

const EditingInterface = ({
  data,
  selectedSections,
  onSectionToggle,
  onSectionEdit,
  onSectionReorder,
  onDeleteSection,
  onAddSection,
  editingSection,
  setEditingSection,
  draggedItem,
  setDraggedItem,
}) => {
  const EditableSection = ({
    sectionKey,
    title,
    content,
    placeholder,
    isDraggable = false,
    sectionIndex = null,
  }) => {
    const isSelected = selectedSections[sectionKey]
    const isEditing = editingSection === sectionKey
    const isDragging = draggedItem === sectionIndex
    const [localContent, setLocalContent] = useState(content || "")
    const [localHeading, setLocalHeading] = useState(title || "")

    useEffect(() => {
      if (isEditing) {
        setLocalContent(content || "")
        if (isDraggable) {
          setLocalHeading(title || "")
        }
      }
    }, [isEditing, content, title, isDraggable])

    const handleSave = () => {
      onSectionEdit(sectionKey, localContent, localHeading)
      setEditingSection(null)
    }

    const handleToggleEdit = () => {
      if (isEditing) {
        handleSave()
      } else {
        setEditingSection(sectionKey)
      }
    }

    const handleDragStart = (e) => {
      if (isDraggable) {
        setDraggedItem(sectionIndex)
        e.dataTransfer.effectAllowed = "move"
      }
    }

    const handleDragOver = (e) => {
      if (isDraggable && draggedItem !== null && draggedItem !== sectionIndex) {
        e.preventDefault()
        e.dataTransfer.dropEffect = "move"
      }
    }

    const handleDrop = (e) => {
      if (isDraggable && draggedItem !== null && draggedItem !== sectionIndex) {
        e.preventDefault()
        onSectionReorder(draggedItem, sectionIndex)
        setDraggedItem(null)
      }
    }

    const handleDragEnd = () => {
      setDraggedItem(null)
    }

    return (
      <div
        className={`border rounded-lg p-4 transition-all ${
          isSelected ? "border-primary-200 bg-white shadow-sm" : "border-gray-200 bg-gray-50"
        } ${isDragging ? "opacity-100" : ""}`}
        draggable={isDraggable && isSelected}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        onDragEnd={handleDragEnd}
      >
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center space-x-3">
            {isDraggable && isSelected && (
              <div className="cursor-move text-gray-400 hover:text-gray-600">
                <GripVertical className="w-4 h-4" />
              </div>
            )}
            <input
              type="checkbox"
              checked={isSelected}
              onChange={() => onSectionToggle(sectionKey)}
              className="w-4 h-4 text-primary-500 rounded focus:ring-primary-500"
            />
            <h3 className={`font-medium ${isSelected ? "text-gray-900" : "text-gray-500"}`}>{title}</h3>
            {content && (
              <span className="text-xs text-gray-500 bg-gray-200 px-2 py-1 rounded">{content.length} chars</span>
            )}
          </div>

          <div className="flex items-center space-x-2">
            {isSelected && (
              <>
                <button
                  onClick={handleToggleEdit}
                  className="flex items-center space-x-1 text-sm text-primary-600 hover:text-primary-700"
                >
                  <Edit3 className="w-4 h-4" />
                  <span>{isEditing ? "Save" : "Edit"}</span>
                </button>
                {isDraggable && (
                  <button
                    onClick={() => onDeleteSection(sectionIndex)}
                    className="flex items-center space-x-1 text-sm text-red-600 hover:text-red-700"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </>
            )}
          </div>
        </div>

        {isSelected && (
          <div className="space-y-2">
            {isEditing ? (
              <div className="space-y-3">
                {isDraggable && (
                  <input
                    type="text"
                    value={localHeading}
                    onChange={(e) => setLocalHeading(e.target.value)}
                    placeholder="Section heading..."
                    className="w-full p-2 border border-gray-300 rounded-lg text-sm font-medium focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  />
                )}
                <textarea
                  value={localContent}
                  onChange={(e) => setLocalContent(e.target.value)}
                  placeholder={placeholder}
                  className="w-full p-3 border border-gray-300 rounded-lg resize-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  rows={Math.max(4, Math.ceil((localContent || "").length / 80))}
                  style={{ minHeight: "120px" }}
                />
              </div>
            ) : (
              <div className="p-3 bg-white border border-gray-200 rounded-lg shadow-sm">
                <p className="text-gray-800 whitespace-pre-wrap text-sm leading-relaxed">{content || placeholder}</p>
              </div>
            )}
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <EditableSection
        sectionKey="header"
        title="Journal Header"
        content={data.header?.content || ""}
        placeholder="Enter journal header information..."
      />

      <EditableSection
        sectionKey="header_issn"
        title="Header ISSN"
        content={data.header?.issn || ""}
        placeholder="Enter ISSN..."
      />

      <EditableSection
        sectionKey="header_doi"
        title="Header DOI"
        content={data.header?.doi || ""}
        placeholder="Enter DOI..."
      />

      <EditableSection
        sectionKey="header_volume"
        title="Header Volume/Issue"
        content={data.header?.volume || ""}
        placeholder="Enter Volume/Issue information..."
      />

      <EditableSection
        sectionKey="title"
        title="Title"
        content={data.title?.text || ""}
        placeholder="Enter paper title..."
      />

      <EditableSection
        sectionKey="authors"
        title="Authors & Affiliations"
        content={data.authors?.text || ""}
        placeholder="Enter author names and affiliations..."
      />

      <EditableSection
        sectionKey="affiliations"
        title="Affiliations"
        content={
          Array.isArray(data.affiliations) ? data.affiliations.map((aff) => aff.text).join("\n") : ""
        }
        placeholder="Enter affiliations (one per line)..."
      />

      <EditableSection
        sectionKey="publicationInfo_doi"
        title="Publication DOI"
        content={data.publicationInfo?.doi || ""}
        placeholder="Enter DOI..."
      />

      <EditableSection
        sectionKey="publicationInfo_received"
        title="Received Date"
        content={data.publicationInfo?.received || ""}
        placeholder="Enter Received Date..."
      />

      <EditableSection
        sectionKey="publicationInfo_accepted"
        title="Accepted Date"
        content={data.publicationInfo?.accepted || ""}
        placeholder="Enter Accepted Date..."
      />

      <EditableSection
        sectionKey="publicationInfo_published"
        title="Published Date"
        content={data.publicationInfo?.published || ""}
        placeholder="Enter Published Date..."
      />

      <EditableSection
        sectionKey="abstract"
        title="Abstract"
        content={data.abstract?.content || ""}
        placeholder="Enter abstract content..."
      />

      <EditableSection
        sectionKey="keywords"
        title="Keywords"
        content={data.keywords?.content || ""}
        placeholder="Enter keywords separated by commas..."
      />

      <EditableSection
        sectionKey="startPageNumber"
        title="Starting Page Number"
        content={String(data.startPageNumber || 1)}
        placeholder="Enter the starting page number..."
      />

      <div className="border-t pt-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-medium text-gray-900">Document Sections</h3>
          <button
            onClick={onAddSection}
            className="flex items-center space-x-2 text-sm text-primary-600 hover:text-primary-700"
          >
            <Plus className="w-4 h-4" />
            <span>Add Section</span>
          </button>
        </div>

        {data.sections?.map((section, index) => (
          <div key={index} className="mb-4">
            <EditableSection
              sectionKey={`section_${index}`}
              title={section.heading}
              content={section.content}
              placeholder={`Enter content for ${section.heading}...`}
              isDraggable={true}
              sectionIndex={index}
            />
          </div>
        ))}
      </div>

      <EditableSection
        sectionKey="references"
        title="References"
        content={
          Array.isArray(data.references?.content)
            ? data.references.content
                .map((ref) => (typeof ref === "object" ? ref.text || String(ref) : String(ref)))
                .join("\n")
            : data.references?.content || ""
        }
        placeholder="Enter references (one per line)..."
      />
    </div>
  )
}

const DocumentPreview = ({ data, selectedSections, onEdit }) => {
  const [editingField, setEditingField] = useState(null)

  const handleFieldClick = (field) => {
    setEditingField(field)
  }

  const handleFieldBlur = (e, field) => {
    setEditingField(null)
    const newValue = e.target.innerHTML.replace(/<br>/g, "\n")
    if (onEdit) {
      onEdit(field, newValue)
    }
  }

  const handleKeyDown = (e, field) => {
    if (e.key === "Enter" && !e.shiftKey && field !== "abstract" && !field.startsWith("section_")) {
      e.preventDefault()
      e.target.blur()
    }
  }

  const getHTML = (field) => {
    if (field === "title") return { __html: data.title?.text || "" }
    if (field === "authors") return { __html: data.authors?.text || "" }
    if (field === "header") return { __html: data.header?.content || "" }
    if (field === "header_issn") return { __html: data.header?.issn || "" }
    if (field === "header_doi") return { __html: data.header?.doi || "" }
    if (field === "header_volume") return { __html: data.header?.volume || "" }
    if (field === "affiliations") {
      const content = Array.isArray(data.affiliations)
        ? data.affiliations.map((aff) => aff.text).join("<br>")
        : ""
      return { __html: content }
    }
    if (field === "publicationInfo_doi") return { __html: data.publicationInfo?.doi || "" }
    if (field === "publicationInfo_received") return { __html: data.publicationInfo?.received || "" }
    if (field === "publicationInfo_accepted") return { __html: data.publicationInfo?.accepted || "" }
    if (field === "publicationInfo_published") return { __html: data.publicationInfo?.published || "" }
    if (field === "abstract") return { __html: data.abstract?.content || "" }
    if (field === "keywords") return { __html: data.keywords?.content || "" }
    if (field.startsWith("section_")) {
      const index = Number.parseInt(field.split("_")[1])
      const content = data.sections?.[index]?.content || ""
      return {
        __html: content
          .replace(/\n/g, "<br>")
          .replace(/<table class="data-table">/g, '<table style="border-collapse: collapse; width: 100%; margin: 10px 0;">')
          .replace(/<td>/g, '<td style="border: 1px solid #ccc; padding: 8px; text-align: left;">'),
      }
    }
    if (field === "references") {
      const content = Array.isArray(data.references?.content)
        ? data.references.content.join("\n")
        : data.references?.content || ""
      return { __html: content }
    }
    return { __html: "" }
  }

  if (!data) {
    return (
      <div className="bg-white border border-gray-200 rounded-lg p-8">
        <div className="text-center text-gray-500">
          <p>No document data available for preview</p>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-8 max-h-96 overflow-y-auto">
      <div className="space-y-6 text-sm">
        {selectedSections.header && data.header && (
          <div className="text-center border-b pb-4 text-xs text-gray-600">
            <div
              className={`cursor-pointer hover:bg-blue-50 p-2 rounded ${
                editingField === "header" ? "bg-blue-100 border border-blue-300" : ""
              }`}
              contentEditable={editingField === "header"}
              suppressContentEditableWarning={true}
              onClick={() => handleFieldClick("header")}
              onBlur={(e) => handleFieldBlur(e, "header")}
              onKeyDown={(e) => handleKeyDown(e, "header")}
              dangerouslySetInnerHTML={getHTML("header")}
            >
            </div>
            <div>
              <span
                className={`cursor-pointer hover:bg-blue-50 p-1 rounded ${
                  editingField === "header_issn" ? "bg-blue-100 border border-blue-300" : ""
                }`}
                contentEditable={editingField === "header_issn"}
                suppressContentEditableWarning={true}
                onClick={() => handleFieldClick("header_issn")}
                onBlur={(e) => handleFieldBlur(e, "header_issn")}
                onKeyDown={(e) => handleKeyDown(e, "header_issn")}
                dangerouslySetInnerHTML={getHTML("header_issn")}
              />
              {" | "}
              <span
                className={`cursor-pointer hover:bg-blue-50 p-1 rounded ${
                  editingField === "header_doi" ? "bg-blue-100 border border-blue-300" : ""
                }`}
                contentEditable={editingField === "header_doi"}
                suppressContentEditableWarning={true}
                onClick={() => handleFieldClick("header_doi")}
                onBlur={(e) => handleFieldBlur(e, "header_doi")}
                onKeyDown={(e) => handleKeyDown(e, "header_doi")}
                dangerouslySetInnerHTML={getHTML("header_doi")}
              />
              {" | "}
              <span
                className={`cursor-pointer hover:bg-blue-50 p-1 rounded ${
                  editingField === "header_volume" ? "bg-blue-100 border border-blue-300" : ""
                }`}
                contentEditable={editingField === "header_volume"}
                suppressContentEditableWarning={true}
                onClick={() => handleFieldClick("header_volume")}
                onBlur={(e) => handleFieldBlur(e, "header_volume")}
                onKeyDown={(e) => handleKeyDown(e, "header_volume")}
                dangerouslySetInnerHTML={getHTML("header_volume")}
              />
            </div>
          </div>
        )}

        {selectedSections.title && data.title && (
          <div className="text-center">
            <h1
              className={`text-lg font-bold leading-tight cursor-pointer hover:bg-blue-50 p-2 rounded ${
                editingField === "title" ? "bg-blue-100 border border-blue-300" : ""
              }`}
              contentEditable={editingField === "title"}
              suppressContentEditableWarning={true}
              onClick={() => handleFieldClick("title")}
              onBlur={(e) => handleFieldBlur(e, "title")}
              onKeyDown={(e) => handleKeyDown(e, "title")}
              dangerouslySetInnerHTML={getHTML("title")}
            />
          </div>
        )}

        {selectedSections.authors && data.authors && (
          <div className="text-center">
            <p
              className={`font-medium cursor-pointer hover:bg-blue-50 p-2 rounded ${
                editingField === "authors" ? "bg-blue-100 border border-blue-300" : ""
              }`}
              contentEditable={editingField === "authors"}
              suppressContentEditableWarning={true}
              onClick={() => handleFieldClick("authors")}
              onBlur={(e) => handleFieldBlur(e, "authors")}
              onKeyDown={(e) => handleKeyDown(e, "authors")}
              dangerouslySetInnerHTML={getHTML("authors")}
            />
          </div>
        )}

        {selectedSections.affiliations && (
          <div
            className={`text-center text-sm cursor-pointer hover:bg-blue-50 p-2 rounded ${
              editingField === "affiliations" ? "bg-blue-100 border border-blue-300" : ""
            }`}
            contentEditable={editingField === "affiliations"}
            suppressContentEditableWarning={true}
            onClick={() => handleFieldClick("affiliations")}
            onBlur={(e) => handleFieldBlur(e, "affiliations")}
            onKeyDown={(e) => handleKeyDown(e, "affiliations")}
            dangerouslySetInnerHTML={getHTML("affiliations")}
          />
        )}

        {(selectedSections.publicationInfo_doi ||
          selectedSections.publicationInfo_received ||
          selectedSections.publicationInfo_accepted ||
          selectedSections.publicationInfo_published) && (
          <div className="text-center">
            {selectedSections.publicationInfo_doi && (
              <p className="text-sm">
                <strong>DOI:</strong>
                <span
                  className={`cursor-pointer hover:bg-blue-50 p-1 rounded ml-1 ${
                    editingField === "publicationInfo_doi" ? "bg-blue-100 border border-blue-300" : ""
                  }`}
                  contentEditable={editingField === "publicationInfo_doi"}
                  suppressContentEditableWarning={true}
                  onClick={() => handleFieldClick("publicationInfo_doi")}
                  onBlur={(e) => handleFieldBlur(e, "publicationInfo_doi")}
                  onKeyDown={(e) => handleKeyDown(e, "publicationInfo_doi")}
                  dangerouslySetInnerHTML={getHTML("publicationInfo_doi")}
                />
              </p>
            )}
            {(selectedSections.publicationInfo_received ||
              selectedSections.publicationInfo_accepted ||
              selectedSections.publicationInfo_published) && (
              <p className="text-sm mt-1">
                {selectedSections.publicationInfo_received && (
                  <>
                    <strong>Received:</strong>
                    <span
                      className={`cursor-pointer hover:bg-blue-50 p-1 rounded ${
                        editingField === "publicationInfo_received" ? "bg-blue-100 border border-blue-300" : ""
                      }`}
                      contentEditable={editingField === "publicationInfo_received"}
                      suppressContentEditableWarning={true}
                      onClick={() => handleFieldClick("publicationInfo_received")}
                      onBlur={(e) => handleFieldBlur(e, "publicationInfo_received")}
                      onKeyDown={(e) => handleKeyDown(e, "publicationInfo_received")}
                      dangerouslySetInnerHTML={getHTML("publicationInfo_received")}
                    />
                    {"; "}
                  </>
                )}
                {selectedSections.publicationInfo_accepted && (
                  <>
                    <strong>Accepted:</strong>
                    <span
                      className={`cursor-pointer hover:bg-blue-50 p-1 rounded ${
                        editingField === "publicationInfo_accepted" ? "bg-blue-100 border border-blue-300" : ""
                      }`}
                      contentEditable={editingField === "publicationInfo_accepted"}
                      suppressContentEditableWarning={true}
                      onClick={() => handleFieldClick("publicationInfo_accepted")}
                      onBlur={(e) => handleFieldBlur(e, "publicationInfo_accepted")}
                      onKeyDown={(e) => handleKeyDown(e, "publicationInfo_accepted")}
                      dangerouslySetInnerHTML={getHTML("publicationInfo_accepted")}
                    />
                    {"; "}
                  </>
                )}
                {selectedSections.publicationInfo_published && (
                  <>
                    <strong>Published:</strong>
                    <span
                      className={`cursor-pointer hover:bg-blue-50 p-1 rounded ${
                        editingField === "publicationInfo_published" ? "bg-blue-100 border border-blue-300" : ""
                      }`}
                      contentEditable={editingField === "publicationInfo_published"}
                      suppressContentEditableWarning={true}
                      onClick={() => handleFieldClick("publicationInfo_published")}
                      onBlur={(e) => handleFieldBlur(e, "publicationInfo_published")}
                      onKeyDown={(e) => handleKeyDown(e, "publicationInfo_published")}
                      dangerouslySetInnerHTML={getHTML("publicationInfo_published")}
                    />
                  </>
                )}
              </p>
            )}
          </div>
        )}

        {selectedSections.abstract &&
          data.abstract &&
          data.abstract.content &&
          data.abstract.content.trim().length > 50 && (
            <div>
              <h2 className="font-bold text-sm uppercase mb-2">ABSTRACT</h2>
              <p
                className={`text-justify leading-relaxed cursor-pointer hover:bg-blue-50 p-2 rounded transition-colors ${
                  editingField === "abstract" ? "bg-blue-100 border border-blue-300" : ""
                }`}
                contentEditable={editingField === "abstract"}
                suppressContentEditableWarning={true}
                onClick={() => handleFieldClick("abstract")}
                onBlur={(e) => handleFieldBlur(e, "abstract")}
                onKeyDown={(e) => handleKeyDown(e, "abstract")}
                style={{ minHeight: "2em" }}
                dangerouslySetInnerHTML={getHTML("abstract")}
              />
            </div>
          )}

        {data.sections?.map(
          (section, index) =>
            selectedSections[`section_${index}`] && (
              <div key={index}>
                <h2 className="font-bold text-sm uppercase mb-2">{section.heading}</h2>
                <div
                  className={`text-justify leading-relaxed cursor-pointer hover:bg-blue-50 p-2 rounded transition-colors whitespace-pre-wrap ${
                    editingField === `section_${index}` ? "bg-blue-100 border border-blue-300" : ""
                  }`}
                  contentEditable={editingField === `section_${index}`}
                  suppressContentEditableWarning={true}
                  onClick={() => handleFieldClick(`section_${index}`)}
                  onBlur={(e) => handleFieldBlur(e, `section_${index}`)}
                  onKeyDown={(e) => handleKeyDown(e, `section_${index}`)}
                  style={{ minHeight: "2em" }}
                  dangerouslySetInnerHTML={getHTML(`section_${index}`)}
                />
              </div>
            ),
        )}

        {selectedSections.references && data.references && data.references.content && (
          <div>
            <h2 className="font-bold text-sm uppercase mb-2">{data.references.heading}</h2>
            <div className="space-y-1">
              {Array.isArray(data.references.content) ? (
                data.references.content.map((ref, index) => (
                  <p key={index} className="text-justify">
                    {index + 1}. {typeof ref === "object" && ref.text ? ref.text : String(ref)}
                  </p>
                ))
              ) : (
                <p
                  className={`text-justify cursor-pointer hover:bg-blue-50 p-2 rounded transition-colors ${
                    editingField === "references" ? "bg-blue-100 border border-blue-300" : ""
                  }`}
                  contentEditable={false} // References are complex, edit in form mode
                  suppressContentEditableWarning={true}
                >
                </p>
              )}
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="text-center border-t pt-4 text-xs text-gray-600">www.rsisinternational.org</div>
      </div>
    </div>
  )
}

export default EditingSection
