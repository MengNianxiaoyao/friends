import { readFile, writeFile } from 'node:fs/promises'
import process from 'node:process'
import axios from 'axios'
import { consola } from 'consola'
import yaml from 'js-yaml'
import config from './config'

axios.defaults.timeout = 30 * 1000

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

// 更新 issue 标签
async function updateIssueLabels(url: string, isAlive: boolean) {
  try {
    // 获取所有 issues，添加认证头部
    const { data: issues } = await axios.get('https://api.github.com/repos/MengNianxiaoyao/friends/issues', {
      headers: {
        'Accept': 'application/vnd.github+json',
        'Authorization': `Bearer ${process.env.TOKEN}`,
        'X-GitHub-Api-Version': '2022-11-28',
      },
    })

    // 查找包含该 URL 的 issue
    for (const issue of issues) {
      if (issue.body.includes(url)) {
        const labels = issue.labels.map((label: any) => label.name)
        const currentStatus = labels.includes('active') ? 'active' : (labels.includes('404') ? '404' : null)
        const newStatus = isAlive ? 'active' : '404'

        // 如果状态没有变化，跳过更新
        if (currentStatus === newStatus)
          continue

        // 移除旧的状态标签
        const updatedLabels = labels.filter((label: string) => label !== 'active' && label !== '404')
        // 添加新的状态标签
        updatedLabels.push(newStatus)

        // 更新 issue 标签，添加认证头部
        await axios.put(
          `https://api.github.com/repos/MengNianxiaoyao/friends/issues/${issue.number}/labels`,
          { labels: updatedLabels },
          {
            headers: {
              'Accept': 'application/vnd.github+json',
              'Authorization': `Bearer ${process.env.TOKEN}`,
              'X-GitHub-Api-Version': '2022-11-28',
            },
          },
        )

        consola.success(`已更新 ${url} 的标签为 ${newStatus}`)
      }
    }
  }
  catch (error) {
    consola.error(`更新标签失败: ${(error as Error).message}`)
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

// 检查链接状态
async function checkLinkStatus(link: any) {
  try {
    await axios.get(link.url, { headers: { 'User-Agent': 'Mozilla/5.0 (compatible; Friends links Check Bot; +https://blog.mnxy.eu.org)' } })
    consola.success(`${link.url} access OK`)
    await updateIssueLabels(link.url, true)
    return true
  }
  catch (error) {
    consola.warn(`${link.url} access failed`)
    link.errormsg = (error as Error).message
    await updateIssueLabels(link.url, false)
    return false
  }
}

// 主函数
async function main() {
  try {
    const [links, awaylinks] = await Promise.all([
      readYamlFile(config.dataFile.links),
      readYamlFile(config.dataFile.away),
    ])

    const aliveLinks: any[] = []
    const deadLinks: any[] = []
    consola.start('Checking the status of all links')

    const controller = new ConcurrencyController(10) // 限制最大并发数为5
    const allLinks = [...awaylinks, ...links]
    await Promise.all(
      allLinks.map(link =>
        controller.add(async () => {
          const isAlive = await checkLinkStatus(link)
          if (isAlive) {
            delete link.errormsg
            aliveLinks.push(link)
          }
          else {
            deadLinks.push(link)
          }
        }),
      ),
    )

    await Promise.all([
      writeYamlFile(config.dataFile.away, deadLinks),
      writeYamlFile(config.dataFile.links, aliveLinks),
    ])

    consola.success(`处理链接共 ${allLinks.length} 条`)
    consola.success(`正常链接 ${aliveLinks.length} 条，失效链接 ${deadLinks.length} 条`)
  }
  catch (error) {
    consola.error(`An error occurred: ${(error as Error).message}`)
  }
}

main()
