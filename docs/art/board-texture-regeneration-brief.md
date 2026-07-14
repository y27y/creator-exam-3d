# 六关棋盘贴图重生成生产规格

## 目标与交付

为《造物者考核 3D》重新生成六张棋盘顶面贴图。成品必须在当前 Three.js 沙盘上保持明亮、细腻、可读，并与代码中的立体水体、体积雾、黑暗暗井、边境会谈门和棋盘外行星环协同工作。

最终交付以下六个文件，文件名和路径必须完全一致，生成完成后可直接替换现有资源，不需要修改 JavaScript：

| 关卡 | 最终文件 |
| --- | --- |
| 洪水村庄 | `public/assets/art/board-surfaces/flood-village-image2.webp` |
| 永夜矿井 | `public/assets/art/board-surfaces/night-mine-image2.webp` |
| 巨兽困城 | `public/assets/art/board-surfaces/giant-city-image2.webp` |
| 失语战争 | `public/assets/art/board-surfaces/wordless-war-image2.webp` |
| 记忆瘟疫 | `public/assets/art/board-surfaces/memory-plague-image2.webp` |
| 第七日前终考 | `public/assets/art/board-surfaces/final-exam-image2.webp` |

输出规格：正方形、至少 1536×1536，推荐 2048×2048；最终为不带透明通道的 WebP，质量 88、method 6、sRGB。单张建议不超过 1 MiB。不要改变上述文件名。

## 必须使用的参考图

新会话生成前必须实际载入并查看以下图片，不得只靠文字复刻：

1. 用户问题截图：本任务对话中的 `1cd97ae8065fbeb54753b29e0922e53d.png`。角色：实机问题参考，用于判断当前画面过暗、雾/黑暗圆圈突兀、单位和边境不清晰的问题。
2. 当前六张 `public/assets/art/board-surfaces/*-image2.webp`。角色：每一关的地貌内容参考；保留关卡身份，但不要继承低亮度、低对比和中心发灰的问题。
3. 第一张获批的新贴图。角色：后续五张的统一风格锚点，锁定笔触、材质尺度、俯视角度、明度和细节密度。

如果用户截图的临时绝对路径已经失效，让用户在新会话重新附图；不要编造替代路径。

## 六张图的共同视觉规范

- Use case：`stylized-concept`
- Asset type：3D 策略游戏的棋盘顶面材质，不是概念场景，不是 UI，不是完整关卡截图。
- 视角：严格正交、正方形、垂直 90 度俯视；不得有地平线、透视收缩、倾斜镜头或明确光源方向。
- 风格：精致的微型星球地表，写实材质与轻度手绘低多边形质感结合；地表像一个可触摸的高质量博物馆沙盘，但贴图本身保持平面材质用途。
- 构图：中央 70% 适合放置 7×7 棋盘单位；细节分布均匀，不设置单一焦点，不在中央放入口、祭坛、圆盘、陨石坑或传送门。
- 明度：整体中间调清楚，暗部不能死黑。建议最终贴图平均感知亮度约 42%–55%，5% 分位亮度不低于 12%，高光保留纹理不过曝。永夜矿井和终考也必须能看清石缝与道路。
- 材质尺度：石块、泥痕、根系、轨枕和裂缝的尺度要能支撑 7×7 格，每格内至少能看到 2–4 个次级纹理变化，但不能形成隐性格子。
- 光照：柔和、均匀、近似阴天摄影棚漫射光；禁止烘焙硬阴影、强边缘暗角、聚光灯和中心亮斑。实时 Three.js 灯光会负责体积与方向。
- 色彩：每关有独立主色，但抬高中间调；不要把六关都做成暗蓝、紫灰或同一种棕色。
- 禁止项：任何网格、方格、六边形、格子圆圈、棋盘线、完整同心圆、行星环、魔法阵、中央裂隙圆环、圆形雾斑、圆形水池描边、发光 UI 线、箭头、标签、文字、角色、单位、房屋、旗帜、边境柱、模型、建筑、画框、水印。
- 行星方向的分工：微型星球感来自地表质感和游戏内的弧形星体壳；真正的行星环由 Three.js 在棋盘外生成。贴图内部不得再画环。

## 生成顺序与提示词

先生成洪水村庄，确认风格后把获批结果作为 Image 2 传给其余五张。每次生成都把该关当前旧贴图作为 Image 1 内容参考；后五张再把新洪水村庄作为 Image 2 风格参考。

### 1. 洪水村庄

