// Quiz questions, fourth bank (QZ4, 🎮 Game Studio 2, 19 Nov 2026): about 3500 more, written for Sidelit by subagents to
// one spec (settled facts, both languages, no film / series / game titles, nothing political, religious or about wars),
// checked for shape and duplicates. Every entry has a level; new kinds `k` (which came first, odd one out, guess the
// year) and four new categories (music, myths, inventions, puzzles). One file per category in `quiz-bank-4/`. Ids
// continue after the third bank in this fixed order: only ever append (to a category's file only while this bank is
// unreleased; afterwards add a fifth bank).

import type { QuizEntry } from './quiz-questions.ts';
import { Q4_GENERAL } from './quiz-bank-4/general.ts';
import { Q4_GEOGRAPHY } from './quiz-bank-4/geography.ts';
import { Q4_SCIENCE } from './quiz-bank-4/science.ts';
import { Q4_SPACE } from './quiz-bank-4/space.ts';
import { Q4_NATURE } from './quiz-bank-4/nature.ts';
import { Q4_HISTORY } from './quiz-bank-4/history.ts';
import { Q4_SPORTS } from './quiz-bank-4/sports.ts';
import { Q4_FOOD } from './quiz-bank-4/food.ts';
import { Q4_ARTS } from './quiz-bank-4/arts.ts';
import { Q4_MATH } from './quiz-bank-4/math.ts';
import { Q4_TECH } from './quiz-bank-4/tech.ts';
import { Q4_LANGUAGE } from './quiz-bank-4/language.ts';
import { Q4_BODY } from './quiz-bank-4/body.ts';
import { Q4_WORLD } from './quiz-bank-4/world.ts';
import { Q4_MUSIC } from './quiz-bank-4/music.ts';
import { Q4_MYTHS } from './quiz-bank-4/myths.ts';
import { Q4_INVENTIONS } from './quiz-bank-4/inventions.ts';
import { Q4_PUZZLES } from './quiz-bank-4/puzzles.ts';

export const QUIZ_BANK_4: readonly QuizEntry[] = [
  ...Q4_GENERAL,
  ...Q4_GEOGRAPHY,
  ...Q4_SCIENCE,
  ...Q4_SPACE,
  ...Q4_NATURE,
  ...Q4_HISTORY,
  ...Q4_SPORTS,
  ...Q4_FOOD,
  ...Q4_ARTS,
  ...Q4_MATH,
  ...Q4_TECH,
  ...Q4_LANGUAGE,
  ...Q4_BODY,
  ...Q4_WORLD,
  ...Q4_MUSIC,
  ...Q4_MYTHS,
  ...Q4_INVENTIONS,
  ...Q4_PUZZLES,
];
