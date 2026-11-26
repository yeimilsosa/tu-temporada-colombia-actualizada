import json, sys, os
from rembg import remove, new_session
from PIL import Image
P=os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..') + '/'
jobs=json.load(open('jobs.json')); s=new_session(sys.argv[1] if len(sys.argv)>1 else 'isnet-general-use')
os.makedirs('cut',exist_ok=True)
only=sys.argv[2].split(',') if len(sys.argv)>2 else None
for j in jobs:
    if only and j['key'] not in only: continue
    im=Image.open(P+j['src']).convert('RGB')
    if j['crop']:
        w,h=im.size; c=j['crop']; im=im.crop((int(c[0]*w),int(c[1]*h),int(c[2]*w),int(c[3]*h)))
    im.save(f"cut/{j['key']}-src.png")
    out=remove(im, session=s)
    out.save(f"cut/{j['key']}.png"); print(j['key'], im.size, flush=True)
