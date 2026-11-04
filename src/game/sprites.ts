/**
 * Pure-code String-Matrix Pixel Art Sprite Engine.
 * Zero external image dependencies.
 * Uses 2D ASCII character arrays scaled via ctx.fillRect for crisp NES/Arcade pixel art.
 */

export type Palette = Record<string, string>;

export const DEFAULT_PALETTE: Palette = {
  '.': 'transparent',
  'K': '#0f172a', // Black / Deep chassis slate
  'N': '#1e293b', // Dark Navy / ESD Tech Hoodie
  'W': '#f8fafc', // White / Highlights / Screen text
  'S': '#fdba74', // Warm skin tone
  'H': '#451a03', // Dark brown hair
  'B': '#06b6d4', // Cyan / Noise-canceling headset & badge lanyard
  'D': '#334155', // Dark Grey metal / Server chassis
  'L': '#94a3b8', // Light Grey metal / Server blade faceplates
  'G': '#22c55e', // Phosphor Green / Terminal screen & OK LEDs
  'R': '#ef4444', // Error Red / Alert LEDs
  'Y': '#f59e0b', // Amber / Fiber patch & warning LEDs
  'P': '#a855f7', // Magenta / Heap leak slime
  'E': '#38bdf8', // Electric cyan / Glasses & GC discharge arc
  'O': '#fb923c', // Orange spark
};

// 16x16 On-Call SRE Systems Engineer (ESD Tech Hoodie + Headset + Security Badge + Crash-Cart Laptop)
export const SRE_IDLE_1 = [
  "....BBBBBBBB....",
  "...BHHHHHHHHB...",
  "..BBHSSSSHSSBB..",
  "..B.SEESSEES.B..",
  "....SSSSSSSS....",
  ".....NNNNNN.....",
  "...NNNNBBNNNN...",
  "..DNNNNGWNNNND..",
  "..DNNNNGWNNNNEE.",
  "..DNNNNNNNNNNGG.",
  "...NNNNNNNNNDDDD",
  "...NNNNNNNNNN...",
  "....DD....DD....",
  "....DD....DD....",
  "....DD....DD....",
  "....KK....KK...."
];

// 16x16 On-Call SRE Systems Engineer (Idle Frame 2 - Typing on Crash-Cart Laptop)
export const SRE_IDLE_2 = [
  "....BBBBBBBB....",
  "...BHHHHHHHHB...",
  "..BBHSSSSHSSBB..",
  "..B.SEESSEES.B..",
  "....SSSSSSSS....",
  ".....NNNNNN.....",
  "...NNNNBBNNNN...",
  "..DNNNNGWNNNND..",
  "..DNNNNGWNNNNGE.",
  "...NNNNNNNNNEE..",
  "...NNNNNNNNNDDDD",
  "...NNNNNNNNNN...",
  "....DD....DD....",
  "....DD....DD....",
  "....KK....KK....",
  "................"
];

// 16x16 On-Call SRE Systems Engineer (Beat 7 GC Bus Discharge Action!)
export const SRE_DISCHARGE = [
  "EE..BBBBBBBB..EE",
  ".EEBHHHHHHHHBEE.",
  "..BBHSSSSHSSBB..",
  "..B.SEESSEES.B..",
  "..EDSSSSSSSS.EE.",
  "..ED.NNNNNN..GE.",
  "...DNNNBBNNNNEE.",
  "...NNNNGWNNNNEEE",
  "...NNNNGWNNNNDDD",
  "...NNNNNNNNNN...",
  "...NNNNNNNNNN...",
  "...NNNNNNNNNN...",
  "....DD....DD....",
  "....DD....DD....",
  "....KK....KK....",
  "................"
];

