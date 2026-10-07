// The shared cel-shading materials: the three-tone ramp, the toon material, and the ink outline
// (an inflated black copy drawn behind a mesh). The old code-built ski clothes that lived here are gone.
import * as THREE from 'three';

export const TONES = (() => { const t = new THREE.DataTexture(new Uint8Array([110, 110, 110, 255, 190, 190, 190, 255, 255, 255, 255, 255]), 3, 1, THREE.RGBAFormat); t.minFilter = t.magFilter = THREE.NearestFilter; t.needsUpdate = true; return t; })();
// double-sided so looking into a hem or cuff shows lining, not the black outline behind it
export const toon = color => new THREE.MeshToonMaterial({ color, gradientMap: TONES, side: THREE.DoubleSide });
export const INK = (() => { const m = new THREE.MeshBasicMaterial({ color: 0x0b0c12, side: THREE.BackSide }); m.onBeforeCompile = sh => { sh.vertexShader = sh.vertexShader.replace('#include <begin_vertex>', 'vec3 transformed = position + normal * 0.006;'); }; return m; })();
