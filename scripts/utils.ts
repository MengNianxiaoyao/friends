import { readFile, writeFile } from 'node:fs/promises'
import process from 'node:process'
import axios from 'axios'
import { consola } from 'consola'
import yaml from 'js-yaml'

// 定义友链数据结构（统一版本）
export interface FriendLink {
  url: string // 博客链接
  blog?: string // 博客名称
  name?: string // 博主名称
  avatar?: string // 头像链接
  desc?: string // 博客描述
  color?: string // 主题色
  errormsg?: string // 可选的错误信息
  [key: string]: any // 其他可能的属性
}

// 定义 GitHub Issue 数据结构
export interface GithubIssue {
  number: number // Issue 编号
  body: string // Issue 内容
  state?: string // Issue 状态（open/closed）
  labels: Array<{ name: string }> // Issue 标签列表
}

export const TOKEN = process.env.TOKEN
export const GITHUB_API_HEADERS = {
  'Accept': 'application/vnd.github+json',
  'Authorization': `Bearer ${TOKEN}`,
  'X-GitHub-Api-Version': '2022-11-28',
}

// 设置axios超时时间
axios.defaults.timeout = 30 * 1000

// 读取 YAML 文件
export async function readYamlFile(filePath: string): Promise<FriendLink[]> {
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
export async function writeYamlFile(filePath: string, data: FriendLink[]): Promise<void> {
  try {
    await writeFile(filePath, yaml.dump(data), 'utf8')
    consola.success(`Data saved to ${filePath}`)
  }
  catch (error) {
    consola.error(`Error writing to ${filePath}: ${(error as Error).message}`)
  }
}

// 检查链接状态（通用版本）
export async function checkLinkStatus(
  link: FriendLink,
  updateLabels: boolean = false,
  issues?: GithubIssue[],
): Promise<boolean> {
  try {
    await axios.get(link.url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; Friends links Check Bot; +https://blog.mnxyio.top)' },
    })
    consola.success(`${link.url} access OK`)

    // 如果需要更新标签且提供了issues参数
    if (updateLabels && issues) {
      await updateIssueLabels(link.url, issues, true)
    }

    return true
  }
  catch (error) {
    consola.warn(`${link.url} access failed`)
    link.errormsg = (error as Error).message

    // 如果需要更新标签且提供了issues参数
    if (updateLabels && issues) {
      await updateIssueLabels(link.url, issues, false)
    }

    return false
  }
}

/**
 * 更新 Issue 标签（通用版本）
 *
 * 这个函数有两种调用方式：
 * 1. updateIssueLabels(url, issues, isAlive) - 通过URL查找issue并更新标签
 * 2. updateIssueLabels(issue, isAlive) - 直接更新指定issue的标签
 *
 * 函数重载声明
 */
export async function updateIssueLabels(
  url: string | undefined,
  issues: GithubIssue[],
  isAlive: boolean
): Promise<void>

export async function updateIssueLabels(
  issue: GithubIssue,
  isAlive: boolean
): Promise<void>

/**
 * 函数实现 - 处理所有调用方式
 */
export async function updateIssueLabels(
  urlOrIssue: string | undefined | GithubIssue,
  issuesOrIsAlive: GithubIssue[] | boolean,
  isAlive?: boolean,
): Promise<void> {
  try {
    let targetIssue: GithubIssue | undefined
    let alive: boolean

    // 处理不同的调用方式
    if (typeof urlOrIssue === 'string') {
      // 第一种调用方式: updateIssueLabels(url, issues, isAlive)
      const url = urlOrIssue
      const issues = issuesOrIsAlive as GithubIssue[]
      alive = isAlive as boolean

      // 查找包含指定 URL 的 Issue
      targetIssue = issues.find(issue => issue.body.includes(url))
      if (!targetIssue)
        return
    }
    else if (typeof urlOrIssue === 'object') {
      // 第二种调用方式: updateIssueLabels(issue, isAlive)
      targetIssue = urlOrIssue
      alive = issuesOrIsAlive as boolean
    }
    else {
      return
    }

    // 准备新的标签列表
    const labels = targetIssue.labels.map(label => label.name)
    const newStatus = alive ? 'active' : '404'

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

    consola.success(`已更新 Issue #${targetIssue.number} 的标签为 ${newStatus}`)
  }
  catch (error) {
    consola.error(`更新标签失败: ${(error as Error).message}`)
  }
}
