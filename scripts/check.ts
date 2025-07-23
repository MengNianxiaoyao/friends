import axios from 'axios'
import { consola } from 'consola'
import config from './config'
import {
  FriendLink,
  GithubIssue,
  GITHUB_API_HEADERS,
  readYamlFile,
  writeYamlFile,
  checkLinkStatus as utilsCheckLinkStatus
} from './utils'

// 检查链接状态（使用utils.ts中的函数，但保持原有的调用方式）
async function checkLinkStatus(link: FriendLink, issues: GithubIssue[]): Promise<boolean> {
  return utilsCheckLinkStatus(link, true, issues);
}

// 并发控制器
// 用于限制同时进行的友链检查数量，避免请求过于频繁
class ConcurrencyController {
  private queue: (() => Promise<void>)[] = [] // 等待执行的任务队列
  private running = 0 // 当前正在执行的任务数

  constructor(private maxConcurrency: number) { } // 最大并发数

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

    consola.success(`友链数据已更新`)
    consola.success(`处理链接共 ${allLinks.length} 条`)
    consola.info(`正常链接 ${results.alive.length} 条，失效链接 ${results.dead.length} 条`)
  }
  catch (error) {
    consola.error(`An error occurred: ${error instanceof Error ? error.message : String(error)}`)
  }
}

main()