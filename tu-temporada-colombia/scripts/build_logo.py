import uharfbuzz as hb, io, os
from fontTools.ttLib import TTFont
from fontTools.varLib import instancer
from fontTools.pens.svgPathPen import SVGPathPen
from fontTools.pens.transformPen import TransformPen
from fontTools.pens.boundsPen import BoundsPen
N=os.environ.get('NODE_MODULES', os.path.join(os.path.dirname(__file__), '..', 'node_modules'))  # @fontsource/yellowtail, @fontsource-variable/montserrat
YT=f'{N}/@fontsource/yellowtail/files/yellowtail-latin-400-normal.woff2'
MO=f'{N}/@fontsource-variable/montserrat/files/montserrat-latin-wght-normal.woff2'
def load(path, loc=None):
    f=TTFont(path); f.flavor=None
    if loc: f=instancer.instantiateVariableFont(f, loc)
    b=io.BytesIO(); f.save(b); return b.getvalue(), TTFont(io.BytesIO(b.getvalue()))
def shape(font, text, size, x0, base, track=0.0):
    data, tt = font
    face=hb.Face(data); hf=hb.Font(face); upem=face.upem
    buf=hb.Buffer(); buf.add_str(text); buf.guess_segment_properties(); hb.shape(hf, buf, {"kern":True})
    gs=tt.getGlyphSet(); order=tt.getGlyphOrder(); sc=size/upem
    out=[]; x=x0; bp=BoundsPen(gs); xmin=ymin=1e9; xmax=ymax=-1e9
    for info,pos in zip(buf.glyph_infos, buf.glyph_positions):
        name=order[info.codepoint]
        pen=SVGPathPen(gs, ntos=lambda v: ("%.1f" % v).rstrip("0").rstrip("."))
        t=(sc,0,0,-sc,x+pos.x_offset*sc,base-pos.y_offset*sc)
        gs[name].draw(TransformPen(pen,t))
        b=BoundsPen(gs); gs[name].draw(b)
        if b.bounds:
            x0b,y0b,x1b,y1b=b.bounds
            xmin=min(xmin,t[4]+x0b*sc); xmax=max(xmax,t[4]+x1b*sc); ymin=min(ymin,base-y1b*sc); ymax=max(ymax,base-y0b*sc)
        out.append(pen.getCommands()); x+=pos.x_advance*sc+track*size
    return ' '.join(out), (xmin,ymin,xmax,ymax), x
yt=load(YT); mo6=load(MO,{"wght":620}); mo5=load(MO,{"wght":500})

def house(x, y, w, sw):
    """Techo con chimenea y ventana 2×2 (el ADN del original), en trazo limpio."""
    h=w*0.42; ax=x+w*0.5; ay=y
    lx, ly = x, y+h; rx, ry = x+w, y+h
    # chimenea sobre la vertiente derecha
    cx=x+w*0.74; cw=w*0.075
    t=(cx-ax)/(rx-ax); cy_roof=ay+(ry-ay)*t
    ctop=y+h*0.12
    roof=f'<path d="M{lx:.1f} {ly:.1f} L{ax:.1f} {ay:.1f} L{rx:.1f} {ry:.1f}" fill="none" stroke="C" stroke-width="{sw:.2f}" stroke-linecap="butt" stroke-linejoin="miter"/>'
    chim=f'<path d="M{cx:.1f} {cy_roof-sw*0.3:.1f} V{ctop:.1f} H{cx+cw:.1f} V{cy_roof+ (cw/(rx-ax))*(ry-ay) - sw*0.3:.1f}" fill="none" stroke="C" stroke-width="{sw*0.9:.2f}" stroke-linejoin="miter"/>'
    s=w*0.062; g=w*0.016; wx=ax-s-g/2; wy=y+h*0.5
    win=''.join(f'<rect x="{wx+i*(s+g):.1f}" y="{wy+j*(s+g):.1f}" width="{s:.1f}" height="{s:.1f}" rx="{s*0.08:.2f}" fill="C"/>' for i in (0,1) for j in (0,1))
    return roof+chim+win, (lx, ay, rx, ly)

def house_free(lx, rx, by, pitch, sw, win=True):
    """Techo de dos aguas entre lx y rx con base en by; chimenea en la vertiente derecha y ventana 2×2."""
    w=rx-lx; h=w*pitch; ax=lx+w/2; ay=by-h
    roof=f'<path d="M{lx:.1f} {by:.1f} L{ax:.1f} {ay:.1f} L{rx:.1f} {by:.1f}" fill="none" stroke="C" stroke-width="{sw:.2f}" stroke-linejoin="miter"/>'
    cx=lx+w*0.74; cw=w*0.07
    yr=lambda x: ay+(by-ay)*(x-ax)/(rx-ax)
    ctop=ay+h*0.18
    chim=f'<path d="M{cx:.1f} {yr(cx)-sw*0.2:.1f} V{ctop:.1f} H{cx+cw:.1f} V{yr(cx+cw)-sw*0.2:.1f}" fill="none" stroke="C" stroke-width="{sw*0.9:.2f}"/>'
    out=roof+chim
    if win:
        q=w*0.055; g=w*0.014; wx=ax-q-g/2; wy=ay+h*0.42
        out+=''.join(f'<rect x="{wx+i*(q+g):.1f}" y="{wy+j*(q+g):.1f}" width="{q:.1f}" height="{q:.1f}" rx="{q*0.1:.2f}" fill="C"/>' for i in (0,1) for j in (0,1))
    return out, ay

