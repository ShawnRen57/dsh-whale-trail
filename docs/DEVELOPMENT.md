# Whale Trail 开发与实现说明

## 环境与构建

当前只适配已验证的 macOS / DeepSeek Harness 0.2.1-rc.2。Node.js 24 或更高版本；宿主 SDK 的开发依赖从本机已安装的同版 Harness 发行包中准备，不随仓库分发宿主代码。

```sh
npm ci --legacy-peer-deps --ignore-scripts
node scripts/prepare-local-dev.mjs
npm test
npm run typecheck
npm run build
npm pack --ignore-scripts
```

`npm test` 包含构建及 45 项测试，覆盖自动对话计轮、历史去重、旧版迁移、备份原子合并、隐藏信息隔离和菜单接入等。Host 构建为 ESM；Client 使用宿主支持的 lazy-CJS factory。`lib/` 为构建产物。

图像工具使用项目开发依赖 `sharp`。`node scripts/materials.mjs` 可从原始PNG重新生成WebP、PNG256与物料审阅总览。

## Harness 集成

安装包通过 `dsh.bundle` 声明 `cordis.patch.yml`，CLI 将插件加入指定 profile。Host 订阅正式 Session 事件，通过 SessionPersistence 只读扫描可用历史。Client 为账户菜单增加“我的徽章”入口，徽章面板与设置面板采用相同的800px宽度及视口约束。

当前宿主未提供独立账户菜单项扩展口，因此使用公共 `settings.launcher` 插槽覆盖，并包装原已注册组件，保留设置、意见反馈和退出登录行为。不修改应用安装包，不直接改写宿主DOM；插件卸载时撤销注册。未来宿主接口变化需要重新适配，不能保证未知版本兼容。

示例配置：

```yaml
- id: whale-trail
  config:
    profileId: personal
    timezone: Asia/Shanghai
    scanHistory: true
```

`dataRoot` 可指定徽章数据目录；默认为用户主目录中的 `.dsh-whale-trail`。一台Host对应一个个人档案，不按登录UID自动切换；不适用于多人共用同一Host并期待隔离统计的场景。

## 事件与计数

- 使用日：顶层会话的明确人类非空输入，与实际文本回复或成功工具结果配对。按输入时间决定日期，跨午夜回复不增加一天；后台输入和子代理不计。
- 对话轮次：一个顶层 `turn/start` 内，人类非空直接输入获得可见Agent文本回复，且匹配的 `turn/end reason.kind=completed` 正常闭合，计一次。多个排队输入属于同一回合时只计一次；失败、中止、无可见回复不计。以来源会话和原始回合序号去重，fork继承、历史重扫和备份重复导入不会增加。
- Token：读取 `assistant/message`、`assistant/attempt`、`compaction/summary` 的正式用量，优先采用完整total，否则组合不重叠的输入、缓存读写与输出；不额外叠加reasoning，不估算缺失用量。
- 日期：固定成就时区，日期集合计算累计、当前连续与最长连续。未来时间异常记录暂缓参与日期授予。
- 节日：使用离线年度文化日历，当前为2026；后续年份需要更新。

历史缺少回合完成状态时，只读回扫可补全。仅旧备份且无来源历史的回合不能猜测计数。缺失→已知的特征可补全，已知状态冲突则拒绝合并。

## 账本、迁移与备份

SQLite 保存最小事实、来源身份、规则版本、档案/时区、设备身份和最早授予时间。文件和目录收紧权限。默认账本为 `~/.dsh-whale-trail/profiles/personal/whale-trail.sqlite`。

`.dshbadge` 为带SHA-256完整性校验的明文逻辑快照（schema/rulesVersion为2），包含规则配置、年度日历、目录哈希、事实及授予信息。导入先在暂存数据库预演，提交前保存本地恢复快照，事务合并后重算；校验错误、身份/时区/规则冲突不部分提交。校验和不构成加密或防作弊认证。

v1旧账本升级前保存一致性SQLite快照。日期、Token和设备身份保留；旧手动确认、任务授予及依赖手动确认的隐藏授予不转换为新轮次。旧备份可导入并按可核实事实重算。新公开接口无完成/撤销任务RPC；新备份中的旧手动操作字段固定为空。

## 隐藏徽章与边界

未获得隐藏徽章的Client数据不含真实图案URL或解锁条件，只给名称和通用占位符。源代码与物料公开，因此这属于产品展示上的保密，不是对仓库查看者的密码学保密。

6枚隐藏徽章中，4枚可根据已验证的完整回合和行为特征自动识别；另外2枚涉及子代理完整结算或跨Host迁移来源，当前没有可靠适配，暂不授予。不会用复制聊天、fork或同步徽章冒充这些行为。

当前不提供自动云同步、加密增量备份、多用户档案或未知宿主版本兼容。新徽章与规则变化会通过后续Release说明。
