const CONSUME_LIGHT_DISPLAY_NAME = '噬光黑核';

export function normalizeCreationDisplayText(text) {
  return String(text || '').replace(/噬光之灯/g, CONSUME_LIGHT_DISPLAY_NAME);
}

export function normalizeCreationName(cardOrName, fallback = '未命名造物') {
  const source = cardOrName && typeof cardOrName === 'object' ? cardOrName : null;
  const card = source?.card && typeof source.card === 'object' ? source.card : source;
  const ability = card?.ability || source?.ability || '';
  const rawName = typeof cardOrName === 'string'
    ? cardOrName
    : card?.name || card?.creationName || source?.creationName;

  if (ability === 'consume_light') return CONSUME_LIGHT_DISPLAY_NAME;
  return normalizeCreationDisplayText(rawName || fallback);
}
