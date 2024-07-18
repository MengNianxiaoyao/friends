import fs from 'node:fs'
import axios from 'axios'
import chalk from 'chalk'
import consola from 'consola'
import yaml from 'js-yaml'
import config from './config'

const linkspath = config.dataFile.links
const awaypath = config.dataFile.away

// 读取 links.yaml 文件
async function readLinks() {
  consola.start('Reading links from links.yaml...')
  const links: any = yaml.load(fs.readFileSync(`${linkspath}`, 'utf-8'))
  if (links === undefined || links === null) {
    consola.success('Found 0 links.')
    return []
  }
  else {
    consola.success(`Found ${links.length} links.`)
    return links
  }
}

// 读取 away.yaml 文件
async function readAway() {
  consola.start('Reading dead links from away.yaml...')
  const away: any = yaml.load(fs.readFileSync(`${awaypath}`, 'utf-8'))
  if (away === undefined || away === null) {
    consola.success('Found 0 dead links.')
    return []
  }
  else {
    consola.success(`Found ${away.length} dead links.`)
    return away
  }
}

// 检查友链是否可访问
async function checkLinks() {
  consola.start('Start checking links...')

  // 读取 links.json 文件
  const links = await readLinks()

  const deadLinks: any[] = []
  const aliveLinks = []
  if (links.length >= 0) {
    for (const link of links) {
      try {
        consola.info(chalk.cyan(`Checking ${link.url}`))
        const response = await axios.get(link.url, {
          headers: {
            'User-Agent':
              'Mozilla/5.0 (compatible; Friends Links Check Bot; +https://blog.mnxy.eu.org)',
          },
        })
        if (response.status < 200 || response.status >= 300) {
          consola.log(chalk.yellow(`[WARN] Link ${link.url} is dead.`))
          link.errormsg = chalk.yellow(`[WARN] Status code: ${response.status}`)
          deadLinks.push(link)
        }
        else {
          aliveLinks.push(link)
        }
      }
      catch (error) {
        consola.log(chalk.red(`[ERROR] Error checking ${link.url}: ${(error as Error).message}`))
        link.errormsg = (error as Error).message
        deadLinks.push(link)
      }
    }
    // 删除无效链接
    const updatedLinks = links.filter((link: any) => !deadLinks.includes(link))
    if (deadLinks.length > 0)
      consola.log(chalk.yellow(`[WARN] Found ${deadLinks.length} dead links.`))
    if (updatedLinks.length > 0)
      fs.writeFileSync(`${linkspath}`, yaml.dump(updatedLinks))
    consola.success(`${updatedLinks.length} links are alive.`)
  }
  else {
    consola.success('Skip check links.')
  }
  return { deadLinks, aliveLinks }
}

// 检查 away.json 中的链接是否恢复访问
async function checkDeadLinks() {
  try {
    consola.start('Start checking dead links...')
    const deadLinks = await readAway()
    const aliveLinks: any[] = []
    if (deadLinks.length > 0) {
      for (const link of deadLinks) {
        try {
          consola.info(chalk.cyan(`Checking ${link.url}`))
          const response = await axios.get(link.url, {
            headers: {
              'User-Agent':
                'Mozilla/5.0 (compatible; Friends links Check Bot; +https://blog.mnxy.eu.org)',
            },
          })
          if (response.status === 200) {
            consola.success(chalk.green(`Link ${link.url} is alive.`))
            delete link.errormsg // 删除 errormsg 字段
            aliveLinks.push(link)
          }
        }
        catch (error) {
          consola.log(chalk.red(`[ERROR] Error checking ${link.url}: ${(error as Error).message}`))
          consola.log(chalk.red(`[ERROR] Link ${link.url} is still unable to access.`))
        }
      }

      // 将恢复的链接从 away.json 中删除
      const updatedDeadLinks = deadLinks.filter(
        (link: any) => !aliveLinks.includes(link),
      )
      if (updatedDeadLinks.length > 0)
        fs.writeFileSync(`${awaypath}`, yaml.dump(updatedDeadLinks))

      if (aliveLinks.length > 0)
        consola.success(chalk.green(`${aliveLinks.length} links are alive.`))
    }
    else {
      consola.success('Skip check dead links.')
    }
    return aliveLinks
  }
  catch (error) {
    consola.log(chalk.red('[ERROR] An error occurred while checking dead links:', error))
    return []
  }
}

// 将无法访问的友链移动到 away.yaml 文件中
async function saveDeadLinks(newDeadLinks: any[], aliveLinks: any[]) {
  if (newDeadLinks.length > 0) {
    consola.start(chalk.green('Saving dead links to away.yaml...'))

    // 读取 away.yaml 文件
    let deadLinks: any = yaml.load(fs.readFileSync(`${awaypath}`, 'utf-8'))
    if (deadLinks === undefined || deadLinks === null)
      deadLinks = []

    // 将新的死链添加到现有死链中
    deadLinks = [...deadLinks, ...newDeadLinks]

    // 将更新后的死链写入 away.yaml
    fs.writeFileSync(`${awaypath}`, yaml.dump(deadLinks))
    consola.success(chalk.green('Dead links saved.'))
  }
  else {
    consola.success('Skip save dead links.')
  }

  if (aliveLinks.length > 0) {
    consola.start(chalk.green('Saving alive links to links.yaml...'))

    // 读取 links.yaml 文件
    let links: any = yaml.load(fs.readFileSync(`${linkspath}`, 'utf-8'))
    if (links === undefined || links === null)
      links = []

    // 将存活链接写入 links.yaml
    const updatedLinks = [...links, ...aliveLinks]
    fs.writeFileSync(`${linkspath}`, yaml.dump(updatedLinks))
    consola.success(chalk.green('Alive links saved.'))
  }
  else {
    consola.success('Skip save alive links.')
  }
}

// 主函数
async function main() {
  try {
    // 检查 away.yaml 中的链接是否恢复访问
    const aliveLinksFromDead = await checkDeadLinks()

    // 检查所有链接
    const { deadLinks, aliveLinks } = await checkLinks()

    // 将死链接保存到 away.yaml
    await saveDeadLinks(deadLinks, aliveLinksFromDead)

    const alivelinks = aliveLinksFromDead.length + aliveLinks.length
    if (alivelinks > 0)
      consola.success(`Total ${alivelinks} links are alive.`)
    else
      consola.log(chalk.yellow('[WARN] No links are alive.'))
  }
  catch (error) {
    consola.log(chalk.red('[ERROR] An error occurred:', error))
  }
}

main()
