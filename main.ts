// STARKEEPER — the entry program for make.fun best-game-01.
//
// This program does one job: it stages this repository's playable game and
// its screenshots into the output directory the grader points at, and it
// writes the dossier the scorer reads, using the vendored make.fun library.
// It runs on Node 22+ with the standard library only and makes no network
// requests. Locally, MAKEFUN_OUTPUT_DIR stands in for /output:
//
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
//
// The staged game is deterministic: the same repository always produces
// the same bytes in the output directory, so running this twice and
// diffing the two outputs shows no differences.

import { cpSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-game.ts';

const repo = fileURLToPath(new URL('.', import.meta.url));
const output = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

const gameDir = join(repo, 'game');
const shotsDir = join(repo, 'screenshots');

mkdirSync(output, { recursive: true });
cpSync(gameDir, join(output, 'game'), { recursive: true });

const shotsOut = join(output, 'screenshots');
mkdirSync(shotsOut, { recursive: true });
if (existsSync(shotsDir)) {
  cpSync(shotsDir, shotsOut, { recursive: true });
}

// The caps below mirror the competition gate, so a local run fails exactly
// where the scorer would: at most 4 screenshots of 256 KiB each, at most
// 993 files and 48 MiB under game/, and no game path over 1000 bytes.
const dossier = buildDossier(output, {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 262144 },
  game_max_files: 993,
  game_max_bytes: 50331648,
  game_path_max_bytes: 1000,
});

writeFileSync(join(output, 'dossier.json'), dossier);
