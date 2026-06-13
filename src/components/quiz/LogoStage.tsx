import React from 'react';
import { RevealStage } from './RevealStage';

/**
 * 16:10 logo area for the quiz. Delegates to the reveal engine: a brand tagged
 * with an `obfuscation_type` is obscured with that mode (at the mode's fixed
 * level); brands with `none` (the default) show their logo in full. On reveal /
 * give-up the RevealCard shows the full answer.
 */
export function LogoStage({
  imageUrl,
  dominantColor,
  obfuscationType = 'none',
}: {
  imageUrl?: string | null;
  dominantColor?: string | null;
  obfuscationType?: string | null;
}) {
  return <RevealStage imageUrl={imageUrl} mode={obfuscationType} dominantColor={dominantColor} />;
}