def stacked():
    S=100; base=200
    tp, tb, tx = shape(mo6, "temporada", S, 0, base, track=-0.03)
    W=tb[2]-tb[0]
    tu, ub, ux = shape(yt, "tu", S*1.28, tb[0]+W*0.0, tb[1]-S*0.08)
    tuW=ub[2]-ub[0]
    roofBase=ub[1]+ (ub[3]-ub[1])*0.46
    lx=ub[0]+tuW*0.62; rx=tb[0]+W*0.92
    hs, ay = house_free(lx, rx, roofBase, 0.34, S*0.072)
    # horizonte (swash) bajo el techo, como en el original
    sx0=ub[2]-S*0.02; sy0=(roofBase+tb[1])/2+S*0.04
    swash=f'<path d="M{sx0:.1f} {sy0:.1f} C {sx0+W*0.2:.1f} {sy0-S*0.12:.1f}, {rx-W*0.22:.1f} {sy0-S*0.12:.1f}, {rx+S*0.04:.1f} {sy0-S*0.03:.1f}" fill="none" stroke="C" stroke-width="{S*0.03:.2f}" stroke-linecap="round"/>'
    cs=S*0.2; cy=base+S*0.42
    co, cb, cx = shape(mo5, "COLOMBIA", cs, 0, cy, track=0.38)
    cw=cb[2]-cb[0]; off=tb[0]+(W-cw)/2-cb[0]
    co, cb, cx = shape(mo5, "COLOMBIA", cs, off, cy, track=0.38)
    rule=W*0.11; gap=S*0.16; ry=cy-cs*0.36
    rules=f'<path d="M{cb[0]-gap-rule:.1f} {ry:.1f} H{cb[0]-gap:.1f} M{cb[2]+gap:.1f} {ry:.1f} H{cb[2]+gap+rule:.1f}" stroke="C" stroke-opacity="SUB" stroke-width="{S*0.018:.2f}" fill="none"/>'
    x0=min(tb[0], cb[0]-gap-rule, ub[0])-4; x1=max(tb[2], cb[2]+gap+rule, rx)+4; y0=min(ay, ub[1])-6; y1=cb[3]+6
    body=hs+f'<path d="{tu}" fill="C"/>'+swash+f'<path d="{tp}" fill="C"/>'+f'<path d="{co}" fill="C" fill-opacity="SUB"/>'+rules
    return body, (x0,y0,x1-x0,y1-y0)

def horizontal(sub=True):
    S=100; base=100
    # marca (casa) a la izquierda
    hw=S*1.1; hs, ay = house_free(0, hw, base-S*0.18, 0.4, S*0.085)
    hb_=(0, ay, hw, base)
    tu, ub, ux = shape(yt, "tu", S*0.95, hw+S*0.2, base-S*0.06)
    tp, tb, tx = shape(mo6, "temporada", S*0.78, ub[2]+S*0.12, base-S*0.06, track=-0.03)
    cs=S*0.2; cy=base+S*0.3
    co, cb, cx = shape(mo5, "COLOMBIA", cs, tb[0]+S*0.01, cy, track=0.38)
    rule=f'<path d="M{cb[2]+S*0.12:.1f} {cy-cs*0.36:.1f} H{tb[2]:.1f}" stroke="C" stroke-opacity="SUB" stroke-width="{S*0.018:.2f}"/>'
    x0=-3; x1=tb[2]+3; y0=min(hb_[1], ub[1], tb[1])-4; y1=max(cb[3] if sub else base, tb[3], ub[3])+4
    body=hs+f'<path d="{tu}" fill="C"/><path d="{tp}" fill="C"/>'+(f'<path d="{co}" fill="C" fill-opacity="SUB"/>'+rule if sub else '')
    return body, (x0,y0,x1-x0,y1-y0)

def mark(bg=None, fg='C'):
    hs, _ = house_free(2.6, 21.4, 17.6, 0.4, 1.9)
    b=f'<rect width="24" height="24" rx="5.5" fill="{bg}"/>' if bg else ''
    return f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">{b}{hs.replace("C", fg)}</svg>'

def svg(body, vb, color, sub="0.62", label=True):
    x,y,w,h=vb
    aria=' role="img" aria-label="Tu Temporada Colombia"' if label else ' aria-hidden="true" focusable="false"'
    return f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="{x:.1f} {y:.1f} {w:.1f} {h:.1f}"{aria}>'+body.replace('"C"',f'"{color}"').replace('SUB',sub)+'</svg>'

out=os.environ.get('OUT','.')
sb, svb = stacked(); hb2, hvb = horizontal(); cb2, cvb = horizontal(sub=False)
for name,(b,vb) in {'logo':(sb,svb),'logo-horizontal':(hb2,hvb),'logo-compact':(cb2,cvb)}.items():
    open(f'{out}/{name}-black.svg','w').write(svg(b,vb,'#111111'))
    open(f'{out}/{name}-white.svg','w').write(svg(b,vb,'#FFFFFF','0.7'))
    open(f'{out}/{name}-inline.svg','w').write(svg(b,vb,'currentColor','0.62',label=False))
open(f'{out}/mark-black.svg','w').write(mark(fg='#111111'))
open(f'{out}/mark-white.svg','w').write(mark(fg='#FFFFFF'))
open(f'{out}/favicon.svg','w').write(mark(bg='#111111', fg='#F7F7F5'))
print('ok', svb, hvb)
