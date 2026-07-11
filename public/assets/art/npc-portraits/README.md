# NPC Portrait Production Ledger

These 20 portraits are local runtime assets generated with OpenAI image-2 through Codex's built-in image generation path on 2026-07-11. They are never generated or fetched during gameplay.

## Runtime contract

- `public/js/npcPortraitAssets.js` maps every authored talkable campaign NPC to exactly one transparent WebP.
- The same portrait drives the small circular avatar and the lower-right dialogue cutout.
- Lost NPCs are rendered in grayscale by CSS; the original asset remains unchanged.
- Character colors, headwear, body proportions and carried identity props were derived from `public/js/npcVisualProfiles.js`, so the existing procedural 3D model and the portrait share one identity specification.
- Giant creatures are gameplay hazards rather than talkable NPCs and therefore do not enter the 20-portrait roster.

## Final prompt set

All four generation calls used this shared production prompt scaffold:

```text
Use case: stylized-concept
Asset type: production NPC cutout portrait source sheet for a Chinese dark-fantasy strategy game UI.
Style/medium: premium original AAA game character concept art; painterly stylized realism; subtle low-poly facial planes; original Chinese-inspired frontier-fantasy costume design; readable at 48px; not photorealistic.
Composition/framing: one strict horizontal contact sheet; equal cells; one centered waist-up character per cell; complete head and shoulders; identical camera, face scale, lighting direction and horizon; generous empty margin around each silhouette; props remain inside their cell.
Scene/backdrop: perfectly flat uniform solid #ff00ff chroma-key background for later removal; no floor, scenery, shadows, gradients or reflections.
Materials/textures: weathered woven cloth, aged leather, carved wood, tarnished metal and role-specific props; crisp outer edges.
Constraints: every face, body, headwear and accessory silhouette must be unique; preserve exact left-to-right role order; no #ff00ff on characters.
Avoid: text, names, letters, numbers, logos, watermark, UI panels, borders, frames, extra people, duplicate faces, anime, chibi, glossy plastic, oversized weapons, cropped heads or merged cells.
```

The batch-specific prompt content and reference images were:

### Flood village — 4 columns

- References: `chapters/level-01/shot-03-last-lanterns.webp` for rain-soaked cyan-gray art direction and the current in-game UI screenshot for intended avatar/cutout use.
- Order: 阿粟 — broad reed hat, moss rain cloak, basket strap; 小烛 — child with bun, rust rain cape, amber lantern; 木匠 — sturdy craftsperson, headband, umber coat, mallet; 邮差 — lean blue-coated messenger, cap, red-brown satchel.
- Lighting: cool storm key with restrained warm lantern rim.

### Night mine — 4 columns

- References: the flood-village character sheet for face/material continuity and `chapters/level-02/shot-01-lamps-descend.webp` for graphite dust and mineral light.
- Order: 矿工甲 — lead miner, brass lamp helmet, ochre coat, safety rope; 矿工乙 — broad tunnel digger, low visor, rust coat, downward pickaxe; 矿工丙 — tall survey miner, blue-gray hood, measuring staff/chalk; 矿工丁 — compact ore carrier, teal cap, pack harness, violet-gold ore.
- Lighting: low cool mine key with restrained brass or mineral rim.

### Four messengers — 4 columns

- References: the miner character sheet for rendering continuity, `chapters/level-04/shot-03-two-lanterns.webp` for divided-border tension and `chapters/level-06/shot-01-worlds-return.webp` for final-rift accents.
- Order: 东岸使者 — brick-red cloak, forked crest, folded red-gold pennant; 西岸使者 — blue hood, pale sealed scroll; 北境使者 — slate broad hat, cyan signal lantern; 南境使者 — russet reinforced coat, helmet, folded amber-violet banner.
- Lighting: opposing muted red/blue rim for the war pair and violet-gray rift rim for the final pair.

### Memory plague — 5 columns

- References: the messenger sheet for rendering continuity and `chapters/level-05/shot-03-tree-remains.webp` for low-saturation sacred green and memory-violet light.
- Order: 南枝 — braided moss pathfinder with living branch staff; 北声 — slim blue-gray wind listener with tuning fork; 阿眠 — slight violet dream wanderer with charm; 谷雨 — sturdy sage caretaker with broad hat and canteen; 织火 — russet fire weaver with amber thread spool.
- Lighting: quiet sacred green/violet rim; only 织火 receives a warm ember edge.

