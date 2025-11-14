const fs = require('fs')
const path = require('path')

exports.default = async function (context) {
  const platform = context.packager.platform.name
  if (platform === 'windows') {
    fs.rmSync(path.join(context.appOutDir, 'LICENSE.electron.txt'), { force: true })
    fs.rmSync(path.join(context.appOutDir, 'LICENSES.chromium.html'), { force: true })
  }
  
  // On macOS, move .env file outside the app bundle to avoid code signing issues
  if (platform === 'mac') {
    const appName = context.packager.appInfo.productFilename
    const appPath = path.join(context.appOutDir, `${appName}.app`)
    const resourcesPath = path.join(appPath, 'Contents', 'Resources')
    const envPath = path.join(resourcesPath, '.env')
    const envOutsidePath = path.join(context.appOutDir, '.env')
    
    // Move .env from Resources to outside the bundle
    if (fs.existsSync(envPath)) {
      fs.renameSync(envPath, envOutsidePath)
    }
  }
}
