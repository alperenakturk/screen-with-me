#!/usr/bin/env python3
"""Builds the Five Frames word lists (card GMP, Game Studio, 15 Nov 2026).

    python3 scripts/words/build-words.py [--cache DIR] [--lang en|tr|all]

Downloads the sources into DIR (default: a cache folder outside the repo; nothing raw is committed), then writes
packages/shared/src/games/words/<lang>.ts: every allowed guess glued together, the answers as base-36 positions.

Sources and licences (also in apps/web/public/third-party-notices.txt and docs/internal/research/word-game.md):
- ENABLE (public domain): english guesses.
- SCOWL 2020.12.07, Copyright 2000-2018 by Kevin Atkinson (permissive licence, notice kept): english guesses (size <= 80)
  and the english answer candidates (size <= 35).
- Zemberek master dictionary (Apache 2.0, Ahmet A. Akın and contributors): turkish lemmas with their sound-change
  marks; the guesses are the five-letter lemmas and the five-letter forms we make from them below (plural, cases,
  possessives, a few verb forms), the answer candidates are the lemmas only.
- LDNOOBW (CC BY 4.0, Shutterstock): the bad-word filter for answers.
- FrequencyWords (OpenSubtitles 2018, Hermit Dave, content CC BY-SA 4.0): used **only here, offline, as a filter** (card
  FW1, "real words only"): a guess must be seen at least GUESS_SEEN times in the subtitles, a general answer at least
  ANSWER_SEEN times, a category word CATEGORY_SEEN times (or be in `<lang>-keep.txt`). Nothing of it is shipped: no counts, no ranks, no word that is not in
  the dictionaries above. FW2: two more thresholds sort each answer into a level band (BANDS); only the band ships.
- GeoNames (CC BY 4.0, via datasets/world-cities): where the FW2 city picks in `<lang>-cat-cities.txt` came from.
Category lists (`<lang>-cat-<id>.txt`, hand-written, card FW1) become CATEGORIES in the same module: every word of a
category is an answer of that category and an allowed guess while playing it.

    python3 scripts/words/build-words.py --check

rebuilds everything in memory and fails when the shipped modules differ from it or a list breaks a rule (a non-word
answer, a short category, a category word that is never seen in the subtitles, a blocked word).
Answers keep every answer shipped before (`<lang>-answers-v1.txt`) and add our own picks; `<lang>-extra.txt` adds words
by hand, `<lang>-exclude.txt` removes them (the eye review).
"""

import argparse
import glob
import os
import re
import tarfile
import urllib.request

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.normpath(os.path.join(HERE, '..', '..'))
OUT = os.path.join(ROOT, 'packages', 'shared', 'src', 'games', 'words')

SOURCES = {
    'enable1.txt': 'https://raw.githubusercontent.com/dolph/dictionary/master/enable1.txt',
    'scowl.tar.gz': 'https://downloads.sourceforge.net/wordlist/scowl-2020.12.07.tar.gz',
    'zemberek.dict': 'https://raw.githubusercontent.com/ahmetaa/zemberek-nlp/master/morphology/src/main/resources/tr/master-dictionary.dict',
    'ldnoobw-en.txt': 'https://raw.githubusercontent.com/LDNOOBW/List-of-Dirty-Naughty-Obscene-and-Otherwise-Bad-Words/master/en',
    'ldnoobw-tr.txt': 'https://raw.githubusercontent.com/LDNOOBW/List-of-Dirty-Naughty-Obscene-and-Otherwise-Bad-Words/master/tr',
    'freq-en.txt': 'https://raw.githubusercontent.com/hermitdave/FrequencyWords/master/content/2018/en/en_full.txt',
    'freq-tr.txt': 'https://raw.githubusercontent.com/hermitdave/FrequencyWords/master/content/2018/tr/tr_full.txt',
}

