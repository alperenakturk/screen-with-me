# Card R20 (Design): redraw options for the parody avatars `sponge` and `squid`.
# Run: python3 docs/internal/design/avatars-2/r20/draw.py -> ./sponge-A.svg ... ./squid-C.svg
# Same badge as avatars-2/full.mjs (64 x 64 circle, radial background, skin light), ids prefixed per file.
import os
HERE = os.path.dirname(os.path.abspath(__file__))
INK = '#1d1430'

def badge(pid, inner, outer, body, motif=''):
    return (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><defs>'
            f'<clipPath id="{pid}-c"><circle cx="32" cy="32" r="32"/></clipPath>'
            f'<radialGradient id="{pid}-bg" cx="50%" cy="38%" r="68%"><stop offset="0" stop-color="{inner}"/><stop offset="1" stop-color="{outer}"/></radialGradient>'
            f'<radialGradient id="{pid}-sk" cx="40%" cy="35%" r="70%"><stop offset="0" stop-color="#fff" stop-opacity=".28"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></radialGradient>'
            f'</defs><g clip-path="url(#{pid}-c)"><rect width="64" height="64" fill="url(#{pid}-bg)"/>{motif}{body}'
            f'<circle cx="32" cy="32" r="31.4" fill="none" stroke="#fff" stroke-opacity=".12" stroke-width="1.2"/></g></svg>\n')

def eye_i(x, y, r, iris, look=0.0):
    return (f'<circle cx="{x+look}" cy="{y+.4}" r="{r}" fill="{iris}"/>'
            f'<circle cx="{x+look}" cy="{y+.4}" r="{r*.48:.2f}" fill="{INK}"/>'
            f'<circle cx="{x+look+r*.32:.2f}" cy="{y-r*.3:.2f}" r="{r*.26:.2f}" fill="#fff"/>'
            f'<circle cx="{x+look-r*.3:.2f}" cy="{y+r*.42:.2f}" r="{r*.12:.2f}" fill="#fff"/>')

bubbles = ('<g fill="none" stroke="#e6faff" stroke-width=".9" opacity=".6"><circle cx="7" cy="22" r="2"/><circle cx="9" cy="40" r="1.3"/>'
           '<circle cx="56.5" cy="13" r="1.6"/><circle cx="58" cy="34" r="2.3"/></g>')

# ---------- sponge ----------
SPONGE_BODY = ('M13 11 Q16.5 6.4 20 9.4 Q23.5 6.4 27 9.4 Q30.5 6.4 34 9.4 Q37.5 6.4 41 9.4 Q44.5 6.4 48 9.4 Q52 8.6 51.2 12.6 '
               'Q53.4 17.4 51.2 22.2 Q53.4 27 51.2 31.8 Q53.4 36.6 51.2 41.4 L51.2 50 H12.8 L12.8 41.4 Q10.6 36.6 12.8 31.8 '
               'Q10.6 27 12.8 22.2 Q10.6 17.4 12.8 12.6 Q12.6 11.4 13 11Z')

