import json,sys,os
from PIL import Image
from rembg import new_session, remove
model=sys.argv[1] if len(sys.argv)>1 else 'isnet-general-use'
only=sys.argv[2].split(',') if len(sys.argv)>2 else None
root='/home/claude/tu-temporada-colombia-actualizada/tu-temporada-colombia/'
s=new_session(model)
for p in json.load(open('/home/claude/bg/list.json')):
    k=os.path.basename(p)[:-5]
    if only and k not in only: continue
    im=Image.open(root+p).convert('RGB')
    m=remove(im,session=s,only_mask=True,post_process_mask=False)
    m.save(f'/home/claude/bg/cut/{k}.{model}.png'); print(k,flush=True)