# How often a word must appear in the subtitles (FrequencyWords, hundreds of millions of words) to count as a real,
# living word: a guess, a general answer, a category word.
GUESS_SEEN = 5
ANSWER_SEEN = 20
CATEGORY_SEEN = 3
# The categories, in the order the game lists them. Each needs at least this many words (three weeks of daily play).
CATEGORY_IDS = ['countries', 'cities', 'animals', 'food', 'jobs', 'nature', 'home']
CATEGORY_MIN = 21
# FW2 (owner: Easy / Medium / Hard / Mixed): every answer gets a band from two thresholds on how often the subtitles use
# it: 1 = common (at least EASY_SEEN), 2 = known (at least KNOWN_SEEN, or kept by hand), 3 = rare. Easy plays band 1,
# Medium 1-2, Hard 2-3, Mixed all. Only the band ships (no counts, no ranks), like the yes / no filter above. A category
# is short, so its words are split by their order instead: the most used half band 1, the next 30 % band 2, the rest 3.
BAND_SEEN = {'en': (3000, 400), 'tr': (1200, 180)}
CHECK = {'on': False, 'problems': []}


def fetch(cache, name):
    path = os.path.join(cache, name)
    if not os.path.exists(path):
        print(f'downloading {SOURCES[name]}')
        urllib.request.urlretrieve(SOURCES[name], path)
    return path


def listed(name):
    """Words in one of our hand-kept files (`#` starts a comment)."""
    path = os.path.join(HERE, name)
    if not os.path.exists(path):
        return []
    words = []
    for line in open(path, encoding='utf-8'):
        line = line.split('#', 1)[0]
        words += line.split()
    return words


def seen(cache, lang):
    """Five-letter words and how often the subtitles use them (all letter cases added up)."""
    counts = {}
    for line in open(fetch(cache, f'freq-{lang}.txt'), encoding='utf-8'):
        parts = line.split()
        if len(parts) != 2 or len(parts[0]) != 5:
            continue
        w = tr_lower(parts[0]) if lang == 'tr' else parts[0].lower()
        counts[w] = counts.get(w, 0) + int(parts[1])
    return counts


def categories(lang, counts, bad, alphabet, keep):
    """The hand-written category lists, checked: five letters of the alphabet, no repeats, seen, not blocked."""
    out = {}
    for cat in CATEGORY_IDS:
        words = listed(f'{lang}-cat-{cat}.txt')
        problems = [w for w in words if len(w) != 5 or not set(w) <= alphabet]
        problems += [w for w in words if counts.get(w, 0) < CATEGORY_SEEN and w not in keep]
        problems += [w for w in words if w in bad]
        problems += sorted({w for w in words if words.count(w) > 1})
        if problems:
            problem(f'{lang} category {cat}: {" ".join(problems)}')
        if len(set(words)) < CATEGORY_MIN:
            problem(f'{lang} category {cat}: {len(set(words))} words, needs {CATEGORY_MIN}')
        out[cat] = sorted(set(words))
    return out


def band(lang, counts, keep, w):
    easy, known = BAND_SEEN[lang]
    n = counts.get(w, 0)
    return '1' if n >= easy else '2' if n >= known or w in keep else '3'


def category_bands(cats, counts):
    """FW2: per category, a band per word in the category's (sorted) order: by use, half / 30 % / the rest."""
    out = {}
    for cat, words in cats.items():
        order = sorted(words, key=lambda w: (-counts.get(w, 0), w))
        rank = {w: i for i, w in enumerate(order)}
        n = len(words)
        out[cat] = ''.join('1' if rank[w] < n * 0.5 else '2' if rank[w] < n * 0.8 else '3' for w in words)
    return out


def problem(text):
    CHECK['problems'].append(text)
    print(f'PROBLEM: {text}')


def write(lang, guesses, answers, header, cats, bands, cat_bands):
    words = sorted(set(guesses) | set(answers))
    index = {w: i for i, w in enumerate(words)}
    answers = sorted(set(answers), key=lambda w: index[w])
    packed = ''.join(words)
    positions = ','.join(base36(index[w]) for w in answers)
    path = os.path.join(OUT, f'{lang}.ts')
    with opened(path) as f:
        f.write(header.format(guesses=f'{len(words)}', answers=f'{len(answers)}'))
        f.write('\n/** Every allowed guess, five letters each, one after another. */\n')
        f.write(f"export const WORDS = '{packed}';\n\n")
        f.write('/** The answers: positions in WORDS, base 36, comma-separated (not plain text, so the list is no spoiler). */\n')
        f.write(f"export const ANSWERS = '{positions}';\n\n")
        f.write('/** FW2: each answer\'s level band, in ANSWERS order: 1 common, 2 known, 3 rare (Easy 1, Medium 1-2, Hard 2-3). */\n')
        f.write(f"export const BANDS = '{''.join(bands[w] for w in answers)}';\n\n")
        f.write('/**\n * The categories (card FW1): five-letter words glued together, per category. A category\'s words are its answers\n')
        f.write(' * and, while playing it, allowed guesses too (country and city names are not in WORDS).\n */\n')
        f.write('export const CATEGORIES: Record<string, string> = {\n')
        for cat in CATEGORY_IDS:
            f.write(f"  {cat}: '{''.join(cats[cat])}',\n")
        f.write('};\n\n')
        f.write('/** FW2: each category word\'s level band, in its category\'s order (as BANDS). */\n')
        f.write('export const CATEGORY_BANDS: Record<string, string> = {\n')
        for cat in CATEGORY_IDS:
            f.write(f"  {cat}: '{cat_bands[cat]}',\n")
        f.write('};\n')
    print(f'{lang}: {len(words)} guesses, {len(answers)} answers, {sum(len(v) for v in cats.values())} category words -> {os.path.relpath(path, ROOT)}')


