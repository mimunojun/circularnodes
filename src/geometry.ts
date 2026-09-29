/**
 * グリッドの幾何計算。UI・描画方式に依存しない純粋関数のみを置く。
 * 設計書 docs/implement/prototype-01.md 8 章、技術仕様書 6.2 / 7.2。
 */
import { CELL_SIZE, SAMPLE_STEP, SHAPE_CURVE_SEGMENTS } from './config';
import type {
  GridConfig,
  GridPoint,
  GridSize,
  PathSegment,
  Point,
  RegionId,
  RegionKind,
  RegionShape,
} from './types';

/** セル中心から見た内接円の半径（グリッド座標） */
const UNIT_RADIUS = 0.5;

/** 隅領域を NW から時計回りに何回 90 度回して得るか */
const CORNER_TURNS: Record<Exclude<RegionKind, 'C'>, number> = {
  NW: 0,
  NE: 1,
  SE: 2,
  SW: 3,
};

/** SVG の円弧フラグ。既定の正円では隅領域はすべて同じ向きの四分円になる */
export const ARC_LARGE_FLAG = 0;
export const ARC_SWEEP_FLAG = 0;

/**
 * ノード形状 t から L^p ノルムの指数を求める（機能仕様書 17.2）。
 * t = 0 で菱形 (p=1)、0.5 で正円 (p=2)、1 で正方形 (p=∞)。
 */
export function shapeExponent(shape: number): number {
  return 1 / (1 - shape);
}

/** グリッドのピクセル寸法。キャンバスの大きさもこれに一致する */
export function gridPixelSize(grid: GridSize): { width: number; height: number } {
  return { width: grid.columns * CELL_SIZE, height: grid.rows * CELL_SIZE };
}

/**
 * キャンバス上の CSS ピクセル座標をグリッド座標に変換する。
 * スクリーン座標 → （倍率で割る）→ ワールド座標 → （辺長で割る）→ グリッド座標。
 */
export function screenToGrid(px: number, py: number, zoom: number): GridPoint {
  return { gx: px / (CELL_SIZE * zoom), gy: py / (CELL_SIZE * zoom) };
}

/** 正規化座標 (0..1) が中心領域に入るか。境界上は中心領域に含める */
function isInsideCenter(u: number, v: number, p: number): boolean {
  if (p === 2) return u * u + v * v <= 1;
  if (p === 1) return u + v <= 1;
  return u ** p + v ** p <= 1;
}

/**
 * グリッド座標の点が属する領域を返す。グリッド外なら null。
 * グリッドの大きさと形状は実行時に変わるため、引数で受け取る。
 */
export function hitTest(gx: number, gy: number, grid: GridConfig): RegionId | null {
  const col = Math.floor(gx);
  const row = Math.floor(gy);
  if (col < 0 || col >= grid.columns || row < 0 || row >= grid.rows) return null;

  const lx = gx - col;
  const ly = gy - row;
  // 中心基準に正規化する（セルの辺が ±1）
  const u = Math.abs(lx - 0.5) / UNIT_RADIUS;
  const v = Math.abs(ly - 0.5) / UNIT_RADIUS;

  if (isInsideCenter(u, v, shapeExponent(grid.shape))) return { col, row, kind: 'C' };

  const kind: RegionKind =
    ly < 0.5 ? (lx < 0.5 ? 'NW' : 'NE') : lx < 0.5 ? 'SW' : 'SE';
  return { col, row, kind };
}

/**
 * 2 点間を等間隔にサンプリングし、通過した領域を重複なく返す。
 * 始点は含まない（直前の pointermove で処理済みのため）。
 */
export function regionsOnSegment(from: GridPoint, to: GridPoint, grid: GridConfig): RegionId[] {
  const dist = Math.hypot(to.gx - from.gx, to.gy - from.gy);
  const steps = Math.max(1, Math.ceil(dist / SAMPLE_STEP));

  const found: RegionId[] = [];
  const seen = new Set<string>();

  for (let i = 1; i <= steps; i++) {
    const t = i / steps;
    const region = hitTest(
      from.gx + (to.gx - from.gx) * t,
      from.gy + (to.gy - from.gy) * t,
      grid,
    );
    if (!region) continue;

    const key = `${region.col},${region.row},${region.kind}`;
    if (seen.has(key)) continue;
    seen.add(key);
    found.push(region);
  }
  return found;
}

