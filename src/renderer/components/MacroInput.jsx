import React, { useState, useEffect, useRef } from 'react';
import { X, Command } from 'lucide-react';

const MacroInput = ({ isOpen, onClose, onSubmit, currentPath }) => {
    const [macro, setMacro] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const inputRef = useRef(null);

    useEffect(() => {
        if (isOpen && inputRef.current) {
            inputRef.current.focus();
        }
        if (!isOpen) {
            setMacro('');
            setIsSubmitting(false);
        }
    }, [isOpen]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!macro.trim() || isSubmitting) return;

        setIsSubmitting(true);

        try {
            // Create conversation first
            const conversation = await window.api.createConversation({
                title: macro.trim().slice(0, 50),
                type: 'conversation',
                directory_path: currentPath
            });

            // Close modal and switch to conversation immediately
            onClose();
            onSubmit({
                macro: macro.trim(),
                conversationId: conversation.id,
                result: null // Initially no result
            });

            // Then execute command
            const result = await window.api.executeCommand({
                commandstr: macro.trim(),
                conversationId: conversation.id,
                currentPath: currentPath
            });

            // Update with result
            onSubmit({
                macro: macro.trim(),
                conversationId: conversation.id,
                result: result
            });

        } catch (err) {
            console.error('Error creating conversation from macro:', err);
            onClose();
        } finally {
            setIsSubmitting(false);
            setMacro('');
        }
    };



    const handleKeyDown = (e) => {
        if (e.key === 'Escape') {
            e.preventDefault();
            onClose();
        }
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSubmit(e);
        }
    };

    if (!isOpen) return null;

    return (
        <div
            className="fixed inset-0 bg-black/90 flex items-center justify-center z-50"
            onClick={(e) => {
                if (e.target === e.currentTarget) {
                    onClose();
                }
            }}
        >
            <div className="bg-[#111318] rounded w-full max-w-2xl">
                <div className="p-3 flex justify-between items-center border-b border-gray-800/50">
                    <h3 className="text-sm flex items-center gap-2 text-gray-400">
                        <Command size={16} className="text-gray-500" />
                        Command
                    </h3>
                    <button
                        onClick={onClose}
                        className="text-gray-600 hover:text-gray-500"
                    >
                        <X size={18} />
                    </button>
                </div>
                <form onSubmit={handleSubmit} className="p-3">
                    <input
                        ref={inputRef}
                        type="text"
                        value={macro}
                        onChange={(e) => setMacro(e.target.value)}
                        onKeyDown={handleKeyDown}
                        className="w-full bg-[#0b0c0f] text-sm text-gray-300 rounded px-3 py-2
                                 placeholder-gray-600 focus:outline-none border-0"
                        placeholder="Type a command..."
                        disabled={isSubmitting}
                        autoFocus
                    />
                    <div className="mt-2 text-xs text-gray-600">
                        Press Enter to execute, Esc to cancel
                    </div>
                </form>
            </div>
        </div>
    );
};

export default MacroInput;