class opened:
    """Writes a module, or with --check compares the text with the shipped one."""

    def __init__(self, path):
        self.path, self.parts = path, []

    def __enter__(self):
        return self

    def write(self, text):
        self.parts.append(text)

    def __exit__(self, *exc):
        text = ''.join(self.parts)
        if CHECK['on']:
            old = open(self.path, encoding='utf-8').read() if os.path.exists(self.path) else ''
            if old != text:
                problem(f'{os.path.relpath(self.path, ROOT)} is not what the lists build (run build-words.py)')
        else:
            with open(self.path, 'w', encoding='utf-8') as f:
                f.write(text)


def base36(n):
    digits = '0123456789abcdefghijklmnopqrstuvwxyz'
    s = ''
    while True:
        n, r = divmod(n, 36)
        s = digits[r] + s
        if n == 0:
            return s


def bad_words(cache, lang):
    return {line.strip().lower() for line in open(fetch(cache, f'ldnoobw-{lang}.txt'), encoding='utf-8') if line.strip()}


def write_blocked(cache):
    """Five-letter words no answer may be (LDNOOBW, CC BY 4.0, plus our eye review), for the unit test only."""
    out = {}
    for lang in ('en', 'tr'):
        words = {w for w in bad_words(cache, lang) if len(w) == 5 and ' ' not in w}
        words |= {w for w in listed(f'{lang}-exclude.txt') if len(w) == 5}
        out[lang] = sorted(words)
    path = os.path.join(OUT, 'blocked.ts')
    with opened(path) as f:
        f.write('// Five-letter words that must never be a Five Frames answer: the bad-word lists of LDNOOBW (CC BY 4.0, Shutterstock,\n')
        f.write('// see /third-party-notices.txt) and our eye review. Generated by scripts/words/build-words.py; used by the tests only.\n\n')
        for lang in ('en', 'tr'):
            f.write(f"export const BLOCKED_{lang.upper()} = '{','.join(out[lang])}';\n")
    print(f'blocked: en {len(out["en"])}, tr {len(out["tr"])} -> {os.path.relpath(path, ROOT)}')


