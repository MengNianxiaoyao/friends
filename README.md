# [梦念逍遥の友链](https://friends.mnxy.eu.org)

[![links.json](https://img.shields.io/badge/links.json-yellow)](https://friends.mnxy.eu.org/links.json)

## 友链说明

如进行网站链接、描述、头像等信息更换，请在此创建新的 `Pull Request`。请按照格式申请

### 原则

- 申请的友链将经过筛选（请按格式填好哦～）。
- 原则上最好为使用 HTTPS 协议站点，且拥有自己的独立域名。
- 会使用 Git 与 GitHub。
- 已添加友链不会轻易删除。如您已移除本站链接，本站也将移除友链。
- 站点长时间无法访问，或半年以上没有任何更新，我将视情况撤下友链。

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

```yml
- name: 梦念逍遥のBLOG
  url: https://blog.mnxy.eu.org
  avatar: https://fastly.jsdelivr.net/gh/MengNianxiaoyao/blogimages@main/siteicon/icon.svg
  desc: 无梦之境
  color: '#0078e7' # 这里使用单引号是因为需要进行代码检查
```

- `blog`: 您的站点名称
- `url`: 博客链接
- `avatar`: 头像图片链接，须使用 HTTPS（须为正方形或圆形），在保证清晰度的前提下，越小越利于迅速加载展示哦～
- `desc`: 一句话描述，描述一下 `自己` 或者 `站点` 或者 `喜欢的话`？（最好不要太长，否则会被截断。）
- `color`: 喜欢的颜色（没有填的话，默认是`"#0078e7"`！）

如果你的文本存在特殊字符时，请使用双引号包裹。（譬如颜色须使用 `"#000000"`，而不是直接 `#000000`。）

## 如何交换友链

- 在 GitHub 上 `Fork` 此仓库
- 按照以上格式在 [`public/links.yml`](https://github.com/MengNianxiaoyao/friends/blob/main/public/links.yml) 文件末尾新增你的信息（最末尾留一个空行）
- 完成后，新建 `Pull Request`。
- 当 `Pull Request` 被合并后，请尽快于您的站点添加本站友链，您的站点将在 10 分钟内显示在[梦念逍遥の友链](https://blog.mnxy.eu.org/links/)里。
