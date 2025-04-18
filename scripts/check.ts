import { readFile, writeFile } from 'node:fs/promises'
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
    return true
  }
  catch (error) {
    consola.warn(`${link.url} access failed`)
    link.errormsg = (error as Error).message
    return false
  }
}

// 主函数
async function main() {
  try {
    const [links, awayLinks] = await Promise.all([
      readYamlFile(config.dataFile.links),
      readYamlFile(config.dataFile.away),
    ])

    const aliveLinks: any[] = []
    const deadLinks: any[] = []
    consola.start('Checking the status of all links')

    const controller = new ConcurrencyController(10) // 限制最大并发数为5
    const allLinks = [...awayLinks, ...links]
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

    consola.success(`Total ${aliveLinks.length} links are alive.`)
  }
  catch (error) {
    consola.error(`An error occurred: ${(error as Error).message}`)
  }
}

main()
