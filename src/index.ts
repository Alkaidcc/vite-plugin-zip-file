import path from 'node:path'
import fs from 'node:fs'
import JSZip from 'jszip'

const pathSep = path.sep
const { cwd } = process
interface PluginConfig {
  enabled?: boolean
  folderPath?: string
  outPath?: string
  zipName?: string
  deleteFolder?: boolean
}

const defaultConfig: PluginConfig = {
  enabled: true,
  folderPath: path.join(cwd(), '/dist'),
  outPath: path.resolve(cwd()),
  zipName: '',
  deleteFolder: false,
}

export const viteZip = (customConfig: PluginConfig) => {
  const config: PluginConfig = {
    ...defaultConfig,
    ...customConfig,
  }
  let { enabled, folderPath, outPath, zipName, deleteFolder }: PluginConfig =
    config
  enabled = Boolean(enabled)
  if (!folderPath || !outPath) {
    throw new Error('config.folderPath and config.outPath is required.')
  }
  folderPath = path.resolve(folderPath)
  outPath = path.resolve(outPath)
  zipName = zipName ? zipName : `${folderPath.split(pathSep).pop()}.zip`
  const makeZip = () => {
    const zip = new JSZip()

    const readDir = function (zip: any, dirPath: string, fileDir = '') {
      // 读取组件下的根文件目录
      const files = fs.readdirSync(dirPath)
      fileDir += dirPath.split(pathSep).pop() + pathSep
      files.forEach((fileName) => {
        const fillPath = path.join(dirPath, pathSep, fileName)
        const file = fs.statSync(fillPath)
        // 如果是文件夹的话需要递归遍历下面的子文件
        if (file.isDirectory()) {
          // const dirZip = zip.folder(fileName);
          readDir(zip, fillPath, fileDir)
        } else {
          // 读取每个文件为buffer存到zip中，带上文件夹，保证压缩后文件目录不变
          zip.file(fileDir + fileName, fs.readFileSync(fillPath))
        }
      })
    }

    const removeZip = (name = zipName) => {
      const dest = path.join(outPath, pathSep + name)
      if (fs.existsSync(dest)) {
        fs.unlinkSync(dest)
      }
    }

    const removeFolder = (path: string) => {
      const files = fs.readdirSync(path)
      files.forEach((file) => {
        const curPath = path + pathSep + file
        if (fs.statSync(curPath).isDirectory()) {
          // recurse
          removeFolder(curPath)
        } else {
          // delete file
          fs.unlinkSync(curPath)
        }
      })
      fs.rmdirSync(path)
    }

    const doZip = function () {
      readDir(zip, folderPath)
      zip
        .generateAsync({
          type: 'nodebuffer', // 压缩类型
          compression: 'DEFLATE', // 压缩算法
          compressionOptions: {
            // 压缩级别
            level: 9,
          },
        })
        .then((content) => {
          removeZip(zipName)
          fs.writeFileSync(path.join(outPath, pathSep, zipName), content)
          // 删除文件夹
          if (deleteFolder) {
            removeFolder(folderPath)
          }
        })
    }

    removeZip(zipName)
    doZip()
  }
  return {
    name: 'vite-plugin-zip-file',
    apply: 'build',
    closeBundle() {
      if (!enabled) {
        return
      }
      makeZip()
    },
  }
}