### Final residents — 3 columns

- References: the memory-plague sheet for rendering continuity and `chapters/level-06/shot-03-before-seventh-day.webp` for violet-gray convergence light.
- Order: 星砂 — tall blue-gray star-map recorder with asymmetric crownlet; 青麦 — olive grain keeper with woven hat, basket and wheat; 砾歌 — broad ash-gray stone listener with crest and carved stone chimes.
- Lighting: solemn violet-gray rim with small role-specific cyan, grain-gold and stone highlights.

## Post-processing

The source sheets were generated on flat magenta, segmented locally, softly antialiased, despilled at partially transparent edges, cropped per cell and saved as lossless WebP. Source sheets and intermediate masks are intentionally excluded from the repository; only the 20 runtime deliverables remain.

## Final asset hashes

| Asset | SHA-256 |
| --- | --- |
| `level-01/a-su-v2.webp` | `842E8E71AE558B0D2DEE6427A389837EEE9B61F596E1A91BFB40AB8A00CF938B` |
| `level-01/carpenter-v2.webp` | `780D5738107200F52A5DF2C4060C80839616A6838926C8F4D25376F50067970C` |
| `level-01/courier-v2.webp` | `CD92F2CD3C9D360361C8E9A670880D1229056AF11C4C8D95F1EE4AB24DEC0264` |
| `level-01/xiao-zhu-v2.webp` | `1E42701245F55AC3F857168D09C05CF5066DBAE6DC49309D63AE17115FE4D610` |
| `level-02/miner-bing-v3.webp` | `A0EB0E3FEF049B597F0CD6BA4AF10C77F2B2CE061D00AD55CB0E7AAE6FB4284F` |
| `level-02/miner-ding-v3.webp` | `51B1D9112E76315FD64B838E71BC0BBA807526947A23FC9AC2CC7A6E4CDF0042` |
| `level-02/miner-jia-v3.webp` | `3A53E0DDAFDB6271F1396639BFBC29E161683AE3EB94C99940EA8FF776894AAE` |
| `level-02/miner-yi-v3.webp` | `EBC00F78894AEAEB0BA9201F037892F620DAEAA835B413F44F974E3A017210C5` |
| `level-05/a-mian.webp` | `F7DCACBC52E426A9579F829EB483F66ECFF81EA39383A001E3F5FFA2C2FCE307` |
| `level-05/bei-sheng.webp` | `892FF8CDC0074E3CD8A2C186334A8342E441DB1329D5E6F27E272523B68BC2BC` |
| `level-05/gu-yu.webp` | `D02F7423F709203F9694B02323926C77B792A5722951D140109386AC9348D427` |
| `level-05/nan-zhi.webp` | `D7B69287BB24A9877328C646EF439EC80BDEE9987E4F61EB87047366411E0AAE` |
| `level-05/zhi-huo.webp` | `6B077D16B80DBF771DE0973C27DD74808FBDB13E59ADE8831F11E470923CF2F7` |
| `level-06/li-ge.webp` | `AAA2F21194864C786DA8E79F39B49672764B6489D9E6822AA0E3F1006F2145B6` |
| `level-06/qing-mai.webp` | `2F2071F978ADC2EA9B8B640AB7F0FBDE14D5A2857D6C92FF78CFBE9C3B362EBA` |
| `level-06/xing-sha.webp` | `4CDB51BB6F3BD39ED572E0AA8E80DD23DE8B439BD18A02CDFBBBBB7207DFB574` |
| `messengers/east-bank-envoy.webp` | `A1846A6C429C8C9FAB283C548F855D8459609E30C731E4E7838712FE87F58BAB` |
| `messengers/north-border-envoy.webp` | `71319A5F367CA894D117A91D0A675CB99C7682DD07816FE2C92D1CFCF5EBF5BB` |
| `messengers/south-border-envoy.webp` | `A390945F462E4BB9C7B10DDE0417816F925836E0EC881F4F3B97A03503529B92` |
| `messengers/west-bank-envoy.webp` | `5FE48E514EFD5BD13C681D9218B93450DF6A699E875DB45C5C1155B843712F6E` |
