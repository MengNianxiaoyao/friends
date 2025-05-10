import { readFile, writeFile } from 'node:fs/promises'
import process from 'node:process'
import axios from 'axios'
import { consola } from 'consola'
import yaml from 'js-yaml'
import config from './config'

// 定义友链数据结构（简化版）
interface FriendLink {
  url: string      // 博客链接
  errormsg?: string // 可选的错误信息
  [key: string]: any // 其他可能的属性
}

// 定义 GitHub Issue 数据结构
interface GithubIssue {
  number: number  // Issue 编号
  body: string    // Issue 内容
  labels: Array<{ name: string }> // Issue 标签列表
}
const TOKEN = process.env.TOKEN
const GITHUB_API_HEADERS = {
  'Accept': 'application/vnd.github+json',
  'Authorization': `Bearer ${TOKEN}`,
  'X-GitHub-Api-Version': '2022-11-28',
}
axios.defaults.timeout = 30 * 1000

// 读取 YAML 文件
async function readYamlFile(filePath: string): Promise<FriendLink[]> {
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
async function writeYamlFile(filePath: string, data: FriendLink[]): Promise<void> {
  try {
    await writeFile(filePath, yaml.dump(data), 'utf8')
    consola.success(`Data saved to ${filePath}`)
  }
  catch (error) {
    consola.error(`Error writing to ${filePath}: ${(error as Error).message}`)
  }
}

// 更新 Issue 标签
// 根据友链可访问性更新对应 Issue 的标签状态
async function updateIssueLabels(url: string, issues: GithubIssue[], isAlive: boolean): Promise<void> {
  // 查找包含指定 URL 的 Issue
  const targetIssue = issues.find(issue => issue.body.includes(url))
  if (!targetIssue)
    return

  try {
    // 准备新的标签列表
    const labels = targetIssue.labels.map(label => label.name)
    const newStatus = isAlive ? 'active' : '404'

    // 如果状态没有变化，跳过更新
    if (labels.includes(newStatus))
      return

    // 更新标签列表：移除旧状态标签，添加新状态标签
    const updatedLabels = [...labels.filter(label => !['active', '404'].includes(label)), newStatus]

    // 调用 GitHub API 更新标签
    await axios.put(
      `https://api.github.com/repos/MengNianxiaoyao/friends/issues/${targetIssue.number}/labels`,
      { labels: updatedLabels },
      { headers: GITHUB_API_HEADERS },
    )

    consola.success(`已更新 ${url} 的标签为 ${newStatus}`)
  }
  catch (error) {
    consola.error(`更新标签失败: ${(error as Error).message}`)
  }
}

// 检查链接状态
async function checkLinkStatus(link: FriendLink, issues: GithubIssue[]): Promise<boolean> {
  try {
    await axios.get(link.url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; Friends links Check Bot; +https://blog.mnxy.eu.org)' },
    })
    consola.success(`${link.url} access OK`)
    await updateIssueLabels(link.url, issues, true)
    return true
  }
  catch (error) {
    consola.warn(`${link.url} access failed`)
    link.errormsg = (error as Error).message
    await updateIssueLabels(link.url, issues, false)
    return false
  }
}

// 并发控制器
// 用于限制同时进行的友链检查数量，避免请求过于频繁
class ConcurrencyController {
  private queue: (() => Promise<void>)[] = [] // 等待执行的任务队列
  private running = 0 // 当前正在执行的任务数

  constructor(private maxConcurrency: number) {} // 最大并发数

  // 添加新任务到控制器
  async add(task: () => Promise<void>): Promise<void> {
    if (this.running >= this.maxConcurrency) {
      // 如果达到最大并发数，将任务加入队列等待
      await new Promise<void>((resolve) => {
        this.queue.push(async () => {
          await task()
          resolve()
        })
      })
    }
    else {
      // 否则直接执行任务
      this.running++
      try {
        await task()
      }
      finally {
        this.running--
        // 任务完成后，如果队列中有等待的任务，继续执行
        if (this.queue.length > 0) {
          const nextTask = this.queue.shift()!
          void this.add(nextTask)
        }
      }
    }
  }
}

// 主函数
async function main(): Promise<void> {
  try {
    const [links, awaylinks] = await Promise.all([
      readYamlFile(config.dataFile.links),
      readYamlFile(config.dataFile.away),
    ])

    consola.start('Checking the status of all links')

    const { data: issues } = await axios.get(
      'https://api.github.com/repos/MengNianxiaoyao/friends/issues',
      { headers: GITHUB_API_HEADERS },
    )

    const controller = new ConcurrencyController(10)
    const allLinks = [...awaylinks, ...links]
    const results = { alive: [] as FriendLink[], dead: [] as FriendLink[] }

    await Promise.all(
      allLinks.map(link =>
        controller.add(async () => {
          const isAlive = await checkLinkStatus(link, issues)
          if (isAlive) {
            delete link.errormsg
            results.alive.push(link)
          }
          else {
            results.dead.push(link)
          }
        }),
      ),
    )

    await Promise.all([
      writeYamlFile(config.dataFile.away, results.dead),
      writeYamlFile(config.dataFile.links, results.alive),
    ])

    consola.success(`处理链接共 ${allLinks.length} 条`)
    consola.success(`正常链接 ${results.alive.length} 条，失效链接 ${results.dead.length} 条`)
  }
  catch (error) {
    consola.error(`An error occurred: ${error instanceof Error ? error.message : String(error)}`)
  }
}

main()