/** 原点まわりに 90 度 × turns だけ回転する（画面座標系なので時計回り） */
function rotate(turns: number, x: number, y: number): Point {
  switch (turns % 4) {
    case 1:
      return { x: -y, y: x };
    case 2:
      return { x: -x, y: -y };
    case 3:
      return { x: y, y: -x };
    default:
      return { x, y };
  }
}

// --- 四分スーパー楕円（正規化座標。(1,0) から (0,1) へ向かう） ---

function quarterPoint(theta: number, p: number): Point {
  const m = 2 / p;
  return { x: Math.cos(theta) ** m, y: Math.sin(theta) ** m };
}

/**
 * 進行方向の単位接線。
 * θ の微分は p > 2 で端点が発散するため、勾配から求め、端点は解析的な極限値を使う。
 */
function quarterTangent(theta: number, p: number): Point {
  const root = Math.SQRT1_2;
  if (theta <= 0) {
    if (p > 1) return { x: 0, y: 1 };
    if (p < 1) return { x: -1, y: 0 };
    return { x: -root, y: root };
  }
  if (theta >= Math.PI / 2) {
    if (p > 1) return { x: -1, y: 0 };
    if (p < 1) return { x: 0, y: 1 };
    return { x: -root, y: root };
  }

  const { x, y } = quarterPoint(theta, p);
  // 陰関数 x^p + y^p = 1 の接線方向
  const dx = -(y ** (p - 1));
  const dy = x ** (p - 1);
  const length = Math.hypot(dx, dy);
  return { x: dx / length, y: dy / length };
}

/**
 * 端点・単位接線・中点から 3 次ベジェの制御点を解く。
 * B(0.5) が曲線の中点に一致するよう制御点の長さを決める。
 */
function controlPoints(p0: Point, p1: Point, t0: Point, t1: Point, mid: Point): [Point, Point] {
  const rx = 8 * mid.x - 4 * (p0.x + p1.x);
  const ry = 8 * mid.y - 4 * (p0.y + p1.y);
  const ax = 3 * t0.x;
  const ay = 3 * t0.y;
  const bx = -3 * t1.x;
  const by = -3 * t1.y;

  const det = ax * by - ay * bx;
  let a = (rx * by - ry * bx) / det;
  let b = (ax * ry - ay * rx) / det;

  // 接線が平行なときなど解けない場合は、弦長から素直に決める
  if (!Number.isFinite(a) || !Number.isFinite(b) || a <= 0 || b <= 0) {
    a = b = Math.hypot(p1.x - p0.x, p1.y - p0.y) / 3;
  }

  return [
    { x: p0.x + a * t0.x, y: p0.y + a * t0.y },
    { x: p1.x - b * t1.x, y: p1.y - b * t1.y },
  ];
}

/** 直前に求めた四分曲線。全セルで同じ形なので使い回す */
let quarterCache: { p: number; segments: PathSegment[] } | null = null;

/** 四分曲線を正規化座標のパスとして返す。p = 1 は直線 1 本で厳密に表せる */
function quarterSegments(p: number): PathSegment[] {
  if (quarterCache?.p === p) return quarterCache.segments;
  const segments = buildQuarterSegments(p);
  quarterCache = { p, segments };
  return segments;
}

function buildQuarterSegments(p: number): PathSegment[] {
  if (p === 1) return [{ type: 'line', to: { x: 0, y: 1 } }];

  const quarter = Math.PI / 2;
  const segments: PathSegment[] = [];
  for (let i = 0; i < SHAPE_CURVE_SEGMENTS; i++) {
    const a = (quarter * i) / SHAPE_CURVE_SEGMENTS;
    const b = (quarter * (i + 1)) / SHAPE_CURVE_SEGMENTS;
    const start = quarterPoint(a, p);
    const end = quarterPoint(b, p);
    const [c1, c2] = controlPoints(
      start,
      end,
      quarterTangent(a, p),
      quarterTangent(b, p),
      quarterPoint((a + b) / 2, p),
    );
    segments.push({ type: 'cubic', c1, c2, to: end });
  }
  return segments;
}

