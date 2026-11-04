/**
 * images.js — one place for every stock photo used on the site.
 *
 * Photos come from Unsplash (free to use, hotlinking allowed under the Unsplash licence).
 * To swap a photo, change its ID here — nothing else needs to be touched.
 * Find IDs on unsplash.com: the long part of an images.unsplash.com/photo-XXXX URL.
 *
 * Every <img> is rendered inside a `.photo` frame that has a soft gradient background,
 * so if a photo fails to load (offline, ID removed) the layout stays intact and the
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
};

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
        onload="this.classList.add('is-loaded')"
        onerror="this.remove()"
      />
    </figure>
  `;
}
