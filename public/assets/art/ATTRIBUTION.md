# Art Asset Provenance

All files are stored locally. The running game does not request any image-generation or third-party asset service.

## NPC portraits

- Model: OpenAI image-2, built-in image generation
- Generated: 2026-07-11
- Deliverables: 20 transparent runtime WebP portraits under `npc-portraits/`
- References: repository-owned image-2 chapter stills plus the previously generated portrait batch, used only to preserve the project's art direction and character continuity
- Runtime: local files only; no image generation call or third-party hotlink during play
- Detailed final prompt set, character order, post-processing and SHA-256 ledger: [`npc-portraits/README.md`](./npc-portraits/README.md)

## Image-2 interface material plates

- Model: OpenAI image-2, built-in image generation
- Generated: 2026-07-11
- Deliverables: eight local 1254×1254 WebP UI material plates under `ui-image2/`
- Runtime: local files only; the game does not call an image-generation service while running
- Post-processing: generated PNG sources were visually checked, then encoded to WebP quality 84 with Pillow; the original built-in outputs remain in the local Codex generated-images store
- Shared final prompt: Create a new premium ornamental UI material plate for a dark Chinese fantasy strategy game. Use the supplied chapter background or finale CG as the actual palette and painterly-style reference. Produce a square edge-to-edge material plate that can be cropped to many panel ratios, with a quiet readable center and richer perimeter detail. Keep one restrained archive-and-aged-brass family across every plate while preserving the referenced chapter's material identity. No text, letters, numerals, icons, logos, watermark, characters, scene illustration, hard outer shadow, glossy plastic, neon surfaces, baroque clutter, or high-frequency center detail.

| File | Reference input and theme lift | SHA-256 |
| --- | --- | --- |
| `ui-image2/ui-flood-village.webp` | `backgrounds/level-01-flood-village.webp`; wet slate, damp archive paper, oxidized brass and subdued water channels | `F48AA717B11905FB26E4462AA1B06C72170EFAD3BD9F99F25B93939F73D52B10` |
| `ui-image2/ui-night-mine.webp` | `backgrounds/level-02-night-mine.webp`; cracked mine slate, soot, worn copper rails and sparse lamp seams | `133152268549ABF3FF940863DB3942E0695F74952CFC36B4032B966F2F97EA15` |
| `ui-image2/ui-giant-city.webp` | `backgrounds/level-03-giant-city.webp`; ancient city stone, shallow roots, moss and river-worn bronze | `3811D2775EE29CBFA57F40DAB1D92A06E97FBEF7599EBD276E367DC04C574F89` |
| `ui-image2/ui-wordless-war.webp` | `backgrounds/level-04-wordless-war.webp`; smoke-stained fabric, torn treaty fibers, iron and restrained opposing threads | `CFF58C5FF4A6B45C74F0FF3FD462D2B226717E07FCC63FBEBBACF87F1A8A15FF` |
| `ui-image2/ui-memory-plague.webp` | `backgrounds/level-05-memory-plague.webp`; weathered memory vellum, fogged lacquer and faint root veins | `BD95822593C67C628603D427741C6E908E3F6F758BE2C49D46E5A34625A23787` |
| `ui-image2/ui-final-exam.webp` | `backgrounds/level-06-final-exam.webp`; cracked obsidian, layered archive fragments, brass geometry and restrained violet fissures | `724F7567C8FE73FBA66EC1DC23F7F0B1B512921536079FAACACAD3344348546B` |
| `ui-image2/ui-night-watch.webp` | `cg-night-watch.webp`; fortified soot iron, masonry, riveted brass and ember seams | `75FFB86CBBD54088263EBAA9E48B214EE9AB53BB0CEB5DE9C897E555C2BA1BE2` |
| `ui-image2/ui-airspace.webp` | `cg-airspace-bridge.webp`; dark carrier metal, engraved brass ribs, teal conduits and sparse violet rifts | `AF59B1B24E73BDE1092D85CBFFB3A57E2B6BCA6D235F88873F3E25B471BA6A7A` |

## cg-prologue.webp

- Kind: development-time generated fixed CG
- Model: OpenAI image-2
- Generated: 2026-07-10
- Local file: `cg-prologue.webp`
- Dimensions: 1920×1080
- Final prompt: Create a wide 16:9 cinematic environment key art for a mythic tactical game, viewed at blue hour. A fractured world surrounds a distant seven-by-seven stone strategy board on a floating plateau; a black-violet rift crosses the sky. At the far edges, subtly unify flooded village roofs, cold mine lights, a forest wall, two opposing border banners, and a pale sacred tree. Human presence is limited to tiny anonymous silhouettes, never a central hero. Do not depict any identifiable summoned object or player creation. Matte gouache mixed with elegant low-poly faceted forms, restrained painterly texture, deep navy world, antique warm gold story light, jade interaction light, muted rift purple. Strong foreground-midground-background separation. Keep the left 35 percent calm and dark for an HTML title and keep the lower-right corner readable for an HTML button. No words, letters, numbers, UI, logo, signature, or watermark.
- Post-processing: Sharp attention crop to 1920×1080, WebP quality 82, effort 6, smart subsample

## cg-night-watch.webp