def build_en(cache):
    enable = {w for w in open(fetch(cache, 'enable1.txt')).read().split() if re.fullmatch('[a-z]{5}', w)}
    scowl = os.path.join(cache, 'scowl-2020.12.07')
    if not os.path.isdir(scowl):
        with tarfile.open(fetch(cache, 'scowl.tar.gz')) as tar:
            tar.extractall(cache)
    level, lexicon, proper, guesses = {}, set(), set(), set()
    for path in glob.glob(os.path.join(scowl, 'final', '*')):
        name, _, size = os.path.basename(path).rpartition('.')
        if not size.isdigit():
            continue
        for w in open(path, encoding='latin-1').read().split('\n'):
            if 'proper' in name:
                proper.add(w.lower())
                continue
            if 'abbrev' in name or 'contraction' in name or int(size) > 80:
                continue
            if re.fullmatch('[a-z]+', w):
                lexicon.add(w)
            if re.fullmatch('[a-z]{5}', w):
                guesses.add(w)
                if name in ('english-words', 'american-words'):
                    level[w] = min(level.get(w, 99), int(size))

    def inflected(w):
        """A plural, a past form, a comparative or an -ing form of a word in SCOWL."""
        if w.endswith('ing'):
            return True
        stems = []
        if w.endswith('s') and not w.endswith(('ss', 'us', 'is')):
            stems.append(w[:-1])
        if w.endswith('es'):
            stems.append(w[:-2])
        if w.endswith('ies'):
            stems.append(w[:-3] + 'y')
        if w.endswith('ed'):
            stems += [w[:-2], w[:-1], w[:-3]]
        if w.endswith(('er', 'est')):
            stems += [w[:-2], w[:-1], w[:-3]]
        return any(len(s) >= 2 and s in lexicon for s in stems)

    bad = bad_words(cache, 'en')
    counts = seen(cache, 'en')
    exclude = set(listed('en-exclude.txt'))
    keep = set(listed('en-keep.txt'))
    picked = {w for w, s in level.items() if s <= 35 and not inflected(w) and w not in proper}
    answers = (set(listed('en-answers-v1.txt')) | picked | set(listed('en-extra.txt'))) - exclude - bad
    # FW1: only words people really use (an answer seen ANSWER_SEEN times, a guess GUESS_SEEN times).
    answers = {w for w in answers if counts.get(w, 0) >= ANSWER_SEEN or w in keep}
    guesses = {w for w in enable | guesses if counts.get(w, 0) >= GUESS_SEEN} | answers
    cats = categories('en', counts, bad, set('abcdefghijklmnopqrstuvwxyz'), keep)
    header = (
        '// Five Frames word list, English ({guesses} allowed guesses, {answers} answers). Generated by\n'
        '// scripts/words/build-words.py; see docs/internal/research/word-game.md "Shipped lists" and /third-party-notices.txt.\n'
        '// Guesses: ENABLE (public domain) and SCOWL (Copyright 2000-2018 by Kevin Atkinson, permissive licence), five-letter words\n'
        '// that are really in use (FW1). Answers: our own picks of common words from them, stored as base-36 indices (not\n'
        '// plain text). Categories: our own hand-written lists.\n'
    )
    write('en', guesses, answers, header, cats, {w: band('en', counts, keep, w) for w in answers}, category_bands(cats, counts))


VOWELS = 'aeıioöuü'
BACK = 'aıou'
ROUND = 'ouöü'
HARD = 'fsthşçkp'


def tr_lower(word):
    """Turkish lower case (I -> ı, İ -> i), and the circumflex letters written plainly (â -> a)."""
    word = word.replace('I', 'ı').replace('İ', 'i').lower()
    return word.replace('â', 'a').replace('î', 'i').replace('û', 'u')


def harmony(stem, inverse=False):
    """The two-way (a/e) and four-way (ı/i/u/ü) vowels a suffix takes after this stem."""
    last = next((c for c in reversed(stem) if c in VOWELS), 'e')
    back = (last in BACK) != inverse
    rounded = last in ROUND
    return ('a' if back else 'e'), (('u' if rounded else 'ı') if back else ('ü' if rounded else 'i'))


def before_vowel(word, marks):
    """The stem before a suffix that starts with a vowel: kitap -> kitab, ağız -> ağz, hak -> hakk."""
    if word[-1] in VOWELS:
        return word
    stem = word
    voicing = 'Voicing' in marks or (sum(c in VOWELS for c in word) > 1 and 'NoVoicing' not in marks)
    if voicing and 'NoVoicing' not in marks and word[-1] in 'pçtk':
        stem = word[:-1] + ('g' if word.endswith('nk') else {'p': 'b', 'ç': 'c', 't': 'd', 'k': 'ğ'}[word[-1]])
    if 'Doubling' in marks:
        stem = word + word[-1]
    if 'LastVowelDrop' in marks:
        k = max(i for i, c in enumerate(stem) if c in VOWELS)
        stem = stem[:k] + stem[k + 1:]
    return stem


def noun_forms(word, marks):
    a, i = harmony(word, 'InverseHarmony' in marks)
    d = 't' if word[-1] in HARD else 'd'
    c = 'ç' if word[-1] in HARD else 'c'
    forms = [word + 'l' + a + 'r', word + d + a, word + 'l' + i, word + 's' + i + 'z', word + c + i, word + c + a]
    if word[-1] in VOWELS:
        forms += [word + 'y' + i, word + 'y' + a, word + 'm', word + 'n', word + 's' + i, word + 'n' + i + 'n', word + 'yl' + a]
    else:
        stem = before_vowel(word, marks)
        forms += [stem + i, stem + a, stem + i + 'm', stem + i + 'n', stem + i + 'z', word + 'l' + a]
    return forms


