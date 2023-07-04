/*
 * @Author: xiangfu.wu
 * @Date: 2022-08-18 15:30:35
 * @Description: 🚀
 * @FilePath: /vite-plugin-zip-file/src/utils/vite-plugin-zip-flie.ts
 */
import path from 'path';
import fs from 'fs';
import { createRequire } from 'node:module'
const requireds = createRequire(import.meta.url);
const pathSep = path.sep;
const { cwd } = process;
interface PluginConfig {
  enabled: boolean,
  folderPath: string,
  outPath: string,
  zipName: string
}

const defaultConfig: PluginConfig = {
  enabled: true,
  folderPath: path.join(cwd(), '/dist'),
  outPath: path.resolve(cwd()),
  zipName: ''
}



export const viteZip = (customConfig: PluginConfig) => {
  let config: PluginConfig = {
    ...defaultConfig,
    ...customConfig
  }
  let { enabled, folderPath, outPath, zipName }: PluginConfig = config;
  enabled = Boolean(enabled);
  if (!folderPath || !outPath) {
    throw new Error('config.folderPath and config.outPath is required.');
  }
  folderPath = path.resolve(folderPath);
  outPath = path.resolve(outPath);
  zipName = zipName? zipName: folderPath.split(pathSep).pop() + '.zip';
  const makeZip = () => {
    const JSZip = requireds('jszip');
    const zip = new JSZip();
    

    const readDir = function (zip, dirPath, fileDir = '') {
      // 读取组件下的根文件目录
      const files = fs.readdirSync(dirPath);
      fileDir += dirPath.split(pathSep).pop() + pathSep;
      files.forEach(fileName => {
        const fillPath = path.join(dirPath, pathSep, fileName)
        const file = fs.statSync(fillPath);
        // 如果是文件夹的话需要递归遍历下面的子文件
        if (file.isDirectory()) {
          // const dirZip = zip.folder(fileName);
          readDir(zip, fillPath, fileDir);
        } else {
          // 读取每个文件为buffer存到zip中，带上文件夹，保证压缩后文件目录不变
          zip.file(fileDir + fileName, fs.readFileSync(fillPath))
        }
      });
    }
    
    const removeZip = (name = zipName) => {
      const dest = path.join(outPath, pathSep + name)
      if (fs.existsSync(dest)) {
        fs.unlinkSync(dest)
      }
    }

    const doZip = function () {

      readDir(zip, folderPath);
      zip.generateAsync({
        type: "nodebuffer", // 压缩类型
        compression: "DEFLATE", // 压缩算法
        compressionOptions: { // 压缩级别
          level: 9
        }
      }).then(content => {
        removeZip(zipName)
        fs.writeFileSync(path.join(outPath,pathSep ,zipName), content);
      });
    }

    removeZip(zipName)
    doZip()
  };
  return {
    name: 'vite-plugin-zip-file',
    apply: 'build',
    closeBundle() {
      if(!enabled) {
        return;
      }
      makeZip();
    }
  }
}
