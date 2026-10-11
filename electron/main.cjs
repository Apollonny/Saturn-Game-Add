'use strict';
const { app, BrowserWindow, Menu, nativeTheme, screen, ipcMain, shell } = require('electron');
const catalogService = require('./steam-catalog.cjs');
const SteamAddBackend = require('./steam-add-backend.cjs');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const {ControllerService}=require('./controllers.cjs');

process.on('uncaughtException', (err) => {
  console.warn('[MainProcess] Uncaught exception prevented:', err ? err.message || err : 'Unknown error');
});
process.on('unhandledRejection', (reason) => {
  console.warn('[MainProcess] Unhandled rejection prevented:', reason);
});

const steamBackend = new SteamAddBackend();
setImmediate(() => {
  if(testMode)return;
  try {
    steamBackend.startHttpServer(6767);
  } catch (err) {
    console.warn('[MainProcess] HTTP Server deferred start note:', err.message);
  }
});

let mainWindow;
let controllerService;
const entry = path.join(__dirname, '..', 'index.html');
const entryURL = pathToFileURL(entry).href;
const testMode = process.env.SATURN_TEST_MODE === '1';

function trustedSender(event) {
  return event.sender === mainWindow?.webContents && event.senderFrame?.url.split('#')[0] === entryURL;
}
ipcMain.handle('controller:status',event=>trustedSender(event)?controllerService?.status()||{devices:[],frames:[]}:null);
ipcMain.handle('controller:rescan',async event=>trustedSender(event)?await controllerService?.scan():null);
ipcMain.handle('window:action',(event,action)=>{
  if(!trustedSender(event))return false;
  if(action==='maximize'){if(mainWindow.isMaximized())mainWindow.unmaximize();else mainWindow.maximize();return true;}
  if(action==='close'){mainWindow.close();return true;}
  return false;
});
ipcMain.handle('controller:files',async(event,{directory=null,extensions=[],foldersOnly=false}={})=>{
  if(!trustedSender(event))return {ok:false,error:'Geçersiz pencere.'};
  const fs=require('node:fs/promises');
  try{
    if(directory===null){
      const drives=[];for(let letter=65;letter<=90;letter++){const root=String.fromCharCode(letter)+':\\';try{await fs.access(root);drives.push({name:root,path:root,directory:true});}catch{}}
      return {ok:true,directory:null,parent:null,entries:drives};
    }
    if(typeof directory!=='string'||directory.includes('\0')||!path.isAbsolute(directory))throw Error('Geçerli bir klasör yolu gir.');
    const normalized=path.resolve(directory),allowed=new Set(Array.isArray(extensions)?extensions.filter(ext=>/^\.[a-z0-9]{1,12}$/i.test(ext)).map(ext=>ext.toLowerCase()):[]);
    const listing=await fs.readdir(normalized,{withFileTypes:true});
    const entries=listing.filter(entry=>entry.isDirectory()||(!foldersOnly&&entry.isFile()&&(!allowed.size||allowed.has(path.extname(entry.name).toLowerCase())))).sort((a,b)=>Number(b.isDirectory())-Number(a.isDirectory())||a.name.localeCompare(b.name,'tr')).slice(0,2000).map(entry=>({name:entry.name,path:path.join(normalized,entry.name),directory:entry.isDirectory()}));
    return {ok:true,directory:normalized,parent:path.dirname(normalized)===normalized?null:path.dirname(normalized),entries};
  }catch(error){return {ok:false,error:error.code==='EACCES'?'Bu klasöre erişilemiyor.':error.code==='ENOENT'?'Klasör bulunamadı.':error.message};}
});

ipcMain.handle('catalog:search', async (event, parameters) => {
  if (!trustedSender(event)) return { ok: false, error: 'Geçersiz pencere.' };
  try {
    return { ok: true, ...await catalogService.search(parameters && typeof parameters === 'object' ? parameters : {}) };
  } catch (error) {
    return { ok: false, error: error.message };
  }
});

ipcMain.handle('catalog:details', async (event, id) => {
  if (!trustedSender(event)) return { ok: false, error: 'Geçersiz pencere.' };
  try {
    return { ok: true, game: await catalogService.details(id) };
  } catch (error) {
    return { ok: false, error: error.message };
  }
});

