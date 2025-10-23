# 从零到打包：Win11 下 UniApp + Electron 桌面应用发布实战指南

> 适用对象：第一次在 **Windows 11** 上用 **UniApp（HBuilderX）+ Electron** 做桌面应用，并成功产出 **绿色版** 和 **安装包**。
>  目标产物：
>
> - 绿色版：`release/win-unpacked/UniAppDemo.exe`（免安装）
> - 安装包：`release/UniAppDemo Setup 1.0.0.exe`

------

## 目录

1. [准备环境](https://chatgpt.com/c/68f5f0d4-fa7c-832d-9011-97c952107eb0#准备环境)
2. [创建与编译 UniApp（H5）](https://chatgpt.com/c/68f5f0d4-fa7c-832d-9011-97c952107eb0#创建与编译-uniapph5)
3. [创建 Electron 工程](https://chatgpt.com/c/68f5f0d4-fa7c-832d-9011-97c952107eb0#创建-electron-工程)
4. [核心代码与配置](https://chatgpt.com/c/68f5f0d4-fa7c-832d-9011-97c952107eb0#核心代码与配置)
5. [开发调试与打包](https://chatgpt.com/c/68f5f0d4-fa7c-832d-9011-97c952107eb0#开发调试与打包)
6. [常见问题与解决方案](https://chatgpt.com/c/68f5f0d4-fa7c-832d-9011-97c952107eb0#常见问题与解决方案)
7. [日常维护与升级](https://chatgpt.com/c/68f5f0d4-fa7c-832d-9011-97c952107eb0#日常维护与升级)
8. [快速自检清单](https://chatgpt.com/c/68f5f0d4-fa7c-832d-9011-97c952107eb0#快速自检清单)

------

## 准备环境

### 1）安装 Node.js（LTS）

- 官网下载并安装：https://nodejs.org/（选择 **LTS** 版本）
- 勾选 “Add to PATH”
- 验证：

```powershell
node -v
npm -v
```

> 安装过程可能弹出命令窗口安装 Chocolatey，这是附加工具脚本，**无须担心**。

### 2）安装 HBuilderX（带 uni-app 插件）

- 下载：https://www.dcloud.io/hbuilderx.html
- 推荐 ZIP 绿色版，解压后运行 `HBuilderX.exe`
- 验证：能创建 uni-app 项目即可

### 3）全局（可选）或本地安装 Electron 工具

> 建议**本地安装到项目**，保证 electron-builder 能识别版本。

```powershell
# 在 Electron 工程目录里执行（后面会创建这个目录）
npm i -D electron@38.3.0 electron-builder@26.0.12
```

------

## 创建与编译 UniApp（H5）

### 1）用 HBuilderX 创建 uni-app

假设根目录结构如下：

```
D:\dev\uniapp\
├─ hello\HelloWorld\           # HBuilderX 生成的 uni-app 项目
└─ my_electron\                # 稍后创建的 Electron 工程
```

### 2）编译为 H5 静态资源

- HBuilderX 菜单：**发行 → 网站-H5**
- 产物目录（Vite 新版）：
   `D:\dev\uniapp\hello\HelloWorld\unpackage\dist\build\web\`

> **注意**：不要用浏览器双击 `index.html` 直接打开（`file://` 协议下常见空白/报 CORS）
>  如需预览：
>
> ```powershell
> npm i -g http-server
> http-server "D:\dev\uniapp\hello\HelloWorld\unpackage\dist\build\web" -p 8080
> # 访问 http://localhost:8080
> ```

**H5 构建关键参数（避免白屏）：**

- `manifest.json → H5`
  - 路由模式：`hash`
  - 资源基础路径（publicPath）：`./`

------

## 创建 Electron 工程

### 1）初始化目录

```
D:\dev\uniapp\my_electron\
cd D:\dev\uniapp\my_electron
npm init -y
npm i -D electron@38.3.0 electron-builder@26.0.12
```

### 2）基础结构建议

```
my_electron/
├─ assets/              # 放 icon.ico
├─ main.js              # 主进程
├─ preload.js           # 预加载桥（安全暴露 API）
├─ package.json
└─ release/             # 打包输出
```

------

## 核心代码与配置

### 1）`package.json`（关键是 build.files.from 指向 web 产物）

```json
{
  "name": "uniapp-electron-demo",
  "version": "1.0.0",
  "main": "main.js",
  "author": "wang",
  "scripts": {
    "dev": "electron .",
    "pack": "electron-builder --dir",
    "dist": "electron-builder"
  },
  "devDependencies": {
    "electron": "38.3.0",
    "electron-builder": "26.0.12"
  },
  "build": {
    "appId": "com.example.uniapp.desktop",
    "productName": "UniAppDemo",
    "directories": { "output": "release" },
    "files": [
      "main.js",
      "preload.js",
      {
        "from": "../hello/HelloWorld/unpackage/dist/build/web",
        "to": "app",
        "filter": ["**/*"]
      },
      "assets/**/*"
    ],
    "win": {
      "target": ["nsis"],
      "icon": "assets/icon.ico"
    },
    "nsis": {
      "oneClick": false,
      "perMachine": false,
      "allowToChangeInstallationDirectory": true,
      "shortcutName": "UniAppDemo",
      "createDesktopShortcut": true
    },
    "asar": true
  }
}
```

### 2）`main.js`（开发加载 web 目录，打包加载 app/index.html）

```js
const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');

function createWin() {
  const win = new BrowserWindow({
    width: 1280,
    height: 800,
    show: false,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js')
    }
  });

  // 开发时直接加载 HBuilderX 输出；打包后加载 app/index.html
  const devIndex = path.join(__dirname, '..', 'hello', 'HelloWorld', 'unpackage', 'dist', 'build', 'web', 'index.html');
  if (fs.existsSync(devIndex)) {
    win.loadFile(devIndex);
    // win.webContents.openDevTools();
  } else {
    win.loadFile(path.join(__dirname, 'app', 'index.html'));
  }

  win.once('ready-to-show', () => win.show());
}

app.whenReady().then(createWin);
app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });
app.on('activate', () => { if (BrowserWindow.getAllWindows().length === 0) createWin(); });

// 示例：原生桥功能
ipcMain.handle('ping', () => 'pong');
```

### 3）`preload.js`（最小安全桥）

```js
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('nativeAPI', {
  ping: () => ipcRenderer.invoke('ping')
});
```

### 4）图标

- 放置：`assets/icon.ico`
- 未提供时会使用 Electron 默认图标（可忽略）

------

## 开发调试与打包

### 1）本地运行（Electron 开发模式）

```powershell
npm run dev
```

弹窗正常显示你编译的 UniApp 页面即成功。

### 2）产出绿色版 + 安装包

```powershell
# 如遇签名工具下载导致的符号链接权限问题，可先关闭自动发现签名（见下文常见问题）
npm run dist
```

**输出位置：**

- 绿色版（免安装）：`release/win-unpacked/UniAppDemo.exe`
- 安装包（NSIS 安装器）：`release/UniAppDemo Setup 1.0.0.exe`

------

## 常见问题与解决方案

### ❌ 1）`ERR_FILE_NOT_FOUND`（开发时）

**现象：** `electron .` 找不到 `app/index.html`
 **原因：** 开发模式下还没把 H5 拷到 `app/`
 **解法：** 像上面 `main.js` 那样，**开发时**直接加载 HBuilderX 输出的 `web/index.html`；**打包后**再加载 `app/index.html`。

------

### ❌ 2）`electron-builder` 报 “Cannot compute electron version…”

**原因：** electron 只全局装了，**项目本地**没有安装 / 版本未固定
 **解法：**

```powershell
npm i -D electron@38.3.0 electron-builder@26.0.12
# 确保 package.json 里版本是固定数字，不要带 ^
```

------

### ❌ 3）打安装包时下载 `winCodeSign` 7z 解压报“Cannot create symbolic link / 权限不足”

**现象日志：**
 `ERROR: Cannot create symbolic link ... winCodeSign\...\libcrypto.dylib`
 **解法（任选其一）：**

- **A. 跳过自动签名发现（推荐、最快）**

  ```powershell
  Remove-Item Env:WIN_CSC_LINK -ErrorAction SilentlyContinue
  Remove-Item "$env:LOCALAPPDATA\electron-builder\Cache\winCodeSign" -Recurse -Force -ErrorAction SilentlyContinue
  $env:CSC_IDENTITY_AUTO_DISCOVERY="false"
  npm run dist
  ```

  （或在 `scripts.dist` 写：`set CSC_IDENTITY_AUTO_DISCOVERY=false&& electron-builder`）

- **B. 启用 Windows “开发者模式”**（允许创建符号链接）

  - 设置 → 隐私和安全性 → 开发人员选项 → 开启“开发人员模式”
  - 重新开管理员 PowerShell，清缓存后再打包

- **C. 直接用绿色版**（`win-unpacked` 目录打包 zip 分发）

------

### ❌ 4）双击 `web/index.html` 在浏览器里空白

**原因：** `file://` 方案加载 ESM 受安全限制/CORS
 **解法：** 用本地静态服务器打开（`http-server` / Python `http.server`），或在 Electron 里加载。

------

### ❌ 5）更换图标后仍显示旧图标

**原因：** 图标缓存
 **解法：**

```powershell
ie4uinit.exe -ClearIconCache
taskkill /f /im explorer.exe
start explorer.exe
```

或改文件名再看；绿色版可用 `rcedit` 直接写 exe 图标：

```powershell
npm i -D rcedit
.\node_modules\.bin\rcedit.exe .\release\win-unpacked\UniAppDemo.exe --set-icon .\assets\icon.ico
```

------

## 日常维护与升级

### 1）改页面/样式/图片

- 在 UniApp 中修改，**重新发行 H5**（覆盖 `unpackage/dist/build/web`）
- 回到 Electron 项目执行：

```powershell
npm run dist
```

### 2）仅发绿色版

- 压缩 `release/win-unpacked/` 整个目录分发即可

### 3）版本号 / 名称 / 图标

- `package.json → version/productName/build.win.icon`
- 修改后重新打包即可

> 进阶（可选）：外置 `content/` 目录 + `extraResources`，无需重装即可替换文案/图。此处略。

------

## 快速自检清单

-  Node.js（LTS）已安装：`node -v` / `npm -v`
-  HBuilderX 能创建并发行 H5：输出到 `.../unpackage/dist/build/web`
-  Electron/Electron-Builder **本地依赖**已安装且版本固定（无 `^`）
-  `package.json → build.files.from` 指向 **web 输出目录**
-  `main.js`：开发期加载 web/index.html；打包加载 app/index.html
-  图标文件 `assets/icon.ico` 存在（可选）
-  `npm run dev` 能弹窗显示页面
-  `npm run dist` 输出：
  - 绿色版：`release/win-unpacked/UniAppDemo.exe`
  - 安装包：`release/UniAppDemo Setup 1.0.0.exe`
-  （若遇签名工具下载报错）已设置
   `CSC_IDENTITY_AUTO_DISCOVERY=false` 或启用开发者模式

------

**恭喜！** 按这份步骤从一台干净的 Win11 环境即可完成 UniApp + Electron 的打包与发布。需要我把本指南同步生成到你项目里（`README.md`）的内容模版吗？