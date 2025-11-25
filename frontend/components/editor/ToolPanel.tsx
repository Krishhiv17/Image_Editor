import React from 'react'

interface ToolPanelProps {
    activeTab: 'view' | 'crop' | 'resize' | 'filter' | 'rotate'
    onTabChange: (tab: string) => void
    onRotate: (degrees: number) => void
    onCrop: () => void
    onResize: () => void
    onFilter: (filterId: string) => void
    adjustments?: { [key: string]: number }
    onAdjustmentChange?: (type: string, value: number) => void
    onCompareStart?: () => void
    onCompareEnd?: () => void
    onApply: () => void
    onReset: () => void
    onUndo: () => void
    onRevert: () => void
    canUndo: boolean
    canApply: boolean
    isSaving?: boolean
    onSave: () => void
}

export default function ToolPanel({
    activeTab,
    onTabChange,
    onRotate,
    onCrop,
    onResize,
    onFilter,
    adjustments,
    onAdjustmentChange,
    onCompareStart,
    onCompareEnd,
    onApply,
    onReset,
    onUndo,
    onRevert,
    canUndo,
    canApply,
    isSaving,
    onSave
}: ToolPanelProps) {
    const [selectedFilter, setSelectedFilter] = React.useState<string | null>(null)
    const [intensity, setIntensity] = React.useState<number>(1.0)

    const filters = [
        { id: 'none', name: 'None' },
        { id: 'grayscale', name: 'Grayscale' },
        { id: 'sepia', name: 'Sepia' },
        { id: 'vignette', name: 'Vignette' },
        { id: 'blur', name: 'Blur' },
        { id: 'sharpness', name: 'Sharpen' },
        { id: 'brightness', name: 'Brightness' },
        { id: 'contrast', name: 'Contrast' },
        { id: 'saturation', name: 'Saturation' },
        { id: 'exposure', name: 'Exposure' },
        { id: 'temperature', name: 'Temperature' },
        { id: 'tint', name: 'Tint' }
    ]

    const handleFilterClick = (filterId: string) => {
        if (filterId === 'none') {
            onFilter('none')
            return
        }

        setSelectedFilter(filterId)
        // Set default intensity based on type
        let defaultVal = 1.0
        if (filterId === 'blur') defaultVal = 0.5
        if (filterId === 'sharpen') defaultVal = 1.5
        if (filterId === 'brightness') defaultVal = 1.1
        if (filterId === 'contrast') defaultVal = 1.1
        if (filterId === 'exposure') defaultVal = 1.1

        // Temp/Tint are centered at 0
        if (filterId === 'temperature') defaultVal = 0.0
        if (filterId === 'tint') defaultVal = 0.0

        setIntensity(defaultVal)
        // Legacy filter handling - not used anymore
    }


    const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const val = parseFloat(e.target.value)
        setIntensity(val)
        // Legacy filter handling - not used anymore
    }

    // Determine range based on filter
    const getRange = (filterId: string) => {
        // Zero-based filters (0.0 to 1.0)
        if (['blur', 'sepia', 'grayscale', 'vignette'].includes(filterId)) {
            return { min: 0, max: 1, step: 0.01 }
        }
        // Multiplicative adjustments (0 to 2, default 1)
        if (['brightness', 'contrast', 'sharpness', 'exposure', 'saturation'].includes(filterId)) {
            return { min: 0, max: 2, step: 0.01 }
        }
        // Temperature/Tint (-1 to 1, default 0)
        if (['temperature', 'tint'].includes(filterId)) {
            return { min: -1, max: 1, step: 0.01 }
        }
        // Default
        return { min: 0, max: 1, step: 0.01 }
    }


    return (
        <div className="h-full flex flex-col bg-white dark:bg-gray-800 border-l border-gray-200 dark:border-gray-700">
            {/* Tabs */}
            <div className="flex border-b border-gray-200 dark:border-gray-700 overflow-x-auto scrollbar-thin">
                {['view', 'crop', 'rotate', 'resize', 'filter'].map((tab) => (
                    <button
                        key={tab}
                        onClick={() => onTabChange(tab)}
                        className={`flex-shrink-0 px-6 py-3 text-sm font-medium capitalize transition-colors ${activeTab === tab
                            ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50 dark:bg-blue-900/20'
                            : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
                            }`}
                    >
                        {tab}
                    </button>
                ))}
            </div>

            {/* Content */}
            <div className="flex-1 p-6 overflow-y-auto">
                {activeTab === 'rotate' && (
                    <div className="space-y-4">
                        <h3 className="text-sm font-medium text-gray-900 dark:text-gray-100">Rotate</h3>
                        <div className="flex gap-2">
                            <button
                                onClick={() => onRotate(-90)}
                                className="flex-1 px-4 py-2 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                            >
                                ↺ -90°
                            </button>
                            <button
                                onClick={() => onRotate(90)}
                                className="flex-1 px-4 py-2 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                            >
                                ↻ +90°
                            </button>
                        </div>
                    </div>
                )}

                {activeTab === 'filter' && (
                    <div className="space-y-6">
                        <div className="space-y-4">
                            <h3 className="text-sm font-medium text-gray-900 dark:text-gray-100">Adjustments</h3>

                            {/* Adjustments List */}
                            <div className="space-y-4">
                                {filters.filter(f => f.id !== 'none').map((filter) => {
                                    const range = getRange(filter.id)
                                    const value = adjustments?.[filter.id] ?? (range.min === -1 ? 0 : range.min + (range.max - range.min) / 2)

                                    return (
                                        <div key={filter.id} className="space-y-2 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                                            <div className="flex items-center justify-between">
                                                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                                    {filter.name}
                                                </label>
                                                <input
                                                    type="number"
                                                    value={value.toFixed(2)}
                                                    onChange={(e) => {
                                                        const numValue = parseFloat(e.target.value)
                                                        if (!isNaN(numValue) && numValue >= range.min && numValue <= range.max) {
                                                            onAdjustmentChange?.(filter.id, numValue)
                                                        }
                                                    }}
                                                    step={range.step}
                                                    min={range.min}
                                                    max={range.max}
                                                    className="w-20 px-2 py-1 text-sm text-right border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                                                />
                                            </div>
                                            <input
                                                type="range"
                                                min={range.min}
                                                max={range.max}
                                                step={range.step}
                                                value={value}
                                                onChange={(e) => onAdjustmentChange?.(filter.id, parseFloat(e.target.value))}
                                                className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer accent-blue-600"
                                            />
                                        </div>
                                    )
                                })}
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === 'crop' && (
                    <div className="text-sm text-gray-500 dark:text-gray-400">
                        Drag the handles on the image to crop.
                    </div>
                )}

                {activeTab === 'resize' && (
                    <div className="text-sm text-gray-500 dark:text-gray-400">
                        Drag the corners of the image to resize.
                    </div>
                )}
            </div>

            {/* Footer Actions */}
            <div className="p-4 border-t border-gray-200 dark:border-gray-700 space-y-3">
                {/* History Controls */}
                <div className="flex gap-2">
                    <button
                        onClick={onUndo}
                        disabled={!canUndo}
                        className="flex-1 px-3 py-2 text-sm bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                        Undo
                    </button>
                    <button
                        onClick={onRevert}
                        disabled={!canUndo}
                        className="flex-1 px-3 py-2 text-sm bg-gray-100 dark:bg-gray-700 text-red-600 dark:text-red-400 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                        Revert All
                    </button>
                </div>

                {/* Apply/Save Controls */}
                <div className="space-y-2">
                    {canApply && (
                        <button
                            onClick={onApply}
                            className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium transition-colors shadow-sm"
                        >
                            Apply {activeTab === 'crop' ? 'Crop' : activeTab === 'rotate' ? 'Rotation' : 'Changes'}
                        </button>
                    )}

                    <div className="flex gap-2">
                        <button
                            onMouseDown={onCompareStart}
                            onMouseUp={onCompareEnd}
                            onMouseLeave={onCompareEnd}
                            onTouchStart={onCompareStart}
                            onTouchEnd={onCompareEnd}
                            className="flex-1 px-4 py-2 bg-gray-800 text-white rounded-lg hover:bg-gray-900 font-medium transition-colors active:scale-95"
                        >
                            Hold for Original
                        </button>
                        <button
                            onClick={onSave}
                            disabled={isSaving}
                            className={`flex - 1 px - 4 py - 2 bg - green - 600 text - white rounded - lg hover: bg - green - 700 font - medium transition - colors ${isSaving ? 'opacity-50 cursor-not-allowed' : ''
                                } `}
                        >
                            {isSaving ? 'Saving...' : 'Save Copy'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    )
}
