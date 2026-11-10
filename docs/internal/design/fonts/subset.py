# FONT1: cut the sample page's fonts down to the characters it shows (+ the whole Turkish alphabet).
# Source: the @fontsource-variable/<id> npm packages (OFL 1.1), unpacked as <src>/<id>/package/.
#   pip install fonttools brotli
#   for f in <ids>; do npm pack @fontsource-variable/$f; done   (then unpack each into <src>/<id>)
#   python3 docs/internal/design/fonts/subset.py <src>
import sys, os, glob, subprocess, shutil
SRC = sys.argv[1]
HERE = os.path.dirname(os.path.abspath(__file__))
TEXT = open(os.path.join(HERE, 'sample-text.txt'), encoding='utf-8').read()
TEXT += 'abcçdefgğhıijklmnoöprsştuüvyzABCÇDEFGĞHIİJKLMNOÖPRSŞTUÜVYZ0123456789'
for d in sorted(os.listdir(SRC)):
    files = f'{SRC}/{d}/package/files'
    for sub in ('latin', 'latin-ext'):
        p = glob.glob(f'{files}/{d}-{sub}-wght-normal.woff2')
        if not p: continue
        subprocess.run(['pyftsubset', p[0], f'--text={TEXT}', f'--output-file={HERE}/files/{d}-{sub}.woff2', '--flavor=woff2', '--layout-features=*'], check=True)
    lic = glob.glob(f'{SRC}/{d}/package/LICENSE*')
    if lic: shutil.copy(lic[0], f'{HERE}/licenses/{d}.txt')
