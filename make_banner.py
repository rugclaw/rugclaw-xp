from PIL import Image,ImageDraw,ImageFont
from pathlib import Path
import math
p=Path('/home/rekt/rugclaw-xp-site')
captain=Image.open(p/'captain.png').convert('RGBA')
usa=Image.open(p/'usa.png').convert('RGBA')
W,H=900,430
try:
 font=ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf',67)
 small=ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf',25)
except:font=small=ImageFont.load_default()
frames=[]
for n in range(12):
 im=Image.new('RGB',(W,H),(255,152,10));d=ImageDraw.Draw(im)
 for i in range(20):
  a=i*math.pi/10
  d.polygon([(450,220),(450+950*math.cos(a),220+950*math.sin(a)),(450+950*math.cos(a+.14),220+950*math.sin(a+.14))],fill=(255,198,27))
 d.rectangle((0,360,W,H),fill=(190,79,17))
 text='RUGGED ORPHANS'
 bb=d.textbbox((0,0),text,font=font)
 x=(W-(bb[2]-bb[0]))//2
 d.text((x+5,19),text,font=font,fill=(75,27,16),stroke_width=4,stroke_fill=(60,20,12))
 d.text((x,14),text,font=font,fill='white',stroke_width=3,stroke_fill=(25,20,32))
 shift=min(n*31,285)
 rugleft=260-shift
 d.polygon([(rugleft,313),(rugleft+440,313),(rugleft+410,350),(rugleft-25,350)],fill=(189,12,37),outline=(255,230,70),width=7)
 for i in range(6):
  xx=rugleft+35+i*64
  d.line((xx,320,xx-15,345),fill=(255,193,32),width=3)
 # Otter mascot on the left, pulling the rug
 ot=captain.resize((210,210),Image.Resampling.NEAREST)
 im.paste(ot,(50,163),ot)
 # Two orphan characters fly off the rug as it moves
 for j,av in enumerate((captain,usa)):
  a=av.resize((145,145),Image.Resampling.NEAREST)
  if n>=4:
   angle=(n-3)*(-11 if j==0 else 13)
   a=a.rotate(angle,expand=True,resample=Image.Resampling.NEAREST)
  xx=365+j*155+int((max(0,n-2)**1.25)*14)
  yy=198+int((max(0,n-2)**1.4)*5)-int(18*math.sin(n*.6+j))
  im.paste(a,(xx,yy),a)
 if n>=4:
  for k in range(4):
   xx=600+((n*25+k*43)%260); yy=300+((k*19+n*7)%65)
   d.ellipse((xx,yy,xx+20,yy+13),fill=(255,227,152))
 d.text((20,394),'🦞' if False else 'RUG PULL!  +50 XP / -50 XP',font=small,fill='white')
 frames.append(im)
frames[0].save(p/'rugpull.gif',save_all=True,append_images=frames[1:],duration=[250]*11+[950],loop=0,optimize=True,disposal=2,colors=96)
frames[-1].save(p/'preview.png')
print('Created GIF', (p/'rugpull.gif').stat().st_size)
