import { existsSync, readFileSync, writeFileSync } from 'node:fs'
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
  errormsg?: string
}

interface GithubIssue {
  body: string
  state: string
  labels: Array<{name: string}>
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
async function processIssue(issue: GithubIssue, deadLinks: FriendLink[]) {
  if (issue.state !== 'open') return
  
  // 检查issue是否有404标签
  const is404 = issue.labels.some(label => label.name === '404')
  
  if (is404) {
    const links = parseFriendLink(issue.body)
    if (links.length === 0) return
    
    // 添加错误信息并放入away链接
    links.forEach(link => {
      link.errormsg = 'Marked as 404 by issue label'
      deadLinks.push(link)
    })
  }
}

async function process404Issues(): Promise<void> {
  const linksPath = config.dataFile.links
  const awayPath = config.dataFile.away

  try {
    consola.start('处理404标签的Issues...')
    
    // 获取并处理数据
    const { data: issues } = await axios.get('https://api.github.com/repos/MengNianxiaoyao/friends/issues')
    
    // 收集404标记的链接
    const deadLinks: FriendLink[] = []
    
    // 使用并发控制器处理 issues
    const controller = new ConcurrencyController(10)
    await Promise.all(
      issues.map((issue: GithubIssue) => 
        controller.add(async () => {
          await processIssue(issue, deadLinks)
        })
      )
    )

    if (deadLinks.length === 0) {
      consola.info('没有发现404标签的Issues')
      return
    }

    // 读取现有友链
    const existingLinks = existsSync(linksPath)
      ? yaml.load(readFileSync(linksPath, 'utf8')) as FriendLink[] || []
      : []
    
    const existingAwayLinks = existsSync(awayPath)
      ? yaml.load(readFileSync(awayPath, 'utf8')) as FriendLink[] || []
      : []

    // 获取404链接的URL集合
    const deadUrls = new Set(deadLinks.map(link => link.url))
    
    // 从links.yml中移除404链接
    const updatedLinks = existingLinks.filter(link => !deadUrls.has(link.url))
    
    // 合并404链接到away.yml
    const updatedAwayLinks = Array.from(
      new Map([...existingAwayLinks, ...deadLinks].map(link => [link.url, link])).values()
    )

    // 写入文件
    writeFileSync(linksPath, yaml.dump(updatedLinks), 'utf8')
    writeFileSync(awayPath, yaml.dump(updatedAwayLinks), 'utf8')
    
    consola.success(`已处理404标签的友链: ${deadLinks.length} 条`)
    consola.success(`正常链接: ${updatedLinks.length} 条, 失效链接: ${updatedAwayLinks.length} 条`)
  }
  catch (error) {
    consola.error(`处理404标签失败: ${error instanceof Error ? error.message : String(error)}`)
    process.exit(1)
  }
}

process404Issues()
