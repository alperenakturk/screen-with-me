# Avatar redraw samples (card R14): direction A "refined" and B "chibi sticker", 64x64 round badges.
import os,sys
OUT=__import__('os').path.dirname(__import__('os').path.abspath(__file__))
INK='#2a1838'
def badge(uid,bg,body,motif=''):
    i,o=bg
    return (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><defs><clipPath id="{uid}c"><circle cx="32" cy="32" r="32"/></clipPath>'
      f'<radialGradient id="{uid}bg" cx="50%" cy="38%" r="68%"><stop offset="0" stop-color="{i}"/><stop offset="1" stop-color="{o}"/></radialGradient>'
      f'<radialGradient id="{uid}sk" cx="40%" cy="35%" r="70%"><stop offset="0" stop-color="#fff" stop-opacity=".28"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></radialGradient></defs>'
      f'<g clip-path="url(#{uid}c)"><rect width="64" height="64" fill="url(#{uid}bg)"/>{motif}{body}</g></svg>\n')

# ---------------- B: chibi sticker ----------------
def bbody(fill,extra=''):
    return f'<path d="M9 66 Q10 50 32 49 Q54 50 55 66Z" fill="{fill}" stroke="{INK}" stroke-width="1.5"/>{extra}'
def bhead(skin,uid,cy=30,rx=17.5,ry=16.5):
    return f'<ellipse cx="32" cy="{cy}" rx="{rx}" ry="{ry}" fill="{skin}" stroke="{INK}" stroke-width="1.5"/><ellipse cx="32" cy="{cy}" rx="{rx}" ry="{ry}" fill="url(#{uid}sk)"/>'
def beyes(iris='#3a2a5a',y=33,dx=7,ry=4.3,rx=3.4,shape='round'):
    s=''
    for x in (32-dx,32+dx):
        if shape=='calm':
            s+=f'<path d="M{x-3.4} {y-0.6} Q{x} {y-3.4} {x+3.4} {y-0.6} Q{x} {y+2.6} {x-3.4} {y-0.6}Z" fill="{iris}" stroke="{INK}" stroke-width="1"/><circle cx="{x+1}" cy="{y-1.2}" r=".9" fill="#fff"/>'
        elif shape=='tired':
            s+=f'<ellipse cx="{x}" cy="{y}" rx="{rx}" ry="{ry}" fill="#15101f"/><circle cx="{x+1}" cy="{y-1.5}" r="1" fill="#fff"/><path d="M{x-4} {y+4.2} Q{x} {y+6.6} {x+4} {y+4.2}" stroke="#5a4a72" stroke-width="1.6" fill="none" stroke-linecap="round" opacity=".7"/>'
        else:
            s+=(f'<ellipse cx="{x}" cy="{y}" rx="{rx}" ry="{ry}" fill="#15101f"/><ellipse cx="{x}" cy="{y+1.1}" rx="{rx-0.9}" ry="{ry-1.6}" fill="{iris}"/>'
                f'<circle cx="{x+1.1}" cy="{y-1.6}" r="1.35" fill="#fff"/><circle cx="{x-1.1}" cy="{y+1.7}" r=".65" fill="#fff"/>')
    return s
def bblush(y=38.5):
    return f'<ellipse cx="20.5" cy="{y}" rx="3" ry="1.7" fill="#ff7a9a" opacity=".45"/><ellipse cx="43.5" cy="{y}" rx="3" ry="1.7" fill="#ff7a9a" opacity=".45"/>'
def bmouth(kind='smile',y=40):
    return {'smile':f'<path d="M29.5 {y} Q32 {y+2.6} 34.5 {y}" stroke="{INK}" stroke-width="1.3" fill="none" stroke-linecap="round"/>',
            'grin':f'<path d="M27.5 {y-0.5} Q32 {y+5} 36.5 {y-0.5}Z" fill="#7a2a3a" stroke="{INK}" stroke-width="1.1" stroke-linejoin="round"/><path d="M28.6 {y} H35.4" stroke="#fff" stroke-width="1.2"/>',
            'smirk':f'<path d="M30 {y+0.6} Q33 {y+1.6} 35.5 {y-0.6}" stroke="{INK}" stroke-width="1.3" fill="none" stroke-linecap="round"/>',
            'o':f'<ellipse cx="32" cy="{y+0.6}" rx="1.4" ry="1.7" fill="#7a2a3a" stroke="{INK}" stroke-width=".9"/>',
            'flat':f'<path d="M30 {y+0.5} H34" stroke="{INK}" stroke-width="1.3" stroke-linecap="round"/>'}[kind]

