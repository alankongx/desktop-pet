(() => {
  const canvas=document.querySelector('#dasheng-3d'), root=document.querySelector('#pet-root');
  const stage=document.querySelector('#pet-stage');
  let active=true, failed=false, actor, renderer, scene, camera, previous=0, timer=0;
  let cloudStyle='depart';
  let action='', start=0, duration=0, mood='default', status='idle';
  const durations=Object.fromEntries(dashengActions.map(action=>[action.id,action.seconds]));
  const sin=Math.sin, pi=Math.PI;
  const V=THREE.Vector3,Q=THREE.Quaternion,E=THREE.Euler;
  const zAxis=new V(0,0,1),upperIdle=new Q(),lowerIdle=new Q(),wristIdle=new Q();
  function prepareIdleHand(rig){
    const free=rig.arms[1],holding=rig.arms[0];
    upperIdle.setFromEuler(new E(-.34,-.50,0,'ZXY'));
    lowerIdle.setFromEuler(new E(-.20,-.12,-.30,'ZXY'));
    const reach=rig.freeWrist.position.clone().applyQuaternion(lowerIdle)
      .add(free.elbow.position).applyQuaternion(upperIdle);
    const gripY=holding.a.position.y+holding.elbow.position.y+rig.staff.position.y;
    const rise=(gripY-free.a.position.y)/Math.hypot(reach.x,reach.y);
    const roll=Math.asin(THREE.MathUtils.clamp(rise,-1,1))-Math.atan2(reach.y,reach.x);
    upperIdle.premultiply(new Q().setFromAxisAngle(zAxis,roll));
    // Align the palm independently of the arm: fingers toward screen left, palm toward +Z.
    const palm=new Q().setFromEuler(new E(0,pi,-pi/2,'ZYX'));
    wristIdle.copy(upperIdle).multiply(lowerIdle).invert().multiply(palm);
  }

  const staffRest=new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0,0,1),.325);
  function resize(){
    if(!renderer)return;
    const w=stage.clientWidth,h=stage.clientHeight;
    if(!w||!h)return;
    // Match the original square PNG's contain/bottom alignment. Extra transparent
    // pixels expose more of the world at exactly the same orthographic scale.
    const unit=4.8/w, ext=window.petAPI?Math.ceil(w*.68):0, foot=window.petAPI?Math.ceil(w*.57):0;
    const sky=window.petAPI?Math.ceil(w*.12):0;canvas.style.top=(-sky)+'px';
    canvas.style.width=(w+ext*2)+'px';canvas.style.height=(h+foot+sky)+'px';
    canvas.style.left=(-ext)+'px';
    renderer.setSize(w+ext*2,h+foot+sky,false);
    camera.left=-(w/2+ext)*unit;camera.right=-camera.left;
    camera.top=(h+sky)*unit-.025;camera.bottom=-foot*unit-.025;camera.updateProjectionMatrix();
  }
  function draw(now) {
    if(!active||failed||!actor)return;
    const t=now/1000, elapsed=t-start;
    if(elapsed>=duration)action='';
    const progress=action?elapsed/duration:0;
    const weight=action?Math.min(1,Math.max(0,elapsed*5),Math.max(0,(duration-elapsed)*5)):0;
    const ease=x=>{x=Math.min(1,Math.max(0,x));return x*x*(3-2*x);};
    const special=action==='grow'||action==='vortex';
    const power=special?ease(progress/.21)*ease((1-progress)/.20):0;
    const whirl=action==='vortex'?ease((progress-.16)/.15)*ease((.88-progress)/.16):0;
    const a=actor, angry=mood==='angry', nap=action==='nap'||mood==='sleeping',
      busy=status==='working'&&!action, thinking=mood==='thinking'||status==='waiting'&&!action;
    a.root.rotation.y=-.009+.020*sin(t*.78)+(action==='turn'?2*pi*(progress-sin(2*pi*progress)/(2*pi)):0);
    a.root.position.y=.007*sin(t*2.5)+(action==='happy'?.115*Math.abs(sin(elapsed*7))*weight:0);
    // Rotate about the centre of the character, keeping the cloud horizontal.
    const flying=action==='cloud';
    a.cloud.visible=flying;
    a.root.position.x=0;a.root.position.z=0;a.root.rotation.order='YXZ';a.root.rotation.x=0;a.root.rotation.z=0;a.root.scale.setScalar(1);
    canvas.style.opacity='1';
    // The original silhouette turn reads as a clean somersault at desktop size.
    function somersault(x,height,size,turn){
      const angle=2*pi*turn,pivot=2.12*size;
      a.root.rotation.z=angle;
      a.root.position.x=x+pivot*sin(angle);
      a.root.position.y+=height+pivot*(1-Math.cos(angle));
    }
    if(flying && cloudStyle==='glide'){
      const land=.57;
      const flip=ease((progress-.10)/(land-.10));
      const rise=ease(progress/.14),settle=1-ease((progress-.83)/.17);
      const ride=rise*settle;
      const hop=.85*Math.sin(pi*ease((progress-.04)/(land-.04)));
      const glide=ease((progress-land)/.25);
      const x=-1.50*glide*(1-ease((progress-.84)/.16));
      const floor=.52*ride;
      somersault(x,floor+hop,1,flip);
      const appear=ease((progress-.20)/.30)*settle;
      a.cloud.scale.set(-appear,appear,appear);
      const impact=.095*Math.sin(pi*ease((progress-.55)/.10));
      a.cloud.position.set(x,floor-.23*appear-impact,.02);
      const stream=ease((progress-land)/.13)*(1-ease((progress-.80)/.16));
      a.cloudTail.scale.x=1+.66*stream;
    }else if(flying && progress<.88){
      a.cloudTail.scale.x=1;
      const summon=ease(progress/.16), flight=ease((progress-.12)/.71);
      const size=1-.96*flight;
      const flip=ease((progress-.16)/.57);
      const x=-4.34*flight;
      const altitude=.46*summon+4.44*flight+.36*sin(pi*flight);
      a.root.scale.setScalar(size);
      somersault(x,altitude,size,flip);
      const puffSize=Math.max(.001,summon*size);
      a.cloud.scale.set(-puffSize,puffSize,puffSize);
      a.cloud.position.set(x,altitude-.16*size,.02);
      a.cloud.rotation.z=.06*flight;
      canvas.style.opacity=String(1-ease((progress-.75)/.09));
    }else if(flying){
      a.cloud.visible=false;
      canvas.style.opacity=String(ease((progress-.91)/.09));
    }
    a.body.rotation.set(nap?.13:busy?.055+.055*sin(t*4):0,angry?.07*sin(t*17):0,.006*sin(t*2));
    a.head.rotation.set(nap?.29+.055*sin(t*2):busy?.09+.065*sin(t*4):.013*sin(t*1.9),
      thinking?.24+.07*sin(t*2):.031*sin(t*.9),nap?-.15:thinking?.13:angry?.045*sin(t*17):.007*sin(t*1.7));
    const [left,right]=a.arms;
    left.a.rotation.set(0,0,0);left.elbow.rotation.set(0,0,0);
    right.a.rotation.set(-.085,-.11,-.025);right.elbow.rotation.set(-.23,0,-.40);
    a.freeWrist.rotation.order='ZXY';
    a.freeWrist.rotation.set(-.28+.03*sin(t*1.4),.37+.045*sin(t*1.1),.24);
    let openPalm=0;

    if(action==='wave'||action==='happy'||thinking){
      const v=thinking&&!action?.65:weight;
      openPalm=v;
      right.a.rotation.z+=v*(1.09+.09*sin(elapsed*8));
      right.elbow.rotation.z+=v*1.29;
      a.freeWrist.rotation.z+=v*(.82+.24*sin(elapsed*10));
      a.freeWrist.rotation.y+=v*2.62;
      right.elbow.rotation.x+=.35*v;
    }
    a.fingerJoints.forEach((finger,i)=>{finger.rotation.x=(.35+i*.10)*(1-openPalm)-.46*openPalm;});
    if(busy) {right.elbow.rotation.x-=.38+.30*sin(t*4);right.a.rotation.z+=.14*sin(t*4);}
    // Counter-rotate the wrist so the staff points upright in its resting pose.
    if(action==='staff'||action==='angry'){
      left.a.rotation.x-=weight*.49;
      left.a.rotation.z-=weight*(.20+.13*sin(elapsed*7));
      a.body.rotation.y=weight*.22*sin(elapsed*4);
    } else {a.body.rotation.y=angry?.07*sin(t*17):0;}
    if(special){
      left.a.rotation.x-=.23*power;left.a.rotation.z-=.09*power;
      left.elbow.rotation.x-=.10*power;
      left.a.rotation.y+=.70*whirl;left.elbow.rotation.y+=.14*whirl;
      a.head.rotation.y-=.045*power;
      right.a.rotation.z+=.17*power;
    }
    const restWeight=nap||thinking?0:1-weight;
    if(restWeight>0){
      right.a.quaternion.slerp(upperIdle,restWeight);
      right.elbow.quaternion.slerp(lowerIdle,restWeight);
      a.freeWrist.quaternion.slerp(wristIdle,restWeight);
      for(const finger of a.fingerJoints)finger.rotation.x=THREE.MathUtils.lerp(finger.rotation.x,-.55,restWeight);
    }
    a.staff.quaternion.copy(left.a.quaternion).multiply(left.elbow.quaternion).invert().multiply(staffRest);
    if(action==='staff')a.staff.rotateX(2*pi*(progress-sin(2*pi*progress)/(2*pi)));
    if(action==='angry')a.staff.rotateX(weight*.4*sin(elapsed*8));
    a.staff.scale.set(1+power*1.47,1+power*1.236,1+power*1.47);
    if(action==='vortex'){
      const turns=ease((progress-.16)/.72);
      a.staff.rotateZ(-6*pi*turns);
    }
    a.wind.visible=whirl>.01;
    // Keep the trail circular as the staff grows wider and longer.
    a.wind.scale.x=a.staff.scale.y/a.staff.scale.x;
    if(a.wind.visible)for(const {material,strength} of a.windMaterials)material.opacity=whirl*strength;
    for(const [i,f] of a.feathers.entries())f.rotation.z=(i?1:-1)*(.025*sin(t*2.4)+(action==='turn'?weight*.11:0));
    a.cape.rotation.x=(flying?.18*weight:-.04)+.045*sin(t*2)+(action==='turn'?weight*.29:0);
    a.legs.forEach((leg,i)=>{
      leg.rotation.x=action==='turn'?weight*.24*sin(elapsed*9+i*pi):0;
      leg.userData.knee.rotation.x=0;
    });
    const texture=nap?a.sleepFace:mood==='happy'||action==='happy'?a.faces[1]:a.faces[0];
    a.visor.map=texture;a.visor.color.setHex(angry?0xff624c:0xffffff);
    canvas.classList.toggle('rage',angry);renderer.render(scene,camera);
    if(!root.classList.contains('three-ready'))root.classList.add('three-ready');
  }
  function frame(){
    cancelAnimationFrame(timer);clearTimeout(previous);
    if(!actor||!active||failed||document.hidden)return;
    draw(performance.now());
    previous=setTimeout(()=>{timer=requestAnimationFrame(frame);},action||status==='working'?34:78);
  }
  function enable(value){
    active=value;root.classList.toggle('use-three',active);if(active)resize();frame();
  }
  function fallback(){failed=true;root.classList.remove('three-ready');clearTimeout(previous);cancelAnimationFrame(timer);}
  async function init(){
    const imgs=await Promise.all(['dasheng.png','dasheng-happy.png'].map(async name=>{
      const img=new Image();img.src='../assets/'+name;await img.decode();return img;
    }));
    const T=window.THREE;
    renderer=new T.WebGLRenderer({canvas,alpha:true,antialias:true,powerPreference:'low-power'});
    renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,2));renderer.setClearColor(0,0);
    scene=new T.Scene(); camera=new T.OrthographicCamera(-2,2,2.4,-2.4,.1,40);
    camera.position.set(0,0,12);camera.lookAt(0,0,0);resize();
    scene.add(new T.HemisphereLight(0xfff5e2,0xbd9890,1.63));
    for(const [x,y,z,color,intensity] of [[-4,7,5,0xffebcf,2.35],[4,3,3,0xe3edff,1.55],[1,5,-4,0xffcf91,2.8]]){
      const light=new T.DirectionalLight(color,intensity);light.position.set(x,y,z);scene.add(light);
    }
    // Studio panels supply soft highlights when the character turns.
    const envCanvas=document.createElement('canvas');envCanvas.width=256;envCanvas.height=128;
    const ctx=envCanvas.getContext('2d');const grad=ctx.createLinearGradient(0,0,0,128);
    grad.addColorStop(0,'#c7c2b9');grad.addColorStop(.49,'#645b52');grad.addColorStop(.55,'#332c2c');grad.addColorStop(1,'#927c65');
    ctx.fillStyle=grad;ctx.fillRect(0,0,256,128);ctx.fillStyle='#ffffff';
    ctx.fillRect(22,18,33,51);ctx.fillRect(145,25,40,30);ctx.fillRect(215,33,8,52);
    const env=new T.CanvasTexture(envCanvas);env.mapping=T.EquirectangularReflectionMapping;env.colorSpace=T.SRGBColorSpace;scene.environment=env;
    actor=buildDasheng(T,imgs);prepareIdleHand(actor);scene.add(actor.root,actor.cloud);frame();
  }
  new ResizeObserver(resize).observe(stage);
  document.addEventListener('visibilitychange',frame);
  canvas.addEventListener('webglcontextlost',e=>{e.preventDefault();fallback();});
  canvas.addEventListener('webglcontextrestored',()=>{failed=false;frame();});
  window.dasheng3d={enable,setCloudStyle(value){cloudStyle=value==='glide'?'glide':'depart';},stop(){action='';duration=0;frame();},setMood(v){mood=v;},setStatus(v){status=v;},play(v){
    if(!durations[v])return;action=v;start=performance.now()/1000;duration=durations[v];frame();
  }};
  enable(true);init().catch(err=>{console.warn('大圣喵使用原画模式',err.message);fallback();});
})();
