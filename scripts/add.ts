import { readFile, writeFile } from 'node:fs/promises'
import process from 'node:process'
import axios from 'axios'
import { consola } from 'consola'
import yaml from 'js-yaml'
import config from './config'

axios.defaults.timeout = 30 * 1000

const TOKEN = process.env.TOKEN
const ISSUE_NUMBER = process.env.ISSUE_NUMBER

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
  number: number
  body: string
  state: string
  labels: Array<{ name: string }>
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
        && (key === 'color' ? (typeof link[key] === 'string' || link[key] === undefined || link[key] === '') : typeof link[key] === 'string'),
      )
    )).map(link => ({
      ...link,
      color: link.color || '#455cef', // 设置默认颜色
    }))
  }
  catch {
    return []
  }
}

// 检查链接状态
async function checkLinkStatus(link: FriendLink): Promise<boolean> {
  try {
    await axios.get(link.url, { headers: { 'User-Agent': 'Mozilla/5.0 (compatible; Friends links Check Bot; +https://blog.mnxy.eu.org)' } })
    consola.success(`${link.url} access OK`)
    return true
  }
  catch (error) {
    consola.warn(`${link.url} access failed`)
    link.errormsg = (error as Error).message
    return false
  }
}

// 更新 issue 标签
async function updateIssueLabels(issue: GithubIssue, isAlive: boolean) {
  try {
    const labels = issue.labels.map(label => label.name)
    const currentStatus = labels.includes('active') ? 'active' : (labels.includes('404') ? '404' : null)
    const newStatus = isAlive ? 'active' : '404'

    // 如果状态没有变化，跳过更新
    if (currentStatus === newStatus)
      return

    // 移除旧的状态标签
    const updatedLabels = labels.filter(label => label !== 'active' && label !== '404')
    // 添加新的状态标签
    updatedLabels.push(newStatus)

    // 更新 issue 标签
    await axios.put(
      `https://api.github.com/repos/MengNianxiaoyao/friends/issues/${issue.number}/labels`,
      { labels: updatedLabels },
      {
        headers: {
          'Accept': 'application/vnd.github+json',
          'Authorization': `Bearer ${TOKEN}`,
          'X-GitHub-Api-Version': '2022-11-28',
        },
      },
    )

    consola.success(`已更新 Issue #${issue.number} 的标签为 ${newStatus}`)
  }
  catch (error) {
    consola.error(`更新标签失败: ${(error as Error).message}`)
  }
}

// 处理单个 Issue
async function processIssue(issue: GithubIssue): Promise<{ aliveLinks: FriendLink[], deadLinks: FriendLink[] }> {
  if (issue.state !== 'open')
    return { aliveLinks: [], deadLinks: [] }

  const parsedLinks = parseFriendLink(issue.body)
  if (parsedLinks.length === 0)
    return { aliveLinks: [], deadLinks: [] }

  const aliveLinks: FriendLink[] = []
  const deadLinks: FriendLink[] = []

  // 检查每个链接的状态
  for (const link of parsedLinks) {
    const isAlive = await checkLinkStatus(link)
    if (isAlive) {
      delete link.errormsg
      aliveLinks.push(link)
    }
    else {
      deadLinks.push(link)
    }
    await updateIssueLabels(issue, isAlive)
  }

  return { aliveLinks, deadLinks }
}

async function main(): Promise<void> {
  const linksPath = config.dataFile.links
  const awayPath = config.dataFile.away

  try {
    consola.start('获取并处理 GitHub Issues...')

    // 获取触发工作流的 issue
    const { data: issue } = await axios.get(`https://api.github.com/repos/MengNianxiaoyao/friends/issues/${ISSUE_NUMBER}`, {
      headers: {
        'Accept': 'application/vnd.github+json',
        'Authorization': `Bearer ${TOKEN}`,
        'X-GitHub-Api-Version': '2022-11-28',
      },
    })

    // 处理 issue 中的链接
    const { aliveLinks, deadLinks } = await processIssue(issue)

    // 读取现有友链
    const [existingLinks, existingAwayLinks] = await Promise.all([
      readYamlFile(linksPath),
      readYamlFile(awayPath),
    ])

    // 更新链接状态，同时更新重复链接的信息
    const finalLinks = Array.from(
      new Map(
        [...existingLinks.filter(link => !deadLinks.some(d => d.url === link.url)), ...aliveLinks]
          .map((link) => {
            // 查找是否存在相同 URL 的新链接
            const newLink = aliveLinks.find(a => a.url === link.url)
            // 如果找到相同 URL 的新链接，使用新链接的信息
            return [link.url, newLink || link]
          }),
      ).values(),
    )

    const finalAwayLinks = Array.from(
      new Map(
        [...existingAwayLinks.filter(link => !aliveLinks.some(a => a.url === link.url)), ...deadLinks]
          .map((link) => {
            // 查找是否存在相同 URL 的新链接
            const newLink = deadLinks.find(d => d.url === link.url)
            // 如果找到相同 URL 的新链接，使用新链接的信息
            return [link.url, newLink || link]
          }),
      ).values(),
    )

    // 写入文件
    await Promise.all([
      writeYamlFile(linksPath, finalLinks),
      writeYamlFile(awayPath, finalAwayLinks),
    ])

    consola.success(`友链数据已更新`)
    consola.success(`正常链接: ${finalLinks.length} 条`)
    consola.success(`失效链接: ${finalAwayLinks.length} 条`)
  }
  catch (error) {
    consola.error(`处理友链失败: ${error instanceof Error ? error.message : String(error)}`)
    process.exit(1)
  }
}

main()
