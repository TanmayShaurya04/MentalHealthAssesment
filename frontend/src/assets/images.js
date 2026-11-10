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

const PHOTOS = {
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

  // One photo per resource (keys match the `image` field in backend/data/resources.json).
  r_exam: { id: '1434030216411-0b793f4b4173', alt: 'A desk with notes and books for studying', pos: 'center' },
  r_sleep: { id: '1505693416388-ac5ce068fe85', alt: 'A calm, quiet bedroom', pos: 'center' },
  r_lost: { id: '1470071459604-3b5ec3a7fe05', alt: 'A misty path through trees', pos: 'center' },
  r_helpline: { id: '1469571486292-0ba58a3f068b', alt: 'Hands held in support', pos: 'center' },
  r_deadlines: { id: '1484480974693-6ca0a78fb36b', alt: 'A planner and pen on a desk', pos: 'center' },
  r_studysession: { id: '1456513080510-7bf3a84b82f8', alt: 'Books and a notebook ready for a study session', pos: 'center' },
  r_perfect: { id: '1513364776144-60967b0f800f', alt: 'Paint and brushes on a creative table', pos: 'center' },
  r_professor: { id: '1524178232363-1fb2b075b655', alt: 'A lecture room with students and a teacher', pos: 'center' },
  r_nerves: { id: '1503676260728-1c00da094a0b', alt: 'A student concentrating on a page', pos: 'center' },
  r_winddown: { id: '1495474472287-4d71bcdd2085', alt: 'A warm drink on a quiet evening', pos: 'center' },
  r_rest: { id: '1472214103451-9374bd1c798e', alt: 'A peaceful open landscape', pos: 'center' },
  r_allnighter: { id: '1531353826977-0941b4779a1c', alt: 'A quiet night sky', pos: 'center' },
  r_compare: { id: '1527137342181-19aab11a8ee8', alt: 'A person looking thoughtfully out of a window', pos: 'center' },
  r_mixed: { id: '1493836512294-502baa1986e2', alt: 'Rain on a window', pos: 'center' },
  r_ground: { id: '1518837695005-2083093ee35b', alt: 'Ocean waves rolling in', pos: 'center' },
  r_homesick: { id: '1436491865332-7a61a109cc05', alt: 'A view from an aeroplane window', pos: 'center' },
  r_boundary: { id: '1517486808906-6ca8b3f04846', alt: 'Friends talking together', pos: 'center' },
  r_campus: { id: '1541339907198-e08756dedf3f', alt: 'A university building on a sunny day', pos: 'center' },
  r_motivation: { id: '1476480862126-209bfaa8edc8', alt: 'A runner heading out at dawn', pos: 'center' },
  r_friend: { id: '1529156069898-49953e39b3ac', alt: 'Friends embracing outdoors', pos: 'center' },
  r_makefriends: { id: '1511988617509-a57c8a288659', alt: 'A group of friends gathered together', pos: 'center' },
  r_parents: { id: '1511895426328-dc8714191300', alt: 'A family sitting together', pos: 'center' },
  r_groupwork: { id: '1522071820081-009f0129c71c', alt: 'Teammates working around laptops', pos: 'center' },
  r_longdistance: { id: '1516321497487-e288fb19713f', alt: 'A video call on a laptop', pos: 'center' },
  r_walks: { id: '1551632811-561732d1e306', alt: 'A walker on a trail', pos: 'center' },
  r_eating: { id: '1490645935967-10de6ba17061', alt: 'A fresh, healthy meal', pos: 'center' },
  r_screens: { id: '1511707171634-5f897ff02aa9', alt: 'A phone on a table', pos: 'center' },
  r_stretch: { id: '1518611012118-696072aa579a', alt: 'A person stretching', pos: 'center' },
  r_doomscroll: { id: '1512941937669-90a1b58e7e9c', alt: 'A hand holding a phone', pos: 'center' },
  r_impostor: { id: '1507003211169-0a1dd7228f2d', alt: 'A thoughtful portrait', pos: 'center' },
  r_money: { id: '1554224155-6726b3ff858f', alt: 'A calculator and notes for budgeting', pos: 'center' },
  r_procrastinate: { id: '1501504905252-473c47e087f8', alt: 'A laptop and notebook on a desk', pos: 'center' },
  r_music: { id: '1511379938547-c1f69419868d', alt: 'Headphones resting on a table', pos: 'center' },
  r_fivemin: { id: '1517842645767-c639042777db', alt: 'An open notebook and pen', pos: 'center' },

  // Cloudy-sky photos for the landing "emotional weather" section.
  sky1: { id: '1534088568595-a066f410bcda', alt: 'Heavy grey clouds', pos: 'center' },
  sky2: { id: '1483977399921-6cf94f6fdc3a', alt: 'Fog resting over a hillside', pos: 'center' },
  sky3: { id: '1500740516770-92bd004b996e', alt: 'Storm clouds gathering', pos: 'center' },
  sky4: { id: '1419833173245-f59e1b93f9ee', alt: 'A soft overcast sky', pos: 'center' },
  sky5: { id: '1501630834273-4b5604d2ee31', alt: 'Light breaking through clouds', pos: 'center' },
  sky6: { id: '1504608524841-42fe6f032b4b', alt: 'Blue sky with white clouds', pos: 'center' },
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
