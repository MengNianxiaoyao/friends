import { readFile, writeFile } from 'node:fs/promises'
import process from 'node:process'
import axios from 'axios'
import { consola } from 'consola'
import yaml from 'js-yaml'
import config from './config'

interface FriendLink {
  blog: string
  name: string
  url: string
  avatar: string
  desc: string
  color: string
}

interface GithubIssue {
  body: string
  state: string
  labels: Array<{name: string}>
}

// 读取 YAML 文件
async function readYamlFile(filePath: string) {
  try {
    const data = yaml.load(await readFile(filePath, 'utf8'))
    return Array.isArray(data) ? data : []
  }
  catch (error) {
    consola.error(`Error reading ${filePath}: ${(error as Error).message}`)
    return []
  }
}

// 写入 YAML 文件
async function writeYamlFile(filePath: string, data: any) {
  try {
    await writeFile(filePath, yaml.dump(data), 'utf8')
    consola.success(`Data saved to ${filePath}`)
  }
  catch (error) {
    consola.error(`Error writing to ${filePath}: ${(error as Error).message}`)
  }
}

// 并发控制器
class ConcurrencyController {
  private queue: (() => Promise<void>)[] = []
  private running = 0

  constructor(private maxConcurrency: number) {}

  async add(task: () => Promise<void>) {
    if (this.running >= this.maxConcurrency) {
      await new Promise<void>((resolve) => {
        this.queue.push(async () => {
          await task()
          resolve()
        })
      })
    }
    else {
      this.running++
      try {
        await task()
      }
      finally {
        this.running--
        if (this.queue.length > 0) {
          const nextTask = this.queue.shift()!
          this.add(nextTask)
        }
      }
    }
  }
}

// 验证并解析友链数据
function parseFriendLink(content: string): FriendLink[] {
  try {
    const match = content.match(/```yaml\n([\s\S]*?)```/)
    if (!match)
      return []

    const data = yaml.load(match[1])
    const links = Array.isArray(data) ? data : [data]

    return links.filter(link => (
      link
      && typeof link === 'object'
      && Object.keys(link).every(key =>
        ['blog', 'name', 'url', 'avatar', 'desc', 'color'].includes(key)
        && typeof link[key] === 'string',
      )
    ))
  }
  catch {
    return []
  }
}

// 处理单个 Issue
async function processIssue(issue: GithubIssue, links: FriendLink[]) {
  if (issue.state !== 'open') return
  
  // 检查 issue 是否有 active 标签
  const isActive = issue.labels.some(label => label.name === 'active')
  
  // 只处理有 active 标签的 issue
  if (!isActive) {
    consola.info(`跳过非 active 标签的 Issue`)
    return
  }
  
  const parsedLinks = parseFriendLink(issue.body)
  if (parsedLinks.length > 0) {
    // 移除 errormsg 字段
    parsedLinks.forEach(link => {
      delete (link as any).errormsg
    })
    links.push(...parsedLinks)
  }
}

async function fetchIssues(): Promise<void> {
  const linksPath = config.dataFile.links
  const awayPath = config.dataFile.away

  try {
    consola.start('获取并处理 GitHub Issues...')
    
    // 获取数据
    const { data: issues } = await axios.get('https://api.github.com/repos/MengNianxiaoyao/friends/issues')
    
    // 收集友链
    const newLinks: FriendLink[] = []
    
    // 使用并发控制器处理 issues
    const controller = new ConcurrencyController(10) // 限制最大并发数为10
    await Promise.all(
      issues.map((issue: GithubIssue) => 
        controller.add(async () => {
          await processIssue(issue, newLinks)
        })
      )
    )

    // 读取现有友链和失效友链
    const [existingLinks, awayLinks] = await Promise.all([
      readYamlFile(linksPath),
      readYamlFile(awayPath),
    ])

    // 获取新增链接的URL集合
    const activeUrls = new Set(newLinks.map(link => link.url))
    
    // 从away.yml中找到要恢复的链接
    const recoveredLinks = awayLinks.filter(link => activeUrls.has(link.url))
    
    // 从away.yml中移除恢复的链接
    const remainingAwayLinks = awayLinks.filter(link => !activeUrls.has(link.url))

    // 合并所有活跃链接
    const finalLinks = Array.from(
      new Map([...existingLinks, ...newLinks, ...recoveredLinks].map(link => [link.url, link])).values()
    )

    // 写入文件
    await Promise.all([
      writeYamlFile(linksPath, finalLinks),
      writeYamlFile(awayPath, remainingAwayLinks),
    ])
    
    consola.success(`友链数据已更新，共 ${finalLinks.length} 条`)
    if (recoveredLinks.length > 0)
      consola.success(`从失效链接中恢复了 ${recoveredLinks.length} 条链接`)
  }
  catch (error) {
    consola.error(`更新友链失败: ${error instanceof Error ? error.message : String(error)}`)
    process.exit(1)
  }
}

fetchIssues()