def sponge_face(pid, mouth_open=True):
    pores = ''.join(f'<ellipse cx="{x}" cy="{y}" rx="{rx}" ry="{ry}" fill="#d4b52c" opacity=".7"/>' for x, y, rx, ry in
                    [(17.4, 14.6, 2, 2.5), (46.6, 16.8, 1.6, 2.1), (16.8, 40.8, 1.5, 2), (47, 41.8, 2, 2.5), (44.4, 11.6, 1, 1.2), (18.6, 45.6, 1, 1.2), (45.4, 47, 1.1, 1.3)])
    eyes = ''
    for x in (25.4, 38.6):
        eyes += f'<circle cx="{x}" cy="22.6" r="6.3" fill="#fff" stroke="#2a2a2a" stroke-width=".7"/>'
        eyes += eye_i(x, 22.6, 3.1, '#3aa8ec', .9 if x < 32 else -.9)
    lashes = ''.join(f'<path d="M{a} {b} L{c} {d}" />' for a, b, c, d in
                     [(21.2, 17.6, 19.9, 15.2), (25.4, 16.3, 25.4, 13.5), (29.6, 17.6, 30.9, 15.2),
                      (34.4, 17.6, 33.1, 15.2), (38.6, 16.3, 38.6, 13.5), (42.8, 17.6, 44.1, 15.2)])
    s = (f'<path d="{SPONGE_BODY}" fill="#ffe55c" stroke="#d6b92a" stroke-width=".8"/>'
         f'<path d="{SPONGE_BODY}" fill="url(#{pid}-sk)"/>{pores}{eyes}'
         f'<g stroke="{INK}" stroke-width="1.1" stroke-linecap="round">{lashes}</g>'
         '<path d="M31 27 Q29.4 30.6 31.2 31.8 Q33.8 32.4 33.4 29.6 Q33 27.6 32.6 27Z" fill="#f2d84a" stroke="#d6b92a" stroke-width=".5"/>'
         '<circle cx="18.6" cy="31.4" r="3" fill="#f6a24e" opacity=".5"/><circle cx="45.4" cy="31.4" r="3" fill="#f6a24e" opacity=".5"/>'
         '<g fill="#c8862a"><circle cx="17.6" cy="30.8" r=".5"/><circle cx="19.5" cy="32.1" r=".5"/><circle cx="44.5" cy="30.8" r=".5"/><circle cx="46.4" cy="32.1" r=".5"/></g>')
    if mouth_open:
        s += ('<path d="M21.4 32.6 Q32 35 42.6 32.6 Q40 42.6 32 42.6 Q24 42.6 21.4 32.6Z" fill="#7a1f2a" stroke="#5a1a18" stroke-width=".7"/>'
              '<path d="M26.4 39.4 Q32 36.8 37.6 39.4 Q35 42.2 32 42.2 Q29 42.2 26.4 39.4Z" fill="#ff7f8a"/>'
              '<rect x="28.5" y="33.4" width="3.3" height="3.6" rx=".6" fill="#fff" stroke="#5a1a18" stroke-width=".45"/>'
              '<rect x="32.2" y="33.4" width="3.3" height="3.6" rx=".6" fill="#fff" stroke="#5a1a18" stroke-width=".45"/>')
    return s

def sponge_A():
    pid = 'sponge'
    # our sponge with a collar and short brown shorts (no tie)
    clothes = ('<rect x="12.8" y="46" width="38.4" height="18" fill="#a3683a"/>'
               '<path d="M12.8 49.4 H51.2" stroke="#3a2414" stroke-width="1.5" stroke-dasharray="3.4 2.6"/>'
               '<path d="M12.8 44.6 H51.2 V47 H12.8Z" fill="#fff"/>'
               '<path d="M22.6 44.6 L29 49.6 L32 44.6Z M41.4 44.6 L35 49.6 L32 44.6Z" fill="#fff" stroke="#d8d8e6" stroke-width=".5"/>')
    return badge(pid, '#7adcf6', '#1a6aa8', sponge_face(pid) + clothes, bubbles)

def sponge_B():
    pid = 'sponge'
    # the same face with a small white sailor cap, body down to the bottom
    cap = ('<path d="M22.4 9.6 Q32 1.8 41.6 9.6Z" fill="#fff"/>'
           '<rect x="22" y="8.4" width="20" height="2.8" rx="1.4" fill="#2a6ad0"/>'
           '<circle cx="32" cy="5.6" r="1" fill="#2a6ad0"/>')
    body = sponge_face(pid).replace('L51.2 50 H12.8 L12.8 41.4', 'L51.2 66 H12.8 L12.8 41.4')
    return badge(pid, '#7adcf6', '#1a6aa8', body + cap, bubbles)

def sponge_C():
    pid = 'sponge'
    # the same sponge waving hello, collar only
    wave = ('<path d="M51 34 Q57 31 58.6 24" stroke="#ffe55c" stroke-width="3.2" fill="none" stroke-linecap="round"/>'
            '<circle cx="58.8" cy="22.4" r="3" fill="#ffe55c" stroke="#d6b92a" stroke-width=".6"/>'
            '<path d="M55.6 17.8 q1.4 -1.6 2.8 -.6 M60.4 17.4 q1.6 -.6 2.2 .8" stroke="#fff" stroke-width=".9" fill="none" stroke-linecap="round" opacity=".8"/>')
    clothes = ('<rect x="12.8" y="46" width="38.4" height="18" fill="#a3683a"/>'
               '<path d="M12.8 49.4 H51.2" stroke="#3a2414" stroke-width="1.5" stroke-dasharray="3.4 2.6"/>'
               '<path d="M12.8 44.6 H51.2 V47 H12.8Z" fill="#fff"/>')
    return badge(pid, '#8ae6ff', '#2280c0', sponge_face(pid) + clothes + wave, bubbles.replace('cx="58" cy="34"', 'cx="5" cy="50"'))

