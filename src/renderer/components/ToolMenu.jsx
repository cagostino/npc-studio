import React, { useState, useEffect } from 'react';
import {
    Wrench, Loader, ChevronRight, X, Save, Plus, Trash2
} from 'lucide-react';

const ToolMenu = ({ isOpen, onClose, currentPath }) => {
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [tools, setTools] = useState([]);
    const [selectedTool, setSelectedTool] = useState(null);
    const [isGlobal, setIsGlobal] = useState(true);
    const [editedTool, setEditedTool] = useState(null);

    useEffect(() => {
        const loadTools = async () => {
            try {
                setLoading(true);
                setError(null);

                let response;
                if (isGlobal) {
                    response = await window.api.getToolsGlobal();
                } else {
                    response = await window.api.getToolsProject(currentPath);
                }

                // Sort tools alphabetically by name
                const sortedTools = (response.tools || []).sort((a, b) =>
                    (a.tool_name || '').localeCompare(b.tool_name || '')
                );
                setTools(sortedTools);
            } catch (err) {
                console.error('Error loading tools:', err);
                setError(err.message);
            } finally {
                setLoading(false);
            }
        };

        if (isOpen) {
            loadTools();
        }
    }, [isOpen, isGlobal, currentPath]);

    const handleToolSelect = (tool) => {
        setSelectedTool(tool);
        setEditedTool(tool);
    };

    const handleInputChange = (field, value) => {
        setEditedTool(prev => ({
            ...prev,
            [field]: value
        }));
    };

    const handleStepChange = (index, field, value) => {
        setEditedTool(prev => {
            const newSteps = [...prev.steps];
            newSteps[index] = {
                ...newSteps[index],
                [field]: value
            };
            return {
                ...prev,
                steps: newSteps
            };
        });
    };

    const addStep = () => {
        setEditedTool(prev => ({
            ...prev,
            steps: [...(prev.steps || []), { engine: 'natural', code: '' }]
        }));
    };

    const removeStep = (index) => {
        setEditedTool(prev => ({
            ...prev,
            steps: prev.steps.filter((_, i) => i !== index)
        }));
    };

    const addInput = () => {
        setEditedTool(prev => ({
            ...prev,
            inputs: [...(prev.inputs || []), '']
        }));
    };

    const removeInput = (index) => {
        setEditedTool(prev => ({
            ...prev,
            inputs: prev.inputs.filter((_, i) => i !== index)
        }));
    };

    const handleInputValueChange = (index, value) => {
        setEditedTool(prev => {
            const newInputs = [...(prev.inputs || [])];
            newInputs[index] = value;
            return {
                ...prev,
                inputs: newInputs
            };
        });
    };

    const handleSave = async () => {
        try {
            const response = await window.api.saveTool({
                tool: editedTool,
                isGlobal,
                currentPath
            });

            if (response.error) {
                throw new Error(response.error);
            }

            const updatedTools = await (isGlobal
                ? window.api.getToolsGlobal()
                : window.api.getToolsProject(currentPath));

            setTools(updatedTools.tools || []);
            setSelectedTool(editedTool);
        } catch (err) {
            setError(err.message);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-gray-900 rounded-lg shadow-xl w-full max-w-4xl">
                <div className="w-full border-b border-gray-700 p-4 flex justify-between items-center">
                    <h3 className="text-lg font-semibold flex items-center gap-2">
                        <Wrench className="text-blue-400" />
                        Tools
                    </h3>
                    <div className="flex items-center gap-4">
                        <button
                            onClick={() => setIsGlobal(!isGlobal)}
                            className="bg-blue-500 text-white px-4 py-2 rounded"
                        >
                            {isGlobal ? 'Switch to Project Tools' : 'Switch to Global Tools'}
                        </button>
                        <button onClick={onClose} className="text-gray-400 hover:text-white">
                            <X size={24} />
                        </button>
                    </div>
                </div>

                <div className="flex">
                    <div className="w-1/3 border-r border-gray-700">
                        <div className="p-4 border-b border-gray-700">
                            <button
                                onClick={() => {
                                    setSelectedTool({
                                        tool_name: 'new_tool',
                                        description: '',
                                        inputs: [],
                                        steps: [{ engine: 'natural', code: '' }]
                                    });
                                    setEditedTool({
                                        tool_name: 'new_tool',
                                        description: '',
                                        inputs: [],
                                        steps: [{ engine: 'natural', code: '' }]
                                    });
                                }}
                                className="flex items-center gap-2 w-full p-2 bg-blue-600 hover:bg-blue-500 rounded"
                            >
                                <Plus size={16} />
                                <span>New Tool</span>
                            </button>
                        </div>
                        <div className="overflow-y-auto max-h-[600px]">
                            {loading ? (
                                <div className="flex items-center justify-center p-8">
                                    <Loader className="animate-spin text-blue-400" />
                                </div>
                            ) : error ? (
                                <div className="text-red-400 p-4 text-center">
                                    {error}
                                </div>
                            ) : (
                                <div className="space-y-2 p-2">
                                    {tools.length > 0 ? tools.map((tool) => (
                                        <button
                                            key={tool.tool_name}
                                            onClick={() => handleToolSelect(tool)}
                                            className={`flex items-center gap-2 w-full p-2 rounded hover:bg-gray-800 transition-colors ${
                                                selectedTool?.tool_name === tool.tool_name ? 'bg-gray-700' : ''
                                            }`}
                                        >
                                            <Wrench size={16} className="text-blue-400" />
                                            <span className="flex-1 text-left">
                                                {tool.tool_name}
                                            </span>
                                            <ChevronRight size={16} className="text-gray-500" />
                                        </button>
                                    )) : (
                                        <div className="text-gray-500 text-sm p-2">
                                            No tools found
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="w-2/3 p-4">
                        {selectedTool ? (
                            <div>
                                <div className="flex justify-between items-center mb-4">
                                    <h2 className="text-xl font-bold flex items-center gap-2">
                                        <Wrench size={24} className="text-blue-400" />
                                        <input
                                            className="bg-gray-800 px-2 py-1 rounded"
                                            value={editedTool.tool_name}
                                            onChange={(e) => handleInputChange('tool_name', e.target.value)}
                                        />
                                    </h2>
                                    <button
                                        onClick={handleSave}
                                        className="flex items-center gap-2 bg-green-600 hover:bg-green-700 px-4 py-2 rounded"
                                    >
                                        <Save size={16} />
                                        Save Changes
                                    </button>
                                </div>

                                <div className="mb-4">
                                    <label className="block text-sm font-semibold text-gray-400 mb-2">Description</label>
                                    <textarea
                                        className="w-full bg-gray-800 p-2 rounded font-mono text-sm"
                                        value={editedTool.description || ''}
                                        onChange={(e) => handleInputChange('description', e.target.value)}
                                        rows={3}
                                        placeholder="Enter tool description..."
                                    />
                                </div>

                                <div className="mb-4">
                                    <div className="flex justify-between items-center mb-2">
                                        <label className="text-sm font-semibold text-gray-400">Inputs</label>
                                        <button
                                            onClick={addInput}
                                            className="flex items-center gap-1 text-sm text-blue-400 hover:text-blue-300"
                                        >
                                            <Plus size={16} />
                                            Add Input
                                        </button>
                                    </div>
                                    <div className="space-y-2">
                                        {(editedTool.inputs || []).map((input, index) => (
                                            <div key={index} className="flex items-center gap-2">
                                                <input
                                                    className="flex-1 bg-gray-800 p-2 rounded font-mono text-sm"
                                                    value={input}
                                                    onChange={(e) => handleInputValueChange(index, e.target.value)}
                                                    placeholder="Input name"
                                                />
                                                <button
                                                    onClick={() => removeInput(index)}
                                                    className="text-red-400 hover:text-red-300 p-2"
                                                >
                                                    <Trash2 size={16} />
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                <div className="space-y-4">
                                    <div className="flex justify-between items-center">
                                        <h3 className="text-sm font-semibold text-gray-400">Steps</h3>
                                        <button
                                            onClick={addStep}
                                            className="flex items-center gap-1 text-sm text-blue-400 hover:text-blue-300"
                                        >
                                            <Plus size={16} />
                                            Add Step
                                        </button>
                                    </div>
                                    {editedTool.steps?.map((step, index) => (
                                        <div key={index} className="space-y-2 p-4 bg-gray-800 rounded">
                                            <div className="flex justify-between items-center">
                                                <h4 className="text-sm font-medium text-gray-300">Step {index + 1}</h4>
                                                <button
                                                    onClick={() => removeStep(index)}
                                                    className="text-red-400 hover:text-red-300"
                                                >
                                                    <X size={16} />
                                                </button>
                                            </div>
                                            <select
                                                className="w-full bg-gray-900 p-2 rounded font-mono text-sm"
                                                value={step.engine}
                                                onChange={(e) => handleStepChange(index, 'engine', e.target.value)}
                                            >
                                                <option value="natural">Natural</option>
                                                <option value="python">Python</option>
                                            </select>
                                            <textarea
                                                className="w-full bg-gray-900 p-2 rounded font-mono text-sm"
                                                value={step.code}
                                                onChange={(e) => handleStepChange(index, 'code', e.target.value)}
                                                rows={5}
                                                placeholder={`Enter ${step.engine} code...`}
                                            />
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ) : (
                            <div className="flex items-center justify-center h-full text-gray-500">
                                <span>Select a tool to view details</span>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ToolMenu;