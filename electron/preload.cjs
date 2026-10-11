'use strict';
const { contextBridge, ipcRenderer } = require('electron');
const subscribe=(channel,callback)=>{if(typeof callback!=='function')return ()=>{};const listener=(_event,value)=>callback(value);ipcRenderer.on(channel,listener);return ()=>ipcRenderer.removeListener(channel,listener);};

contextBridge.exposeInMainWorld('saturnDesktop', Object.freeze({
  platform: process.platform,
  isDesktop: true,
  controllerStatus:()=>ipcRenderer.invoke('controller:status'),
  windowAction:action=>ipcRenderer.invoke('window:action',action),
  rescanControllers:()=>ipcRenderer.invoke('controller:rescan'),
  browseControllerFiles:options=>ipcRenderer.invoke('controller:files',options),
  onControllerStatus:callback=>subscribe('controller:changed',callback),
  onControllerFrame:callback=>subscribe('controller:frame',callback),
  catalogSearch: parameters => ipcRenderer.invoke('catalog:search', parameters),
  gameDetails: id => ipcRenderer.invoke('catalog:details', id),
  addGame: appId => ipcRenderer.invoke('steam:addGame', appId),
  removeGame: appId => ipcRenderer.invoke('steam:removeGame', appId),
  hasGame: appId => ipcRenderer.invoke('steam:hasGame', appId),
  getInstalledAppIds: () => ipcRenderer.invoke('steam:getInstalledAppIds'),
  getSteamStatus: () => ipcRenderer.invoke('steam:getSteamStatus'),
  restartSteam: () => ipcRenderer.invoke('steam:restartSteam'),
  
  // Denuvo Fixes
  getDenuvoFixes: appId => ipcRenderer.invoke('steam:getDenuvoFixes', appId),
  applyDenuvoFix: ({ appId, fixId, slot, installDir }) => ipcRenderer.invoke('steam:applyDenuvoFix', { appId, fixId, slot, installDir }),
  revertDenuvoFix: ({ installDir, fixId }) => ipcRenderer.invoke('steam:revertDenuvoFix', { installDir, fixId }),

  // DLC Generator
  generateDlc: ({ appId, baseAppId, gameName }) => ipcRenderer.invoke('steam:generateDlc', { appId, baseAppId, gameName }),

  // Lua Vault / Builds
  getVaultVariants: appId => ipcRenderer.invoke('steam:getVaultVariants', appId),
  applyVaultVariant: ({ appId, hash }) => ipcRenderer.invoke('steam:applyVaultVariant', { appId, hash }),

  // Settings & Hubcap
  getHubcapStats: () => ipcRenderer.invoke('steam:getHubcapStats'),
  getSettings: () => ipcRenderer.invoke('steam:getSettings'),
  saveSettings: settings => ipcRenderer.invoke('steam:saveSettings', settings),

  // Shell Helpers
  openLuaFolder: appId => ipcRenderer.invoke('steam:openLuaFolder', appId),
  openExternalUrl: url => ipcRenderer.invoke('steam:openExternalUrl', url),
  checkSources: appId => ipcRenderer.invoke('steam:checkSources', appId),
  getLuaContent: appId => ipcRenderer.invoke('steam:getLuaContent', appId),
  importLocalFiles: filePaths => ipcRenderer.invoke('steam:importLocalFiles', filePaths),
  selectLocalFiles: () => ipcRenderer.invoke('steam:selectLocalFiles'),

  // OnlineFix & Deep Linking
  getOnlineFix: appId => ipcRenderer.invoke('steam:getOnlineFix', appId),
  applyOnlineFix: ({ appId, installDir }) => ipcRenderer.invoke('steam:applyOnlineFix', { appId, installDir }),
  selectOnlineFixArchive: () => ipcRenderer.invoke('steam:selectOnlineFixArchive'),
  installOnlineFixArchive: ({ appId, installDir, archivePath }) => ipcRenderer.invoke('steam:installOnlineFixArchive', { appId, installDir, archivePath }),
  detectGameInstallDir: ({ appId, gameName }) => ipcRenderer.invoke('steam:detectGameInstallDir', { appId, gameName }),
  selectFolder: () => ipcRenderer.invoke('steam:selectFolder'),
  onProtocolUrl: callback => ipcRenderer.on('saturn:protocol-url', (_event, url) => callback(url))
}));
