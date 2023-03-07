const { app, BrowserWindow, Menu, ipcMain, shell } = require("electron");
const path = require("path");
const os = require("os");
const fs = require("fs");
const resizeImg = require("resize-img");

process.env.NODE_ENV = "production";
const isDev = process.env.NODE_ENV !== "production";
let mainWindow;

// Handle creating/removing shortcuts on Windows when installing/uninstalling
if (require("electron-squirrel-startup")) {
  app.quit();
}

const createWindow = () => {
  // Create the browser window
  mainWindow = new BrowserWindow({
    title: "Image Resizer",
    width: isDev ? 1000 : 500,
    height: 600,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: true,
      preload: path.join(__dirname, "preload.js"),
    },
  });

  // Load the index.html of the app
  mainWindow.loadFile(path.join(__dirname, "index.html"));

  // Open the DevTools
  if (isDev) {
    mainWindow.webContents.openDevTools();
  }
};

const createAboutWindow = () => {
  // Create the browser window
  const aboutWindow = new BrowserWindow({
    title: "About Image Resizer",
    width: 300,
    height: 300,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
    },
  });

  // Load the about.html of the app
  aboutWindow.loadFile(path.join(__dirname, "about.html"));
};

// This method will be called when Electron has finished
app.on("ready", () => {
  createWindow();
  // Implement menu
  const mainMenu = Menu.buildFromTemplate(menu);
  Menu.setApplicationMenu(mainMenu);

  // Remove mainWindow from the memory on close
  mainWindow.on("closed", () => (mainWindow = null));
});

// Menu template
const menu = [
  ...(process.platform !== "darwin"
    ? [
        {
          label: app.name,
          submenu: [
            {
              label: "About",
              click: createAboutWindow,
            },
          ],
        },
      ]
    : []),
  {
    role: "filemenu",
  },
  ...(!process.platform !== "darwin"
    ? [
        {
          label: "Help",
          submenu: [
            {
              label: "About",
              click: createAboutWindow,
            },
          ],
        },
      ]
    : []),
];

// Respond to ipcRenderer resize
ipcMain.on("image:resize", (e, options) => {
  options.dest = path.join(os.homedir(), "imageresizer");
  resizeImage(options);
});

// Resize the image
const resizeImage = async ({ imgPath, width, height, dest }) => {
  try {
    const newPath = await resizeImg(fs.readFileSync(imgPath), {
      width: +width,
      height: +height,
    });
    // Create file name
    const filename = path.basename(imgPath);

    // Create destination folder if it doesn't exist
    if (!fs.existsSync(dest)) {
      fs.mkdirSync(dest);
    }
    // Write file to destination
    fs.writeFileSync(path.join(dest, filename), newPath);
    // Send success to the renderer
    mainWindow.webContents.send("image:done");
    // Open destination folder
    shell.openPath(dest);
  } catch (error) {
    console.log(error);
  }
};

// Quit when all windows are closed, except on macOS
app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});

app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});