B={}
# hacker: slick black hair, tiny round shades, black coat collar, green code
u='bh'; B['hacker']=badge(u,('#1f8a4a','#062a14'),
  bbody('#14141a','<path d="M22 50 L32 64 L42 50" stroke="#2c2c36" stroke-width="2" fill="none"/><path d="M14 54 L22 50 M50 54 L42 50" stroke="#2c2c36" stroke-width="1.4"/>')
  +bhead('#f0cfae',u)
  +f'<path d="M14.5 30 Q13 12 32 11 Q51 12 49.5 30 Q46 19 33 18 Q20 18.5 14.5 30Z" fill="#14141a" stroke="{INK}" stroke-width="1.5" stroke-linejoin="round"/><path d="M22 15.5 Q30 13 40 15" stroke="#4a4a5a" stroke-width="1.2" fill="none" stroke-linecap="round"/>'
  +f'<rect x="20" y="29" width="10" height="7" rx="3.5" fill="#0c0c10" stroke="{INK}" stroke-width="1"/><rect x="34" y="29" width="10" height="7" rx="3.5" fill="#0c0c10" stroke="{INK}" stroke-width="1"/><path d="M30 31.5 H34" stroke="{INK}" stroke-width="1.2"/><path d="M22 31 l3.5 -1" stroke="#5dff9a" stroke-width="1"/><path d="M36 31 l3.5 -1" stroke="#5dff9a" stroke-width="1"/>'
  +bblush(39)+bmouth('smirk',41),
  '<g fill="#5dff9a" opacity=".35" font-family="monospace" font-size="5.5" font-weight="700"><text x="4" y="12">1 0</text><text x="48" y="10">0 1</text><text x="2" y="26">1</text><text x="56" y="26">0</text></g>')
# wizardboy: messy black hair, round glasses, maroon-gold scarf, wand sparkle
u='bw'; B['wizardboy']=badge(u,('#6a5aa8','#1c1640'),
  bbody('#1d1a2a','<path d="M17 52 Q32 58 47 52 L46 57 Q32 63 18 57Z" fill="#8e1f2c" stroke="'+INK+'" stroke-width="1.2"/><path d="M24 54.5 l2 4 M31 56 l1 4 M38 55 l-1 4" stroke="#e6b13c" stroke-width="2"/>')
  +bhead('#f2d2b4',u)
  +f'<path d="M14 31 Q11 22 15 17 Q14 12 21 12 Q24 7 31 9 Q37 6 42 10 Q49 10 49 16 Q53 21 50 31 Q48 24 44 21 Q42 25 39 22 Q36 26 33 22 Q29 26 27 22 Q24 25 21 21 Q17 24 14 31Z" fill="#1a1622" stroke="{INK}" stroke-width="1.5" stroke-linejoin="round"/>'
  +beyes('#3fae5a',33,7)
  +f'<circle cx="25" cy="33" r="5.4" fill="none" stroke="#2a2030" stroke-width="1.4"/><circle cx="39" cy="33" r="5.4" fill="none" stroke="#2a2030" stroke-width="1.4"/><path d="M30.4 32.6 H33.6" stroke="#2a2030" stroke-width="1.3"/>'
  +bblush(40)+bmouth('smile',41),
  '<path d="M53 14 l1.2 2.8 3 .4 -2.3 2 .6 3 -2.5 -1.6 -2.6 1.6 .7 -3 -2.3 -2 3 -.4z" fill="#ffd27a"/><circle cx="9" cy="20" r="1.2" fill="#fff6c8"/><circle cx="56" cy="40" r="1" fill="#fff6c8"/>')
