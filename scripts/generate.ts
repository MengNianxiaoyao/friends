import type { FriendLink } from './utils'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import process from 'node:process'
import { consola } from 'consola'
import yaml from 'js-yaml'
import config from './config'

// 统一的文件处理函数
async function generateJson(type: keyof typeof config.dataFile) {
  const data = yaml.load(
    await readFile(config.dataFile[type], 'utf8'),
  ) as FriendLink[]

  await mkdir(config.outPath, { recursive: true })
  await writeFile(
    config.outFile[type],
    JSON.stringify(data, null, 2),
  )
  consola.success(`Generated ${type}.json successfully!`)
}

async function main() {
  try {
    await Promise.all([
      generateJson('links'),
      generateJson('away'),
    ])
  }
  catch (e) {
    consola.error(e)
    process.exit(1)
  }
}

main()
