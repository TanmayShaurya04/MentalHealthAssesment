/**
 * images.js — one place for every stock photo used on the site.
 *
 * Photos come from Unsplash (free to use, hotlinking allowed under the Unsplash licence).
 * To swap a photo, change its ID here — nothing else needs to be touched.
 * Find IDs on unsplash.com: the long part of an images.unsplash.com/photo-XXXX URL.
 *
 * Every <img> is rendered inside a `.photo` frame that has a soft gradient background,
 * (main.js removes broken images and fades loaded ones in), so if a photo fails to load (offline, ID removed) the layout stays intact and the
 * frame simply shows the gradient.
 */

const unsplash = (id, w = 1200) =>
  `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=${w}&q=70`;

export const PHOTOS = {
  // id = Unsplash photo id, alt = description for screen readers, pos = CSS object-position
  sunrise:    { id: '1470252649378-9c29740c9fa8', alt: 'Soft sunrise over a quiet field of flowers', pos: 'center 60%' },
  meditation: { id: '1506126613408-eca07ce68773', alt: 'A person meditating on a rock at sunset', pos: 'center 40%' },
  students:   { id: '1523240795612-9a054b0db644', alt: 'Students sitting together outdoors on campus', pos: 'center 35%' },
  studying:   { id: '1522202176988-66273c2fd55f', alt: 'Friends studying together at a table', pos: 'center 40%' },
  journal:    { id: '1455390582262-044cdead277a', alt: 'Hand writing in a journal with a pen', pos: 'center' },
  walk:       { id: '1499209974431-9dddcece7f88', alt: 'A person walking through a sunlit field', pos: 'center 45%' },
  support:    { id: '1488521787991-ed7bbaae773c', alt: 'Two people supporting each other', pos: 'center 30%' },
  dusk:       { id: '1490730141103-6cac27aaab94', alt: 'A calm sky at dusk', pos: 'center 55%' },
  // More scenes (resources, carousels). If one ever fails to load, the gradient frame shows instead.
  forest:     { id: '1441974231531-c6227db76b6e', alt: 'Sunlight through a green forest', pos: 'center' },
  ocean:      { id: '1505118380757-91f5f5632de0', alt: 'Calm ocean waves', pos: 'center' },
  mountains:  { id: '1469474968028-56623f02e42e', alt: 'Sunbeams over a mountain valley', pos: 'center 40%' },
  stars:      { id: '1419242902214-272b3f66ee7a', alt: 'A night sky full of stars', pos: 'center 40%' },
  beach:      { id: '1475924156734-496f6cac6ec1', alt: 'A quiet beach at sunset', pos: 'center 55%' },
  library:    { id: '1481627834876-b7833e8f5570', alt: 'Shelves of books in a quiet library', pos: 'center' },
  desk:       { id: '1488190211105-8b0e65b80b4e', alt: 'A tidy study desk with a laptop', pos: 'center' },
  yoga:       { id: '1544367567-0f2fcb009e0b', alt: 'A person stretching in a yoga pose', pos: 'center 40%' },
  running:    { id: '1476480862126-209bfaa8edc8', alt: 'A runner on a trail at dawn', pos: 'center 40%' },
  tea:        { id: '1544787219-7f47ccb76574', alt: 'A warm cup of tea', pos: 'center' },
  friends:    { id: '1529156069898-49953e39b3ac', alt: 'Friends laughing together outdoors', pos: 'center 35%' },
  notebook:   { id: '1517842645767-c639042777db', alt: 'An open notebook and pen', pos: 'center' },
  meal:       { id: '1490645935967-10de6ba17061', alt: 'A fresh healthy meal', pos: 'center' },
  field:      { id: '1500382017468-9049fed747ef', alt: 'A wide green field under open sky', pos: 'center 55%' },
};

/** Photos that rotate in the dashboard hero. */
export const HERO_POOL = ['sunrise', 'mountains', 'ocean', 'forest', 'beach', 'field'];

/** Photo used for each resource category (keys match resources.json `category`). */
export const RESOURCE_PHOTO = {
  study_stress: 'studying',
  sleep: 'dusk',
  emotional_balance: 'meditation',
  crisis: 'support',
};

/**
 * Returns the HTML for a framed photo.
 * @param {keyof typeof PHOTOS} key
 * @param {{w?: number, cls?: string, eager?: boolean}} opts
 */
/** Plain URL for a photo key (for CSS backgrounds / carousels). */
export function photoUrl(key, w = 1400) { return unsplash((PHOTOS[key] || PHOTOS.sunrise).id, w); }

export function photo(key, { w = 900, cls = '', eager = false } = {}) {
  const p = PHOTOS[key] || PHOTOS.sunrise;
  return `
    <figure class="photo ${cls}">
      <img
        src="${unsplash(p.id, w)}"
        srcset="${unsplash(p.id, Math.round(w / 2))} ${Math.round(w / 2)}w, ${unsplash(p.id, w)} ${w}w"
        sizes="(max-width: 700px) 100vw, ${w}px"
        alt="${p.alt}"
        style="object-position:${p.pos}"
        ${eager ? '' : 'loading="lazy"'}
        decoding="async"
      />
    </figure>
  `;
}
