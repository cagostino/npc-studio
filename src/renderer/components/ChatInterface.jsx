import React, { useState, useEffect, useRef } from 'react';
import {
    Folder,
    File,
    ChevronDown,
    ChevronRight,
    Settings,
    Edit,            // Add this
    Terminal,
    Image,
    Trash,
    Users,
    Plus,
    ArrowUp,
    Camera,
    MessageSquare,  // Add this
    ListFilter,
    X,
    Wrench,    // Add this
} from 'lucide-react';
import MacroInput from './MacroInput';
import ConversationList from './ConversationList';
import SettingsMenu from './SettingsMenu';
import NPCTeamMenu from './NPCTeamMenu'; // Add this import
import PhotoViewer from './PhotoViewer'; // Add this import
import ToolMenu from './ToolMenu';

const generateId = () => {
    return Math.random().toString(36).substr(2, 9);
};
// import index  css from the main
import '../../index.css';


const normalizePath = (path) => {
    if (!path) return '';
    // Replace backslashes with forward slashes for consistency
    return path.replace(/\\/g, '/');
};

const ChatInterface = () => {
    const [isEditingPath, setIsEditingPath] = useState(false);
    const [editedPath, setEditedPath] = useState('');
    const [isHovering, setIsHovering] = useState(false);
    const [settingsOpen, setSettingsOpen] = useState(false);
    const [photoViewerOpen, setPhotoViewerOpen] = useState(false);
    const [photoViewerType, setPhotoViewerType] = useState('images'); // 'images' or 'screenshots'
    const [selectedConvos, setSelectedConvos] = useState(new Set());
    const [contextMenuPos, setContextMenuPos] = useState(null);
    const [currentPath, setCurrentPath] = useState('');
    const [folderStructure, setFolderStructure] = useState({});
    const [expandedFolders, setExpandedFolders] = useState(new Set(['Projects']));
    const [activeConversationId, setActiveConversationId] = useState(null);
    const [messages, setMessages] = useState([]);
    const [macroText, setMacroText] = useState('');
    const [currentModel, setCurrentModel] = useState(null);
    const [currentNPC, setCurrentNPC] = useState(null);
    const [conversations, setConversations] = useState([]);
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [config, setConfig] = useState(null);
    const [currentConversation, setCurrentConversation] = useState(null);
    const [npcTeamMenuOpen, setNpcTeamMenuOpen] = useState(false);
    const [toolMenuOpen, setToolMenuOpen] = useState(false);

    const [uploadedFiles, setUploadedFiles] = useState([]); // New state
    const [currentConversationId, setCurrentConversationId] = useState(generateId()); // New state
    const [imagePreview, setImagePreview] = useState(null); // State to hold image preview
    const screenshotHandlingRef = useRef(false);
    const activeConversationRef = useRef(null);

    // Update ref when activeConversationId changes
    useEffect(() => {
        activeConversationRef.current = activeConversationId;
    }, [activeConversationId]);

    const [isDarkMode, setIsDarkMode] = useState(true); // Dark mode state
    const [isMacroInputOpen, setIsMacroInputOpen] = useState(false);
    useEffect(() => {
        // Apply the theme to the body element
        if (isDarkMode) {
            document.body.classList.add('dark-mode');
            document.body.classList.remove('light-mode');
        } else {
            document.body.classList.add('light-mode');
            document.body.classList.remove('dark-mode');
        }
    }, [isDarkMode]);
    const startNewConversationWithNpc = async (npc) => {
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
                npc: npc.name
            }]);
        } catch (error) {
            console.error('Error starting conversation with NPC:', error);
            setError(error.message);
        }
    };


    useEffect(() => {
        // Listen for show-macro-input event from main process
        window.api.onShowMacroInput(() => {
          setIsMacroInputOpen(true);
          setMacroText('');
        });
      }, []);
      const handleMacroSubmit = (e) => {
        e.preventDefault();
        if (macroText.trim()) {
          // Send the command to main process
          window.api.submitMacro(macroText);
          setMacroText('');
          setIsMacroInputOpen(false);
        }
      };

    const handleKeyDown = (e) => {
    if (e.key === 'Escape') {
        setIsMacroInputOpen(false);
        window.electron.hideMacro();
    }
    };
    const createMessage = (role, content, model, npc, type = 'message') => ({
        role,
        content,
        model,
        npc,
        timestamp: new Date().toISOString(),
        type
      });


            // Single initialization useEffect
    const [baseDir, setBaseDir] = useState('');
    const [promptModal, setPromptModal] = useState({
        isOpen: false,
        title: '',
        message: '',
        defaultValue: '',
        onConfirm: null
    });
    const toggleTheme = () => {
        setIsDarkMode((prev) => !prev); // Toggle between light and dark mode
    };

    // Add these handler functions
    const handleImagesClick = () => {
        setPhotoViewerType('images');
        setPhotoViewerOpen(true);
    };
    const handleScreenshotsClick = () => {
        setPhotoViewerType('screenshots');
        setPhotoViewerOpen(true);
    };



