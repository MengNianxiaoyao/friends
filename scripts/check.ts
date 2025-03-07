import fs from 'node:fs'
import axios from 'axios'
import consola from 'consola'
import yaml from 'js-yaml'
import config from './config'

axios.defaults.timeout = 30 * 1000

// 读取 YAML 文件
async function readYamlFile(filePath: string) {
  try {
    const data = yaml.load(fs.readFileSync(filePath, 'utf-8'));
    return Array.isArray(data) ? data : [];
  } catch (error) {
    consola.error(`Error reading ${filePath}: ${(error as Error).message}`);
    return [];
  }
}

// 写入 YAML 文件
async function writeYamlFile(filePath: string, data: any) {
  try {
    fs.writeFileSync(filePath, yaml.dump(data));
    consola.success(`Data saved to ${filePath}`);
  } catch (error) {
    consola.error(`Error writing to ${filePath}: ${(error as Error).message}`);
  }
}

// 检查链接状态
async function checkLinkStatus(link: any) {
  try {
    const response = await axios.get(link.url, { headers: { 'User-Agent': 'Mozilla/5.0 (compatible; Friends links Check Bot; +https://blog.mnxy.eu.org)' } });
    consola.success('${link} access OK')
    return response.status >= 200 && response.status < 300;
  } catch (error) {
    consola.warn('${link} access failed')
    link.errormsg = (error as Error).message;
  }
}

// 主函数
async function main() {
  try {
    let links = await readYamlFile(config.dataFile.links);
    const awayLinks = await readYamlFile(config.dataFile.away);

    // 检查死链接是否恢复
    const aliveLinksFromDead: any[] = [];
    const deadLinks: any[] = [];
    for (const link of awayLinks) {
      if (await checkLinkStatus(link)) {
        delete link.errormsg;
        aliveLinksFromDead.push(link);
      } else {
        deadLinks.push(link);
      }
    }
    links = [...links, ...aliveLinksFromDead]

    // 检查所有链接
    const aliveLinks = [];
    for (const link of links) {
      if (await checkLinkStatus(link)) {
        aliveLinks.push(link);
      } else {
        deadLinks.push(link);
      }
    }
    
    await writeYamlFile(config.dataFile.away, deadLinks);
    await writeYamlFile(config.dataFile.links, aliveLinks);

    consola.success(`Total ${aliveLinksFromDead.length + aliveLinks.length} links are alive.`);
  } catch (error) {
    consola.error(`An error occurred: ${(error as Error).message}`);
  }
}

main();
