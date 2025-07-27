// 禁用IMK输入法相关警告
process.env.ELECTRON_DISABLE_IMK_WARNING = '1'

const { app, BrowserWindow, Menu } = require('electron')
const path = require('path')

let mainWindow

function createWindow() {
  // 创建浏览器窗口
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      webSecurity: true,
      allowRunningInsecureContent: false
    }
  })

  // 尝试使用URL方式加载
  const indexPath = path.join(__dirname, 'index.html')
  console.log('尝试加载:', indexPath)
  mainWindow.loadURL(`file://${indexPath}`)
    .then(() => console.log('页面加载成功'))
    .catch(err => console.error('页面加载失败:', err))

  // 开发工具
  mainWindow.webContents.openDevTools()

  // 监听页面加载事件
  mainWindow.webContents.on('did-finish-load', () => {
    console.log('页面加载完成')
  })
  mainWindow.webContents.on('did-fail-load', (event, errorCode, errorDesc) => {
    console.error('页面加载失败:', errorCode, errorDesc)
  })

  // 自定义菜单
  const template = [
    {
      label: '文件',
      submenu: [
        { role: 'quit' }
      ]
    },
    {
      label: '客户管理',
      click: () => mainWindow.webContents.send('navigate', 'customer')
    },
    {
      label: '开票',
      click: () => mainWindow.webContents.send('navigate', 'invoice')
    }
  ]
  
  const menu = Menu.buildFromTemplate(template)
  Menu.setApplicationMenu(menu)

  mainWindow.on('closed', () => {
    mainWindow = null
  })
}

app.whenReady().then(createWindow)

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('activate', () => {
  if (mainWindow === null) {
    createWindow()
  }
})
