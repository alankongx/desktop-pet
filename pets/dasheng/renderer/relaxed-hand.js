// Cross sections of the approved A hand, traced on its 208 × 320 texture.
// Each row gives image y, left and right x; all lengths below are in texture pixels.
function bindRelaxedHand(T, rig, reference, restingPalm) {
  const palm = [[25,102,125],[30,85,138],[41,65,146],[52,53,152],[70,43,161],
    [90,39,169],[110,41,177],[126,51,182],[136,66,186],[145,78,185],[157,89,97]];
  const thumb = [[52,54,58],[59,46,66],[76,33,76],[95,23,82],[113,20,83],
    [132,21,76],[147,19,68],[168,18,60],[183,20,57],[201,24,57],[213,29,52],[220,36,45]];
  // The far two fingers overlap in front view. They occupy separate depths in a turn.
  const fingers = [
    {z:9, depth:15, rows:[[131,126,133],[137,104,142],[147,94,145],[158,91,146],
      [175,97,146],[192,103,144],[210,99,138],[229,94,131],[242,91,124],
      [253,82,117],[266,76,107],[274,77,99],[280,85,92]], hinge:5},
    {z:3, depth:14, rows:[[136,148,151],[140,143,166],[151,145,171],
      [174,148,175],[195,149,177],[209,144,176],[231,137,168],[253,128,158],
      [265,121,151],[280,111,143],[296,107,133],[303,111,125],[306,117,122]], hinge:5},
    {z:-7, depth:12, rows:[[145,174,179],[149,171,184],[169,177,188],
      [195,178,191],[213,175,191],[225,171,186],[246,163,178],[265,151,166],
      [280,144,153],[285,143,147]], hinge:4},
    {z:-22, depth:10, rows:[[149,171,176],[156,167,182],[178,170,186],
      [198,172,186],[213,170,186],[232,163,179],[249,157,172],[265,152,162],[275,149,153]], hinge:4},
  ];
  const blend = {value:1};
  const restingTexture = new T.Texture(reference);
  restingTexture.colorSpace = T.SRGBColorSpace;
  restingTexture.needsUpdate = true;
  const inversePalm = restingPalm.clone().invert();
  const meshes = [];
  const [originalFront,originalBack] = rig.gloveParts.palm.material;

  // Both keyframes share the same vertices; the two texture sets follow them
  // continuously while the wrist rolls from the drawn resting pose to the wave.
  function handMaterial(source, showsDrawing) {
    const material = source.clone();
    material.onBeforeCompile = shader => {
      shader.uniforms.handRest = blend;
      shader.uniforms.handDrawing = {value:restingTexture};
      shader.vertexShader = 'attribute vec2 handUv; varying vec2 handST;\n' +
        shader.vertexShader.replace('#include <uv_vertex>','#include <uv_vertex>\nhandST=handUv;');
      shader.fragmentShader = 'uniform float handRest; uniform sampler2D handDrawing; varying vec2 handST;\n' +
        shader.fragmentShader.replace('#include <map_fragment>',
          '#include <map_fragment>\ndiffuseColor.a=mix(diffuseColor.a,1.0,handRest);');
      const color = showsDrawing ? 'texture2D(handDrawing,handST).rgb' :
        'mix(vec3(.19,.18,.17),vec3(.49,.48,.46),texture2D(handDrawing,handST).r)';
      shader.fragmentShader = shader.fragmentShader.replace('#include <opaque_fragment>',
        'outgoingLight=mix(outgoingLight,'+color+',handRest);\n#include <opaque_fragment>');
    };
    return material;
  }
  const materials = [handMaterial(originalFront,false),handMaterial(originalBack,true)];

  // Match the extra stations around A's rounded fingertips. On the waving
  // keyframe extra rings coincide with their originals, retaining its exact surface.
  const ringSize=49;
  function fitContour(geometry,count){
    const src=(geometry.getAttribute('position').count-2)/ringSize;
    if(src>=count)return;
    const rows=Array.from({length:count},(_,j)=>Math.round(j*(src-1)/(count-1)));
    const attributes=['position','normal','uv'];
    for(const name of attributes){
      const old=geometry.getAttribute(name),size=old.itemSize,span=ringSize*size;
      const values=new Float32Array((count*ringSize+2)*size);
      rows.forEach((r,j)=>values.set(old.array.subarray(r*span,(r+1)*span),j*span));
      values.set(old.array.subarray(src*span),count*span);
      geometry.setAttribute(name,new T.Float32BufferAttribute(values,size));
    }
    const indices=[],half=(ringSize-1)/2;
    geometry.clearGroups();
    for(let side=0;side<2;side++){
      const first=indices.length;
      for(let j=0;j<count-1;j++)for(let i=side*half;i<(side+1)*half;i++){
        const a=j*ringSize+i,b=a+ringSize;indices.push(a,b,a+1,a+1,b,b+1);
      }
      geometry.addGroup(first,indices.length-first,side);
    }
    const caps=indices.length;
    for(let i=0;i<ringSize-1;i++){
      const last=(count-1)*ringSize+i;
      indices.push(count*ringSize,i+1,i,count*ringSize+1,last,last+1);
    }
    geometry.addGroup(caps,indices.length-caps,1);
    geometry.setIndex(indices);
  }

  function register(mesh, rows, z, depth) {
    const g=mesh.geometry;
    fitContour(g,rows.length);
    const base=g.getAttribute('position');
    const ringCount=(base.count-2)/ringSize;
    const points=new Float32Array(base.count*3), uv=new Float32Array(base.count*2);
    const p=new T.Vector3();
    const parent=mesh.parent.userData.bind, wrist=rig.freeWrist.userData.bind;
    const offset=new T.Vector3((parent[0]-wrist[0])/100,(wrist[1]-parent[1])/100,(parent[2]-wrist[2])/100);
    function put(index,x,y,lift){
      // The cuff opening is angled in the drawing; its midpoint is the wrist pivot.
      const unit=.00208; // Match the width of the other, staff-holding glove.
      p.set((x-81)*unit,(53-y)*unit,.052+lift*unit).applyQuaternion(inversePalm).sub(offset);
      p.toArray(points,index*3);
      uv[index*2]=x/reference.width;uv[index*2+1]=1-y/reference.height;
    }
    for(let j=0;j<ringCount;j++){
      // The old open hand points upward in its bind pose, from fingertip to wrist.
      const row=(1-j/(ringCount-1))*(rows.length-1);
      const lo=Math.floor(row),hi=Math.min(rows.length-1,lo+1),f=row-lo;
      const [y,left,right]=rows[lo].map((v,i)=>v*(1-f)+rows[hi][i]*f);
      const radius=(right-left)/2, center=(left+right)/2;
      const thickness=Math.min(depth,radius*.86);
      for(let k=0;k<ringSize;k++){
        const t=-Math.PI/2+2*Math.PI*k/(ringSize-1);
        put(j*ringSize+k,center+Math.sin(t)*radius,y,z-Math.cos(t)*thickness);
      }
      if(j===0||j===ringCount-1)put(base.count-(j===0?2:1),center,y,z);
    }
    const target=new T.Float32BufferAttribute(points,3);
    const normalGeometry=new T.BufferGeometry();
    normalGeometry.setAttribute('position',target);normalGeometry.setIndex(g.index);
    normalGeometry.computeVertexNormals();
    g.setAttribute('handUv',new T.Float32BufferAttribute(uv,2));
    g.morphAttributes.position=[target];g.morphAttributes.normal=[normalGeometry.getAttribute('normal')];
    g.computeBoundingSphere();mesh.material=materials;mesh.updateMorphTargets();meshes.push(mesh);
  }
  register(rig.gloveParts.palm,palm,0,28);
  register(rig.gloveParts.thumb,thumb,12,17);
  fingers.forEach(({rows,hinge,z,depth},i)=>{
    const [proximal,distal]=rig.gloveParts.fingers[i];
    register(proximal,rows.slice(0,hinge+1),z,depth);
    register(distal,rows.slice(hinge),z,depth);
  });
  return amount=>{
    blend.value=amount;
    for(const mesh of meshes)mesh.morphTargetInfluences[0]=amount;
  };
}
