import type {
  FriendLink,
  GithubIssue,
} from './utils'
import process from 'node:process'
import axios from 'axios'
import { consola } from 'consola'
import yaml from 'js-yaml'
import config from './config'
import {
  checkLinkStatus,
  GITHUB_API_HEADERS,
  readYamlFile,
  updateIssueLabels,
  writeYamlFile,
} from './utils'

const ISSUE_NUMBER = process.env.ISSUE_NUMBER
const linksPath = config.dataFile.links
const awayPath = config.dataFile.away

// 验证并解析友链数据
// 从 Issue 内容中提取 YAML 格式的友链数据，并验证数据格式的正确性
function parseFriendLink(content: string): FriendLink[] {
  try {
    // 使用正则表达式匹配 YAML 代码块
    const match = content.match(/```yaml\n([\s\S]*?)```/)
    if (!match)
      return []

    // 解析 YAML 数据并确保为数组格式
    const data = yaml.load(match[1])
    const links = Array.isArray(data) ? data : [data]
    const requiredKeys = ['blog', 'name', 'url', 'avatar', 'desc', 'color']

    // 验证每个友链对象的属性类型
    return links.filter(link => (
      link && typeof link === 'object' && requiredKeys.every(key =>
        // color 属性可以为空或字符串，其他属性必须为字符串
        key === 'color' ? !link[key] || typeof link[key] === 'string' : typeof link[key] === 'string',
      )
    )).map(link => ({ ...link, color: link.color || '#455cef' })) // 设置默认主题色
  }
  catch {
    return []
  }
}

// 处理单个 Issue
// 根据 Issue 状态处理友链：关闭则删除，开启则检查可访问性
async function processIssue(issue: GithubIssue): Promise<{ aliveLinks: FriendLink[], deadLinks: FriendLink[] }> {
  // 处理已关闭的 Issue：从友链文件中删除相关链接
  if (issue.state === 'closed') {
    const parsedLinks = parseFriendLink(issue.body)
    if (parsedLinks.length === 0)
      return { aliveLinks: [], deadLinks: [] }

    // 读取现有友链
    const [existingLinks, existingAwayLinks] = await Promise.all([
      readYamlFile(linksPath),
      readYamlFile(awayPath),
    ])

    // 从两个文件中过滤掉关闭 issue 中的链接
    const issueUrls = parsedLinks.map(link => link.url)
    const updatedLinks = existingLinks.filter(link => !issueUrls.includes(link.url))
    const updatedAwayLinks = existingAwayLinks.filter(link => !issueUrls.includes(link.url))

    // 写入更新后的文件
    await Promise.all([
      writeYamlFile(linksPath, updatedLinks),
      writeYamlFile(awayPath, updatedAwayLinks),
    ])

    consola.success(`Issue #${issue.number} 已关闭，相关友链已删除`)
    return { aliveLinks: [], deadLinks: [] }
  }

  // 解析并验证新的友链数据
  const parsedLinks = parseFriendLink(issue.body)
  if (parsedLinks.length === 0)
    return { aliveLinks: [], deadLinks: [] }

  // 检查友链可访问性并更新状态
  const [link] = parsedLinks
  const isAlive = await checkLinkStatus(link, false)
  if (isAlive)
    delete link.errormsg

  // 更新 Issue 标签并返回结果
  await updateIssueLabels(issue, isAlive)
  return {
    aliveLinks: isAlive ? [link] : [],
    deadLinks: isAlive ? [] : [link],
  }
}

async function main(): Promise<void> {
  try {
    consola.start('获取并处理 GitHub Issues...')

    // 获取触发工作流的 issue
    const { data: issue } = await axios.get(
      `https://api.github.com/repos/MengNianxiaoyao/friends/issues/${ISSUE_NUMBER}`,
      { headers: GITHUB_API_HEADERS },
    )

    // 处理 issue 中的链接
    const { aliveLinks, deadLinks } = await processIssue(issue)

    if (issue.state === 'closed')
      return

    // 读取现有友链
    const [existingLinks, existingAwayLinks] = await Promise.all([
      readYamlFile(linksPath),
      readYamlFile(awayPath),
    ])

    const createFinalLinks = (current: FriendLink[], updates: FriendLink[], filter: FriendLink[]) =>
      Array.from(
        new Map(
          [...current.filter(link => !filter.some(f => f.url === link.url)), ...updates]
            .map(link => [link.url, updates.find(u => u.url === link.url) || link]),
        ).values(),
      )

    const finalLinks = createFinalLinks(existingLinks, aliveLinks, deadLinks)
    const finalAwayLinks = createFinalLinks(existingAwayLinks, deadLinks, aliveLinks)

    await Promise.all([
      writeYamlFile(linksPath, finalLinks),
      writeYamlFile(awayPath, finalAwayLinks),
    ])

    consola.success(`友链数据已更新`)
  }
  catch (error) {
    consola.error(`处理友链失败: ${error instanceof Error ? error.message : String(error)}`)
    process.exit(1)
  }
}

main()
