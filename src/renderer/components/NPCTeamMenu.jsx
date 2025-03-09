import React, { useState, useEffect } from 'react';
import {
    Bot, Loader, ChevronRight, X, Save
} from 'lucide-react';

const NPCTeamMenu = ({ isOpen, onClose, currentPath, startNewConversation}) => {  // Add currentPath here
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [npcs, setNpcs] = useState([]);
    const [selectedNpc, setSelectedNpc] = useState(null);
    const [isGlobal, setIsGlobal] = useState(true);
    const [editedNpc, setEditedNpc] = useState(null);

    //console.log(startNewConversation);

    const handleChatWithNpc = () => {
        if (selectedNpc) {
            // Trigger the start new conversation function from parent and pass the NPC details
            startNewConversation(selectedNpc);
            // close the current menu
            onClose();
        }
    };

    useEffect(() => {
        const loadNPCTeam = async () => {
            try {
                setLoading(true);
                setError(null);

                if (isGlobal) {
                    const response = await window.api.getNPCTeamGlobal();
                    setNpcs(response.npcs || []);
                } else {
                    // Use the currentPath prop passed from ChatInterface
                    console.log('Using current path:', currentPath);
                    const response = await window.api.getNPCTeamProject(currentPath);
                    setNpcs(response.npcs || []);
                }
            } catch (err) {
                console.error('Error loading NPC team:', err);
                setError(err.message);
            } finally {
                setLoading(false);
            }
        };

    if (isOpen) {
        loadNPCTeam();
    }
    }, [isOpen, isGlobal]);


    const handleNPCSelect = (npc) => {
        setSelectedNpc(npc);
        setEditedNpc(npc);
        console.log('Selected NPC:', npc);
    };


    const handleInputChange = (field, value) => {
        setEditedNpc(prev => ({
            ...prev,
            [field]: value
        }));
    };


    const handleSave = async () => {
        try {
            const response = await window.api.saveNPC({
                npc: editedNpc,
                isGlobal,
                currentPath
            });

            if (response.error) {
                throw new Error(response.error);
            }

            // Refresh the NPC list
            const updatedNpcs = await (isGlobal
                ? window.api.getNPCTeamGlobal()
                : window.api.getNPCTeamProject(currentPath));

            setNpcs(updatedNpcs.npcs || []);
            setSelectedNpc(editedNpc);
        } catch (err) {
            setError(err.message);
        }
    };


    const toggleNpcType = () => {
        setIsGlobal((prev) => !prev);
        setSelectedNpc(null);
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-gray-900 rounded-lg shadow-xl w-full max-w-4xl">
                <div className="w-full border-b border-gray-700 p-4 flex justify-between items-center">
                    <h3 className="text-lg font-semibold flex items-center gap-2">
                        <Bot className="text-blue-400" />
                        NPCs
                    </h3>
                    <div className="flex items-center gap-4">
                        <button
                            onClick={toggleNpcType}
                            className="bg-blue-500 text-white px-4 py-2 rounded"
                        >
                            {isGlobal ? 'Switch to Project NPCs' : 'Switch to Global NPCs'}
                        </button>
                        <button
                            onClick={onClose}
                            className="text-gray-400 hover:text-white transition-colors"
                            aria-label="Close menu"
                        >
                            <X size={24} />
                        </button>
                    </div>
                </div>

                <div className="flex">
                    <div className="w-1/3 border-r border-gray-700">
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
                                    {npcs.length > 0 ? npcs.map((npc) => (
                                        <button
                                            key={npc.name}
                                            onClick={() => handleNPCSelect(npc)}
                                            className={`flex items-center gap-2 w-full p-2 rounded hover:bg-gray-800 transition-colors ${selectedNpc?.name === npc.name ? 'bg-gray-700' : ''}`}
                                        >
                                            <Bot size={16} className="text-blue-400" />
                                            <span className="flex-1 text-left">
                                                {npc.name}
                                            </span>
                                            <ChevronRight size={16} className="text-gray-500" />
                                        </button>
                                    )) : (
                                        <div className="text-gray-500 text-sm p-2">
                                            No NPCs found
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="w-2/3 p-4">
                    {selectedNpc ? (
        <div>
            <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold flex items-center gap-2">
                    <Bot size={24} className="text-blue-400" />
                    <input
                        className="bg-gray-800 px-2 py-1 rounded"
                        value={editedNpc.name}
                        onChange={(e) => handleInputChange('name', e.target.value)}
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

            <div className="space-y-4">
                <div>
                    <h3 className="text-sm font-semibold text-gray-400 mb-2">
                        Primary Directive
                    </h3>
                    <textarea
                        className="w-full bg-gray-800 p-2 rounded"
                        value={editedNpc.primary_directive || ''}
                        onChange={(e) => handleInputChange('primary_directive', e.target.value)}
                    />
                </div>
                <div>
                    <h3 className="text-sm font-semibold text-gray-400 mb-2">
                        Model
                    </h3>
                    <input
                        className="w-full bg-gray-800 p-2 rounded"
                        value={editedNpc.model || ''}
                        onChange={(e) => handleInputChange('model', e.target.value)}
                    />
                </div>
                <div>
                    <h3 className="text-sm font-semibold text-gray-400 mb-2">
                        Provider
                    </h3>
                    <input
                        className="w-full bg-gray-800 p-2 rounded"
                        value={editedNpc.provider || ''}
                        onChange={(e) => handleInputChange('provider', e.target.value)}
                    />
                </div>
                <div>
                    <h3 className="text-sm font-semibold text-gray-400 mb-2">
                        API URL
                    </h3>
                    <input
                        className="w-full bg-gray-800 p-2 rounded"
                        value={editedNpc.api_url || ''}
                        onChange={(e) => handleInputChange('api_url', e.target.value)}
                    />
                </div>
                <div>
                    <h3 className="text-sm font-semibold text-gray-400 mb-2">
                        Use Global Tools
                    </h3>
                    <select
                        className="w-full bg-gray-800 p-2 rounded"
                        value={editedNpc.use_global_tools ?? true}
                        onChange={(e) => handleInputChange('use_global_tools', e.target.value === 'true')}
                    >
                        <option value="true">True</option>
                        <option value="false">False</option>
                    </select>
                </div>
                <div>

                    <button
                        className="bg-blue-500 text-white px-4 py-2 rounded"
                        onClick={handleChatWithNpc}
                        >  Chat with {editedNpc.name}</button>
                </div>

            </div>
        </div>
    ) : (
        <div className="flex items-center justify-center h-full text-gray-500">
            <span>Select an NPC to view details</span>
        </div>
    )}


                    </div>
                </div>
            </div>
        </div>
    );
};

export default NPCTeamMenu;