// Modify your initialization useEffect
useEffect(() => {
    const init = async () => {
        try {
            setLoading(true);

            // Get config first
            const config = await window.api.getDefaultConfig();
            console.log('Initial config:', config);

            if (!config || !config.baseDir) {
                throw new Error('Invalid config received');
            }

            // Set all config-related state at once
            setConfig(config);
            setBaseDir(config.baseDir);
            setCurrentPath(config.baseDir);
            console.log('Setting base directory:', config.baseDir);

            // Load directory structure after setting path
            console.log('Loading directory structure for:', config.baseDir);
            await loadDirectoryStructure(config.baseDir);

        } catch (err) {
            console.error('Initialization error:', err);
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    init();
}, []);

// Simplify goUpDirectory
const goUpDirectory = async () => {
    try {
        console.log('goUpDirectory clicked');

        if (!currentPath) {
            console.log('No current path - this should not happen');
            return;
        }

        const newPath = await window.api.goUpDirectory(currentPath);
        console.log('Going up from:', currentPath, 'to:', newPath);

        setCurrentPath(newPath);
        await loadDirectoryStructure(newPath);
    } catch (err) {
        console.error('Error in goUpDirectory:', err);
        setError(err.message);
    }
};

// Remove duplicate setCurrentPath calls from other functions
const loadDirectoryStructure = async (dirPath) => {
    try {
        console.log('Loading directory structure for:', dirPath);
        const structure = await window.api.readDirectoryStructure(dirPath);
        setFolderStructure(structure);
        await loadConversations(dirPath);
        return structure;
    } catch (err) {
        console.error('Error loading directory structure:', err);
        setError(err.message);
        return {};
    }
};

    const [directoryConversations, setDirectoryConversations] = useState([]);

    // Add this function to load conversations
    const loadConversationsInDirectory = async (dirPath) => {
        try {
            const conversations = await window.api.getConversationsInDirectory(dirPath);
            setDirectoryConversations(conversations);
        } catch (err) {
            console.error('Error loading conversations:', err);
            setError(err.message);
        }
    };
    const checkServerConnection = async () => {
        try {
            const response = await window.api.checkServerConnection();
            if (response.error) {
                setError('Flask server is not running. Please start the server first.');
                return false;
            }
            return true;
        } catch (err) {
            setError('Cannot connect to Flask server. Please start the server first.');
            return false;
        }
    };
    const handleConversationSelect = async (conversationId) => {
        try {
          console.log('Selecting conversation:', conversationId);
          setActiveConversationId(conversationId);
          console.log('Active conversation ID:', conversationId);

          // Find the current conversation from our list
          const selectedConv = directoryConversations.find(conv => conv.id === conversationId);
          console.log('Selected conversation:', selectedConv);

          if (selectedConv) {
            setMessages(selectedConv.messages || []);
            setCurrentConversation(selectedConv);
          }

          // Load additional messages if available
          console.log('Fetching messages for conversation:', conversationId);
          const response = await window.api.getConversationMessages(conversationId);
          console.log('Raw message response:', response);

          if (response) {
            // If we get additional messages from the API, append them
            const additionalMessages = Array.isArray(response) ? response : [];
            if (additionalMessages.length > 0) {
              const formattedMessages = additionalMessages.map(msg => ({
                role: msg.role || 'assistant',
                content: msg.content || '',
                timestamp: msg.timestamp || new Date().toISOString(),
                type: msg.content?.startsWith('/') ? 'command' : 'message',
                attachments: msg.attachment_data ? [{
                  name: msg.attachment_name,
                  data: `data:image/png;base64,${msg.attachment_data}`,
                }] : [],  // Format the attachment data for images
              }));

              setMessages(prev => [...prev, ...formattedMessages]); // Append new messages
            }
          }
        } catch (err) {
          console.error('Error loading conversation:', err);
          setError(err.message);
        }
      };


      const loadConversations = async (dirPath) => {
        try {
            console.log('Loading conversations for:', dirPath);
            const response = await window.api.getConversations(dirPath);
            console.log('Raw conversations response:', response);

            if (response?.conversations && Array.isArray(response.conversations)) {
                // Use the actual conversation data
                const conversations = response.conversations.map(conv => ({
                    id: conv.id,
                    title: conv.preview?.split(',')[0] || 'No title',
                    preview: conv.preview || 'No preview',
                    timestamp: conv.timestamp
                }));

                console.log('Processed conversations:', conversations);
                setDirectoryConversations(conversations);
            } else {
                console.log('No valid conversations found, setting empty array');
                setDirectoryConversations([]);
            }
        } catch (err) {
            console.error('Error loading conversations:', err);
            setError(err.message);
            setDirectoryConversations([]);
        }
    };
    const forceRefresh = async () => {
        try {
            await loadDirectoryStructure(currentPath);
            await loadConversations(currentPath);
        } catch (err) {
            console.error('Error in force refresh:', err);
            setError(err.message);
        }
    };


    const createNewConversation = async () => {
        try {
            const conversation = await window.api.createConversation({
                title: 'New Conversation',
                model: currentModel || config?.model || 'llama3.2', // Use currentModel, fallback to config, then default
                directory_path: currentPath
            });

            console.log('Created conversation:', conversation);
            await refreshConversations();
            setActiveConversationId(conversation.id);
            setCurrentConversation(conversation);
            setMessages(conversation.messages || []);

            return conversation;
        } catch (err) {
            console.error('Error creating conversation:', err);
            setError(err.message);
            throw err;
        }
    };
    const chatContainerRef = useRef(null);

    const handleDragOver = (e) => {
        e.preventDefault();
        e.currentTarget.classList.add('bg-gray-800/50');
    };

    const handleDragLeave = (e) => {
        e.preventDefault();
        e.currentTarget.classList.remove('bg-gray-800/50');
    };
    const handleDrop = (e) => {
        e.preventDefault();
        const files = e.dataTransfer.files;

        // Check if there are files and if the first file is an image
        if (files && files[0] && files[0].type.startsWith('image/')) {
            const file = files[0];

            // Create an image URL for preview
            const imageUrl = URL.createObjectURL(file);
            setImagePreview(imageUrl);
        }
    };

    const handleFileUpload = async (files) => {
        const existingFileNames = new Set(uploadedFiles.map(f => f.name));
        const newFiles = Array.from(files).filter(file => !existingFileNames.has(file.name));

        const attachmentData = [];
        for (const file of newFiles) {
            const base64 = await convertFileToBase64(file);
            attachmentData.push({
                id: generateId(),
                name: file.name,
                type: file.type,
                base64: base64,  // Make sure this is set
                path: file.path,
                size: file.size // Collect the file size if needed
            });
        }

        if (attachmentData.length > 0) {
            setUploadedFiles(prev => [...prev, ...attachmentData]);
        }
    };


  // Attach stream listeners only once.
  const listenersAttached = useRef(false);
  useEffect(() => {
    if (config?.stream && !listenersAttached.current) {
      const handleStreamData = (_, chunk) => {
        try {
          const cleanedChunk = chunk.replace(/^data: /, '').trim();
          if (!cleanedChunk || cleanedChunk === '[DONE]') return;
          const parsedChunk = JSON.parse(cleanedChunk);
          if (parsedChunk.choices?.length > 0) {
            const content = parsedChunk.choices[0].delta?.content;
            if (content) {
              setMessages(prev => {
                const lastMessage = prev[prev.length - 1];
                if (lastMessage?.role === 'assistant') {
                  return [...prev.slice(0, -1), { ...lastMessage, content: lastMessage.content + content }];
                }
                return prev;
              });
            }
          }
        } catch (error) {
          console.error('Error parsing chunk:', error, 'Raw chunk:', chunk);
        }
      };

      const handleStreamComplete = () => console.log('Stream complete');
      const handleStreamError = (_, error) => {
        console.error('Stream error:', error);
        setMessages(prev => [...prev, {
          role: 'assistant',
          content: `Error: ${error}`,
          timestamp: new Date().toISOString(),
          type: 'error',
          model: currentModel,
          npc: currentNPC
        }]);
      };

      // These functions are assumed to be provided by your Electron contextBridge.
      window.api.onStreamData(handleStreamData);
      window.api.onStreamComplete(handleStreamComplete);
      window.api.onStreamError(handleStreamError);
      listenersAttached.current = true;
    }
  }, [config?.stream, currentModel, currentNPC]);

  const handleInputSubmit = async (e) => {
    e.preventDefault();
    if ((!input.trim() && uploadedFiles.length === 0) || !activeConversationId) return;

    try {
      console.log('config:', config);
      let messageContent = input;

      // Prepare the message with attachments if present
      if (uploadedFiles.length > 0) {
        messageContent = `${input}\n${uploadedFiles.map(file =>
          `<img src="file://${file.path}" alt="${file.name}" class="max-w-md h-auto rounded-lg border border-gray-700" />`
        ).join('')}`;
      }

      // Add user message to the conversation
      setMessages(prev => [...prev, {
        role: 'user',
        content: messageContent,
        timestamp: new Date().toISOString(),
        type: 'command',
        model: 'user',
        npc: currentNPC
      }]);
      setInput('');

      // Prepare attachments data for API call
      const attachmentsData = uploadedFiles.length > 0 ?
        uploadedFiles.map(file => ({
          name: file.name,
          path: file.path,
          // Include base64 data if you have it
          data: file.base64 || null,
          size: file.size || 0,
          type: file.type || 'image/png'
        })) : [];

      setUploadedFiles([]);

      // Use the streaming approach for all requests
      await window.api.executeCommandStream({
        commandstr: input,
        currentPath: currentPath,
        conversationId: activeConversationId,
        model: currentModel || config?.model || 'llama3.2',
        npc: currentNPC || config?.npc || 'sibiji',
        attachments: attachmentsData
      });

      // Add empty assistant message that will be filled by stream
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: '',
        timestamp: new Date().toISOString(),
        type: 'message',
        model: currentModel,
        npc: currentNPC
      }]);
    } catch (err) {
      console.error('Error:', err);
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: `Error: ${err.message}`,
        timestamp: new Date().toISOString(),
        type: 'error',
        npc: currentNPC || config?.npc || 'sibiji',
        model: currentModel
      }]);
    }
  };


    const convertFileToBase64 = (file) => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result.split(',')[1]);
            reader.onerror = (error) => reject(error);
            reader.readAsDataURL(file);
        });
    };

    const renderContextMenuPos = () => {
        return (

    <div
        className="fixed bg-gray-900 border border-gray-700 rounded shadow-lg py-1 z-50"
        style={{
            top: contextMenuPos.y,
            left: contextMenuPos.x
        }}
    >
        <button
            onClick={async () => {
                const selectedIds = Array.from(selectedConvos || new Set());
                if (selectedIds.length === 0) return;

                try {
                    const convosContent = await Promise.all(
                        selectedIds.map(id => window.api.getConversationMessages(id))
                    );

                    const summaryCommand =
                    `Here are ${selectedIds.length} conversation${selectedIds.length > 1 ?
                        's' : ''} please summarize them into a concise summary that can be
                    used to begin a new conversation with another agent:\n\n${
                        convosContent.map((msgs, i) => {
                            return `Conversation ${i + 1}:\n${msgs.map(m =>
                                `${m.role}: ${m.content.replace(/'/g, "\\'").replace(/"/g,
                                '\\"').replace(/`/g, '\\`')}`
                            ).join('\n')}`;
                        }).join('\n\n')
                    }`;

                    const summaryResult = await window.api.executeCommand({
                        commandstr: summaryCommand,
                        currentPath: currentPath,
                        conversationId: null
                    });

                    if (!summaryResult?.output) {
                        throw new Error('Failed to generate summary');
                    }

                    const summaryConvo = await window.api.createConversation({
                        title: 'New Conversation from Summary',
                        type: 'conversation'
                    });

                    const result = await window.api.executeCommand({
                        commandstr: summaryResult.output,
                        currentPath: currentPath,
                        conversationId: summaryConvo.id
                    });

                    setActiveConversationId(summaryConvo.id);
                    setCurrentConversation(summaryConvo);
                    setMessages([
                        {
                            role: 'user',
                            content: summaryResult.output,
                            timestamp: new Date().toISOString(),
                            type: 'message'
                        },
                        {
                            role: 'assistant',
                            content: result.output || 'Processing your message...',
                            timestamp: new Date().toISOString(),
                            type: 'message'
                        }
                    ]);

                    await loadDirectoryStructure(currentPath);
                } catch (err) {
                    console.error('Error creating summary:', err);
                    setError(err.message);
                }
                setContextMenuPos(null);
                setSelectedConvos(new Set());
            }}
            className="flex items-center gap-2 px-4 py-2 hover:bg-gray-800 w-full text-left"
        >
            <MessageSquare size={16} />
            <span>Summarize and Start ({selectedConvos?.size || 0})</span>
        </button>

        <button
            onClick={async () => {
                const selectedIds = Array.from(selectedConvos || new Set());
                if (selectedIds.length === 0) return;

                try {
                    const convosContent = await Promise.all(
                        selectedIds.map(id => window.api.getConversationMessages(id))
                    );

                    const summaryCommand =
                    `Here are ${selectedIds.length} conversation${selectedIds.length > 1 ?
                        's' : ''} please summarize them into a concise summary that can be
                    used to begin a new conversation with another agent:\n\n${
                        convosContent.map((msgs, i) => {
                            return `Conversation ${i + 1}:\n${msgs.map(m =>
                                `${m.role}: ${m.content.replace(/'/g, "\\'").replace(/"/g,
                                '\\"').replace(/`/g, '\\`')}`
                            ).join('\n')}`;
                        }).join('\n\n')
                    }`;

                    const summaryResult = await window.api.executeCommand({
                        commandstr: summaryCommand,
                        currentPath: currentPath,
                        conversationId: null
                    });

                    if (!summaryResult?.output) {
                        throw new Error('Failed to generate summary');
                    }

                    const summaryConvo = await window.api.createConversation({
                        title: 'Draft from Summary',
                        type: 'conversation'
                    });

                    setActiveConversationId(summaryConvo.id);
                    setCurrentConversation(summaryConvo);
                    setInput(summaryResult.output);
                    setMessages([]);

                    await loadDirectoryStructure(currentPath);
                } catch (err) {
                    console.error('Error creating summary draft:', err);
                    setError(err.message);
                }
                setContextMenuPos(null);
                setSelectedConvos(new Set());
            }}
            className="flex items-center gap-2 px-4 py-2 hover:bg-gray-800 w-full text-left"
        >
            <Edit size={16} />
            <span>Summarize and Draft ({selectedConvos?.size || 0})</span>
        </button>

        <button
            onClick={async () => {
                const selectedIds = Array.from(selectedConvos || new Set());
                if (selectedIds.length === 0) return;

                try {
                    const convosContent = await Promise.all(
                        selectedIds.map(id => window.api.getConversationMessages(id))
                    );
                    const summaryCommand =
                    `Here are ${selectedIds.length} conversation${selectedIds.length > 1 ?
                        's' : ''} please summarize them into a concise summary that can be
                    used to begin a new conversation with another agent:\n\n${
                        convosContent.map((msgs, i) => {
                            return `Conversation ${i + 1}:\n${msgs.map(m =>
                                `${m.role}: ${m.content.replace(/'/g, "\\'").replace(/"/g,
                                '\\"').replace(/`/g, '\\`')}`
                            ).join('\n')}`;
                        }).join('\n\n')
                    }`;

                    const summaryResult = await window.api.executeCommand({
                        commandstr: summaryCommand,
                        currentPath: currentPath,
                        conversationId: null
                    });

                    if (!summaryResult?.output) {
                        throw new Error('Failed to generate summary');
                    }

                    setPromptModal({
                        isOpen: true,
                        title: 'Modify Summary',
                        message: 'Review and modify the summary before starting the conversation:',
                        defaultValue: summaryResult.output,
                        onConfirm: async (userModifiedSummary) => {
                            if (userModifiedSummary) {
                                const summaryConvo = await window.api.createConversation({
                                    title: 'New Conversation from Modified Summary',
                                    type: 'conversation'
                                });

                                const result = await window.api.executeCommand({
                                    commandstr: userModifiedSummary,
                                    currentPath: currentPath,
                                    conversationId: summaryConvo.id
                                });

                                setActiveConversationId(summaryConvo.id);
                                setCurrentConversation(summaryConvo);
                                setMessages([
                                    {
                                        role: 'user',
                                        content: userModifiedSummary,
                                        timestamp: new Date().toISOString(),
                                        type: 'message'
                                    },
                                    {
                                        role: 'assistant',
                                        content: result.output || 'Processing your message...',
                                        timestamp: new Date().toISOString(),
                                        type: 'message'
                                    }
                                ]);

                                await loadDirectoryStructure(currentPath);
                                await refreshConversations();
                            }
                        }
                    });

                } catch (err) {
                    console.error('Error in summary prompt:', err);
                    setError(err.message);
                }
                setContextMenuPos(null);
                setSelectedConvos(new Set());
            }}
            className="flex items-center gap-2 px-4 py-2 hover:bg-gray-800 w-full text-left"
        >
            <MessageSquare size={16} />
            <span>Summarize and Prompt ({selectedConvos?.size || 0})</span>
        </button>

</div>
        );

    };



    const displayThumbnails = (attachments) => {
        const newMessages = attachments.map((att) => ({
            id: att.id,
            role: 'assistant',
            content: `<img src="data:${att.type};base64,${att.base64}" alt="${att.name}" class="thumbnail-image" />`,
            timestamp: new Date().toISOString(),
            type: 'image',
            name: att.name,
        }));

        setMessages((prev) => [...prev, ...newMessages]);
    };

    const handleRemoveThumbnail = (id) => {
        setMessages((prev) => prev.filter((msg) => msg.id !== id)); // Remove only image messages
        setUploadedFiles((prev) => prev.filter((file) => file.id !== id)); // Sync uploaded files
    };

    const handleFileInput = (event) => {
        const files = event.target.files;
        if (files.length) {
            handleFileUpload(files);
        }
    };



    const refreshConversations = async () => {
        if (currentPath) {
            await loadConversations(currentPath);
        }
    };
    const addScreenshotToConversation = async (screenshotPath, conversationId) => {
        // Add console.log to track calls
        console.log(`ADDING SCREENSHOT ${screenshotPath} TO CONVERSATION ${conversationId}`);

        const normalizedPath = normalizePath(screenshotPath);
        const newFile = {
            id: generateId(),
            name: normalizedPath.split('/').pop(),
            path: normalizedPath,
            type: 'image/png',
            preview: `file://${normalizedPath}`
        };

        setUploadedFiles([newFile]);  // Replace existing files instead of appending
        setInput('What do you see in this screenshot?');

        const fakeEvent = { preventDefault: () => {} };
        await handleInputSubmit(fakeEvent);
    };


    // Screenshot handler effect
    useEffect(() => {
        if (!window.api) return;

        const handleScreenshot = async (screenshotPath) => {
            // Prevent multiple handling of same screenshot
            if (screenshotHandlingRef.current) {
                console.log('Already handling a screenshot, skipping');
                return;
            }

            screenshotHandlingRef.current = true;
            console.log('Screenshot received:', screenshotPath);

            try {
                const currentId = activeConversationRef.current;
                console.log('Current conversation ID:', currentId);

                if (!currentId) {
                    const newConvo = await createNewConversation();
                    await addScreenshotToConversation(screenshotPath, newConvo.id);
                } else {
                    await addScreenshotToConversation(screenshotPath, currentId);
                }
            } catch (error) {
                console.error('Error handling screenshot:', error);
            } finally {
                screenshotHandlingRef.current = false;
            }
        };

        const cleanup = window.api.onScreenshotCaptured(handleScreenshot);
        return () => {
            cleanup();
            screenshotHandlingRef.current = false;
        };
    }, []); // No dependencies needed

    const toggleFolder = (path) => {
        setExpandedFolders((prev) => {
            const newSet = new Set(prev);
            if (newSet.has(path)) {
                newSet.delete(path);
            } else {
                newSet.add(path);
            }
            return newSet;
        });
    };

    const renderFolderStructure = (structure, path = '') => {
        const entries = [];

        // First render folders
        Object.entries(structure).forEach(([name, content]) => {
            const fullPath = path ? `${path}/${name}` : name;
            const isFolder = content && typeof content === 'object' && !content.conversation_id;

            if (isFolder) {
                const isExpanded = expandedFolders.has(fullPath);
                entries.push(
                    <div key={`folder-${fullPath}`}>
                        <button
                            onClick={() => toggleFolder(fullPath)}
                            onDoubleClick={async () => {
                                console.log('Navigating to:', content.path);
                                setCurrentPath(content.path);
                                await loadDirectoryStructure(content.path);
                            }}
                            className="flex items-center gap-2 px-2 py-1 w-full hover:bg-gray-800 text-left"
                        >
                            {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                            <Folder size={16} className="text-blue-400" />
                            <span>{name}</span>
                        </button>
                        {isExpanded && (
                            <div className="ml-4">
                                {renderFolderStructure(content, fullPath)}
                            </div>
                        )}
                    </div>
                );
            }
        });

    // Inside renderFolderStructure, right before the conversations rendering logic
    if (path === currentPath && directoryConversations?.length > 0) {
        entries.push(
            <div key="conversations-section">
                <div className="px-2 py-1 text-xs text-gray-500">
                    Conversations ({directoryConversations.length})
                </div>
                <ConversationList
                    conversations={directoryConversations}
                    onConversationSelect={handleConversationSelect}
                    activeConversationId={activeConversationId}
                />
            </div>
        );
        }

        return entries;
    };


    const deleteSelectedConversations = async () => {
        const selectedIds = Array.from(selectedConvos);
        if (selectedIds.length === 0) return;

        try {
            // Trigger the delete API for selected conversations
            await Promise.all(
                selectedIds.map(id => window.api.deleteConversation(id)) // Assuming the deleteConversation method exists in window.api
            );
            console.log('Conversations deleted:', selectedIds);
            // Refresh the conversation list
            await loadConversations(currentPath);
        } catch (err) {
            console.error('Error deleting conversations:', err);
            setError(err.message);
        }
        setSelectedConvos(new Set());
    };

    const handleOpenNpcTeamMenu = () => {
        setNpcTeamMenuOpen(true);
    };

    const handleCloseNpcTeamMenu = () => {
        setNpcTeamMenuOpen(false);
    };


    useEffect(() => {
        console.log('directoryConversations changed:', {
            length: directoryConversations?.length,
            isArray: Array.isArray(directoryConversations),
            value: directoryConversations
        });
    }, [directoryConversations]);

    return (
    <div className={`chat-container ${isDarkMode ? 'dark-mode' : 'light-mode'}`}>

        <div className="flex h-screen bg-gray-900 text-gray-100 font-mono">

            <div className="w-64 border-r border-gray-700 flex flex-col">
                {/* Header with New Conversation button */}

                <div className="p-4 border-b border-gray-700 flex items-center justify-between">
                    <span className="text-sm font-semibold">NPC Studio</span>

                    <div className="flex gap-3">

                        <button
                            onClick={() => setSettingsOpen(true)}
                            className="p-2 bg-gray-700 hover:bg-gray-600 rounded-full transition-all"
                            aria-label="Settings"
                        >
                            <Settings size={14} />
                        </button>
                        <button
                            onClick={deleteSelectedConversations}
                            className="p-2 hover:bg-gray-800 rounded-full transition-all"
                            aria-label="Delete Selected Conversations"
                        >
                            <Trash size={14} />
                        </button>


                        <button
                            onClick={createNewConversation}
                            className="p-2 bg-blue-600 hover:bg-blue-500 rounded-full transition-all"
                            aria-label="New Conversation"
                        >
                            <Plus size={18} />
                        </button>

                        <button className="theme-toggle-btn" onClick={toggleTheme}>
                            {isDarkMode ? '🌙' : '☀️'}
                        </button>
                    </div>


                </div>

                {/* Current Path with Up Directory Button */}
                <div className="p-2 border-b border-gray-700 flex items-center gap-2">

    <button
        onClick={goUpDirectory}
        className="p-2 hover:bg-gray-800 rounded-full transition-all"
        title="Go Up"
        aria-label="Go Up Directory"
    >
        <ArrowUp
            size={14}
            className={(!currentPath || currentPath === baseDir) ? "text-gray-600" : "text-gray-300"}
        />
    </button>
    {isEditingPath ? (
        <input
            type="text"
            value={editedPath}
            onChange={(e) => setEditedPath(e.target.value)}
            onKeyDown={(e) => {
                if (e.key === 'Enter') {
                    setIsEditingPath(false);
                    setCurrentPath(editedPath);
                    loadDirectoryStructure(editedPath);
                } else if (e.key === 'Escape') {
                    setIsEditingPath(false);
                }
            }}
            onBlur={() => setIsEditingPath(false)}
            autoFocus
            className="text-xs text-gray-400 bg-gray-800 border border-gray-700 rounded px-2 py-1 flex-1"
        />
    ) : (
        <div
            onClick={() => {
                setIsEditingPath(true);
                setEditedPath(currentPath);
            }}
            className="text-xs text-gray-400 overflow-hidden overflow-ellipsis whitespace-nowrap cursor-pointer hover:bg-gray-800 px-2 py-1 rounded"
        >
            {currentPath}
        </div>
    )}
</div>

                <div className="flex-1 overflow-y-auto">
                    {loading ? (
                        <div className="p-4 text-gray-500">Loading...</div>
                    ) : (
                        <>
                            {renderFolderStructure(folderStructure)}
                            {directoryConversations?.length > 0 && (
                                <div className="mt-4">
                                    <div className="px-4 py-2 text-xs text-gray-500">
                                        Conversations ({directoryConversations.length})
                                    </div>
                                    <div>
                                        {directoryConversations.map((conv) => {
                                            const isSelected = selectedConvos?.has(conv.id);
                                            return (
                                                <button
                                                    key={conv.id}
                                                    onClick={(e) => {
                                                        if (e.ctrlKey || e.metaKey) {
                                                            const newSelected = new Set(selectedConvos || new Set());
                                                            if (newSelected.has(conv.id)) {
                                                                newSelected.delete(conv.id);
                                                            } else {
                                                                newSelected.add(conv.id);
                                                            }
                                                            setSelectedConvos(newSelected);
                                                        } else {
                                                            setSelectedConvos(new Set([conv.id]));
                                                            handleConversationSelect(conv.id);
                                                        }
                                                    }}
                                                    onContextMenu={(e) => {
                                                        e.preventDefault();
                                                        if (!selectedConvos?.has(conv.id)) {
                                                            setSelectedConvos(new Set([conv.id]));
                                                        }
                                                        setContextMenuPos({ x: e.clientX, y: e.clientY });
                                                    }}
                                                    className={`flex items-center gap-2 px-4 py-2 w-full hover:bg-gray-800 text-left rounded-lg transition-all ${
                                                        isSelected ? 'bg-gray-700' : ''
                                                    } ${activeConversationId === conv.id ? 'border-l-2 border-blue-500' : ''}`}
                                                >
                                                    <File size={16} className="text-gray-400" />
                                                    <div className="flex flex-col">
                                                        <span className="text-sm truncate">{conv.title || conv.id}</span>
                                                        <span className="text-xs text-gray-500">
                                                            {new Date(conv.timestamp).toLocaleString()}
                                                        </span>
                                                    </div>
                                                </button>
                                            );
                                        })}
                                        {contextMenuPos && renderContextMenuPos()}
                                    </div>
                                </div>
                            )}
                        </>
                    )}
                </div>
                <div className="p-4 border-t border-gray-700">
    <div className="flex gap-2 justify-center">
    <button
                            onClick={handleImagesClick}
                            className="p-2 hover:bg-gray-800 rounded-full transition-all"
                            aria-label="View Images"
                        >
                            <Image size={16} />
                        </button>
                        <button
                            onClick={handleScreenshotsClick}
                            className="p-2 hover:bg-gray-800 rounded-full transition-all"
                            aria-label="View Screenshots"
                        >
                            <Camera size={16} />
                        </button>
                        <button
                            onClick={() => setToolMenuOpen(true)}
                            className="p-2 hover:bg-gray-800 rounded-full transition-all"
                            aria-label="Open Tool Menu"
                        >
                            <Wrench size={16} />
                        </button>
                        <button
                                onClick={handleOpenNpcTeamMenu} // Open NPC Team Menu on click
                                className="p-2 hover:bg-gray-800 rounded-full transition-all"
                                aria-label="Open NPC Team Menu"
                            >
                                <Users size={16} /> {/* Optional icon representing team */}
                            </button>

    </div>
</div>


            </div>

        <div className={`message-list ${isDarkMode ? 'dark-mode' : 'light-mode'}`}>

            {/* Main Chat Area */}
            <div className="flex-1 flex flex-col p-4">
                {loading && !messages.length ? (
                    <div className="flex items-center justify-center h-full text-gray-500">
                        <span>Loading...</span>
                    </div>
                ) : (
                    <>
                        {/* Debug info */}
                        <div className="p-2 border-b border-gray-700 text-xs text-gray-500">
                            <div>Active Conversation: {activeConversationId ||
                                    createNewConversation().id}</div>

                            <div>Messages Count: {messages.length}</div>
                            <div>Current Path: {currentPath}</div>
                        </div>


                        {/* Messages Area */}
                        <div className="flex-1 overflow-y-auto space-y-4">
                            {promptModal.isOpen && (
                                <div className="bg-gray-800 p-4 border border-gray-700 rounded-lg mb-4">
                                    <h3 className="text-lg font-medium mb-2">{promptModal.title}</h3>
                                    <p className="text-gray-400 mb-4">{promptModal.message}</p>
                                    <textarea
                                        className="w-full h-48 bg-gray-900 border border-gray-700 rounded p-2 mb-4 text-gray-100 font-mono"
                                        defaultValue={promptModal.defaultValue}
                                        id="promptInput"
                                        autoFocus
                                    />
                                    <div className="flex justify-end gap-2">
                                        <button
                                            className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded text-sm"
                                            onClick={() => setPromptModal({ ...promptModal, isOpen: false })}
                                        >
                                            Cancel
                                        </button>
                                        <button
                                            className="px-4 py-2 bg-blue-600 hover:bg-blue-500 rounded text-sm"
                                            onClick={() => {
                                                const value = document.getElementById('promptInput').value;
                                                promptModal.onConfirm?.(value);
                                                setPromptModal({ ...promptModal, isOpen: false });
                                            }}
                                        >
                                            OK
                                        </button>
                                    </div>
                                </div>
                            )}
{activeConversationId ? (
  messages.length > 0 ? (
    messages.map((message, index) => (
      <div key={index} className={`space-y-1 ${message.role === 'user' ? 'ml-auto' : ''}`}>
        <div className="flex items-center gap-2">
          <div className="text-xs text-gray-500">
            {message.role === 'user' ? '$ ' : '> '}
            {message.timestamp && new Date(message.timestamp).toLocaleTimeString()}
            <div>
              {message.model} - {message.npc}
            </div>
          </div>
        </div>
        <div className={`p-2 rounded-lg ${message.role === 'user' ? 'bg-blue-900 text-white' : 'bg-gray-800'}`}>
          <div className="whitespace-pre-wrap font-mono text-sm overflow-x-auto">
            <div dangerouslySetInnerHTML={{ __html: message.content }} />
          </div>

          {/* Render attachments */}
          {message.attachments && message.attachments.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-2">
              {message.attachments.map((attachment, index) => (
                <div key={index} className="text-xs bg-gray-800 rounded px-2 py-1">
                  📎 {attachment.name}
                  {/* Render image attachment if available */}
                  {attachment.data && (
                    <img
                      src={attachment.data}
                      alt={attachment.name}
                      className="mt-2 max-w-[200px] max-h-[200px] rounded-md"
                    />
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    ))
  ) : (
    <div className="text-center text-gray-500">No messages in this conversation</div>
  )
) : (
  <div className="flex items-center justify-center h-full text-gray-500">
    Select a conversation to view messages
  </div>
)}




                        </div>

                        <div className="message-input-container">

                        <div className="fixed bottom-0 left-64 right-0 p-6 bg-gray-900">
    <div className="max-w-5xl mx-auto">


        <div
            className="relative border-2 border-dashed border-gray-600 rounded-lg hover:border-blue-500 transition-all"
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
                handleDrop(e);
                setIsHovering(false);
            }}
            onDragEnter={() => setIsHovering(true)}
            onDragLeave={() => setIsHovering(false)}
        >
            <div className={`absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-center text-gray-400 ${
                isHovering ? 'block' : 'hidden'
            }`}>
                Drop your files here
            </div>


    <form onSubmit={handleInputSubmit} className="relative">
                <textarea
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                            e.preventDefault();
                            handleInputSubmit(e);
                        }
                    }}
                    placeholder="Type a message..."
                    className="w-full bg-[#0b0c0f] text-sm text-gray-300 rounded-lg px-4 py-3
                             placeholder-gray-600 focus:outline-none border-0
                             min-h-[56px] resize-none"
                    rows={1}
                />
        <input
            type="file"
            onChange={handleFileInput}
            style={{ display: 'none' }}
            multiple
            accept="image/*"
        />
        <button
            type="submit"
            disabled={!input.trim() && uploadedFiles.length === 0}
            className="absolute right-3 bottom-2.5 bg-green-600 hover:bg-green-500
                     text-white rounded px-3 py-1.5 text-sm flex items-center gap-2
                     disabled:opacity-50 disabled:cursor-not-allowed"
        >
            Send
        </button>
        <div className="flex items-center gap-2 mb-2">
            <select
                value={currentModel || config?.model}
                onChange={e => setCurrentModel(e.target.value)}
                className="bg-gray-800 text-sm rounded px-2 py-1 border border-gray-700"
            >
                <option value="llama3.2">llama3.2 | ollama (text only) </option>
                <option value="deepseek-v3">deepseek-v3 | ollama (text only) </option>
                <option value="phi4">phi4 | ollama (text only) </option>
                <option value="llama3.3">llama3.3 | ollama  </option>
                <option value="llava7b">llama3. | ollama  </option>
                <option value="gpt-4o-mini">gpt-4o-mini | openai</option>
                <option value="gpt-4o">gpt-4o | openai</option>
                <option value="claude-3-5-haiku-latest">claude-3-5-haiku | anthropic (text only) </option>
                <option value="claude-3-5-sonnet-latest">claude-3-5-sonnet | anthropic </option>
                <option value="gemini-1.5-flash">gemini-1-5-flash | google </option>
                <option value="gemini-2.0-flash">gemini-1-5-flash | google </option>
                <option value="gemini-2.0-flash-lite-preview-02-05">gemini-2.0-flash-lite-preview | google (text only) </option>
                <option value="deepseek-chat">deepseek-chat | deepseek </option>
                <option value="deepseek-chat">deepseek-reasoner | deepseek </option>

            </select>
            <select
                value={currentNPC || config?.npc}
                onChange={e => setCurrentNPC(e.target.value)}
                className="bg-gray-800 text-sm rounded px-2 py-1 border border-gray-700"
            >
                <option value="sibiji">NPC: sibiji </option>

            </select>
        </div>


            </form>
            {uploadedFiles.length > 0 && (
    <div className="p-2 flex gap-2 flex-wrap">
        {uploadedFiles.map(file => (
            <div key={file.id} className="relative">
                <img
                    src={`file://${file.path}`}  // Use the file path directly
                    alt="Screenshot"
                    className="w-24 h-24 object-cover rounded-lg border border-gray-700"
                />
                <button
                    onClick={() => {
                        setUploadedFiles(prev => prev.filter(f => f.id !== file.id));
                    }}
                    className="absolute -top-2 -right-2 bg-red-500 rounded-full p-1"
                >
                    <X size={12} />
                </button>
            </div>
        ))}
    </div>
)}


            {/* Image preview */}
            {imagePreview && (
                <div className="p-2">
                    <img
                        src={imagePreview}
                        alt="Dropped Image"
                        className="w-16 h-16 object-cover rounded-lg border border-gray-600"
                    />
                </div>
            )}
        </div>
    </div>
</div>                        </div>



                    </>
                )}

            </div>


            <NPCTeamMenu
                isOpen={npcTeamMenuOpen}
                onClose={handleCloseNpcTeamMenu}
                currentPath={currentPath}
                startNewConversation={startNewConversationWithNpc}
            />
            <ToolMenu
                isOpen={toolMenuOpen}
                onClose={() => setToolMenuOpen(false)}
                currentPath={currentPath}
            />


            <SettingsMenu
                isOpen={settingsOpen}
                onClose={() => setSettingsOpen(false)}
                currentPath={currentPath}
                onPathChange={(newPath) => {
                    setCurrentPath(newPath);
                }}
            />
{isMacroInputOpen && (
    <MacroInput
        isOpen={isMacroInputOpen}
        currentPath={currentPath}
        onClose={() => {
            setIsMacroInputOpen(false);
            window.api?.hideMacro?.();
        }}
        onSubmit={({macro, conversationId, result}) => {
            // Always switch to the conversation immediately
            setActiveConversationId(conversationId);
            setCurrentConversation({
                id: conversationId,
                title: macro.trim().slice(0, 50)
            });

            if (!result) {
                // Initial submission - show loading state
                setMessages([
                    {
                        role: 'user',
                        content: macro,
                        timestamp: new Date().toISOString(),
                        type: 'command'
                    },
                    {
                        role: 'assistant',
                        content: 'Processing...',
                        timestamp: new Date().toISOString(),
                        type: 'message'
                    }
                ]);
            } else {
                // Update with actual result
                setMessages([
                    {
                        role: 'user',
                        content: macro,
                        timestamp: new Date().toISOString(),
                        type: 'command'
                    },
                    {
                        role: 'assistant',
                        content: result?.output || 'No response',
                        timestamp: new Date().toISOString(),
                        type: 'message'
                    }
                ]);
            }

            // Refresh conversations list
            refreshConversations();
        }}
    />
)}        </div>
    </div>

                        {/* Photo Viewer Modal */}
                        <PhotoViewer
                            isOpen={photoViewerOpen}
                            onClose={() => setPhotoViewerOpen(false)}
                            type={photoViewerType}
                        />
</div>
    );


};

export default ChatInterface;