- Kind: development-time generated fixed CG
- Model: OpenAI image-2, built-in image generation
- Generated: 2026-07-11; regenerated with the live main-board screenshot as a style reference
- Local file: `cg-night-watch.webp`
- Dimensions: 2520×1080
- Reference: `debug/headless-page-screenshot.png`, used only for the live board's low-poly terrain, scale, material language and restrained palette; UI and exact board layout were excluded.
- Final prompt: Create one continuous 21:9 cause-and-effect panorama for the transition from the sixth ground exam to Night Watch. At left, the familiar faceted ground world and rescued residents gather surviving materials at dusk; in the center, anonymous residents connect modular watchtowers and a wall with warm light from prior miracles; at right, six layered purple rift bands approach while the completed wall protects the road to the seventh day. Use cinematic painterly low-poly matte stone and wood, deep blue-black, antique gold, restrained jade and muted violet. Each third must work as a crop with quiet copy space. Show only generic towers and abstract miracle light, never a specific player creation. No UI, text, logo, signature or watermark; avoid glossy science fiction, photorealism and a central hero.
- Post-processing: Sharp resize to 2520×1080, WebP quality 86, alpha quality 100, effort 5
- SHA-256: `F00AFB188EF1D10F899E1E7B7D125CE5DF0C9DBB9F79D0831DEA58BC805B7A5B`

## cg-airspace-bridge.webp

- Kind: development-time generated fixed CG
- Model: OpenAI image-2, built-in image generation
- Generated: 2026-07-11; regenerated from the live board and the approved Night Watch panorama
- Local file: `cg-airspace-bridge.webp`
- Dimensions: 1920×1080
- Final prompt: Create a 16:9 cinematic transition environment for entering a mythic rift airspace after a long night defense. The ground world folds upward into the sky like layered map fragments compressed by a vertical violet rift; distant wall, flooded roofs, forest, mine lights, banners, and sacred-tree glow become tiny abstract strata below. A narrow path of white-gold and jade light rises into a vast dark aerial corridor. No visible aircraft in the foreground, no named hero, and no concrete player creation; the miracle must remain abstract. Matte gouache and sophisticated low-poly facets, deep navy and charcoal, antique gold, jade, restrained purple. Keep the left third dark and low-detail for HTML briefing copy and the lower-right safe for a button. No words, letters, numbers, UI, logo, signature, or watermark.
- Post-processing: Sharp attention crop to 1920×1080, WebP quality 82, effort 6, smart subsample

- Regeneration note: the `Final prompt` above records the 2026-07-10 predecessor. The current file was regenerated on 2026-07-11 from the live board and Night Watch panorama.
- Current references: `debug/headless-page-screenshot.png` for ground-world materials; the generated source for `cg-night-watch.webp` for direct wall, light-line and rift continuity.
- Current final prompt: Show the transformation after the same long night: the defended wall and modular towers remain at the lower edge while antique-gold light lines, saved resident light marks and faceted pieces of ground rise and assemble into one jade-cored rift carrier. Six concentric muted-violet memory layers open above, implying the six ground trials will become six aerial echoes. Use a 16:9 cinematic painterly low-poly composition with a strong central vertical path that survives a portrait crop, matte stone and timber, deep blue-black, antique gold, restrained jade and violet. The carrier must visibly derive from wall, tower and terrain motifs rather than being an ordinary aircraft. No pilot, specific player creation, UI, text, logo, signature or watermark; avoid glossy anime mecha and blue-white military science fiction.
- Current post-processing: Sharp resize to 1920×1080, WebP quality 86, alpha quality 100, effort 5
- Current SHA-256: `783CD46F9049F278A0AD2CF01390C1C533A406EA2F3DF5874FE9F9B89FE7A40D`

## Mode bridge sprites

All five files below were generated with OpenAI image-2 through built-in image generation on 2026-07-11. The live main-board screenshot and regenerated Night Watch panorama were supplied as style references. The carrier also used the previous `player-balanced.png` only as a top-down orientation and silhouette reference; its blue-white mechanical styling was explicitly excluded. Each source used a uniform `#ff00ff` chroma-key background, then the installed imagegen `remove_chroma_key.py` helper applied border auto-keying, soft matte and despill. Sharp trimmed, resized and encoded the final alpha WebP files. Runtime image failure falls back to the existing programmatic Canvas art.

Shared prompt constraints: polished matte low-poly tactical-myth game asset; faceted charcoal stone, dark timber, weathered antique-gold seams and restrained jade light; one centered isolated subject with a strong silhouette readable at 32–66 px; no floor, cast shadow, reflection, UI, text, logo or watermark; no glossy modern military science fiction; a perfectly flat `#ff00ff` background not used in the subject.

### towers/tower-assault.webp

- Dimensions: 384×384, alpha WebP
- Final prompt: A compact resident-built assault watchtower with a sturdy octagonal stone plinth, readable ballista-like wooden crown, antique-gold fittings and one jade core. Elevated top-down three-quarter view; recognizable at 40–64 px; not modern artillery.
- Post-processing: chroma-key removal, transparent trim, contain resize, WebP quality 88, alpha quality 100, effort 5
- SHA-256: `9572E2422B1F82BF51B850CDEABC3C312200352A262826AA0179F1822F870711`

### towers/tower-control.webp

- Dimensions: 384×384, alpha WebP
- Final prompt: A compact control watchtower with a broad faceted plinth, forked anchor crown and two simple concentric rings around a muted violet-and-jade crystal, representing frost, gravity, slowing and memory anchoring. Elevated top-down three-quarter view; recognizable at 40–64 px.
- Post-processing: chroma-key removal, transparent trim, contain resize, WebP quality 88, alpha quality 100, effort 5
- SHA-256: `167DC76525B959E25F8FF2B2F8FCC1E5C682EC495DAFF31607B4DB3389215711`

### towers/tower-support.webp

