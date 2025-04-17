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

async function fetchIssues(): Promise<void> {
  const outputPath = config.dataFile.links

  try {
    // 获取并处理数据
    const { data: issues } = await axios.get('https://api.github.com/repos/MengNianxiaoyao/friends/issues')
    const newLinks = issues
      .filter((issue: { state: string }) => issue.state === 'open')
      .flatMap((issue: { body: string }) => parseFriendLink(issue.body))

    // 读取并合并友链
    const existingLinks = existsSync(outputPath)
      ? yaml.load(readFileSync(outputPath, 'utf8')) as FriendLink[] || []
      : []

    // 使用 Map 去重和更新
    const finalLinks = Array.from(
      new Map([...existingLinks, ...newLinks].map(link => [link.url, link])).values(),
    )

    // 写入文件
    writeFileSync(outputPath, yaml.dump(finalLinks), 'utf8')
    consola.success(`友链数据已更新，共 ${finalLinks.length} 条`)
  }
  catch (error) {
    consola.error(`更新友链失败: ${error instanceof Error ? error.message : String(error)}`)
    process.exit(1)
  }
}

fetchIssues()
