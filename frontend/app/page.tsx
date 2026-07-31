'use client';

import { useEffect, useState } from 'react';

const SPINNER_FRAMES = ['|', '/', '-', '\\'];
const DOT_FRAMES = ['.', '..', '...', ''];

const BAR_WIDTH = 24;

const ASCII_TEXT = `  ___ _   _ ___ _    ___ ___ _  _  ___
 | _ ) | | |_ _| |  |   \\_ _| \\| |/ __|
 | _ \\ |_| || || |__| |) | || .\` | (_ |
 |___/\\___/|___|____|___/___|_|\\_|\\___|

  ___  ___  __  __ ___ _____ _  _ ___ _  _  ___
 / __|/ _ \\|  \\/  | __|_   _| || |_ _| \\| |/ __|
 \\__ \\ (_) | |\\/| | _|  | | | __ || || .\` | (_ |
 |___/\\___/|_|  |_|___| |_| |_||_|___|_|\\_|\\___|

   ___ ___ ___   _ _____
  / __| _ \\ __| /_\\_   _|
 | (_ |   / _| / _ \\| |
  \\___|_|_\\___/_/ \\_\\_|`;

export default function Home() {
  const [tick, setTick] = useState(0);

  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 120);
    return () => clearInterval(id);
  }, []);

  const spinner = SPINNER_FRAMES[tick % SPINNER_FRAMES.length];
  const dots = DOT_FRAMES[Math.floor(tick / 4) % DOT_FRAMES.length];

  const filled = tick % (BAR_WIDTH + 1);
  const bar = '['.concat(
    '#'.repeat(filled),
    '-'.repeat(BAR_WIDTH - filled),
    ']'
  );

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-white text-black font-mono px-4">
      <pre className="text-center leading-tight whitespace-pre select-none text-[clamp(6px,1.4vw,16px)]">
        {ASCII_TEXT}
        {'\n\n'}
        {bar}
        {'\n\n'}
        {spinner} loading{dots}
      </pre>
    </div>
  );
}
