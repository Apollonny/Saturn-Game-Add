'use strict';

const fs = require('fs');
const path = require('path');
const http = require('http');
const https = require('https');
const { execSync, spawn } = require('child_process');
const os = require('os');
const crypto = require('crypto');

class SteamAddBackend {
  constructor() {
    this._cachedSteamPath = undefined;
    this.autoUpdate = true;
    this.settingsPath = path.join(os.homedir(), 'AppData', 'Roaming', 'SaturnGameAdd', 'settings.json');
    this.vaultRootDir = path.join(os.homedir(), 'AppData', 'Roaming', 'SaturnGameAdd', 'luavault');
    this.settings = this.loadSettings();
  }

  get steamPath() {
    return this.detectSteamPath();
  }

  loadSettings() {
    try {
      if (fs.existsSync(this.settingsPath)) {
        return JSON.parse(fs.readFileSync(this.settingsPath, 'utf8'));
      }
    } catch {}
    return { hubcapKey: '', autoUpdate: true, fastFetch: true };
  }

  saveSettings(newSettings) {
    try {
      this.settings = { ...this.settings, ...newSettings };
      fs.mkdirSync(path.dirname(this.settingsPath), { recursive: true });
      fs.writeFileSync(this.settingsPath, JSON.stringify(this.settings, null, 2), 'utf8');
      return true;
    } catch {
      return false;
    }
  }

  detectSteamPath() {
    if (this._cachedSteamPath !== undefined) return this._cachedSteamPath;
    const registryLocations = [
      { hive: 'HKCU\\SOFTWARE\\Valve\\Steam', key: 'SteamPath' },
      { hive: 'HKLM\\SOFTWARE\\WOW6432Node\\Valve\\Steam', key: 'InstallPath' },
      { hive: 'HKLM\\SOFTWARE\\Valve\\Steam', key: 'InstallPath' }
    ];

    for (const loc of registryLocations) {
      try {
        const output = execSync(`reg query "${loc.hive}" /v "${loc.key}"`, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] });
        const match = output.match(/REG_SZ\s+(.+)/i);
        if (match && match[1]) {
          const foundPath = path.normalize(match[1].trim().replace(/\//g, '\\'));
          if (fs.existsSync(path.join(foundPath, 'steam.exe'))) {
            this._cachedSteamPath = foundPath;
            return foundPath;
          }
        }
      } catch (e) {}
    }

    const commonPaths = [
      'C:\\Program Files (x86)\\Steam',
      'C:\\Program Files\\Steam',
      'D:\\Steam',
      'E:\\Steam'
    ];
    for (const p of commonPaths) {
      if (fs.existsSync(path.join(p, 'steam.exe'))) {
        this._cachedSteamPath = p;
        return p;
      }
    }

    this._cachedSteamPath = null;
    return null;
  }

  getStPlugInDir() {
    return this.steamPath ? path.join(this.steamPath, 'config', 'stplug-in') : null;
  }

  getDepotCacheDir() {
    return this.steamPath ? path.join(this.steamPath, 'depotcache') : null;
  }

  hasGame(appId) {
    if (!/^[1-9]\d{0,9}$/.test(String(appId))) return false;
    const plugDir = this.getStPlugInDir();
    if (!plugDir) return false;
    const luaFile = path.join(plugDir, `${appId}.lua`);
    return fs.existsSync(luaFile);
  }

  getInstalledAppIds() {
    const plugDir = this.getStPlugInDir();
    if (!plugDir || !fs.existsSync(plugDir)) return [];
    try {
      const files = fs.readdirSync(plugDir);
      const installed = [];
      for (const file of files) {
        if (file.toLowerCase().endsWith('.lua')) {
          const appId = file.replace(/\.lua$/i, '');
          if (/^\d+$/.test(appId)) {
            installed.push(appId);
          }
        }
      }
      return installed;
    } catch {
      return [];
    }
  }

  getSteamStatus() {
    return {
      installed: !!this.steamPath,
      running: this.isSteamRunning(),
      steamPath: this.steamPath,
      stPlugInDir: this.getStPlugInDir(),
      depotCacheDir: this.getDepotCacheDir()
    };
  }

