import collections, json, os
# Lee las listas de BodyParts3D (carpeta bp3d/) y genera manifest.json con las mallas de cada estructura.
import pathlib
HERE=pathlib.Path(__file__).resolve().parent
S=str(HERE/'bp3d')+'/'
m=collections.defaultdict(set)
for fn in ['isa_element_parts.txt','partof_element_parts.txt']:
    for line in open(S+fn):
        p=line.rstrip('\n').split('\t')
        if len(p)<3 or p[0]=='concept id': continue
        m[p[1]].add(p[2])
ORD=['first','second','third','fourth','fifth','sixth','seventh','eighth','ninth','tenth','eleventh','twelfth']
items=[]
def add(id_, concepts=None, files=None, kind='bone'):
    fs=set(files or [])
    for c in concepts or []:
        if c not in m: raise SystemExit('missing '+c)
        fs|=m[c]
    items.append({'id':id_,'kind':kind,'files':sorted(fs)})
# ---- huesos
add('C1',['atlas']); add('C2',['axis'])
for i in range(3,8): add(f'C{i}',[f'{ORD[i-1]} cervical vertebra'])
for i in range(1,13): add(f'T{i}',[f'{ORD[i-1]} thoracic vertebra'])
for i in range(1,6): add(f'L{i}',[f'{ORD[i-1]} lumbar vertebra'])
add('sacro',['sacrum'])
for side,S_ in (('right','R'),('left','L')):
    for i in range(1,13): add(f'costilla{i}_{S_}',[f'{side} {ORD[i-1]} rib'])
    for i in range(1,8): add(f'cartilago{i}_{S_}',[f'{side} {ORD[i-1]} costal cartilage'],kind='cartilage')
    add(f'escapula_{S_}',[f'{side} scapula']); add(f'clavicula_{S_}',[f'{side} clavicle'])
    add(f'humero_{S_}',[f'{side} humerus']); add(f'coxal_{S_}',[f'{side} hip bone'])
    add(f'temporal_{S_}',[f'{side} temporal bone'])
add('occipital',['occipital bone']); add('esternon',['sternum'])
add('disco_C2',['intervertebral disk of axis'],kind='disc')
for i in range(3,8): add(f'disco_C{i}',[f'intervertebral disk of {ORD[i-1]} cervical vertebra'],kind='disc')
for i in range(1,12): add(f'disco_T{i}',[f'intervertebral disk of {ORD[i-1]} thoracic vertebra'],kind='disc')
for i in range(1,6): add(f'disco_L{i}',[f'intervertebral disk of {ORD[i-1]} lumbar vertebra'],kind='disc')
# ---- músculos con lado explícito
sided={
 'trap_desc':'descending part of {s} trapezius','trap_trans':'transverse part of {s} trapezius','trap_asc':'ascending part of {s} trapezius',
 'romb_may':'{s} rhomboid major','romb_men':'{s} rhomboid minor','elev_esc':'{s} levator scapulae',
 'serr_ps':'{s} serratus posterior superior','serr_pi':'{s} serratus posterior inferior',
 'espl_cab':'{s} splenius capitis','espl_cue':'{s} splenius cervicis',
 'ilio_lum':'{s} iliocostalis lumborum','ilio_tor':'{s} iliocostalis thoracis','ilio_cer':'{s} iliocostalis cervicis',
 'long_tor':'{s} longissimus thoracis','long_cer':'{s} longissimus cervicis','long_cab':'{s} longissimus capitis',
 'espinoso':'{s} spinalis thoracis',
 'semi_tor':'{s} semispinalis thoracis','semi_cer':'{s} semispinalis cervicis','semi_cab':'{s} semispinalis capitis',
 'rot_cer':'{s} cervical rotator','rot_lum':'{s} lumbar rotator',
 'intesp_tor':'{s} interspinalis thoracis',
 'rcp_may':'{s} rectus capitis posterior major','rcp_men':'{s} rectus capitis posterior minor',
 'obl_sup':'{s} obliquus capitis superior','obl_inf':'{s} obliquus capitis inferior',
}
for k,v in sided.items():
    for side,S_ in (('right','R'),('left','L')):
        add(f'{k}_{S_}',[v.format(s=side)],kind='muscle')
for side,S_ in (('right','R'),('left','L')):
    add(f'elev_cost_{S_}',[f'set of {side} levatores costarum longi',f'set of {side} levatores costarum breves'],kind='muscle')
# ---- conjuntos sin lado: archivo base + espejo (M); el lado se decide por el signo de x al construir
mirror={'rot_tor':['thoracic rotator'],'intesp_cer':['set of interspinales cervicis'],'intesp_lum':['set of interspinales lumborum'],
 'intert_cer':['set of anterior cervical intertransversarii','set of posterior cervical intertransversarii'],
 'intert_lum':['medial lumbar intertransversarius','lateral lumbar intertransversarius']}
for k,cs in mirror.items():
    fs=set()
    for c in cs: fs|=m[c]
    items.append({'id':k,'kind':'muscle','files':sorted(fs),'splitBySide':True})
json.dump(items,open(HERE/'manifest.json','w'),indent=1)
print(len(items),'items', sum(len(i['files']) for i in items),'files')
