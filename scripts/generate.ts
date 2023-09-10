import fs from 'node:fs'
import yaml from 'js-yaml'
import consola from 'consola'
import config from './config'

/**
 * 友链
 */
export interface Friend {
  /**
   * 链接
   */
  url: string
  /**
   * 头像
   */
  avatar: string
  /**
   * 种类
   */
  category?: string
  /**
   * 称呼
   */
  name: string
  /**
   * 博客
   */
  blog: string
  /**
   * 描述
   */
  desc: string
  /**
   * 邮件
   */
  email?: string
  /**
   * 代表色
   */
  color: string
}

/**
 * 生成 links.json
 * @returns
 */
function generateLinksJson() {
  const distFolder = 'dist'

  const links = yaml.load(fs.readFileSync(config.dataFile[0], 'utf8')) as Friend[]

  links.forEach((link) => {
    // hide email
    delete link.email
  })

  if (!fs.existsSync(distFolder))
    fs.mkdirSync(distFolder, { recursive: true })

  fs.writeFileSync(`${distFolder}/links.json`, JSON.stringify(links))
  consola.success('Generated links.json successfully!')
}

/**
 * 生成 sites.json
 * @returns
 */
function generateSitesJson() {
  const distFolder = 'dist'

  const sites = yaml.load(fs.readFileSync(config.dataFile[1], 'utf8')) as Friend[]

  sites.forEach((link) => {
    // hide email
    delete link.email
  })

  if (!fs.existsSync(distFolder))
    fs.mkdirSync(distFolder, { recursive: true })

  fs.writeFileSync(`${distFolder}/sites.json`, JSON.stringify(sites))
  consola.success('Generated sites.json successfully!')
}

/**
 * 生成 away.json
 * @returns
 */
function generateAwayJson() {
  const distFolder = 'dist'

  const away = yaml.load(fs.readFileSync(config.dataFile[2], 'utf8')) as Friend[]

  away.forEach((link) => {
    // hide email
    delete link.email
  })

  if (!fs.existsSync(distFolder))
    fs.mkdirSync(distFolder, { recursive: true })

  fs.writeFileSync(`${distFolder}/away.json`, JSON.stringify(away))
  consola.success('Generated away.json successfully!')
}

try {
  generateLinksJson()
  generateSitesJson()
  generateAwayJson()
}
catch (e) {
  console.error(e)
}
