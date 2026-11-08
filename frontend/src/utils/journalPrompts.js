/** Writing prompts for the journal. Warm, open and for everyone. */
export const PROMPTS = [
  { label: 'Brain dump', emoji: '🧠', tone: 'sky', text: 'Everything on my mind right now, in no particular order:' },
  { label: 'Small win', emoji: '🌱', tone: 'sage', text: 'One thing I handled today, however small, was…' },
  { label: 'Gratitude', emoji: '🙏', tone: 'sand', text: 'Three things I am grateful for today are…' },
  { label: 'What I need', emoji: '🫶', tone: 'rose', text: 'Something I need more of this week is…' },
  { label: 'Worry list', emoji: '☁️', tone: 'lilac', text: 'What is worrying me, and what part of it can I actually influence?' },
  { label: 'Future me', emoji: '✉️', tone: 'sky', text: 'Dear future me, right now I want you to know…' },
  { label: 'Proud of', emoji: '🌟', tone: 'sand', text: 'Something I am quietly proud of lately is…' },
  { label: 'Let it go', emoji: '🍃', tone: 'sage', text: 'Something I am ready to put down is…' },
  { label: 'Body check', emoji: '🧘', tone: 'rose', text: 'My body is telling me…' },
  { label: 'Tomorrow', emoji: '🌅', tone: 'lilac', text: 'One gentle thing I would like to do tomorrow is…' },
];

/** Same prompt all day, a different one tomorrow. */
export function promptOfTheDay() {
  const day = Math.floor(Date.now() / 86400000);
  return PROMPTS[day % PROMPTS.length];
}
