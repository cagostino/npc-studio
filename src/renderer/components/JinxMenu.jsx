import React, { useState, useEffect } from 'react';
import {
    Wrench, Loader, ChevronRight, X, Save, Plus, Trash2
} from 'lucide-react';

const JinxMenu = ({ isOpen, onClose, currentPath }) => {
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [jinxs, setJinxs] = useState([]);
    const [selectedJinx, setSelectedJinx] = useState(null);
    const [isGlobal, setIsGlobal] = useState(true);
    const [editedJinx, setEditedJinx] = useState(null);

    useEffect(() => {
        const loadJinxs = async () => {
            try {
                setLoading(true);
                setError(null);

                console.log('Loading jinxs, isGlobal:', isGlobal);
                console.log('Current path:', currentPath);

                let response;
                if (isGlobal) {
                    response = await window.api.getJinxsGlobal();
                } else {
                    response = await window.api.getJinxsProject(currentPath);
                }
                
                console.log('Jinxs response:', response.json);
                
                if (response.error) {
                    throw new Error(response.error);
                }

                // Make sure we're handling the response structure correctly
                const jinxsArray = response.jinxs || [];
                console.log(`Found ${jinxsArray.length} jinxs`);

                // Sort jinxs alphabetically by name
                const sortedJinxs = jinxsArray.sort((a, b) =>
                    (a.jinx_name || '').localeCompare(b.jinx_name || '')
                );
                
                setJinxs(sortedJinxs);
            } catch (err) {
                console.error('Error loading jinxs:', err);
                setError(err.message);
            } finally {
                setLoading(false);
            }
        };

        if (isOpen) {
            loadJinxs();
        }
    }, [isOpen, isGlobal, currentPath]);

    const handleJinxSelect = (jinx) => {
        setSelectedJinx(jinx);
        setEditedJinx(jinx);
    };

    const handleInputChange = (field, value) => {
        setEditedJinx(prev => ({
            ...prev,
            [field]: value
        }));
    };

    const handleStepChange = (index, field, value) => {
        setEditedJinx(prev => {
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
        setEditedJinx(prev => ({
            ...prev,
            steps: [...(prev.steps || []), { engine: 'natural', code: '' }]
        }));
    };

    const removeStep = (index) => {
        setEditedJinx(prev => ({
            ...prev,
            steps: prev.steps.filter((_, i) => i !== index)
        }));
    };

    const addInput = () => {
        setEditedJinx(prev => ({
            ...prev,
            inputs: [...(prev.inputs || []), '']
        }));
    };

    const removeInput = (index) => {
        setEditedJinx(prev => ({
            ...prev,
            inputs: prev.inputs.filter((_, i) => i !== index)
        }));
    };

    const handleInputValueChange = (index, value) => {
        setEditedJinx(prev => {
            const newInputs = [...(prev.inputs || [])];
            newInputs[index] = value;
            return {
                ...prev,
                inputs: newInputs
            };e
        });
    };

    const handleSave = async () => {
        try {
            const response = await window.api.saveJinx({
                jinx: editedJinx,
                isGlobal,
                currentPath
            });

            if (response.error) {
                throw new Error(response.error);
            }

            const updatedJinxs = await (isGlobal
                ? window.api.getJinxsGlobal()
                : window.api.getJinxsProject(currentPath));

            setJinxs(updatedJinxs.jinxs || []);
            setSelectedJinx(editedJinx);
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
                        Jinxs
                    </h3>
                    <div className="flex items-center gap-4">
                        <button
                            onClick={() => setIsGlobal(!isGlobal)}
                            className="bg-blue-500 text-white px-4 py-2 rounded"
                        >
                            {isGlobal ? 'Switch to Project Jinxs' : 'Switch to Global Jinxs'}
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
                                    setSelectedJinx({
                                        jinx_name: 'new_tool',
                                        description: '',
                                        inputs: [],
                                        steps: [{ engine: 'natural', code: '' }]
                                    });
                                    setEditedJinx({
                                        jinx_name: 'new_tool',
                                        description: '',
                                        inputs: [],
                                        steps: [{ engine: 'natural', code: '' }]
                                    });
                                }}
                                className="flex items-center gap-2 w-full p-2 bg-blue-600 hover:bg-blue-500 rounded"
                            >
                                <Plus size={16} />
                                <span>New Jinx</span>
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
                                    {jinxs.length > 0 ? jinxs.map((tool) => (
                                        <button
                                            key={tool.jinx_name}
                                            onClick={() => handleJinxSelect(tool)}
                                            className={`flex items-center gap-2 w-full p-2 rounded hover:bg-gray-800 transition-colors ${
                                                selectedJinx?.jinx_name === tool.jinx_name ? 'bg-gray-700' : ''
                                            }`}
                                        >
                                            <Wrench size={16} className="text-blue-400" />
                                            <span className="flex-1 text-left">
                                                {tool.jinx_name}
                                            </span>
                                            <ChevronRight size={16} className="text-gray-500" />
                                        </button>
                                    )) : (
                                        <div className="text-gray-500 text-sm p-2">
                                            No jinxs found
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="w-2/3 p-4">
                        {selectedJinx ? (
                            <div>
                                <div className="flex justify-between items-center mb-4">
                                    <h2 className="text-xl font-bold flex items-center gap-2">
                                        <Wrench size={24} className="text-blue-400" />
                                        <input
                                            className="bg-gray-800 px-2 py-1 rounded"
                                            value={editedJinx.jinx_name}
                                            onChange={(e) => handleInputChange('jinx_name', e.target.value)}
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
                                        value={editedJinx.description || ''}
                                        onChange={(e) => handleInputChange('description', e.target.value)}
                                        rows={3}
                                        placeholder="Enter Jinx description..."
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
                                        {(editedJinx.inputs || []).map((input, index) => (
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
                                    {editedJinx.steps?.map((step, index) => (
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
                                <span>Select a Jinx to view details</span>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default JinxMenu;