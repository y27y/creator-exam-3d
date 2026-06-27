# 创世计划：造物者考核 3D

这是一个可直接运行的 3D 浏览器游戏原型，核心玩法是：玩家用自然语言创造“造物”，AI/本地编译器把创意转成受规则约束的卡牌，玩家把卡牌放到 3D 格子地图上解决关卡危机。

## 已完成内容

- 3D 低多边形地图与单位展示，基于 Three.js。
- 6 个完整关卡：洪水村庄、永夜矿井、巨兽困城、失语战争、记忆瘟疫、创世终考。
- 明确的胜负目标、回合制结算、单位移动、灾害扩散、战争值、巨兽怒气、世界裂隙。
- 自然语言造物输入框。
- 后端 AI 代理接口 `/api/compile-creation`，支持 OpenAI-compatible Chat Completions API。
- 未配置 API Key 时，本地离线造物编译器兜底，方便先跑通 Demo。
- 前端不暴露密钥；密钥只放在后端 `.env`。

## 运行方式

需要 Node.js 18 或更新版本。

```bash
cd creator_exam_3d
npm start
```

然后打开：

```text
http://localhost:3000
```

项目没有 npm 依赖，`npm start` 实际执行的是 `node server.js`。

注意：Three.js 通过 CDN 加载。正式部署时请保证浏览器可以访问外网；如需完全离线部署，可把 `three.module.js` 和 `OrbitControls.js` 下载到 `public/vendor/`，再修改 `public/index.html` 里的 importmap。

## 接入真实 AI

复制环境变量模板：

```bash
cp .env.example .env
```

填写：

```env
AI_API_KEY=你的密钥
AI_BASE_URL=https://你的-openai-compatible-endpoint/v1
AI_MODEL=你的模型名
PORT=3000
```

然后重新启动：

```bash
npm start
```

如果没有配置 AI，游戏仍然可以运行，只是会使用前端本地兜底编译器。

## 玩法说明

1. 看左侧关卡目标。
2. 在右侧输入一个造物想法，例如：
   - 创造一群会把洪水搬到天空的透明鲸鱼
   - 造一棵会发光并指路的月亮树
   - 让两族的梦境在同一张桌子上相遇
3. 点击“生成造物卡”。
4. 点击“放置造物”。
5. 在 3D 地图上点击一个格子。
6. 点击“结束回合”，观察灾害扩散、单位移动和造物效果。
7. 达成目标进入下一关。

## 造物能力池

AI 不直接决定无限数值，而是把自然语言创意映射到以下受控能力：

- 吸水/转移：处理洪水和水域。
- 造路/搭桥：把危险地块临时变成可通行道路。
- 照明：驱散黑暗和迷雾。
- 阻挡：生成屏障，阻挡灾害或巨兽。
- 安抚/沟通：降低战争值或巨兽怒气。
- 引导：让附近单位朝目标前进。
- 净化：清除毒、雾、黑暗、污染。
- 牵制巨兽：非杀伤地迟缓巨兽。
- 记忆信标：帮助迷路者恢复方向。
- 保护结界：短时间保护一片区域。
- 改变地形：把危险地形改造成可通行地形。

这种设计保证了：AI 是核心玩法的一部分，但平衡和胜负仍由代码控制。

## 文件结构

```text
creator_exam_3d/
  server.js                 # 静态文件服务 + AI 代理
  package.json
  .env.example
  public/
    index.html              # 游戏页面
    styles.css              # UI 样式
    js/
      game.js               # 3D 渲染、游戏循环、关卡结算
      aiClient.js           # AI 调用、本地兜底编译器、卡牌校验
      levels.js             # 关卡配置
```