- Dimensions: 384×384, alpha WebP
- Final prompt: A compact resident support watchtower with a lantern crown, four timber braces, visible antique-gold light cords and a small jade beacon, representing residents, supplies, repair, music and shared power. Elevated top-down three-quarter view; recognizable at 40–64 px.
- Post-processing: chroma-key removal, transparent trim, contain resize, WebP quality 88, alpha quality 100, effort 5
- SHA-256: `643F8EEDD546D50C6E756DCC1E4BD9229BAE0C909DA21ACD5401D28503BD8430`

### ships/rift-carrier.webp

- Dimensions: 512×512, alpha WebP
- Final prompt: One upward-pointing top-down rift carrier folded from the defended world: faceted charcoal wall plates, dark timber braces, watchtower geometry, antique-gold seams, a central jade core and only a tiny muted-violet anomaly accent. Symmetric, strong vertical-shooter silhouette, readable at 66 px; no cockpit, missiles, chrome or exhaust.
- Post-processing: chroma-key removal, transparent trim, contain resize, WebP quality 88, alpha quality 100, effort 5
- SHA-256: `633CCEA942D131A3DB3C1DB80E1B984636D82316ACFA635DD8B4662C56C84AAE`

### ships/lantern-wingman.webp

- Dimensions: 256×256, alpha WebP
- Final prompt: One tiny top-down resident lantern skiff made from a single faceted wall fragment, two short timber braces, antique-gold light cords and a jade lantern core. A simple symmetric kite-like companion silhouette readable at 32 px; no modern drone construction or weapons.
- Post-processing: chroma-key removal, transparent trim, contain resize, WebP quality 88, alpha quality 100, effort 5
- SHA-256: `02A1B1BF59EE29904472F44D5321A0A712F32214DBCBECF0D8174996D224F1B9`

## cg-ending.webp

- Kind: development-time generated fixed CG
- Model: OpenAI image-2
- Generated: 2026-07-10
- Local file: `cg-ending.webp`
- Dimensions: 1920×1080
- Final prompt: Create a neutral 16:9 final-world environment plate for a mythic tactical game's ending. Five remembered landscapes—flooded village, dark mine, forest city wall, divided border, and luminous sacred tree—have become quiet fragments orbiting a healed but still visible rift above a distant world horizon. The image must support either victory or loss through later HTML color overlays, so avoid triumphant celebration and avoid total destruction. Only tiny anonymous silhouettes, no hero portrait, no identifiable summoned object, and no specific player creation. Matte painterly low-poly facets, deep blue-black world, balanced antique gold and jade, soft muted purple cracks. Preserve calm negative space across the center-left for dynamic ending text and keep all critical details away from the lower-right button zone. No words, letters, numbers, UI, logo, signature, or watermark. Keep the entire lower-right corner empty, dark, and low-detail so an HTML button can overlay it unobstructed.
- Post-processing: Sharp attention crop to 1920×1080, WebP quality 82, effort 6, smart subsample

## textures/paper002-ui-grain.webp

- Kind: public CC0 texture preview
- Original asset: ambientCG Paper 002
- Official page: https://ambientcg.com/a/Paper002
- Official file: https://acg-media.struffelproductions.com/file/ambientCG-Web/media/thumbnail/512-WEBP/Paper002.webp
- Author / publisher: ambientCG, operated by Lennart Demes
- License: CC0 1.0; ambientCG license explicitly covers asset preview renders
- License page: https://docs.ambientcg.com/license/
- Downloaded: 2026-07-10
- Local file: `textures/paper002-ui-grain.webp`
- Dimensions: 512×512
- Modification: renamed only; rendered at low opacity as a local matte-paper UI overlay
- SHA-256: `11AE4A4057C81FAADC0F8BBE8E1C230BC939DCC3DF9222CEC83BD107B1D7C8C4`

## Six level backplates

All six files are development-time generated fixed images. They are loaded behind the live Three.js scene; the running game never calls an image-generation service. Each approved source image was visually checked before conversion. Two first attempts (`memory-plague` and `final-exam`) were rejected for an over-bright upper HUD area and regenerated with stricter composition constraints.

### backgrounds/level-01-flood-village.webp

- Model: OpenAI image-2
- Generated: 2026-07-10
- Dimensions: 1920×1080
- Final prompt: Create a fixed 16:9 environment backplate for a live Three.js tactical board: a mythic flooded village after three days of rain, with half-submerged faceted roofs, broken footbridges, reeds, piers, rain curtains, a swollen river and tiny warm shelter windows. Use an elevated oblique establishing view. Keep the central 48% dark, low-detail and free of silhouettes; put landmarks at the far edges and horizon, with a calm upper HUD band. Matte gouache fused with elegant low-poly facets; deep navy, charcoal, desaturated flood teal, restrained jade and antique gold. Wet timber, slate, rippling dark water and rain-softened earth. No board, grid, gameplay unit, foreground character, identifiable summoned object, words, UI, logo, signature or watermark.
- Post-processing: Sharp attention crop to 1920×1080, WebP quality 82, effort 6, smart subsample
- SHA-256: `93A46526E6E9DACA955C1A81166B0805A7D80816A0E7905A6BDFCF7E8697967E`

### backgrounds/level-02-night-mine.webp

- Model: OpenAI image-2
- Generated: 2026-07-10
- Dimensions: 1920×1080
- Final prompt: Create a fixed 16:9 environment backplate for a live Three.js tactical board: an eternal-night stepped quarry and mine basin whose lights are failing, with a cave mouth in dark mountains, sparse curving rails, timber braces, carts, mineral seams and isolated lamps leading toward a pale northern exit. Reserve the central 48% as a subdued charcoal basin with minimal contrast; cluster rock and cave silhouettes at outer edges and keep the top HUD band quiet. Matte gouache with clean low-poly facets; blue-black, graphite, muted steel, chalky stone, tiny ivory and antique-gold lights, restrained jade. No board, grid, tile pattern, central hero, monster, weapon, concrete player creation, text, UI, neon machinery, logo, signature or watermark.
- Post-processing: Sharp attention crop to 1920×1080, WebP quality 82, effort 6, smart subsample
- SHA-256: `534F1AF6F09B630F06D5E89F2CAB7F27C76EC6BD4B00B8380ECED303AFBC2947`