// 20x24 42U Blade Server Rack with KVM Monitor & Cage Nut Rails
export const SERVER_RACK = [
  "DDDDDDDDDDDDDDDDDDDD",
  "DKKKKKKKKKKKKKKKKKKD",
  "DKYLLLLLLLLLLLLLLYKD",
  "DK.LG..DDDDDD..GL.KD",
  "DK.LLLLLLLLLLLLLL.KD",
  "DKYLLLLLLLLLLLLLLYKD",
  "DK.LG..DDDDDD..GL.KD",
  "DK.LLLLLLLLLLLLLL.KD",
  "DK.DDDDDDDDDDDDDD.KD",
  "DK.DKKKKKKKKKKKKD.KD",
  "DK.DKGGGGGGGGGGKD.KD",
  "DK.DKGEEGGGGEEGKD.KD",
  "DK.DKKKKKKKKKKKKD.KD",
  "DK.DDDDDDDDDDDDDD.KD",
  "DKYLLLLLLLLLLLLLLYKD",
  "DK.LY..DDDDDD..YL.KD",
  "DK.LLLLLLLLLLLLLL.KD",
  "DKYLLLLLLLLLLLLLLYKD",
  "DK.LR..DDDDDD..RL.KD",
  "DK.LLLLLLLLLLLLLL.KD",
  "DKYLLLLLLLLLLLLLLYKD",
  "DK.LR..DDDDDD..RL.KD",
  "DKKKKKKKKKKKKKKKKKKD",
  "DDDDDDDDDDDDDDDDDDDD"
];

// Boss 1: Memory Leak Slime (16x16 Frame 1)
export const SLIME_1 = [
  "......PPPP......",
  "....PPPPPPPP....",
  "...PPPPPPPPPP...",
  "..PPDDPPPPDDPP..",
  "..PPDDPPPPDDPP..",
  ".PPPPGGPPGGPPPP.",
  ".PPPPGGPPGGPPPP.",
  ".PPPPPPPPPPPPPP.",
  "PPPPPDDDDDDPPPPP",
  "PPPPPDDDDDDPPPPP",
  "PPPPPGGGGPGPPPPP",
  "PPPPPGGGGPGPPPPP",
  ".PPPPPPPPPPPPPP.",
  ".PPPPPPPPPPPPPP.",
  "..PPP..PPPP..PP.",
  "................"
];

// Boss 1: Memory Leak Slime (Frame 2 - Pulsing & Bloated)
export const SLIME_2 = [
  ".....PPPPPP.....",
  "...PPPPPPPPPP...",
  "..PPPPPPPPPPPP..",
  ".PPDDPPPPPPDDPP.",
  ".PPDDPPPPPPDDPP.",
  "PPPPPGGPPGGPPPPP",
  "PPPPPGGPPGGPPPPP",
  "PPPPPPPPPPPPPPPP",
  "PPPPPDDDDDDPPPPP",
  "PPPPPDDDDDDPPPPP",
  "PPPPPGGGGPGPPPPP",
  "PPPPPPPPPPPPPPPP",
  ".PPPPPPPPPPPPPP.",
  "..PPPPPPPPPPPP..",
  "...PP..PPPP..P..",
  "................"
];

// Boss 2: Deadlock Ghost (Two threads bound by Mutex Locks) (20x16)
export const DEADLOCK_GHOST_1 = [
  "..EEEE....EEEE..",
  ".EKKKEE..EEKKKE.",
  "EKKRKKEEEEKKRKK.",
  "EKKRKKEEEEKKRKK.",
  "EEEEEEEEEEEEEEEE",
  ".EE.YY....YY.EE.",
  "..E.YYDDDDYY.E..",
  "...EYYDYYDYYE...",
  "...EYYYYYYYYE...",
  "...E.YYDDYY.E...",
  "...E..YYYY..E...",
  "..EE..YYYY..EE..",
  ".EEEE......EEEE.",
  "E.EE.E....E.EE.E",
  ".E..E......E..E.",
  "................"
];

export const DEADLOCK_GHOST_2 = [
  "..EEEE....EEEE..",
  ".EEKKKE..EKKKEE.",
  ".EKKRKKEEEEKKRKE",
  ".EKKRKKEEEEKKRKE",
  "EEEEEEEEEEEEEEEE",
  "..E.YY....YY.E..",
  "...EYYDDDDYYE...",
  "...EYYDYYDYYE...",
  "...EYYYYYYYYE...",
  "...E.YYDDYY.E...",
  "..EE..YYYY..EE..",
  ".EEEE.YYYY.EEEE.",
  "E.EE........EE.E",
  ".E..E......E..E.",
  "................",
  "................"
];

