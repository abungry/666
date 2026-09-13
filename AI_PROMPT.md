# Spatial AI Companion · 提示词规则清单（现状盘点）

> 本文档汇总产品代码中所有起"提示词"作用的规则、文案、字典与评分逻辑。
> 信息来源：`main.js`、`beijing_places.js` 实际代码，可按行号定位。
> 用途：代码考古 / 现状盘点，便于后续做提示词工程或接入真实 LLM API。

---

## 一、AI 角色与人设（系统级 Prompt）

**核心人设**（从兜底闲聊回复提炼，[main.js:573](file:///c:\Users\Lenovo\Desktop\dachuang\main.js#L573)）：

> 你是 **Spatial AI**，能帮你发现北京最适合的空间。你可以告诉我想去什么样的地方，或者直接问我某个地点的情况。

定位补充（[main.js:291](file:///c:\Users\Lenovo\Desktop\dachuang\main.js#L291)）：

> Spatial AI Companion 是一款融合**遥感环境感知**、**多地理场景适配**与**个性化空间推荐**能力的 AI 陪伴型应用。它让 AI 不止知道"附近有什么"，更理解"什么空间适合此刻的你"。

---

## 二、意图识别规则（[main.js:437-455](file:///c:\Users\Lenovo\Desktop\dachuang\main.js#L437-455)）

按优先级判定用户话语属于哪一类，共三分支：

| 优先级 | 类型 | 触发条件 |
|---|---|---|
| 1 | `place_query`（直接查地点） | 命中 BEIJING_PLACES 任一 alias（长度 ≥ 2 字） |
| 2 | `recommend`（推荐） | 命中下方推荐触发词之一 |
| 3 | `recommend`（默认） | 文本长度 ≥ 3 |
| 4 | `chat`（闲聊） | 兜底 |

**推荐触发词列表**（[main.js:448](file:///c:\Users\Lenovo\Desktop\dachuang\main.js#L448)）：

```
推荐 / 找 / 哪里 / 什么地方 / 想去 / 去哪 / 想玩 / 想逛 / 适合 / 有什么 / 有没有 / 帮我 / 给我 / 介绍
```

---

## 三、偏好关键词字典 PREFERENCE_KEYWORDS（[beijing_places.js:383-401](file:///c:\Users\Lenovo\Desktop\dachuang\beijing_places.js#L383-401)）

17 个偏好维度及同义词列表，用于从用户自然语言中抽取偏好标签：

| 偏好标签 | 同义关键词 |
|---|---|
| 安静 | 安静 / 静 / 不吵 / 没人 / 清幽 / 静谧 / 放空 / 独处 / 冥想 / 减压 |
| 热闹 | 热闹 / 人多 / 拥挤 / 繁华 / 喧嚣 / 夜生活 |
| 绿色 | 绿 / 植被 / 森林 / 树 / 自然 / 生态 / 绿地 / 氧吧 |
| 水边 | 水 / 湖 / 河 / 溪 / 瀑布 / 水边 / 水上 / 湿地 / 海边 |
| 徒步 | 徒步 / 步行 / 走 / 散步 / 健走 / 走路 / 踏青 |
| 爬山 | 爬山 / 登高 / 登顶 / 山 / 峰 / 海拔 |
| 拍照 | 拍照 / 摄影 / 打卡 / 出片 / 好看 / 美 / 镜头 |
| 文化 | 文化 / 历史 / 古迹 / 遗址 / 博物馆 / 人文 / 传统 / 古 |
| 家庭 | 家庭 / 亲子 / 带娃 / 孩子 / 小孩 / 一家人 |
| 运动 | 运动 / 跑步 / 健身 / 锻炼 / 骑行 / 单车 |
| 购物 | 购物 / 逛街 / 买东西 / 商场 / 商圈 / 买 |
| 小众 | 小众 / 冷门 / 人少 / 私藏 / 宝藏 / 不为人知 |
| 夜景 | 夜景 / 晚上 / 夜 / 灯光 / 星空 |
| 开阔 | 开阔 / 大 / 宽敞 / 一望无际 / 视野好 / 俯瞰 |
| 室内 | 室内 / 室内活动 / 空调 / 避雨 / 避暑 |
| 放松 | 放松 / 休闲 / 休息 / 躺平 / 放空 / 慢生活 |
| 年轻人 | 年轻人 / 潮 / 时尚 / 网红 / 打卡地 |

抽取逻辑（[main.js:458-466](file:///c:\Users\Lenovo\Desktop\dachuang\main.js#L458-466)）：遍历字典，命中任一同义词则打上该标签，最终去重返回。

---

## 四、偏好设置选项 PREF_CATEGORIES（[main.js:223-245](file:///c:\Users\Lenovo\Desktop\dachuang\main.js#L223-245)）

5 大类共 42 个偏好项，定义了系统对"什么空间适合此刻的你"的维度划分：

| 分类 | 标题 | 选项 |
|---|---|---|
| environment | 🌿 环境偏好 | 安静 / 热闹 / 绿色 / 水边 / 山地 / 平坦 / 阴凉 / 阳光 |
| activity | 🏃 活动偏好 | 徒步 / 跑步 / 骑行 / 爬山 / 休闲 / 摄影 / 探索 / 冥想 |
| social | 👥 社交偏好 | 独自 / 情侣 / 朋友 / 亲子 / 宠物 / 约会 |
| purpose | 🎯 出行目的 | 放松 / 解压 / 学习 / 工作 / 美食 / 逛街 / 打卡 / 发呆 |
| scene | 🏛️ 场景偏好 | 公园 / 湖泊 / 山脉 / 胡同 / 商圈 / 校园 / 博物馆 / 艺术 / 夜景 / 小众 |

保存逻辑：所有选中项 flatten 为 `profile.tags`，供 AI 对话评分时直接使用（[main.js:264-279](file:///c:\Users\Lenovo\Desktop\dachuang\main.js#L264-279)）。

---

## 五、地点评分引擎（[main.js:469-496](file:///c:\Users\Lenovo\Desktop\dachuang\main.js#L469-496)）

相当于给 LLM 的"打分函数提示词"，按命中条件累加分数并产出可解释理由：

| 条件 | 加分 | 理由文案模板 |
|---|---|---|
| 每命中一个用户偏好标签 | +25 / 个 | `标签匹配「{tag}」` |
| 安静偏好 + quietness ≥ 75 | +15 | `安静度 {quietness}%` |
| 绿色偏好 + NDVI ≥ 0.7 | +12 | `植被指数 NDVI {green}` |
| 水边偏好 + water ≥ 0.35 | +12 | `水体覆盖 {water}` |
| 爬山偏好 + slope ≥ 15 | +10 | `平均坡度 {slope}°` |
| 徒步偏好 + slope ≥ 3 | +8 | `可步行区域` |
| 拍照偏好 | +5 | — |
| 小众偏好 + crowd ∈ {低, 中低} | +10 | `人流量 {crowd}` |
| 开阔偏好 + (NDVI ≥ 0.7 或 water ≥ 0.5) | +8 | — |
| 历史偏好匹配（来自用户记忆） | +5 / 个 | — |

**排序与截断**：按 score 降序，取前 3 名作为推荐结果（[main.js:548-550](file:///c:\Users\Lenovo\Desktop\dachuang\main.js#L548-550)）。

---

## 六、AI 回复生成模板（[main.js:507-577](file:///c:\Users\Lenovo\Desktop\dachuang\main.js#L507-577)）

### 场景 1：直接查询地点（place_query）

使用 `formatPlaceIntro`（[main.js:499-504](file:///c:\Users\Lenovo\Desktop\dachuang\main.js#L499-504)）：

```
📍 **{name}**（{type}）

{desc}

🌿 NDVI {green} · 💧 水体 {water} · 📏 坡度 {slope}° · 🔇 安静度 {quietness}%

🏷️ #tag1  #tag2  #tag3  #tag4
```

reasonCard：地点 tips 前 3 条 + `📍 坐标：{lat}, {lng}`

### 场景 2：根据偏好推荐（recommend）

**顶部固定文案**（[main.js:552](file:///c:\Users\Lenovo\Desktop\dachuang\main.js#L552)）：

```
根据你的偏好「{tags}」，结合遥感环境数据，我为你推荐：
```

**reasonCard 每条结构**（[main.js:556-561](file:///c:\Users\Lenovo\Desktop\dachuang\main.js#L556-561)）：

```
{i}. **{name}**（{type}）· 匹配度 {score}分
   {desc前40字}...
   理由：{reasons前3条用；连接 或 "综合匹配度高"}
   ⚠️ {tip第1条}
```

**无偏好时的引导模板**（[main.js:535-543](file:///c:\Users\Lenovo\Desktop\dachuang\main.js#L535-543)）：

```
我可以帮你找到最适合的北京空间 🌍

你可以这样问我：
- "想找安静的绿地放松一下"
- "有水边适合拍照的地方"
- "适合半天徒步的山地"
- "小众不为人知的宝藏地点"
```

### 场景 3：闲聊兜底（[main.js:573](file:///c:\Users\Lenovo\Desktop\dachuang\main.js#L573)）

> 你好 👋 我是 Spatial AI，能帮你发现北京最适合的空间。你可以告诉我想去什么样的地方，或者直接问我某个地点的情况～

---

## 七、用户记忆系统（[main.js:418-434](file:///c:\Users\Lenovo\Desktop\dachuang\main.js#L418-434)）

| 项 | 说明 |
|---|---|
| 存储键 | `localStorage.sac_user_memory` |
| 结构 | `{ tags: [], visitHistory: [] }` |
| 合并策略 | 本次抽到的偏好与历史 tags 去重合并 |
| 应用方式 | 推荐时用 `[当前偏好 + 历史偏好]` 联合打分 |
| 历史加权 | 每命中一个历史标签 +5 分（[main.js:489-493](file:///c:\Users\Lenovo\Desktop\dachuang\main.js#L489-493)） |

---

## 八、地图与导航提示词

| 项 | 文案 / 规则 | 位置 |
|---|---|---|
| 路线起点 | 北京师范大学（lat 39.9652, lng 116.3662） | [main.js:589](file:///c:\Users\Lenovo\Desktop\dachuang\main.js#L589) |
| 起点标记弹窗 | `<b>路线起点</b><br>{name}` | [main.js:650](file:///c:\Users\Lenovo\Desktop\dachuang\main.js#L650) |
| 兜底路线提示 | `规划路线仅供参考（网络受限）` | [main.js:765](file:///c:\Users\Lenovo\Desktop\dachuang\main.js#L765) |
| 兜底导航步骤 | `从 {起点} 出发` → `沿主要道路向南行驶` → `继续直行，注意交通信号` → `到达目的地 {name}` | [main.js:759-763](file:///c:\Users\Lenovo\Desktop\dachuang\main.js#L759-763) |
| 退出路线提示 | `已退出路线指引` | [main.js:813](file:///c:\Users\Lenovo\Desktop\dachuang\main.js#L813) |

---

## 九、推荐列表卡片模板（[main.js:988-1011](file:///c:\Users\Lenovo\Desktop\dachuang\main.js#L988-1011)）

每张推荐卡包含：
- 真实地点图（OSM 静态地图，失败回退 Unsplash 类型图）
- 匹配度 badge（72-96 随机）
- 类型标签 + "真实位置"指示
- 推荐理由块（标题：💡 推荐理由）
- 距离 + 收藏按钮 + 导航按钮

---

## 十、关于页文案（[main.js:283-313](file:///c:\Users\Lenovo\Desktop\dachuang\main.js#L283-313)）

完整产品介绍文案，包含：
- 产品定位
- 遥感环境感知（Landsat-8 / Sentinel-2 多光谱数据，NDVI / LST / DSM / 水体覆盖率）
- 多地理场景适配（45+ 北京空间，7 大类）
- 个性化空间推荐（对话记忆 + 收藏 + 偏好 → 用户画像，三维评分）
- 地图与路线规划（Leaflet + 高德/OSM 双图层，从北师大出发）

---

## 附：数据维度速查

| 数据 | 字段 | 用途 |
|---|---|---|
| 植被指数 | `place.features.green` (NDVI) | 绿色偏好评分 |
| 水体覆盖 | `place.features.water` | 水边偏好评分 |
| 坡度 | `place.features.slope` (°) | 爬山/徒步评分 |
| 安静度 | `place.quietness` (%) | 安静偏好评分 |
| 人流量 | `place.crowd` (低/中低/中/高) | 小众偏好评分 |
| 标签 | `place.tags[]` | 核心匹配 |
| 提示 | `place.tips[]` | reasonCard 警告 |
| 别名 | `place.aliases[]` | 意图识别 |