### backgrounds/level-03-giant-city.webp

- Model: OpenAI image-2
- Generated: 2026-07-10
- Dimensions: 1920×1080
- Final prompt: Create a fixed 16:9 environment backplate for a live Three.js tactical board: an ancient forest city preparing for a colossal unseen beast, with a long weathered wall, watchtowers, drying aqueducts, giant footprints, bent treetops, distant farms and a strained pale reservoir. The beast stays offscreen. Use an elevated oblique panorama whose center is dark and structurally simple; wall, canopy, footprints and reservoir occupy only the perimeter and horizon, while the HUD strip remains calm. Painterly matte low-poly facets in deep forest green, blue-black, stone gray, dry ochre, antique-gold beacons and restrained jade. No board, tiles, foreground combat, central giant, weapon, defense piece, player creation, words, UI, logo, signature or watermark.
- Post-processing: Sharp attention crop to 1920×1080, WebP quality 82, effort 6, smart subsample
- SHA-256: `3BCCA9BDD3778E9CAC9DDF1A19ED52B0C5FEAB14FFC934C7F46EA74E0E5A80F1`

### backgrounds/level-04-wordless-war.webp

- Model: OpenAI image-2
- Generated: 2026-07-10
- Dimensions: 1920×1080
- Final prompt: Create a fixed 16:9 environment backplate for a live Three.js tactical board: a silent divided border where two exhausted factions face each other across foggy no-man's-land, with distant opposing camps, muted banners, abandoned road markers, broken negotiation tables, shallow trenches and a blocked gate. Keep the central 48% as calm dark ground and soft fog; camps stay at opposite extreme edges and the top HUD zone is low-detail. Restrained matte gouache and sophisticated low-poly facets; charcoal navy, muted plum and rust, fog gray, antique-gold fires and restrained jade path hints. No board, grid, active battle, focal weapon, central soldier, concrete player creation, readable emblem, real flag, words, UI, logo, signature or watermark.
- Post-processing: Sharp attention crop to 1920×1080, WebP quality 82, effort 6, smart subsample
- SHA-256: `732DFDB9FA3E9C298A06FDBED7FD7ED7EED9EF25285C9A48C5DDBABE7C9E1D20`

### backgrounds/level-05-memory-plague.webp

- Model: OpenAI image-2
- Generated: 2026-07-10; regenerated after visual QA
- Dimensions: 1920×1080
- Final prompt: Create a fixed 16:9 environment backplate for a live Three.js tactical board: a village fading under a memory plague, with rooflines and paths dissolving into mist, a few abstract unreadable fragments, memory stones, mirrored pools and one distant sacred tree. Matte gouache with elegant faceted low-poly forms; blue-black, muted jade, pale ivory, antique gold and desaturated lavender cracks. Keep the central 48% as low-contrast fog ground. The sacred tree must sit on the far upper-left horizon, no more than 18% of image height, with restrained low-saturation light. The top 25% across the entire frame and the upper-right must remain dark, quiet and low-detail; fragments are sparse and confined to edges. No readable writing, symbols, runes, board, grid, character, ghost, concrete creation, UI, logo, signature or watermark.
- Post-processing: Sharp attention crop to 1920×1080, WebP quality 82, effort 6, smart subsample
- SHA-256: `55F43477A273BC1C9033DCD5B830230E7D506FF1FDB5C34579BD75D0D754AEAD`

### backgrounds/level-06-final-exam.webp

- Model: OpenAI image-2
- Generated: 2026-07-10; regenerated after visual QA
- Dimensions: 1920×1080
- Final prompt: Create a fixed 16:9 final-exam environment backplate for a live Three.js tactical board. Unify distant, low-contrast echoes of flooded roofs, a quarry mouth and lamp trail, a forest wall, two faded border camps and a sacred tree around a restrained world rift. Use a premium matte painterly low-poly style with deep navy, charcoal, antique gold, jade and muted violet. Preserve a broad dark low-detail central 48% and lower center for the live board. The rift is only a remote, narrow, low-brightness horizon crack, never the subject; the sacred tree is tiny in the far corner; all five landscape echoes stay at the outer edges. The top 25% across the frame is a dark low-detail HUD-safe sky. No board, grid, hero, boss, aircraft, specific player creation, words, UI, logo, signature or watermark.
- Post-processing: Sharp attention crop to 1920×1080, WebP quality 82, effort 6, smart subsample
- SHA-256: `4F8625C9F340A72EA51D93538D50C685B2449D94B8ADDC7FBC5881746259DD37`

## Level 01 chapter-opening stills

These three development-time generated images form one continuous first-act sequence. The local `backgrounds/level-01-flood-village.webp` was supplied as a world and art-direction reference so the architecture, river valley, palette, matte gouache texture, and elegant low-poly facets remain consistent. All titles and copy are HTML overlays; the raster images contain no generated text.

### chapters/level-01/shot-01-rain-arrives.webp

