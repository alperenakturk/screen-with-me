// Quiz questions, fifth bank (QZ5, 21 Nov 2026): the earlier banks' true / false statements rewritten as four-option
// questions, closest-guess questions (`k: 'guess'`, a number `n`) for every category, and three new categories
// (`screen` film and TV without any title, `games`, `travel`). Written for Sidelit by subagents to one spec, checked for
// shape and duplicates. One file per part in `quiz-bank-5/`. Ids continue after the fourth bank in this fixed order:
// only ever append (to a part's file only while this bank is unreleased; afterwards add a sixth bank).

import type { QuizEntry } from './quiz-questions.ts';
import { Q5_CONVERTED_1 } from './quiz-bank-5/converted-1.ts';
import { Q5_CONVERTED_2 } from './quiz-bank-5/converted-2.ts';
import { Q5_CONVERTED_3 } from './quiz-bank-5/converted-3.ts';
import { Q5_GUESS } from './quiz-bank-5/guess.ts';
import { Q5_SCREEN } from './quiz-bank-5/screen.ts';
import { Q5_GAMES } from './quiz-bank-5/games.ts';
import { Q5_TRAVEL } from './quiz-bank-5/travel.ts';

export const QUIZ_BANK_5: readonly QuizEntry[] = [
  ...Q5_CONVERTED_1,
  ...Q5_CONVERTED_2,
  ...Q5_CONVERTED_3,
  ...Q5_GUESS,
  ...Q5_SCREEN,
  ...Q5_GAMES,
  ...Q5_TRAVEL,
];
