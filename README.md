# 翻页时钟（免费 iPad 版，仿 Fliqlo）

一款纯网页的翻页时钟：黑底白字、经典翻页动画，加到 iPad 主屏幕后全屏运行、离线可用、零花费。仿照 Fliqlo（App Store 售价 $0.99）自 2002 年未变的极简设计。

## 功能
- 12/24 小时制切换
- 横屏横排、竖屏竖排（仿原版布局）
- 点屏幕任意处切换秒显
- 亮度调节（20%–100%）
- 翻页挡板显示/隐藏
- 显示尺寸缩放（50%–150%）
- 防息屏（Wake Lock；失败时页面会提示去系统设置）
- 设置自动保存（localStorage），刷新不丢

## 局限（网页版做不到的部分）
- 不能当系统屏保或锁屏：iPadOS 官方不允许 App 当屏保（Fliqlo 官方同样说明）。
- 无「睡眠定时器」：网页拿不到系统自动锁屏权限，该项属原生 App 能力。
- 局域网 http 方式下 Service Worker 与独立全屏可能不生效（浏览器安全策略），长期使用建议 GitHub Pages（HTTPS）。

## 安装方式（任选一种）

### 方式一：GitHub Pages（推荐，完全免费，长期可用）
1. 注册/登录 GitHub（免费）。
2. 新建仓库，把本文件夹内所有文件上传（或按仓库提示推送）。
3. 仓库 Settings → Pages → Source 选 main 分支 → Save，等一分钟得到网址 `https://你的用户名.github.io/仓库名/`。
4. iPad 用 Safari 打开该网址 → 点「分享」→「添加到主屏幕」→ 打开主屏幕图标，即全屏独立运行、可离线使用。

### 方式二：局域网预览（Mac 与 iPad 同一 WiFi）
1. 在 Mac 终端进入本目录，运行：
   `python3 -m http.server 8000`
2. 查看 Mac 的局域网 IP（系统设置 → Wi-Fi → 详细信息），iPad Safari 打开 `http://Mac的IP:8000`。
3. 同样可「添加到主屏幕」。适合快速预览；要离线与全屏效果请用方式一。

### 方式三：本地直接打开
双击 `index.html` 即可看到时钟（最简方式，无 PWA 能力）。

## iPad 添加到主屏幕步骤
Safari 打开页面 → 点底部「分享」按钮 → 「添加到主屏幕」→ 「添加」。以后点主屏幕上的「翻页时钟」图标即可。

## 防息屏说明
页面加载时自动申请 Wake Lock（Safari/iPadOS 16.4+ 支持，主屏幕网页应用需 18.4+）。若提示失败，请在 iPad 的「设置 → 显示与亮度 → 自动锁定」选择「永不」。

## 开发与验收命令
- 逻辑测试：`node test.js`（13 项，跳过 0）
- 设置持久化验证：`node verify-settings.js`
- 本地服务：`python3 -m http.server 8000`

## 更新已发布版本时
改完文件要重新部署时，记得把 `sw.js` 里的 `CACHE`（目前是 `flipclock-v2`）版本号 +1（例如改成 `flipclock-v3`）。否则已经打开过旧版的设备会一直读到本地缓存，看不到更新。

## 调试参数（验收/开发者用，不影响正常走时）
- `?t=HH:MM` 或 `?t=HH:MM:SS`：从指定时间开始走时
- `?demo=1`：演示一次翻页（12:01 → 12:02）

## 文件说明
- `index.html` / `style.css` / `app.js`：页面主体，零外部依赖
- `manifest.webmanifest`：PWA 清单（独立窗口、黑色主题、图标）
- `sw.js`：Service Worker，缓存全部自身文件，断网可开
- `icons/`：应用图标（180/512 PNG + 源 SVG）
- `test.js`：判定标准测试（不许改动）
- `verify-settings.js`：设置持久化独立验证
- `PROGRESS.md` / `BLOCKED.md`：进度与待裁决记录
