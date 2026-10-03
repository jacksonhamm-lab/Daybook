// Mixamo FBX (Without Skin) -> compact clips retargeted to VRM humanoid bones.
// Rotations are converted into the VRM *normalized* bone space (same maths as three-vrm's
// loadMixamoAnimation example); hips position is divided by the motion's hips height so the
// app can scale it to the model. Clips downloaded on a custom character get their arms straightened to
// a T-pose rest first. Usage, in a folder with `npm i three@0.169.0`: node convert-clips.mjs <fbx dir> <out.json>
import fs from 'fs';
import path from 'path';
import * as THREE from 'three';
import { FBXLoader } from 'three/examples/jsm/loaders/FBXLoader.js';

const MAP = {
  mixamorigHips: 'hips', mixamorigSpine: 'spine', mixamorigSpine1: 'chest', mixamorigSpine2: 'upperChest',
  mixamorigNeck: 'neck', mixamorigHead: 'head',
  mixamorigLeftShoulder: 'leftShoulder', mixamorigLeftArm: 'leftUpperArm', mixamorigLeftForeArm: 'leftLowerArm', mixamorigLeftHand: 'leftHand',
  mixamorigLeftHandThumb1: 'leftThumbMetacarpal', mixamorigLeftHandThumb2: 'leftThumbProximal', mixamorigLeftHandThumb3: 'leftThumbDistal',
  mixamorigLeftHandIndex1: 'leftIndexProximal', mixamorigLeftHandIndex2: 'leftIndexIntermediate', mixamorigLeftHandIndex3: 'leftIndexDistal',
  mixamorigLeftHandMiddle1: 'leftMiddleProximal', mixamorigLeftHandMiddle2: 'leftMiddleIntermediate', mixamorigLeftHandMiddle3: 'leftMiddleDistal',
  mixamorigLeftHandRing1: 'leftRingProximal', mixamorigLeftHandRing2: 'leftRingIntermediate', mixamorigLeftHandRing3: 'leftRingDistal',
  mixamorigLeftHandPinky1: 'leftLittleProximal', mixamorigLeftHandPinky2: 'leftLittleIntermediate', mixamorigLeftHandPinky3: 'leftLittleDistal',
  mixamorigRightShoulder: 'rightShoulder', mixamorigRightArm: 'rightUpperArm', mixamorigRightForeArm: 'rightLowerArm', mixamorigRightHand: 'rightHand',
  mixamorigRightHandThumb1: 'rightThumbMetacarpal', mixamorigRightHandThumb2: 'rightThumbProximal', mixamorigRightHandThumb3: 'rightThumbDistal',
  mixamorigRightHandIndex1: 'rightIndexProximal', mixamorigRightHandIndex2: 'rightIndexIntermediate', mixamorigRightHandIndex3: 'rightIndexDistal',
  mixamorigRightHandMiddle1: 'rightMiddleProximal', mixamorigRightHandMiddle2: 'rightMiddleIntermediate', mixamorigRightHandMiddle3: 'rightMiddleDistal',
  mixamorigRightHandRing1: 'rightRingProximal', mixamorigRightHandRing2: 'rightRingIntermediate', mixamorigRightHandRing3: 'rightRingDistal',
  mixamorigRightHandPinky1: 'rightLittleProximal', mixamorigRightHandPinky2: 'rightLittleIntermediate', mixamorigRightHandPinky3: 'rightLittleDistal',
  mixamorigLeftUpLeg: 'leftUpperLeg', mixamorigLeftLeg: 'leftLowerLeg', mixamorigLeftFoot: 'leftFoot', mixamorigLeftToeBase: 'leftToes',
  mixamorigRightUpLeg: 'rightUpperLeg', mixamorigRightLeg: 'rightLowerLeg', mixamorigRightFoot: 'rightFoot', mixamorigRightToeBase: 'rightToes',
};

const [,, dir, out] = process.argv;
const loader = new FBXLoader();
const result = {};
const q = new THREE.Quaternion(), restInv = new THREE.Quaternion(), parentRest = new THREE.Quaternion();
const r4 = v => Math.round(v * 1e4) / 1e4;

