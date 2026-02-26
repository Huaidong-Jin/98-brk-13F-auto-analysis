# 在 GitHub 上创建仓库并推送

我无法代你登录 GitHub 创建仓库，需要你在浏览器里操作一次。按下面做即可。

---

## 1. 在 GitHub 网站创建空仓库

1. 打开：**https://github.com/new**
2. **Repository name**：填 `brk-13f-tracker`（或你喜欢的名字）
3. **Public** 勾选
4. **不要**勾选 “Add a README file”、“Add .gitignore”、“Choose a license”（保持空仓库）
5. 点 **Create repository**

---

## 2. 在本地推送代码

创建好后，GitHub 会显示 “Quick setup” 的地址。在**本项目根目录**执行（把 `YOUR_USERNAME` 换成你的 GitHub 用户名）：

```bash
cd /Users/Jimmy/Desktop/Desktop/99_learning/11-cursor/98-brk-13F-auto-analysis

git init
git add .
git commit -m "Initial: BRK 13F tracker (Jimmy jimmyandone@gmail.com)"

git remote add origin https://github.com/YOUR_USERNAME/brk-13f-tracker.git
git branch -M main
git push -u origin main
```

若已配置过 `git remote`，可先删掉再加：

```bash
git remote remove origin
git remote add origin https://github.com/YOUR_USERNAME/brk-13f-tracker.git
git push -u origin main
```

推送时如需登录，用 GitHub 账号或 **Personal Access Token**（Settings → Developer settings → Personal access tokens）。

---

## 3. 13F 抓取用的 Agent 信息（已写好）

抓取 SEC 13F 时使用的联系信息已设为：

- **Name**: Jimmy  
- **Email**: jimmyandone@gmail.com  

对应请求头：`User-Agent: Jimmy jimmyandone@gmail.com`  

已在以下位置生效：

- `.env.example` 默认值
- `backend/app/main.py` 默认配置
- `backend/app/ingestion/fetcher.py` 所有请求（可从环境变量 `SEC_USER_AGENT` 覆盖）
- `render.yaml` 部署用默认值

如需改成别的邮箱，改 `.env` 里的 `SEC_USER_AGENT` 或部署平台的环境变量即可。