# ---------- squid ----------
notes = ('<g fill="#fff" opacity=".45"><path d="M7 20 v-7 l4 -1.2 v6.6" stroke="#fff" stroke-width=".9" fill="none"/>'
         '<ellipse cx="6.2" cy="20.2" rx="1.6" ry="1.2"/><ellipse cx="10.2" cy="18.6" rx="1.6" ry="1.2"/>'
         '<path d="M56 14 v-6" stroke="#fff" stroke-width=".9"/><ellipse cx="55.2" cy="14.2" rx="1.5" ry="1.1"/></g>')

def squid_head(skin, line, pid, nose_len=1.0):
    return (f'<rect x="28" y="38" width="8" height="8" fill="{skin}"/><rect x="28" y="38" width="8" height="2.4" fill="#000" opacity=".1"/>'
            f'<path d="M18.6 30.4 Q14 4 32 4 Q50 4 45.4 30.4 Q43.6 40.4 32 40.4 Q20.4 40.4 18.6 30.4Z" fill="{skin}" stroke="{line}" stroke-width=".8"/>'
            f'<path d="M18.6 30.4 Q14 4 32 4 Q50 4 45.4 30.4 Q43.6 40.4 32 40.4 Q20.4 40.4 18.6 30.4Z" fill="url(#{pid}-sk)"/>')

def squid_nose(skin, line, y0=27.6, y1=37.4):
    return (f'<path d="M30.4 {y0} Q29.2 {y1-3} 30.2 {y1} Q32 {y1+2.4} 33.8 {y1} Q34.8 {y1-3} 33.6 {y0}Z" fill="{skin}" stroke="{line}" stroke-width=".6"/>'
            f'<ellipse cx="31.4" cy="{y1-1.4}" rx=".7" ry="1" fill="#fff" opacity=".35"/>')

def jumper(base, stripe):
    return (f'<path d="M6 64 Q8 45 32 43.4 Q56 45 58 64Z" fill="{base}"/>'
            f'<path d="M8.5 62 Q12 47 32 45.4" stroke="#fff" stroke-opacity=".18" stroke-width="1.4" fill="none"/>'
            f'<path d="M13 52 H51 M10.6 58 H53.4" stroke="{stripe}" stroke-width="2.2"/>'
            f'<path d="M25 44.2 Q32 48.6 39 44.2" stroke="{stripe}" stroke-width="1.6" fill="none"/>')

def squid_A():
    pid = 'squid'
    skin, line = '#a6dcc4', '#78b09a'
    # relaxed, kind eyes: light lids over the top third, dark pupils with highlights, a soft smile
    eyes = ''
    for x in (26.6, 37.4):
        eyes += f'<ellipse cx="{x}" cy="25" rx="4.4" ry="5" fill="#fbf7e4" stroke="{line}" stroke-width=".5"/>'
        eyes += eye_i(x, 26, 2.1, '#5a3a2a', .3 if x < 32 else -.3)
        eyes += f'<path d="M{x-4.6} 23.4 Q{x} 18.6 {x+4.6} 23.4 Q{x} 21.8 {x-4.6} 23.4Z" fill="#94ccb4"/>'
    brows = f'<path d="M22.6 17.6 Q26.4 15.6 30 17.2 M34 17.2 Q37.6 15.6 41.4 17.6" stroke="#5f8f7c" stroke-width="1.1" fill="none" stroke-linecap="round"/>'
    mouth = '<path d="M27.2 37.2 Q32 40.4 36.8 37.2" stroke="#6a3a3a" stroke-width="1.4" fill="none" stroke-linecap="round"/>'
    cheeks = '<ellipse cx="22.6" cy="32.4" rx="2.4" ry="1.4" fill="#ff9a8a" opacity=".55"/><ellipse cx="41.4" cy="32.4" rx="2.4" ry="1.4" fill="#ff9a8a" opacity=".55"/>'
    body = jumper('#c9864a', '#f2d49a') + squid_head(skin, line, pid) + brows + eyes + cheeks + squid_nose(skin, line, 27.6, 34.6) + mouth
    return badge(pid, '#ffe0c0', '#c66a4a', body, notes)