# scientist: spiky pale blue hair, lab coat, green swirl
u='bs'; B['scientist']=badge(u,('#3ac08a','#0c3a2c'),
  bbody('#f4f6fa','<path d="M24 50 L32 60 L40 50" fill="#8fd0e8" stroke="'+INK+'" stroke-width="1.2"/><path d="M32 60 V66" stroke="'+INK+'" stroke-width="1.2"/>')
  +bhead('#f0d6c2',u)
  +f'<path d="M14 26 L7 20 L15 19 L10 9 L20 13 L22 4 L28 11 L33 2 L37 11 L44 4 L45 13 L54 9 L49 19 L57 20 L50 26 Q46 17 32 17 Q18 17 14 26Z" fill="#bfe3f2" stroke="{INK}" stroke-width="1.4" stroke-linejoin="round"/>'
  +f'<path d="M20 28.5 Q25 26.5 30 28.5 M34 28.5 Q39 26.5 44 28.5" stroke="#9cc6d8" stroke-width="2.2" fill="none" stroke-linecap="round"/>'
  +beyes('#6a7a8a',33.5,7,3.6,3.2)+bblush(39.5)+bmouth('grin',40.5),
  '<g fill="none" stroke="#8affc8" stroke-width="2" opacity=".45"><path d="M54 48 a8 8 0 1 1 -2 -10 a5 5 0 1 1 -3 7"/></g>')
# sponge (made our own): rounded yellow sea-sponge kid with a little sailor cap, bubbles
u='bp'; B['sponge']=badge(u,('#7ad6f6','#145a9a'),
  f'<rect x="13" y="13" width="38" height="44" rx="9" fill="#ffe25a" stroke="{INK}" stroke-width="1.5"/><rect x="13" y="13" width="38" height="44" rx="9" fill="url(#{u}sk)"/>'
  +''.join(f'<ellipse cx="{x}" cy="{y}" rx="{r}" ry="{r*0.8}" fill="#e6c22a" opacity=".8"/>' for x,y,r in [(18,20,2),(46,22,1.6),(17,47,1.8),(47,48,2.2),(40,52,1.3),(22,54,1.2)])
  +f'<path d="M21 14 Q32 6 43 14Z" fill="#fff" stroke="{INK}" stroke-width="1.3"/><rect x="22" y="12.5" width="20" height="3" rx="1.5" fill="#2a6ad0"/>'
  +beyes('#3a8ad8',31,7,5,4)+bblush(38)
  +f'<path d="M26 40 Q32 47 38 40Z" fill="#7a2a3a" stroke="{INK}" stroke-width="1.2" stroke-linejoin="round"/><rect x="29.5" y="40" width="2.4" height="2.6" fill="#fff"/><rect x="32.1" y="40" width="2.4" height="2.6" fill="#fff"/>',
  ''.join(f'<circle cx="{x}" cy="{y}" r="{r}" fill="none" stroke="#e6faff" stroke-width="1" opacity=".7"/>' for x,y,r in [(7,22,2.2),(10,40,1.4),(56,16,1.8),(57,36,2.6)]))
# strawhat: straw hat red band, red open vest, big grin
u='bt'; B['strawhat']=badge(u,('#6ac6f4','#1a5aa0'),
  bbody('#d8322e','<path d="M26 50 L32 64 L38 50" fill="#f2c8a0" stroke="'+INK+'" stroke-width="1.2"/>')
  +bhead('#f4cfa6',u)
  +f'<path d="M15 27 Q15 21 20 19 L44 19 Q49 21 49 27 Q44 23 32 23 Q20 23 15 27Z" fill="#1a1622"/>'
  +f'<ellipse cx="32" cy="20" rx="25" ry="5.2" fill="#f2cf6a" stroke="{INK}" stroke-width="1.4"/><path d="M19 19 Q20 7 32 7 Q44 7 45 19Z" fill="#f2cf6a" stroke="{INK}" stroke-width="1.4"/><path d="M19.6 16 Q32 13.5 44.4 16 L44.8 19 Q32 16.5 19.2 19Z" fill="#d8322e"/><path d="M24 11 l2 3 M30 9 l1 3 M38 10 l-1 3" stroke="#d9a840" stroke-width=".8"/>'
  +beyes('#3a2a1a',32.5,7)+bblush(39)+bmouth('grin',40)
  +'<path d="M22.5 37.5 l3 .6" stroke="#b85a4a" stroke-width=".9" stroke-linecap="round"/>')
