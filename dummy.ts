import React, { useState, useEffect, useRef } from 'react';
import {
    Folder,
    File,
    ChevronDown,
    ChevronRight,
    Settings,
    Edit,
    // Terminal, // Uncomment if used
    Image,
    Trash,
    Users,
    Plus,
    ArrowUp,
    Camera,
    MessageSquare,
    // ListFilter, // Uncomment if used
    X,
    Wrench,
    Paperclip // Added Paperclip for consistency
} from 'lucide-react';
import MacroInput from './MacroInput';
import ConversationList from './ConversationList'; // Assuming this component exists and renders conversations
import SettingsMenu from './SettingsMenu';
import NPCTeamMenu from './NPCTeamMenu';
import PhotoViewer from './PhotoViewer';
import ToolMenu from './ToolMenu';
import ReactMarkdown from 'react-markdown';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { materialDark } from 'react-syntax-highlighter/dist/esm/styles/prism';
import remarkGfm from 'remark-gfm';

// Import CSS - Make sure the path is correct relative to this file
import '../../index.css';

const generateId = () => {
    return Math.random().toString(36).substr(2, 9);
};

const normalizePath = (path) => {
    if (!path) return '';
    // Replace backslashes with forward slashes for consistency
    return path.replace(/\\/g, '/');
};