def squid_B():
    pid = 'squid'
    skin, line = '#a8dccb', '#7ab0a0'
    # wide-open friendly eyes, raised brows, a coral beret (the artist), open smile
    eyes = ''
    for x in (26.8, 37.2):
        eyes += f'<ellipse cx="{x}" cy="25" rx="4.2" ry="4.8" fill="#fff" stroke="{line}" stroke-width=".5"/>'
        eyes += eye_i(x, 25.2, 2.3, '#4a3a6a', .4 if x < 32 else -.4)
    brows = '<path d="M22.8 17.4 Q26.6 14.8 30.2 16.6 M33.8 16.6 Q37.4 14.8 41.2 17.4" stroke="#5f8f80" stroke-width="1.1" fill="none" stroke-linecap="round"/>'
    beret = ('<path d="M17.4 12 Q19 3 33 3.4 Q47 4 46.6 11.6 Q40 9.4 31.4 10 Q22.6 10.4 17.4 12Z" fill="#ff7a6a"/>'
             '<path d="M17.4 12 Q22.6 10.4 31.4 10 Q40 9.4 46.6 11.6" stroke="#d65a4a" stroke-width="1" fill="none"/>'
             '<path d="M32 3.6 q.6 -2.4 2 -2.6" stroke="#d65a4a" stroke-width="1.2" fill="none" stroke-linecap="round"/>')
    mouth = ('<path d="M26.4 37 Q32 41.6 37.6 37 Q35.6 40.6 32 40.6 Q28.4 40.6 26.4 37Z" fill="#8a3a4a"/>'
             '<path d="M29 39.4 Q32 38.4 35 39.4 Q33.6 40.4 32 40.4 Q30.4 40.4 29 39.4Z" fill="#ff9aa6"/>')
    cheeks = '<ellipse cx="22.6" cy="32" rx="2.4" ry="1.4" fill="#ff9a8a" opacity=".55"/><ellipse cx="41.4" cy="32" rx="2.4" ry="1.4" fill="#ff9a8a" opacity=".55"/>'
    body = jumper('#7a6ac0', '#c8bdf0') + squid_head(skin, line, pid) + beret + brows + eyes + cheeks + mouth + squid_nose(skin, line, 27.6, 35.8)
    return badge(pid, '#f6d6ec', '#8a4a8a', body, notes)

def squid_C():
    pid = 'squid'
    skin, line = '#a6dcc4', '#78b09a'
    # happy closed eyes, playing a little clarinet
    eyes = ''.join(f'<path d="M{x-3.6} 26 Q{x} 22 {x+3.6} 26" stroke="#3a2a3a" stroke-width="1.5" fill="none" stroke-linecap="round"/>' for x in (26.6, 37.4))
    brows = '<path d="M22.6 18.6 Q26.4 16.6 30 18.2 M34 18.2 Q37.6 16.6 41.4 18.6" stroke="#5f8f7c" stroke-width="1.1" fill="none" stroke-linecap="round"/>'
    cheeks = '<ellipse cx="22.4" cy="30.6" rx="2.6" ry="1.5" fill="#ff9a8a" opacity=".6"/><ellipse cx="41.6" cy="30.6" rx="2.6" ry="1.5" fill="#ff9a8a" opacity=".6"/>'
    clar = ('<path d="M33.4 37.6 L46 58" stroke="#2a2236" stroke-width="3" stroke-linecap="round"/>'
            '<path d="M44.4 55 L48.4 61.6 L44 63.4Z" fill="#2a2236"/>'
            '<g fill="#d8dce8"><circle cx="37" cy="43.6" r=".8"/><circle cx="39" cy="46.8" r=".8"/><circle cx="41" cy="50" r=".8"/><circle cx="43" cy="53.2" r=".8"/></g>'
            '<path d="M35.6 41 L37.6 39.8" stroke="#d8dce8" stroke-width="1.1"/>')
    body = (jumper('#3f9a8c', '#bfe8dc') + squid_head(skin, line, pid) + brows + eyes + cheeks + squid_nose(skin, line, 27, 35.6)
            + '<ellipse cx="33.2" cy="37.6" rx="1.6" ry="1.2" fill="#8a3a4a"/>' + clar)
    return badge(pid, '#ffe8b0', '#2f8a7c', body, notes)