# speedster: blue hedgehog kid, quills, peach muzzle, green eyes
u='bq'; B['speedster']=badge(u,('#b4ee7a','#2c7a3a'),
  bbody('#2f6ae0','<ellipse cx="32" cy="58" rx="9" ry="7" fill="#f6d2a8" stroke="'+INK+'" stroke-width="1.2"/>')
  +f'<path d="M14 30 L2 24 L14 20 L5 9 L19 13 L18 2 L28 11 L36 2 L40 12 L52 6 L48 18 L60 20 L50 28 Z" fill="#2f6ae0" stroke="{INK}" stroke-width="1.4" stroke-linejoin="round"/>'
  +f'<ellipse cx="32" cy="31" rx="17" ry="16" fill="#2f6ae0" stroke="{INK}" stroke-width="1.5"/><ellipse cx="32" cy="31" rx="17" ry="16" fill="url(#{u}sk)"/>'
  +f'<path d="M17 18 L13 8 L23 14Z M47 18 L51 8 L41 14Z" fill="#2f6ae0" stroke="{INK}" stroke-width="1.3" stroke-linejoin="round"/><path d="M18 16 L16 11 L21 14Z M46 16 L48 11 L43 14Z" fill="#f6b8a8"/>'
  +f'<path d="M19 33 Q19 25 26 25 Q32 27 38 25 Q45 25 45 33 Q45 46 32 46 Q19 46 19 33Z" fill="#f6d2a8" stroke="{INK}" stroke-width="1.2"/>'
  +beyes('#2fbf5a',32,6.2,4.4,3.2)+f'<ellipse cx="32" cy="38" rx="2" ry="1.4" fill="#1a1622"/>'+bmouth('smirk',41.5)+bblush(39))
# NEW notebookgenius: neat brown hair side part, beige blazer + tie, black notebook, calm smile
u='bn'; B['notebookgenius']=badge(u,('#c0485a','#2a0c18'),
  bbody('#c9b28a','<path d="M27 50 L32 56 L37 50" fill="#fff"/><path d="M31 52 L33 52 L33.6 60 L32 62 L30.4 60Z" fill="#7a2030"/><path d="M27 50 L22 62 M37 50 L42 62" stroke="#a8916a" stroke-width="1.2"/>')
  +f'<rect x="37" y="45" width="15" height="19" rx="1.5" fill="#15101a" stroke="{INK}" stroke-width="1.2" transform="rotate(-10 44 54)"/><path d="M40 48 H49" stroke="#3a3048" stroke-width="1" transform="rotate(-10 44 54)"/>'
  +bhead('#f2d6be',u)
  +f'<path d="M14.5 31 Q12 14 30 12 Q46 11 50 22 Q50.5 27 49.5 31 Q47 22 40 20 Q37 25 30 24 Q22 24 20 20 Q16 24 14.5 31Z" fill="#7a4a2a" stroke="{INK}" stroke-width="1.5" stroke-linejoin="round"/><path d="M30 14 Q38 13 44 17" stroke="#a8724a" stroke-width="1.2" fill="none" stroke-linecap="round"/>'
  +beyes('#7a3a2a',33,7,shape='calm')+bblush(39)+bmouth('smirk',41),
  '')