/** 正規化座標をセル中心を原点とするワールド座標へ移す関数 */
type Placer = (u: number, v: number) => Point;

function place(segments: PathSegment[], to: Placer): PathSegment[] {
  return segments.map((segment) =>
    segment.type === 'line'
      ? { type: 'line', to: to(segment.to.x, segment.to.y) }
      : {
          type: 'cubic',
          c1: to(segment.c1.x, segment.c1.y),
          c2: to(segment.c2.x, segment.c2.y),
          to: to(segment.to.x, segment.to.y),
        },
  );
}

/** セル中心を原点とした輪郭。セルの位置によらないので種別ごとに使い回す */
type LocalPath = { start: Point; segments: PathSegment[] };

let localCache: { p: number; byKind: Partial<Record<RegionKind, LocalPath>> } | null = null;

function localPath(kind: RegionKind, p: number): LocalPath {
  if (localCache?.p !== p) localCache = { p, byKind: {} };
  const cached = localCache.byKind[kind];
  if (cached) return cached;

  const r = CELL_SIZE / 2;
  const quarter = quarterSegments(p);
  let built: LocalPath;

  if (kind === 'C') {
    // 4 象限ぶんを回転して並べ、閉じた輪郭にする
    const segments: PathSegment[] = [];
    for (let turns = 0; turns < 4; turns++) {
      segments.push(...place(quarter, (u, v) => rotate(turns, u * r, v * r)));
    }
    built = { start: { x: r, y: 0 }, segments };
  } else {
    // 隅領域: 頂点 → 辺の中点 → 四分曲線 → 閉じる
    const turns = CORNER_TURNS[kind];
    const put: Placer = (u, v) => rotate(turns, -v * r, -u * r);
    built = {
      start: rotate(turns, -r, -r),
      segments: [{ type: 'line', to: put(1, 0) }, ...place(quarter, put)],
    };
  }

  localCache.byKind[kind] = built;
  return built;
}

/**
 * 領域の形状をワールド座標（px）で返す。
 * 既定の正円では円・円弧として厳密に、それ以外は直線とベジェのパスとして返す。
 *
 * 形は全セルで共通なので、セル中心を原点とした輪郭を種別ごとに使い回し、
 * ここでは平行移動だけを行う。大きなグリッドでは毎フレームの再計算が効く。
 */
export function regionShape(region: RegionId, shape: number): RegionShape {
  const r = CELL_SIZE / 2;
  const cx = region.col * CELL_SIZE + r;
  const cy = region.row * CELL_SIZE + r;
  const p = shapeExponent(shape);

  if (p === 2) {
    if (region.kind === 'C') return { type: 'circle', cx, cy, r };

    const turns = CORNER_TURNS[region.kind];
    const corner = rotate(turns, -r, -r);
    const arcStart = rotate(turns, 0, -r);
    const arcEnd = rotate(turns, -r, 0);
    return {
      type: 'corner',
      cx,
      cy,
      corner: { x: cx + corner.x, y: cy + corner.y },
      arcStart: { x: cx + arcStart.x, y: cy + arcStart.y },
      arcEnd: { x: cx + arcEnd.x, y: cy + arcEnd.y },
      r,
    };
  }

  const local = localPath(region.kind, p);
  const move = (point: Point): Point => ({ x: cx + point.x, y: cy + point.y });

  return {
    type: 'path',
    start: move(local.start),
    segments: local.segments.map((segment) =>
      segment.type === 'line'
        ? { type: 'line', to: move(segment.to) }
        : { type: 'cubic', c1: move(segment.c1), c2: move(segment.c2), to: move(segment.to) },
    ),
  };
}
