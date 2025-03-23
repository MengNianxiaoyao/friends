import path from 'node:path'
import process from 'node:process'

// 定义配置类型
interface Config {
  dataFile: {
    links: string
    sites: string
    away: string
  }
  outPath: string
  outFile: {
    links: string
    sites: string
    away: string
  }
}

// 基础路径常量
const LINKS_DIR = path.join(process.cwd(), 'links')
const DIST_DIR = path.join(process.cwd(), 'dist')

const config: Config = {
  dataFile: {
    links: path.join(LINKS_DIR, 'links.yml'),
    sites: path.join(LINKS_DIR, 'sites.yml'),
    away: path.join(LINKS_DIR, 'away.yml'),
  },
  outPath: DIST_DIR,
  outFile: {
    links: path.join(DIST_DIR, 'links.json'),
    sites: path.join(DIST_DIR, 'sites.json'),
    away: path.join(DIST_DIR, 'away.json'),
  },
}

// 验证配置
Object.values(config.dataFile).forEach((file) => {
  if (!file.endsWith('.yml'))
    throw new Error(`Invalid data file format: ${file}`)
})

Object.values(config.outFile).forEach((file) => {
  if (!file.endsWith('.json'))
    throw new Error(`Invalid output file format: ${file}`)
})

export default config