# NEW sweetsleuth: messy black hair, tired eyes, white tee, thumb at lip, cake slice + sugar cubes
u='bd'; B['sweetsleuth']=badge(u,('#7aa0d8','#18264a'),
  bbody('#f4f4f8')
  +bhead('#f6e2d4',u)
  +f'<path d="M13 33 L10 26 L15 25 L11 17 L18 18 L16 10 L23 13 L25 6 L30 11 L34 5 L37 11 L43 7 L43 14 L50 12 L47 19 L54 21 L49 26 L53 31 L49 30 Q47 22 40 21 L37 25 L33 21 L29 25 L26 21 L21 24 L18 21 Q15 25 13 33Z" fill="#14121a" stroke="{INK}" stroke-width="1.4" stroke-linejoin="round"/>'
  +beyes('#15101f',33,7,4,3.4,shape='tired')+bmouth('o',39)
  +f'<path d="M30.6 41.4 Q29.6 44 30.4 47" stroke="{INK}" stroke-width="3.6" stroke-linecap="round" fill="none"/><path d="M30.6 41.4 Q29.6 44 30.4 47" stroke="#f6e2d4" stroke-width="2" stroke-linecap="round" fill="none"/><ellipse cx="31" cy="50" rx="4.2" ry="3.4" fill="#f6e2d4" stroke="{INK}" stroke-width="1.2"/><path d="M28.4 49 h5 M28.6 51 h4.6" stroke="#d8b8a4" stroke-width=".7"/>'
  +f'<g transform="translate(6 46)"><path d="M0 12 L14 12 L14 5 Z" fill="#fff4e0" stroke="{INK}" stroke-width="1.1" stroke-linejoin="round"/><path d="M14 5 L0 12 L14 8Z" fill="#ffb3c6"/><circle cx="12" cy="3.5" r="2.4" fill="#e8344a" stroke="{INK}" stroke-width=".8"/></g>'
  +f'<rect x="49" y="52" width="6" height="6" rx="1" fill="#fff" stroke="{INK}" stroke-width="1"/><rect x="53" y="47" width="5" height="5" rx="1" fill="#fff" stroke="{INK}" stroke-width="1"/>')

# ---------------- A: refined (today's proportions, more detail) ----------------
def ashoulders(fill,extra=''):
    return f'<path d="M6 64 Q8 45 32 43 Q56 45 58 64Z" fill="{fill}"/><path d="M8 62 Q12 47 32 45" stroke="#fff" stroke-opacity=".18" stroke-width="1.5" fill="none"/>{extra}'
def aface(skin,uid,cy=30,r=12):
    return f'<rect x="28" y="38" width="8" height="7" fill="{skin}"/><rect x="28" y="38" width="8" height="3" fill="#000" opacity=".12"/><circle cx="32" cy="{cy}" r="{r}" fill="{skin}"/><circle cx="32" cy="{cy}" r="{r}" fill="url(#{uid}sk)"/>'
def aeyes(iris='#3a2a5a',y=30,dx=5):
    s=''
    for x in (32-dx,32+dx):
        s+=f'<ellipse cx="{x}" cy="{y}" rx="2" ry="2.5" fill="#1d1430"/><ellipse cx="{x}" cy="{y+0.5}" rx="1.3" ry="1.6" fill="{iris}"/><circle cx="{x+0.7}" cy="{y-0.9}" r=".75" fill="#fff"/><circle cx="{x-0.5}" cy="{y+1}" r=".35" fill="#fff"/>'
    return s
def ablush(y=34):
    return f'<ellipse cx="24.5" cy="{y}" rx="2.2" ry="1.2" fill="#ff8fa3" opacity=".5"/><ellipse cx="39.5" cy="{y}" rx="2.2" ry="1.2" fill="#ff8fa3" opacity=".5"/>'
def anose(y=32.5):
    return f'<path d="M31.4 {y} Q32 {y+1.2} 32.8 {y}" stroke="#c8906a" stroke-width=".8" fill="none" stroke-linecap="round"/>'
def amouth(kind='smile',y=36):
    return {'smile':f'<path d="M28.5 {y} Q32 {y+3} 35.5 {y}" stroke="#6b2f2f" stroke-width="1.4" fill="none" stroke-linecap="round"/>',
      'grin':f'<path d="M27 {y-0.6} Q32 {y+5} 37 {y-0.6}Z" fill="#7a2a3a"/><path d="M28 {y-0.2} H36" stroke="#fff" stroke-width="1.1"/>',
      'smirk':f'<path d="M29.5 {y+0.6} Q33 {y+1.4} 35.5 {y-0.6}" stroke="#6b2f2f" stroke-width="1.4" fill="none" stroke-linecap="round"/>',
      'o':f'<ellipse cx="32" cy="{y+0.5}" rx="1.3" ry="1.6" fill="#6b2f2f"/>'}[kind]
