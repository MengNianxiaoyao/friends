# [梦念逍遥の友链](https://friends.mnxy.eu.org)

[![links.json](https://img.shields.io/badge/links.json-yellow)](https://friends.mnxy.eu.org/links.json)
![](https://friends.mnxy.eu.org/timestamp.svg)

## 友链说明

### 原则

- 申请的友链将经过筛选（请按格式填好哦～），请确保您的站点能够正常访问。
- 原则上最好为使用 HTTPS 协议站点，且拥有自己的独立域名。
- 会使用 Git 与 GitHub。
- 已添加友链不会轻易删除。如您已移除本站链接，本站也将移除友链。
- 申请友链时，请确保您的站点能够正常访问。
- 友链状态每周五自动检查一次，站点长时间无法访问，我将视情况撤下友链。

#### 内容原则

- 不存在政治敏感问题及违法内容。
- 没有过多的广告以致有碍观瞻、无恶意脚本。
- 最好是有实质性原创内容的网站。（包括但不局限于）
  - 能够帮助到别人的文章
  - 可以让别人更加了解你的生活类文章
  - 自己的业余创作分享
  - 有自己见解的喜好分享
- 转载文章须注明出处。

### 格式

```yaml
- blog: 梦念逍遥のBLOG
  name: 梦念逍遥
  url: https://blog.mnxy.eu.org
  avatar: https://cdn.jsdmirror.com/gh/MengNianxiaoyao/blogassets@main/favicon.svg
  desc: 无梦之境
  color: '#0078e7'
```

- `blog`: 您的站点名称
- `name`: 您的作者名称
- `url`: 博客链接
- `avatar`: 头像图片链接，须使用 HTTPS（须为正方形或圆形），在保证清晰度的前提下，越小越利于迅速加载展示哦～
- `desc`: 一句话描述，描述一下 `自己` 或者 `站点` 或者 `喜欢的话`？（最好不要太长，否则会被截断。）
- `color`: 喜欢的颜色（没有填的话，默认是`'#0078e7'`！）

如果你的文本存在特殊字符时，请使用单引号包裹。（譬如颜色须使用 `'#000000'`，而不是直接 `#000000`。）

## 如何交换友链

- 在 GitHub 上新建 [issue](https://github.com/MengNianxiaoyao/friends/issues/new?template=custom.yaml)。
- 按照模板格式完成填写。
- 填写完成提交后会自动进行友链添加。
- 当链接添加完成后，请尽快于您的站点添加本站友链，您的站点将在 10 分钟内显示在 [梦念逍遥の友链](https://blog.mnxy.eu.org/links/) 里。
- 如需修改链接，请关闭当前 issue 后创建一个新的 issue。其他信息更新请直接修改 issue 内容。

## 感谢

本项目 CDN 加速及安全防护由 Tencent EdgeOne 赞助

![](https://edgeone.ai/media/34fe3a45-492d-4ea4-ae5d-ea1087ca7b4b.png)

官网链接：[亚洲最佳CDN、边缘和安全解决方案 - Tencent EdgeOne](https://edgeone.ai/zh?from=github)