```text
Use case: stylized-concept
Asset type: square game-board surface texture for a 3D strategy diorama
Primary request: regenerate a bright, premium flooded-village ground surface for a miniature planet strategy board
Input images: Image 1: current flood-village board texture, content reference; Image 2: gameplay screenshot, readability problem reference
Scene/backdrop: weathered slate-gray flagstones, packed wet earth, shallow desaturated teal runoff channels, soft mud banks, scattered reeds and small driftwood traces
Style/medium: refined realistic material with restrained painterly low-poly gouache character; tactile museum-quality miniature terrain
Composition/framing: exact square orthographic 90-degree top-down view; calm playable center; evenly distributed material detail; no focal object
Lighting/mood: bright overcast diffuse light, lifted midtones, readable wet highlights, no baked directional shadow
Color palette: slate gray, muted teal, moss green, restrained warm mud brown; balanced and not monochrome
Materials/textures: wet stone pores, fine mud variation, shallow water sheen, softened erosion seams, sparse plant debris
Constraints: seamless visual continuity at the image edges; terrain only; preserve a clear center for a 7x7 board; no text, no watermark
Avoid: grids, cells, circles, ring-shaped pools, concentric ripples, central portal, vignette, black water, buildings, characters, flags, UI
```

### 2. 永夜矿井

```text
Use case: stylized-concept
Asset type: square game-board surface texture for a 3D strategy diorama
Primary request: regenerate a readable night-mine quarry surface that feels dark without hiding material detail
Input images: Image 1: current night-mine board texture, content reference; Image 2: approved new flood-village texture, style and brightness anchor
Scene/backdrop: fractured graphite stone, excavated shelves, dusty seams, sparse worn timber sleepers, faint broken rail traces, rubble and muted mineral veins
Style/medium: same refined tactile miniature-terrain style as Image 2; realistic stone with restrained painterly finish
Composition/framing: exact square orthographic 90-degree top-down view; evenly distributed quarry texture; open playable center; no focal pit
Lighting/mood: cool diffuse mine work-light ambience with lifted blacks and clear edge definition; darkness is conveyed by palette, not underexposure
Color palette: charcoal gray, cool blue-gray, restrained brass and pale mineral highlights; avoid pure black
Materials/textures: layered rock cleavage, fine gravel, timber grain, thin ore glints, dusty track wear
Constraints: terrain only; every dark region retains visible stone texture; no text, no watermark
Avoid: black voids, circular shafts, rings, grids, cells, glowing portal, strong purple cast, hard shadows, buildings, characters, UI
```

### 3. 巨兽困城

```text
Use case: stylized-concept
Asset type: square game-board surface texture for a 3D strategy diorama
Primary request: regenerate an ancient forest-stone court surface for a lush miniature planet board
Input images: Image 1: current giant-city board texture, content reference; Image 2: approved new flood-village texture, style and brightness anchor
Scene/backdrop: ancient weathered flagstones, dark fertile soil, broad roots, leaf litter, jade moss, worn courtyard paths and restrained forest-floor traces
Style/medium: refined realistic miniature terrain with the same material scale and painterly finish as Image 2
Composition/framing: exact square orthographic 90-degree top-down view; readable central court without a circular plaza; distributed roots and stone breaks
Lighting/mood: soft forest daylight with clear green-brown separation and gentle moist highlights
Color palette: moss green, cool stone gray, deep soil brown, small warm leaf accents; avoid a single green wash
Materials/textures: stone chips, moss nap, root bark, damp soil granules, scattered leaf fragments
Constraints: terrain only; keep paths organic and non-geometric; no text, no watermark
Avoid: rings, circular courtyards, grids, cells, giant footprints as a central icon, trees or buildings rendered as objects, characters, UI
```

### 4. 失语战争

```text
Use case: stylized-concept
Asset type: square game-board surface texture for a 3D strategy diorama
Primary request: regenerate a brighter gray-brown no-man's-land surface whose border routes remain readable under fog
Input images: Image 1: current wordless-war board texture, content reference; Image 2: approved new flood-village texture, style and brightness anchor; gameplay screenshot: border readability problem reference
Scene/backdrop: compacted gray-brown earth, broad worn crossing roads, shallow irregular trench scars, slate fragments, weathered track marks and restrained plum-gray soil variation
Style/medium: premium tactile miniature battlefield terrain, refined realistic material with restrained painterly finish
Composition/framing: exact square orthographic 90-degree top-down view; roads cross naturally but do not form a grid; bright enough for modeled border gates and messengers to stand out
Lighting/mood: neutral bright overcast light, lifted midtones, high local contrast in road edges and trench scars, no oppressive darkness
Color palette: warm gray, taupe, muted umber, restrained plum-gray and small pale stone accents
Materials/textures: compacted soil, small chipped stone, shallow wheel wear, eroded trench lips, dry dust variation
Constraints: terrain only; do not draw the border line or border posts because they are modeled in Three.js; no text, no watermark
Avoid: flags, posts, fences, full straight divider, rings, circles, grids, cells, black fog, hard shadows, characters, buildings, UI
```

### 5. 记忆瘟疫

