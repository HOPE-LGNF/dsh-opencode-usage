# OpenCode Go 用量

DSH Web 插件：在消息输入框下方、上下文用量指示器的右侧显示一个小图标；点击后弹出 OpenCode Go 套餐的滚动 / 每周 / 每月用量。

## 数据来源

- Host 端通过 `ctx.credentials` 读取与 `opencode-go` LLM 路由相同的 `OPENCODE_GO_API_KEY`。
- 请求 `GET https://opencode.ai/zen/go/v1/usage`，只把 `rolling`、`weekly`、`monthly` 三个窗口的 `status`、`percent`、`resetsAt` 返回给浏览器，密钥不进入浏览器。
- 浏览器请求同源路由 `GET /opencode-go/usage`，携带已有的 DSH 会话 Cookie。Host 通过 `connection` 检查会话及 Host/Origin，通过后才读取 OpenCode 密钥并查询上游。
- 获取用量失败时，弹层会显示错误提示和“重试”按钮；请求成功但没有可显示的用量时，会显示“暂无用量数据”。

## 文件

| 文件 | 作用 |
| --- | --- |
| `index.js` | Host 半：注册 `/opencode-go/usage` 路由并查询上游 |
| `client.js` | Client 半：注册 `conversation.composer.dock` 图标与弹层 |
| `cordis.patch.yml` | 向 profile 插入 `opencode-go-usage` 行 |
| `locale/*.json` | 插件列表中的标题与描述 |
| `icon.svg` | 插件图标 |

## 安装

已通过 `link:` 方式装入 `desktop` profile（`package.json` 的 `dsh.profile.bundles` 含 `@local/dsh-opencode-usage`）。

在其他 profile 中安装时，用 Plugins 页面的 **添加插件 → 安装第三方插件** 填入本目录绝对路径；对 CLI 管理的 profile 也可以：

```sh
dsh plugin --profile <name> add "link:/path/to/dsh-opencode-usage"
```

profile 重算后 DSH 会热加载 Host 与 Client 两半。

支持部署在 `/dsh/` 等子路径下，用量请求会沿用该路径前缀。使用反向代理时，需按 DSH 的部署要求配置前缀剥除。

## 验证

先打开 DSH Web GUI 并完成登录，在该页面的开发者工具控制台中执行：

```js
const response = await fetch(new URL('opencode-go/usage', document.baseURI), { cache: 'no-store' })
console.log(response.status, await response.json())
```

返回 `200` 和 `{"usage":{...}}` 表示 Host 已成功取得并校验用量。`401 / unauthorized` 表示 DSH 会话未通过认证，`403 / forbidden` 表示 Host/Origin 被拒绝；`401 / missing-key` 则表示 DSH 认证已通过，但尚未配置 `OPENCODE_GO_API_KEY`。不携带 DSH 认证信息的裸 `curl` 请求不能用于验证查询成功。

点击输入框下方的用量图标，确认弹层能显示用量。使用子路径部署时，可在浏览器开发者工具的 Network 面板中检查请求地址是否保留了路径前缀，例如 `/dsh/`。