for (const file of fs.readdirSync(dir).filter(f => /\.fbx$/i.test(f))) {
  const buf = fs.readFileSync(path.join(dir, file));
  let asset;
  try { asset = loader.parse(buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength), ''); } catch (e) { console.log('skip', file, e.message); continue; }
  const clip = (asset.animations || []).find(a => a.name === 'mixamo.com') || (asset.animations || [])[0];
  if (!clip) { console.log('skip (no animation)', file); continue; }
  asset.updateMatrixWorld(true);
  // clips downloaded on a custom character can rest with the arms hanging; rotations are stored
  // relative to a T-pose rest, so straighten the arms first (+x is the character's left)
  const _a = new THREE.Vector3(), _c = new THREE.Vector3(), _q = new THREE.Quaternion(), _p = new THREE.Quaternion(), _w = new THREE.Quaternion();
  const aim = (bone, child, dir) => {
    if (!bone || !child) return;
    asset.updateMatrixWorld(true);
    const cur = child.getWorldPosition(_c).sub(bone.getWorldPosition(_a)).normalize();
    _q.setFromUnitVectors(cur, dir); bone.parent.getWorldQuaternion(_p); bone.getWorldQuaternion(_w);
    bone.quaternion.copy(_p.invert().multiply(_q.multiply(_w)));
  };
  const nb = n => asset.getObjectByName('mixamorig' + n);
  const sideX = Math.sign(nb('LeftArm').getWorldPosition(_a).x - nb('Hips').getWorldPosition(_c).x) || 1;
  for (const [s, x] of [['Left', sideX], ['Right', -sideX]]) {
    const dir = new THREE.Vector3(x, 0, 0);
    aim(nb(s + 'Arm'), nb(s + 'ForeArm'), dir); aim(nb(s + 'ForeArm'), nb(s + 'Hand'), dir);
    aim(nb(s + 'Hand'), nb(s + 'HandMiddle1') || nb(s + 'HandIndex1'), dir);
  }
  asset.updateMatrixWorld(true);
  const hipsNode = asset.getObjectByName('mixamorigHips');
  const hipsH = hipsNode.position.y;
  const key = file.replace(/\.fbx$/i, '').toLowerCase().replace(/\s*\(\d+\)/g, '2').replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');
  const tracks = {};
  let fps = 30, frames = 0;
  for (const tr of clip.tracks) {
    const [node, prop] = tr.name.split('.');
    const bone = MAP[node]; if (!bone) continue;
    const src = asset.getObjectByName(node);
    if (prop === 'quaternion') {
      src.getWorldQuaternion(restInv).invert();
      src.parent.getWorldQuaternion(parentRest);
      const v = [];
      for (let i = 0; i < tr.values.length; i += 4) {
        q.fromArray(tr.values, i).premultiply(parentRest).multiply(restInv);
        v.push(r4(q.x), r4(q.y), r4(q.z), r4(q.w));
      }
      // a bone that never moves only needs one key
      const still = v.every((x, i) => Math.abs(x - v[i % 4]) < 2e-4);
      tracks[bone] = { t: still ? [0] : Array.from(tr.times, r4), q: still ? v.slice(0, 4) : v };
    } else if (prop === 'position' && bone === 'hips') {
      const v = Array.from(tr.values, x => r4(x / hipsH));
      tracks.hipsPos = { t: Array.from(tr.times, r4), p: v };
    }
    if (tr.times.length > frames) { frames = tr.times.length; if (frames > 1) fps = Math.round((frames - 1) / (tr.times[frames - 1] - tr.times[0])); }
  }
  result[key] = { file, dur: r4(clip.duration), fps, frames, tracks };
  console.log(key.padEnd(28), clip.duration.toFixed(2) + 's', Object.keys(tracks).length + ' tracks', 'hipsH ' + hipsH.toFixed(1));
}
fs.writeFileSync(out, JSON.stringify(result));
console.log('wrote', out, (fs.statSync(out).size / 1e6).toFixed(2) + 'MB');
