const { contextBridge } = require('electron');
contextBridge.exposeInMainWorld('nativeAPI', {});
