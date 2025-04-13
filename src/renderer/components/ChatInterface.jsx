import React, { useState, useEffect, useRef } from 'react';
import {
    Folder, File, ChevronRight, Settings, Edit, Terminal, Image, Trash, Users, Plus, ArrowUp, Camera, MessageSquare, ListFilter, X, Wrench, FileText, Code2, FileJson, Paperclip, Send
} from 'lucide-react';
import MacroInput from './MacroInput';
import SettingsMenu from './SettingsMenu';
import NPCTeamMenu from './NPCTeamMenu';
import PhotoViewer from './PhotoViewer';
import ToolMenu from './ToolMenu';
import '../../index.css';

const generateId = () => Math.random().toString(36).substr(2, 9);

const normalizePath = (path) => {
    if (!path) return '';
    path = path.replace(/\\/g, '/');
    if (path.endsWith('/') && path.length > 1) {
      path = path.slice(0, -1);
    }
    return path;
};

const getFileIcon = (filename) => {
    const ext = filename.split('.').pop()?.toLowerCase() || '';
    const iconProps = { size: 16, className: "flex-shrink-0" };
    switch(ext) {
        case 'py': return <Code2 {...iconProps} className={`${iconProps.className} text-blue-500`} />;
        case 'js': return <Code2 {...iconProps} className={`${iconProps.className} text-yellow-400`} />;
        case 'md': return <FileText {...iconProps} className={`${iconProps.className} text-green-400`} />;
        case 'json': return <FileJson {...iconProps} className={`${iconProps.className} text-orange-400`} />;
        case 'html': return <Code2 {...iconProps} className={`${iconProps.className} text-red-400`} />;
        case 'css': return <Code2 {...iconProps} className={`${iconProps.className} text-blue-300`} />;
        case 'txt': case 'yaml': case 'yml': case 'npc': case 'tool':
             return <File {...iconProps} className={`${iconProps.className} text-gray-400`} />;
        default: return <File {...iconProps} className={`${iconProps.className} text-gray-400`} />;
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

const ChatInterface = () => {
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
    const [activeConversationId, setActiveConversationId] = useState(null);
    const [messages, setMessages] = useState([]);
    const [currentModel, setCurrentModel] = useState(null);
    const [currentNPC, setCurrentNPC] = useState(null);
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [config, setConfig] = useState(null);
    const [currentConversation, setCurrentConversation] = useState(null);
    const [npcTeamMenuOpen, setNpcTeamMenuOpen] = useState(false);
    const [toolMenuOpen, setToolMenuOpen] = useState(false);
    const [uploadedFiles, setUploadedFiles] = useState([]);
    const [imagePreview, setImagePreview] = useState(null);
    const activeConversationRef = useRef(null);
    const [availableModels, setAvailableModels] = useState([]);
    const [modelsLoading, setModelsLoading] = useState(false);
    const [modelsError, setModelsError] = useState(null);
    const [currentFile, setCurrentFile] = useState(null);
    const [fileContent, setFileContent] = useState('');
    const [isEditing, setIsEditing] = useState(false);
    const [fileChanged, setFileChanged] = useState(false);
    const [isDarkMode, setIsDarkMode] = useState(true);
    const [isMacroInputOpen, setIsMacroInputOpen] = useState(false);
    const [macroText, setMacroText] = useState('');
    const [baseDir, setBaseDir] = useState('');
    const [promptModal, setPromptModal] = useState({ isOpen: false, title: '', message: '', defaultValue: '', onConfirm: null });
    const screenshotHandlingRef = useRef(false);
    const fileInputRef = useRef(null);
    const listenersAttached = useRef(false);
    const initialLoadComplete = useRef(false);
    const [directoryConversations, setDirectoryConversations] = useState([]);

    const directoryConversationsRef = useRef(directoryConversations);
    useEffect(() => {
        directoryConversationsRef.current = directoryConversations;
    }, [directoryConversations]);

    useEffect(() => {
        activeConversationRef.current = activeConversationId;
    }, [activeConversationId]);

    useEffect(() => {
        document.body.classList.toggle('dark-mode', isDarkMode);
        document.body.classList.toggle('light-mode', !isDarkMode);
    }, [isDarkMode]);



    const handleFileClick = async (filePath) => {
        try {
            const response = await window.api.readFileContent(filePath);
            if (response.error) throw new Error(response.error);
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

    const handleFileSave = async () => {
        try {
            if (!currentFile || !fileChanged) return;
            const response = await window.api.writeFileContent(currentFile, fileContent);
            if (response.error) throw new Error(response.error);
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

    useEffect(() => {
        const loadData = async () => {
            if (currentPath) {
                setLoading(true);
                await loadDirectoryStructure(currentPath); // Includes loadConversations -> setDirectoryConversations
                setLoading(false); // Loading done for this path

                const currentConvos = directoryConversationsRef.current;

                if (!activeConversationId) { // Only act if NO conversation is currently active
                    const needsNewConvo = currentConvos.length === 0;
                    const needsSelectConvo = currentConvos.length > 0;

                     //console.log(`Post-Load Decision: needsNew=${needsNewConvo}, needsSelect=${needsSelectConvo}, activeId=${activeConversationId}, convoCount=${currentConvos.length}`);

                    if (needsNewConvo) {
                        //console.log("No active convo, none loaded: Creating new conversation.");
                        // No await needed if createNewConversation doesn't need to block anything *here*
                        createNewConversation();
                    } else if (needsSelectConvo) {
                        //console.log(`No active convo, selecting first loaded: ${currentConvos[0].id}`);
                        // No await needed if handleConversationSelect doesn't need to block anything *here*
                        handleConversationSelect(currentConvos[0].id);
                    }
                } else {
                    //  console.log(`Post-Load: Conversation ${activeConversationId} is already active.`);
                }
            }
        };

        loadData();
    }, [currentPath]);



    const handleConversationSelect = async (conversationId) => {
        try {
          setIsEditing(false);
          setCurrentFile(null);
          //console.log('Selecting conversation:', conversationId);
          setActiveConversationId(conversationId);
          //console.log('Active conversation ID set to:', conversationId);

          const selectedConv = directoryConversations.find(conv => conv.id === conversationId);
          //console.log('Found conversation object:', selectedConv);
          if (selectedConv) {
            setCurrentConversation(selectedConv);
          } else {
             setCurrentConversation(null);
          }

          setMessages([]); // Clear messages initially

          //console.log('Fetching messages for conversation:', conversationId);
          const response = await window.api.getConversationMessages(conversationId);
          //console.log('Raw message response from API:', response);

          // Check if the response *itself* is the array of messages
          if (response && Array.isArray(response)) {
             const formattedMessages = response.map(msg => ({
                role: msg.role || 'assistant',
                content: msg.content || '',
                timestamp: msg.timestamp || new Date().toISOString(),
                type: msg.content?.startsWith('/') ? 'command' : 'message',
                model: msg.model,
                npc: msg.npc,
                attachments: msg.attachment_data ? [{
                  name: msg.attachment_name,
                  data: `data:image/png;base64,${msg.attachment_data}`, // Assuming base64 image data
                }] : (msg.attachments || []) // Preserve if already formatted
              }));
              //console.log('Setting messages:', formattedMessages);
              setMessages(formattedMessages);
          } else if (response?.error) {
               console.error("Error fetching messages:", response.error);
               setError(response.error);
               setMessages([]);
          }
           else {
            //console.log("No messages found or invalid response format for conversation:", conversationId);
            setMessages([]);
          }
        } catch (err) {
          console.error('Error in handleConversationSelect:', err);
          setError(err.message);
          setMessages([]);
        }
      };
    // --- End Restored handleConversationSelect ---


    const startNewConversationWithNpc = async (npc) => {
        try {
            const newConversation = await createNewConversation();
            if (newConversation) {
                setCurrentNPC(npc.name);
                setMessages([{ role: 'assistant', content: `Starting conversation with ${npc.name}.`, timestamp: new Date().toISOString(), npc: npc.name }]);
            }
        } catch (error) {
            console.error('Error starting conversation with NPC:', error);
            setError(error.message);
        }
    };

    useEffect(() => {
        window.api.onShowMacroInput(() => {
            setIsMacroInputOpen(true);
            setMacroText('');
        });
    }, []);

    const toggleTheme = () => {
        setIsDarkMode((prev) => !prev);
    };

    const handleImagesClick = () => {
        setPhotoViewerType('images');
        setPhotoViewerOpen(true);
    };

    const handleScreenshotsClick = () => {
        setPhotoViewerType('screenshots');
        setPhotoViewerOpen(true);
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

     const refreshConversations = async () => {
        if (currentPath) {
            await loadConversations(currentPath);
        }
    };

    const loadConversations = async (dirPath) => {
        let currentActiveId = activeConversationId; // Capture current active ID
        try {
            const normalizedPath = normalizePath(dirPath);
            if (!normalizedPath) return;
            const response = await window.api.getConversations(normalizedPath);
            const formattedConversations = response?.conversations?.map(conv => ({
                id: conv.id,
                title: conv.preview?.split('\n')[0]?.substring(0, 30) || 'New Conversation',
                preview: conv.preview || 'No content',
                timestamp: conv.timestamp || Date.now()
            })) || [];

            setDirectoryConversations(formattedConversations);

            const activeExists = formattedConversations.some(c => c.id === currentActiveId);

            if (!activeExists && initialLoadComplete.current) {
                if (formattedConversations.length > 0) {
                    await handleConversationSelect(formattedConversations[0].id);
                } else {
                    await createNewConversation();
                }
            } else if (!currentActiveId && formattedConversations.length > 0 && initialLoadComplete.current) {
                 await handleConversationSelect(formattedConversations[0].id);
            } else if (!currentActiveId && formattedConversations.length === 0 && initialLoadComplete.current) {
                 await createNewConversation();
            }

        } catch (err) {
            console.error('Error loading conversations:', err);
            setError(err.message);
            setDirectoryConversations([]);
             if (!activeConversationId && initialLoadComplete.current) {
                 await createNewConversation(); // Attempt to create if load fails
            }
        }
    };

    const loadDirectoryStructure = async (dirPath) => {
        try {
            if (!dirPath) {
                console.error('No directory path provided');
                return {};
            }
            const structureResult = await window.api.readDirectoryStructure(dirPath);
            if (structureResult && !structureResult.error) {
                setFolderStructure(structureResult);
            } else {
                console.error('Error loading structure:', structureResult?.error);
                setFolderStructure({ error: structureResult?.error || 'Failed' });
            }
            await loadConversations(dirPath);
            return structureResult;
        } catch (err) {
            console.error('Error loading structure:', err);
            setError(err.message);
            setFolderStructure({ error: err.message });
            return { error: err.message };
        }
    };


    // Initialization Effect (runs once)
    useEffect(() => {
        const init = async () => {
            try {
                setLoading(true);
                const loadedConfig = await window.api.getDefaultConfig();
                if (!loadedConfig || !loadedConfig.baseDir) throw new Error('Invalid config');
                setConfig(loadedConfig);
                setBaseDir(loadedConfig.baseDir);
                const defaultPath = await loadDefaultPath();
                const pathToUse = defaultPath || loadedConfig.baseDir;
                setCurrentPath(pathToUse); // This will trigger the next effect
            } catch (err) {
                console.error('Initialization error:', err);
                setError(err.message);
            }        };
        init();
    }, []); // Empty dependency array - runs once

    useEffect(() => {
        const loadData = async () => {
            if (currentPath) {
                setLoading(true);
                await loadDirectoryStructure(currentPath); // This now also calls loadConversations
                setLoading(false);
                initialLoadComplete.current = true;
                 // Ensure a conversation is active after initial load if none was selected
                if (!activeConversationId && directoryConversations.length === 0) {
                    await createNewConversation();
                } else if (!activeConversationId && directoryConversations.length > 0) {
                    // Select first convo if none active after load
                     await handleConversationSelect(directoryConversations[0].id);
                }
            }
        };
        loadData();
    }, [currentPath]);

    useEffect(() => {
        const fetchModels = async () => {
            if (!currentPath) return;
            setModelsLoading(true);
            setModelsError(null);
            try {
                const response = await window.api.getAvailableModels(currentPath);
                if (response?.models && Array.isArray(response.models)) {
                    setAvailableModels(response.models);
                    const currentValid = response.models.some(m => m.value === currentModel);
                    const configValid = response.models.some(m => m.value === config?.model);
                    if (!currentModel || !currentValid) {
                        if (config?.model && configValid) {
                            setCurrentModel(config.model);
                        } else if (response.models.length > 0) {
                            setCurrentModel(response.models[0].value);
                        } else {
                            setCurrentModel(null);
                        }
                    }
                } else {
                    throw new Error(response?.error || "Invalid models response");
                }
            } catch (err) {
                console.error('Error fetching models:', err);
                setModelsError(err.message);
                setAvailableModels([]);
                setCurrentModel(config?.model || 'llama3.2');
            } finally {
                setModelsLoading(false);
            }
        };
        if (currentPath) {
             fetchModels();
        }
    }, [currentPath, config]);

    const goUpDirectory = async () => {
        try {
            if (!currentPath || currentPath === baseDir) return;
            const newPath = await window.api.goUpDirectory(currentPath);
            setCurrentPath(newPath);
        } catch (err) {
            console.error('Error going up directory:', err);
            setError(err.message);
        }
    };


    const createNewConversation = async () => {
        try {
            setIsEditing(false);
            setCurrentFile(null);
            const conversation = await window.api.createConversation({
                title: 'New Conversation',
                model: currentModel || config?.model || 'llama3.2',
                directory_path: currentPath
            });
            setDirectoryConversations(prev => [...prev, {
                 id: conversation.id,
                 title: 'New Conversation',
                 preview: 'No content',
                 timestamp: Date.now()
            }]);
            setActiveConversationId(conversation.id); // Set it active
            setCurrentConversation(conversation);
            setMessages([]);
            return conversation; // Return the created conversation
        } catch (err) {
            console.error('Error creating conversation:', err);
            setError(err.message);
            throw err;
        }
    };

    const handleDrop = (e) => {
        e.preventDefault();
        setIsHovering(false);
        const files = e.dataTransfer.files;
        handleFileUpload(files);
    };

    const handleFileUpload = async (files) => {
        const existingFileNames = new Set(uploadedFiles.map(f => f.name));
        const newFiles = Array.from(files).filter(file => !existingFileNames.has(file.name));
        const attachmentData = [];
        for (const file of newFiles) {
            try {
                const preview = file.type.startsWith('image/') ? URL.createObjectURL(file) : null;
                attachmentData.push({
                    id: generateId(), name: file.name, type: file.type, path: file.path, size: file.size, preview
                });
            } catch (err) {
                console.error("Error processing file:", file.name, err);
            }
        }
        if (attachmentData.length > 0) {
            setUploadedFiles(prev => [...prev, ...attachmentData]);
        }
    };

    const handleFileInput = (event) => {
        if (event.target.files.length) {
            handleFileUpload(event.target.files);
            event.target.value = null;
        }
    };

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
                                const last = prev[prev.length - 1];
                                if (last?.role === 'assistant') {
                                     return [...prev.slice(0, -1), { ...last, content: (last.content || '') + content }];
                                } else {
                                     return prev;
                                }
                            });
                        }
                    }
                } catch (error) {
                    console.error('Error parsing stream chunk:', error, 'Raw chunk:', chunk);
                }
            };
            const handleStreamComplete = () => console.log('Stream complete');
            const handleStreamError = (_, error) => {
                console.error('Stream error:', error);
                setMessages(prev => [...prev, { role: 'assistant', content: `Stream Error: ${error}`, timestamp: new Date().toISOString(), type: 'error', model: currentModel, npc: currentNPC }]);
            };
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
            const attachmentsData = uploadedFiles.map(file => ({
                name: file.name, path: file.path, size: file.size, type: file.type
            }));
            const userMessage = {
                role: 'user', content: input, timestamp: new Date().toISOString(), type: 'message', model: 'user', npc: currentNPC, attachments: attachmentsData
            };
            setMessages(prev => [...prev, userMessage]);
            const currentInput = input;
            setInput('');
            setUploadedFiles([]);
            setMessages(prev => [...prev, { role: 'assistant', content: '', timestamp: new Date().toISOString(), type: 'message', model: currentModel, npc: currentNPC }]);
            await window.api.executeCommandStream({
                commandstr: currentInput, currentPath: currentPath, conversationId: activeConversationId, model: currentModel || config?.model || 'llama3.2', npc: currentNPC || config?.npc || 'sibiji', attachments: attachmentsData
            });
        } catch (err) {
            console.error('Error submitting input:', err);
            setMessages(prev => {
                const lastMessage = prev[prev.length -1];
                if (lastMessage?.role === 'assistant' && lastMessage.content === '') {
                    return prev.slice(0, -1);
                }
                return prev;
            });
             setMessages(prev => [...prev, { role: 'assistant', content: `Error: ${err.message}`, timestamp: new Date().toISOString(), type: 'error', npc: currentNPC || config?.npc || 'sibiji', model: currentModel }]);
        }
    };

    const deleteSelectedConversations = async () => {
        const selectedIds = Array.from(selectedConvos);
        if (selectedIds.length === 0) return;
        try {
            await Promise.all( selectedIds.map(id => window.api.deleteConversation(id)) );
            await loadConversations(currentPath);
        } catch (err) {
            console.error('Error deleting conversations:', err);
            setError(err.message);
        }
        setSelectedConvos(new Set());
    };

    const handleOpenNpcTeamMenu = () => { setNpcTeamMenuOpen(true); };
    const handleCloseNpcTeamMenu = () => { setNpcTeamMenuOpen(false); };

    const handleSummarizeAndStart = async () => {
        const selectedIds = Array.from(selectedConvos);
        if (selectedIds.length === 0) return;
        setContextMenuPos(null);
        try {
            const convosContent = await Promise.all(selectedIds.map(id => window.api.getConversationMessages(id)));
            const summaryCommand = `Summarize these conversations:\n\n${convosContent.map((msgs, i) => `Conv ${i + 1}:\n${msgs.map(m => `${m.role}: ${m.content.replace(/'/g, "\\'").replace(/"/g, '\\"')}`).join('\n')}`).join('\n\n')}`;
            const summaryResult = await window.api.executeCommand({ commandstr: summaryCommand, currentPath: currentPath, conversationId: null });
            if (!summaryResult?.output) throw new Error('Failed summary generation');
            const summaryConvo = await createNewConversation();
            if (summaryConvo) {
                 setMessages([
                    { role: 'system', content: `Started from summary of ${selectedIds.length} conversation(s).`, timestamp: new Date().toISOString(), type: 'info' },
                    { role: 'user', content: `Based on the previous conversations (summarized), let's continue...`, timestamp: new Date().toISOString(), type: 'message' }
                 ]);
            }
        } catch (err) {
            console.error('Error summarizing and starting:', err);
            setError(err.message);
        } finally {
            setSelectedConvos(new Set());
        }
    };

    const handleSummarizeAndDraft = async () => {
        const selectedIds = Array.from(selectedConvos);
        if (selectedIds.length === 0) return;
        setContextMenuPos(null);
        try {
            const convosContent = await Promise.all(selectedIds.map(id => window.api.getConversationMessages(id)));
            const summaryCommand = `Summarize these conversations:\n\n${convosContent.map((msgs, i) => `Conv ${i + 1}:\n${msgs.map(m => `${m.role}: ${m.content.replace(/'/g, "\\'").replace(/"/g, '\\"')}`).join('\n')}`).join('\n\n')}`;
            const summaryResult = await window.api.executeCommand({ commandstr: summaryCommand, currentPath: currentPath, conversationId: null });
            if (!summaryResult?.output) throw new Error('Failed summary generation');
            if (!activeConversationId) {
               await createNewConversation();
            }
            requestAnimationFrame(() => setInput(summaryResult.output));
        } catch (err) {
            console.error('Error summarizing and drafting:', err);
            setError(err.message);
        } finally {
             setSelectedConvos(new Set());
        }
    };

    const handleSummarizeAndPrompt = async () => {
         const selectedIds = Array.from(selectedConvos);
         if (selectedIds.length === 0) return;
         setContextMenuPos(null);
         try {
             const convosContent = await Promise.all(selectedIds.map(id => window.api.getConversationMessages(id)));
             const summaryCommand = `Summarize these conversations:\n\n${convosContent.map((msgs, i) => `Conv ${i + 1}:\n${msgs.map(m => `${m.role}: ${m.content.replace(/'/g, "\\'").replace(/"/g, '\\"')}`).join('\n')}`).join('\n\n')}`;
             const summaryResult = await window.api.executeCommand({ commandstr: summaryCommand, currentPath: currentPath, conversationId: null });
             if (!summaryResult?.output) throw new Error('Failed summary generation');
             setPromptModal({
                 isOpen: true,
                 title: 'Modify Summary',
                 message: 'Review and modify the summary before starting the conversation:',
                 defaultValue: summaryResult.output,
                 onConfirm: async (userModifiedSummary) => {
                     if (userModifiedSummary) {
                         try {
                             const summaryConvo = await createNewConversation();
                             if(summaryConvo) {
                                 setInput(userModifiedSummary);
                             }
                         } catch(innerErr) {
                             console.error("Error creating conversation for modified summary:", innerErr);
                             setError(innerErr.message);
                         }
                     }
                 }
             });
         } catch (err) {
             console.error('Error preparing summary prompt:', err);
             setError(err.message);
         } finally {
              setSelectedConvos(new Set());
         }
    };

    // --- Internal Render Functions ---

    const renderSidebar = () => (
        <div className="w-64 border-r border-gray-700 flex flex-col flex-shrink-0 bg-gray-900">
            <div className="p-4 border-b border-gray-700 flex items-center justify-between flex-shrink-0">
                <span className="text-sm font-semibold">NPC Studio</span>
                <div className="flex gap-2">
                    <button onClick={() => setSettingsOpen(true)} className="p-2 bg-gray-700 hover:bg-gray-600 rounded-full transition-all" aria-label="Settings"><Settings size={14} /></button>
                    <button onClick={deleteSelectedConversations} className="p-2 hover:bg-gray-800 rounded-full transition-all" aria-label="Delete Selected Conversations"><Trash size={14} /></button>
                    <button onClick={createNewConversation} className="p-2 bg-blue-600 hover:bg-blue-500 rounded-full transition-all" aria-label="New Conversation"><Plus size={18} /></button>
                    <button className="theme-toggle-btn p-1" onClick={toggleTheme}>{isDarkMode ? '🌙' : '☀️'}</button>
                </div>
            </div>
            <div className="p-2 border-b border-gray-700 flex items-center gap-2 flex-shrink-0">
                <button onClick={goUpDirectory} className="p-2 hover:bg-gray-800 rounded-full transition-all" title="Go Up" aria-label="Go Up Directory"><ArrowUp size={14} className={(!currentPath || currentPath === baseDir) ? "text-gray-600" : "text-gray-300"}/></button>
                {isEditingPath ? (
                    <input type="text" value={editedPath} onChange={(e) => setEditedPath(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') { setIsEditingPath(false); setCurrentPath(editedPath); loadDirectoryStructure(editedPath); } else if (e.key === 'Escape') { setIsEditingPath(false); } }} onBlur={() => setIsEditingPath(false)} autoFocus className="text-xs text-gray-400 bg-gray-800 border border-gray-700 rounded px-2 py-1 flex-1"/>
                 ) : (
                    <div onClick={() => { setIsEditingPath(true); setEditedPath(currentPath); }} className="text-xs text-gray-400 overflow-hidden overflow-ellipsis whitespace-nowrap cursor-pointer hover:bg-gray-800 px-2 py-1 rounded flex-1" title={currentPath}>
                        {currentPath || '...'}
                    </div>
                )}
            </div>
            <div className="flex-1 overflow-y-auto px-2 py-2">
                {loading ? (<div className="p-4 text-gray-500">Loading...</div>) : (
                    <>
                        {renderFolderList(folderStructure)}
                        {renderConversationList(directoryConversations)}
                        {contextMenuPos && renderContextMenu()}
                    </>
                )}
            </div>
            <div className="p-4 border-t border-gray-700 flex-shrink-0">
                <div className="flex gap-2 justify-center">
                    <button onClick={handleImagesClick} className="p-2 hover:bg-gray-800 rounded-full transition-all" aria-label="View Images"><Image size={16} /></button>
                    <button onClick={handleScreenshotsClick} className="p-2 hover:bg-gray-800 rounded-full transition-all" aria-label="View Screenshots"><Camera size={16} /></button>
                    <button onClick={() => setToolMenuOpen(true)} className="p-2 hover:bg-gray-800 rounded-full transition-all" aria-label="Open Tool Menu"><Wrench size={16} /></button>
                    <button onClick={handleOpenNpcTeamMenu} className="p-2 hover:bg-gray-800 rounded-full transition-all" aria-label="Open NPC Team Menu"><Users size={16} /></button>
                </div>
            </div>
        </div>
    );

    const renderFolderList = (structure) => {
        if (!structure || typeof structure !== 'object' || structure.error) { return <div className="p-2 text-xs text-red-500">Error: {structure?.error || 'Failed to load'}</div>; }
        if (Object.keys(structure).length === 0) { return <div className="p-2 text-xs text-gray-500">Empty directory</div>; }
        const entries = [];
        const sortedEntries = Object.entries(structure).sort(([nameA, contentA], [nameB, contentB]) => { const typeA = contentA?.type; const typeB = contentB?.type; if (typeA === 'directory' && typeB !== 'directory') return -1; if (typeA !== 'directory' && typeB === 'directory') return 1; return nameA.localeCompare(nameB); });
        sortedEntries.forEach(([name, content]) => {
            const fullPath = content?.path; const isFolder = content?.type === 'directory'; const isFile = content?.type === 'file'; if (!fullPath) return;
            if (isFolder) { entries.push(
                <div key={`folder-${fullPath}`}>
                    <button onDoubleClick={() => setCurrentPath(fullPath)} className="flex items-center gap-2 px-2 py-1 w-full hover:bg-gray-800 text-left rounded" title={`Double-click to open ${name}`}>
                        <Folder size={16} className="text-blue-400 flex-shrink-0" />
                        <span className="truncate">{name}</span>
                    </button>
                </div>
            );
            } else if (isFile) { const fileIcon = getFileIcon(name); entries.push(
                <div key={`file-${fullPath}`}>
                    <button onClick={() => handleFileClick(fullPath)} className="flex items-center gap-2 px-2 py-1 w-full hover:bg-gray-800 text-left rounded" title={`Edit ${name}`}>
                        {fileIcon}
                        <span className="text-gray-300 truncate">{name}</span>
                    </button>
                </div>
            ); }
        });
        return entries;
    };

    const renderConversationList = (conversations) => (
        conversations?.length > 0 && (
            <div className="mt-4">
                <div className="px-4 py-2 text-xs text-gray-500">Conversations ({conversations.length})</div>
                <div>
                    {conversations.map((conv) => {
                        const isSelected = selectedConvos?.has(conv.id);
                        return (
                            <button
                                key={conv.id}
                                onClick={(e) => { if (e.ctrlKey || e.metaKey) { const newSelected = new Set(selectedConvos || new Set()); if (newSelected.has(conv.id)) { newSelected.delete(conv.id); } else { newSelected.add(conv.id); } setSelectedConvos(newSelected); } else { setSelectedConvos(new Set([conv.id])); handleConversationSelect(conv.id); } }}
                                onContextMenu={(e) => { e.preventDefault(); if (!selectedConvos?.has(conv.id)) { setSelectedConvos(new Set([conv.id])); } setContextMenuPos({ x: e.clientX, y: e.clientY }); }}
                                className={`flex items-center gap-2 px-4 py-2 w-full hover:bg-gray-800 text-left rounded-lg transition-all ${isSelected ? 'bg-gray-700' : ''} ${activeConversationId === conv.id ? 'border-l-2 border-blue-500' : ''}`}
                            >
                                <File size={16} className="text-gray-400 flex-shrink-0" />
                                <div className="flex flex-col overflow-hidden">
                                    <span className="text-sm truncate">{conv.title || conv.id}</span>
                                    <span className="text-xs text-gray-500">{new Date(conv.timestamp).toLocaleString()}</span>
                                </div>
                            </button>
                        );
                    })}
                </div>
            </div>
        )
    );

    const renderContextMenu = () => (
        contextMenuPos && (
            <div
                className="fixed bg-gray-900 border border-gray-700 rounded shadow-lg py-1 z-50"
                style={{ top: contextMenuPos.y, left: contextMenuPos.x }}
                onMouseLeave={() => setContextMenuPos(null)}
            >
                <button onClick={handleSummarizeAndStart} className="flex items-center gap-2 px-4 py-2 hover:bg-gray-800 w-full text-left">
                    <MessageSquare size={16} />
                    <span>Summarize & Start ({selectedConvos?.size || 0})</span>
                </button>
                <button onClick={handleSummarizeAndDraft} className="flex items-center gap-2 px-4 py-2 hover:bg-gray-800 w-full text-left">
                    <Edit size={16} />
                    <span>Summarize & Draft ({selectedConvos?.size || 0})</span>
                </button>
                <button onClick={handleSummarizeAndPrompt} className="flex items-center gap-2 px-4 py-2 hover:bg-gray-800 w-full text-left">
                    <MessageSquare size={16} />
                    <span>Summarize & Prompt ({selectedConvos?.size || 0})</span>
                </button>
            </div>
        )
    );

    const renderFileEditor = () => (
        <div className="flex-1 flex flex-col bg-gray-800">
            <div className="p-2 border-b border-gray-700 flex items-center justify-between flex-shrink-0">
                <div className="text-sm text-gray-300 truncate">{currentFile}</div>
                <div className="flex gap-2">
                    <button onClick={handleFileSave} disabled={!fileChanged} className="px-3 py-1 bg-green-600 hover:bg-green-500 rounded text-sm disabled:opacity-50">Save</button>
                    <button onClick={() => setIsEditing(false)} className="px-3 py-1 bg-gray-600 hover:bg-gray-500 rounded text-sm">Close</button>
                </div>
            </div>
            <div className="flex-1 overflow-y-auto">
                <textarea value={fileContent} onChange={(e) => handleFileContentChange(e.target.value)} className="w-full h-full bg-gray-900 text-gray-200 p-4 font-mono text-sm resize-none focus:outline-none"/>
            </div>
        </div>
    );

    const renderChatView = () => (
        <div className="flex-1 flex flex-col min-h-0">
            <div className="p-2 border-b border-gray-700 text-xs text-gray-500 flex-shrink-0">
                <div>Active Conversation: {activeConversationId || 'None'}</div>
                <div>Messages Count: {messages.length}</div>
                <div>Current Path: {currentPath}</div>
            </div>
            <div className="flex-1 overflow-y-auto space-y-4 p-4">
                {promptModal.isOpen && (
                     <div className="absolute inset-0 bg-black/60 flex items-center justify-center z-40 p-4">
                        <div className="bg-gray-800 p-6 border border-gray-700 rounded-lg shadow-xl max-w-lg w-full">
                            <h3 className="text-lg font-medium mb-3">{promptModal.title}</h3>
                            <p className="text-gray-400 mb-4 text-sm">{promptModal.message}</p>
                            <textarea className="w-full h-48 bg-gray-900 border border-gray-700 rounded p-2 mb-4 text-gray-100 font-mono text-sm" defaultValue={promptModal.defaultValue} id="promptInputModal" autoFocus/>
                            <div className="flex justify-end gap-3">
                                <button className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded text-sm" onClick={() => setPromptModal({ ...promptModal, isOpen: false })}>Cancel</button>
                                <button className="px-4 py-2 bg-blue-600 hover:bg-blue-500 rounded text-sm" onClick={() => { const value = document.getElementById('promptInputModal').value; promptModal.onConfirm?.(value); setPromptModal({ ...promptModal, isOpen: false }); }}>OK</button>
                            </div>
                        </div>
                    </div>
                )}
                {!activeConversationId ? (
                     <div className="flex items-center justify-center h-full text-gray-500">Select or create a conversation</div>
                ) : messages.length === 0 ? (
                     <div className="text-center text-gray-500 pt-10">No messages in this conversation</div>
                ) : (
                    messages.map((message, index) => (
                        <div key={message.id || index} className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'} group`}>
                             <div className={`flex flex-col space-y-1 max-w-[85%] ${message.role === 'user' ? 'items-end' : 'items-start'}`}>
                                <div className="text-xs text-gray-500 opacity-0 group-hover:opacity-100 transition-opacity px-1">
                                    {message.role === 'user' ? '$ ' : '> '}
                                    {message.timestamp && new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    {message.model && ` - ${message.model}`} {message.npc && `(${message.npc})`}
                                </div>
                                <div className={`p-3 rounded-lg ${message.role === 'user' ? 'bg-blue-900 text-white' : 'bg-gray-800'}`}>
                                    <div className="whitespace-pre-wrap font-mono text-sm break-words">
                                        <div dangerouslySetInnerHTML={{ __html: message.content }} />
                                    </div>
                                    {message.attachments && message.attachments.length > 0 && (
                                        <div className="mt-2 flex flex-wrap gap-2">
                                            {message.attachments.map((attachment, idx) => (
                                                <div key={idx} className="text-xs bg-gray-700 rounded px-2 py-1">
                                                    📎 {attachment.name}
                                                    {attachment.data && (<img src={attachment.data} alt={attachment.name} className="mt-2 max-w-[200px] max-h-[200px] rounded-md"/> )}
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    ))
                )}
            </div>

            {uploadedFiles.length > 0 && (
                <div className="px-4 pt-2 flex gap-2 flex-wrap border-t border-gray-700 max-h-28 overflow-y-auto bg-gray-800 flex-shrink-0">
                    {uploadedFiles.map(file => (
                        <div key={file.id} className="relative flex-shrink-0 mb-2">
                            <img
                                src={file.preview || `file://${file.path}`}
                                alt={file.name}
                                className="w-16 h-16 object-cover rounded border border-gray-600"
                            />
                            <button
                                onClick={() => { setUploadedFiles(prev => prev.filter(f => f.id !== file.id)); if (file.preview) URL.revokeObjectURL(file.preview); }}
                                className="absolute -top-1 -right-1 bg-red-600 hover:bg-red-500 text-white rounded-full p-0.5 leading-none"
                                aria-label="Remove file"
                            >
                                <X size={10} strokeWidth={3}/>
                            </button>
                        </div>
                    ))}
                </div>
            )}

            {renderInputArea()}
        </div>
    );

    const renderInputArea = () => (
        <div className="px-4 pt-2 pb-3 border-t border-gray-700 bg-gray-800 flex-shrink-0">
            <div
                className="relative bg-gray-900 border border-gray-700 rounded-lg group" // Added group for potential hover effects
                onDragOver={(e) => { e.preventDefault(); setIsHovering(true); }} // Prevent default to allow drop
                onDragEnter={() => setIsHovering(true)}
                onDragLeave={() => setIsHovering(false)}
                onDrop={(e) => {
                    e.preventDefault(); // Prevent browser from opening file
                    setIsHovering(false);
                    handleDrop(e); // Use existing handleDrop logic
                }}
            >
                {isHovering && (
                    <div className="absolute inset-0 bg-blue-500/20 border-2 border-dashed border-blue-400 rounded-lg flex items-center justify-center z-10 pointer-events-none">
                        <span className="text-blue-300 font-semibold">Drop files here</span>
                    </div>
                )}

                <form onSubmit={handleInputSubmit} className="flex items-end p-2 gap-2 relative z-0"> {/* Ensure form is below indicator if needed */}
                    {/* Hidden file input */}
                    <input
                        ref={fileInputRef}
                        type="file"
                        onChange={handleFileInput}
                        style={{ display: 'none' }}
                        multiple
                        accept="image/*, text/*, application/pdf, .py, .js, .jsx, .ts, .tsx, .html, .css, .json, .md"
                    />
                    {/* Textarea */}
                    <textarea
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleInputSubmit(e); } }}
                        placeholder="Type a message or drop files..." // Update placeholder
                        className="flex-grow bg-[#0b0c0f] text-sm text-gray-300 rounded-lg px-4 py-3 placeholder-gray-600 focus:outline-none border-0 min-h-[56px] max-h-[200px] resize-none"
                        rows={1}
                        style={{ overflowY: 'auto' }}
                    />
                    {/* Attach button */}
                    <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="p-2 text-gray-400 hover:text-gray-200 rounded-lg hover:bg-gray-700 flex-shrink-0"
                        aria-label="Attach file"
                    >
                        <Paperclip size={20} />
                    </button>
                    {/* Send button */}
                    <button
                        type="submit"
                        disabled={!input.trim() && uploadedFiles.length === 0}
                        className="bg-green-600 hover:bg-green-500 text-white rounded-lg px-4 py-2 text-sm flex items-center gap-1 flex-shrink-0 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        <Send size={16}/>
                    </button>
                </form>


                <div className="flex items-center gap-2 px-2 pb-2">
                    <select value={currentModel || ''} onChange={e => setCurrentModel(e.target.value)} className="bg-gray-800 text-xs rounded px-2 py-1 border border-gray-700 flex-grow" disabled={modelsLoading || !!modelsError}>
                        {modelsLoading && <option value="">Loading...</option>}
                        {modelsError && <option value="">Error</option>}
                        {!modelsLoading && !modelsError && availableModels.length === 0 && (<option value="">No models</option> )}
                        {!modelsLoading && !modelsError && availableModels.map(model => (<option key={model.value} value={model.value}>{model.display_name}</option>))}
                    </select>
                    <select value={currentNPC || config?.npc || 'sibiji'} onChange={e => setCurrentNPC(e.target.value)} className="bg-gray-800 text-xs rounded px-2 py-1 border border-gray-700 flex-grow">
                        <option value="sibiji">NPC: sibiji </option>
                    </select>
                </div>
            </div>
        </div>
    );

    const renderMainContent = () => (
    <main className={`flex-1 flex flex-col bg-gray-900 ${isDarkMode ? 'dark-mode' : 'light-mode'} overflow-hidden`}>
        {isEditing ? renderFileEditor() : renderChatView()}
    </main>
    );

    const renderModals = () => (
        <>
            <NPCTeamMenu isOpen={npcTeamMenuOpen} onClose={handleCloseNpcTeamMenu} currentPath={currentPath} startNewConversation={startNewConversationWithNpc}/>
            <ToolMenu isOpen={toolMenuOpen} onClose={() => setToolMenuOpen(false)} currentPath={currentPath}/>
            <SettingsMenu isOpen={settingsOpen} onClose={() => setSettingsOpen(false)} currentPath={currentPath} onPathChange={(newPath) => { setCurrentPath(newPath); }}/>
            {isMacroInputOpen && (<MacroInput isOpen={isMacroInputOpen} currentPath={currentPath} onClose={() => { setIsMacroInputOpen(false); window.api?.hideMacro?.(); }} onSubmit={({ macro, conversationId, result }) => { setActiveConversationId(conversationId); setCurrentConversation({ id: conversationId, title: macro.trim().slice(0, 50) }); if (!result) { setMessages([{ role: 'user', content: macro, timestamp: new Date().toISOString(), type: 'command' }, { role: 'assistant', content: 'Processing...', timestamp: new Date().toISOString(), type: 'message' }]); } else { setMessages([{ role: 'user', content: macro, timestamp: new Date().toISOString(), type: 'command' }, { role: 'assistant', content: result?.output || 'No response', timestamp: new Date().toISOString(), type: 'message' }]); } refreshConversations(); }}/> )}
            <PhotoViewer isOpen={photoViewerOpen} onClose={() => setPhotoViewerOpen(false)} type={photoViewerType}/>
        </>
    );

    // --- Main Return uses the Render Functions ---
    return (
        <div className={`chat-container ${isDarkMode ? 'dark-mode' : 'light-mode'} h-screen flex flex-col bg-gray-900 text-gray-100 font-mono`}>
            <div className="flex flex-1 overflow-hidden">
                {renderSidebar()}
                {renderMainContent()}
            </div>
            {renderModals()}
        </div>
    );
};

export default ChatInterface;