import React, { useState } from 'react';
import { File, MessageSquarePlus, ListFilter } from 'lucide-react';

const ConversationList = ({ conversations, onConversationSelect, activeConversationId }) => {
    const [selectedConvos, setSelectedConvos] = useState(new Set());
    const [contextMenuPos, setContextMenuPos] = useState(null);

    const handleClick = (conv, e) => {
        e.preventDefault();
        e.stopPropagation();

        if (e.ctrlKey || e.metaKey) {
            const newSelected = new Set(selectedConvos);
            if (newSelected.has(conv.id)) {
                newSelected.delete(conv.id);
            } else {
                newSelected.add(conv.id);
            }
            setSelectedConvos(newSelected);
        } else {
            setSelectedConvos(new Set([conv.id]));
            onConversationSelect(conv.id);
        }
    };

    const handleContextMenu = (e) => {
        e.preventDefault();
        e.stopPropagation();
        setContextMenuPos({ x: e.clientX, y: e.clientY });
    };

    // Close context menu when clicking outside
    const handleClickOutside = (e) => {
        if (contextMenuPos) {
            setContextMenuPos(null);
        }
    };

    // Add click outside listener
    React.useEffect(() => {
        document.addEventListener('click', handleClickOutside);
        return () => document.removeEventListener('click', handleClickOutside);
    }, [contextMenuPos]);

    return (
        <div onContextMenu={handleContextMenu} className="relative">
            {conversations.map((conv) => (
                <button
                    key={conv.id}
                    onClick={(e) => handleClick(conv, e)}
                    onContextMenu={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        if (!selectedConvos.has(conv.id)) {
                            setSelectedConvos(new Set([conv.id]));
                        }
                        setContextMenuPos({ x: e.clientX, y: e.clientY });
                    }}
                    className={`flex items-center gap-2 px-2 py-1 w-full hover:bg-gray-800 text-left
                        ${selectedConvos.has(conv.id) ? 'bg-gray-700' : ''}
                        ${activeConversationId === conv.id ? 'border-l-2 border-blue-500' : ''}`}
                >
                    <File size={16} className="text-gray-400" />
                    <div className="flex flex-col">
                        <span className="text-sm truncate">
                            {conv.title || conv.id}
                        </span>
                        <span className="text-xs text-gray-500">
                            {new Date(conv.timestamp).toLocaleString()}
                        </span>
                    </div>
                </button>
            ))}

            {contextMenuPos && (
                <div
                    className="fixed bg-gray-900 border border-gray-700 rounded shadow-lg py-1 z-50"
                    style={{
                        top: contextMenuPos.y,
                        left: contextMenuPos.x
                    }}
                >
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            console.log('Summarize selected:', Array.from(selectedConvos));
                            setContextMenuPos(null);
                        }}
                        className="flex items-center gap-2 px-4 py-2 hover:bg-gray-800 w-full text-left"
                    >
                        <MessageSquarePlus size={16} />
                        <span>Summarize Selected ({selectedConvos.size})</span>
                    </button>
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            console.log('Custom aggregation for:', Array.from(selectedConvos));
                            setContextMenuPos(null);
                        }}
                        className="flex items-center gap-2 px-4 py-2 hover:bg-gray-800 w-full text-left"
                    >
                        <ListFilter size={16} />
                        <span>Custom Aggregation...</span>
                    </button>
                </div>
            )}
        </div>
    );
};

export default ConversationList;