import { DiscoveryStyleId } from '../types';

/**
 * Each of the six Axcel discovery styles is a felt flower. The flower is the person's
 * identity across the app: the garland, profiles, avatars and the reveal.
 */
export interface FlowerInfo {
  flower: string;
  /** Petal colour, used for art and tinted surfaces. */
  color: string;
  /** Deeper shade of the petal colour. */
  deep: string;
  /** One-line, plain-language description of the style. */
  tagline: string;
}

export const FLOWERS: Record<DiscoveryStyleId, FlowerInfo> = {
  Explorer: {
    flower: 'Dandelion',
    color: '#8cc4e8',
    deep: '#4a8fc2',
    tagline: 'Goes wherever the wind looks interesting.',
  },
  Creator: {
    flower: 'Poppy',
    color: '#ee5a3c',
    deep: '#c23e24',
    tagline: 'Bright, bold and always making something.',
  },
  Connector: {
    flower: 'Daisy',
    color: '#f2a6c0',
    deep: '#d4648c',
    tagline: 'Grows best in a bunch.',
  },
  Achiever: {
    flower: 'Sunflower',
    color: '#f4c542',
    deep: '#c99400',
    tagline: 'Turns toward the goal and grows tall.',
  },
  Chiller: {
    flower: 'Lavender',
    color: '#b8a3ee',
    deep: '#8468d8',
    tagline: 'Brings calm wherever it grows.',
  },
  Thinker: {
    flower: 'Iris',
    color: '#6f7fe0',
    deep: '#4a5bc8',
    tagline: 'Looks closely and wonders why.',
  },
};

export const STYLE_ORDER: DiscoveryStyleId[] = ['Explorer', 'Creator', 'Connector', 'Achiever', 'Chiller', 'Thinker'];