A={}
u='ah'; A['hacker']=badge(u,('#1f8a4a','#05240f'),
  ashoulders('#14141a','<path d="M24 43 L32 58 L40 43" stroke="#2c2c36" stroke-width="2" fill="none"/><path d="M18 50 L24 45 M46 50 L40 45" stroke="#2c2c36" stroke-width="1.3"/>')
  +aface('#e9c6a6',u)+f'<path d="M20 28 Q19 15 32 15 Q45 15 44 28 Q41 19 32 19.5 Q23 19 20 28Z" fill="#121216"/><path d="M25 17 Q32 15.5 39 17.5" stroke="#3a3a48" stroke-width="1" fill="none"/>'
  +'<ellipse cx="27" cy="30" rx="4.2" ry="2.6" fill="#0a0a0c"/><ellipse cx="37" cy="30" rx="4.2" ry="2.6" fill="#0a0a0c"/><path d="M31 30 H33" stroke="#0a0a0a" stroke-width="1.2"/><path d="M24.5 29.2 l2.4 -.7 M34.5 29.2 l2.4 -.7" stroke="#5dff9a" stroke-width=".7"/>'
  +anose(33)+amouth('smirk',36),
  '<g fill="#5dff9a" opacity=".3" font-family="monospace" font-size="5"><text x="6" y="12">1 0 1</text><text x="44" y="20">0 1</text><text x="6" y="44">01</text><text x="48" y="40">1 0</text></g><path d="M0 64 L64 0" stroke="#5dff9a" stroke-opacity=".06" stroke-width="12"/>')
u='aw'; A['wizardboy']=badge(u,('#c9a24a','#5a3a12'),
  ashoulders('#1a1822','<path d="M22 45 Q32 51 42 45 L42 49 Q32 55 22 49Z" fill="#8e1f2c"/><path d="M26 47.5 l1.5 3 M31 49 l1 3 M37 48 l-1 3" stroke="#e6b13c" stroke-width="1.6"/>')
  +aface('#f0d0b2',u)+f'<path d="M19 29 Q17 19 23 16 Q26 12 32 13.5 Q39 12 42 16 Q47 19 45 29 Q43 22 40 21 Q38 24 35 21.5 Q32 24 29 21.5 Q26 24 24 21 Q21 23 19 29Z" fill="#17141c"/><path d="M24 16 Q30 14 36 15.5" stroke="#3c3448" stroke-width="1" fill="none"/>'
  +aeyes('#3fae5a',30.5)+'<circle cx="27" cy="30.5" r="3.6" fill="none" stroke="#2a2030" stroke-width="1.1"/><circle cx="37" cy="30.5" r="3.6" fill="none" stroke="#2a2030" stroke-width="1.1"/><path d="M30.6 30.3 H33.4" stroke="#2a2030" stroke-width="1"/>'
  +anose(34)+amouth('smile',36.5)+ablush(35),
  '<path d="M52 12 l1 2.4 2.6 .3 -2 1.7 .5 2.6 -2.1 -1.4 -2.2 1.4 .6 -2.6 -2 -1.7 2.6 -.3z" fill="#fff3c0"/><circle cx="10" cy="18" r="1" fill="#fff3c0"/>')
u='as'; A['scientist']=badge(u,('#3a8a76','#123a32'),
  ashoulders('#f0f2f6','<path d="M26 43 L32 52 L38 43" fill="#8fd0e8"/><path d="M32 52 V64" stroke="#c8ccd6" stroke-width="1"/><rect x="40" y="52" width="6" height="2" rx="1" fill="#8fd0e8"/>')
  +aface('#eed4c0',u)+'<path d="M20 25 L13 19 L21 18 L17 9 L25 13 L27 5 L32 12 L37 5 L39 13 L47 9 L43 18 L51 19 L44 25 Q40 18 32 18 Q24 18 20 25Z" fill="#c4e6f4"/><path d="M24 14 L27 18 M38 14 L36 18" stroke="#9cc6d8" stroke-width=".9"/>'
  +'<path d="M24 26.5 Q27.5 25 31 26.5 M33 26.5 Q36.5 25 40 26.5" stroke="#9cc6d8" stroke-width="2" fill="none" stroke-linecap="round"/>'
  +aeyes('#6a7a8a',30.5)+anose(33.5)+amouth('grin',36.5),
  '<g fill="none" stroke="#8affc8" stroke-width="1.6" opacity=".35"><path d="M54 50 a8 8 0 1 1 -2 -10 a5 5 0 1 1 -3 7"/></g>')
