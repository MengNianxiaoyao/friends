#!/usr/bin/env node
import { appendFile } from 'node:fs/promises'
import process from 'node:process'
import chalkPipe from 'chalk-pipe'
import { program } from 'commander'
import { consola } from 'consola'
import yaml from 'js-yaml'
import pkg from '../package.json'
import config from './config'

program.version(pkg.version)

program.command('add').action(async () => {
  const blog = await consola.prompt('站点名称：', {
    type: 'text',
  })
  const name = await consola.prompt('作者名称：', {
    type: 'text',
  })
  const url = await consola.prompt('站点链接：', {
    type: 'text',
  })
  const avatar = await consola.prompt('头像链接：', {
    type: 'text',
  })
  const desc = await consola.prompt('站点描述：', {
    type: 'text',
  })
  const color = await consola.prompt('代表色彩：', {
    type: 'text',
  })

  const item = yaml.dump([
    {
      blog,
      name,
      url,
      avatar,
      desc,
      color,
    },
  ])
  await appendFile(config.dataFile.links, item)
  // 使用 color 字段染色
  console.log()
  console.log(
    chalkPipe(color)(item),
  )
})

export async function run() {
  program.parse(process.argv)
}
