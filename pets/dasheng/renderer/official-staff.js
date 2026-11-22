// Poses traced from the 36 frames of the three-second official loop.
// Grip offsets are in model units relative to the resting grip. Staff angles
// describe its upper tip in camera space: left lean, then tilt toward the viewer.
function buildOfficialStaffMotion(T, rig) {
  const poses = [
    // frame, grip x/y/z, staff lean/pitch, torso yaw, head roll, free-arm drop
    [0,  0,0,0,           19,0,    0,0,0],
    [5,  0,0,0,           19,0,   -3,2,3],
    [9,  .01,.01,.02,     22,0,   -4,3,21],
    [12, .09,.04,.12,     20,5,    1,0,28],
    [14, .27,.10,.30,      4,12,   8,-2,30],
    [17, .78,.23,.54,    -27,21,  20,-7,32],
    [19, .99,.18,.54,    -49,15,  26,-7,31],
    [22, 1.11,.01,.50,   -75,6,   20,-4,29],
    [24, .70,-.07,.65,   -90,13,   4,0,26],
    [26, .31,-.05,.68,  -110,51, -11,4,22],
    [28, .05,.06,.51,     88,85, -22,7,18],
    [30,-.10,.21,.25,     30,24, -32,9,12],
    [32,-.09,.21,.20,     20,12, -30,9,10],
    [34, .04,.08,.45,     47,45, -23,6,15],
    [35, .24,-.02,.55,    76,48, -13,3,15],
    [36, 0,0,0,           19,0,    0,0,0],
  ];
  const rad = T.MathUtils.degToRad;
  const up = new T.Vector3(0,1,0);
  const [arm, free] = rig.arms;
  const upper = arm.elbow.position.clone();
  const forearm = rig.staff.position.clone();
  const rest = upper.clone().add(forearm);
  const l1 = upper.length(), l2 = forearm.length();
  const aim = new T.Vector3(), pole = new T.Vector3(), elbow = new T.Vector3();
  const lower = new T.Vector3(), rotation = new T.Quaternion();
  const upperUnit = upper.clone().normalize(), forearmUnit = forearm.clone().normalize();
  const directions = poses.map(p => new T.Vector3(
    -Math.sin(rad(p[4])) * Math.cos(rad(p[5])),
    Math.cos(rad(p[4])) * Math.cos(rad(p[5])), Math.sin(rad(p[5]))));
  const direction = new T.Vector3();
  return function pose(progress, weight) {
    const frame = Math.min(36, Math.max(0, progress * 36));
    let i = 0;
    while (i < poses.length - 2 && poses[i+1][0] < frame) i++;
    const a = poses[i], b = poses[i+1];
    const f = (frame-a[0])/(b[0]-a[0]);
    const sample = k => a[k] + (b[k]-a[k])*f;
    rig.body.rotation.y += weight * rad(sample(6));
    rig.head.rotation.y -= weight * rad(sample(6)*.25);
    rig.head.rotation.z += weight * rad(sample(7));
    free.a.rotateZ(-weight * rad(sample(8)));
    rig.cape.rotation.z = weight * rad(-sample(6)*.18);
    for (const feather of rig.feathers) feather.rotation.z += weight * rad(sample(7)*.65);

    // Solve the shoulder and elbow in shoulder space so the fingers stay on
    // the moving hilt. The rest elbow defines the natural bend plane.
    aim.set(sample(1),sample(2),sample(3)).multiplyScalar(weight).add(rest);
    const reach = T.MathUtils.clamp(aim.length(),Math.abs(l1-l2)+.001,l1+l2-.001);
    aim.normalize();
    pole.copy(upper).addScaledVector(aim,-upper.dot(aim)).normalize();
    const along = (reach*reach+l1*l1-l2*l2)/(2*reach);
    elbow.copy(aim).multiplyScalar(along).addScaledVector(pole,Math.sqrt(Math.max(0,l1*l1-along*along)));
    arm.a.quaternion.setFromUnitVectors(upperUnit,lower.copy(elbow).normalize());
    lower.copy(aim).multiplyScalar(reach).sub(elbow).normalize();
    lower.applyQuaternion(rotation.copy(arm.a.quaternion).invert());
    arm.elbow.quaternion.setFromUnitVectors(forearmUnit,lower);

    direction.copy(directions[i]).lerp(directions[i+1],f).normalize();
    direction.lerp(directions[0],1-weight).normalize();
    arm.elbow.getWorldQuaternion(rotation);
    rig.staff.quaternion.copy(rotation.invert()).multiply(
      rotation.setFromUnitVectors(up,direction));
    if (frame >= 4.6 && frame < 5.7) rig.visor.map = rig.sleepFace;
  };
}
