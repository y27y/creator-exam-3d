const ART_ROOT = './assets/art/timeline-ending';

export const TIMELINE_ENDING_ART = Object.freeze({
  falseEnding: `${ART_ROOT}/01-false-ending.webp`,
  recordAnomaly: `${ART_ROOT}/02-record-anomaly.webp`,
  cityPullback: `${ART_ROOT}/03-city-pullback.webp`,
  mapPullback: `${ART_ROOT}/04-map-pullback.webp`,
  worldShard: `${ART_ROOT}/05-world-shard.webp`,
  timelineSea: `${ART_ROOT}/06-timeline-sea.webp`,
  echoes: Object.freeze({
    'flood-village': [`${ART_ROOT}/07-flood-late.webp`, `${ART_ROOT}/08-flood-salt.webp`],
    'night-mine': [`${ART_ROOT}/09-mine-dark.webp`, `${ART_ROOT}/10-mine-followed.webp`],
    'giant-city': [`${ART_ROOT}/11-beast-fallen.webp`, `${ART_ROOT}/12-forest-withered.webp`],
    'wordless-war': [`${ART_ROOT}/13-war-missed.webp`, `${ART_ROOT}/14-war-silence.webp`],
    'memory-plague': [`${ART_ROOT}/15-memory-empty.webp`, `${ART_ROOT}/16-memory-overlap.webp`],
    'final-exam': [`${ART_ROOT}/17-final-collapse.webp`, `${ART_ROOT}/18-carrier-fall.webp`]
  }),
  truthLanguage: `${ART_ROOT}/19-truth-language.webp`,
  truthCreation: `${ART_ROOT}/20-truth-creation.webp`,
  truthEntropy: `${ART_ROOT}/21-truth-entropy.webp`,
  truthAirspace: `${ART_ROOT}/22-truth-airspace.webp`,
  anchors: Object.freeze({
    resident: `${ART_ROOT}/23-anchor-resident.webp`,
    creation: `${ART_ROOT}/24-anchor-creation.webp`,
    oath: `${ART_ROOT}/25-anchor-oath.webp`,
    memory: `${ART_ROOT}/26-anchor-memory.webp`,
    sacrifice: `${ART_ROOT}/27-anchor-sacrifice.webp`
  }),
  broadcastFirst: `${ART_ROOT}/28-broadcast-first.webp`,
  broadcastMany: `${ART_ROOT}/29-broadcast-many.webp`,
  beyondSeventhDay: `${ART_ROOT}/30-beyond-seventh-day.webp`
});

export const TIMELINE_ENDING_ASSETS = Object.freeze([
  TIMELINE_ENDING_ART.falseEnding,
  TIMELINE_ENDING_ART.recordAnomaly,
  TIMELINE_ENDING_ART.cityPullback,
  TIMELINE_ENDING_ART.mapPullback,
  TIMELINE_ENDING_ART.worldShard,
  TIMELINE_ENDING_ART.timelineSea,
  ...Object.values(TIMELINE_ENDING_ART.echoes).flat(),
  TIMELINE_ENDING_ART.truthLanguage,
  TIMELINE_ENDING_ART.truthCreation,
  TIMELINE_ENDING_ART.truthEntropy,
  TIMELINE_ENDING_ART.truthAirspace,
  ...Object.values(TIMELINE_ENDING_ART.anchors),
  TIMELINE_ENDING_ART.broadcastFirst,
  TIMELINE_ENDING_ART.broadcastMany,
  TIMELINE_ENDING_ART.beyondSeventhDay
]);
