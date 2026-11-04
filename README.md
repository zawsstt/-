# 502 Bad Gateway — Server Emergency Room

> 把“救病人”变成“救崩溃的生产环境服务器”的节奏游戏。
> 每一个节拍代表一次负载均衡转发，第 7 拍按下空格，执行。
> 病人分别是“内存泄漏怪”、“死锁幽灵”和“DDoS 洪流”。

在线游玩（GitHub Pages）：https://zawsstt.github.io/-/

## 玩法

- **核心判定：第 7 拍。** 前 6 拍是预告脉冲，第 7 拍是出手点，节奏要踩在音乐的第 7 拍上。
- **操作：**
- `Space`：主判定键（单人），也是推进剧情对话的按键
- `Enter`：在部分界面可代替 Space 推进 / 双人模式下 P2 的判定键之一（`J` / `Enter`）
- 鼠标点击舞台：也可触发判定
- **判定：** Perfect（±40ms 左右的精准窗口，见 `src/game/rules.ts`）、Good、Miss；连击会提升倍率，准确率决定结算评级，最高为 S+。
- **干扰机制（Boss 战特色）：** 错误弹窗遮挡节拍轨道、画面抖动 / 假掉帧、提示点消失、静音拍、半拍偏移、3 对 4 复节奏、7/8 拍等——音频节拍本身保持精准，考的是抗干扰跟拍。

## 关卡：20 关，6 章

故事地点为临海市潮声数据中心，主题是“修的不是机器，是机器背后的人”。

| 章节 | 关卡 | 机制要点 |
| --- | --- | --- |
| Prologue：夜班开始 | P-1 第一盏绿灯、P-2 老船长的航海图 | 经典 7 拍、共鸣维持 |
| Chapter 1：断电诊断 | 1-1 写了又删的那句话、1-2 高峰期的外卖单、1-3 东方不眠夜 · 老风扇电台、1-4 两机架之间的对话 | 丢拍、加速、摇摆拍、平行轨道 |
| Chapter 2：机器背后的人 | 2-1 半拍之差的两个人、2-2 吵架的情侣、2-3 远方的来信、2-4 城市的灯 | 半拍偏移、3:4 复节奏、慢拍、旋转机架 |
| Chapter 3：滞留进程 | 3-1 第一次卡顿、3-2 提示点消失、3-3 Boss：滞留进程 | 卡顿、提示消失、静音拍 |
| Chapter 4：深夜抢修 | 4-1 坏掉的机架、4-2 全重启，还是一台一台来？、4-3 深夜散热故障、4-4 凌晨三点的电话 | 7/8 拍、变速、散热高温加速 |
| Finale：全面恢复 | F-1 一排排亮起来、F-2 Boss：最后一次断电、F-3 破晓 | 全部机制合唱、终章 Boss、交班收尾 |

关卡数据在 `src/game/levels.ts`（`LEVELS`，20 关），判定与节拍计算在 `src/game/rules.ts`。

## 本地运行

```bash
npm install --legacy-peer-deps
npm run dev # 默认 http://localhost:3000
npm run build # 产出 dist/
npm run preview # 预览构建产物
```

注意：本仓库的 `esbuild` 版本与 Vite 8 有 peer 冲突，直接 `npm install` 会报 `eresolve` 失败，本地和 GitHub Actions 都需要用 `--legacy-peer-deps`（见 `.github/workflows/deploy-pages.yml`）。

## 部署到 GitHub Pages

本仓库已配好 `.github/workflows/deploy-pages.yml`：

1. 推送到 `main` 分支自动触发；
2. 用 Node 24 + `npm install --legacy-peer-deps` 构建；
3. 构建命令带 `--base=/-/`，因为项目 Pages 地址是 `https://zawsstt.github.io/-/`，不是域名根目录；
4. 用官方 `actions/upload-pages-artifact` + `actions/deploy-pages` 发布 `dist/`。

首次部署前，需要在仓库 **Settings → Pages → Build and deployment → Source** 里选 **GitHub Actions**（只需设一次）。之后每次推 `main` 都会自动重新部署。

## 技术栈

- React 19 + TypeScript + Vite 8 + Tailwind CSS 4
- Canvas 渲染 + Web Audio：程序合成节拍与音效为主，部分关卡会加载 `public/assets/aistudio/` 下的外部 MP3 / 节拍谱
- 无后端：纯前端静态站，构建产物可直接用任何静态托管 served

## 目录结构

```text
index.html # 入口，标题：502 Bad Gateway — Server Emergency Room
src/
App.tsx # 游戏主流程、按键与关卡切换
main.tsx # 入口
index.css # 样式
components/ # HUD、弹窗、标题屏
game/
levels.ts # 20 关关卡与章节数据
rules.ts # 判定、节拍、分数、评级
sound.ts # 合成音效与外部音频加载
GameCanvas.tsx # 画面渲染
sprites.ts / types.ts / i18n.ts
public/assets/aistudio/ # 关卡音频、图片与节拍谱（约 46 MB，构建时会原样复制到 dist/）
```

## 已知限制

- 项目 Pages 是子路径部署（`/-/`)，`src/game/levels.ts` 里个别外部音频地址目前写的是绝对路径 `/assets/aistudio/...`。在域名根目录部署时正常，在项目 Pages 子路径下这几首外部音频可能 404，游戏会回落到合成节拍继续玩，但听不到原 MP3。如需在 Pages 上也完整听到这几关的外部音频，需要把这几处改成相对路径或按 `import.meta.env.BASE_URL` 拼接，改动时同步更新 `src/game/rules.test.ts` 里对应的断言。
- `public/assets/aistudio/` 里有以 Rhythm Doctor OST 命名的 MP3 文件。公开部署前请自行确认这些音频的来源与使用授权，不要直接当作可商用素材发布。
- `.aistudio/` 是 AI Studio 的工作目录，已随历史提交进入仓库，体积较大（约 70 MB），但不影响 Pages 构建（构建只用 `src/` + `public/`）。