// Steam Add & LuaTools IPC Handlers
ipcMain.handle('steam:addGame', async (event, appId) => {
  if (!trustedSender(event)) return { success: false, error: 'Geçersiz pencere.' };
  try { return await steamBackend.addGame(appId); } catch (err) { return { success: false, error: err.message }; }
});

ipcMain.handle('steam:removeGame', async (event, appId) => {
  if (!trustedSender(event)) return { success: false, error: 'Geçersiz pencere.' };
  try { return steamBackend.removeGame(appId); } catch (err) { return { success: false, error: err.message }; }
});

ipcMain.handle('steam:hasGame', async (event, appId) => {
  if (!trustedSender(event)) return { success: false, error: 'Geçersiz pencere.' };
  try { return steamBackend.hasGame(appId); } catch (err) { return false; }
});

ipcMain.handle('steam:getInstalledAppIds', async (event) => {
  if (!trustedSender(event)) return [];
  try { return steamBackend.getInstalledAppIds(); } catch (err) { return []; }
});

ipcMain.handle('steam:getSteamStatus', async (event) => {
  if (!trustedSender(event)) return { installed: false, running: false };
  try { return steamBackend.getSteamStatus(); } catch (err) { return { installed: false, running: false }; }
});

ipcMain.handle('steam:restartSteam', async (event) => {
  if (!trustedSender(event)) return { success: false, error: 'Geçersiz pencere.' };
  try { return await steamBackend.restartSteam(); } catch (err) { return { success: false, error: err.message }; }
});

// Denuvo & OnlineFix
ipcMain.handle('steam:getDenuvoFixes', async (event, appId) => {
  if (!trustedSender(event)) return { success: false, fixes: null };
  try { return await steamBackend.getDenuvoFixes(appId); } catch (err) { return { success: false, error: err.message }; }
});

ipcMain.handle('steam:applyDenuvoFix', async (event, { appId, fixId, slot, installDir }) => {
  if (!trustedSender(event)) return { success: false, error: 'Geçersiz pencere.' };
  try { return await steamBackend.applyDenuvoFix(appId, fixId, slot, installDir); } catch (err) { return { success: false, error: err.message }; }
});

ipcMain.handle('steam:revertDenuvoFix', async (event, { installDir, fixId }) => {
  if (!trustedSender(event)) return { success: false, error: 'Geçersiz pencere.' };
  try { return steamBackend.revertDenuvoFix(installDir, fixId); } catch (err) { return { success: false, error: err.message }; }
});

ipcMain.handle('steam:getOnlineFix', async (event, appId) => {
  if (!trustedSender(event)) return { success: false, fix: null };
  try { return steamBackend.getOnlineFix(appId); } catch (err) { return { success: false, error: err.message }; }
});

ipcMain.handle('steam:applyOnlineFix', async (event, { appId, installDir }) => {
  if (!trustedSender(event)) return { success: false, error: 'Geçersiz pencere.' };
  try { return steamBackend.applyOnlineFix({ appId, installDir }); } catch (err) { return { success: false, error: err.message }; }
});

ipcMain.handle('steam:selectOnlineFixArchive', async (event) => {
  if (!trustedSender(event)) return null;
  try {
    const { dialog } = require('electron');
    const result = await dialog.showOpenDialog(mainWindow, {
      title: 'OnlineFix Yama Paketini Seç (.zip, .rar, .7z, .dll)',
      properties: ['openFile'],
      filters: [
        { name: 'OnlineFix Arşiv Dosyaları', extensions: ['zip', 'rar', '7z', 'dll', 'ini'] },
        { name: 'Tüm Dosyalar', extensions: ['*'] }
      ]
    });
    if (!result.canceled && result.filePaths.length > 0) {
      return result.filePaths[0];
    }
  } catch (err) {}
  return null;
});

ipcMain.handle('steam:installOnlineFixArchive', async (event, { appId, installDir, archivePath }) => {
  if (!trustedSender(event)) return { success: false, error: 'Geçersiz pencere.' };
  try { return steamBackend.installOnlineFixArchive({ appId, installDir, archivePath }); } catch (err) { return { success: false, error: err.message }; }
});

