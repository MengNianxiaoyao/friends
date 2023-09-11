# [梦念逍遥の友链](https://friends.mnxy.eu.org)

[![links.json](https://img.shields.io/badge/links.json-yellow)](https://friends.mnxy.eu.org/links.json)

## 友链说明

如进行网站链接、描述、头像等信息更换，请在此创建新的 `Pull Request`。请按照格式申请

## 格式

```yml
- name: 梦念逍遥のBLOG
  url: https://blog.mnxy.eu.org
  avatar: https://cdn.staticaly.com/gh/MengNianxiaoyao/blogimages@main/siteicon/icon.svg
  desc: 无梦之境
  color: "#0078e7"
```

- `blog`: 您的站点名称
- `url`: 博客链接
- `avatar`: 头像图片链接，须使用 HTTPS（须为正方形或圆形），在保证清晰度的前提下，越小越利于迅速加载展示哦～
- `desc`: 一句话描述，描述一下 `自己` 或者 `站点` 或者 `喜欢的话`？（最好不要太长，否则会被截断。）
- `color`: 喜欢的颜色（没有填的话，默认是`"#0078e7"`！）

## 如何交换友链

- 在 GitHub 上 `Fork` 此仓库
- 按照以上格式在 [`public/links.yml`](./public/links.yml) 文件末尾新增你的信息（最末尾留一个空行）
- 完成后，新建 `Pull Request`。
- 当 `Pull Request` 被合并后，请尽快于您的站点添加本站友链，您的站点将在 10 分钟内显示在[梦念逍遥の友链](https://blog.mnxy.eu.org/links/)里。
