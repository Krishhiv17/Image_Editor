import React, { useState, useRef, useEffect } from 'react'

interface DraggableTextBoxProps {
    initialText?: string
    initialX?: number
    initialY?: number
    initialWidth?: number
    initialFontSize?: number
    initialColor?: string
    initialFontFamily?: string
    onUpdate: (config: TextConfig) => void
    onRemove: () => void
}

export interface TextConfig {
    text: string
    x: number
    y: number
    width: number
    fontSize: number
    color: string
    fontFamily: string
    bold: boolean
    italic: boolean
    underline: boolean
}

export default function DraggableTextBox({
    initialText = '',
    initialX = 100,
    initialY = 100,
    initialWidth = 300,
    initialFontSize = 32,
    initialColor = '#FFFFFF',
    initialFontFamily = 'Arial',
    onUpdate,
    onRemove
}: DraggableTextBoxProps) {
    const [text, setText] = useState(initialText)
    const [x, setX] = useState(initialX)
    const [y, setY] = useState(initialY)
    const [width, setWidth] = useState(initialWidth)
    const [height, setHeight] = useState(100)
    const [fontSize, setFontSize] = useState(initialFontSize)
    const [color, setColor] = useState(initialColor)
    const [fontFamily, setFontFamily] = useState(initialFontFamily)
    const [bold, setBold] = useState(false)
    const [italic, setItalic] = useState(false)
    const [underline, setUnderline] = useState(false)
    const [isDragging, setIsDragging] = useState(false)
    const [isResizing, setIsResizing] = useState(false)
    const [resizeStart, setResizeStart] = useState({ x: 0, y: 0, width: 0, height: 0 })
    const [dragStart, setDragStart] = useState({ x: 0, y: 0, boxX: 0, boxY: 0 })
    const [isFocused, setIsFocused] = useState(false)

    const boxRef = useRef<HTMLDivElement>(null)
    const textareaRef = useRef<HTMLTextAreaElement>(null)

    // Update parent whenever config changes
    useEffect(() => {
        onUpdate({
            text,
            x,
            y,
            width,
            fontSize,
            color,
            fontFamily,
            bold,
            italic,
            underline
        })
    }, [text, x, y, width, fontSize, color, fontFamily, bold, italic, underline, height])

    const handleBoxMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
        // Only drag if clicking the box background, not the textarea
        if (e.target === boxRef.current) {
            e.preventDefault()
            setIsDragging(true)
            setDragStart({
                x: e.clientX,
                y: e.clientY,
                boxX: x,
                boxY: y
            })
        }
    }

    const handleResizeMouseDown = (e: React.MouseEvent) => {
        e.stopPropagation()
        e.preventDefault()
        setIsResizing(true)
        setResizeStart({
            x: e.clientX,
            y: e.clientY,
            width,
            height
        })
    }

    useEffect(() => {
        const handleMouseMove = (e: MouseEvent) => {
            if (isDragging) {
                const deltaX = e.clientX - dragStart.x
                const deltaY = e.clientY - dragStart.y
                setX(dragStart.boxX + deltaX)
                setY(dragStart.boxY + deltaY)
            } else if (isResizing) {
                const deltaX = e.clientX - resizeStart.x
                const deltaY = e.clientY - resizeStart.y
                setWidth(Math.max(100, resizeStart.width + deltaX))
                setHeight(Math.max(50, resizeStart.height + deltaY))
            }
        }

        const handleMouseUp = () => {
            setIsDragging(false)
            setIsResizing(false)
        }

        if (isDragging || isResizing) {
            window.addEventListener('mousemove', handleMouseMove)
            window.addEventListener('mouseup', handleMouseUp)
            return () => {
                window.removeEventListener('mousemove', handleMouseMove)
                window.removeEventListener('mouseup', handleMouseUp)
            }
        }
    }, [isDragging, isResizing, dragStart, resizeStart, x, y, width, height])

    return (
        <div
            ref={boxRef}
            className={`absolute ${isFocused ? 'border-2 border-blue-500' : ''}`}
            style={{
                left: `${x}px`,
                top: `${y}px`,
                width: `${width}px`,
                height: `${height}px`,
                cursor: isDragging ? 'grabbing' : 'grab'
            }}
            onMouseDown={handleBoxMouseDown}
            onClick={() => setIsFocused(true)}
        >
            {/* Corner Resize Handle - Bottom Right */}
            {isFocused && (
                <div
                    className="absolute right-0 bottom-0 w-4 h-4 bg-blue-500 cursor-nwse-resize hover:bg-blue-600"
                    onMouseDown={handleResizeMouseDown}
                    style={{ borderRadius: '0 0 4px 0' }}
                />
            )}

            {/* Text Input */}
            <textarea
                ref={textareaRef}
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="Click to type..."
                className="w-full h-full bg-transparent border-none outline-none resize-none p-2"
                style={{
                    color,
                    fontSize: `${fontSize}px`,
                    fontFamily,
                    fontWeight: bold ? 'bold' : 'normal',
                    fontStyle: italic ? 'italic' : 'normal',
                    textDecoration: underline ? 'underline' : 'none',
                    textShadow: '0 0 4px rgba(0,0,0,0.8)',
                    cursor: 'text'
                }}
                onClick={(e) => {
                    e.stopPropagation()
                    setIsFocused(true)
                }}
                onFocus={() => setIsFocused(true)}
                onBlur={(e) => {
                    // Keep focused if clicking toolbar
                    const relatedTarget = e.relatedTarget as HTMLElement
                    if (!boxRef.current?.contains(relatedTarget)) {
                        setTimeout(() => setIsFocused(false), 100)
                    }
                }}
            />

            {/* Toolbar - Only visible when focused */}
            {isFocused && (
                <div className="absolute -top-10 left-0 flex gap-1 bg-gray-800 rounded-t-lg p-1 shadow-lg">
                    {/* Color Picker */}
                    <input
                        type="color"
                        value={color}
                        onChange={(e) => setColor(e.target.value)}
                        className="w-8 h-8 rounded border-none cursor-pointer"
                        title="Text Color"
                        onClick={(e) => e.stopPropagation()}
                    />

                    {/* Font Size */}
                    <input
                        type="number"
                        value={fontSize}
                        onChange={(e) => setFontSize(Math.max(8, Math.min(200, parseInt(e.target.value) || 32)))}
                        className="w-12 px-1 text-xs rounded bg-gray-700 text-white border-none"
                        title="Font Size"
                        min="8"
                        max="200"
                        onClick={(e) => e.stopPropagation()}
                    />

                    <button
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={(e) => {
                            e.stopPropagation()
                            setBold(!bold)
                            textareaRef.current?.focus()
                        }}
                        className={`px-2 py-1 text-xs rounded ${bold ? 'bg-blue-500 text-white' : 'bg-gray-700 text-gray-300'} hover:bg-blue-400`}
                        title="Bold"
                    >
                        <strong>B</strong>
                    </button>
                    <button
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={(e) => {
                            e.stopPropagation()
                            setItalic(!italic)
                            textareaRef.current?.focus()
                        }}
                        className={`px-2 py-1 text-xs rounded ${italic ? 'bg-blue-500 text-white' : 'bg-gray-700 text-gray-300'} hover:bg-blue-400`}
                        title="Italic"
                    >
                        <em>I</em>
                    </button>
                    <button
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={(e) => {
                            e.stopPropagation()
                            setUnderline(!underline)
                            textareaRef.current?.focus()
                        }}
                        className={`px-2 py-1 text-xs rounded ${underline ? 'bg-blue-500 text-white' : 'bg-gray-700 text-gray-300'} hover:bg-blue-400`}
                        title="Underline"
                    >
                        <u>U</u>
                    </button>
                    <button
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={(e) => {
                            e.stopPropagation()
                            onRemove()
                        }}
                        className="px-2 py-1 text-xs rounded bg-red-500 text-white hover:bg-red-600"
                        title="Delete"
                    >
                        ✕
                    </button>
                </div>
            )}
        </div>
    )
}