ipcMain.handle('steam:detectGameInstallDir', async (event, { appId, gameName }) => {
  if (!trustedSender(event)) return null;
  try { return steamBackend.detectGameInstallDir(appId, gameName); } catch (err) { return null; }
});

ipcMain.handle('steam:selectFolder', async (event) => {
  if (!trustedSender(event)) return null;
  try {
    const { dialog } = require('electron');
    const result = await dialog.showOpenDialog(mainWindow, {
      title: 'Oyun Klasörünü Seç (Install Directory)',
      properties: ['openDirectory']
    });
    if (!result.canceled && result.filePaths.length > 0) {
      return result.filePaths[0];
    }
  } catch (err) {}
  return null;
});

// DLC Generator
ipcMain.handle('steam:generateDlc', async (event, { appId, baseAppId, gameName }) => {
  if (!trustedSender(event)) return { success: false, error: 'Geçersiz pencere.' };
  try { return await steamBackend.generateDlc(appId, baseAppId, gameName); } catch (err) { return { success: false, error: err.message }; }
});

// Vault / Builds
ipcMain.handle('steam:getVaultVariants', async (event, appId) => {
  if (!trustedSender(event)) return [];
  try { return steamBackend.getVaultVariants(appId); } catch (err) { return []; }
});

ipcMain.handle('steam:applyVaultVariant', async (event, { appId, hash }) => {
  if (!trustedSender(event)) return { success: false, error: 'Geçersiz pencere.' };
  try { return steamBackend.applyVaultVariant(appId, hash); } catch (err) { return { success: false, error: err.message }; }
});

// Settings & Hubcap
ipcMain.handle('steam:getHubcapStats', async (event) => {
  if (!trustedSender(event)) return null;
  return await steamBackend.getHubcapStats();
});

ipcMain.handle('steam:getSettings', async (event) => {
  if (!trustedSender(event)) return {};
  return steamBackend.settings;
});

ipcMain.handle('steam:saveSettings', async (event, settings) => {
  if (!trustedSender(event)) return false;
  return steamBackend.saveSettings(settings);
});

// Shell & Management Helpers
ipcMain.handle('steam:openLuaFolder', async (event, appId) => {
  if (!trustedSender(event)) return false;
  const plugDir = steamBackend.getStPlugInDir();
  if (!plugDir) return false;
  const fs = require('fs');
  const luaFile = path.join(plugDir, `${appId}.lua`);
  if (fs.existsSync(luaFile)) {
    shell.showItemInFolder(luaFile);
  } else if (fs.existsSync(plugDir)) {
    shell.openPath(plugDir);
  }
  return true;
});

ipcMain.handle('steam:openExternalUrl', async (event, url) => {
  if (!trustedSender(event)) return false;
  if (typeof url === 'string' && (url.startsWith('https://') || url.startsWith('http://') || url.startsWith('steam://'))) {
    shell.openExternal(url);
    return true;
  }
  return false;
});

ipcMain.handle('steam:checkSources', async (event, appId) => {
  if (!trustedSender(event)) return {};
  return await steamBackend.checkSources(appId);
});

ipcMain.handle('steam:getLuaContent', async (event, appId) => {
  if (!trustedSender(event)) return null;
  const plugDir = steamBackend.getStPlugInDir();
  if (!plugDir) return null;
  const fs = require('fs');
  const luaFile = path.join(plugDir, `${appId}.lua`);
  if (fs.existsSync(luaFile)) {
    return fs.readFileSync(luaFile, 'utf8');
  }
  return null;
});

ipcMain.handle('steam:importLocalFiles', async (event, filePaths) => {
  if (!trustedSender(event)) return { success: false, error: 'Geçersiz pencere.' };
  return steamBackend.importLocalFiles(filePaths);
});