- Model: OpenAI image-2, built-in image generation
- Generated: 2026-07-10
- Dimensions: 1920×1080
- Final prompt: Create the first 16:9 still in a three-image AAA-style chapter opening, using the supplied flood-village image as a continuity reference. Show the same low river village several hours before the catastrophic flood, as the third day of rain begins and residents still believe the intact timber walkways will hold. Cluster wet slate-roof homes along a swollen but contained river; place tiny anonymous lantern carriers in the distance and a vast incoming rain curtain on the horizon. Use premium cinematic matte gouache fused with elegant low-poly facets, deep navy, charcoal, desaturated teal, restrained jade and tiny antique gold. Preserve dark calm negative space in the lower-left and top 18% for HTML text. No board, grid, hero, weapon, vehicle, player creation, text, UI, logo, signature or watermark.
- Post-processing: Sharp attention crop to 1920×1080, WebP quality 84, effort 6, smart subsample
- SHA-256: `0A37652480383B3B377A749EA3C06E69534EAE4912FAAC6454049C27909DE5BA`

### chapters/level-01/shot-02-river-breaches.webp

- Model: OpenAI image-2, built-in image generation
- Generated: 2026-07-10
- Dimensions: 1920×1080
- Final prompt: Create the second 16:9 still in the same chapter opening, using the supplied flood-village image as the exact same world's continuity reference. Show the decisive moment when the river overtops a low timber barrier and takes the first narrow footbridge. Dark water spills across the route, the bridge buckles into the current, rain beats across recognizable slate roofs, and several distant lanterns move toward high ground. Keep the event urgent but restrained, not a disaster-action spectacle. Match the reference's premium matte gouache and refined low-poly facets, navy-black, wet charcoal, desaturated teal and sparse antique gold. Keep the lower-left and top 18% quiet for HTML copy. No injury, close-up resident, giant wave, explosion, board, grid, gameplay unit, rescue vehicle, concrete creation, text, UI, logo, signature or watermark.
- Post-processing: Sharp attention crop to 1920×1080, WebP quality 84, effort 6, smart subsample
- SHA-256: `E99A6024A9CD7B1280BCBCF4177EABF1D31F308886F466400AD591E16B25AEC5`

### chapters/level-01/shot-03-last-lanterns.webp

- Model: OpenAI image-2, built-in image generation
- Generated: 2026-07-10
- Dimensions: 1920×1080
- Final prompt: Create the third 16:9 still immediately before the live board appears, using the supplied flood-village image as the same fully flooded settlement. Show the quiet aftermath: half-submerged slate roofs, broken walkways disappearing into dark water, isolated windows and lanterns, and a distant pale strip of high ground visible through continuous rain. The subject is isolation, last lights, and a restrained possibility of safety. Closely preserve the reference geography, palette, matte materials and painterly low-poly finish so the image can dissolve naturally into the existing level background. Keep the center, lower-left and top 18% dark and uncluttered for mission text. No bright sunrise, triumph, board, grid, hero, vehicle, rescue object, weapon, specific player creation, text, UI, logo, signature or watermark.
- Post-processing: Sharp attention crop to 1920×1080, WebP quality 84, effort 6, smart subsample
- SHA-256: `0DEC9F218B8BFA5BECE4859B3B8351EF4F5C14166720C714178A26F5FE156884`

## Level 02-06 chapter-opening stills

These fifteen development-time generated images form five continuous three-shot chapter openings. Each level's local backplate was supplied as a visual-continuity reference. The shared direction was: premium 16:9 AAA environment key art, matte gouache fused with elegant low-poly facets, recognizable geography and materials, quiet top and lower-left HTML-copy zones, no central hero, and no text, watermark, UI, board, gameplay pieces, or concrete player creation. All raster outputs were visually reviewed before being copied into the project; titles and story copy remain HTML overlays.

### chapters/level-02/shot-01-lamps-descend.webp

- Model: OpenAI image-2, built-in image generation
- Generated: 2026-07-10
- Dimensions: 1920x1080
- Final prompt: In the eternal-night stepped quarry, show an earlier shift when a long chain of antique-gold work lamps still descends from the rim toward the deep mine. Preserve the reference cave mouth, charcoal terraces, curving rails, timber braces, carts, mineral seams, starless blue-black palette, and tiny anonymous miners. Make the fragile route of light the subject, with a dark lower-left and quiet top band; avoid sci-fi machinery, giant crystals, readable signs, or spectacle.
- Post-processing: Sharp attention crop to 1920x1080, WebP quality 84, effort 6, smart subsample
- SHA-256: `4A2090B6130FD961A49674CE5F4D8200482C6DB85AEE79704C089ABB4A432020`

### chapters/level-02/shot-02-lights-fail.webp

- Model: OpenAI image-2, built-in image generation
- Generated: 2026-07-10
- Dimensions: 1920x1080
- Final prompt: Return to the exact same quarry as its lamps fail one after another, leaving separated pools of warm light and cutting the route home into darkness. Keep the familiar terraces, rails, timber braces, carts, mineral dust, pale northern passage, matte graphite rock, and elegant low-poly gouache treatment. Let darkness advance from the far mine while the lower-left remains readable; show no cave-in, explosion, monster, neon beam, or readable symbol.
- Post-processing: Sharp attention crop to 1920x1080, WebP quality 84, effort 6, smart subsample
- SHA-256: `794FCAD059C7052F96D6A40748D39D791657724F00762273E1F2DE8ED5720B8B`

### chapters/level-02/shot-03-northern-glow.webp

- Model: OpenAI image-2, built-in image generation
- Generated: 2026-07-10
- Dimensions: 1920x1080
- Final prompt: Show the same mine in its immediate pre-board state after almost every lamp has died: a broad subdued basin, rails disappearing into shadow, dark braces and shelves, only three or four isolated lights, and a faint cold northern opening suggesting one possible exit. Closely align the reference geography and keep the center and lower-left dark for mission text. The mood is grave but not hopeless; no bright portal, sunrise, close-up character, or central glowing object.
- Post-processing: Sharp attention crop to 1920x1080, WebP quality 84, effort 6, smart subsample
- SHA-256: `00E2AB403F30E99AA5FD39BB893CDC96F9B3AD5F3DC5144A5281E2BB7D619F30`