def verb_forms(word, marks):
    stem = word[:-3]
    if not stem:
        return []
    a, i = harmony(stem)
    d = 't' if stem[-1] in HARD else 'd'
    forms = [stem, stem + d + i, stem + d + i + 'm', stem + d + i + 'n', stem + 'm' + i + 'ş', stem + 's' + i + 'n',
             stem + 'm' + a, stem + 'm' + a + 'k', stem + 's' + a]
    if stem[-1] in VOWELS:
        forms += [stem + 'y' + a + 'n', stem + 'y' + i + 'n', stem + 'r']
    else:
        soft = before_vowel(stem, marks)
        forms += [soft + a + 'n', soft + i + 'n']
    return forms


def build_tr(cache):
    letters = set('abcçdefgğhıijklmnoöprsştuüvyz')
    lemmas, guesses = set(), set()
    for line in open(fetch(cache, 'zemberek.dict'), encoding='utf-8'):
        m = re.match(r'^(\S+)(?:\s*\[(.*)\])?\s*$', line.strip())
        if not m or not re.fullmatch('[a-zçğıöşüâîû]+', m.group(1)):
            continue  # proper nouns start with a capital; abbreviations and symbols have other characters
        word, marks = tr_lower(m.group(1)), m.group(2) or ''
        if 'Abbrv' in marks or 'Punc' in marks:
            continue
        pos = re.search(r'P:([A-Za-z]+)', marks)
        pos = pos.group(1) if pos else ('Verb' if re.search('m[ae]k$', word) else 'Noun')
        if len(word) == 5:
            lemmas.add(word)
        forms = verb_forms(word, marks) if pos == 'Verb' else noun_forms(word, marks) if pos in ('Noun', 'Adj') else []
        guesses |= {f for f in forms if len(f) == 5}
    bad = bad_words(cache, 'tr')
    counts = seen(cache, 'tr')
    exclude = set(listed('tr-exclude.txt'))
    keep = set(listed('tr-keep.txt'))
    answers = (set(listed('tr-answers-v1.txt')) | (set(listed('tr-extra.txt')) & lemmas)) - exclude - bad
    # FW1: only words people really use (an answer seen ANSWER_SEEN times, a guess GUESS_SEEN times).
    answers = {w for w in answers if counts.get(w, 0) >= ANSWER_SEEN or w in keep}
    guesses = {w for w in guesses | lemmas if set(w) <= letters and counts.get(w, 0) >= GUESS_SEEN} | answers
    cats = categories('tr', counts, bad, letters, keep)
    header = (
        '// Five Frames word list, Turkish ({guesses} allowed guesses, {answers} answers). Generated by\n'
        '// scripts/words/build-words.py; see docs/internal/research/word-game.md "Shipped lists" and /third-party-notices.txt.\n'
        '// Guesses: the five-letter words of the Zemberek dictionary (Apache 2.0) and the five-letter forms we make from its\n'
        '// lemmas, the ones really in use (FW1). Answers: our own picks of common lemmas, stored as base-36 indices (not\n'
        '// plain text). Categories: our own hand-written lists.\n'
    )
    write('tr', guesses, answers, header, cats, {w: band('tr', counts, keep, w) for w in answers}, category_bands(cats, counts))


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--cache', default=os.path.join(os.path.expanduser('~'), '.cache', 'sidelit-words'))
    parser.add_argument('--lang', default='all', choices=['en', 'tr', 'all'])
    parser.add_argument('--check', action='store_true', help='change nothing; fail if the shipped lists differ or break a rule')
    args = parser.parse_args()
    CHECK['on'] = args.check
    os.makedirs(args.cache, exist_ok=True)
    if args.lang in ('en', 'all'):
        build_en(args.cache)
    if args.lang in ('tr', 'all'):
        build_tr(args.cache)
    write_blocked(args.cache)
    if CHECK['problems']:
        raise SystemExit(f'{len(CHECK["problems"])} problem(s) in the word lists')
    if args.check:
        print('word lists ok')


if __name__ == '__main__':
    main()
