import React from 'react';
import { RevealStage } from './RevealStage';

/**
 * 16:10 logo area for the quiz. Delegates to the reveal engine: a brand tagged
 * with an `obfuscation_type` is obscured with that mode (at the brand's
 * `start_reveal` level, or the mode's fixed level when unset); brands with
 * `none` (the default) show their logo in full. On reveal / give-up the
 * RevealCard shows the full answer.
 */
export function LogoStage({
  imageUrl,
  dominantColor,
  obfuscationType = 'none',
  startReveal,
}: {
  imageUrl?: string | null;
  dominantColor?: string | null;
  obfuscationType?: string | null;
  startReveal?: unknown;
}) {
  return <RevealStage imageUrl={imageUrl} mode={obfuscationType} startReveal={startReveal} dominantColor={dominantColor} />;
}