### chapters/level-03/shot-01-footprint-beyond.webp

- Model: OpenAI image-2, built-in image generation
- Generated: 2026-07-10; regenerated after visual QA for clearer footprint evidence
- Dimensions: 1920x1080
- Final prompt: In the ancient forest city, show the moment sentries discover one colossal fresh footprint beyond the weathered wall while narrow irrigation channels still carry weak water. Preserve the reference wall, watchtowers, pine canopy, pale reservoir, bent saplings, old stone and wet-earth palette. The single footprint must read as pressed earth rather than an impact crater, and the unseen giant must remain entirely offscreen. Keep the lower-left forest shadow and top band calm; no battle, gore, hero, or defense pieces.
- Post-processing: Sharp attention crop to 1920x1080, WebP quality 84, effort 6, smart subsample
- SHA-256: `0F9A93059949391C9CDA28DE2A5B8C01A449FC4391B8423C550F6CD1DE47E258`

### chapters/level-03/shot-02-channels-dry.webp

- Model: OpenAI image-2, built-in image generation
- Generated: 2026-07-10; regenerated after visual QA for fully dry channels and a clearer trail
- Dimensions: 1920x1080
- Final prompt: Show the same city's irrigation failure at deepening dusk: channels and aqueduct beds are cracked and dry, farms near the intact wall have lost their water, the reservoir has retreated, and a readable trail of immense footprints presses through bent forest toward the watchtowers. Follow a dry channel from the dark lower-left toward the horizon. Preserve the established geography and materials; keep the beast offscreen and avoid fire, explosions, central soldiers, or readable banners.
- Post-processing: Sharp attention crop to 1920x1080, WebP quality 84, effort 6, smart subsample
- SHA-256: `6185E88D05F810ADBFBF9A85AD74BEC92A20AF8ED331C5518B001724CC1E39B6`

### chapters/level-03/shot-03-shadow-at-wall.webp

- Model: OpenAI image-2, built-in image generation
- Generated: 2026-07-10; regenerated after visual QA for stronger atmospheric evidence
- Dimensions: 1920x1080
- Final prompt: Show the intact forest-city wall at deep dusk as treetops beyond it bend in sequence and an enormous soft, low-contrast shadow crosses the far forest. Keep the dry channels, old watchtowers, last reservoir glimmer, muted beacons, and reference-aligned elevated panorama. The shadow is only atmospheric evidence, never a giant silhouette; preserve a calm dark center and lower-left for the handoff to the board. No attack pose, monster reveal, fire, weapons, or combat units.
- Post-processing: Sharp attention crop to 1920x1080, WebP quality 84, effort 6, smart subsample
- SHA-256: `5734CA823634AF93F6E62ED3D850624715E740A83D3BE5C8492DC0D96CD5DD45`

### chapters/level-04/shot-01-forgotten-table.webp

- Model: OpenAI image-2, built-in image generation
- Generated: 2026-07-10; regenerated after visual QA to preserve table placement and copy space
- Dimensions: 1920x1080
- Final prompt: Show the silent divided border before dense fog arrives. Two exhausted camps remain at the far left and right edges, while one small abandoned negotiation table sits off-center near 62 percent of the frame width and 58 percent of its height. Preserve the blocked gate, shallow trenches, road markers, muted plum and rust banners without emblems, and cold charcoal dawn. Keep the table complete, the lower-left clear, and the mood mournfully suspended; no soldiers as focal subjects, battle, weapons, or real flags.
- Post-processing: Sharp attention crop to 1920x1080, WebP quality 84, effort 6, smart subsample
- SHA-256: `4104B38400343D4560BBBB0913C9E4B645182D1648514ACB827E5BF02F8598E9`

### chapters/level-04/shot-02-road-in-fog.webp

- Model: OpenAI image-2, built-in image generation
- Generated: 2026-07-10; regenerated after visual QA to retain one continuous table and landscape
- Dimensions: 1920x1080
- Final prompt: Return to the exact same divided-border camera and geography as slow fog swallows the road, markers, gate, and the same single table in the same position. The table is now half-submerged in fog but remains recognizable; never duplicate it. Let the opposing edge camps fade out of sight while isolated watch fires persist. Keep the lower-left a quiet dark-gray text field and retain the matte low-poly gouache language. No ghosts, runes, charging soldiers, bright red, or attack spectacle.
- Post-processing: Sharp attention crop to 1920x1080, WebP quality 84, effort 6, smart subsample
- SHA-256: `E14B7C72BF65AFC3C0BF93543B463A7EE250E165260F67D89F434B86B682D3F3`

### chapters/level-04/shot-03-two-lanterns.webp

- Model: OpenAI image-2, built-in image generation
- Generated: 2026-07-10
- Dimensions: 1920x1080
- Final prompt: Show the fully fogged border immediately before play, with the opposing camps barely visible, road markers submerged, the blocked gate distant, and only two tiny antique-gold lanterns at opposite ends of the vanished road. Make the broad gap between the lights the subject and leave the center and lower-left calm for copy and the board transition. Preserve the same camps, gate, fog layers, charcoal palette and low-poly gouache finish; no handshake, central character, readable flag, battle, or portal.
- Post-processing: Sharp attention crop to 1920x1080, WebP quality 84, effort 6, smart subsample
- SHA-256: `84F67BA737F8F444B4B424BA251AB1FF9EE3980F57DC3C34D7079DBFB45D1318`