const ChatInterface = () => {
    // --- State Variables ---
    const [isEditingPath, setIsEditingPath] = useState(false);
    const [editedPath, setEditedPath] = useState('');
    const [isHovering, setIsHovering] = useState(false);
    const [settingsOpen, setSettingsOpen] = useState(false);
    const [photoViewerOpen, setPhotoViewerOpen] = useState(false);
    const [photoViewerType, setPhotoViewerType] = useState('images');
    const [selectedConvos, setSelectedConvos] = useState(new Set());
    const [contextMenuPos, setContextMenuPos] = useState(null);
    const [currentPath, setCurrentPath] = useState('');
    const [folderStructure, setFolderStructure] = useState({});
    const [expandedFolders, setExpandedFolders] = useState(new Set()); // Initialize appropriately
    const [activeConversationId, setActiveConversationId] = useState(null);
    const [messages, setMessages] = useState([]);
    const [macroText, setMacroText] = useState('');
    const [currentModel, setCurrentModel] = useState(null);
    const [currentNPC, setCurrentNPC] = useState(null);
    // const [conversations, setConversations] = useState([]); // Replaced by directoryConversations
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [config, setConfig] = useState(null);
    const [currentConversation, setCurrentConversation] = useState(null); // Holds details of the active convo
    const [npcTeamMenuOpen, setNpcTeamMenuOpen] = useState(false);
    const [toolMenuOpen, setToolMenuOpen] = useState(false);
    const [uploadedFiles, setUploadedFiles] = useState([]);
    const [imagePreview, setImagePreview] = useState(null); // For drag/drop preview only? Consider removing if redundant
    const [availableModels, setAvailableModels] = useState([]);
    const [modelsLoading, setModelsLoading] = useState(false);
    const [modelsError, setModelsError] = useState(null);
    const [isDarkMode, setIsDarkMode] = useState(true);
    const [isMacroInputOpen, setIsMacroInputOpen] = useState(false);
    const [baseDir, setBaseDir] = useState('');
    const [promptModal, setPromptModal] = useState({ isOpen: false, title: '', message: '', defaultValue: '', onConfirm: null });
    const [directoryConversations, setDirectoryConversations] = useState([]); // Conversations for the current directory

    // --- Refs ---
    const screenshotHandlingRef = useRef(false);
    const activeConversationRef = useRef(null);
    // const chatContainerRef = useRef(null); // Uncomment if needed
    const listenersAttached = useRef(false);


    // --- Effects ---

    // Update active conversation ref
    useEffect(() => {
        activeConversationRef.current = activeConversationId;
    }, [activeConversationId]);

    // Apply theme class to body
    useEffect(() => {
        if (isDarkMode) {
            document.body.classList.add('dark-mode');
            document.body.classList.remove('light-mode');
        } else {
            document.body.classList.add('light-mode');
            document.body.classList.remove('dark-mode');
        }
    }, [isDarkMode]);

    // Listen for macro input trigger
    useEffect(() => {
        const cleanup = window.api?.onShowMacroInput(() => {
            setIsMacroInputOpen(true);
            setMacroText('');
        });
        return cleanup; // Ensure cleanup function is returned if window.api exists
    }, []);

     // Load initial theme preference
     useEffect(() => {
        const savedTheme = localStorage.getItem('theme');
        if (savedTheme) {
          const isDark = savedTheme === 'dark';
          setIsDarkMode(isDark);
        }
        // Apply initial theme classes in the theme effect above
      }, []);

    // Fetch available models when path or config changes
    useEffect(() => {
        const fetchModels = async () => {
            if (!currentPath || !window.api?.getAvailableModels) {
                setAvailableModels([]);
                setCurrentModel(null); // Clear model if path/API invalid
                return;
            }
            setModelsLoading(true);
            setModelsError(null);
            try {
                const response = await window.api.getAvailableModels(currentPath);
                if (response?.models && Array.isArray(response.models)) {
                    setAvailableModels(response.models);
                    const currentModelIsValid = response.models.some(m => m.value === currentModel);
                    const configModelIsValid = response.models.some(m => m.value === config?.model);
                    if (!currentModel || !currentModelIsValid) {
                         if (config?.model && configModelIsValid) setCurrentModel(config.model);
                         else if (response.models.length > 0) setCurrentModel(response.models[0].value);
                         else setCurrentModel(null);
                    }
                } else { throw new Error(response?.error || "Invalid model response"); }
            } catch (err) {
                console.error('Error fetching available models:', err);
                setModelsError(err.message);
                setAvailableModels([]);
                setCurrentModel(config?.model || null); // Fallback
            } finally {
                setModelsLoading(false);
            }
        };
        fetchModels();
    }, [currentPath, config?.model]); // Rerun when path or base config model changes

    // Initialization: Get config, set base path, load initial structure
    useEffect(() => {
        const init = async () => {
            setLoading(true);
            try {
                const loadedConfig = await window.api.getDefaultConfig();
                if (!loadedConfig || !loadedConfig.baseDir) throw new Error('Invalid config: baseDir missing');
                setConfig(loadedConfig);
                setBaseDir(loadedConfig.baseDir);
                setCurrentPath(loadedConfig.baseDir); // Set initial path
                // Trigger initial data load via the path change effect below
            } catch (err) {
                console.error('Initialization error:', err);
                setError(err.message);
                setLoading(false); // Ensure loading stops on error
            }
            // Loading state will be managed by directory/convo loading now
        };
        init();
    }, []); // Run only once on mount

    // Load directory structure and conversations when path changes
    useEffect(() => {
        if (currentPath) {
            const loadData = async () => {
                setLoading(true); // Set loading true when path changes
                setError(null); // Clear previous errors
                try {
                    await loadDirectoryStructure(currentPath); // This now also calls loadConversations
                } catch (err) {
                    // Error is set inside loadDirectoryStructure
                    // setError(err.message); // Keep error state updated
                } finally {
                    setLoading(false); // Set loading false after data is loaded or fails
                }
            };
            loadData();
        } else {
            // Handle case where currentPath becomes null/empty (e.g., invalid config)
             setFolderStructure({});
             setDirectoryConversations([]);
             setLoading(false);
        }
    }, [currentPath]); // Run whenever currentPath changes


    // Attach stream listeners (runs once if config.stream is true)
    useEffect(() => {
        if (config?.stream && !listenersAttached.current && window.api) {
            const handleStreamData = (_, chunk) => {
                try {
                    const cleanedChunk = chunk.replace(/^data: /, '').trim();
                    if (!cleanedChunk || cleanedChunk === '[DONE]') return;
                    const parsedChunk = JSON.parse(cleanedChunk);
                    if (parsedChunk.choices?.length > 0) {
                        const content = parsedChunk.choices[0].delta?.content;
                        if (content) {
                            setMessages(prev => {
                                if (prev.length === 0) return prev; // Should not happen if placeholder added
                                const lastMessage = prev[prev.length - 1];
                                if (lastMessage?.role === 'assistant') {
                                    // Append content to the last assistant message
                                    return [...prev.slice(0, -1), { ...lastMessage, content: (lastMessage.content || '') + content }];
                                }
                                // If last message isn't assistant, might indicate an issue or start of new response
                                return [...prev, { role: 'assistant', content: content, timestamp: new Date().toISOString(), model: currentModel, npc: currentNPC }];
                            });
                        }
                    }
                } catch (error) { console.error('Error parsing chunk:', error, 'Raw chunk:', chunk); }
            };
            const handleStreamComplete = () => console.log('Stream complete');
            const handleStreamError = (_, error) => {
                console.error('Stream error:', error);
                setMessages(prev => [...prev, { role: 'assistant', content: `Error: ${error}`, timestamp: new Date().toISOString(), type: 'error', model: currentModel, npc: currentNPC }]);
            };

            window.api.onStreamData(handleStreamData);
            window.api.onStreamComplete(handleStreamComplete);
            window.api.onStreamError(handleStreamError);
            listenersAttached.current = true;

            // Cleanup function for listeners
            return () => {
                // Assuming your API provides methods to remove listeners or they are handled internally
                console.log("Cleaning up stream listeners");
                // Example: window.api.removeStreamListeners?.();
                listenersAttached.current = false;
            }
        }
    }, [config?.stream, currentModel, currentNPC]); // Depend on config, model, npc


    // Screenshot handler effect
    useEffect(() => {
        if (!window.api?.onScreenshotCaptured) return;

        const handleScreenshot = async (screenshotPath) => {
            if (screenshotHandlingRef.current) return; // Prevent race condition
            screenshotHandlingRef.current = true;

            try {
                const currentId = activeConversationRef.current;
                // Ensure a conversation exists or create one BEFORE adding the screenshot
                let targetConversationId = currentId;
                if (!targetConversationId) {
                    console.log("No active conversation, creating new one for screenshot...");
                    const newConvo = await createNewConversation(); // createNewConversation should set activeConversationId via state update
                    targetConversationId = newConvo?.id; // Use the ID from the newly created conversation
                }

                if (targetConversationId) {
                    // Ensure the target conversation is actually active in the UI *before* adding the file
                    // This handles the case where createNewConversation was just called
                    if (activeConversationId !== targetConversationId) {
                        await handleConversationSelect(targetConversationId); // Make sure messages area is ready
                    }
                     console.log(`Adding screenshot ${screenshotPath} to conversation ${targetConversationId}`);
                    await addScreenshotToConversation(screenshotPath, targetConversationId);
                } else {
                    console.error("Failed to get or create a conversation ID for screenshot.");
                    setError("Could not determine conversation for screenshot.");
                }
            } catch (error) {
                console.error('Error handling screenshot:', error);
                 setError('Error adding screenshot to conversation.');
            } finally {
                screenshotHandlingRef.current = false;
            }
        };

        const cleanup = window.api.onScreenshotCaptured(handleScreenshot);
        return cleanup; // Return cleanup function
    }, []); // No dependencies needed, relies on ref


    // --- Helper Functions ---

    const loadDirectoryStructure = async (dirPath) => {
        if (!dirPath || !window.api?.readDirectoryStructure) return {}; // Guard clause
        try {
            //console.log('LOAD_DIR: Loading structure for', dirPath); // Debug log
            const structure = await window.api.readDirectoryStructure(dirPath);
            //console.log('LOAD_DIR: Received structure', structure); // Debug log
            setFolderStructure(structure || {}); // Ensure it's an object
            await loadConversations(dirPath); // Load convos for this new directory
            return structure;
        } catch (err) {
            console.error(`Error loading directory structure for ${dirPath}:`, err);
            setError(`Failed to load directory: ${err.message}`);
            setFolderStructure({}); // Reset on error
            setDirectoryConversations([]); // Reset convos on error
            throw err; // Re-throw if needed upstream
        }
    };

    const loadConversations = async (dirPath) => {
         if (!dirPath || !window.api?.getConversations) return; // Guard clause
         try {
             //console.log('LOAD_CONV: Loading conversations for', dirPath); // Debug log
             const response = await window.api.getConversations(dirPath);
             //console.log('LOAD_CONV: Received response', response); // Debug log
             if (response?.conversations && Array.isArray(response.conversations)) {
                 const convos = response.conversations.map(conv => ({
                     id: conv.id,
                     title: conv.preview?.split('\n')[0].trim() || `Conversation ${conv.id.substring(0, 6)}`, // Better fallback title
                     preview: conv.preview || 'No preview available',
                     timestamp: conv.timestamp || new Date().toISOString() // Fallback timestamp
                 })).sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp)); // Sort newest first
                 //console.log('LOAD_CONV: Setting directory conversations', convos); // Debug log
                 setDirectoryConversations(convos);
             } else {
                 //console.log('LOAD_CONV: No valid conversations found, setting empty array'); // Debug log
                 setDirectoryConversations([]); // Set empty if no valid conversations
             }
         } catch (err) {
             console.error(`Error loading conversations for ${dirPath}:`, err);
             setError(`Failed to load conversations: ${err.message}`);
             setDirectoryConversations([]); // Reset on error
         }
     };

    const refreshConversations = async () => {
        if (currentPath) {
            await loadConversations(currentPath); // Just reload conversations for the current path
        }
    };

    const goUpDirectory = async () => {
        if (!currentPath || !window.api?.goUpDirectory || currentPath === baseDir) return; // Prevent going up from base
        try {
            const newPath = await window.api.goUpDirectory(currentPath);
            if (newPath && newPath !== currentPath) { // Only update if path changes
                setCurrentPath(newPath); // This will trigger the useEffect to load data
                setActiveConversationId(null); // Deselect conversation when moving up
                setMessages([]);
                setCurrentConversation(null);
            }
        } catch (err) {
            console.error('Error going up directory:', err);
            setError(err.message);
        }
    };

    const createNewConversation = async () => {
        //console.log("Attempting to create new conversation in:", currentPath); // Debug
        if (!currentPath || !window.api?.createConversation) {
            const errorMsg = "Cannot create conversation: Path or API missing.";
            console.error(errorMsg);
            setError(errorMsg);
            throw new Error(errorMsg);
        }
        try {
            const conversation = await window.api.createConversation({
                title: 'New Conversation', // Default title
                model: currentModel || config?.model || 'default-model', // Ensure a model is passed
                directory_path: currentPath
            });
             //console.log("Created conversation response:", conversation); // Debug
            if (!conversation || !conversation.id) {
                 const errorMsg = "Failed to create conversation or received invalid data.";
                 console.error(errorMsg, conversation);
                 setError(errorMsg)
                 throw new Error(errorMsg);
            }

            await refreshConversations(); // Update the list in the sidebar FIRST
            //console.log("Setting active conversation ID:", conversation.id); // Debug
            setActiveConversationId(conversation.id); // Set state
            setCurrentConversation(conversation); // Store full new conversation object
            setMessages(conversation.messages || []); // Set messages from the new conversation
            setSelectedConvos(new Set([conversation.id])); // Select the new conversation in sidebar

            return conversation; // Return the created conversation object
        } catch (err) {
            console.error('Error creating conversation:', err);
            setError(`Failed to create conversation: ${err.message}`);
            throw err; // Re-throw for potential handling upstream
        }
    };

     const handleConversationSelect = async (conversationId) => {
        if (!conversationId || conversationId === activeConversationId) return; // Don't re-select active
        //console.log('SELECT_CONV: Selecting', conversationId); // Debug
        setActiveConversationId(conversationId);
        setSelectedConvos(new Set([conversationId])); // Ensure single selection visually

        // Find the basic info from the already loaded list
        const selectedConvInfo = directoryConversations.find(conv => conv.id === conversationId);
        setCurrentConversation(selectedConvInfo || { id: conversationId, title: 'Loading...' }); // Set basic info

        setMessages([]); // Clear previous messages immediately
        setLoading(true); // Indicate loading messages
        setError(null);

        try {
            // Fetch detailed messages for the selected conversation
            //console.log('SELECT_CONV: Fetching messages for', conversationId); // Debug
            const detailedMessages = await window.api.getConversationMessages(conversationId);
            //console.log('SELECT_CONV: Received messages', detailedMessages); // Debug

            if (Array.isArray(detailedMessages)) {
                // Format messages as needed by the UI
                 const formattedMsgs = detailedMessages.map(msg => ({
                     role: msg.role || (msg.type === 'user' ? 'user' : 'assistant'), // Infer role if missing
                     content: msg.content || '',
                     timestamp: msg.timestamp || new Date().toISOString(),
                     type: msg.type || 'message', // Infer type
                     model: msg.model,
                     npc: msg.npc,
                     attachments: msg.attachment_data ? [{ // Handle potential attachments from history
                         name: msg.attachment_name || 'attachment',
                         data: `data:${msg.attachment_type || 'image/png'};base64,${msg.attachment_data}`, // Reconstruct data URI
                     }] : (msg.attachments || []), // Use existing attachments array if present
                 }));
                //console.log('SELECT_CONV: Setting messages state'); // Debug
                setMessages(formattedMsgs);
            } else {
                 setMessages([]); // Set empty if response is not an array
                 console.warn("Received non-array message data for conversation:", conversationId);
            }
        } catch (err) {
            console.error(`Error loading messages for conversation ${conversationId}:`, err);
            setError(`Failed to load messages: ${err.message}`);
            setMessages([]); // Clear messages on error
        } finally {
            //console.log('SELECT_CONV: Finished loading, setting loading to false'); // Debug
            setLoading(false); // Stop loading indicator
        }
    };


    const deleteSelectedConversations = async () => {
        const selectedIds = Array.from(selectedConvos);
        if (selectedIds.length === 0 || !window.api?.deleteConversation) return;

        // Optional: Add a confirmation dialog here using a state variable and modal
        // For now, deleting directly:
        //console.log("Deleting conversations:", selectedIds); // Debug

        try {
            await Promise.all(selectedIds.map(id => window.api.deleteConversation(id)));
            // If the active conversation was deleted, reset it
            if (activeConversationId && selectedIds.includes(activeConversationId)) {
                //console.log("Active conversation deleted, resetting view."); // Debug
                setActiveConversationId(null);
                setMessages([]);
                setCurrentConversation(null);
            }
            setSelectedConvos(new Set()); // Clear selection
            await refreshConversations(); // Refresh the list
        } catch (err) {
            console.error('Error deleting conversations:', err);
            setError(`Failed to delete: ${err.message}`);
        }
    };

    const convertFileToBase64 = (file) => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result); // Return the full data URL
            reader.onerror = (error) => reject(error);
            reader.readAsDataURL(file);
        });
    };

    const handleFileUpload = async (files) => {
        const existingFileIds = new Set(uploadedFiles.map(f => f.id)); // Use ID to prevent duplicates from same drop/selection
        const newFilesToAdd = [];

        for (const file of Array.from(files)) {
            const fileId = generateId(); // Generate a unique ID for each file
            if (existingFileIds.has(fileId)) continue; // Should not happen with generateId, but good practice

            try {
                const base64DataUrl = await convertFileToBase64(file); // Get Data URL
                newFilesToAdd.push({
                    id: fileId,
                    name: file.name,
                    type: file.type,
                    base64: base64DataUrl.split(',')[1], // Store only base64 part if needed by backend
                    path: file.path, // Electron provides path
                    size: file.size,
                    preview: base64DataUrl // Use Data URL for preview
                });
            } catch (error) {
                console.error("Error converting file to base64:", file.name, error);
                 setError(`Could not process file: ${file.name}`);
            }
        }

        if (newFilesToAdd.length > 0) {
            setUploadedFiles(prev => [...prev, ...newFilesToAdd]);
        }
    };

    // Drag and Drop Handlers
    const handleDragOver = (e) => {
        e.preventDefault(); // Necessary to allow drop
        setIsHovering(true);
    };
    const handleDragLeave = (e) => {
        // More robust check using relatedTarget
        if (!e.currentTarget.contains(e.relatedTarget)) {
             setIsHovering(false);
         }
    };
    const handleDrop = (e) => {
        e.preventDefault();
        setIsHovering(false);
        const files = e.dataTransfer.files;
        if (files && files.length > 0) {
            handleFileUpload(files); // Reuse the file upload logic
        }
    };
    const handleFileInput = (event) => {
        const files = event.target.files;
        if (files && files.length > 0) {
            handleFileUpload(files);
        }
         // Reset file input value to allow selecting the same file again
        event.target.value = null;
    };


    const handleInputSubmit = async (e) => {
        e.preventDefault();
         if ((!input.trim() && uploadedFiles.length === 0)) {
            //console.log("Submit blocked: No input or files.");
            return;
         }
         if (!activeConversationId) {
            //console.log("Submit blocked: No active conversation.");
            setError("Please select or create a conversation first.");
            return;
         }
         if (!window.api?.executeCommandStream) {
            //console.log("Submit blocked: API missing.");
            setError("API function is not available.");
            return;
         }


        const userMessageContent = input.trim();
        const attachmentsForMessage = [...uploadedFiles]; // Copy current files for this message

        // Create user message object immediately
        const userMessage = {
            role: 'user',
            content: userMessageContent,
            timestamp: new Date().toISOString(),
            type: 'message', // Or 'command' if applicable
            model: 'user', // Indicate user explicitly
            npc: null, // User doesn't have an NPC
            attachments: attachmentsForMessage.map(file => ({ // Store attachment info with the message
                 id: file.id, // Keep ID for potential future reference/removal
                 name: file.name,
                 data: file.preview, // Use preview data URL for display in message history
                 type: file.type,
                 size: file.size
                 // Do NOT send full base64 here unless necessary for display and small
            }))
        };

        // Add user message to UI FIRST
        setMessages(prev => [...prev, userMessage]);
        setInput(''); // Clear input field
        setUploadedFiles([]); // Clear pending uploads


        // Prepare data for the backend API call
        const commandData = {
            commandstr: userMessageContent,
            currentPath: currentPath, // Ensure currentPath is up-to-date
            conversationId: activeConversationId,
            model: currentModel || config?.model || 'default-model', // Ensure a model is selected/defaulted
            npc: currentNPC || config?.npc || 'default-npc', // Ensure NPC context is included
            attachments: attachmentsForMessage.map(file => ({ // Send necessary info to backend
                name: file.name,
                path: file.path, // Electron path is crucial for backend access
                // base64: file.base64, // Send base64 only if backend requires it and cannot access path
                type: file.type,
                size: file.size
            }))
        };

        // Add placeholder for assistant response AFTER user message is added
         setMessages(prev => [...prev, {
            role: 'assistant',
            content: '', // Start empty, stream will fill it
            timestamp: new Date().toISOString(),
            type: 'message',
            model: commandData.model, // Reflect model being used
            npc: commandData.npc      // Reflect NPC being used
        }]);


        try {
             //console.log("Executing command stream with data:", commandData); // Debug
            // Call the streaming API
            await window.api.executeCommandStream(commandData);
             // Stream handlers (in useEffect) will update the placeholder message content
             //console.log("Command stream execution started."); // Debug
        } catch (err) {
            console.error('Error executing command stream:', err);
            setError(`Command execution failed: ${err.message}`);
            // Update the last message (placeholder) to show the error
             setMessages(prev => {
                 if (prev.length === 0) return prev;
                 const lastMessage = prev[prev.length - 1];
                 // Make sure the last message is the placeholder we added
                 if (lastMessage.role === 'assistant' && lastMessage.content === '') {
                     return [...prev.slice(0, -1), { ...lastMessage, content: `Error: ${err.message}`, type: 'error' }];
                 }
                 // If placeholder wasn't the last message (unexpected), add a new error message
                 console.error("Placeholder message mismatch when handling error.");
                 return [...prev, { role: 'assistant', content: `Error: ${err.message}`, timestamp: new Date().toISOString(), type: 'error', model: commandData.model, npc: commandData.npc }];
             });
        }
    };


    const addScreenshotToConversation = async (screenshotPath, conversationId) => {
        if (!screenshotPath || !conversationId) {
             console.error("addScreenshotToConversation called with invalid args", screenshotPath, conversationId);
             return;
        }
        const normalizedPath = normalizePath(screenshotPath);
        const filename = normalizedPath.split('/').pop();

        // Prepare a file-like object for the upload handler
        const simulatedFile = {
             id: generateId(),
             name: filename,
             path: normalizedPath, // Critical for backend
             type: 'image/png', // Assume PNG
             size: 0, // Size might be unknown here
             preview: `file://${normalizedPath}` // Use file protocol for local preview
        };

        // Ensure we're adding to the *intended* conversation if it's not the active one
        if(activeConversationId !== conversationId) {
             console.warn(`Switching to conversation ${conversationId} to add screenshot.`);
             await handleConversationSelect(conversationId); // Switch first
             // Need to wait for state update potentially? May need a small delay or check.
             // await new Promise(resolve => setTimeout(resolve, 50)); // Hacky, avoid if possible
        }

        // Set this as the *only* uploaded file for the next message
        setUploadedFiles([simulatedFile]);

        // Pre-fill the input field
        setInput(`Describe this screenshot: ${filename}`);

        // DO NOT auto-submit here.
    };

    const startNewConversationWithNpc = async (npc) => { // Added this function back from original code
        try {
            const newConversation = await createNewConversation(); // assume createNewConversation creates a new, empty conversation
            setCurrentNPC(npc.name); // Set this NPC for the new conversation
            setCurrentConversation(newConversation);
            setActiveConversationId(newConversation.id);

            // Optionally, append an initial message if NPCs have specific role or intro
            setMessages([{
                role: 'assistant',
                content: `Starting conversation with ${npc.name}.`,
                timestamp: new Date().toISOString(),
                npc: npc.name,
                model: currentModel // Include model info
            }]);
        } catch (error) {
            console.error('Error starting conversation with NPC:', error);
            setError(error.message);
        }
    };

    const toggleTheme = () => { // Added this function back from original code
        const newTheme = !isDarkMode;
        setIsDarkMode(newTheme);
        localStorage.setItem('theme', newTheme ? 'dark' : 'light');
        // Theme class applied via useEffect
      };

    const handleImagesClick = () => { // Added this function back from original code
        setPhotoViewerType('images');
        setPhotoViewerOpen(true);
    };

    const handleScreenshotsClick = () => { // Added this function back from original code
        setPhotoViewerType('screenshots');
        setPhotoViewerOpen(true);
    };


    const handleOpenNpcTeamMenu = () => setNpcTeamMenuOpen(true);
    const handleCloseNpcTeamMenu = () => setNpcTeamMenuOpen(false);

    // --- Rendering Functions ---

    const toggleFolder = (path) => {
        setExpandedFolders((prev) => {
            const newSet = new Set(prev);
            if (newSet.has(path)) newSet.delete(path);
            else newSet.add(path);
            return newSet;
        });
    };

    // Renders folders recursively
    const renderFolderStructure = (structure, currentLevelPath = '') => {
        if (!structure || typeof structure !== 'object') return null;
        const basePath = currentLevelPath || baseDir;

        return Object.entries(structure).map(([name, content]) => {
            const fullPath = normalizePath(basePath ? `${basePath}/${name}` : name);
            // Assume it's a folder if it's an object and doesn't have a known file/convo identifier
            const isFolder = content && typeof content === 'object' && !content.conversation_id && name !== '__files__'; // Adjust condition as needed

            if (isFolder) {
                const isExpanded = expandedFolders.has(fullPath);
                return (
                    <div key={`folder-${fullPath}`}>
                        <button
                            onClick={(e) => { e.stopPropagation(); toggleFolder(fullPath); }}
                            onDoubleClick={async (e) => {
                                e.stopPropagation();
                                if (fullPath !== currentPath) { setCurrentPath(fullPath); }
                            }}
                            className="flex items-center gap-2 px-2 py-1 w-full hover:bg-gray-800 text-left rounded"
                            title={`Path: ${fullPath}`}
                        >
                            {isExpanded ? <ChevronDown size={16} className="flex-shrink-0" /> : <ChevronRight size={16} className="flex-shrink-0" />}
                            <Folder size={16} className="text-blue-400 flex-shrink-0" />
                            <span className="truncate">{name}</span>
                        </button>
                        {isExpanded && content && typeof content === 'object' && (
                            <div className="ml-4 pl-2 border-l border-gray-700">
                                {renderFolderStructure(content, fullPath)}
                            </div>
                        )}
                    </div>
                );
            }
            return null; // Skip non-folder items here
        });
    };

     // Render conversations separately after folders
     const renderConversations = () => {
         if (!directoryConversations || directoryConversations.length === 0) return null;
        return (
            <div className="mt-4 border-t border-gray-700 pt-2">
                <div className="px-4 py-1 text-xs text-gray-500 uppercase tracking-wider font-semibold">
                    Conversations ({directoryConversations.length})
                </div>
                 {/* Removed nested div, apply overflow directly */}
                {directoryConversations.map((conv) => {
                    const isSelected = selectedConvos?.has(conv.id);
                    const isActive = activeConversationId === conv.id;
                    return (
                        <button
                            key={conv.id}
                            onClick={(e) => {
                                if (e.ctrlKey || e.metaKey) {
                                    const newSelected = new Set(selectedConvos);
                                    if (newSelected.has(conv.id)) newSelected.delete(conv.id);
                                    else newSelected.add(conv.id);
                                    setSelectedConvos(newSelected);
                                } else { handleConversationSelect(conv.id); }
                            }}
                            onContextMenu={(e) => {
                                e.preventDefault();
                                if (!selectedConvos?.has(conv.id)) { setSelectedConvos(new Set([conv.id])); }
                                setContextMenuPos({ x: e.clientX, y: e.clientY });
                            }}
                            className={`flex items-center gap-2 px-4 py-2 w-full hover:bg-gray-800 text-left rounded-lg transition-colors duration-150 group relative ${isSelected ? 'bg-gray-700' : ''} ${isActive ? 'border-l-2 border-blue-500 pl-[14px]' : ''} `}
                            title={conv.preview}
                        >
                            <File size={16} className="text-gray-400 flex-shrink-0" />
                            <div className="flex flex-col overflow-hidden flex-1">
                                <span className="text-sm truncate font-medium">{conv.title || conv.id}</span>
                                <span className="text-xs text-gray-500 truncate">
                                    {new Date(conv.timestamp).toLocaleString(undefined, { dateStyle: 'short', timeStyle: 'short' })}
                                </span>
                            </div>
                        </button>
                    );
                })}
            </div>
        );
    };


    // Context Menu Implementation (Using your original logic structure)
    const renderContextMenuPos = () => {
        if (!contextMenuPos) return null;
        const count = selectedConvos?.size || 0;
        const selectedIds = Array.from(selectedConvos || new Set());

        const handleSummarizeAndStart = async () => {
            if (selectedIds.length === 0) return;
            setContextMenuPos(null); // Close menu
             try {
                const convosContent = await Promise.all(selectedIds.map(id => window.api.getConversationMessages(id)));
                 const summaryCommand = `Here are ${selectedIds.length} conversation${selectedIds.length > 1 ? 's' : ''}, please summarize them concisely for context: ...`; // Your prompt here using convosContent
                 const summaryResult = await window.api.executeCommand({ commandstr: summaryCommand, currentPath: currentPath, conversationId: null });
                 if (!summaryResult?.output) throw new Error('Failed to generate summary');
                 const summaryConvo = await createNewConversation(); // Create new convo
                 setInput(summaryResult.output); // Set summary as input for user to send
                 // You might want to automatically send it or add it as first assistant message depending on desired UX
                 // Example: await handleInputSubmit({ preventDefault: () => {} });
             } catch (err) { console.error('Error creating summary & start:', err); setError(err.message); }
             setSelectedConvos(new Set());
         };

        const handleSummarizeAndDraft = async () => {
            if (selectedIds.length === 0) return;
            setContextMenuPos(null);
             try {
                 // Similar logic to fetch content and generate summary
                 const convosContent = await Promise.all(selectedIds.map(id => window.api.getConversationMessages(id)));
                 const summaryCommand = `Summarize these conversations: ...`; // Your prompt
                 const summaryResult = await window.api.executeCommand({ commandstr: summaryCommand, currentPath: currentPath, conversationId: null });
                 if (!summaryResult?.output) throw new Error('Failed to generate summary');
                 const summaryConvo = await createNewConversation(); // Create new convo
                 setInput(summaryResult.output); // Set summary as DRAFT in input box
                 setMessages([]); // Clear messages for the new draft convo
                 // await refreshConversations(); // Already done in createNewConversation
             } catch (err) { console.error('Error creating summary draft:', err); setError(err.message); }
             setSelectedConvos(new Set());
         };

         const handleSummarizeAndPrompt = async () => {
            if (selectedIds.length === 0) return;
            setContextMenuPos(null);
             try {
                 // Generate summary as before
                 const convosContent = await Promise.all(selectedIds.map(id => window.api.getConversationMessages(id)));
                 const summaryCommand = `Summarize these conversations: ...`; // Your prompt
                 const summaryResult = await window.api.executeCommand({ commandstr: summaryCommand, currentPath: currentPath, conversationId: null });
                 if (!summaryResult?.output) throw new Error('Failed to generate summary');

                 // Open the prompt modal
                 setPromptModal({
                     isOpen: true,
                     title: 'Modify Summary',
                     message: 'Review and modify the summary before starting the conversation:',
                     defaultValue: summaryResult.output,
                     onConfirm: async (userModifiedSummary) => {
                         if (userModifiedSummary) {
                             const summaryConvo = await createNewConversation(); // Create new convo
                             setInput(userModifiedSummary); // Set modified summary as input
                             // Optionally auto-submit: await handleInputSubmit({ preventDefault: () => {} });
                         }
                     }
                 });
             } catch (err) { console.error('Error in summary prompt:', err); setError(err.message); }
             setSelectedConvos(new Set());
         };

        return (
            <div
                className="fixed bg-gray-950 border border-gray-700 rounded-md shadow-xl py-1 z-50 text-sm" // Darker bg, more shadow
                style={{ top: contextMenuPos.y, left: contextMenuPos.x }}
                onMouseLeave={() => setContextMenuPos(null)} // Close on mouse leave
            >
                <button disabled={count === 0} onClick={handleSummarizeAndStart} className="flex items-center gap-3 px-4 py-2 hover:bg-gray-800 w-full text-left disabled:opacity-50 disabled:cursor-not-allowed transition-colors"><MessageSquare size={14} /><span>Summarize & Start ({count})</span></button>
                <button disabled={count === 0} onClick={handleSummarizeAndDraft} className="flex items-center gap-3 px-4 py-2 hover:bg-gray-800 w-full text-left disabled:opacity-50 disabled:cursor-not-allowed transition-colors"><Edit size={14} /><span>Summarize & Draft ({count})</span></button>
                <button disabled={count === 0} onClick={handleSummarizeAndPrompt} className="flex items-center gap-3 px-4 py-2 hover:bg-gray-800 w-full text-left disabled:opacity-50 disabled:cursor-not-allowed transition-colors"><MessageSquare size={14} /><span>Summarize & Prompt ({count})</span></button>
                 <div className="border-t border-gray-700 my-1 mx-2"></div>
                 <button disabled={count === 0} onClick={() => { deleteSelectedConversations(); setContextMenuPos(null); }} className="flex items-center gap-3 px-4 py-2 hover:bg-red-900 text-red-400 w-full text-left disabled:opacity-50 disabled:cursor-not-allowed transition-colors"><Trash size={14} /><span>Delete ({count})</span></button>
            </div>
        );
    };


    const renderMessageContent = (content) => {
        if (!content) return null; // Handle null/undefined content

        // More robust check for likely HTML (presence of <tag> structure)
        // Still not foolproof, but better than basic check. Consider a sanitizer library if input is untrusted.
        const containsHtml = /<([a-z][a-z0-9]*)\b[^>]*>.*?<\/\1>/i.test(content);

        if (containsHtml) {
            // WARNING: Still potentially unsafe without sanitization.
            return <div className="prose prose-sm prose-invert max-w-none break-words" dangerouslySetInnerHTML={{ __html: content }} />;
        }

        // Process with ReactMarkdown and SyntaxHighlighter
        return (
            <ReactMarkdown
                className="prose prose-sm prose-invert max-w-none break-words" // Apply prose styles for markdown
                components={{
                    code({ node, inline, className, children, ...props }) {
                        const match = /language-(\w+)/.exec(className || '');
                        const codeText = String(children).replace(/\n$/, ''); // Trim trailing newline

                        if (inline) {
                            return <code className="px-1 py-0.5 bg-gray-700 rounded text-sm font-mono" {...props}>{children}</code>;
                        }

                        return match ? (
                            <div className="relative group my-2 text-sm"> {/* Ensure text size consistency */}
                                <SyntaxHighlighter
                                    style={materialDark}
                                    language={match[1]}
                                    PreTag="div"
                                    customStyle={{ margin: 0, borderRadius: '0.25rem', padding: '0.75rem' }} // Adjust padding/margin
                                    codeTagProps={{style: {fontFamily: 'inherit'}}} // Inherit font
                                    {...props}
                                >
                                    {codeText}
                                </SyntaxHighlighter>
                                <button
                                    onClick={(e) => { e.stopPropagation(); navigator.clipboard.writeText(codeText); /* Add visual feedback? */ }}
                                    className="absolute top-1.5 right-1.5 opacity-0 group-hover:opacity-100 bg-gray-600 hover:bg-gray-500 text-white rounded px-2 py-0.5 text-xs transition-opacity"
                                >
                                    Copy
                                </button>
                            </div>
                        ) : (
                            <pre className="bg-gray-800 p-3 rounded my-2 overflow-x-auto text-sm" {...props}>
                                <code className="font-mono">{children}</code>
                            </pre>
                        );
                    },
                    img({node, ...props}) {
                        // Allow images, ensure they don't break layout
                         // Added inline-block for better flow with text potentially
                        return <img className="max-w-full md:max-w-lg h-auto rounded-lg border border-gray-700 my-2 inline-block" {...props} />;
                    },
                    a({node, ...props}) {
                        return <a target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline" {...props} />;
                    }
                }}
                remarkPlugins={[remarkGfm]} // Enable GitHub Flavored Markdown (tables, strikethrough, etc.)
            >
                {content}
            </ReactMarkdown>
        );
    };


    // --- Main Return JSX ---
    return (
        // Outermost container ensures full height flex column
        <div className={`chat-container ${isDarkMode ? 'dark-mode' : 'light-mode'} h-screen flex flex-col bg-gray-900 text-gray-100 font-mono`}>
            {/* Main Row Flex Container takes remaining space */}
            <div className="flex flex-1 h-full overflow-hidden">

                {/* --- Left Panel (Fixed Width) --- */}
                <div className="w-64 border-r border-gray-700 flex flex-col flex-shrink-0 bg-gray-900">
                    {/* Header */}
                    <div className="p-4 border-b border-gray-700 flex items-center justify-between flex-shrink-0">
                        <span className="text-sm font-semibold">NPC Studio</span>
                        <div className="flex gap-2"> {/* Reduced gap */}
                            <button onClick={() => setSettingsOpen(true)} className="p-1.5 bg-gray-700 hover:bg-gray-600 rounded-full transition-all" aria-label="Settings"><Settings size={14} /></button>
                            <button onClick={deleteSelectedConversations} className="p-1.5 hover:bg-gray-800 rounded-full transition-all" aria-label="Delete Selected Conversations"><Trash size={14} /></button>
                            <button onClick={createNewConversation} className="p-1.5 bg-blue-600 hover:bg-blue-500 rounded-full transition-all" aria-label="New Conversation"><Plus size={16} /></button>
                            <button className="p-1.5 rounded-full transition-all bg-gray-700 hover:bg-gray-600" onClick={toggleTheme}>{isDarkMode ? '🌙' : '☀️'}</button>
                        </div>
                    </div>

                    {/* Current Path */}
                    <div className="p-2 border-b border-gray-700 flex items-center gap-1 flex-shrink-0">
                        <button onClick={goUpDirectory} className="p-1.5 hover:bg-gray-800 rounded-full transition-all disabled:opacity-50" title="Go Up" aria-label="Go Up Directory" disabled={!currentPath || currentPath === baseDir}>
                            <ArrowUp size={14} className={(!currentPath || currentPath === baseDir) ? "text-gray-600" : "text-gray-300"} />
                        </button>
                        {isEditingPath ? (
                            <input type="text" value={editedPath} onChange={(e) => setEditedPath(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') { setIsEditingPath(false); if (editedPath !== currentPath) setCurrentPath(editedPath); } else if (e.key === 'Escape') { setIsEditingPath(false); } }} onBlur={() => setIsEditingPath(false)} autoFocus className="text-xs text-gray-300 bg-gray-800 border border-gray-700 rounded px-2 py-1 flex-1 h-7" />
                        ) : (
                            <div onClick={() => { setIsEditingPath(true); setEditedPath(currentPath); }} className="text-xs text-gray-400 overflow-hidden overflow-ellipsis whitespace-nowrap cursor-pointer hover:bg-gray-800 px-2 py-1 rounded flex-1 h-7" title={currentPath}>
                                {currentPath || 'Loading path...'}
                            </div>
                        )}
                    </div>

                    {/* Folder/Convo List (Scrollable) */}
                    {/* This div takes up the remaining space in the left panel */}
                    <div className="flex-1 overflow-y-auto p-1">
                        {loading && !folderStructure && directoryConversations.length === 0 ? ( <div className="p-4 text-gray-500 text-center">Loading...</div> ) : (
                             <>
                                 {renderFolderStructure(folderStructure, currentPath)}
                                 {renderConversations()}
                                 {contextMenuPos && renderContextMenuPos()}
                            </>
                         )}
                         {error && <div className="p-2 text-red-500 text-xs">{error}</div>}
                    </div>

                    {/* Bottom Buttons */}
                    <div className="p-2 border-t border-gray-700 flex-shrink-0">
                        <div className="flex gap-2 justify-center">
                            <button onClick={handleImagesClick} className="p-2 hover:bg-gray-800 rounded-full transition-all" aria-label="View Images"><Image size={16} /></button>
                            <button onClick={handleScreenshotsClick} className="p-2 hover:bg-gray-800 rounded-full transition-all" aria-label="View Screenshots"><Camera size={16} /></button>
                            <button onClick={() => setToolMenuOpen(true)} className="p-2 hover:bg-gray-800 rounded-full transition-all" aria-label="Open Tool Menu"><Wrench size={16} /></button>
                            <button onClick={handleOpenNpcTeamMenu} className="p-2 hover:bg-gray-800 rounded-full transition-all" aria-label="Open NPC Team Menu"><Users size={16} /></button>
                        </div>
                    </div>
                </div>
                {/* --- End Left Panel --- */}


                {/* --- Main Content Area (Takes Remaining Width) --- */}
                {/* This div is the flex container for messages and input */}
                {/* Added h-full and overflow-hidden here */}
                <div className="flex-1 flex flex-col overflow-hidden h-full bg-gray-900">

                     {/* Conditional rendering: Show placeholder or chat content */}
                    {!activeConversationId && !loading ? (
                         // Placeholder when no conversation is active
                         <div className="flex items-center justify-center h-full text-gray-500 p-10 text-center">
                             Select or create a conversation<br/>from the left panel to start chatting.
                         </div>
                    ) : (
                         // Container for chat header, messages, and input
                         <>
                            {/* Header/Debug Info (Stays at top) */}
                            <div className="p-2 border-b border-gray-700 text-xs text-gray-500 flex-shrink-0 flex justify-between items-center">
                                <span className="truncate" title={currentConversation?.title || activeConversationId}>Conv: {currentConversation?.title || activeConversationId || '...'}</span>
                                <span>Msgs: {messages.length}</span>
                                <span className="truncate" title={currentPath}>Path: {currentPath ? `...${currentPath.slice(-30)}` : 'N/A'}</span>
                            </div>

                            {/* Messages Area (Scrollable - Takes available space) */}
                            {/* Added flex-1 here */}
                            <div className="flex-1 overflow-y-auto p-4 space-y-4">
                                {promptModal.isOpen && ( /* Prompt Modal */
                                    <div className="bg-gray-800 p-4 border border-gray-700 rounded-lg mb-4 shadow-lg z-20 relative"> {/* Ensure modal is visible */}
                                       <h3 className="text-lg font-medium mb-2">{promptModal.title}</h3>
                                        <p className="text-gray-400 mb-4">{promptModal.message}</p>
                                        <textarea className="w-full h-48 bg-gray-900 border border-gray-700 rounded p-2 mb-4 text-gray-100 font-mono focus:ring-1 focus:ring-blue-500 focus:border-blue-500" defaultValue={promptModal.defaultValue} id="promptInput" autoFocus />
                                        <div className="flex justify-end gap-2">
                                            <button className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded text-sm font-medium" onClick={() => setPromptModal({ ...promptModal, isOpen: false })}>Cancel</button>
                                            <button className="px-4 py-2 bg-blue-600 hover:bg-blue-500 rounded text-sm font-medium" onClick={() => { const value = document.getElementById('promptInput').value; promptModal.onConfirm?.(value); setPromptModal({ ...promptModal, isOpen: false }); }}>OK</button>
                                        </div>
                                    </div>
                                 )}

                                {loading && messages.length === 0 ? (
                                     <div className="text-center text-gray-500 py-10">Loading messages...</div>
                                ) : messages.length > 0 ? (
                                        messages.map((message, index) => (
                                            // Message rendering structure
                                            <div key={`${message.timestamp}-${index}`} className={`message-item mb-4 flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                                 <div className={`max-w-[85%] md:max-w-[80%] px-1 ${message.role === 'user' ? 'ml-auto' : ''}`}>
                                                     {/* Message Meta */}
                                                     <div className={`flex items-center gap-2 mb-1 text-xs text-gray-500 ${message.role === 'user' ? 'justify-end' : ''}`}>
                                                         <span>{message.role === 'user' ? 'You' : (message.npc || 'Assistant')}</span>
                                                         {message.model && message.model !== 'user' && <span className="truncate max-w-[100px]" title={message.model}>({message.model.split('/').pop()})</span>}
                                                         {message.timestamp && <span>- {new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>}
                                                     </div>
                                                     {/* Message Body */}
                                                     <div className={`convodisplay ${message.role === 'user' ? 'user-message': 'assistant-message'} ${isDarkMode ? 'dark-mode' : 'light-mode'} rounded-lg px-3 py-2 shadow-sm`}>
                                                        {renderMessageContent(message.content)}
                                                         {/* Render attachments saved WITH this message */}
                                                        {message.attachments && message.attachments.length > 0 && (
                                                            <div className="mt-2 flex flex-wrap gap-2 border-t border-gray-600/50 pt-2">
                                                                {message.attachments.map((attachment) => (
                                                                    <div key={attachment.id || attachment.name} className="text-xs bg-gray-800/50 rounded px-2 py-1 inline-flex items-center gap-1" title={attachment.name}>
                                                                        <Paperclip size={12} />
                                                                        <span className="truncate max-w-[150px]">{attachment.name}</span>
                                                                        {/* Display small image preview if data URL exists */}
                                                                        {attachment.data && attachment.data.startsWith('data:image') && (
                                                                            <img src={attachment.data} alt={attachment.name} className="ml-2 max-w-[40px] max-h-[40px] rounded object-cover border border-gray-600" />
                                                                        )}
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        )}
                                                     </div>
                                                 </div>
                                            </div>
                                        ))
                                    ) : (
                                     <div className="text-center text-gray-500 py-10">No messages in this conversation yet.</div>
                                    )
                                }
                                {error && !loading && messages.length === 0 && <div className="p-4 text-red-500 text-sm text-center">{error}</div>}
                            </div>
                            {/* End Messages Area */}


                            {/* --- Input Area (MOVED HERE, last child of flex-col) --- */}
                            {/* REMOVED fixed, bottom-0, left-64, right-0 */}
                            {/* ADDED flex-shrink-0 */}
                            <div className="message-input-container bg-gray-900 border-t border-gray-700 p-3 flex-shrink-0">
                                <div className="w-full max-w-4xl mx-auto"> {/* Increased max-width */}
                                    <div
                                        className={`relative border border-gray-700 rounded-lg transition-all bg-gray-800 ${isHovering ? 'border-blue-500 ring-2 ring-blue-500/50' : 'hover:border-gray-600'}`}
                                        onDragOver={handleDragOver}
                                        onDrop={handleDrop}
                                        onDragEnter={handleDragOver} // Use same handler for enter/over
                                        onDragLeave={handleDragLeave}
                                    >
                                        {/* Drop Overlay */}
                                        <div className={`absolute inset-0 flex items-center justify-center text-center text-gray-400 bg-gray-800 bg-opacity-80 rounded-lg pointer-events-none transition-opacity ${isHovering ? 'opacity-100' : 'opacity-0'}`}>
                                            Drop files to attach
                                        </div>

                                        {/* Form and Uploads Wrapper */}
                                        <div className="p-2">
                                            {/* Uploaded Files Preview Area */}
                                             {uploadedFiles.length > 0 && (
                                                <div className="pb-2 mb-2 flex gap-2 flex-wrap border-b border-gray-700">
                                                    {uploadedFiles.map(file => (
                                                        <div key={file.id} className="relative group" title={file.name}>
                                                            <img src={file.preview || `file://${file.path}`} alt={file.name} className="w-16 h-16 object-cover rounded-md border border-gray-600" />
                                                            <button onClick={() => { setUploadedFiles(prev => prev.filter(f => f.id !== file.id)); }} className="absolute -top-1 -right-1 bg-red-600 text-white rounded-full p-0.5 leading-none opacity-0 group-hover:opacity-100 transition-opacity" aria-label="Remove file">
                                                                <X size={10} />
                                                            </button>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}

                                             {/* Input Form */}
                                            <form onSubmit={handleInputSubmit} className="flex flex-col gap-2">
                                                {/* Top row: Selectors */}
                                                <div className="flex items-center gap-2 flex-wrap">
                                                    <select value={currentModel || ''} onChange={e => setCurrentModel(e.target.value)} className="bg-gray-700 text-xs rounded px-2 py-1 border border-gray-600 focus:outline-none focus:ring-1 focus:ring-blue-500 h-7" disabled={modelsLoading || !!modelsError}>
                                                         {modelsLoading && <option value="">Loading...</option>}
                                                         {modelsError && <option value="">Error</option>}
                                                         {!modelsLoading && !modelsError && availableModels.length === 0 && (<option value="">No models</option>)}
                                                         {!modelsLoading && !modelsError && availableModels.map(model => (<option key={model.value} value={model.value}>{model.display_name}</option>))}
                                                    </select>
                                                    <select value={currentNPC || config?.npc || 'sibiji'} onChange={e => setCurrentNPC(e.target.value)} className="bg-gray-700 text-xs rounded px-2 py-1 border border-gray-600 focus:outline-none focus:ring-1 focus:ring-blue-500 h-7">
                                                        <option value="sibiji">NPC: sibiji</option>
                                                        {/* Add other NPCs dynamically if needed */}
                                                    </select>
                                                </div>
                                                {/* Bottom row: Textarea, Attach, Send */}
                                                <div className="relative flex items-end gap-2">
                                                     <label className="p-2 hover:bg-gray-700 rounded-full cursor-pointer transition-all flex-shrink-0 self-end mb-1" title="Attach file">
                                                         <Paperclip size={18} />
                                                         <input type="file" onChange={handleFileInput} style={{ display: 'none' }} multiple accept="image/*,.pdf,.txt,.md" />
                                                     </label>
                                                    <textarea
                                                        value={input}
                                                        onChange={(e) => setInput(e.target.value)}
                                                        onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleInputSubmit(e); } }}
                                                        placeholder="Type a message or drop files..."
                                                        className="flex-1 bg-[#1f2023] text-sm text-gray-200 rounded-lg pl-3 pr-3 py-2 placeholder-gray-500 focus:outline-none border-0 resize-none min-h-[44px] max-h-[200px] overflow-y-auto" // Adjust heights
                                                        rows={1} // Start with 1 row, auto-expands with content usually
                                                        style={{ height: 'auto' }} // Allow CSS or JS to manage height expansion
                                                    />
                                                    <button type="submit" disabled={!input.trim() && uploadedFiles.length === 0} className="bg-green-600 hover:bg-green-500 text-white rounded px-4 py-2 text-sm font-medium flex items-center disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0 self-end h-[44px]"> {/* Match height */}
                                                        Send
                                                    </button>
                                                </div>
                                            </form>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            {/* --- End Input Area --- */}
                         </>
                     )}
                </div>
                {/* --- End Main Content Area --- */}

            </div>
            {/* End Inner Flex Container */}

            {/* --- Modals/Menus (Positioned globally) --- */}
            <NPCTeamMenu isOpen={npcTeamMenuOpen} onClose={handleCloseNpcTeamMenu} currentPath={currentPath} startNewConversation={startNewConversationWithNpc} />
            <ToolMenu isOpen={toolMenuOpen} onClose={() => setToolMenuOpen(false)} currentPath={currentPath} />
            <SettingsMenu isOpen={settingsOpen} onClose={() => setSettingsOpen(false)} currentPath={currentPath} onPathChange={(newPath) => { setCurrentPath(newPath); }} />
            {isMacroInputOpen && ( <MacroInput isOpen={isMacroInputOpen} currentPath={currentPath} onClose={() => { setIsMacroInputOpen(false); window.api?.hideMacro?.(); }} onSubmit={({macro, conversationId, result}) => { setActiveConversationId(conversationId); setCurrentConversation({ id: conversationId, title: macro.trim().slice(0, 50) }); if (!result) { setMessages([{ role: 'user', content: macro, timestamp: new Date().toISOString(), type: 'command' }, { role: 'assistant', content: 'Processing...', timestamp: new Date().toISOString(), type: 'message' }]); } else { setMessages([{ role: 'user', content: macro, timestamp: new Date().toISOString(), type: 'command' }, { role: 'assistant', content: result?.output || 'No response', timestamp: new Date().toISOString(), type: 'message' }]); } refreshConversations(); }} /> )}
            <PhotoViewer isOpen={photoViewerOpen} onClose={() => setPhotoViewerOpen(false)} type={photoViewerType} />
             {/* Global click listener to close context menu */}
             {contextMenuPos && <div className="fixed inset-0 z-40" onClick={() => setContextMenuPos(null)}></div>}


        </div>
        // --- End Outermost Container ---
    );
};

export default ChatInterface;