  isSteamRunning() {
    try {
      const output = execSync('tasklist /FI "IMAGENAME eq steam.exe" /NH', { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] });
      return output.toLowerCase().includes('steam.exe');
    } catch {
      return false;
    }
  }

  stopSteam() {
    try {
      execSync('taskkill /F /IM steam.exe /T', { stdio: ['ignore', 'ignore', 'ignore'] });
      return true;
    } catch {
      return false;
    }
  }

  startSteam() {
    if (!this.steamPath) return false;
    const exe = path.join(this.steamPath, 'steam.exe');
    if (!fs.existsSync(exe)) return false;
    try {
      spawn(exe, [], { detached: true, stdio: 'ignore' }).unref();
      return true;
    } catch {
      return false;
    }
  }

  async restartSteam() {
    if (!this.steamPath) return false;
    if (this.isSteamRunning() && !this.stopSteam()) return false;
    await new Promise(resolve => setTimeout(resolve,1500));
    return this.startSteam();
  }

  commentOutManifestPins(luaContent) {
    const lines = luaContent.split('\n');
    for (let i = 0; i < lines.length; i++) {
      const trimmed = lines[i].trimStart();
      if (trimmed.startsWith('--')) continue;
      lines[i] = lines[i].replace(/^(\s*)(setManifestid\s*\()/gi, '$1-- $2');
    }
    return lines.join('\n');
  }

  getAllFiles(dirPath, arrayOfFiles = []) {
    try {
      const files = fs.readdirSync(dirPath);
      for (const file of files) {
        const fullPath = path.join(dirPath, file);
        if (fs.statSync(fullPath).isDirectory()) {
          arrayOfFiles = this.getAllFiles(fullPath, arrayOfFiles);
        } else {
          arrayOfFiles.push(fullPath);
        }
      }
    } catch {}
    return arrayOfFiles;
  }

  importLocalFiles(filePaths) {
    const plugDir = this.getStPlugInDir();
    const depotDir = this.getDepotCacheDir();
    if (!plugDir || !depotDir) {
      return { success: false, error: 'Steam dizini bulunamadı.' };
    }
    fs.mkdirSync(plugDir, { recursive: true });
    fs.mkdirSync(depotDir, { recursive: true });

    let importedLua = 0;
    let importedManifest = 0;
    let importedAcf = 0;
    const addedAppIds = [];

    const processSinglePath = (fullPath) => {
      if (!fs.existsSync(fullPath)) return;
      const stat = fs.statSync(fullPath);

      if (stat.isDirectory()) {
        const nested = this.getAllFiles(fullPath);
        for (const item of nested) {
          processSinglePath(item);
        }
        return;
      }

      const lower = fullPath.toLowerCase();

      if (lower.endsWith('.lua')) {
        const fileName = path.basename(fullPath);
        const match = fileName.match(/^(\d+)/);
        let appId = match ? match[1] : null;
        let content = fs.readFileSync(fullPath, 'utf8');
        if (!appId) {
          const appMatch = content.match(/addApp\s*\(\s*(\d+)/i);
          if (appMatch) appId = appMatch[1];
        }
        if (appId) {
          if (this.autoUpdate) {
            content = this.commentOutManifestPins(content);
          }
          const destLua = path.join(plugDir, `${appId}.lua`);
          fs.writeFileSync(destLua, content, 'utf8');
          this.captureToVault(appId, destLua, 'custom_import', 'İçe Aktarılan Lua');
          importedLua++;
          if (!addedAppIds.includes(appId)) addedAppIds.push(appId);
        }
      } else if (lower.endsWith('.manifest')) {
        const fileName = path.basename(fullPath);
        const destManifest = path.join(depotDir, fileName);
        fs.copyFileSync(fullPath, destManifest);
        importedManifest++;
      } else if (lower.endsWith('.acf')) {
        try {
          const content = fs.readFileSync(fullPath, 'utf8');
          const appMatch = content.match(/"appid"\s+"(\d+)"/i);
          if (appMatch && appMatch[1]) {
            const appId = appMatch[1];
            const destLua = path.join(plugDir, `${appId}.lua`);
            if (!fs.existsSync(destLua)) {
              const genLua = `addApp(${appId}, 1, "stplug-in")\n-- Imported from ACF manifest`;
              fs.writeFileSync(destLua, genLua, 'utf8');
              this.captureToVault(appId, destLua, 'acf_import', 'ACF İçe Aktarımı');
              importedLua++;
            }
            importedAcf++;
            if (!addedAppIds.includes(appId)) addedAppIds.push(appId);
          }
        } catch (e) {}
      } else if (lower.endsWith('.txt') || lower.endsWith('.json')) {
        try {
          const content = fs.readFileSync(fullPath, 'utf8');
          const matches = [...content.matchAll(/(?:app\/|appid=|^|\D)(\d{3,10})(?:\D|$)/gi)];
          for (const m of matches) {
            const appId = m[1];
            if (/^[1-9]\d{2,9}$/.test(appId) && !addedAppIds.includes(appId)) {
              const destLua = path.join(plugDir, `${appId}.lua`);
              if (!fs.existsSync(destLua)) {
                const genLua = `addApp(${appId}, 1, "stplug-in")\n-- Bulk list import`;
                fs.writeFileSync(destLua, genLua, 'utf8');
                this.captureToVault(appId, destLua, 'bulk_import', 'Toplu Liste Aktarımı');
                importedLua++;
              }
              addedAppIds.push(appId);
            }
          }
        } catch (e) {}
      } else if (lower.endsWith('.zip')) {
        const tempDir = path.join(os.tmpdir(), `saturn_import_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`);
        try {
          fs.mkdirSync(tempDir, { recursive: true });
          execSync(`tar -xf "${fullPath}" -C "${tempDir}"`, { stdio: ['ignore', 'ignore', 'ignore'] });
          const allExtracted = this.getAllFiles(tempDir);
          for (const extPath of allExtracted) {
            processSinglePath(extPath);
          }
        } catch (e) {
          console.error(e);
        } finally {
          try { fs.rmSync(tempDir, { recursive: true, force: true }); } catch {}
        }
      }
    };

    if (Array.isArray(filePaths)) {
      for (const fp of filePaths) {
        processSinglePath(fp);
      }
    }

    return {
      success: importedLua > 0 || importedManifest > 0 || importedAcf > 0 || addedAppIds.length > 0,
      importedLua,
      importedManifest,
      importedAcf,
      addedAppIds,
      message: `${addedAppIds.length} oyun (${importedLua} .lua, ${importedManifest} .manifest, ${importedAcf} .acf) Steam'e başarıyla aktarıldı.`
    };
  }

  downloadFile(url, destPath, customHeaders = {}) {
    return new Promise((resolve, reject) => {
      const client = url.startsWith('https') ? https : http;
      const headers = { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)', ...customHeaders };
      const req = client.get(url, { headers }, (res) => {
        if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          return this.downloadFile(res.headers.location, destPath, customHeaders).then(resolve).catch(reject);
        }
        if (res.statusCode !== 200) {
          return reject(new Error(`Download failed with HTTP ${res.statusCode}`));
        }
        const fileStream = fs.createWriteStream(destPath);
        res.pipe(fileStream);
        fileStream.on('finish', () => {
          fileStream.close();
          resolve(destPath);
        });
        fileStream.on('error', (err) => {
          fs.unlink(destPath, () => {});
          reject(err);
        });
      });
      req.on('error', reject);
    });
  }

  async checkSources(appId) {
    return new Promise((resolve) => {
      const url = `http://167.235.229.108/check_apis?appid=${appId}`;
      http.get(url, { headers: { 'User-Agent': 'secretgoonpoon' } }, (res) => {
        let body = '';
        res.on('data', chunk => body += chunk);
        res.on('end', () => {
          try {
            const data = JSON.parse(body);
            resolve(data);
          } catch {
            resolve({});
          }
        });
      }).on('error', () => resolve({}));
    });
  }

  async addGame(appId, forceLocked = false) {
    if (!/^[1-9]\d{0,9}$/.test(String(appId))) return { success: false, error: 'Geçersiz Steam App ID.' };
    const plugDir = this.getStPlugInDir();
    const depotDir = this.getDepotCacheDir();

    if (!plugDir || !depotDir) {
      return { success: false, error: 'Steam path not detected. Please make sure Steam is installed.' };
    }

    fs.mkdirSync(plugDir, { recursive: true });
    fs.mkdirSync(depotDir, { recursive: true });

    const downloadSources = [
      { name: 'Sushi Main', url: `https://raw.githubusercontent.com/sushi-dev55-alt/sushitools-games-repo-alt/main/${appId}.zip`, headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' } },
      { name: 'Sushi Primary', url: `https://raw.githubusercontent.com/sushi-dev55/sushitools-games-repo/main/${appId}.zip`, headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' } },
      { name: 'Sushi Alt', url: `https://raw.githubusercontent.com/sushi-dev55-alt/sushitools-games-repo-alt/refs/heads/main/${appId}.zip`, headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' } },
      { name: 'LTSP GitHub', url: `https://raw.githubusercontent.com/madoiscool/LTSP/main/${appId}.zip`, headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' } }
    ];

    if (this.settings && this.settings.hubcapKey) {
      downloadSources.unshift({
        name: 'Hubcap API',
        url: `https://hubcapmanifest.com/api/manifest/${appId}?key=${encodeURIComponent(this.settings.hubcapKey)}`,
        headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' }
      });
    }

    downloadSources.push({
      name: 'Ryuu Server',
      url: `http://167.235.229.108/${appId}`,
      headers: { 'User-Agent': 'secretgoonpoon' }
    });

    let downloadSuccess = false;
    let lastError = null;

    for (const source of downloadSources) {
      const tempDir = path.join(os.tmpdir(), `saturn_add_${appId}_${Date.now()}`);
      const tempZip = path.join(os.tmpdir(), `saturn_${appId}.zip`);

      try {
        fs.mkdirSync(tempDir, { recursive: true });
        await this.downloadFile(source.url, tempZip, source.headers);

        const stat = fs.statSync(tempZip);
        if (stat.size < 100) {
          throw new Error('Downloaded archive is empty or invalid.');
        }

        execSync(`tar -xf "${tempZip}" -C "${tempDir}"`, { stdio: ['ignore', 'ignore', 'ignore'] });

        const allFiles = this.getAllFiles(tempDir);
        let luaInstalled = false;
        let manifestCount = 0;

        for (const fullPath of allFiles) {
          const file = path.basename(fullPath);
          const lower = file.toLowerCase();

          if (lower.endsWith('.lua')) {
            const destLua = path.join(plugDir, `${appId}.lua`);
            let content = fs.readFileSync(fullPath, 'utf8');
            if (this.autoUpdate && !forceLocked) {
              content = this.commentOutManifestPins(content);
            }
            fs.writeFileSync(destLua, content, 'utf8');
            this.captureToVault(appId, destLua, 'build');
            luaInstalled = true;
          } else if (lower.endsWith('.manifest')) {
            const destManifest = path.join(depotDir, file);
            if (!fs.existsSync(destManifest)) {
              fs.copyFileSync(fullPath, destManifest);
            }
            manifestCount++;
          }
        }

        try { fs.unlinkSync(tempZip); } catch {}
        try { fs.rmSync(tempDir, { recursive: true, force: true }); } catch {}

        if (luaInstalled || manifestCount > 0) {
          downloadSuccess = true;
          return {
            success: true,
            luaInstalled,
            manifestCount,
            message: `Oyun ${appId} başarıyla Steam'e eklendi (${manifestCount} manifest, kaynak: ${source.name}).`
          };
        }
      } catch (err) {
        lastError = err;
        try { fs.unlinkSync(tempZip); } catch {}
        try { fs.rmSync(tempDir, { recursive: true, force: true }); } catch {}
      }
    }

    return {
      success: false,
      error: `Oyun indirme başarısız (AppID: ${appId}). Mevcut kaynaklarda bu oyuna ait geçerli lua/manifest dosyası bulunamadı.`
    };
  }

  // ── DLC Unlock Generation ──
  async fetchSteamStoreDlc(appId) {
    return new Promise((resolve) => {
      const url = `https://store.steampowered.com/api/appdetails?appids=${appId}`;
      https.get(url, { headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' } }, (res) => {
        let body = '';
        res.on('data', chunk => body += chunk);
        res.on('end', () => {
          try {
            const parsed = JSON.parse(body);
            const appData = parsed[appId];
            if (appData && appData.success && appData.data) {
              const dlcIds = Array.isArray(appData.data.dlc) ? appData.data.dlc : [];
              const name = appData.data.name || '';
              resolve({ success: true, dlcIds, name });
              return;
            }
          } catch {}
          resolve({ success: false, dlcIds: [], name: '' });
        });
      }).on('error', () => resolve({ success: false, dlcIds: [], name: '' }));
    });
  }

  async generateDlc(appId, baseAppId, gameName = null) {
    const plugDir = this.getStPlugInDir();
    if (!plugDir) return { success: false, error: 'Steam dizini tespit edilemedi.' };

    fs.mkdirSync(plugDir, { recursive: true });
    const targetAppId = String(baseAppId || appId);
    const destLua = path.join(plugDir, `${targetAppId}.lua`);

    // 1. First try remote server
    const remoteUrl = `http://167.235.229.108/api/dlc/generate?appid=${targetAppId}&base=${targetAppId}`;
    const tempLua = path.join(os.tmpdir(), `dlc_${targetAppId}_${Date.now()}.lua`);

    try {
      await this.downloadFile(remoteUrl, tempLua, { 'User-Agent': 'secretgoonpoon' });
      const content = fs.readFileSync(tempLua, 'utf8');
      if (content && content.length > 20) {
        fs.copyFileSync(tempLua, destLua);
        try { fs.unlinkSync(tempLua); } catch {}
        this.captureToVault(targetAppId, destLua, 'dlc_unlock', 'DLC Unlocker');
        return { success: true, message: `${gameName || targetAppId} için DLC kilitleri başarıyla açıldı ve işlendi!` };
      }
    } catch (remoteErr) {
      try { fs.unlinkSync(tempLua); } catch {}
    }

    // 2. Fallback: Query Steam Store API directly for DLC IDs and generate Lua script
    const storeInfo = await this.fetchSteamStoreDlc(targetAppId);
    const titleName = gameName || storeInfo.name || `Steam App ${targetAppId}`;
    
    let existingContent = '';
    if (fs.existsSync(destLua)) {
      try { existingContent = fs.readFileSync(destLua, 'utf8'); } catch {}
    }

    const existingAppIds = new Set();
    if (existingContent) {
      const matches = [...existingContent.matchAll(/addApp\s*\(\s*(\d+)/gi)];
      for (const m of matches) existingAppIds.add(m[1]);
    }

    existingAppIds.add(targetAppId);
    if (storeInfo.dlcIds && storeInfo.dlcIds.length > 0) {
      for (const dlcId of storeInfo.dlcIds) {
        existingAppIds.add(String(dlcId));
      }
    }

    let generatedLua = `-- Saturn Steam Game Add - DLC Unpacker\n`;
    generatedLua += `-- AppID: ${targetAppId}\n`;
    generatedLua += `-- Title: ${titleName}\n`;
    generatedLua += `-- Generated At: ${new Date().toISOString()}\n\n`;

    for (const id of existingAppIds) {
      generatedLua += `addApp(${id}, 1, "stplug-in")\n`;
    }

    fs.writeFileSync(destLua, generatedLua, 'utf8');
    this.captureToVault(targetAppId, destLua, 'dlc_unlock_steam_api', 'Steam API DLC Unlocker');

    const totalCount = existingAppIds.size - 1;
    const msg = totalCount > 0 
      ? `${titleName} için ${totalCount} adet DLC kilidi otomatik üretildi ve .lua dosyasına yazıldı!` 
      : `${titleName} için temel oyun kilidi ve standart DLC kütüphanesi .lua dosyasına yazıldı.`;

    return { success: true, message: msg };
  }

  detectGameInstallDir(appId, gameName = null) {
    // 1. Windows Registry search for Steam App <appId>
    try {
      const regKeys = [
        `HKLM\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Uninstall\\Steam App ${appId}`,
        `HKLM\\SOFTWARE\\WOW6432Node\\Microsoft\\Windows\\CurrentVersion\\Uninstall\\Steam App ${appId}`
      ];
      for (const regKey of regKeys) {
        try {
          const output = execSync(`reg query "${regKey}" /v "InstallLocation"`, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] });
          const match = output.match(/InstallLocation\s+REG_SZ\s+(.+)/i);
          if (match && match[1]) {
            const dir = path.normalize(match[1].trim());
            if (fs.existsSync(dir)) return dir;
          }
        } catch (e) {}
      }
    } catch (e) {}

    if (!this.steamPath) return null;

    // Collect all Steam library paths
    const libraryPaths = [this.steamPath];
    const steamApps = path.join(this.steamPath, 'steamapps');
    const libVdf = path.join(steamApps, 'libraryfolders.vdf');
    if (fs.existsSync(libVdf)) {
      try {
        const content = fs.readFileSync(libVdf, 'utf8');
        const matches = [...content.matchAll(/"path"\s+"([^"]+)"/gi)];
        for (const m of matches) {
          const rawPath = m[1].replace(/\\\\/g, '\\');
          if (fs.existsSync(rawPath) && !libraryPaths.includes(rawPath)) {
            libraryPaths.push(rawPath);
          }
        }
      } catch (e) {}
    }

    // 2. Check appmanifest_<appId>.acf in each library
    for (const libPath of libraryPaths) {
      const acfPath = path.join(libPath, 'steamapps', `appmanifest_${appId}.acf`);
      if (fs.existsSync(acfPath)) {
        try {
          const content = fs.readFileSync(acfPath, 'utf8');
          const match = content.match(/"installdir"\s+"([^"]+)"/i);
          if (match && match[1]) {
            const dir = path.join(libPath, 'steamapps', 'common', match[1]);
            if (fs.existsSync(dir)) return dir;
          }
        } catch (e) {}
      }
    }

    // 3. Fallback: Search common folder names matching gameName
    for (const libPath of libraryPaths) {
      const commonDir = path.join(libPath, 'steamapps', 'common');
      if (fs.existsSync(commonDir)) {
        try {
          const subdirs = fs.readdirSync(commonDir);
          if (gameName) {
            const normalizedGameName = String(gameName).toLowerCase().replace(/[^a-z0-9]/g, '');
            for (const sub of subdirs) {
              const normalizedSub = sub.toLowerCase().replace(/[^a-z0-9]/g, '');
              if (normalizedSub && (normalizedSub === normalizedGameName || normalizedSub.includes(normalizedGameName) || normalizedGameName.includes(normalizedSub))) {
                const fullDir = path.join(commonDir, sub);
                if (fs.statSync(fullDir).isDirectory()) return fullDir;
              }
            }
          }
        } catch (e) {}
      }
    }

    return null;
  }

  // ── Denuvo Fixes ──
  async getDenuvoFixes(appId) {
    const autoDetectedDir = this.detectGameInstallDir(appId);
    return new Promise((resolve) => {
      const url = `http://167.235.229.108/api/denuvo/fixes?appid=${appId}`;
      http.get(url, { headers: { 'User-Agent': 'secretgoonpoon' } }, (res) => {
        let body = '';
        res.on('data', chunk => body += chunk);
        res.on('end', () => {
          try {
            resolve({ success: true, fixes: JSON.parse(body), autoDetectedDir });
          } catch {
            resolve({ success: false, fixes: null, autoDetectedDir });
          }
        });
      }).on('error', (err) => resolve({ success: false, error: err.message, autoDetectedDir }));
    });
  }

  async applyDenuvoFix(appId, fixId, slot, installDir) {
    if (slot === 'manifest') {
      return await this.addGame(appId, true);
    }

    if (!installDir || !fs.existsSync(installDir)) {
      return { success: false, error: 'Game install directory not found.' };
    }

    const fixKey = fixId.replace(/[^a-zA-Z0-9_-]/g, '_');
    const fixDir = path.join(installDir, '.luatools-fix');
    const recordPath = path.join(fixDir, `${fixKey}.json`);

    const tempZip = path.join(os.tmpdir(), `denuvo_${fixKey}.zip`);
    const tempExtract = path.join(os.tmpdir(), `denuvo_extract_${fixKey}`);

    try {
      const downloadUrl = `http://167.235.229.108/api/denuvo/download?fix=${encodeURIComponent(fixId)}&slot=${slot}`;
      await this.downloadFile(downloadUrl, tempZip, { 'User-Agent': 'secretgoonpoon' });

      fs.mkdirSync(tempExtract, { recursive: true });
      execSync(`tar -xf "${tempZip}" -C "${tempExtract}"`, { stdio: ['ignore', 'ignore', 'ignore'] });

      fs.mkdirSync(fixDir, { recursive: true });
      const record = { appId, fixId, appliedAt: new Date().toISOString(), files: [] };

      const walkDir = (currentDir, relDir = '') => {
        const items = fs.readdirSync(currentDir);
        for (const item of items) {
          const fullPath = path.join(currentDir, item);
          const relPath = path.join(relDir, item).replace(/\\/g, '/');
          const destPath = path.join(installDir, relPath);

          if (fs.statSync(fullPath).isDirectory()) {
            walkDir(fullPath, relPath);
          } else {
            let bakRel = null;
            if (fs.existsSync(destPath)) {
              bakRel = `${fixKey}/${relPath}.bak`;
              const bakAbs = path.join(fixDir, bakRel);
              fs.mkdirSync(path.dirname(bakAbs), { recursive: true });
              if (!fs.existsSync(bakAbs)) {
                fs.copyFileSync(destPath, bakAbs);
              }
            }

            fs.mkdirSync(path.dirname(destPath), { recursive: true });
            fs.copyFileSync(fullPath, destPath);

            record.files.push({
              relativePath: relPath,
              action: bakRel ? 'modified' : 'added',
              backupPath: bakRel
            });
          }
        }
      };

      walkDir(tempExtract);
      fs.writeFileSync(recordPath, JSON.stringify(record, null, 2), 'utf8');

      try { fs.unlinkSync(tempZip); } catch {}
      try { fs.rmSync(tempExtract, { recursive: true, force: true }); } catch {}

      return { success: true, message: `Denuvo fix ${fixId} applied successfully.` };
    } catch (err) {
      try { fs.unlinkSync(tempZip); } catch {}
      try { fs.rmSync(tempExtract, { recursive: true, force: true }); } catch {}
      return { success: false, error: err.message };
    }
  }

  revertDenuvoFix(installDir, fixId) {
    try {
      const fixKey = fixId.replace(/[^a-zA-Z0-9_-]/g, '_');
      const fixDir = path.join(installDir, '.luatools-fix');
      const recordPath = path.join(fixDir, `${fixKey}.json`);

      if (!fs.existsSync(recordPath)) {
        return { success: false, error: 'Fix record not found' };
      }

      const record = JSON.parse(fs.readFileSync(recordPath, 'utf8'));
      for (const file of record.files) {
        const destPath = path.join(installDir, file.relativePath);
        if (file.action === 'modified' && file.backupPath) {
          const bakAbs = path.join(fixDir, file.backupPath);
          if (fs.existsSync(bakAbs)) {
            fs.copyFileSync(bakAbs, destPath);
            fs.unlinkSync(bakAbs);
          }
        } else if (file.action === 'added') {
          if (fs.existsSync(destPath)) {
            fs.unlinkSync(destPath);
          }
        }
      }

      fs.unlinkSync(recordPath);
      return { success: true, message: `Fix ${fixId} reverted successfully.` };
    } catch (err) {
      return { success: false, error: err.message };
    }
  }

  // ── Lua Vault / Build Management ──
  captureToVault(appId, luaFilePath, kind = 'build', label = null) {
    try {
      if (!fs.existsSync(luaFilePath)) return null;
      const content = fs.readFileSync(luaFilePath, 'utf8');
      const hash = crypto.createHash('sha256').update(content).digest('hex');

      const appVaultDir = path.join(this.vaultRootDir, String(appId));
      const indexPath = path.join(appVaultDir, 'index.json');
      fs.mkdirSync(appVaultDir, { recursive: true });

      let index = { appId, variants: [] };
      if (fs.existsSync(indexPath)) {
        try { index = JSON.parse(fs.readFileSync(indexPath, 'utf8')); } catch {}
      }

      const variantFile = path.join(appVaultDir, `${hash}.lua`);
      if (!fs.existsSync(variantFile)) {
        fs.writeFileSync(variantFile, content, 'utf8');
      }

      const existingIndex = index.variants.findIndex(v => v.hash === hash);
      const variantMeta = {
        hash,
        kind,
        label: label || (kind === 'build' ? `Build ${new Date().toLocaleDateString()}` : 'Custom Preset'),
        capturedAt: new Date().toISOString()
      };

      if (existingIndex >= 0) {
        index.variants[existingIndex] = { ...index.variants[existingIndex], ...variantMeta };
      } else {
        index.variants.push(variantMeta);
      }

      fs.writeFileSync(indexPath, JSON.stringify(index, null, 2), 'utf8');
      return variantMeta;
    } catch {
      return null;
    }
  }

  getVaultVariants(appId) {
    try {
      const indexPath = path.join(this.vaultRootDir, String(appId), 'index.json');
      if (fs.existsSync(indexPath)) {
        const index = JSON.parse(fs.readFileSync(indexPath, 'utf8'));
        return index.variants || [];
      }
    } catch {}
    return [];
  }

  applyVaultVariant(appId, hash) {
    const plugDir = this.getStPlugInDir();
    if (!plugDir) return { success: false, error: 'Steam path not detected' };

    const variantFile = path.join(this.vaultRootDir, String(appId), `${hash}.lua`);
    if (!fs.existsSync(variantFile)) {
      return { success: false, error: 'Stored version file not found' };
    }

    try {
      const destLua = path.join(plugDir, `${appId}.lua`);
      fs.copyFileSync(variantFile, destLua);
      return { success: true, message: `Version ${hash.slice(0, 8)} applied to Steam.` };
    } catch (err) {
      return { success: false, error: err.message };
    }
  }

  getOnlineFix(appId) {
    try {
      const dbPath = path.join(__dirname, 'online-fix-db.json');
      if (fs.existsSync(dbPath)) {
        const db = JSON.parse(fs.readFileSync(dbPath, 'utf8'));
        if (db[String(appId)]) {
          return { success: true, verified: true, fix: db[String(appId)] };
        }
      }
    } catch {}
    return {
      success: false,
      verified: false,
      error: 'Bu oyun için doğrulanmış OnlineFix multiplayer yaması veritabanında bulunmuyor.'
    };
  }

  applyOnlineFix({ appId, installDir }) {
    try {
      if (installDir && fs.existsSync(installDir)) {
        const appIdFile = path.join(installDir, 'steam_appid.txt');
        fs.writeFileSync(appIdFile, String(appId), 'utf8');
        return { success: true, message: `OnlineFix ve steam_appid.txt (${appId}) ${installDir} konumuna kuruldu!` };
      }
      return { success: true, message: `OnlineFix (${appId}) yapısı hazırlandı. Manifest devrede.` };
    } catch (err) {
      return { success: false, error: err.message };
    }
  }

  installOnlineFixArchive({ appId, installDir, archivePath }) {
    try {
      if (!installDir || !fs.existsSync(installDir)) {
        return { success: false, error: 'Geçerli bir oyun klasörü (Install Directory) bulunamadı.' };
      }
      if (!archivePath || !fs.existsSync(archivePath)) {
        return { success: false, error: 'Seçilen yama arşivi/dosyası bulunamadı.' };
      }

      // 1. Backup original steam_api64.dll if present and not backed up
      const originalDll = path.join(installDir, 'steam_api64.dll');
      const backupDll = path.join(installDir, 'steam_api64.dll.bak');
      if (fs.existsSync(originalDll) && !fs.existsSync(backupDll)) {
        try {
          fs.copyFileSync(originalDll, backupDll);
        } catch (e) {}
      }

      const lower = archivePath.toLowerCase();

      // 2. Extract or Copy Archive Contents
      if (lower.endsWith('.zip')) {
        const psCmd = `powershell -NoProfile -ExecutionPolicy Bypass -Command "Expand-Archive -LiteralPath '$archivePath' -DestinationPath '$installDir' -Force"`;
        execSync(psCmd, { stdio: ['ignore', 'ignore', 'ignore'] });
      } else if (lower.endsWith('.rar') || lower.endsWith('.7z')) {
        try {
          execSync(`tar -xf "${archivePath}" -C "${installDir}"`, { stdio: ['ignore', 'ignore', 'ignore'] });
        } catch (e) {
          return { success: false, error: '.rar / .7z arşivlerini doğrudan ayıklamak için lütfen .zip formatı kullanın veya arşiv içeriğini oyun klasörüne sürükleyin.' };
        }
      } else if (fs.statSync(archivePath).isDirectory()) {
        const copyRecursiveSync = (src, dest) => {
          const stats = fs.statSync(src);
          if (stats.isDirectory()) {
            fs.mkdirSync(dest, { recursive: true });
            for (const item of fs.readdirSync(src)) {
              copyRecursiveSync(path.join(src, item), path.join(dest, item));
            }
          } else {
            fs.copyFileSync(src, dest);
          }
        };
        copyRecursiveSync(archivePath, installDir);
      } else {
        const fileName = path.basename(archivePath);
        fs.copyFileSync(archivePath, path.join(installDir, fileName));
      }

      // 3. Write/update steam_appid.txt
      const appIdFile = path.join(installDir, 'steam_appid.txt');
      fs.writeFileSync(appIdFile, String(appId), 'utf8');

      // 4. Ensure OnlineFix.ini has AppIDs
      const iniFile = path.join(installDir, 'OnlineFix.ini');
      let iniContent = '';
      if (fs.existsSync(iniFile)) {
        iniContent = fs.readFileSync(iniFile, 'utf8');
        if (iniContent.includes('RealAppId=')) {
          iniContent = iniContent.replace(/RealAppId=\d+/i, `RealAppId=${appId}`);
        } else {
          iniContent += `\nRealAppId=${appId}\nFakeAppId=480\n`;
        }
      } else {
        iniContent = `[Main]\nRealAppId=${appId}\nFakeAppId=480\nLanguage=english\nListenPort=27015\n`;
      }
      fs.writeFileSync(iniFile, iniContent, 'utf8');

      return {
        success: true,
        message: `OnlineFix yaması (${path.basename(archivePath)}) "${installDir}" konumuna başarıyla kuruldu!`
      };
    } catch (err) {
      return { success: false, error: err.message };
    }
  }

  // ── Hubcap API Integration ──
  async getHubcapStats() {
    const key = this.settings.hubcapApiKey || this.settings.hubcapKey;
    if (!key) return null;

    return new Promise((resolve) => {
      const url = `https://hubcapmanifest.com/api/v1/user/stats?api_key=${encodeURIComponent(key)}`;
      https.get(url, (res) => {
        let body = '';
        res.on('data', chunk => body += chunk);
        res.on('end', () => {
          try {
            resolve(JSON.parse(body));
          } catch {
            resolve(null);
          }
        });
      }).on('error', () => resolve(null));
    });
  }

  removeGame(appId) {
    if (!/^[1-9]\d{0,9}$/.test(String(appId))) return { success: false, error: 'Geçersiz Steam App ID.' };
    const plugDir = this.getStPlugInDir();
    if (!plugDir) return { success: false, error: 'Steam path not found' };

    const luaFile = path.join(plugDir, `${appId}.lua`);
    const disabledFile = path.join(plugDir, `${appId}.lua.disabled`);

    try {
      if (fs.existsSync(luaFile)) {
        fs.unlinkSync(luaFile);
      }
      if (fs.existsSync(disabledFile)) {
        fs.unlinkSync(disabledFile);
      }
      return { success: true, message: `Oyun ${appId} silindi.` };
    } catch (err) {
      return { success: false, error: err.message };
    }
  }

  startHttpServer(port = 6767) {
    if (this._httpServerStarted) return;
    this._httpServerStarted = true;

    const server = http.createServer(async (req, res) => {
      res.setHeader('Content-Type', 'application/json; charset=utf-8');
      const previewPort=Number(process.env.PORT||4173);
      const allowedOrigins=new Set([`http://127.0.0.1:${previewPort}`,`http://localhost:${previewPort}`,`http://127.0.0.1:${port}`,`http://localhost:${port}`]);
      const origin=req.headers.origin;
      if(!/^(?:127\.0\.0\.1|localhost)(?::\d+)?$/i.test(req.headers.host||'')||(origin!==undefined&&!allowedOrigins.has(origin))){
        res.statusCode=403;res.end(JSON.stringify({success:false,error:'Bu kaynaktan Steam işlemi yapılamaz.'}));return;
      }
      if(origin){res.setHeader('Access-Control-Allow-Origin',origin);res.setHeader('Vary','Origin');}
      res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
      res.setHeader('Content-Type', 'application/json; charset=utf-8');

      if (req.method === 'OPTIONS') {
        res.statusCode = 204;
        res.end();
        return;
      }

      const urlPath = req.url.split('?')[0].replace(/\/$/, '');
      const appRoute=/^\/(?:has|add|remove|check-sources)\/(.+)$/.exec(urlPath);
      if(appRoute&&!/^[1-9]\d{0,9}$/.test(appRoute[1])){
        res.statusCode=400;res.end(JSON.stringify({success:false,error:'Geçersiz Steam App ID.'}));return;
      }

      try {
        if (urlPath.startsWith('/has/')) {
          const appId = urlPath.replace('/has/', '');
          const exists = this.hasGame(appId);
          res.statusCode = 200;
          res.end(JSON.stringify({ success: true, exists }));
        } else if (urlPath === '/installed-apps') {
          const appIds = this.getInstalledAppIds();
          res.statusCode = 200;
          res.end(JSON.stringify({ success: true, appIds }));
        } else if (urlPath === '/steam-status') {
          const status = this.getSteamStatus();
          res.statusCode = 200;
          res.end(JSON.stringify({ success: true, status }));
        } else if (urlPath.startsWith('/add/') && req.method === 'POST') {
          const appId = urlPath.replace('/add/', '');
          const result = await this.addGame(appId);
          res.statusCode = 200;
          res.end(JSON.stringify(result));
        } else if (urlPath.startsWith('/check-sources/')) {
          const appId = urlPath.replace('/check-sources/', '');
          const sources = await this.checkSources(appId);
          res.statusCode = 200;
          res.end(JSON.stringify({ success: true, sources }));
        } else if (urlPath.startsWith('/remove/') && req.method === 'POST') {
          const appId = urlPath.replace('/remove/', '');
          const result = this.removeGame(appId);
          res.statusCode = 200;
          res.end(JSON.stringify(result));
        } else if (urlPath === '/restart-steam' && req.method === 'POST') {
          const ok = await this.restartSteam();
          res.statusCode = 200;
          res.end(JSON.stringify({ success: ok }));
        } else {
          res.statusCode = 404;
          res.end(JSON.stringify({ success: false, error: 'Not found' }));
        }
      } catch (err) {
        res.statusCode = 500;
        res.end(JSON.stringify({ success: false, error: err.message }));
      }
    });

    server.on('error', (err) => {
      console.warn(`[SaturnSteamBackend] HTTP server port ${port} unavailable (${err.code || err.message}). Electron IPC channel active.`);
      if (err.code === 'EACCES' || err.code === 'EADDRINUSE') {
        try {
          server.listen(0, '127.0.0.1');
        } catch (e) {}
      }
    });

    try {
      server.listen(port, '127.0.0.1', () => {
        console.log(`[SaturnSteamBackend] HTTP Bridge running on http://127.0.0.1:${port}`);
      });
    } catch (err) {
      console.warn(`[SaturnSteamBackend] HTTP Server listen skipped: ${err.message}`);
    }
  }
}

module.exports = SteamAddBackend;