### chapters/level-05/shot-01-names-fade.webp

- Model: OpenAI image-2, built-in image generation
- Generated: 2026-07-10
- Dimensions: 1920x1080
- Final prompt: Show the first signs of a memory plague in the same misty village. Familiar homes remain intact, but blank plaques, path stones, and household markers begin losing their distinctions; small paper-like fragments contain no marks. Preserve the mirrored pools, memory stones, small distant sacred tree, moonless blue-black palette, muted jade, pale ivory, antique gold, and restrained lavender cracks. Keep the lower-left and top quiet; no readable text, runes, faces in fog, ghosts, or saturated magic.
- Post-processing: Sharp attention crop to 1920x1080, WebP quality 84, effort 6, smart subsample
- SHA-256: `4260B6134FB7AC777803B2CF6AA4DF532C8BB02AA48EB61D48F03C12DE0482E7`

### chapters/level-05/shot-02-paths-repeat.webp

- Model: OpenAI image-2, built-in image generation
- Generated: 2026-07-10
- Dimensions: 1920x1080
- Final prompt: Deepen the memory plague in the exact same village: paths repeat imperfectly, two rooflines echo in the wrong places, mirrored pools reflect fragments of yesterday, memory stones shift, and the sacred tree dims behind fog. The real geography must remain perceptible under delicate distortion rather than becoming a collage. Confine repetitions mainly to the middle and right edges, leaving the lower-left dark and readable. No symbols, glowing runes, faces, ghosts, kaleidoscope effects, or psychedelic saturation.
- Post-processing: Sharp attention crop to 1920x1080, WebP quality 84, effort 6, smart subsample
- SHA-256: `0D55AA7578DDFA2EFCC3D730E43734828A46CDD89F102789F71AA1CE0CF6480C`

### chapters/level-05/shot-03-tree-remains.webp

- Model: OpenAI image-2, built-in image generation
- Generated: 2026-07-10
- Dimensions: 1920x1080
- Final prompt: Show the immediate pre-board village with most of the settlement dissolved into quiet mist, subdued roofs at the edges, dark pools, sparse memory stones, and a few isolated lanterns oriented toward the one stable landmark: the small sacred tree on the far upper-left horizon. Keep its glow restrained and low-saturation, the top quarter dark, and the center and lower-left empty for a natural board dissolve. No giant tree, central glow, text, runes, ghosts, horror, or saturated aura.
- Post-processing: Sharp attention crop to 1920x1080, WebP quality 84, effort 6, smart subsample
- SHA-256: `37927A8475207785CDABC7150653D43CFE95217084C94BFCEB67A54F0EC90A0F`

### chapters/level-06/shot-01-worlds-return.webp

- Model: OpenAI image-2, built-in image generation
- Generated: 2026-07-10
- Dimensions: 1920x1080
- Final prompt: In one coherent final landscape, let five remembered worlds begin to reappear around a shared horizon: flooded roofs, a dark quarry mouth and lamp trail, a forest wall, two faded border camps, and the small sacred tree. Keep every fragment peripheral and naturally joined by the same perspective, fog, matte materials and low-poly gouache treatment, leaning subtly toward a thin muted-violet crack. Preserve a broad dark center and lower-left; no collage, bright portal, giant tree, hero, or gameplay units.
- Post-processing: Sharp attention crop to 1920x1080, WebP quality 84, effort 6, smart subsample
- SHA-256: `E7B4B74A94659A69C075B4C997EF3C8FFA43E3BBB3D31724E8E30F792A796015`

### chapters/level-06/shot-02-rift-demands.webp

- Model: OpenAI image-2, built-in image generation
- Generated: 2026-07-10
- Dimensions: 1920x1080
- Final prompt: Show the same unified final world under subtle spatial pressure. Water, fog, dry channels and scattered lamps from the five peripheral landscapes angle slightly toward the restrained horizon crack, making it feel like a demand for one final answer. The flooded edge, quarry shadow, forest wall, camps and sacred-tree glow remain recognizable and low-contrast at the perimeter; the rift stays narrow and dim. No vortex, saturated purple, boss, aircraft, hero, explosion, or destruction montage.
- Post-processing: Sharp attention crop to 1920x1080, WebP quality 84, effort 6, smart subsample
- SHA-256: `B454EB1AA2BC773CAB8AF24213D366AD3BA47225C889FC5720362B68E7173E7C`

### chapters/level-06/shot-03-before-seventh-day.webp

- Model: OpenAI image-2, built-in image generation
- Generated: 2026-07-10
- Dimensions: 1920x1080
- Final prompt: Show the whole remembered world waiting in pre-dawn darkness immediately before the board appears. All five peripheral landscapes are stable, the narrow low-brightness rift is quiet but unresolved, sparse gold and jade lights remain, and a faint cold horizon suggests the seventh day is near. Keep the broad foreground, center, lower-left and top quarter dark and uncluttered so the image can collapse like a painted scroll. No sunrise celebration, total destruction, portal spectacle, hero, boss, aircraft, text, or UI.
- Post-processing: Sharp attention crop to 1920x1080, WebP quality 84, effort 6, smart subsample
- SHA-256: `B80B97025062E9BA0E88EFA1FD918711AA1A1FAFBA8AF4CC899E147DEC565742`

## Image-2 tactical board surfaces

All six files below were generated with OpenAI image-2 built-in image generation on 2026-07-11, then converted from the 1254×1254 PNG output to WebP quality 86, method 6. Shared prompt constraints: premium painterly low-poly gouache miniature-diorama surface; exact square orthographic top-down camera; calm playable center; subdued light without baked hard shadows; terrain only; no grid, cell circles, hexes, raised pads, characters, buildings, arrows, labels, text, UI, frame, watermark or saturated fantasy effects. The supplied gameplay screenshot was used as the composition and palette reference for the first surface; each following surface used the previous approved generated surface as its style reference.

