# Cursor / AI 开发硬规则（本仓库强制遵守）

## 数据与单位
- **禁止单位错误**：13F value 必须经 unit_multiplier 校验（总量级 + implied price）；统一 USD，禁止把千美元当美元或反之。
- **禁止季度断档隐瞒**：缺失季度必须在 UI 明确提示“缺失原因与证据”；SEC 确实无数据时才允许断档。
- **可追溯**：每次数据更新必须可从 UI 一键跳转到对应 SEC accession 来源链接。

## 前端与图表
- **禁止彩虹色**：黑灰为主 + 1 个强调色（见 design-system）；禁止多色渐变、彩虹图例。
- **禁止硬编码颜色**：禁止在代码中写 `#xxx`、`text-[#xxx]`、`bg-[#xxx]`、`fill-[#xxx]`；统一从 Tailwind/design tokens 引用。
- **每张图必须包含**：
  - 结论式标题（先结论后解释）
  - “How to read” 一句话说明
  - 关键注释（拐点、最大变化、最新值）或脚注
- 所有图表必须通过统一封装组件渲染（ChartFrame / UnifiedTooltip / Footnote）。

## 代码风格
- Python：PEP 8 + black 88 字符；类型注解 + Google 风格 docstring；优先 async/await。
- 所有文件在 `src` 或 `app` 下，使用绝对导入（`from app.*`）。
- 测试：pytest + httpx.AsyncClient；测试目录镜像源码结构。

## 规范文件
- 设计 token 与图表规范以 `docs/design-system.md`、`docs/chart-style-guide.md` 为准。
- 验收标准以 `docs/acceptance-tests.md` 为准；CI 门禁包含 lint + 数据校验脚本。