ipcMain.handle('steam:selectLocalFiles', async (event) => {
  if (!trustedSender(event)) return null;
  const { dialog } = require('electron');
  const result = await dialog.showOpenDialog(mainWindow, {
    title: 'Steam Oyun Dosyalarını Seç (.lua, .manifest, .zip)',
    properties: ['openFile', 'multiSelections'],
    filters: [
      { name: 'Steam Game Add Files', extensions: ['lua', 'manifest', 'zip'] },
      { name: 'Tüm Dosyalar', extensions: ['*'] }
    ]
  });
  if (!result.canceled && result.filePaths.length > 0) {
    return steamBackend.importLocalFiles(result.filePaths);
  }
  return null;
});

app.setName('Saturn Game Add');
if (process.platform === 'win32') app.setAppUserModelId('local.saturn.gameadd');
if (process.env.SATURN_TEST_DATA) app.setPath('userData', process.env.SATURN_TEST_DATA);

if (!testMode&&process.defaultApp) {
  if (process.argv.length >= 2) {
    app.setAsDefaultProtocolClient('saturn', process.execPath, [path.resolve(process.argv[1])]);
  }
} else if(!testMode) {
  app.setAsDefaultProtocolClient('saturn');
}

function handleDeepLinkUrl(url) {
  if (typeof url === 'string' && url.startsWith('saturn://')) {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.show();
      mainWindow.focus();
      mainWindow.webContents.send('saturn:protocol-url', url);
    }
  }
}

function createWindow() {
  nativeTheme.themeSource = 'dark';
  const workArea = screen.getPrimaryDisplay().workAreaSize;
  mainWindow = new BrowserWindow({
    width: Math.min(1440, workArea.width - 48),
    height: Math.min(980, workArea.height - 48),
    minWidth: Math.min(960, workArea.width - 48),
    minHeight: Math.min(680, workArea.height - 48),
    title: 'Saturn — Steam Game Add',
    backgroundColor: '#000000',
    show: false,
    icon: path.join(__dirname, '..', 'assets', 'icon.ico'),
    titleBarStyle: 'hidden',
    titleBarOverlay: { color: '#000000', symbolColor: '#a9acb5', height: 34 },
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      webSecurity: true,
      spellcheck: false,
      backgroundThrottling: !testMode
    }
  });
  const controllerWindow=mainWindow,instanceService=new ControllerService({
    onStatus:status=>{if(mainWindow===controllerWindow&&!controllerWindow.webContents.isDestroyed())controllerWindow.webContents.send('controller:changed',status);},
    onFrame:frame=>{if(mainWindow===controllerWindow&&controllerWindow.isFocused()&&!controllerWindow.webContents.isDestroyed())controllerWindow.webContents.send('controller:frame',frame);}
  });
  controllerService=instanceService;instanceService.start();
  mainWindow.on('blur',()=>instanceService.setForeground(false));
  mainWindow.on('focus',()=>{instanceService.setForeground(true);for(const frame of instanceService.status().frames)controllerWindow.webContents.send('controller:frame',frame);});

  Menu.setApplicationMenu(null);
  mainWindow.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
  mainWindow.webContents.on('will-navigate', (event, url) => {
    if (url.split('#')[0] !== entryURL) event.preventDefault();
  });
  mainWindow.webContents.session.setPermissionRequestHandler((_contents, _permission, callback) => callback(false));
  mainWindow.webContents.session.setPermissionCheckHandler(() => false);
  mainWindow.once('ready-to-show', () => {
    if (!testMode) mainWindow.show();
    const startUrl = process.argv.find(arg => typeof arg === 'string' && arg.startsWith('saturn://'));
    if (startUrl) handleDeepLinkUrl(startUrl);
  });
  mainWindow.on('closed', () => {instanceService.stop().catch(()=>{});if(controllerService===instanceService)controllerService=null;if(mainWindow===controllerWindow)mainWindow=null;});
  mainWindow.loadFile(entry);
}

if (!app.requestSingleInstanceLock()) app.quit();
else {
  app.on('second-instance', (event, commandLine) => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.show();
      mainWindow.focus();
    }
    const deepUrl = commandLine.find(arg => typeof arg === 'string' && arg.startsWith('saturn://'));
    if (deepUrl) handleDeepLinkUrl(deepUrl);
  });
  app.on('open-url', (event, url) => {
    event.preventDefault();
    handleDeepLinkUrl(url);
  });
  app.whenReady().then(createWindow);
  app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit();
  });
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
}
