import React, { useState, useEffect, useRef } from 'react';
import {
    Folder,
    File,
    ChevronDown,
    ChevronRight,
    Settings,
    Edit,
    Terminal,
    Image,
    Trash,
    Users,
    Plus,
    ArrowUp,
    Camera,
    MessageSquare,
    ListFilter,
    X,
    Wrench,
    FileText,
    Code2,
    FileJson,
    FileCode,

} from 'lucide-react';
import MacroInput from './MacroInput';
import ConversationList from './ConversationList';
import SettingsMenu from './SettingsMenu';
import NPCTeamMenu from './NPCTeamMenu';
import PhotoViewer from './PhotoViewer';
import ToolMenu from './ToolMenu';

const generateId = () => {
    return Math.random().toString(36).substr(2, 9);
};
// import index  css from the main
import '../../index.css';

const HOME_DIR = '/home/caug/.npcsh'


const normalizePath = (path) => {
    if (!path) return '';
    path = path.replace(/\\/g, '/');
    if (path.endsWith('/') && path.length > 1) {
      path = path.slice(0, -1);
    }
    return path;
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
    const [availableModels, setAvailableModels] = useState([]); // <-- New state for models
    const [modelsLoading, setModelsLoading] = useState(false);   // <-- Loading state
    const [modelsError, setModelsError] = useState(null);       // <-- Error state

    const [currentFile, setCurrentFile] = useState(null);
    const [fileContent, setFileContent] = useState('');
    const [isEditing, setIsEditing] = useState(false);
    const [fileChanged, setFileChanged] = useState(false);

    const handleFileClick = async (filePath) => {
    try {

        const response = await window.api.readFileContent(filePath);

        if (response.error) {
        throw new Error(response.error);
        }

        setCurrentFile(filePath);
        setFileContent(response.content);
        setIsEditing(true);
        setFileChanged(false);
        setActiveConversationId(null);
    } catch (err) {
        console.error('Error opening file:', err);
        setError(err.message);
    }
    };

    const loadDirectoryStructure = async (dirPath) => {
        try {
            if (!dirPath) {
                console.error('[Frontend] No directory path provided to loadDirectoryStructure');
                return {};
            }
            console.log(`[Frontend] Requesting structure for: ${dirPath}`); // LOG 6
            const structureResult = await window.api.readDirectoryStructure(dirPath); // Call the modified backend function

            console.log(`[Frontend] Received structure from backend:`, JSON.stringify(structureResult, null, 2)); // LOG 7

            if (structureResult && !structureResult.error) {
                 console.log(`[Frontend] Setting folderStructure state`); // LOG 8
                 setFolderStructure(structureResult);
            } else {
                 console.error('[Frontend] Error received from backend or invalid structure:', structureResult?.error);
                 setFolderStructure({ error: structureResult?.error || 'Failed to load' }); // Set error state
            }

            // Load conversations separately (assuming this works)
            await loadConversations(dirPath);

            return structureResult;
        } catch (err) {
            console.error('[Frontend] Error in loadDirectoryStructure:', err);
            setError(err.message);
            setFolderStructure({ error: err.message }); // Set error state
            return { error: err.message };
        }
    };

    // Add log at the beginning of renderFolderStructure
    const renderFolderStructure = (structure) => {
        // **** CRITICAL LOG ****
        console.log(`[Frontend] renderFolderStructure called with structure:`, JSON.stringify(structure, null, 2)); // LOG 9

        // ... (rest of the LATEST renderFolderStructure function from the previous step - the one with NO expansion logic)
        if (!structure || typeof structure !== 'object' || structure.error) {
            return <div className="p-2 text-xs text-red-500">Error: {structure?.error || 'Failed to load'}</div>;
        }
        if (Object.keys(structure).length === 0) {
            return <div className="p-2 text-xs text-gray-500">Empty directory</div>;
        }

        const entries = [];

        const sortedEntries = Object.entries(structure).sort(([nameA, contentA], [nameB, contentB]) => {
            const typeA = contentA?.type;
            const typeB = contentB?.type;
            if (typeA === 'directory' && typeB !== 'directory') return -1;
            if (typeA !== 'directory' && typeB === 'directory') return 1;
            return nameA.localeCompare(nameB);
        });

        sortedEntries.forEach(([name, content]) => {
            const fullPath = content?.path;
            const isFolder = content?.type === 'directory';
            const isFile = content?.type === 'file';

            if (!fullPath) return;

            if (isFolder) {
                entries.push(
                    <div key={`folder-${fullPath}`}>
                        <button
                            onDoubleClick={() => setCurrentPath(fullPath)}
                            className="flex items-center gap-2 px-2 py-1 w-full hover:bg-gray-800 text-left rounded"
                            title={`Double-click to open ${name}`}
                        >
                            <Folder size={16} className="text-blue-400 flex-shrink-0" />
                            <span className="truncate">{name}</span>
                        </button>
                    </div>
                );
            } else if (isFile) {
                 console.log(`[Frontend] Rendering file item: ${name}`); // LOG 10
                const fileIcon = getFileIcon(name);
                entries.push(
                    <div key={`file-${fullPath}`}>
                        <button
                            onClick={() => handleFileClick(fullPath)}
                            className="flex items-center gap-2 px-2 py-1 w-full hover:bg-gray-800 text-left rounded"
                            title={`Edit ${name}`}
                        >
                            {fileIcon}
                            <span className="text-gray-300 truncate">{name}</span>
                        </button>
                    </div>
                );
            }
        });

        return entries;
    };

    const handleFileSave = async () => {
    try {
        if (!currentFile || !fileChanged) return;

        const response = await window.api.writeFileContent(currentFile, fileContent);

        if (response.error) {
        throw new Error(response.error);
        }

        setFileChanged(false);
        console.log('File saved successfully');
    } catch (err) {
        console.error('Error saving file:', err);
        setError(err.message);
    }
    };

    const handleFileContentChange = (newContent) => {
        setFileContent(newContent);
        setFileChanged(true);
    };

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

            // Set config-related state
            setConfig(config);
            setBaseDir(config.baseDir);

            // Load default path first
            const defaultPath = await loadDefaultPath();
            const pathToUse = defaultPath || config.baseDir;

            // Set current path - this will trigger other dependent effects
            setCurrentPath(pathToUse);
          } catch (err) {
            console.error('Initialization error:', err);
            setError(err.message);
          } finally {
            setLoading(false);
          }
        };

        init();
      }, []); // Empty dependency array - this only runs once
      useEffect(() => {
        const loadData = async () => {
          if (!currentPath) return;

          console.log('Path changed, loading directory structure for:', currentPath);
          try {
            // Load structure & conversations for this path
            await loadDirectoryStructure(currentPath);
          } catch (err) {
            console.error('Error loading data for path:', err);
            setError(err.message);
          }
        };

        loadData();
      }, [currentPath]); // This effect runs whenever currentPath changes

      useEffect(() => {
        const fetchModels = async () => {
          if (!currentPath) {
            console.log("Skipping model fetch: currentPath is not set.");
            return;
          }

          console.log("Fetching available models for path:", currentPath);
          setModelsLoading(true);
          setModelsError(null);

          try {
            const response = await window.api.getAvailableModels(currentPath);
            console.log("Models response:", response);

            if (response && response.models && Array.isArray(response.models)) {
              setAvailableModels(response.models);

              // Handle setting the currentModel
              const currentModelIsValid = response.models.some(m => m.value === currentModel);
              const configModelIsValid = response.models.some(m => m.value === config?.model);

              if (!currentModel || !currentModelIsValid) {
                if (config?.model && configModelIsValid) {
                  console.log("Setting model from config:", config.model);
                  setCurrentModel(config.model);
                } else if (response.models.length > 0) {
                  console.log("Setting model to first available:", response.models[0].value);
                  setCurrentModel(response.models[0].value);
                } else {
                  console.log("No valid models found, clearing currentModel");
                  setCurrentModel(null);
                }
              }
            } else if (response && response.error) {
              throw new Error(response.error);
            } else {
              throw new Error("Invalid response format received for models.");
            }
          } catch (err) {
            console.error('Error fetching available models:', err);
            setModelsError(err.message || 'Failed to load models.');
            setAvailableModels([]);
            // Fallback to a default model when we can't fetch models
            setCurrentModel(config?.model || 'llama3.2');
          } finally {
            setModelsLoading(false);
          }
        };

        fetchModels();
      }, [currentPath, config]); // Run when path or config changes


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


    const [directoryConversations, setDirectoryConversations] = useState([]);

    // Add this function to load conversations
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
          const normalizedPath = normalizePath(dirPath);
          console.log('Loading conversations for normalized path:', normalizedPath);

          if (!normalizedPath) {
            console.error('No directory path provided to loadConversations');
            return;
          }

          // For debugging - check if the directory exists on the filesystem
          try {
            await window.api.ensureDirectory(normalizedPath);
            console.log('Directory exists and is accessible');
          } catch (err) {
            console.error('Directory access error:', err);
          }

          const response = await window.api.getConversations(normalizedPath);
          console.log('Raw conversations response:', response);

          if (response?.conversations && Array.isArray(response.conversations)) {
            const formattedConversations = response.conversations.map(conv => ({
              id: conv.id,
              title: conv.preview?.split('\n')[0]?.substring(0, 30) || 'New Conversation',
              preview: conv.preview || 'No content',
              timestamp: conv.timestamp || Date.now()
            }));

            console.log('Formatted conversations:', formattedConversations);
            setDirectoryConversations(formattedConversations);
          } else {
            console.warn('No valid conversations found or invalid response format:', response);
            setDirectoryConversations([]);
          }
        } catch (err) {
          console.error('Error loading conversations:', err);
          setError(err.message);
          setDirectoryConversations([]);
        }
      };
      const loadDefaultPath = async (callback) => {
        try {
          const data = await window.api.loadGlobalSettings();
          const defaultFolder = data?.global_settings?.default_folder;

          if (defaultFolder) {
            setCurrentPath(defaultFolder);
            if (callback && typeof callback === 'function') {
              callback(defaultFolder);
            }
          }
          return defaultFolder;
        } catch (error) {
          console.error('Error loading default path:', error);
          return null;
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
    const getFileIcon = (filename) => {
        const ext = filename.split('.').pop()?.toLowerCase() || '';
        const iconProps = { size: 16, className: "flex-shrink-0" };

        switch(ext) {
            case 'py':
                return <Code2 {...iconProps} className={`${iconProps.className} text-blue-500`} />;
            case 'js':
                return <Code2 {...iconProps} className={`${iconProps.className} text-yellow-400`} />;
            case 'md':
                return <FileText {...iconProps} className={`${iconProps.className} text-green-400`} />;
            case 'json':
                return <FileJson {...iconProps} className={`${iconProps.className} text-orange-400`} />;
            case 'html':
                return <Code2 {...iconProps} className={`${iconProps.className} text-red-400`} />;
            case 'css':
                return <Code2 {...iconProps} className={`${iconProps.className} text-blue-300`} />;
            case 'txt':
            case 'yaml':
            case 'yml':
            case 'npc':
            case 'tool':
                 return <File {...iconProps} className={`${iconProps.className} text-gray-400`} />;
            default:
                return <File {...iconProps} className={`${iconProps.className} text-gray-400`} />;
        }
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

            {/* Main Flex Container for Sidebar + Content */}
            <div className="flex h-screen bg-gray-900 text-gray-100 font-mono">

                {/* Sidebar (Fixed Width) */}
                <div className="w-64 border-r border-gray-700 flex flex-col flex-shrink-0"> {/* Added flex-shrink-0 */}
                    {/* Header */}
                    <div className="p-4 border-b border-gray-700 flex items-center justify-between">
                        <span className="text-sm font-semibold">NPC Studio</span>
                        <div className="flex gap-3">
                            <button onClick={() => setSettingsOpen(true)} className="p-2 bg-gray-700 hover:bg-gray-600 rounded-full transition-all" aria-label="Settings"><Settings size={14} /></button>
                            <button onClick={deleteSelectedConversations} className="p-2 hover:bg-gray-800 rounded-full transition-all" aria-label="Delete Selected Conversations"><Trash size={14} /></button>
                            <button onClick={createNewConversation} className="p-2 bg-blue-600 hover:bg-blue-500 rounded-full transition-all" aria-label="New Conversation"><Plus size={18} /></button>
                            <button className="theme-toggle-btn" onClick={toggleTheme}>{isDarkMode ? '🌙' : '☀️'}</button>
                        </div>
                    </div>

                    {/* Current Path */}
                    <div className="p-2 border-b border-gray-700 flex items-center gap-2">
                        <button onClick={goUpDirectory} className="p-2 hover:bg-gray-800 rounded-full transition-all" title="Go Up" aria-label="Go Up Directory">
                            <ArrowUp size={14} className={(!currentPath || currentPath === baseDir) ? "text-gray-600" : "text-gray-300"}/>
                        </button>
                        {isEditingPath ? (
                            <input type="text" value={editedPath} onChange={(e) => setEditedPath(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') { setIsEditingPath(false); setCurrentPath(editedPath); loadDirectoryStructure(editedPath); } else if (e.key === 'Escape') { setIsEditingPath(false); } }} onBlur={() => setIsEditingPath(false)} autoFocus className="text-xs text-gray-400 bg-gray-800 border border-gray-700 rounded px-2 py-1 flex-1"/>
                        ) : (
                            <div onClick={() => { setIsEditingPath(true); setEditedPath(currentPath); }} className="text-xs text-gray-400 overflow-hidden overflow-ellipsis whitespace-nowrap cursor-pointer hover:bg-gray-800 px-2 py-1 rounded">
                                {currentPath}
                            </div>
                        )}
                    </div>

                    {/* Folder/Conversation List (Scrollable) */}
                    <div className="flex-1 overflow-y-auto">
                        {loading ? (
                            <div className="p-4 text-gray-500">Loading...</div>
                        ) : (
                            <>
                                {renderFolderStructure(folderStructure)}
                                {directoryConversations?.length > 0 && (
                                    <div className="mt-4">
                                        <div className="px-4 py-2 text-xs text-gray-500">Conversations ({directoryConversations.length})</div>
                                        <div>
                                            {directoryConversations.map((conv) => {
                                                const isSelected = selectedConvos?.has(conv.id);
                                                return (
                                                    <button key={conv.id} onClick={(e) => { if (e.ctrlKey || e.metaKey) { const newSelected = new Set(selectedConvos || new Set()); if (newSelected.has(conv.id)) { newSelected.delete(conv.id); } else { newSelected.add(conv.id); } setSelectedConvos(newSelected); } else { setSelectedConvos(new Set([conv.id])); handleConversationSelect(conv.id); } }} onContextMenu={(e) => { e.preventDefault(); if (!selectedConvos?.has(conv.id)) { setSelectedConvos(new Set([conv.id])); } setContextMenuPos({ x: e.clientX, y: e.clientY }); }} className={`flex items-center gap-2 px-4 py-2 w-full hover:bg-gray-800 text-left rounded-lg transition-all ${isSelected ? 'bg-gray-700' : ''} ${activeConversationId === conv.id ? 'border-l-2 border-blue-500' : ''}`}>
                                                        <File size={16} className="text-gray-400" />
                                                        <div className="flex flex-col">
                                                            <span className="text-sm truncate">{conv.title || conv.id}</span>
                                                            <span className="text-xs text-gray-500">{new Date(conv.timestamp).toLocaleString()}</span>
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

                    {/* Sidebar Footer */}
                    <div className="p-4 border-t border-gray-700 flex-shrink-0"> {/* Added flex-shrink-0 */}
                        <div className="flex gap-2 justify-center">
                            <button onClick={handleImagesClick} className="p-2 hover:bg-gray-800 rounded-full transition-all" aria-label="View Images"><Image size={16} /></button>
                            <button onClick={handleScreenshotsClick} className="p-2 hover:bg-gray-800 rounded-full transition-all" aria-label="View Screenshots"><Camera size={16} /></button>
                            <button onClick={() => setToolMenuOpen(true)} className="p-2 hover:bg-gray-800 rounded-full transition-all" aria-label="Open Tool Menu"><Wrench size={16} /></button>
                            <button onClick={handleOpenNpcTeamMenu} className="p-2 hover:bg-gray-800 rounded-full transition-all" aria-label="Open NPC Team Menu"><Users size={16} /></button>
                        </div>
                    </div>
                </div>

                {/* Main Content Area (Takes remaining space) */}
                <div className={`flex-1 flex flex-col ${isDarkMode ? 'dark-mode' : 'light-mode'} overflow-hidden`}> {/* Added overflow-hidden */}
                    {isEditing && currentFile ? (
                        /* --- File Editing View --- */
                        <div className="flex-1 flex flex-col">
                             <div className="p-2 border-b border-gray-700 flex items-center justify-between flex-shrink-0"> {/* Added flex-shrink-0 */}
                                <div className="text-sm text-gray-300">{currentFile}</div>
                                <div className="flex gap-2">
                                    <button onClick={handleFileSave} disabled={!fileChanged} className="px-3 py-1 bg-green-600 hover:bg-green-500 rounded text-sm disabled:opacity-50">Save</button>
                                    <button onClick={() => setIsEditing(false)} className="px-3 py-1 bg-gray-600 hover:bg-gray-500 rounded text-sm">Close</button>
                                </div>
                            </div>
                            <div className="flex-1 overflow-y-auto">
                                <textarea value={fileContent} onChange={(e) => handleFileContentChange(e.target.value)} className="w-full h-full bg-gray-900 text-gray-200 p-4 font-mono text-sm resize-none focus:outline-none"/>
                            </div>
                        </div>
                    ) : (
                        /* --- Chat View --- */
                         /* Removed outer p-4, added bg */
                        <div className="flex-1 flex flex-col bg-gray-900">
                            {loading && !messages.length ? (
                                 <div className="flex items-center justify-center h-full text-gray-500"><span>Loading...</span></div>
                            ) : (
                                <>
                                    {/* Debug info */}
                                    <div className="p-2 border-b border-gray-700 text-xs text-gray-500 flex-shrink-0"> {/* Added flex-shrink-0 */}
                                        <div>Active Conversation: {activeConversationId || 'None'}</div> {/* Avoid calling createNew... here */}
                                        <div>Messages Count: {messages.length}</div>
                                        <div>Current Path: {currentPath}</div>
                                    </div>

                                    {/* Messages Area (Scrollable) */}
                                    <div className="flex-1 overflow-y-auto space-y-4 p-4"> {/* Added p-4 here */}
                                        {promptModal.isOpen && (
                                             <div className="bg-gray-800 p-4 border border-gray-700 rounded-lg mb-4">
                                                <h3 className="text-lg font-medium mb-2">{promptModal.title}</h3>
                                                <p className="text-gray-400 mb-4">{promptModal.message}</p>
                                                <textarea className="w-full h-48 bg-gray-900 border border-gray-700 rounded p-2 mb-4 text-gray-100 font-mono" defaultValue={promptModal.defaultValue} id="promptInput" autoFocus/>
                                                <div className="flex justify-end gap-2">
                                                    <button className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded text-sm" onClick={() => setPromptModal({ ...promptModal, isOpen: false })}>Cancel</button>
                                                    <button className="px-4 py-2 bg-blue-600 hover:bg-blue-500 rounded text-sm" onClick={() => { const value = document.getElementById('promptInput').value; promptModal.onConfirm?.(value); setPromptModal({ ...promptModal, isOpen: false }); }}>OK</button>
                                                </div>
                                            </div>
                                        )}
                                        {activeConversationId ? (
                                            messages.length > 0 ? (
                                                messages.map((message, index) => (
                                                    <div key={index} className={`space-y-1 ${message.role === 'user' ? 'ml-auto max-w-[85%]' : 'max-w-[85%]'}`}> {/* Adjusted max-width */}
                                                        <div className="flex items-center gap-2">
                                                             <div className="text-xs text-gray-500">
                                                                {message.role === 'user' ? '$ ' : '> '}
                                                                {message.timestamp && new Date(message.timestamp).toLocaleTimeString()}
                                                                <div>{message.model} - {message.npc}</div>
                                                            </div>
                                                        </div>
                                                        <div className={`p-3 rounded-lg inline-block ${message.role === 'user' ? 'bg-blue-900 text-white' : 'bg-gray-800'}`}> {/* Adjusted padding */}
                                                            <div className="whitespace-pre-wrap font-mono text-sm break-words"> {/* Added break-words */}
                                                                <div dangerouslySetInnerHTML={{ __html: message.content }} />
                                                            </div>
                                                            {message.attachments && message.attachments.length > 0 && (
                                                                <div className="mt-2 flex flex-wrap gap-2">
                                                                    {message.attachments.map((attachment, index) => (
                                                                        <div key={index} className="text-xs bg-gray-700 rounded px-2 py-1"> {/* Changed bg */}
                                                                            📎 {attachment.name}
                                                                            {attachment.data && (<img src={attachment.data} alt={attachment.name} className="mt-2 max-w-[200px] max-h-[200px] rounded-md"/> )}
                                                                        </div>
                                                                    ))}
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                ))
                                            ) : (<div className="text-center text-gray-500 pt-10">No messages in this conversation</div>)
                                        ) : (<div className="flex items-center justify-center h-full text-gray-500">Select a conversation</div>)
                                        }
                                    </div>

                                    {/* Message Input Container (Now part of the flex column) */}
                                    {/* Removed fixed positioning wrapper */}
                                    <div className="message-input-container p-4 border-t border-gray-700 bg-gray-900 flex-shrink-0"> {/* Added border/bg, padding, flex-shrink */}
                                        <div className="max-w-5xl mx-auto">
                                            <div className="relative border-2 border-dashed border-gray-600 rounded-lg hover:border-blue-500 transition-all" onDragOver={(e) => e.preventDefault()} onDrop={(e) => { handleDrop(e); setIsHovering(false); }} onDragEnter={() => setIsHovering(true)} onDragLeave={() => setIsHovering(false)}>
                                                <div className={`absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-center text-gray-400 ${isHovering ? 'block' : 'hidden'}`}>Drop your files here</div>
                                                <form onSubmit={handleInputSubmit} className="relative">
                                                    <textarea value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleInputSubmit(e); } }} placeholder="Type a message..." className="w-full bg-[#0b0c0f] text-sm text-gray-300 rounded-lg px-4 py-3 pr-16 placeholder-gray-600 focus:outline-none border-0 min-h-[56px] resize-none" rows={1}/>
                                                    <input type="file" onChange={handleFileInput} style={{ display: 'none' }} multiple accept="image/*"/>
                                                    <button type="submit" disabled={!input.trim() && uploadedFiles.length === 0} className="absolute right-3 bottom-2.5 bg-green-600 hover:bg-green-500 text-white rounded px-3 py-1.5 text-sm flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed">Send</button>
                                                     {/* Selectors now inside the form or near it */}
                                                    <div className="flex items-center gap-2 pt-2 mb-2"> {/* Added pt-2 */}
                                                        <select value={currentModel || ''} onChange={e => setCurrentModel(e.target.value)} className="bg-gray-800 text-xs rounded px-2 py-1 border border-gray-700" disabled={modelsLoading || !!modelsError}>
                                                            {modelsLoading && <option value="">Loading...</option>}
                                                            {modelsError && <option value="">Error</option>}
                                                            {!modelsLoading && !modelsError && availableModels.length === 0 && (<option value="">No models</option> )}
                                                            {!modelsLoading && !modelsError && availableModels.map(model => (<option key={model.value} value={model.value}>{model.display_name}</option>))}
                                                        </select>
                                                        <select value={currentNPC || config?.npc || 'sibiji'} onChange={e => setCurrentNPC(e.target.value)} className="bg-gray-800 text-xs rounded px-2 py-1 border border-gray-700">
                                                            <option value="sibiji">NPC: sibiji </option>
                                                        </select>
                                                    </div>
                                                </form>
                                                {uploadedFiles.length > 0 && (
                                                    <div className="p-2 flex gap-2 flex-wrap border-t border-gray-700 mt-2"> {/* Added border-t, mt-2 */}
                                                        {uploadedFiles.map(file => (
                                                            <div key={file.id} className="relative">
                                                                <img src={`file://${file.path}`} alt="Screenshot" className="w-16 h-16 object-cover rounded-lg border border-gray-700"/> {/* Adjusted size */}
                                                                <button onClick={() => { setUploadedFiles(prev => prev.filter(f => f.id !== file.id)); }} className="absolute -top-2 -right-2 bg-red-500 rounded-full p-1"><X size={12} /></button>
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}
                                                {imagePreview && (
                                                    <div className="p-2 border-t border-gray-700 mt-2"> {/* Added border-t, mt-2 */}
                                                        <img src={imagePreview} alt="Dropped Image" className="w-16 h-16 object-cover rounded-lg border border-gray-600"/>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </>
                            )}
                        </div>
                    )}

                    {/* Modals (remain outside main flow) */}
                    <NPCTeamMenu isOpen={npcTeamMenuOpen} onClose={handleCloseNpcTeamMenu} currentPath={currentPath} startNewConversation={startNewConversationWithNpc}/>
                    <ToolMenu isOpen={toolMenuOpen} onClose={() => setToolMenuOpen(false)} currentPath={currentPath}/>
                    <SettingsMenu isOpen={settingsOpen} onClose={() => setSettingsOpen(false)} currentPath={currentPath} onPathChange={(newPath) => { setCurrentPath(newPath); }}/>
                    {isMacroInputOpen && (<MacroInput isOpen={isMacroInputOpen} currentPath={currentPath} onClose={() => { setIsMacroInputOpen(false); window.api?.hideMacro?.(); }} onSubmit={({ macro, conversationId, result }) => { setActiveConversationId(conversationId); setCurrentConversation({ id: conversationId, title: macro.trim().slice(0, 50) }); if (!result) { setMessages([{ role: 'user', content: macro, timestamp: new Date().toISOString(), type: 'command' }, { role: 'assistant', content: 'Processing...', timestamp: new Date().toISOString(), type: 'message' }]); } else { setMessages([{ role: 'user', content: macro, timestamp: new Date().toISOString(), type: 'command' }, { role: 'assistant', content: result?.output || 'No response', timestamp: new Date().toISOString(), type: 'message' }]); } refreshConversations(); }}/> )}
                </div>
            </div>

            {/* Photo Viewer Modal */}
            <PhotoViewer isOpen={photoViewerOpen} onClose={() => setPhotoViewerOpen(false)} type={photoViewerType}/>
        </div>
    );


};

export default ChatInterface;

