import fs from 'node:fs'
import yaml from 'js-yaml'
import consola from 'consola'
import config from './config'

const distFolder = config.outPath

/**
 * 友链
 */
export interface Friend {
  /**
   * 博客
   */
  blog: string
  /**
   * 称呼
   */
  name: string
  /**
   * 链接
   */
  url: string
  /**
   * 头像
   */
  avatar: string
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
  color?: string
  /**
   * 错误信息
   */
  errormsg?: string
}

/**
 *
 * @description 生成 links.json
 *
 */
function generateLinksJson() {
  const links = yaml.load(fs.readFileSync(config.dataFile.links, 'utf8')) as Friend[]

  links.forEach((link) => {
    // hide email
    delete link.email
  })

  if (!fs.existsSync(distFolder))
    fs.mkdirSync(distFolder, { recursive: true })

  fs.writeFileSync(`${config.outFile.links}`, JSON.stringify(links, null, 2))
  consola.success('Generated links.json successfully!')
}

/**
 *
 * @description 生成 sites.json
 *
 */
function generateSitesJson() {
  const sites = yaml.load(fs.readFileSync(config.dataFile.sites, 'utf8')) as Friend[]

  sites.forEach((sites) => {
    // hide email
    delete sites.email
  })

  if (!fs.existsSync(distFolder))
    fs.mkdirSync(distFolder, { recursive: true })

  fs.writeFileSync(`${config.outFile.sites}`, JSON.stringify(sites, null, 2))
  consola.success('Generated sites.json successfully!')
}

/**
 *
 * @description 生成 away.json
 *
 */
function generateAwayJson() {
  const away = yaml.load(fs.readFileSync(config.dataFile.away, 'utf8')) as Friend[]

  away.forEach((away) => {
    // hide email
    delete away.email
  })

  if (!fs.existsSync(distFolder))
    fs.mkdirSync(distFolder, { recursive: true })

  fs.writeFileSync(`${config.outFile.away}`, JSON.stringify(away, null, 2))
  consola.success('Generated away.json successfully!')
}

try {
  generateLinksJson()
  generateSitesJson()
  generateAwayJson()
}
catch (e) {
  consola.error(e)
}