def sponge_cheer():
    pid = 'sponge'
    # owner's pick C, round 2: both hands up in the air, cheering
    # arms out of the sides, hands up beside the head (kept inside the badge)
    def arm(x0, xc, xh):
        return (f'<path d="M{x0} 34 Q{xc} 31 {xh} 21.6" stroke="#ffe55c" stroke-width="3.2" fill="none" stroke-linecap="round"/>'
                f'<circle cx="{xh}" cy="19.6" r="2.9" fill="#ffe55c" stroke="#d6b92a" stroke-width=".6"/>'
                f'<path d="M{xh-1.8} 17.4 v-1.6 M{xh} 16.8 v-1.8 M{xh+1.8} 17.4 v-1.6" stroke="#ffe55c" stroke-width="1.3" stroke-linecap="round"/>')
    arms = arm(13, 6.4, 7.6) + arm(51, 57.6, 56.4)
    cheer = ('<g stroke="#fff" stroke-width=".9" fill="none" stroke-linecap="round" opacity=".85">'
             '<path d="M4.4 15.4 l-1.6 -.8 M6.4 12.4 l-.8 -1.6 M10.6 12.6 l.6 -1.6"/><path d="M53.4 12.6 l-.6 -1.6 M57.6 12.4 l.8 -1.6 M59.6 15.4 l1.6 -.8"/></g>')
    clothes = ('<rect x="12.8" y="46" width="38.4" height="18" fill="#a3683a"/>'
               '<path d="M12.8 49.4 H51.2" stroke="#3a2414" stroke-width="1.5" stroke-dasharray="3.4 2.6"/>'
               '<path d="M12.8 44.6 H51.2 V47 H12.8Z" fill="#fff"/>')
    few = ('<g fill="none" stroke="#e6faff" stroke-width=".9" opacity=".6"><circle cx="6" cy="40" r="1.6"/><circle cx="58" cy="38" r="2"/><circle cx="5" cy="27" r="1.1"/></g>')
    return badge(pid, '#8ae6ff', '#2280c0', arms + sponge_face(pid) + clothes + cheer, few)

# ---------- squid, round 2: faithful, deadpan, soft light ----------
SQ_SKIN, SQ_LINE, SQ_LID = '#a9d4c6', '#7aa89a', '#93c2b3'
SQ_HEAD = 'M15.6 21 Q14.6 3.6 32 3.4 Q49.4 3.6 48.4 21 Q47.6 31 42.4 37.6 Q38.4 42 32 42 Q25.6 42 21.6 37.6 Q16.4 31 15.6 21Z'

def sq_shirt(pid):
    return ('<path d="M7 64 Q9 46.6 32 45 Q55 46.6 57 64Z" fill="#8f5d34"/>'
            '<path d="M9.4 62 Q13 48.6 32 47" stroke="#fff" stroke-opacity=".16" stroke-width="1.4" fill="none"/>'
            '<path d="M26.4 45.6 Q32 49.4 37.6 45.6" stroke="#6e4424" stroke-width="1.4" fill="none"/>'
            f'<rect x="28.4" y="39" width="7.2" height="8" fill="{SQ_SKIN}"/><rect x="28.4" y="39" width="7.2" height="2.4" fill="#000" opacity=".1"/>')

def sq_head(pid):
    return (f'<path d="{SQ_HEAD}" fill="{SQ_SKIN}" stroke="{SQ_LINE}" stroke-width=".8"/>'
            f'<path d="{SQ_HEAD}" fill="url(#{pid}-sk)"/>'
            '<path d="M22 8.6 Q26 6 31 5.8" stroke="#fff" stroke-opacity=".35" stroke-width="1.6" fill="none" stroke-linecap="round"/>')