```text
Use case: stylized-concept
Asset type: square game-board surface texture for a 3D strategy diorama
Primary request: regenerate a luminous desaturated memory-plague ground with irregular mist traces and broken reflections
Input images: Image 1: current memory-plague board texture, content reference; Image 2: approved new flood-village texture, style and brightness anchor
Scene/backdrop: blue-green worn stone, damp earth, soft irregular mist stains, broken mirror-like wet patches, incomplete repeated paths, pale blank fragments and restrained lavender fissures
Style/medium: refined tactile miniature terrain matching Image 2; subtly surreal but physically readable
Composition/framing: exact square orthographic 90-degree top-down view; no central pool; reflections and fog stains use irregular asymmetric shapes
Lighting/mood: cool luminous overcast ambience with clear stone texture beneath the mist; calm, uncanny, never murky
Color palette: desaturated blue-green, silver gray, pale jade, restrained lavender accents and small charcoal seams
Materials/textures: damp stone grain, thin moisture sheen, frosted stains, chipped reflective fragments, hairline fissures
Constraints: terrain only; fog volume and sacred tree are rendered separately in Three.js; no text, no watermark
Avoid: circular fog spots, ringed pools, complete loops, grids, cells, portal, heavy purple wash, buildings, characters, UI
```

### 6. 第七日前终考

```text
Use case: stylized-concept
Asset type: square game-board surface texture for a 3D strategy diorama
Primary request: regenerate a premium final-exam convergence ground that fuses the previous five material families without a central ring
Input images: Image 1: current final-exam board texture, content reference; Image 2: approved new flood-village texture, style and brightness anchor
Scene/backdrop: controlled fusion of shallow flood channels, graphite seams, mossy roots, worn border-road scars and broken mirror stains across dark neutral stone
Style/medium: most refined version of the shared tactile miniature-planet terrain style; realistic material transitions with restrained painterly finish
Composition/framing: exact square orthographic 90-degree top-down view; several subtle converging fractures but no center icon, portal, crater or circle; readable 7x7 placement area
Lighting/mood: dramatic but clearly exposed diffuse light, lifted violet-gray midtones, small gold and teal material accents, no crushed blacks
Color palette: neutral dark stone, restrained violet-gray, teal, moss green and weathered gold; purple is an accent, not the dominant field
Materials/textures: interlocking stone strata, wet seams, root fibers, graphite chips, road abrasion and fractured reflective traces
Constraints: terrain only; the external planetary rings and rift model are rendered separately in Three.js; no text, no watermark
Avoid: purple circle, central portal, magic ring, concentric cracks, grid, cells, vignette, black void, saturated purple glow, characters, buildings, UI
```

## 生成后的处理

1. 逐张检查正交俯视、无文字、无棋盘格、无圆环、无硬阴影、无中心焦点。
2. 不直接覆盖前先把生成的 PNG 保存在工作区临时目录；选定成品后再转换为 WebP。
3. 使用工作区自带的 Python/Pillow 运行环境转换，不给项目添加生产依赖。转换时统一为 sRGB、正方形、至少 1536×1536，WebP quality 88、method 6。
4. 按本文件顶部的固定路径覆盖六张旧贴图。用户已经明确要求重生成并替换，因此允许覆盖这些目标文件；不要改 JavaScript 引用。
5. 为六张最终 WebP 计算 SHA-256，并更新 `public/assets/art/ATTRIBUTION.md` 中对应六节的生成说明、日期、最终提示词摘要和哈希。不要声称使用了实际未使用的模型或工具。
6. 检查六张文件总大小，确保 `node debug/art-assets-tests.js` 的 18 MiB 总预算仍通过。

## 实机验收

启动服务并逐关截图：

```powershell
npm start
powershell -ExecutionPolicy Bypass -File debug/board-surface-visual-qa.ps1 -BaseUrl http://127.0.0.1:3000
```

必须逐张查看 `debug/board-surface-qa/` 中六张截图，不能只看源贴图。验收标准：

- 1440×900 下，单位名字、路径箭头、每一种地形和 7×7 棋盘边界都能一眼辨认。
- 永夜矿井仍有夜色，但矿工、出口、黑暗暗井和普通石地之间有明确层次。
- 失语战争的发光双柱边境会谈门、道路、两名使者在雾上保持清晰。
- 记忆瘟疫的雾是多层体积，不出现截图中那种单独的白色圆圈。
- 终考棋盘中央没有紫色圆圈、魔法阵或完整同心环。
- 行星环只在棋盘可玩区域外侧出现，不穿过格子、不遮挡单位、不参与点击。
- 水面能看见岸床、深水层、表层高光与断续波纹，而不是一张蓝色平面。
- 六关画面有独立色彩身份，同时没有任何一关因贴图或环境雾变得看不清。

最后运行：

```powershell
npm run check
node debug/board-visual-theme-tests.js
node debug/art-assets-tests.js
node debug/browser-demo-smoke.js
```

只有六关截图和以上检查都通过，贴图重生成任务才算完成。