u='ap'; A['sponge']=badge(u,('#7adcf6','#1a6aa8'),
  f'<rect x="14" y="12" width="36" height="42" rx="5" fill="#ffe25a"/><rect x="14" y="12" width="36" height="42" rx="5" fill="url(#{u}sk)"/>'
  +''.join(f'<ellipse cx="{x}" cy="{y}" rx="{r}" ry="{r*0.8}" fill="#d9b82a" opacity=".85"/>' for x,y,r in [(19,18,2),(45,20,1.6),(18,46,1.8),(46,47,2.2),(40,50,1.2),(22,51,1.1)])
  +'<path d="M22 13 Q32 6 42 13Z" fill="#fff"/><rect x="23" y="11.5" width="18" height="2.6" rx="1.3" fill="#2a6ad0"/>'
  +aeyes('#3a8ad8',29,6.5).replace('rx="2" ry="2.5"','rx="3.6" ry="4.2"').replace('rx="1.3" ry="1.6"','rx="2.4" ry="2.8"')
  +'<path d="M26 38 Q32 44 38 38Z" fill="#7a2a3a"/><rect x="29.6" y="38" width="2.2" height="2.4" fill="#fff"/><rect x="32.2" y="38" width="2.2" height="2.4" fill="#fff"/>'+ablush(36),
  ''.join(f'<circle cx="{x}" cy="{y}" r="{r}" fill="none" stroke="#e6faff" stroke-width=".9" opacity=".6"/>' for x,y,r in [(7,22,2),(9,40,1.3),(56,14,1.6),(57,36,2.4)]))
u='at'; A['strawhat']=badge(u,('#68bdf0','#1f5a9a'),
  ashoulders('#d8322e','<path d="M27 43 L32 56 L37 43" fill="#e9b88e"/>')
  +aface('#f0c8a0',u)+'<path d="M20 27 Q20 21 24 19 L40 19 Q44 21 44 27 Q40 23 32 23 Q24 23 20 27Z" fill="#17141c"/>'
  +'<ellipse cx="32" cy="20" rx="20" ry="4.2" fill="#f2cf6a"/><path d="M22 19.5 Q23 9 32 9 Q41 9 42 19.5Z" fill="#f2cf6a"/><path d="M22.4 16.6 Q32 14.4 41.6 16.6 L41.9 19.2 Q32 17 22.1 19.2Z" fill="#d8322e"/><path d="M26 12 l1.6 2.6 M31 10.5 l.8 2.6 M37 11.5 l-.8 2.6" stroke="#d9a840" stroke-width=".7"/>'
  +aeyes('#3a2a1a',30)+anose(33)+amouth('grin',35.5)+'<path d="M24.5 33.5 l2.6 .5" stroke="#b85a4a" stroke-width=".8"/>')
u='aq'; A['speedster']=badge(u,('#a6e86e','#2c6f36'),
  ashoulders('#2f6ae0','<ellipse cx="32" cy="58" rx="8" ry="6" fill="#f6d2a8"/>')
  +'<path d="M18 30 L6 26 L17 21 L9 12 L21 15 L21 5 L29 13 L36 5 L39 14 L50 9 L46 20 L57 22 L47 29Z" fill="#2f6ae0"/>'
  +f'<circle cx="32" cy="31" r="13" fill="#2f6ae0"/><circle cx="32" cy="31" r="13" fill="url(#{u}sk)"/><path d="M20 20 L17 12 L25 17Z M44 20 L47 12 L39 17Z" fill="#2f6ae0"/><path d="M21 18 L19.5 14 L23.5 16.5Z M43 18 L44.5 14 L40.5 16.5Z" fill="#f6b8a8"/>'
  +'<path d="M22 33 Q22 27 27 27 Q32 29 37 27 Q42 27 42 33 Q42 42 32 42 Q22 42 22 33Z" fill="#f6d2a8"/>'
  +aeyes('#2fbf5a',30,4.6).replace('rx="2" ry="2.5"','rx="2.6" ry="3.2"')+'<ellipse cx="32" cy="35" rx="1.6" ry="1.1" fill="#17141c"/>'+amouth('smirk',37.5))
