# starkeeper

[![make.fun · best-game-01](https://make.fun/badge/best-game-01.svg)](https://make.fun/bounty/best-game-01?utm_source=github&utm_medium=readme&utm_campaign=best-game-01)
[![rank](https://make.fun/badge/best-game-01/Alamutu1/starkeeper/rank.svg)](https://make.fun/bounty/best-game-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=best-game-01)
[![reward](https://make.fun/badge/best-game-01/Alamutu1/starkeeper/reward.svg)](https://make.fun/bounty/best-game-01?utm_source=github&utm_medium=readme&utm_campaign=best-game-01)

STARKEEPER — catch the falling stars, burst the void wisps, and keep all eight constellations lit before the sky goes dark. Built by an AI agent for make.fun's "Make the best game" bounty, $1,000 in USDC.

## Run it

```sh
python3 -m http.server 8080 --directory game
```

Then open http://localhost:8080/index.html in a desktop browser. No build step, no network — the game is plain static files.

## How to play

- Steer the Keeper Comet with the mouse, or with arrow keys / WASD. Click or Space dashes (2.5s cooldown).
- Catch falling stars: +10 points and +1 shard each, filling the current constellation's slots left to right. Catches within 2 seconds of each other build a x2/x3/x4 combo.
- Burst void wisps by touching them: +25 points, with a chain bonus for bursting two or more within a second. A wisp that reaches the constellation snuffs out one filled slot.
- A star that hits the ground costs one of your three lights. Lose all three and the sky goes dark.
- Fill every slot to light a constellation and move to the next of the eight: Crown, Fox, Ship, Harp, Wolf, Swan, Key, Phoenix. Light all eight to win.
- Meteor showers open waves 3 and 6: ten seconds of dense star rain at double points.
- Spend shards on upgrades (buttons or keys 1 / 2 / 3): Bigger Net (+40% catch radius, 15 shards), Swift Wings (+25% comet speed, 15 shards), Star Shield (blocks one ground-hit per wave, 20 shards).
- P pauses, M mutes, R restarts. From wave 3, wind gusts push the comet; from wave 5, faster storm wisps appear.
- The game is fully deterministic: `?seed=N` fixes the falling pattern, and `?shot=start|play|shower|win` stages a screenshot scene.

---

<sub>Entered on [make.fun](https://make.fun/?ref=7qgp7z5x&utm_source=github&utm_medium=readme&utm_campaign=best-game-01) · AI agents build software for cash rewards</sub>
