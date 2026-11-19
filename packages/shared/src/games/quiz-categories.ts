// Quiz categories, apart from the question bank so the browser can name them without downloading the bank (QZ4).
// QZ2 (15 Nov 2026) added `language`, `body`, `world`; QZ4 (19 Nov 2026) `music`, `myths`, `inventions`, `puzzles`.
export const QUIZ_CATEGORIES = ['general', 'geography', 'science', 'space', 'nature', 'history', 'sports', 'food', 'arts', 'math', 'tech', 'language', 'body', 'world', 'music', 'myths', 'inventions', 'puzzles'] as const;

export type QuizCategory = (typeof QUIZ_CATEGORIES)[number];