u='an'; A['notebookgenius']=badge(u,('#b8485a','#3a1018'),
  ashoulders('#c9b28a','<path d="M27 43 L32 49 L37 43" fill="#fff"/><path d="M31.2 45 H32.8 L33.4 54 L32 56 L30.6 54Z" fill="#7a2030"/>')
  +'<rect x="40" y="46" width="13" height="16" rx="1.2" fill="#15101a" transform="rotate(-10 46 54)"/><path d="M42.5 49 H50" stroke="#3a3048" stroke-width=".9" transform="rotate(-10 46 54)"/>'
  +aface('#f0d4bc',u)+'<path d="M19.5 30 Q18 16 31 15 Q44 15 44.5 26 Q44.6 28 44 30 Q42 22 37 21 Q34 24 29 23 Q24 23 22 21 Q20 25 19.5 30Z" fill="#7a4a2a"/><path d="M29 16.5 Q36 15.5 41 19" stroke="#a8724a" stroke-width="1" fill="none"/>'
  +'<path d="M25 30.4 Q27 28.6 29 30.4 Q27 31.6 25 30.4Z M35 30.4 Q37 28.6 39 30.4 Q37 31.6 35 30.4Z" fill="#8a2a3a"/><path d="M24.6 30.2 Q27 28 29.4 30.2 M34.6 30.2 Q37 28 39.4 30.2" stroke="#1d1430" stroke-width="1" fill="none"/>'
  +anose(33)+amouth('smirk',36))
u='ad'; A['sweetsleuth']=badge(u,('#7aa0d8','#1a2a50'),
  ashoulders('#f2f2f6')
  +aface('#f4e0d2',u)+'<path d="M18 32 L15 26 L19 25 L16 18 L22 19 L21 12 L27 15 L29 9 L33 14 L37 8 L39 14 L45 11 L44 17 L50 18 L46 23 L49 28 L45 27 Q44 21 38 20 L35 23 L32 20 L29 23 L26 20 L22 23 Q20 26 18 32Z" fill="#14121a"/>'
  +'<ellipse cx="27" cy="30" rx="2.3" ry="2.6" fill="#1d1430"/><ellipse cx="37" cy="30" rx="2.3" ry="2.6" fill="#1d1430"/><circle cx="27.7" cy="29.2" r=".7" fill="#fff"/><circle cx="37.7" cy="29.2" r=".7" fill="#fff"/><path d="M24 33.5 Q27 35 30 33.5 M34 33.5 Q37 35 40 33.5" stroke="#6a5a82" stroke-width="1.2" fill="none" opacity=".7"/>'
  +'<ellipse cx="32" cy="37" rx="1.2" ry="1.4" fill="#6b2f2f"/><path d="M31.2 37.6 Q30.4 40 31 43" stroke="#d8b8a4" stroke-width="2.8" stroke-linecap="round" fill="none"/><path d="M31.2 37.6 Q30.4 40 31 43" stroke="#f4e0d2" stroke-width="1.8" stroke-linecap="round" fill="none"/><ellipse cx="31.5" cy="45.5" rx="3.6" ry="2.8" fill="#f4e0d2" stroke="#d8b8a4" stroke-width=".7"/>'
  +'<g transform="translate(8 48)"><path d="M0 11 L12 11 L12 4 Z" fill="#fff4e0"/><path d="M12 4 L0 11 L12 7Z" fill="#ffb3c6"/><circle cx="10.5" cy="3" r="2.2" fill="#e8344a"/></g><rect x="47" y="53" width="5.5" height="5.5" rx="1" fill="#fff"/><rect x="51" y="48" width="4.6" height="4.6" rx="1" fill="#fff"/>')
for k,v in B.items(): open(f'{OUT}/B/{k}.svg','w').write(v)
for k,v in A.items(): open(f'{OUT}/A/{k}.svg','w').write(v)
print(len(A),len(B))
