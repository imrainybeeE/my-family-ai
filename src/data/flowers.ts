import { DiscoveryStyleId } from '../types';

/**
 * Each of the six Axcel discovery styles blooms as a flower. The flower is the person's
 * identity across the app: garden, profile, chat attributions and the reveal.
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
    color: '#9fd3ef',
    deep: '#3f8fc0',
    tagline: 'Goes wherever the wind looks interesting.',
  },
  Creator: {
    flower: 'Poppy',
    color: '#ff6a4d',
    deep: '#d8402a',
    tagline: 'Bright, bold and always making something.',
  },
  Connector: {
    flower: 'Daisy',
    color: '#ffc4d8',
    deep: '#e0628f',
    tagline: 'Grows best in a bunch.',
  },
  Achiever: {
    flower: 'Sunflower',
    color: '#ffd23f',
    deep: '#c99400',
    tagline: 'Turns toward the goal and grows tall.',
  },
  Chiller: {
    flower: 'Lavender',
    color: '#bba8f5',
    deep: '#7d63d6',
    tagline: 'Brings calm wherever it grows.',
  },
  Thinker: {
    flower: 'Iris',
    color: '#7f9bff',
    deep: '#4361e0',
    tagline: 'Looks closely and wonders why.',
  },
};

export const STYLE_ORDER: DiscoveryStyleId[] = ['Explorer', 'Creator', 'Connector', 'Achiever', 'Chiller', 'Thinker'];
