# 部署到 GitHub + 网页测试（Vercel 前端 + Render 后端）

按下面步骤可以把项目放到 GitHub，并把页面部署到网上，直接在浏览器里访问测试。

---

## 一、把项目推到 GitHub

### 1. 在 GitHub 上新建仓库

1. 打开 [github.com/new](https://github.com/new)
2. 仓库名例如：`brk-13f-tracker`
3. 选 **Public**，不要勾选 “Add a README”（仓库保持空）
4. 点 **Create repository**

### 2. 本地初始化并推送

在项目根目录执行（把 `YOUR_USERNAME` 和 `brk-13f-tracker` 换成你的用户名和仓库名）：

```bash
cd /Users/Jimmy/Desktop/Desktop/99_learning/11-cursor/98-brk-13F-auto-analysis

# 若尚未初始化 git
git init
git add .
git commit -m "Initial: BRK 13F tracker backend + frontend"

# 添加远程并推送（替换为你的仓库地址）
git remote add origin https://github.com/YOUR_USERNAME/brk-13f-tracker.git
git branch -M main
git push -u origin main
```

推送时如需登录，用 GitHub 账号或 Personal Access Token。

---

## 二、部署后端到 Render（免费）

后端部署后，前端才能请求到真实数据。

### 1. 用 Render 部署 Docker 后端

1. 登录 [render.com](https://render.com)，用 GitHub 登录
2. **Dashboard** → **New** → **Web Service**
3. 连接你的 GitHub 仓库（如 `brk-13f-tracker`）
4. 配置：
   - **Name**: `brk13f-api`
   - **Region**: 任选（如 Oregon）
   - **Root Directory**: 填 `backend`
   - **Runtime**: 选 **Docker**
   - **Dockerfile Path**: 留空（会使用 `backend/Dockerfile`）
5. **Environment** 添加变量：
   - `DATABASE_URL` = `sqlite+aiosqlite:///./data/brk13f.db`（免费版用 SQLite，重启会清空；要持久化可 later 用 Render PostgreSQL）
   - `SEC_USER_AGENT` = `Jimmy jimmyandone@gmail.com`（必填，SEC 要求；已默认填好）
6. 点 **Create Web Service**，等构建和部署完成

### 2. 记下后端地址

部署成功后，Render 会给你一个地址，例如：

`https://brk13f-api.onrender.com`

**复制这个 URL**，下一步部署前端时要填。

说明：Render 免费版在约 15 分钟无访问后会休眠，下次打开页面时可能要等 30 秒左右唤醒，属正常现象。

---

## 三、部署前端到 Vercel（免费）

### 1. 用 Vercel 部署 Next.js

1. 打开 [vercel.com](https://vercel.com)，用 GitHub 登录
2. **Add New** → **Project**，从列表里选你刚推送的仓库（如 `brk-13f-tracker`）
3. 配置：
   - **Root Directory**: 点 **Edit**，填 `frontend`
   - **Framework Preset**: 保持 **Next.js**
   - **Environment Variables** 添加：
     - 名称：`NEXT_PUBLIC_API_URL`  
     - 值：上一步的 Render 后端地址，例如 `https://brk13f-api.onrender.com`（**不要**在末尾加 `/`）
4. 点 **Deploy**，等构建完成

### 2. 打开你的网页

部署完成后 Vercel 会给你一个地址，例如：

`https://brk-13f-tracker-xxx.vercel.app`

在浏览器里打开这个链接，就是你的线上页面，可以直接在网页上测试。

---

## 四、在网页上测试

1. **首页**：打开 Vercel 给的链接，应看到 “Berkshire's … portfolio” 和简要结论；若尚未跑过 ingest，可能显示 “No data yet”。
2. **Download**：点导航里的 Download，看可下载文件列表（有数据后才会多）。
3. **Quarter / Holding**：有数据后可从首页或链接进入某一季度、某一持仓查看。

### 若想线上也有数据（可选）

- Render 免费实例 **休眠**后，SQLite 数据会清空，所以“跑一次 ingest 就长期有数”需要：
  - 使用 **Render PostgreSQL**（在 Render 里建一个 Postgres，把 `DATABASE_URL` 改成该库的 URL），或
  - 在本地跑 ingest、`DATABASE_URL` 指向同一 Postgres，这样线上页面也会显示你 ingest 的数据。

---

## 五、之后改代码怎么更新网页

- **前端**：改完 `frontend/` 里的代码，推送到 GitHub 的 `main`，Vercel 会自动重新部署，几分钟后刷新网页即可看到新版本。
- **后端**：改完 `backend/` 并推送 `main`，Render 会自动重新构建并部署。

---

## 小结

| 步骤 | 做什么 | 得到的结果 |
|------|--------|------------|
| 一 | 项目推到 GitHub | 代码在 GitHub 上 |
| 二 | Render 部署 backend | 后端 API 有一个公网 URL |
| 三 | Vercel 部署 frontend，并设 `NEXT_PUBLIC_API_URL` 为后端 URL | 前端有一个公网 URL |
| 四 | 浏览器打开前端 URL | 直接在网页上测试 |

把上面出现的 `YOUR_USERNAME`、`brk-13f-tracker`、以及 Render/Vercel 里填的仓库名和变量，换成你自己的即可。
