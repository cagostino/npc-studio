const { contextBridge, ipcRenderer, shell } = require('electron');

// Expose all API functions through contextBridge
contextBridge.exposeInMainWorld('api', {
    // Directory operations
    getDefaultConfig: () => ipcRenderer.invoke('getDefaultConfig'),
    readDirectoryStructure: (dirPath) => ipcRenderer.invoke('readDirectoryStructure', dirPath),
    goUpDirectory: (currentPath) => ipcRenderer.invoke('goUpDirectory', currentPath),
    readDirectory: (dirPath) => ipcRenderer.invoke('readDirectory', dirPath),
    ensureDirectory: (dirPath) => ipcRenderer.invoke('ensureDirectory', dirPath),
    readDirectoryImages: (dirPath) => ipcRenderer.invoke('readDirectoryImages', dirPath),
    open_directory_picker: () => ipcRenderer.invoke('open_directory_picker'),

    // Conversation operations
    getConversations: (path) => ipcRenderer.invoke('getConversations', path),
    getConversationsInDirectory: (path) => ipcRenderer.invoke('getConversationsInDirectory', path),
    getConversationMessages: (id) => ipcRenderer.invoke('getConversationMessages', id),
    createConversation: (data) => ipcRenderer.invoke('createConversation', data),
    sendMessage: (data) => ipcRenderer.invoke('sendMessage', data),
    waitForScreenshot: (path) => ipcRenderer.invoke('wait-for-screenshot', path),
    saveNPC: (data) => ipcRenderer.invoke('save-npc', data),

    // Command operations
    executeCommand: (data) => ipcRenderer.invoke('executeCommand', {
        commandstr: data.commandstr,
        current_path: data.currentPath,
        conversationId: data.conversationId,
        model: data.model,
        npc: data.npc,
    }),
    executeCommandStream: (data) => ipcRenderer.invoke('executeCommandStream', data),
    onStreamData: (callback) => ipcRenderer.on('stream-data', callback),
    onStreamComplete: (callback) => ipcRenderer.on('stream-complete', callback),
    onStreamError: (callback) => ipcRenderer.on('stream-error', callback),



    checkFileExists: async (path) => {
        try {
            await fs.access(path);
            return true;
        } catch {
            return false;
        }
    },

    showPromptDialog: (options) => ipcRenderer.invoke('showPromptDialog', options),

    getToolsGlobal: () => ipcRenderer.invoke('get-tools-global'),
    getToolsProject: (currentPath) => ipcRenderer.invoke('get-tools-project', currentPath),
    saveTool: (data) => ipcRenderer.invoke('save-tool', data),

    getNPCTeamProject: async (currentPath) => {
        if (!currentPath || typeof currentPath !== 'string') {
          throw new Error('currentPath must be a string');
        }
        return await ipcRenderer.invoke('getNPCTeamProject', currentPath);
      },
    getMessageAttachments: (messageId) => ipcRenderer.invoke('get-message-attachments', messageId),
    getAttachment: (attachmentId) => ipcRenderer.invoke('get-attachment', attachmentId),

    getNPCTeamGlobal: () => ipcRenderer.invoke('getNPCTeamGlobal'),
    checkServerConnection: () => ipcRenderer.invoke('checkServerConnection'),
    getWorkingDirectory: () => ipcRenderer.invoke('getWorkingDirectory'),
    setWorkingDirectory: (dir) => ipcRenderer.invoke('setWorkingDirectory', dir),
    deleteConversation: (id) => ipcRenderer.invoke('deleteConversation', id),
    convertFileToBase64: (path) => ipcRenderer.invoke('convertFileToBase64', path),
    get_attachment_response: (attachmentData, conversationId) =>
        ipcRenderer.invoke('get_attachment_response', attachmentData, conversationId),
    updateShortcut: (shortcut) => ipcRenderer.invoke('update-shortcut', shortcut),
    onShowMacroInput: (callback) => {
      ipcRenderer.on('show-macro-input', callback);
      return () => ipcRenderer.removeListener('show-macro-input', callback);
    },
    submitMacro: (macro) => ipcRenderer.invoke('submit-macro', macro),
    captureScreenshot: async () => {
        console.log('PRELOAD: Capture screenshot called');  // This should show up
        try {
            const result = await ipcRenderer.invoke('captureScreenshot');
            console.log('PRELOAD: Got result:', result);
            return result;
        } catch (error) {
            console.error('PRELOAD: Screenshot error:', error);
            throw error;
        }
    },
    onScreenshotCaptured: (callback) => {
        const wrappedCallback = (_, data) => callback(data);
        ipcRenderer.on('screenshot-captured', wrappedCallback);
        return () => ipcRenderer.removeListener('screenshot-captured', wrappedCallback);
    },

    // Shell operations
    openExternal: (url) => ipcRenderer.invoke('openExternal', url),
});