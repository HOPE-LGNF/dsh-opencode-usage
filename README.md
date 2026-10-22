# OpenCode Go 用量

DSH Web 插件：在消息输入框下方、上下文用量指示器的右侧显示一个小图标；点击后弹出 OpenCode Go 套餐的滚动 / 每周 / 每月用量。

## 数据来源

- Host 端通过 `ctx.credentials` 读取与 `opencode-go` LLM 路由相同的 `OPENCODE_GO_API_KEY`。
- 请求 `GET https://opencode.ai/zen/go/v1/usage`，只把 `rolling`、`weekly`、`monthly` 三个窗口的 `status`、`percent`、`resetsAt` 返回给浏览器，密钥不进入浏览器。
- 浏览器请求同源路由 `GET /opencode-go/usage`，Host 端把缺失密钥、网络错误、上游错误等映射为带 `code` 的 JSON，前端据此显示可重试的错误提示。

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

## 验证

`DSH_WEB_URL` 是当前 DSH Web GUI 地址：

```sh
curl -s "$DSH_WEB_URL/opencode-go/usage"
```

返回 `{"usage":{...}}` 表示 Host 半已生效；`curl "$DSH_WEB_URL/plugins/events"` 的 `graph` 中出现 `@local/dsh-opencode-usage` 表示 Client 半已进入页面模块图。
