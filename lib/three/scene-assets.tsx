'use client';
import { createContext, useContext, type ComponentProps } from 'react';
import { useGLTF as originalGLTF, useTexture as originalTexture, useEnvironment as originalEnvironment, Environment as OriginalEnvironment } from '@react-three/drei';
import { SceneResourceScope, sceneError } from './resource-scope';
import { peek } from 'suspend-react';
import { GLTFLoader, RGBELoader, EXRLoader } from 'three-stdlib';
import { CubeTextureLoader, TextureLoader } from 'three';

export const SceneResources = createContext<SceneResourceScope | null>(null);
const keyFor = (kind: string, input: unknown) => `${kind}:${JSON.stringify(input)}`;
const isPending = (error: unknown) => Boolean(error && typeof (error as PromiseLike<unknown>).then === 'function');
const cached = (loader: unknown, input: unknown) => peek([loader, ...(Array.isArray(input) ? input : [input])]) !== undefined;

// Preserve Drei's public types, preload and decoder configuration. Intercept
// suspension/errors without replacing its GLTF, Meshopt or Draco loaders.
export const useGLTF: typeof originalGLTF = Object.assign(function useSceneGLTF(...args: Parameters<typeof originalGLTF>) {
  // A sibling can fail before React revisits this suspended hook. Consult the
  // underlying completed batch at retry time so its successful cache survives.
  const scope = useContext(SceneResources), key = keyFor('gltf', args[0]), clear = () => { if (!cached(GLTFLoader, args[0])) originalGLTF.clear(args[0]); };
  try { const result = originalGLTF(...args); scope?.record(key, 'ready', clear); return result; }
  catch (error) { if (isPending(error)) scope?.trackPending(key, error as PromiseLike<unknown>, clear, () => cached(GLTFLoader, args[0])); else scope?.record(key, 'error', clear, sceneError(error)); throw error; }
}, originalGLTF) as typeof originalGLTF;

export const useTexture: typeof originalTexture = Object.assign(function useSceneTexture(input: Parameters<typeof originalTexture>[0], onLoad?: Parameters<typeof originalTexture>[1]) {
  const scope = useContext(SceneResources);
  // Drei converts a texture object into Object.values before calling useLoader.
  const urls = typeof input === 'object' && !Array.isArray(input) ? Object.values(input) : input;
  const key = keyFor('texture', urls), clear = () => { if (!cached(TextureLoader, urls)) originalTexture.clear(urls); };
  try { const result = originalTexture(input, onLoad); scope?.record(key, 'ready', clear); return result; }
  catch (error) { if (isPending(error)) scope?.trackPending(key, error as PromiseLike<unknown>, clear, () => cached(TextureLoader, urls)); else scope?.record(key, 'error', clear, sceneError(error)); throw error; }
}, originalTexture) as typeof originalTexture;

export const useEnvironment: typeof originalEnvironment = Object.assign(function useSceneEnvironment(options: Parameters<typeof originalEnvironment>[0] = {}) {
  const scope = useContext(SceneResources), key = keyFor('environment', [options.files, options.preset]);
  const files = options.files, loader = Array.isArray(files) ? CubeTextureLoader : typeof files === 'string' && /\.hdr(?:\?|$)/i.test(files) ? RGBELoader : typeof files === 'string' && /\.exr(?:\?|$)/i.test(files) ? EXRLoader : null;
  const isCached = () => Boolean(loader && cached(loader, Array.isArray(files) ? [files] : files));
  const clear = () => { if (!isCached()) originalEnvironment.clear(options); };
  try { const result = originalEnvironment(options); scope?.record(key, 'ready', clear); return result; }
  catch (error) { if (isPending(error)) scope?.trackPending(key, error as PromiseLike<unknown>, clear, isCached); else scope?.record(key, 'error', clear, sceneError(error)); throw error; }
}, originalEnvironment);

function LoadedEnvironment(props: ComponentProps<typeof OriginalEnvironment>) {
  const texture = useEnvironment(props);
  // EnvironmentCube disposes the globally cached HDR on every unmount in the
  // installed Drei version. EnvironmentMap restores scene bindings only.
  return <OriginalEnvironment {...props} map={texture} />;
}
export function Environment(props: ComponentProps<typeof OriginalEnvironment>) {
  return props.children || props.map || props.ground ? <OriginalEnvironment {...props} /> : <LoadedEnvironment {...props} />;
}
