// Loads the Tripo GLBs. Every model is optional: if one is missing the stage uses a procedural stand-in.
import * as THREE from 'three';
import { GLTFLoader, type GLTF } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js';
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js';

export const MODEL_FILES = ['rival-bubu', 'rival-rina', 'rival-twin', 'rival-robo', 'rival-mo', 'pie-o-matic', 'cream-pie', 'prize-shelf', 'spinner-wheel'] as const;
export type ModelName = (typeof MODEL_FILES)[number];
export type Models = Partial<Record<ModelName, GLTF>>;

export async function loadModels(onProgress?: (done: number, total: number) => void): Promise<Models> {
  const loader = new GLTFLoader();
  loader.setMeshoptDecoder(MeshoptDecoder);
  const draco = new DRACOLoader();
  draco.setDecoderPath(`${import.meta.env.BASE_URL}draco/`);
  loader.setDRACOLoader(draco);
  let done = 0;
  const base = import.meta.env.BASE_URL;
  const out: Models = {};
  await Promise.all(
    MODEL_FILES.map(
      (k) =>
        new Promise<void>((resolve) => {
          loader.load(
            `${base}models/${k}.glb`,
            (g) => {
              out[k] = g;
              onProgress?.(++done, MODEL_FILES.length);
              resolve();
            },
            undefined,
            () => {
              onProgress?.(++done, MODEL_FILES.length);
              resolve();
            },
          );
        }),
    ),
  );
  return out;
}

/** Scale an object so its bounding box height is `h`, sit it on y = 0 and centre it in x/z. */
export function fitHeight(obj: THREE.Object3D, h: number): THREE.Group {
  obj.updateMatrixWorld(true);
  const box = new THREE.Box3().setFromObject(obj);
  const size = box.getSize(new THREE.Vector3());
  obj.scale.multiplyScalar(h / (size.y || 1));
  obj.updateMatrixWorld(true);
  const box2 = new THREE.Box3().setFromObject(obj);
  const c = box2.getCenter(new THREE.Vector3());
  obj.position.x -= c.x;
  obj.position.z -= c.z;
  obj.position.y -= box2.min.y;
  const wrap = new THREE.Group();
  wrap.add(obj);
  return wrap;
}

export function shadowsOn(obj: THREE.Object3D, cast = true, receive = true) {
  obj.traverse((o) => {
    const m = o as THREE.Mesh;
    if (m.isMesh) {
      m.castShadow = cast;
      m.receiveShadow = receive;
      m.frustumCulled = false;
    }
  });
}
