
import "dotenv/config";
import fs from "fs/promises";
import axios from "axios";
import chalk from "chalk";

// 读取 links.json 文件
const readLinks = async () => {
  console.log("Reading links from links.json...");
  const data = await fs.readFile("./dist/links.json", "utf-8");
  const links = JSON.parse(data);
  console.log(`Found ${links.length} links.`);
  return links;
};

// 检查友链是否可访问
const checkLinks = async (links) => {
  console.log(chalk.greenBright("[INFO] Start checking links..."));
  const deadLinks = [];
  const aliveLinks = [];
  for (const link of links) {
    if (link.bypass) {
      console.log(chalk.cyan(`[INFO] Bypassing ${link.url}...`));
      aliveLinks.push(link);
      continue;
    }
    try {
      console.log(chalk.cyan(`[INFO] Checking ${link.url}...`));
      const response = await axios.get(link.url, {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (compatible; Friends Links Check Bot; +https://blog.mnxy.eu.org)",
        },
      });
      if (response.status < 200 || response.status >= 300) {
        console.log(chalk.yellowBright(`[WARN] Link ${link.url} is dead.`));
        link.errormsg = chalk.yellowBright(
          `[WARN] Status code: ${response.status}`
        );
        deadLinks.push(link);
      } else {
        aliveLinks.push(link);
      }
    } catch (error) {
      console.log(
        chalk.red(`[ERROR] Error checking ${link.url}: ${error.message}`)
      );
      link.errormsg = error.message;
      deadLinks.push(link);
    }
  }
  // 删除无效链接
  const updatedLinks = links.filter((link) => !deadLinks.includes(link));
  await fs.writeFile("./dist/links.json", JSON.stringify(updatedLinks, null, 2));
  console.log(chalk.cyan(`[INFO] Found ${deadLinks.length} dead links.`));
  return { deadLinks, aliveLinks };
};

// 检查 away.json 中的链接是否恢复访问
const checkDeadLinks = async () => {
  try {
    console.log(chalk.greenBright("[INFO] Start checking dead links..."));
    const deadLinksData = await fs.readFile("./dist/away.json", "utf-8");
    const deadLinks = JSON.parse(deadLinksData);
    const aliveLinks = [];

    for (const link of deadLinks) {
      if (link.bypass) {
        console.log(chalk.cyan(`[INFO] Bypassing ${link.url}...`));
        aliveLinks.push(link);
        continue;
      }
      try {
        const response = await axios.get(link.url, {
          headers: {
            "User-Agent":
              "Mozilla/5.0 (compatible; Friends links Check Bot; +https://blog.mnxy.eu.org)",
          },
        });
        if (response.status === 200) {
          console.log(chalk.greenBright(`[INFO] Link ${link.url} is alive.`));
          delete link.errormsg; // 删除 errormsg 字段
          aliveLinks.push(link);
        }
      } catch (error) {
        // 链接仍然无法访问，不做处理
      }
    }

    // 将恢复的链接从 away.json 中删除
    const updatedDeadLinks = deadLinks.filter(
      (link) => !aliveLinks.includes(link)
    );
    await fs.writeFile(
      "./dist/away.json",
      JSON.stringify(updatedDeadLinks, null, 2)
    );

    return aliveLinks;
  } catch (error) {
    console.error(
      chalk.red("[ERROR] An error occurred while checking dead links:", error)
    );
    return [];
  }
};

// 将无法访问的友链移动到 away.json 文件中
const saveDeadLinks = async (newDeadLinks, aliveLinks) => {
  console.log(chalk.cyan("[INFO] Saving dead links to away.json..."));

  // 读取 away.json 文件
  const deadLinksData = await fs.readFile("./dist/away.json", "utf-8");
  let deadLinks = JSON.parse(deadLinksData);

  // 将新的死链添加到现有死链中
  deadLinks = [...deadLinks, ...newDeadLinks];

  // 将更新后的死链写入 away.json
  await fs.writeFile("./dist/away.json", JSON.stringify(deadLinks, null, 2));

  // 读取 links.json 文件
  const linksData = await fs.readFile("./dist/links.json", "utf-8");
  const links = JSON.parse(linksData);

  // 将存活链接写入 links.json
  const updatedLinks = [...links, ...aliveLinks];
  await fs.writeFile("./dist/links.json", JSON.stringify(updatedLinks, null, 2));
};

// 主函数
const main = async () => {
  try {
    // 检查 away.json 中的链接是否恢复访问
    const aliveLinksFromDead = await checkDeadLinks();

    // 读取 links.json 文件
    const linksData = await fs.readFile("./dist/links.json", "utf-8");
    const links = JSON.parse(linksData);

    // 检查所有链接
    const { deadLinks, aliveLinks } = await checkLinks(links);

    // 将死链接保存到 away.json
    await saveDeadLinks(deadLinks, aliveLinksFromDead);

    if (deadLinks.length > 0) {
      await sendNotification(deadLinks);
    } else {
      console.log(chalk.greenBright("[INFO] All links are alive."));
    }
  } catch (error) {
    console.error(chalk.red("[ERROR] An error occurred:", error));
  }
};

main();
