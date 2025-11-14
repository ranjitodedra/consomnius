import { occupiedDirs } from '@shared/config/constant'
import { app } from 'electron'
import fs from 'fs'
import path from 'path'
import { config } from 'dotenv'

import { initAppDataDir } from './utils/init'
import { loggerService } from './services/LoggerService'

const logger = loggerService.withContext('Bootstrap')

app.isPackaged && initAppDataDir()

// Load .env file at runtime (for packaged app)
if (app.isPackaged) {
  // Try multiple locations where .env might be
  const possiblePaths: string[] = []
  
  // On macOS, extraFiles with to: ../.env places the file at the same level as the app bundle
  // App bundle structure: app.app/Contents/MacOS/executable
  if (process.platform === 'darwin') {
    const appBundlePath = path.dirname(path.dirname(path.dirname(app.getPath('exe'))))
    possiblePaths.push(path.join(path.dirname(appBundlePath), '.env')) // Parent of app bundle
  }
  
  // For all platforms, check these locations
  possiblePaths.push(
    path.join(process.resourcesPath, '.env'), // Resources directory (outside asar)
    path.join(app.getAppPath(), '.env'), // App directory
    path.join(path.dirname(app.getPath('exe')), '.env') // Executable directory
  )
  
  // On Windows/Linux, also check the parent of the executable directory
  if (process.platform !== 'darwin') {
    possiblePaths.push(path.join(path.dirname(path.dirname(app.getPath('exe'))), '.env'))
  }

  let envLoaded = false
  for (const envPath of possiblePaths) {
    if (fs.existsSync(envPath)) {
      try {
        config({ path: envPath })
        logger.info(`Loaded .env file from: ${envPath}`)
        // Debug: log if MongoDB connection string is present
        if (process.env.MARKETPLACE_MONGODB_URI || process.env.MONGODB_URI) {
          logger.info('MongoDB connection string found in .env')
        } else {
          logger.warn('MongoDB connection string NOT found in .env file')
        }
        envLoaded = true
        break
      } catch (error) {
        logger.warn(`Failed to load .env from ${envPath}:`, error)
      }
    }
  }

  if (!envLoaded) {
    logger.warn('No .env file found in packaged app. Environment variables may not be available.')
  } else {
    // Log all env vars that start with MARKETPLACE or MONGODB for debugging
    const relevantEnvVars = Object.keys(process.env)
      .filter(key => key.includes('MARKETPLACE') || key.includes('MONGODB'))
      .reduce((obj, key) => {
        obj[key] = process.env[key] ? '***SET***' : 'NOT SET'
        return obj
      }, {} as Record<string, string>)
    if (Object.keys(relevantEnvVars).length > 0) {
      logger.info('Relevant environment variables:', relevantEnvVars as object)
    }
  }
}

// 在主进程中复制 appData 中某些一直被占用的文件
// 在renderer进程还没有启动时，主进程可以复制这些文件到新的appData中
function copyOccupiedDirsInMainProcess() {
  const newAppDataPath = process.argv
    .slice(1)
    .find((arg) => arg.startsWith('--new-data-path='))
    ?.split('--new-data-path=')[1]
  if (!newAppDataPath) {
    return
  }

  if (process.platform === 'win32') {
    const appDataPath = app.getPath('userData')
    occupiedDirs.forEach((dir) => {
      const dirPath = path.join(appDataPath, dir)
      const newDirPath = path.join(newAppDataPath, dir)
      if (fs.existsSync(dirPath)) {
        fs.cpSync(dirPath, newDirPath, { recursive: true })
      }
    })
  }
}

copyOccupiedDirsInMainProcess()