// Boss 3: DDoS Flood Daemon (Wave of botnet nodes and SYN packets) (24x16)
export const DDOS_BEAST_1 = [
  "RRRR....RRRR....RRRR....",
  "RWWWR..RWWWR..RWWWR..RR.",
  "RWKWR..RWKWR..RWKWR.RWW.",
  "RWWWR..RWWWR..RWWWR.RWK.",
  ".RRR....RRR....RRR..RWW.",
  "....................RRR.",
  "...BBBBBB..BBBBBB.......",
  "..BKKKKKKBBKKKKKKB......",
  "..BKRKKRKBKRKKRKB.......",
  "..BKRKKRKBKRKKRKB.......",
  "..BKKKKKKBBKKKKKKB......",
  "...BBBBBB..BBBBBB.......",
  "........................",
  "RRRR....RRRR....RRRR....",
  "RWWWR..RWWWR..RWWWR.....",
  ".RRR....RRR....RRR......"
];

export const DDOS_BEAST_2 = [
  ".RRRR....RRRR....RRRR...",
  ".RWWWR..RWWWR..RWWWR....",
  ".RWKWR..RWKWR..RWKWR....",
  ".RWWWR..RWWWR..RWWWR....",
  "..RRR....RRR....RRR.....",
  "........................",
  "....BBBBBB..BBBBBB......",
  "...BKKKKKKBBKKKKKKB.....",
  "...BKRKKRKBKRKKRKB......",
  "...BKRKKRKBKRKKRKB......",
  "...BKKKKKKBBKKKKKKB.....",
  "....BBBBBB..BBBBBB......",
  "........................",
  "..RRRR....RRRR....RRRR..",
  "..RWWWR..RWWWR..RWWWR...",
  "...RRR....RRR....RRR...."
];

/**
 * Draws a pixel matrix onto an HTML5 CanvasRenderingContext2D.
 */
export function renderPixelMatrix(
  ctx: CanvasRenderingContext2D,
  matrix: string[],
  x: number,
  y: number,
  scale: number = 4,
  palette: Palette = DEFAULT_PALETTE,
  opacity: number = 1.0
) {
  if (opacity <= 0) return;
  const prevAlpha = ctx.globalAlpha;
  ctx.globalAlpha = prevAlpha * opacity;

  for (let r = 0; r < matrix.length; r++) {
    const row = matrix[r];
    for (let c = 0; c < row.length; c++) {
      const char = row[c];
      const color = palette[char];
      if (color && color !== 'transparent') {
        ctx.fillStyle = color;
        ctx.fillRect(Math.floor(x + c * scale), Math.floor(y + r * scale), scale, scale);
      }
    }
  }

  ctx.globalAlpha = prevAlpha;
}

/**
 * Draws jagged pixel lightning bolt between two points.
 */
export function drawPixelLightning(
  ctx: CanvasRenderingContext2D,
  startX: number,
  startY: number,
  endX: number,
  endY: number,
  pixelSize: number = 4,
  color: string = '#38bdf8'
) {
  ctx.fillStyle = color;
  const steps = 14;
  let curX = startX;
  let curY = startY;

  for (let i = 0; i <= steps; i++) {
    const progress = i / steps;
    const targetX = startX + (endX - startX) * progress;
    const targetY = startY + (endY - startY) * progress;
    const jitterX = (Math.random() - 0.5) * 20;
    const jitterY = (Math.random() - 0.5) * 16;

    const nextX = i === steps ? endX : targetX + jitterX;
    const nextY = i === steps ? endY : targetY + jitterY;

    // Draw jagged blocky segment
    const dx = nextX - curX;
    const dy = nextY - curY;
    const dist = Math.hypot(dx, dy);
    const subSteps = Math.ceil(dist / pixelSize);

    for (let s = 0; s <= subSteps; s++) {
      const px = Math.floor((curX + (dx * s) / (subSteps || 1)) / pixelSize) * pixelSize;
      const py = Math.floor((curY + (dy * s) / (subSteps || 1)) / pixelSize) * pixelSize;
      ctx.fillRect(px, py, pixelSize, pixelSize);
    }

    curX = nextX;
    curY = nextY;
  }
}
