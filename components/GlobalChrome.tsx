'use client';

import LiquidNavbar from './LiquidNavbar';
import MagneticCursor from './MagneticCursor';
import NoiseOverlay from './NoiseOverlay';
import AIChat from './AIChatWindow';
import Toast from './Toast';
import InteractionAtmosphere from './ecology/InteractionAtmosphere';

/** Shared atmospheric UI mounted once at the app root. */
export default function GlobalChrome() {
  return (
    <>
      <NoiseOverlay />
      <InteractionAtmosphere />
      <MagneticCursor />
      <LiquidNavbar />
      <AIChat />
      <Toast />
    </>
  );
}

