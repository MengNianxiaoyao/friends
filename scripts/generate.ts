import { readFile, writeFile, mkdir } from 'node:fs/promises'
import yaml from 'js-yaml'
import consola from 'consola'
import config from './config'

export interface Friend {
  blog: string
  name: string
  url: string
  avatar: string
  desc: string
  color?: string
  errormsg?: string
}

// 统一的文件处理函数
async function generateJson(type: keyof typeof config.dataFile) {
  const data = yaml.load(
    await readFile(config.dataFile[type], 'utf8')
  ) as Friend[]

  await mkdir(config.outPath, { recursive: true })
  await writeFile(
    config.outFile[type],
    JSON.stringify(data, null, 2)
  )
  consola.success(`Generated ${type}.json successfully!`)
}

async function main() {
  try {
    await Promise.all([
      generateJson('links'),
      generateJson('sites'),
      generateJson('away')
    ])
  }
  catch (e) {
    consola.error(e)
    process.exit(1)
  }
}

main()
