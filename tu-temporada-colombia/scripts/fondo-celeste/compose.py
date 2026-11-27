import json,os,sys
import numpy as np
from PIL import Image, ImageFilter
from scipy import ndimage as ndi
root='/home/claude/tu-temporada-colombia-actualizada/tu-temporada-colombia/'
BG=np.array([0xCF,0xE0,0xEA],np.float32)
cfg=json.load(open('cfg.json')) if os.path.exists('cfg.json') else {}
only=sys.argv[1].split(',') if len(sys.argv)>1 else None
def bg_estimate(img,mask):
    # fondo original: promedio local de los píxeles seguros de fondo, propagado hacia el producto
    sure=mask<0.02
    out=np.zeros_like(img)
    for c in range(3):
        ch=np.where(sure,img[...,c],0); w=sure.astype(np.float32)
        num=ndi.gaussian_filter(ch,25); den=ndi.gaussian_filter(w,25)
        out[...,c]=num/np.maximum(den,1e-4)
    # donde no hay fondo cerca, usar la mediana global del fondo
    med=np.median(img[sure],axis=0) if sure.any() else np.array([220,210,204],np.float32)
    far=ndi.gaussian_filter(sure.astype(np.float32),25)<1e-3
    out[far]=med
    return out
for p in json.load(open('list.json')):
    k=os.path.basename(p)[:-5]
    if only and k not in only: continue
    c=cfg.get(k,{})
    img=np.asarray(Image.open(root+p).convert('RGB'),np.float32)
    m=np.asarray(Image.open(f"cut/{k}.{c.get('model','isnet-general-use')}.png").convert('L'),np.float32)/255
    # limpiar: quitar islas pequeñas (motas) y rellenar huecos sólidos
    lab,n=ndi.label(m>0.5)
    if n>1:
        sizes=ndi.sum(np.ones_like(m),lab,range(1,n+1)); keep=np.zeros(n+1,bool)
        keep[1:]=sizes>=sizes.max()*c.get('minfrac',0.004)
        m=m*keep[lab]+m*(lab==0)*(ndi.binary_dilation(keep[lab],iterations=3))
    for box in c.get('erase',[]):   # [x0,y0,x1,y1] en fracción: zonas que no son producto
        H,W=m.shape; m[int(box[1]*H):int(box[3]*H),int(box[0]*W):int(box[2]*W)]=0
    for box in c.get('keep',[]):    # zonas que sí son producto/logo y deben conservarse completas
        H,W=m.shape; y0,y1,x0,x1=int(box[1]*H),int(box[3]*H),int(box[0]*W),int(box[2]*W)
        m[y0:y1,x0:x1]=np.maximum(m[y0:y1,x0:x1],c.get('keepval',1.0))
    if c.get('hull_dark'):
        import cv2
        lum=img.mean(axis=2); dark=((lum<c['hull_dark'])&(m>0.5)).astype(np.uint8)
        lab2,n2=ndi.label(dark)
        if n2:
            sz=ndi.sum(dark,lab2,range(1,n2+1)); dark=(lab2==(np.argmax(sz)+1)).astype(np.uint8)
        pts=cv2.findNonZero(dark); hull=cv2.convexHull(pts)
        hm=np.zeros_like(dark); cv2.fillConvexPoly(hm,hull,1)
        hm=cv2.dilate(hm,np.ones((5,5),np.uint8))
        m=m*hm
    m=np.clip((m-0.04)/0.92,0,1)
    B=bg_estimate(img,m)
    a=m[...,None]
    # descontaminar bordes: F = (C - (1-a)B)/a en el borde semitransparente
    F=np.where(a>0.05,(img-(1-a)*B)/np.maximum(a,0.05),img)
    F=np.clip(F,0,255)
    edge=(a>0)&(a<0.98)
    F=np.where(edge,F,img)
    if c.get('tint'):  # zonas transparentes: el fondo viejo que se ve a través pasa al celeste
        thr=c['tint']; d=np.linalg.norm(img-B,axis=2)
        w=np.clip(1-d/thr,0,1)[...,None]*(a>0.02)
        F=np.clip(F+w*(BG-B),0,255)
    # reencuadre: centrar el producto conservando su tamaño (y achicar solo si se sale del margen)
    H,W=m.shape; ys,xs=np.where(m>0.3)
    y0,y1,x0,x1=ys.min(),ys.max(),xs.min(),xs.max()
    bw,bh=x1-x0+1,y1-y0+1
    fill=c.get('fill',0.86)
    s=min(1.0,fill*W/bw,fill*H/bh)
    up=c.get('up',1.0)
    s=max(s,min(up,fill*W/bw,fill*H/bh)) if up>1 else s
    rgba=np.dstack([F,m*255]).astype(np.uint8)
    prod=Image.fromarray(rgba,'RGBA').crop((x0,y0,x1+1,y1+1))
    if s!=1.0: prod=prod.resize((max(1,round(bw*s)),max(1,round(bh*s))),Image.LANCZOS)
    canvas=Image.new('RGBA',(W,H),tuple(int(v) for v in BG)+(255,))
    cx=(W-prod.width)//2; cy=(H-prod.height)//2+int(c.get('dy',0)*H)
    canvas.alpha_composite(prod,(cx,cy))
    out=np.asarray(canvas.convert('RGB')).copy(); H2,W2=out.shape[:2]
    yy,xx=np.mgrid[0:H2,0:W2]
    for e in c.get('erase_out',[]):  # {box:[x0,y0,x1,y1], spare:[cx,cy,r]} en fracción del lienzo final
        b=e['box']; sel=(xx>=b[0]*W2)&(xx<b[2]*W2)&(yy>=b[1]*H2)&(yy<b[3]*H2)
        if 'spare' in e:
            cx2,cy2,r=e['spare']; sel&=((xx/W2-cx2)**2+(yy/W2-cy2*H2/W2)**2)>r**2
        out[sel]=BG.astype(np.uint8)
    canvas=Image.fromarray(out)
    canvas.convert('RGB').save(f'out/{k}.png'); print(k, f'bbox {bw}x{bh} of {W}x{H} s={s:.2f}',flush=True)
