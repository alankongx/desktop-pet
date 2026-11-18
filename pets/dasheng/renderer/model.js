// Bind pose is traced in pixels on the 480-unit square of the original portrait.
// Each section is a closed volume. Its front UVs are registered to the same drawing.
// Side and rear surfaces have independent materials, thickness and raised hardware.
function buildDasheng(T,pictures){
  const silk=metal(0x841d20,.18),red=metal(0xb13728,.22),gold=metal(0xbd8848,.58),
    bright=metal(0xefbb68,.56),bronze=metal(0x735133,.52),alloy=metal(0x9a9287,.55),
    dark=metal(0x332e29,.35),leather=metal(0x5b3926,.24),jade=metal(0x209e94,.33);
  function metal(color,metalness){return new T.MeshStandardMaterial({color,metalness,roughness:.43,side:T.DoubleSide});}
  const faces=pictures.map(img=>{const t=new T.Texture(img);t.colorSpace=T.SRGBColorSpace;t.needsUpdate=true;return t;});
  function painted(map){return new T.MeshBasicMaterial({map,alphaTest:.22,side:T.DoubleSide});}
  const paint=painted(faces[0]),visor=painted(faces[0]);
  const root=new T.Group();root.userData.bind=[240,480,0];
  function group(parent,x,y,z){
    const g=new T.Group(),b=parent.userData.bind;g.userData.bind=[x,y,z];
    g.position.set((x-b[0])/100,(b[1]-y)/100,(z-b[2])/100);parent.add(g);return g;
  }
  function local(parent,x,y,z){
    const b=parent.userData.bind;return [(x-b[0])/100,(b[1]-y)/100,(z-b[2])/100];
  }
  function mesh(p,geo,material){const m=new T.Mesh(geo,material);p.add(m);return m;}
  function line(p,mat,points,r){
    const curve=new T.CatmullRomCurve3(points.map(v=>new T.Vector3(...local(p,...v))));
    return mesh(p,new T.TubeGeometry(curve,Math.max(14,points.length*5),r/100,8,false),mat);
  }
  const sphere=new T.SphereGeometry(1,24,16);
  function orb(p,m,x,y,z,w,h,d){
    const o=mesh(p,sphere,m);o.position.set(...local(p,x,y,z));o.scale.set(w/100,h/100,d/100);return o;
  }
  // Cross-sections are [height in the image, left, right, depth multiplier].
  // Densify broad sections so depth and UV coordinates remain smooth through a turn.
  function hull(p,rows,midZ,depth,back,front=paint,power=.85,rearDepth=depth){
    const sections=[];
    for(let i=0;i<rows.length-1;i++){
      const a=rows[i],b=rows[i+1],steps=Math.max(1,Math.ceil((b[0]-a[0])/7));
      for(let n=0;n<steps;n++){const f=n/steps;sections.push([0,1,2,3].map(k=>(a[k]??1)*(1-f)+(b[k]??1)*f));}
    }
    sections.push(rows.at(-1));
    const pos=[],uv=[],indices=[],steps=48,point=(x,y,z)=>{pos.push(...local(p,x,y,z));uv.push(x/480,1-y/480);};
    for(const [y,l,r,scale=1] of sections)for(let i=0;i<=steps;i++){
      const t=-Math.PI/2+2*Math.PI*i/steps,c=Math.cos(t);
      const x=(r+l)/2+Math.sin(t)*(r-l)/2;
      point(x,y,midZ+Math.sign(c)*Math.pow(Math.abs(c),power)*(c<0?rearDepth:depth)*scale);
    }
    const g=new T.BufferGeometry();
    for(let side=0;side<2;side++){
      const start=indices.length;
      for(let j=0;j<sections.length-1;j++)for(let i=side*steps/2;i<(side+1)*steps/2;i++){
        const a=j*(steps+1)+i,b=a+steps+1;indices.push(a,b,a+1,a+1,b,b+1);
      }
      g.addGroup(start,indices.length-start,side);
    }
    for(const end of [0,sections.length-1]){
      const [y,l,r]=sections[end],center=pos.length/3,start=indices.length;
      point((l+r)/2,y,midZ);
      for(let i=0;i<steps;i++){const a=end*(steps+1)+i;if(end===0)indices.push(center,a+1,a);else indices.push(center,a,a+1);}
      g.addGroup(start,indices.length-start,1);
    }
    g.setAttribute('position',new T.Float32BufferAttribute(pos,3));g.setAttribute('uv',new T.Float32BufferAttribute(uv,2));
    g.setIndex(indices);g.computeVertexNormals();return mesh(p,g,[front,back]);
  }
  const body=group(root,256,354,0),head=group(body,256,278,0);
  // Head housing, including the gold brow. Earpieces and ears are separate solids.
  const helmetRows=[[91,244,269,.22],[95,215,296,.48],[103,183,328,.66],[116,154,353,.80],
    [130,144,366,.93],[151,144,369,.98],[204,146,369,1],[236,151,363,.98],
    [249,157,357,.89],[260,168,345,.77],[269,182,333,.66],[276,204,307,.51],[281,232,280,.25]];
  hull(head,helmetRows,-3,70,alloy,visor,.64,110);
  function shellPoint(angle,y,raise=0){
    const i=helmetRows.findIndex(r=>r[0]>=y);
    const lo=helmetRows[Math.max(0,i-1)],hi=helmetRows[i],f=(y-lo[0])/(hi[0]-lo[0]||1);
    const l=lo[1]+(hi[1]-lo[1])*f,r=lo[2]+(hi[2]-lo[2])*f,scale=lo[3]+(hi[3]-lo[3])*f;
    return [(l+r)/2+((r-l)/2+raise)*Math.sin(angle),y,-3-(110*scale+raise)*Math.max(0,Math.cos(angle))**.64];
  }
  // Low-relief segmented plates sit on the actual rear dome at every azimuth.
  for(const side of [-1,1]){
    for(const [start,end] of [[.07,.53],[.57,1.10]]){
      const panel=(u,v)=>shellPoint(side*(start+(end-start)*u),119+v*(125-17*u)+9*u,1.4+2.8*Math.sin(Math.PI*u)*Math.sin(Math.PI*v));
      ribbon(head,alloy,13,20,(u,v)=>local(head,...panel(u,v)));
      line(head,bronze,Array.from({length:16},(_,j)=>panel(0,j/15)),1.05);
    }
  }
  const band=(u,v)=>shellPoint((u-.5)*Math.PI,139+v*8+3*Math.cos((u-.5)*Math.PI*2),2.6);
  ribbon(head,gold,48,3,(u,v)=>local(head,...band(u,v)));
  for(const u of [.13,.29,.50,.71,.87]){const [x,y,z]=band(u,.5);orb(head,bright,x,y,z,2.6,2.6,2.6);}

  // Sculpt a second curved lens registered to the same pixels for added relief.
  hull(head,[[128,236,281,.2],[132,197,313,.55],[140,179,333,.76],[153,169,343,.86],
    [171,163,350,.95],[194,161,353,1],[218,162,352,1],[237,166,348,.93],[249,173,341,.82],
    [257,184,330,.65],[263,205,308,.42],[266,234,280,.2]],43,32,dark,visor,.71);
  for(const s of [-1,1]){
    const mirror=x=>s<0?x:514-x;
    const reflect=rows=>rows.map(([y,l,r,k])=>[y,Math.min(mirror(l),mirror(r)),Math.max(mirror(l),mirror(r)),k]);
    hull(head,reflect([[52,164,168,.15],[56,158,177,.42],[67,152,190,.73],[88,147,208,.96],
      [104,145,223,1],[120,145,229,.91],[132,144,221,.63]]),-5,28,alloy);
    hull(head,reflect([[140,128,145,.34],[145,119,149,.73],[158,112,151,.89],
      [179,106,151,1],[205,107,151,1],[222,112,150,.91],[234,120,150,.75],[240,132,150,.49]]),0,47,bronze);
    const sideX=mirror(109);
    for(const [dx,r,len,m] of [[3,40,7,dark],[0,37,5,gold],[-3,30,3,bronze]]){
      const geo=new T.CylinderGeometry(r/100,r/100,len/100,48);
      const d=mesh(head,geo,m);d.position.set(...local(head,sideX+(s<0?1:-1)*dx,190,-2));d.rotation.z=Math.PI/2;
    }
    const bossX=sideX+s*5;
    orb(head,bright,bossX,190,0,2,8,8);
    for(let j=0;j<8;j++){const t=j*Math.PI/4;orb(head,gold,bossX,190+25*Math.cos(t),25*Math.sin(t),1.9,2.5,2.5);}
    // An embossed spiral gives the fittings a readable shape when seen edge-on.
    const filigree=[];for(let i=0;i<=26;i++){const t=i/26*Math.PI*3,r=2+14*i/26;filigree.push([bossX+s,190+Math.cos(t)*r,Math.sin(t)*r]);}
    line(head,bright,filigree,1.2);
  }
  line(head,bronze,[[126,154,-14],[138,111,-24],[171,76,-33],[214,62,-38],[256,58,-39],[299,62,-38],[342,76,-33],[371,112,-24],[386,153,-14]],5.6);
  for(const s of [-1,1]){
    // Raised cloud ornaments on each headphone end cap.
    const x=s<0?102:412;
    for(let j=0;j<3;j++){
      const arm=[];for(let i=0;i<=16;i++){
        const t=i/16*Math.PI*1.47,r=2.0+7.5*i/16,a=j*Math.PI*2/3;
        const y=9+r*Math.cos(t),z=r*Math.sin(t);
        arm.push([x,190+y*Math.cos(a)-z*Math.sin(a),y*Math.sin(a)+z*Math.cos(a)]);
      }line(head,gold,arm,1.05);
    }
  }
  orb(head,bronze,256,90,17,19,5,12);
  orb(head,gold,256,87,19,16,3.2,10);
  // Separate wings of the crown and two plumes are textured from the actual feather barbs.
  hull(head,[[44,250,259,.16],[51,243,267,.46],[58,237,274,.83],[67,236,276,1],[77,239,274,1],[85,244,267,.65],[92,248,261,.24]],21,19,gold);
  for(const s of [-1,1]){
    const reflect=rows=>rows.map(([y,l,r,k])=>[y,s<0?l:513-r,s<0?r:513-l,k]);
    hull(head,reflect([[46,229,231,.15],[54,228,235,.58],[65,230,241,1],[77,233,249,1],[86,239,250,.67],[91,248,253,.2]]),16,8,gold);
  }
  const feathers=[];
  for(const s of [-1,1]){
    const mirror=x=>s<0?x:509-x, f=group(head,mirror(236),81,11);feathers.push(f);
    const seg=(rows,z,d)=>hull(f,rows.map(([y,l,r,k])=>[y,Math.min(mirror(l),mirror(r)),Math.max(mirror(l),mirror(r)),k]),z,d,copper);
    const copper=red;
    seg([[1,185,198,.2],[4,180,208,.72],[10,175,215,1],[16,182,221,1],[23,199,226,1],[31,204,231,1],[40,208,236,1],[51,215,237,1],[60,220,239,.8],[69,229,241,.55],[78,235,240,.22]],11,6.5);
    seg([[2,184,195,.16],[8,174,193,.72],[15,166,187,1],[24,158,182,1],[34,153,179,1],[44,151,173,.85],[51,152,165,.60],[56,153,159,.21]],8,5.5);
  }
  const sleep=document.createElement('canvas');sleep.width=600;sleep.height=600;
  const ctx=sleep.getContext('2d');ctx.drawImage(pictures[0],0,0,600,600);ctx.save();ctx.scale(1.25,1.25);
  ctx.beginPath();ctx.roundRect(165,134,185,127,38);ctx.clip();
  const grad=ctx.createLinearGradient(170,140,312,264);grad.addColorStop(0,'#3b3631');grad.addColorStop(.6,'#111111');grad.addColorStop(1,'#1e1b1a');
  ctx.fillStyle=grad;ctx.fillRect(160,125,199,146);ctx.strokeStyle='#ffb93b';ctx.lineWidth=3.8;ctx.lineCap='round';
  for(const x of [216,300]){ctx.beginPath();ctx.moveTo(x-14,195);ctx.quadraticCurveTo(x,207,x+14,195);ctx.stroke();}
  ctx.restore();const sleepFace=new T.CanvasTexture(sleep);sleepFace.colorSpace=T.SRGBColorSpace;

  hull(body,[[273,223,291,.63],[280,202,312,.86],[294,199,315,.97],[313,199,314,1],[334,195,317,1],
    [349,191,319,.95],[359,191,321,.82]],0,39,bronze,paint,.85,65);
  // Fill the neck, shoulder blades and pelvis behind the front armour.
  orb(body,dark,256,280,-12,34,16,37);
  orb(body,leather,256,368,-16,55,37,46);
  for(const side of [-1,1])orb(body,bronze,256+side*31,299,-21,29,24,32);
  for(const [top,span,depth] of [[288,1.14,64],[312,1.24,69],[333,1.28,66],[353,1.31,61],[375,1.29,56]]){
    const plate=(u,v)=>{
      const a=(u-.5)*2*span,c=Math.cos(a);
      return [256+(60+3*v)*Math.sin(a),top+v*(18+5*c)+2.8*v*Math.cos(5*a),-7-(depth+5*v)*c];
    };
    ribbon(body,top===353?leather:bronze,26,5,(u,v)=>local(body,...plate(u,v)));
    line(body,gold,Array.from({length:25},(_,i)=>plate(i/24,1)),1.4);
    for(const u of [.24,.43,.57,.76]){const [x,y,z]=plate(u,.60);orb(body,bright,x,y,z-1,1.8,1.8,1.8);}
  }
  // The three overlapping fur panels have individual pointed hems.
  hull(body,[[350,226,285,.7],[365,225,287,1],[390,224,286,1],[409,230,281,.91],[422,244,269,.64],[431,255,258,.2]],22,24,leather);
  for(const s of [-1,1]){
    const rows=[[350,194,235,.64],[360,188,238,.93],[383,178,233,1],[398,171,231,.86],[410,172,210,.56],[414,175,185,.22]];
    hull(body,rows.map(([y,l,r,d])=>[y,s<0?l:513-r,s<0?r:513-l,d]),8,28,leather);
  }
  const cape=group(body,256,278,-16);
  function ribbon(p,mat,us,vs,point){
    const p3=[],uv=[],idx=[];for(let j=0;j<=vs;j++)for(let i=0;i<=us;i++){
      p3.push(...point(i/us,j/vs));uv.push(i/us,1-j/vs);
      if(i<us&&j<vs){const a=j*(us+1)+i,b=a+us+1;idx.push(a,b,a+1,a+1,b,b+1);}
    }
    const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(p3,3));g.setAttribute('uv',new T.Float32BufferAttribute(uv,2));g.setIndex(idx);g.computeVertexNormals();return mesh(p,g,mat);
  }
  function cloth(u,v){
    const phi=(u-.5)*4.02,spread=54+96*v**1.67,fold=Math.cos(10*phi),edge=Math.abs(Math.sin(phi));
    return [256+spread*Math.sin(phi),280+v*(140-5*fold-22*Math.exp(-((Math.abs(phi)-1.65)**2)/.032)+12*Math.exp(-((Math.abs(phi)-2.0)**2)/.013)), -14-(47+42*v+20*Math.sin(Math.PI*v)+v*(8+4*v)*fold)*Math.cos(phi)+5*v*edge];
  }
  // Twin panels are gathered at the shoulders, then part over the layered back armour.
  for(const side of [-1,1]){
    const panel=(u,v)=>{
      const gap=.012+.108*v*v;
      return cloth(.5+side*(gap+u*(.5-gap)),v);
    };
    ribbon(cape,silk,34,22,(u,v)=>local(cape,...panel(u,v)));
    for(const u of [0,1])line(cape,gold,Array.from({length:18},(_,j)=>panel(u,j/17)),1.2);
    line(cape,bright,Array.from({length:36},(_,j)=>panel(j/35,1)),1.5);
    for(const u of [.23,.58]){
      line(cape,red,Array.from({length:20},(_,j)=>{const [x,y,z]=panel(u,.04+.86*j/19);return [x,y,z-1.5];}),1.1);
    }
  }
  const legs=[];
  for(const s of [-1,1]){
    const x=s<0?215:298,leg=group(root,x,397,0);legs.push(leg);
    const data=s<0?[[397,208,240,.38],[410,198,239,.84],[424,196,240,1],[439,198,233,.91],[452,196,231,.84],[460,192,229,1],[467,184,232,1],[474,183,232,.86],[477,188,226,.48]]:
      [[397,271,309,.39],[409,271,315,.8],[423,273,320,1],[440,279,319,.91],[453,280,315,.85],[462,282,321,1],[471,281,326,1],[476,285,325,.71],[478,292,319,.3]];
    const split=data.findIndex(row=>row[0]>=423),at=data[split];
    const shin=group(leg,x,at[0],0);leg.userData.knee=shin;
    hull(leg,data.slice(0,split+1),0,21,leather);
    hull(shin,data.slice(split),0,21,leather);
    const cuff=new T.TorusGeometry(.168,.016,8,32);const trim=mesh(shin,cuff,bronze);trim.rotation.x=Math.PI/2;trim.position.set(...local(shin,x,444,-2));
  }
  const arms=[],fingerJoints=[];let freeWrist;
  for(const s of [-1,1]){
    const left=s<0;
    const a=group(body,left?192:322,294,6),elbow=group(a,left?161:352,327,12);arms.push({a,elbow});
    const upper=[[283,184,199,.33],[291,171,206,.78],[304,164,210,1],[317,160,201,1],[330,159,191,.8],[338,164,178,.33]];
    const transform=rows=>rows.map(([y,l,r,k])=>[y,left?l:513-r,left?r:513-l,k]);
    hull(a,transform(upper),5,18,alloy);
    hull(a,transform([[277,188,203,.25],[282,179,209,.67],[291,168,211,1],[300,158,206,1],[309,163,192,.82],[314,167,177,.33]]),12,21,gold);
    if(left){
      hull(elbow,[[308,142,163,.46],[313,130,169,.84],[324,128,175,1],[337,131,174,1],[346,138,165,.77],[350,151,160,.3]],18,18,bronze);
      hull(elbow,[[308,118,125,.33],[313,112,133,.85],[320,103,137,1],[331,103,138,1],[341,107,134,.92],[350,113,130,.69],[354,118,123,.26]],29,13,alloy);
    }else{
      hull(elbow,[[307,354,369,.3],[312,342,373,.79],[322,338,377,1],[334,340,371,1],[344,347,363,.72],[347,351,358,.34]],18,17,bronze);
      // Anatomical left hand (screen right). The cuff belongs to the forearm,
      // while palm, thumb and bent fingertips share a separately posed wrist.
      freeWrist=group(elbow,369,322,23);
      const palm=new T.Group();freeWrist.add(palm);
      function pad(parent,mat,x,y,z,w,h,d){
        const piece=mesh(parent,sphere,mat);piece.position.set(x,y,z);piece.scale.set(w,h,d);return piece;
      }
      function phalanx(parent,from,to,width,mat){
        const start=new T.Vector3(...from),end=new T.Vector3(...to),axis=end.clone().sub(start);
        const finger=mesh(parent,sphere,mat);finger.position.copy(start).lerp(end,.5);
        finger.scale.set(width,axis.length()*.58,width*.87);
        finger.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),axis.normalize());
      }
      pad(palm,dark,0,-.015,0,.09,.075,.085);
      pad(palm,alloy,0,-.127,0,.142,.156,.092);
      pad(palm,bronze,0,-.122,.076,.112,.105,.027);
      pad(palm,gold,0,-.12,.099,.078,.075,.016);
      pad(palm,dark,0,-.13,-.075,.105,.107,.021);
      const digits=[[-.089,.157],[-.029,.182],[.034,.169],[.092,.128]];
      for(const [x,len] of digits){
        const y=-.219+Math.abs(x)*.23,z=-.005;
        const first=[x,y,z],knuckle=[x*1.12,y-len*.55,z-.025],tip=[x*1.11,y-len,z-.083];
        pad(palm,dark,x,y,z,.034,.043,.039);
        phalanx(palm,first,knuckle,.035,alloy);
        pad(palm,dark,...knuckle,.03,.033,.03);
        const hinge=new T.Group();palm.add(hinge);hinge.position.set(...knuckle);
        const relative=tip.map((val,i)=>val-knuckle[i]);
        phalanx(hinge,[0,0,0],relative,.034,alloy);fingerJoints.push(hinge);
      }
      phalanx(palm,[-.102,-.079,-.015],[-.177,-.156,-.026],.049,alloy);
      pad(palm,dark,-.172,-.157,-.029,.039,.041,.041);
      phalanx(palm,[-.177,-.156,-.026],[-.163,-.219,-.092],.038,alloy);
    }
  }
  // Lathed staff. Cap-to-cap distance and grip position are measured on the source image.
  const staff=group(arms[0].elbow,121.5,328.5,42);
  const profile=[[-1.49,.048],[-1.47,.071],[-1.435,.073],[-1.416,.066],[-.81,.063],[-.79,.072],[-.766,.061],[-.75,.045],
    [.845,.046],[.858,.070],[.887,.071],[.901,.064],[1.551,.066],[1.576,.076],[1.606,.072],[1.629,.051]];
  const staffSkin=document.createElement('canvas');staffSkin.width=128;staffSkin.height=768;
  const sc=staffSkin.getContext('2d'),source=document.createElement('canvas');source.width=480;source.height=480;
  const sample=source.getContext('2d',{willReadFrequently:true});sample.drawImage(pictures[0],0,0,480,480);
  const pix=sample.getImageData(0,0,480,480).data,art=sc.createImageData(128,768);
  for(let j=0;j<768;j++)for(let i=0;i<128;i++){
    const f=j/767,v=1.629-f*3.119,t=i/128*Math.PI*2,band=v>.85||v<-.76;
    const sampleV=band?v:(.62-((f*1.7)%1)*.48);
    const off=Math.sin(t)*4.1, x=Math.round(121.5-31.9*sampleV+off*.948),
      y=Math.round(328.5-94.8*sampleV-off*.319),src=(y*480+x)*4,dst=(j*128+i)*4;
    for(let k=0;k<3;k++)art.data[dst+k]=pix[src+k];art.data[dst+3]=255;
  }
  sc.putImageData(art,0,0);const tex=new T.CanvasTexture(staffSkin);tex.colorSpace=T.SRGBColorSpace;
  const rod=mesh(staff,new T.LatheGeometry(profile.map(([y,r])=>new T.Vector2(r,y)),48),new T.MeshStandardMaterial({map:tex,roughness:.48,metalness:.19}));
  const rodUV=rod.geometry.attributes.uv,rodPos=rod.geometry.attributes.position;
  for(let i=0;i<rodUV.count;i++)rodUV.setY(i,(rodPos.getY(i)+1.49)/3.119);
  for(const [y,r] of [[-1.48,.061],[-.80,.070],[.874,.072],[1.59,.071]]){
    const rim=mesh(staff,new T.TorusGeometry(r,.007,8,36),bright);rim.rotation.x=Math.PI/2;rim.position.y=y;
  }
  for(const y of [-1.49,1.628]){
    const cap=mesh(staff,new T.CylinderGeometry(.052,.052,.012,32),bright);cap.position.y=y;
  }
  const wind=new T.Group(),windMaterials=[];wind.name='棍风特效';staff.add(wind);
  function trail(offset, sweep, radius, breadth, color, strength, drift) {
    const palette=document.createElement('canvas');palette.width=96;palette.height=16;
    const ctx=palette.getContext('2d'), falloff=ctx.createLinearGradient(0,0,96,0);
    falloff.addColorStop(0,'rgba(255,255,255,0)');falloff.addColorStop(.6,'rgba(255,255,255,.46)');falloff.addColorStop(1,'white');
    ctx.fillStyle=falloff;ctx.fillRect(0,0,96,16);
    const map=new T.CanvasTexture(palette);
    const material=new T.MeshBasicMaterial({color,map,transparent:true,side:T.DoubleSide,depthWrite:false,opacity:0});
    windMaterials.push({material,strength});
    ribbon(wind,material,44,3,(u,v)=>{
      const angle=offset-(1-u)*sweep;
      const width=(.08+.92*Math.sin(Math.PI*u)**.6)*breadth;
      const r=radius+drift*(1-u)+(v-.5)*width;
      return [Math.sin(angle)*r*1.37,Math.cos(angle)*r*1.37,.035+.055*Math.sin(Math.PI*u)];
    });
  }
  for(const offset of [0,Math.PI]){
    trail(offset,2.67,1.142,.132,0xe99933,.76,-.11);
    trail(offset,2.25,1.174,.039,0xffeabc,.98,-.03);
    trail(offset+.19,2.60,1.24,.022,0x76c7bc,.81,-.07);
    trail(offset+.43,1.49,.985,.044,0xffca69,.84,-.17);
  }
  wind.visible=false;
  // Back-to-front: a tapered comet tail, soft billows, then the curled ruyi relief.
  const cloud=new T.Group();cloud.name='筋斗云';cloud.visible=false;
  const cloudGold=new T.MeshStandardMaterial({color:0xf3ab32,roughness:.50,metalness:.14});
  const cloudLight=new T.MeshStandardMaterial({color:0xffda73,roughness:.55,metalness:.10});
  const edgeGold=new T.MeshStandardMaterial({color:0xd99029,roughness:.52,metalness:.18});
  const puff=new T.SphereGeometry(1,32,20);
  function billow(material,x,y,z,w,h,d){
    const part=new T.Mesh(puff,material);
    part.position.set(x,y,z);part.scale.set(w,h,d);cloud.add(part);
  }
  const cloudTail=new T.Group();cloud.add(cloudTail);cloudTail.position.x=-.48;
  function curl(material,coords,radiusAt,parent=cloud){
    const path=new T.CatmullRomCurve3(coords.map(v=>new T.Vector3(...v)));
    const rings=40,sides=9,frames=path.computeFrenetFrames(rings,false),verts=[],indices=[];
    for(let j=0;j<=rings;j++){
      const u=j/rings,center=path.getPointAt(u),r=radiusAt(u);
      for(let i=0;i<=sides;i++){
        const angle=2*Math.PI*i/sides;
        const vertex=center.clone().addScaledVector(frames.normals[j],r*Math.cos(angle)).addScaledVector(frames.binormals[j],r*Math.sin(angle));
        verts.push(vertex.x,vertex.y,vertex.z);
        if(j<rings&&i<sides){const a=j*(sides+1)+i,b=a+sides+1;indices.push(a,a+1,b,a+1,b+1,b);}
      }
    }
    const geo=new T.BufferGeometry();geo.setAttribute('position',new T.Float32BufferAttribute(verts,3));geo.setIndex(indices);geo.computeVertexNormals();
    const strand=new T.Mesh(geo,material);parent.add(strand);
    if(parent===cloudTail)strand.position.x=.48;
  }
  curl(cloudGold,[[-.48,-.06,-.05],[-1.13,-.12,-.08],[-1.65,.17,-.12],[-2.1,.45,-.15],[-2.63,.42,-.18],[-2.93,.62,-.20]],u=>.26*(1-u)**.8+.003,cloudTail);
  curl(cloudLight,[[-.87,-.04,.04],[-1.48,.16,.0],[-1.81,.49,-.03],[-2.14,.64,-.03],[-2.48,.58,-.04]],u=>.106*(1-u)+.003,cloudTail);
  billow(cloudGold,0,-.095,0,1.19,.265,.48);
  billow(cloudLight,-.78,-.025,.06,.49,.235,.38);
  billow(cloudGold,-.34,-.13,.22,.48,.255,.30);
  billow(cloudLight,.20,.03,-.05,.61,.27,.40);
  billow(cloudLight,.72,.075,.03,.46,.355,.38);
  billow(cloudGold,.99,-.085,.04,.36,.22,.33);
  for(const [cx,cy,r] of [[.73,.085,.207],[-.68,-.018,.138],[.01,-.092,.134]]){
    const points=[];
    for(let j=0;j<=18;j++){
      const u=j/18,theta=-.8+u*Math.PI*2.05,rad=r*(1-.88*u);
      points.push([cx+rad*Math.cos(theta),cy+rad*Math.sin(theta),.384+.023*Math.sin(u*Math.PI)]);
    }
    curl(edgeGold,points,u=>.034*(1-.55*u));
  }
  return {root,body,head,arms,freeWrist,fingerJoints,legs,staff,wind,windMaterials,cape,feathers,visor,faces,sleepFace,cloud,cloudTail};
}