### board-surfaces/flood-village-image2.webp

- Final prompt subject: flooded-village ground with weathered timber, packed wet earth, shallow slate-teal water, mud banks, restrained ripples, reeds, driftwood, faint paths and worn placement traces.
- SHA-256: `8B55772AF2641B028708433519374DCAA6072D7CA63659172CFE9111E012757B`

### board-surfaces/night-mine-image2.webp

- Final prompt subject: night quarry with fractured graphite stone, excavated shelves, muted ore veins, sparse timber sleepers, worn rail traces, rubble and dusty seams.
- SHA-256: `0041ED16C2996BF1AFC4279B19E91930A5C824E8F9703A4233455FEB373F65C9`

### board-surfaces/giant-city-image2.webp

- Final prompt subject: ancient forest-stone court with mossy flagstones, dark soil, broad roots, leaf litter, jade moss, broken courtyard traces and perimeter forest texture.
- SHA-256: `53373B54DFEA413FCAD01C7CF1158E681021B6CDDBB219578D07998759BC7005`

### board-surfaces/wordless-war-image2.webp

- Final prompt subject: gray-brown no-man's-land with compacted earth, worn diagonal roads, shallow trench scars, slate fragments and muted plum-gray soil variation.
- SHA-256: `9BADA227C660B6FADD555B3040FE5DCE1D3313CEA439AC91ECBF3D863BFDC507`

### board-surfaces/memory-plague-image2.webp

- Final prompt subject: memory-plague ground with desaturated blue-green stone, damp earth, mist stains, dark mirror pools, incomplete repeated paths, blank fragments and restrained lavender fissures.
- SHA-256: `AF4B97F593146EC48F1D77B3BB89D12920E5C7E88C8F85E3DF51E09807FEE3FA`

### board-surfaces/final-exam-image2.webp

- Final prompt subject: final convergence ground fusing flooded channels, graphite seams, mossy roots, road scars and mirror-pool stains into dark violet-gray terrain with restrained fissures and no portal.
- SHA-256: `F5CAC6EADF1A30CA1F8C3FB2ED59FEE9359F794C36AABEAAF90B17BA33C0BB92`

## Image-2 multi-timeline ending CGs

All 30 files below were generated with OpenAI image-2 built-in image generation on 2026-07-11. `cg-ending.webp` was supplied as the actual style and palette reference. Each source PNG was converted with Sharp to 1920x1080 WebP, quality 82, effort 5. Shared constraints: cinematic painterly low-poly faceted matte painting; deep blue-black, muted jade, antique gold and faint purple fractures; main detail on the right with dark text space on the left; no embedded text, UI, logo, watermark, identifiable hero or specific player creation.

- `timeline-ending/01-false-ending.webp` — apparently complete healed world with one doubled star.
- `timeline-ending/02-record-anomaly.webp` — duplicated shadows and a subtle causal misregistration.
- `timeline-ending/03-city-pullback.webp` — repaired city shrinking into a larger record.
- `timeline-ending/04-map-pullback.webp` — six remembered regions on one floating atlas.
- `timeline-ending/05-world-shard.webp` — the whole world reduced to one causal shard.
- `timeline-ending/06-timeline-sea.webp` — one continuous line among countless broken records.
- `timeline-ending/07-flood-late.webp` — the safe route completed one turn too late.
- `timeline-ending/08-flood-salt.webp` — flood removed at the cost of dead salt fields.
- `timeline-ending/09-mine-dark.webp` — the mine record where every light failed.
- `timeline-ending/10-mine-followed.webp` — survivors leave while the darkness follows.
- `timeline-ending/11-beast-fallen.webp` — an intact city beside its fallen guardian.
- `timeline-ending/12-forest-withered.webp` — years of ecological loss after the guardian's death.
- `timeline-ending/13-war-missed.webp` — two diplomatic routes arrive too late.
- `timeline-ending/14-war-silence.webp` — peace without shared language or understanding.
- `timeline-ending/15-memory-empty.webp` — survivors isolated after relationships disappear.
- `timeline-ending/16-memory-overlap.webp` — too many adjacent memories occupying one world.
- `timeline-ending/17-final-collapse.webp` — remembered regions fail to stabilize before dawn.
- `timeline-ending/18-carrier-fall.webp` — the airspace carrier misses the last causal segment.
- `timeline-ending/19-truth-language.webp` — spoken possibility locating a matching world.
- `timeline-ending/20-truth-creation.webp` — useful form borrowed through overlapping worlds.
- `timeline-ending/21-truth-entropy.webp` — unstable records bleeding into a stable line.
- `timeline-ending/22-truth-airspace.webp` — the carrier navigating outside ordinary worlds.
- `timeline-ending/23-anchor-resident.webp` — one ordinary life repeated as a human anchor.
- `timeline-ending/24-anchor-creation.webp` — an unnamed faceted seed of possibility.
- `timeline-ending/25-anchor-oath.webp` — defenders and ember forming a cross-world ring.
- `timeline-ending/26-anchor-memory.webp` — failed routes preserved as an archive and map.
- `timeline-ending/27-anchor-sacrifice.webp` — an empty place remembered by a steady lantern.
- `timeline-ending/28-broadcast-first.webp` — the first neighboring record receives the anchor.
- `timeline-ending/29-broadcast-many.webp` — new possibilities lighting across many timelines.
- `timeline-ending/30-beyond-seventh-day.webp` — shared routes continuing toward a quiet dawn.
