import { TestKind } from '../types';

// What a test made with Vetter's AI is called. New ones are job simulation tests or training; standalone interactive
// simulations made before are still named as such
export const kindLabel = (kind?: TestKind) =>
  kind === 'training' ? 'Training' : kind === 'standalone' ? 'Interactive simulation' : kind === 'test' ? 'Skills test' : 'Job simulation test';