def sq_eye(x, y=24, lid=0.5, look=0.0, pup_y=1.6):
    """lid: share of the eye covered from the top (0..1)."""
    rx, ry = 5.2, 5.8
    top = y - ry
    edge = top + 2 * ry * lid
    s = (f'<ellipse cx="{x}" cy="{y}" rx="{rx}" ry="{ry}" fill="#f6f2d2" stroke="{SQ_LINE}" stroke-width=".6"/>'
         f'<circle cx="{x+look}" cy="{y+pup_y}" r="1.45" fill="#2e2a26"/><circle cx="{x+look+.5}" cy="{y+pup_y-.5}" r=".45" fill="#fff"/>')
    # the lid: the top of the eye down to `edge`, slightly curved
    s += (f'<path d="M{x-rx-.3} {edge} Q{x-rx-.3} {top-.6} {x} {top-.6} Q{x+rx+.3} {top-.6} {x+rx+.3} {edge} Q{x} {edge+.9} {x-rx-.3} {edge}Z" fill="{SQ_LID}"/>'
          f'<path d="M{x-rx} {edge} Q{x} {edge+.9} {x+rx} {edge}" stroke="#4e7468" stroke-width="1.1" fill="none" stroke-linecap="round"/>')
    return s

def sq_nose():
    return (f'<path d="M29.8 25.6 Q28.4 33 28.8 38.6 Q29.2 45 32.2 45 Q35.4 45 35.2 38.8 Q35.6 33 34.2 25.6Z" fill="{SQ_SKIN}" stroke="{SQ_LINE}" stroke-width=".7"/>'
            '<ellipse cx="31" cy="40" rx=".9" ry="1.6" fill="#fff" opacity=".3"/>'
            '<path d="M29.4 41.2 Q32.2 43.4 35 41.2" stroke="#000" stroke-opacity=".08" stroke-width="1" fill="none"/>')

def squid_D():
    pid = 'squid'
    # bored: both lids half down, pupils low, a flat mouth half hidden by the nose
    mouth = '<path d="M24.8 38.6 Q27 39.4 29 39 M35 39 Q37 39.4 39.2 38.6" stroke="#4e5a52" stroke-width="1.3" fill="none" stroke-linecap="round"/>'
    body = sq_shirt(pid) + sq_head(pid) + sq_eye(26.4, lid=.5) + sq_eye(37.6, lid=.5) + mouth + sq_nose()
    return badge(pid, '#d4ecf2', '#4f8aa6', body)

def squid_E():
    pid = 'squid'
    # unimpressed: one lid lower than the other, eyes looking aside, a small sideways frown
    mouth = '<path d="M25 39.4 Q27.4 38.4 29 38.8 M35 38.6 Q37.2 38.8 39 38" stroke="#4e5a52" stroke-width="1.3" fill="none" stroke-linecap="round"/>'
    body = sq_shirt(pid) + sq_head(pid) + sq_eye(26.4, lid=.58, look=1.4) + sq_eye(37.6, lid=.38, look=1.4) + mouth + sq_nose()
    return badge(pid, '#f4e6cc', '#a07a50', body)

def squid_F():
    pid = 'squid'
    # deadpan with his clarinet, lids heavy, soft lilac light
    mouth = '<path d="M25 38.8 Q27 39.4 29 39 M35 39 Q37 39.4 39 38.8" stroke="#4e5a52" stroke-width="1.3" fill="none" stroke-linecap="round"/>'
    clar = ('<path d="M35.6 41.6 L47.4 60.6" stroke="#2a2236" stroke-width="3" stroke-linecap="round"/>'
            '<path d="M45.8 58 L49.8 64.6 L45.2 66Z" fill="#2a2236"/>'
            '<g fill="#d8dce8"><circle cx="39.2" cy="47.4" r=".8"/><circle cx="41.2" cy="50.6" r=".8"/><circle cx="43.2" cy="53.8" r=".8"/></g>'
            )
    note = '<g fill="#fff" opacity=".45"><path d="M54 18 v-7" stroke="#fff" stroke-width=".9"/><ellipse cx="53.2" cy="18.2" rx="1.5" ry="1.1"/></g>'
    body = sq_shirt(pid) + sq_head(pid) + sq_eye(26.4, lid=.56) + sq_eye(37.6, lid=.56) + mouth + sq_nose() + clar
    return badge(pid, '#e8e0f6', '#6f62a6', body, note)

for name, fn in [('sponge', sponge_cheer), ('squid-D', squid_D), ('squid-E', squid_E), ('squid-F', squid_F)]:
    with open(os.path.join(HERE, name + '.svg'), 'w', encoding='utf-8') as f:
        f.write(fn())
print('round 2 written')
