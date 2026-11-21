/* Vendored from the reactbits starter registry; `no-useless-assignment` fires on its
 *  loop initialisers, which are intentional. */
/* eslint-disable no-useless-assignment */
import {
	forwardRef,
	useEffect,
	useImperativeHandle,
	useRef,
	useSyncExternalStore,
	type CSSProperties,
	type ReactNode,
} from "react";
import * as THREE from "three";
import { cn } from "@peridotvault/peridotbase-ui/utils";

export type GlassCoinsPattern =
	"stream" | "ring" | "helix" | "wave" | "grid" | "vortex" | "float";

export interface GlassCoinsHandle {
	pulse: (x?: number, y?: number) => void;
}

export interface GlassCoinsProps {
	colors?: [string, string];
	backgroundColor?: string;
	pattern?: GlassCoinsPattern;
	count?: number;
	size?: number;
	thickness?: number;
	bevel?: number;
	spacing?: number;
	speed?: number;
	turn?: number;
	spin?: number;
	twist?: number;
	rock?: number;
	ripple?: number;
	drift?: number;
	sway?: number;
	depth?: number;
	tilt?: number;
	angle?: number;
	pitch?: number;
	yaw?: number;
	centerX?: number;
	centerY?: number;
	ior?: number;
	dispersion?: number;
	density?: number;
	frost?: number;
	glow?: number;
	intensity?: number;
	lightAngle?: number;
	interactive?: boolean;
	flick?: number;
	pulse?: number;
	parallax?: number;
	paused?: boolean;
	quality?: number;
	className?: string;
	style?: CSSProperties;
	children?: ReactNode;
}

interface Settings {
	colors: [string, string];
	backgroundColor: string;
	pattern: GlassCoinsPattern;
	count: number;
	size: number;
	thickness: number;
	bevel: number;
	spacing: number;
	speed: number;
	turn: number;
	spin: number;
	twist: number;
	rock: number;
	ripple: number;
	drift: number;
	sway: number;
	depth: number;
	tilt: number;
	angle: number;
	pitch: number;
	yaw: number;
	centerX: number;
	centerY: number;
	ior: number;
	dispersion: number;
	density: number;
	frost: number;
	glow: number;
	intensity: number;
	lightAngle: number;
	interactive: boolean;
	flick: number;
	pulse: number;
	parallax: number;
	paused: boolean;
	quality: number;
	reduced: boolean;
}

interface Controller {
	sync: () => void;
	pulse: (x?: number, y?: number) => void;
	destroy: () => void;
}

type Rgb = [number, number, number];

const DEFAULT_COLORS: [string, string] = ["#5227FF", "#FF9FFC"];
const MAX_COINS = 40;
const SEGMENTS = 128;
const RINGS = 10;
const ENV_SIZE = 1024;
const SOFT_SIZE = 128;
const FOV = 30;
const LOOP = 5;
const BOUNCES = 6;
const TAU = Math.PI * 2;
const RAD = Math.PI / 180;
const DISTANCE = 1 / Math.tan((FOV * RAD) / 2);

const coinVertex = `
in vec3 aTrue;
in vec3 aSmooth;
in vec3 aOffset;
in vec4 aQuat;
in float aScale;

uniform mat4 uViewProjection;
uniform vec3 uCamera;

out vec3 vLocal;
out vec3 vTrue;
out vec3 vSmooth;
flat out vec3 vEye;
flat out mat3 vToEnv;

vec3 turn(vec4 q, vec3 v) {
  return v + 2.0 * cross(q.xyz, cross(q.xyz, v) + q.w * v);
}

void main() {
  float size = max(aScale, 1e-4);
  vec3 world = aOffset + turn(aQuat, position * size);
  vLocal = position;
  vTrue = aTrue;
  vSmooth = aSmooth;
  vEye = turn(vec4(-aQuat.xyz, aQuat.w), uCamera - aOffset) / size;
  vToEnv = mat3(turn(aQuat, vec3(1.0, 0.0, 0.0)), turn(aQuat, vec3(0.0, 1.0, 0.0)), turn(aQuat, vec3(0.0, 0.0, 1.0)));
  gl_Position = uViewProjection * vec4(world, 1.0);
}
`;

const coinFragment = `
precision highp float;
precision highp int;

uniform sampler2D uEnv;
uniform sampler2D uSoft;
uniform float uEnvSize;
uniform float uSoftSize;
uniform float uFrost;
uniform vec3 uShape;
uniform float uIor;
uniform float uSpread;
uniform vec3 uSigma;
uniform vec3 uBackdrop;
uniform vec3 uAmbient;
uniform float uPeak;
uniform float uDome;

in vec3 vLocal;
in vec3 vTrue;
in vec3 vSmooth;
flat in vec3 vEye;
flat in mat3 vToEnv;

out vec4 fragColor;

const float RADIUS = 0.5;
const float FAR = 1e9;

vec2 spot(vec3 d) {
  vec3 n = vToEnv * d;
  n.z = -n.z;
  n /= abs(n.x) + abs(n.y) + abs(n.z);
  vec2 e = n.z >= 0.0 ? n.xy : (1.0 - abs(n.yx)) * vec2(n.x >= 0.0 ? 1.0 : -1.0, n.y >= 0.0 ? 1.0 : -1.0);
  return e * 0.5 + 0.5;
}

vec3 crisp(vec3 d) {
  return textureLod(uEnv, spot(d) * ((uEnvSize - 1.0) / uEnvSize) + 0.5 / uEnvSize, 0.0).rgb;
}

vec3 hazy(vec3 d) {
  return textureLod(uSoft, spot(d) * ((uSoftSize - 1.0) / uSoftSize) + 0.5 / uSoftSize, 0.0).rgb;
}

float leave(float a, float b, float c) {
  float root = sqrt(max(b * b - a * c, 0.0));
  if (b < 0.0) return a > 1e-7 ? (root - b) / a : FAR;
  float q = -(b + root);
  return q < -1e-9 ? max(c / q, 0.0) : FAR;
}

float fresnelIn(float cosi, float n) {
  float cost = sqrt(1.0 - (1.0 - cosi * cosi) / (n * n));
  float rs = (cosi - n * cost) / (cosi + n * cost);
  float rp = (n * cosi - cost) / (n * cosi + cost);
  return 0.5 * (rs * rs + rp * rp);
}

float fresnelOut(float cosi, float n) {
  float s2 = n * n * (1.0 - cosi * cosi);
  if (s2 >= 1.0) return 1.0;
  float cost = sqrt(1.0 - s2);
  float rs = (n * cosi - cost) / (n * cosi + cost);
  float rp = (cosi - n * cost) / (cosi + n * cost);
  return 0.5 * (rs * rs + rp * rp);
}

void main() {
  float h = uShape.x;
  float slope = uShape.y / uShape.z;
  float K = RADIUS - uShape.y + slope * h;
  vec3 D = normalize(vLocal - vEye);
  vec3 N = normalize(vTrue);
  vec3 S = normalize(vSmooth + vec3(vLocal.x, 0.0, vLocal.z) * (2.0 * uDome * step(0.999, abs(N.y))));
  float haze = abs(N.y) < 0.3 ? uFrost : 0.0;
  float gloss = fresnelIn(clamp(-dot(D, S), 0.0, 1.0), uIor);
  vec3 mirror = reflect(D, S);
  vec3 light = crisp(mirror);
  if (haze > 0.0) light = mix(light, hazy(mirror), haze);
  light *= gloss;
  vec3 weight = vec3(gloss);
  float cosN = clamp(-dot(D, N), 0.001, 1.0);
  vec3 d = refract(D, N, 1.0 / uIor);
  vec3 o = vLocal - N * 2e-4;
  vec3 power = vec3(1.0 - fresnelIn(cosN, uIor));
  vec3 through = vec3(0.0);
  for (int k = 0; k < ${BOUNCES}; k++) {
    float ty = d.y > 1e-6 ? (h - o.y) / d.y : (d.y < -1e-6 ? (-h - o.y) / d.y : FAR);
    float a = dot(d.xz, d.xz);
    float b = dot(o.xz, d.xz);
    float r2 = dot(o.xz, o.xz);
    float tc = leave(a, b, r2 - RADIUS * RADIUS);
    float wt = K - slope * o.y;
    float wb = K + slope * o.y;
    float ac = a - slope * slope * d.y * d.y;
    float tt = leave(ac, b + slope * d.y * wt, r2 - wt * wt);
    float tb = leave(ac, b - slope * d.y * wb, r2 - wb * wb);
    float t = min(min(ty, tc), min(tt, tb));
    vec3 q = o + d * t;
    vec3 n;
    if (t == ty) {
      n = vec3(0.0, d.y > 0.0 ? 1.0 : -1.0, 0.0);
    } else {
      vec2 radial = normalize(q.xz);
      if (t == tc) n = vec3(radial.x, 0.0, radial.y);
      else n = normalize(vec3(radial.x, t == tt ? slope : -slope, radial.y));
    }
    power *= exp(-uSigma * t);
    float F = fresnelOut(clamp(dot(d, n), 0.0, 1.0), uIor);
    if (F < 1.0) {
      vec3 share = power * (1.0 - F);
      vec3 mid = refract(d, -n, uIor);
      vec3 seen;
      if (uSpread > 0.0) {
        float fan = uSpread * smoothstep(0.0, 0.5, dot(mid, n));
        vec3 warm = refract(d, -n, uIor - fan);
        vec3 cold = refract(d, -n, uIor + fan);
        if (dot(cold, cold) < 0.5) cold = mid;
        seen = vec3(crisp(warm).r, crisp(mid).g, crisp(cold).b);
      } else {
        seen = crisp(mid);
      }
      if (haze > 0.0) seen = mix(seen, hazy(mid), haze);
      light += share * seen;
      through += share;
    }
    power *= F;
    if (max(power.r, max(power.g, power.b)) < 0.012) {
      power = vec3(0.0);
      break;
    }
    o = q - n * 2e-4;
    d = reflect(d, n);
  }
  light += power * uAmbient;
  weight += through + power;
  float clear = min(through.r, min(through.g, through.b));
  vec3 color = light + (weight - clear) * uBackdrop;
  float level = max(color.r, max(color.g, color.b));
  if (level > 0.0) color *= uPeak * (1.0 - exp(-level / uPeak)) / level;
  fragColor = vec4(color, 1.0 - clear);
}
`;

const passVertex = `
out vec2 vUv;

void main() {
  vUv = uv;
  gl_Position = vec4(position.xy, 0.0, 1.0);
}
`;

const envFragment = `
precision highp float;

uniform float uSize;
uniform vec3 uLight;
uniform vec3 uGlass;
uniform float uAngle;
uniform float uInk;
uniform vec3 uPage;

out vec4 fragColor;

const float TAU = 6.283185307179586;
const float RAD = 0.017453292519943295;

float hash(float n) {
  return fract(sin(n * 12.9898 + 4.1414) * 43758.5453);
}

vec3 decode(vec2 e) {
  vec3 n = vec3(e, 1.0 - abs(e.x) - abs(e.y));
  float t = max(-n.z, 0.0);
  n.x += n.x >= 0.0 ? -t : t;
  n.y += n.y >= 0.0 ? -t : t;
  n.z = -n.z;
  return normalize(n);
}

float box(vec3 d, float az, float pol, vec2 reach, vec2 soft, out vec2 at) {
  az *= RAD;
  pol *= RAD;
  at = vec2(0.0);
  vec3 c = vec3(sin(pol) * cos(az), sin(pol) * sin(az), cos(pol));
  float k = dot(d, c);
  if (k <= 0.05) return 0.0;
  vec3 u = vec3(-sin(az), cos(az), 0.0);
  vec3 v = cross(c, u);
  vec2 p = vec2(dot(d, u), dot(d, v)) / k;
  at = p / reach;
  vec2 e = 1.0 - smoothstep(reach - soft, reach + soft, abs(p));
  return e.x * e.y;
}

vec2 band(float a, float p, vec2 span, float count, float seed, vec2 fill) {
  float mid = 0.5 * (span.x + span.y) * RAD;
  float tall = 0.5 * (span.y - span.x) * RAD;
  float inside = 1.0 - smoothstep(tall - 0.008, tall + 0.008, abs(p - mid));
  float x = (a / TAU + 0.5 + seed) * count;
  float id = mod(floor(x), count);
  float wide = mix(fill.x, fill.y, hash(id + seed * 17.0));
  float edge = 0.008 * count / (TAU * max(sin(p), 0.3));
  float segment = 1.0 - smoothstep(wide - edge, wide + edge, abs(fract(x) - 0.5));
  return vec2(inside * segment, hash(id * 3.1 + seed * 29.0));
}

float panes(float x, float count, float seed) {
  float t = (clamp(x, -1.0, 1.0) * 0.5 + 0.5) * count;
  float id = min(floor(t), count - 1.0);
  float f = abs(t - id - 0.5);
  return (1.0 - 0.8 * smoothstep(0.46, 0.49, f)) * mix(0.6, 1.0, hash(id + seed));
}

void main() {
  vec2 e = (gl_FragCoord.xy - 0.5) / (uSize - 1.0) * 2.0 - 1.0;
  vec3 d = decode(e);
  float ca = cos(uAngle);
  float sa = sin(uAngle);
  d = vec3(ca * d.x + sa * d.y, ca * d.y - sa * d.x, d.z);
  float p = acos(clamp(d.z, -1.0, 1.0));
  float a = atan(d.y, d.x);
  vec3 hot = mix(uLight, vec3(1.0), 0.25);
  vec3 lilac = mix(uLight, uGlass, 0.25);
  vec3 cool = mix(uGlass, uLight, 0.25);
  float lean = dot(d.xy, vec2(-0.866, 0.5));
  vec2 g = d.xy / (1.0 + max(d.z, -0.6));
  vec2 r = vec2(g.x * 0.8 + g.y * 0.6, g.y * 0.8 - g.x * 0.6);
  float blob = 0.5 + 0.5 * sin(r.x * 11.0 + 0.9) * sin(r.y * 9.0 - 0.4);
  float shift = 0.5 + 0.5 * sin(r.x * 5.0 - r.y * 6.0 + 2.2);
  float w = clamp(0.5 + 1.1 * lean + 0.25 * (shift - 0.5), 0.0, 1.0);
  vec3 ramp = mix(mix(cool, lilac, smoothstep(0.0, 0.35, w)), mix(uLight, hot, smoothstep(0.6, 1.0, w)), smoothstep(0.3, 0.65, w));
  float front = 1.0 - smoothstep(92.0 * RAD, 100.0 * RAD, p);
  float pane = r.x * 2.2 + 0.3;
  float sheet = mix(0.72, 1.0, mix(hash(floor(pane)), hash(floor(pane) + 1.0), smoothstep(0.3, 0.7, fract(pane))));
  vec3 light = ramp * (mix(4.0, 42.0, pow(w, 1.2)) * mix(0.55, 1.0, smoothstep(0.2, 0.8, blob)) * sheet * front);
  vec2 at;
  float k = box(d, -40.0, 98.0, vec2(0.6, 0.3), vec2(0.012), at);
  light += cool * (9.0 * k * mix(0.4, 1.0, smoothstep(-1.0, 0.8, at.x)) * panes(at.x, 2.0, 5.3));
  float warm = 0.5 + 0.5 * cos(a - 155.0 * RAD);
  vec3 tone = mix(lilac, uLight, smoothstep(0.05, 0.6, warm));
  float belt = smoothstep(116.0 * RAD, 119.0 * RAD, p) * (1.0 - smoothstep(158.0 * RAD, 160.5 * RAD, p));
  float rise = smoothstep(116.0 * RAD, 158.0 * RAD, p);
  float level = mix(0.6, 2.0, rise) * mix(0.7, 1.0, warm);
  vec2 b = band(a, p, vec2(124.0, 150.0), 5.0, 0.13, vec2(0.12, 0.3));
  level *= 1.0 + 0.9 * b.x * step(0.35, b.y);
  b = band(a, p, vec2(114.0, 162.0), 4.0, 0.57, vec2(0.455, 0.475));
  level *= mix(0.12, 1.0, b.x);
  level *= mix(0.2, 1.0, smoothstep(0.0, 0.012, abs(p - 138.0 * RAD) - 0.01));
  light += tone * (level * belt);
  k = box(d, 60.0, 140.0, vec2(0.3, 0.16), vec2(0.012), at);
  light += hot * (6.0 * k);
  light += mix(cool, vec3(1.0), 0.3) * 10.0 * box(d, 20.0, 78.0, vec2(0.04, 0.4), vec2(0.008), at);
  light += hot * 14.0 * box(d, 52.0, 74.0, vec2(0.3, 0.035), vec2(0.008), at);
  light += hot * 12.0 * box(d, -120.0, 84.0, vec2(0.035, 0.3), vec2(0.008), at);
  float behind = smoothstep(120.0 * RAD, 175.0 * RAD, p);
  light += mix(uGlass, uLight, 0.35) * (0.015 + 0.06 * behind);
  if (uInk > 0.5) {
    float luma = dot(light, vec3(0.2126, 0.7152, 0.0722));
    float cross = dot(uLight, uGlass);
    float warmth = max(dot(light, uLight) * dot(uGlass, uGlass) - dot(light, uGlass) * cross, 0.0);
    float chill = max(dot(light, uGlass) * dot(uLight, uLight) - dot(light, uLight) * cross, 0.0);
    vec3 ink = mix(uGlass * 0.7, uLight * mix(vec3(1.0), uLight, 0.7) * 0.9, warmth / max(warmth + chill, 1e-6));
    light = -(1.0 - exp(-luma * 0.24)) * max(uPage - ink, 0.0);
  }
  fragColor = vec4(light, 1.0);
}
`;

const blurFragment = `
precision highp float;

uniform sampler2D uSource;
uniform float uSourceSize;
uniform float uSize;
uniform float uSpread;

out vec4 fragColor;

vec3 decode(vec2 e) {
  vec3 n = vec3(e, 1.0 - abs(e.x) - abs(e.y));
  float t = max(-n.z, 0.0);
  n.x += n.x >= 0.0 ? -t : t;
  n.y += n.y >= 0.0 ? -t : t;
  n.z = -n.z;
  return normalize(n);
}

vec2 encode(vec3 d) {
  vec3 n = vec3(d.xy, -d.z);
  n /= abs(n.x) + abs(n.y) + abs(n.z);
  vec2 e = n.z >= 0.0 ? n.xy : (1.0 - abs(n.yx)) * vec2(n.x >= 0.0 ? 1.0 : -1.0, n.y >= 0.0 ? 1.0 : -1.0);
  return (e * 0.5 + 0.5) * ((uSourceSize - 1.0) / uSourceSize) + 0.5 / uSourceSize;
}

void main() {
  vec2 e = (gl_FragCoord.xy - 0.5) / (uSize - 1.0) * 2.0 - 1.0;
  vec3 n = decode(e);
  vec3 u = normalize(cross(n, abs(n.y) < 0.9 ? vec3(0.0, 1.0, 0.0) : vec3(1.0, 0.0, 0.0)));
  vec3 v = cross(n, u);
  vec3 sum = vec3(0.0);
  float total = 0.0;
  for (int i = 0; i < 144; i++) {
    float f = (float(i) + 0.5) / 144.0;
    float turn = float(i) * 2.39996323;
    vec3 d = normalize(n + (u * cos(turn) + v * sin(turn)) * (sqrt(f) * uSpread));
    float weight = 1.0 - 0.75 * f;
    sum += textureLod(uSource, encode(d), 3.0).rgb * weight;
    total += weight;
  }
  fragColor = vec4(sum / total, 1.0);
}
`;

const downFragment = `
precision highp float;

uniform sampler2D uSource;
uniform vec2 uTexel;
uniform float uFirst;
uniform float uInk;
uniform float uThreshold;
uniform float uPeak;
uniform vec3 uBackdrop;

in vec2 vUv;
out vec4 fragColor;

void main() {
  vec4 a = texture(uSource, vUv + uTexel * vec2(-1.0, -1.0));
  vec4 b = texture(uSource, vUv + uTexel * vec2(1.0, -1.0));
  vec4 c = texture(uSource, vUv + uTexel * vec2(-1.0, 1.0));
  vec4 d = texture(uSource, vUv + uTexel * vec2(1.0, 1.0));
  vec4 color = (a + b + c + d) * 0.125 + texture(uSource, vUv) * 0.5;
  if (uFirst > 0.5) {
    vec3 x = color.rgb - color.a * uBackdrop;
    if (uInk > 0.5) {
      color.rgb = min(x, 0.0);
    } else {
      x = max(x, 0.0);
      float level = max(x.r, max(x.g, x.b));
      float peak = -uPeak * log(1.0 - min(level / uPeak, 0.985));
      float knee = uThreshold * 0.6 + 1e-4;
      float soft = clamp(peak - uThreshold + knee, 0.0, 2.0 * knee);
      float keep = max(soft * soft / (4.0 * knee), peak - uThreshold) / max(level, 1e-4);
      color.rgb = x * keep;
    }
  }
  fragColor = color;
}
`;

const upFragment = `
precision highp float;

uniform sampler2D uSource;
uniform sampler2D uBase;
uniform vec2 uTexel;
uniform float uKeep;

in vec2 vUv;
out vec4 fragColor;

void main() {
  vec4 sum = texture(uSource, vUv) * 4.0;
  sum += texture(uSource, vUv + uTexel * vec2(-1.0, 0.0)) * 2.0;
  sum += texture(uSource, vUv + uTexel * vec2(1.0, 0.0)) * 2.0;
  sum += texture(uSource, vUv + uTexel * vec2(0.0, -1.0)) * 2.0;
  sum += texture(uSource, vUv + uTexel * vec2(0.0, 1.0)) * 2.0;
  sum += texture(uSource, vUv + uTexel * vec2(-1.0, -1.0));
  sum += texture(uSource, vUv + uTexel * vec2(1.0, -1.0));
  sum += texture(uSource, vUv + uTexel * vec2(-1.0, 1.0));
  sum += texture(uSource, vUv + uTexel * vec2(1.0, 1.0));
  fragColor = texture(uBase, vUv) + sum * (uKeep / 16.0);
}
`;

const compositeFragment = `
precision highp float;

uniform sampler2D uScene;
uniform sampler2D uBloom;
uniform vec3 uBackdrop;
uniform vec3 uTint;
uniform float uGlow;
uniform float uExposure;
uniform float uInk;
uniform float uSeed;

in vec2 vUv;
out vec4 fragColor;

float hash(vec2 p) {
  vec3 p3 = fract(vec3(p.xyx) * 0.1031);
  p3 += dot(p3, p3.yzx + 33.33);
  return fract((p3.x + p3.y) * p3.z);
}

vec3 encode(vec3 c) {
  c = clamp(c, 0.0, 1.0);
  return mix(c * 12.92, 1.055 * pow(c, vec3(1.0 / 2.4)) - 0.055, step(vec3(0.0031308), c));
}

void main() {
  vec4 scene = texture(uScene, vUv);
  vec3 bloom = texture(uBloom, vUv).rgb;
  float cover = clamp(scene.a, 0.0, 1.0);
  vec3 color;
  if (uInk < 0.5) {
    vec3 base = uBackdrop * (1.0 - cover);
    vec3 lit = max(scene.rgb + bloom * uTint * uGlow, 0.0) * uExposure;
    vec3 seen = 1.0 - exp(-lit);
    float peak = max(seen.r, max(seen.g, seen.b));
    seen = mix(seen, vec3(peak), smoothstep(0.8, 1.0, peak) * 0.6);
    color = base + (1.0 - base) * seen;
  } else {
    color = uBackdrop * (1.0 - cover) + scene.rgb + bloom * uGlow * 0.5;
  }
  float grain = hash(gl_FragCoord.xy + uSeed * 311.0) - 0.5;
  fragColor = vec4(encode(color) + grain / 255.0, 1.0);
}
`;

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

const finite = (value: number, fallback: number) =>
	Number.isFinite(value) ? value : fallback;

const mod = (value: number, size: number) => ((value % size) + size) % size;

const fract = (value: number) => value - Math.floor(value);

const ease = (value: number) => {
	const t = clamp(value, 0, 1);
	return t * t * (3 - 2 * t);
};

const noise = (seed: number) => fract(Math.sin(seed * 127.1 + 311.7) * 43758.5453);

const climb = (along: number) => {
	const sine = clamp(0.676 + 0.146 * along, 0.259, 0.866);
	return sine / Math.sqrt(1 - sine * sine);
};

const toLinear = (value: number) =>
	value <= 0.04045 ? value / 12.92 : Math.pow((value + 0.055) / 1.055, 2.4);

const blend = (a: Rgb, b: Rgb, t: number): Rgb => [
	a[0] + (b[0] - a[0]) * t,
	a[1] + (b[1] - a[1]) * t,
	a[2] + (b[2] - a[2]) * t,
];

const springTo = (
	value: number,
	velocity: number,
	target: number,
	dt: number,
	response: number,
	ratio: number,
) => {
	const omega = TAU / Math.max(response, 0.02);
	const substeps = Math.max(1, Math.ceil(dt / (1 / 240)));
	const h = dt / substeps;
	let v = velocity;
	let x = value;
	for (let i = 0; i < substeps; i++) {
		v += (omega * omega * (target - x) - 2 * ratio * omega * v) * h;
		x += v * h;
	}
	return [x, v] as const;
};

const isControl = (target: EventTarget | null) => {
	const element = target as Element | null;
	return (
		!!element &&
		typeof element.closest === "function" &&
		!!element.closest(
			"a,button,input,textarea,select,label,summary,[role=button],[contenteditable=true]",
		)
	);
};

const subscribeToMotion = (notify: () => void) => {
	const media = window.matchMedia("(prefers-reduced-motion: reduce)");
	media.addEventListener("change", notify);
	return () => media.removeEventListener("change", notify);
};

const readMotion = () =>
	typeof window !== "undefined" &&
	window.matchMedia("(prefers-reduced-motion: reduce)").matches;

const createCoins = (
	root: HTMLDivElement,
	settingsRef: { current: Settings },
): Controller | null => {
	const doc = root.ownerDocument;
	const view = doc.defaultView ?? window;
	const canvas = doc.createElement("canvas");
	canvas.setAttribute("aria-hidden", "true");
	canvas.style.cssText =
		"position:absolute;inset:0;width:100%;height:100%;display:block;pointer-events:none";
	root.prepend(canvas);

	let renderer: THREE.WebGLRenderer;
	try {
		renderer = new THREE.WebGLRenderer({
			canvas,
			alpha: false,
			antialias: false,
			powerPreference: "high-performance",
		});
	} catch {
		canvas.remove();
		return null;
	}
	if (!renderer.capabilities.isWebGL2) {
		renderer.dispose();
		canvas.remove();
		return null;
	}
	renderer.autoClear = false;
	const gl = renderer.getContext() as WebGL2RenderingContext;
	const floats =
		renderer.extensions.has("EXT_color_buffer_float") ||
		renderer.extensions.has("EXT_color_buffer_half_float");
	const texelType = floats ? THREE.HalfFloatType : THREE.UnsignedByteType;
	let samples = 0;
	try {
		const counts = gl.getInternalformatParameter(
			gl.RENDERBUFFER,
			floats ? gl.RGBA16F : gl.RGBA8,
			gl.SAMPLES,
		) as Int32Array | null;
		samples = counts && counts.length ? Math.min(4, counts[0]) : 0;
	} catch {
		samples = 0;
	}

	const probe = doc.createElement("canvas").getContext("2d", { willReadFrequently: true });
	const colorCache = new Map<string, [number, number, number, number]>();

	const readColor = (value: string): [number, number, number, number] | null => {
		const cached = colorCache.get(value);
		if (cached) return cached;
		if (!probe || !value) return null;
		probe.fillStyle = "#010203";
		probe.fillStyle = value;
		if (String(probe.fillStyle) === "#010203" && value.trim().toLowerCase() !== "#010203")
			return null;
		probe.clearRect(0, 0, 1, 1);
		probe.fillRect(0, 0, 1, 1);
		const pixel = probe.getImageData(0, 0, 1, 1).data;
		const parsed: [number, number, number, number] = [
			pixel[0] / 255,
			pixel[1] / 255,
			pixel[2] / 255,
			pixel[3] / 255,
		];
		if (colorCache.size > 32) colorCache.clear();
		colorCache.set(value, parsed);
		return parsed;
	};

	const readBackdrop = (): Rgb => {
		const own = readColor(settingsRef.current.backgroundColor);
		if (own && own[3] > 0.5) return [own[0], own[1], own[2]];
		let node: HTMLElement | null = root.parentElement;
		while (node) {
			const found = readColor(view.getComputedStyle(node).backgroundColor);
			if (found && found[3] > 0.5) return [found[0], found[1], found[2]];
			node = node.parentElement;
		}
		return [0.039, 0.039, 0.039];
	};

	const ring = SEGMENTS + 1;
	const vertexCount = RINGS * ring;
	const positions = new Float32Array(vertexCount * 3);
	const trues = new Float32Array(vertexCount * 3);
	const smooths = new Float32Array(vertexCount * 3);
	const positionAttribute = new THREE.BufferAttribute(positions, 3);
	const trueAttribute = new THREE.BufferAttribute(trues, 3);
	const smoothAttribute = new THREE.BufferAttribute(smooths, 3);
	const indices: number[] = [];
	for (let j = 0; j < RINGS; j += 2) {
		for (let k = 0; k < SEGMENTS; k++) {
			const a0 = j * ring + k;
			const b0 = (j + 1) * ring + k;
			if (j > 0) indices.push(a0, a0 + 1, b0);
			if (j < RINGS - 2) indices.push(a0 + 1, b0 + 1, b0);
		}
	}
	const offsetAttribute = new THREE.InstancedBufferAttribute(
		new Float32Array(MAX_COINS * 3),
		3,
	);
	const quatAttribute = new THREE.InstancedBufferAttribute(new Float32Array(MAX_COINS * 4), 4);
	const scaleAttribute = new THREE.InstancedBufferAttribute(new Float32Array(MAX_COINS), 1);
	offsetAttribute.setUsage(THREE.DynamicDrawUsage);
	quatAttribute.setUsage(THREE.DynamicDrawUsage);
	scaleAttribute.setUsage(THREE.DynamicDrawUsage);
	const geometry = new THREE.InstancedBufferGeometry();
	geometry.setAttribute("position", positionAttribute);
	geometry.setAttribute("aTrue", trueAttribute);
	geometry.setAttribute("aSmooth", smoothAttribute);
	geometry.setAttribute("aOffset", offsetAttribute);
	geometry.setAttribute("aQuat", quatAttribute);
	geometry.setAttribute("aScale", scaleAttribute);
	geometry.setIndex(indices);
	geometry.instanceCount = 0;
	geometry.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 1e9);

	let shapeKey = "";

	const shape = (half: number, cut: number) => {
		const key = `${half.toFixed(5)}|${cut.toFixed(5)}`;
		if (key === shapeKey) return;
		shapeKey = key;
		const s = Math.SQRT1_2;
		const rows = [
			[0, half, 0, 1, 0, 1],
			[0.5 - cut, half, 0, 1, 0, 1],
			[0.5 - cut, half, s, s, 0, 1],
			[0.5, half - cut, s, s, 1, 0],
			[0.5, half - cut, 1, 0, 1, 0],
			[0.5, cut - half, 1, 0, 1, 0],
			[0.5, cut - half, s, -s, 1, 0],
			[0.5 - cut, -half, s, -s, 0, -1],
			[0.5 - cut, -half, 0, -1, 0, -1],
			[0, -half, 0, -1, 0, -1],
		];
		rows.forEach(([r, y, tr, ty, sr, sy], j) => {
			for (let k = 0; k <= SEGMENTS; k++) {
				const angle = (k / SEGMENTS) * TAU;
				const c = Math.cos(angle);
				const n = Math.sin(angle);
				const at = (j * ring + k) * 3;
				positions[at] = r * c;
				positions[at + 1] = y;
				positions[at + 2] = r * n;
				trues[at] = tr * c;
				trues[at + 1] = ty;
				trues[at + 2] = tr * n;
				smooths[at] = sr * c;
				smooths[at + 1] = sy;
				smooths[at + 2] = sr * n;
			}
		});
		positionAttribute.needsUpdate = true;
		trueAttribute.needsUpdate = true;
		smoothAttribute.needsUpdate = true;
	};

	const blank = new THREE.DataTexture(new Uint8Array([0, 0, 0, 255]), 1, 1);
	blank.needsUpdate = true;
	const coinUniforms = {
		uViewProjection: { value: new THREE.Matrix4() },
		uCamera: { value: new THREE.Vector3(0, 0, DISTANCE) },
		uEnv: { value: blank as THREE.Texture },
		uSoft: { value: blank as THREE.Texture },
		uEnvSize: { value: ENV_SIZE },
		uSoftSize: { value: SOFT_SIZE },
		uFrost: { value: 0.2 },
		uShape: { value: new THREE.Vector3(0.09, 0.02, 0.02) },
		uIor: { value: 1.45 },
		uSpread: { value: 0.01 },
		uSigma: { value: new THREE.Vector3() },
		uBackdrop: { value: new THREE.Vector3() },
		uAmbient: { value: new THREE.Vector3() },
		uPeak: { value: 3.5 },
		uDome: { value: 0.12 },
	};
	const coinMaterial = new THREE.ShaderMaterial({
		glslVersion: THREE.GLSL3,
		uniforms: coinUniforms,
		vertexShader: coinVertex,
		fragmentShader: coinFragment,
		depthTest: false,
		depthWrite: false,
		transparent: true,
		side: THREE.FrontSide,
		blending: THREE.CustomBlending,
		blendEquation: THREE.AddEquation,
		blendSrc: THREE.OneFactor,
		blendDst: THREE.OneMinusSrcAlphaFactor,
		blendSrcAlpha: THREE.OneFactor,
		blendDstAlpha: THREE.OneMinusSrcAlphaFactor,
	});
	const coins = new THREE.Mesh(geometry, coinMaterial);
	coins.frustumCulled = false;
	const coinScene = new THREE.Scene();
	coinScene.add(coins);

	const pass = (fragmentShader: string, uniforms: Record<string, THREE.IUniform>) =>
		new THREE.ShaderMaterial({
			glslVersion: THREE.GLSL3,
			uniforms,
			vertexShader: passVertex,
			fragmentShader,
			depthTest: false,
			depthWrite: false,
			blending: THREE.NoBlending,
		});

	const envUniforms = {
		uSize: { value: ENV_SIZE },
		uLight: { value: new THREE.Vector3() },
		uGlass: { value: new THREE.Vector3() },
		uAngle: { value: 0 },
		uInk: { value: 0 },
		uPage: { value: new THREE.Vector3() },
	};
	const envMaterial = pass(envFragment, envUniforms);
	const blurUniforms = {
		uSource: { value: null as THREE.Texture | null },
		uSourceSize: { value: ENV_SIZE },
		uSize: { value: SOFT_SIZE },
		uSpread: { value: 0.5 },
	};
	const blurMaterial = pass(blurFragment, blurUniforms);
	const downUniforms = {
		uSource: { value: null as THREE.Texture | null },
		uTexel: { value: new THREE.Vector2() },
		uFirst: { value: 0 },
		uInk: { value: 0 },
		uThreshold: { value: 2.4 },
		uPeak: { value: 3.5 },
		uBackdrop: { value: new THREE.Vector3() },
	};
	const downMaterial = pass(downFragment, downUniforms);
	const upUniforms = {
		uSource: { value: null as THREE.Texture | null },
		uBase: { value: null as THREE.Texture | null },
		uTexel: { value: new THREE.Vector2() },
		uKeep: { value: 0.42 },
	};
	const upMaterial = pass(upFragment, upUniforms);
	const compositeUniforms = {
		uScene: { value: null as THREE.Texture | null },
		uBloom: { value: null as THREE.Texture | null },
		uBackdrop: { value: new THREE.Vector3() },
		uTint: { value: new THREE.Vector3(1, 1, 1) },
		uGlow: { value: 0.6 },
		uExposure: { value: 1 },
		uInk: { value: 0 },
		uSeed: { value: 0 },
	};
	const compositeMaterial = pass(compositeFragment, compositeUniforms);
	const plane = new THREE.PlaneGeometry(2, 2);
	const quad = new THREE.Mesh(plane, compositeMaterial);
	quad.frustumCulled = false;
	const quadScene = new THREE.Scene();
	quadScene.add(quad);
	const flat = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
	const camera = new THREE.PerspectiveCamera(FOV, 1, 0.1, 60);
	camera.position.set(0, 0, DISTANCE);

	const target = (w: number, h: number, multisample: number) =>
		new THREE.WebGLRenderTarget(Math.max(1, w), Math.max(1, h), {
			type: texelType,
			format: THREE.RGBAFormat,
			minFilter: THREE.LinearFilter,
			magFilter: THREE.LinearFilter,
			depthBuffer: false,
			stencilBuffer: false,
			generateMipmaps: false,
			samples: multisample,
		});

	let envTarget: THREE.WebGLRenderTarget | null = null;
	let softTarget: THREE.WebGLRenderTarget | null = null;
	let sceneTarget: THREE.WebGLRenderTarget | null = null;
	let downTargets: THREE.WebGLRenderTarget[] = [];
	let upTargets: THREE.WebGLRenderTarget[] = [];

	let destroyed = false;
	let lost = false;
	let visible = true;
	let raf = 0;
	let last = 0;
	let width = 1;
	let height = 1;
	let pixelRatio = 1;
	let governor = 1;
	let warmup = 40;
	let counted = 0;
	let slow = 0;
	let spent = 0;
	let before = 0;
	let adaptive = true;
	let clock = 0;
	let phase = 0.37;
	let seed = 0;
	let live = 0;
	let ink = false;
	let envKey = "";
	let backdrop: Rgb = [0.039, 0.039, 0.039];
	let aimX = 0;
	let aimY = 0;
	let leanX = 0;
	let leanY = 0;
	let leanVX = 0;
	let leanVY = 0;
	let trail: { x: number; y: number; t: number } | null = null;
	let press: { id: number; x: number; y: number; t: number } | null = null;

	const worldPosition = new Float32Array(MAX_COINS * 3);
	const worldQuat = new Float32Array(MAX_COINS * 4);
	const worldScale = new Float32Array(MAX_COINS);
	const screenX = new Float32Array(MAX_COINS);
	const screenY = new Float32Array(MAX_COINS);
	const screenR = new Float32Array(MAX_COINS);
	const extra = new Float32Array(MAX_COINS);
	const rate = new Float32Array(MAX_COINS);
	const rest = new Float32Array(MAX_COINS).fill(NaN);
	const axisX = new Float32Array(MAX_COINS).fill(1);
	const axisY = new Float32Array(MAX_COINS);
	const kickAt = new Float32Array(MAX_COINS).fill(Infinity);
	const kickRate = new Float32Array(MAX_COINS);
	const kickX = new Float32Array(MAX_COINS);
	const kickY = new Float32Array(MAX_COINS);
	const order: number[] = [];

	const basis = new THREE.Matrix4();
	const vx = new THREE.Vector3();
	const vy = new THREE.Vector3();
	const vz = new THREE.Vector3();
	const vt = new THREE.Vector3();
	const vb = new THREE.Vector3();
	const vp = new THREE.Vector3();
	const qCoin = new THREE.Quaternion();
	const qGroup = new THREE.Quaternion();
	const qLean = new THREE.Quaternion();
	const qExtra = new THREE.Quaternion();
	const euler = new THREE.Euler();
	const axis = new THREE.Vector3();

	const now = () => view.performance.now() / 1000;

	const running = () => {
		const settings = settingsRef.current;
		return visible && !doc.hidden && !settings.paused && !settings.reduced;
	};

	const interactive = () => {
		const settings = settingsRef.current;
		return (
			settings.interactive && !settings.reduced && !settings.paused && !destroyed && !lost
		);
	};

	const ratioFor = () =>
		Math.min(
			2 * clamp(finite(settingsRef.current.quality, 1), 0.25, 1) * governor,
			Math.sqrt(5e6 / Math.max(1, width * height)),
		);

	const release = () => {
		sceneTarget?.dispose();
		downTargets.forEach((item) => item.dispose());
		upTargets.forEach((item) => item.dispose());
		sceneTarget = null;
		downTargets = [];
		upTargets = [];
	};

	const draw = (material: THREE.ShaderMaterial, output: THREE.WebGLRenderTarget | null) => {
		quad.material = material;
		renderer.setRenderTarget(output);
		renderer.render(quadScene, flat);
	};

	const light = () => {
		const settings = settingsRef.current;
		backdrop = readBackdrop();
		const luminance = 0.2126 * backdrop[0] + 0.7152 * backdrop[1] + 0.0722 * backdrop[2];
		ink = luminance > 0.5;
		const glassColor = readColor(settings.colors?.[0] ?? DEFAULT_COLORS[0]) ?? [
			0.32, 0.15, 1, 1,
		];
		const lightColor = readColor(settings.colors?.[1] ?? DEFAULT_COLORS[1]) ?? [
			1, 0.62, 0.99, 1,
		];
		const glass: Rgb = [
			toLinear(glassColor[0]),
			toLinear(glassColor[1]),
			toLinear(glassColor[2]),
		];
		const glint: Rgb = [
			toLinear(lightColor[0]),
			toLinear(lightColor[1]),
			toLinear(lightColor[2]),
		];
		const page: Rgb = [toLinear(backdrop[0]), toLinear(backdrop[1]), toLinear(backdrop[2])];
		const white: Rgb = [1, 1, 1];
		const soft = blend(glint, glass, 0.5);
		const angle = finite(settings.lightAngle, 0) * RAD;
		const key = [
			glass.join(","),
			glint.join(","),
			page.join(","),
			angle.toFixed(4),
			ink ? 1 : 0,
		].join("|");
		const density = clamp(finite(settings.density, 0.4), 0, 4) * (ink ? 1.7 : 1);
		const tint = blend(glass, white, 0.3);
		coinUniforms.uSigma.value.set(
			-Math.log(clamp(tint[0], 0.03, 1)) * density,
			-Math.log(clamp(tint[1], 0.03, 1)) * density,
			-Math.log(clamp(tint[2], 0.03, 1)) * density,
		);
		coinUniforms.uBackdrop.value.set(page[0], page[1], page[2]);
		coinUniforms.uPeak.value = ink ? 1e4 : 3.5;
		const shade: Rgb = [
			page[0] - glass[0] * 0.7,
			page[1] - glass[1] * 0.7,
			page[2] - glass[2] * 0.7,
		];
		if (ink)
			coinUniforms.uAmbient.value.set(-0.25 * shade[0], -0.25 * shade[1], -0.25 * shade[2]);
		else {
			coinUniforms.uAmbient.value.set(soft[0] * 0.9, soft[1] * 0.9, soft[2] * 0.9);
		}
		downUniforms.uBackdrop.value.set(page[0], page[1], page[2]);
		downUniforms.uInk.value = ink ? 1 : 0;
		compositeUniforms.uBackdrop.value.set(page[0], page[1], page[2]);
		compositeUniforms.uInk.value = ink ? 1 : 0;
		const halo = blend(glass, glint, 0.6);
		const top = Math.max(halo[0], halo[1], halo[2], 1e-3);
		compositeUniforms.uTint.value.set(
			0.1 + (0.9 * halo[0]) / top,
			0.1 + (0.9 * halo[1]) / top,
			0.1 + (0.9 * halo[2]) / top,
		);
		if (key === envKey && envTarget) return;
		envKey = key;
		if (!envTarget) {
			envTarget = target(ENV_SIZE, ENV_SIZE, 0);
			envTarget.texture.generateMipmaps = true;
			envTarget.texture.minFilter = THREE.LinearMipmapLinearFilter;
		}
		if (!softTarget) softTarget = target(SOFT_SIZE, SOFT_SIZE, 0);
		envUniforms.uLight.value.set(glint[0], glint[1], glint[2]);
		envUniforms.uGlass.value.set(glass[0], glass[1], glass[2]);
		envUniforms.uAngle.value = angle;
		envUniforms.uInk.value = ink ? 1 : 0;
		envUniforms.uPage.value.set(page[0], page[1], page[2]);
		draw(envMaterial, envTarget);
		blurUniforms.uSource.value = envTarget.texture;
		draw(blurMaterial, softTarget);
		coinUniforms.uEnv.value = envTarget.texture;
		coinUniforms.uSoft.value = softTarget.texture;
	};

	const arrange = () => {
		const settings = settingsRef.current;
		const pattern = settings.pattern;
		const n = Math.round(clamp(finite(settings.count, 10), 1, MAX_COINS));
		const aspect = width / height;
		const reach = Math.min(1, aspect);
		const diameter = clamp(finite(settings.size, 0.36), 0.04, 1.2) * 2 * reach;
		const gap = clamp(finite(settings.spacing, 1), 0.2, 6);
		const step = gap * diameter;
		const closed = pattern === "ring";
		const twist = closed
			? Math.round(finite(settings.twist, 0) * n) / n
			: finite(settings.twist, 0);
		const ripple = closed
			? Math.round(finite(settings.ripple, 0.22) * n) / n
			: finite(settings.ripple, 0.22);
		const spin = finite(settings.spin, 0);
		const rock = clamp(finite(settings.rock, 42), -360, 360) * RAD;
		const rest = finite(settings.turn, 90) * RAD;
		const drift = finite(settings.drift, 1);
		const sway = clamp(finite(settings.sway, 1), 0, 3);
		const deep = clamp(finite(settings.depth, 1), 0, 3);
		const lean = clamp(finite(settings.tilt, 12), -90, 90) * RAD;
		const p = phase;
		const unit = Math.hypot(1, aspect) / 1.2713;
		const upright = aspect < 0.9;
		let slant = 0;
		let fit = 1;
		let columns = 1;
		let lines = 1;
		if (pattern === "stream") {
			slant = -Math.atan2(1, aspect * 0.82);
		} else if (pattern === "helix") {
			slant = upright ? -Math.PI / 2 : 0;
			fit = Math.min(1, ((upright ? aspect : 1) - 0.06) / (diameter * (1.2 + 1.2 * sway)));
		} else if (pattern === "wave") {
			slant = upright ? -Math.PI / 2 : 0;
			fit = Math.min(1, (2 * (upright ? 1 : aspect) - 0.36) / ((n - 1) * step + diameter));
		} else if (pattern === "ring") {
			fit = Math.min(1, (reach - 0.05) / ((n * step) / TAU + diameter * 0.55));
		} else if (pattern === "grid") {
			columns = Math.round(clamp(Math.sqrt(n * aspect), 1, n));
			lines = Math.ceil(n / columns);
			fit = Math.min(
				1,
				(2 * aspect - 0.12) / ((columns - 1) * step + diameter),
				1.88 / ((lines - 1) * step + diameter),
			);
		}
		euler.set(
			finite(settings.pitch, 0) * RAD,
			finite(settings.yaw, 0) * RAD,
			finite(settings.angle, 0) * RAD + slant,
			"YXZ",
		);
		qGroup.setFromEuler(euler);
		euler.set(leanY, leanX, 0, "YXZ");
		qLean.setFromEuler(euler);
		qGroup.premultiply(qLean);
		const cx = clamp(finite(settings.centerX, 0), -2, 2) * aspect;
		const cy = -clamp(finite(settings.centerY, 0), -2, 2);
		const tanHalf = Math.tan((FOV * RAD) / 2);
		for (let i = 0; i < n; i++) {
			let x = 0;
			let y = 0;
			let z = 0;
			let m = i;
			let grow = 1;
			vt.set(1, 0, 0);
			vb.set(0, 0, 1);
			if (pattern === "ring") {
				m = i + drift * p;
				const around = (TAU * m) / n + Math.PI / 2;
				const radius = (n * step) / TAU;
				x = radius * Math.cos(around);
				y = radius * Math.sin(around);
				z = deep * 0.5 * diameter * Math.sin(TAU * (ripple * m - p));
				vt.set(-Math.sin(around), Math.cos(around), 0);
			} else if (pattern === "helix") {
				m = mod(i + drift * p, n);
				const radius = diameter * (0.6 + 1.2 * sway);
				const around = (TAU * m) / 8;
				const rise = step * 0.6;
				const pace = (radius * TAU) / 8;
				x = (m - n / 2) * rise;
				y = radius * Math.cos(around);
				z = radius * deep * Math.sin(around);
				vt.set(rise, -pace * Math.sin(around), pace * deep * Math.cos(around)).normalize();
				vb.set(0, Math.cos(around), Math.max(deep, 0.05) * Math.sin(around));
				grow = ease(Math.min(m, n - m) / 0.85);
			} else if (pattern === "wave") {
				const cycle = TAU * (ripple * i - drift * p);
				x = (i - (n - 1) / 2) * step;
				y = sway * 0.8 * diameter * Math.sin(cycle);
				z = deep * 0.8 * diameter * Math.cos(cycle);
			} else if (pattern === "grid") {
				const line = Math.floor(i / columns);
				const column = i - line * columns;
				const across = Math.min(columns, n - line * columns);
				m = column + line;
				x = (column - (across - 1) / 2) * step;
				y = ((lines - 1) / 2 - line) * step;
				z = deep * 0.35 * diameter * Math.sin(TAU * (ripple * m - drift * p));
				vt.set(Math.SQRT1_2, Math.SQRT1_2, 0);
			} else if (pattern === "vortex") {
				m = mod(i + drift * p, n);
				const scale = diameter / (0.6 * reach);
				const sweep = gap * scale;
				const wind = Math.log(1 + 1.15 * scale) / TAU;
				const outer = 0.72 * Math.hypot(1, aspect);
				const around = sweep * m;
				const radius = outer * Math.exp(wind * sweep * (m - n));
				x = radius * Math.cos(around);
				y = radius * Math.sin(around);
				z = deep * 0.6 * (radius / outer - 0.5);
				vt.set(
					wind * Math.cos(around) - Math.sin(around),
					wind * Math.sin(around) + Math.cos(around),
					0,
				).normalize();
				grow = ((scale * radius) / diameter) * ease(Math.min(m, n - m) / 0.9);
			} else if (pattern === "float") {
				const a = noise(i * 3.1 + 1);
				const b = noise(i * 5.7 + 2);
				const c = noise(i * 7.3 + 3);
				const bob = TAU * drift * p;
				x = ((i + 0.5 + 0.6 * (noise(i * 1.7 + 5) - 0.5)) / n - 0.5) * 1.8 * aspect * gap;
				y = (fract(0.5 + i * 0.618034) - 0.5) * 1.6 * gap;
				z = (a - 0.5) * 1.3 * deep;
				x += sway * 0.07 * Math.sin(bob + TAU * b);
				y += sway * 0.1 * Math.cos(bob * (c > 0.5 ? 2 : 1) + TAU * c);
				z += sway * 0.12 * deep * Math.sin(bob + TAU * a);
				vt.set(Math.cos(TAU * c), Math.sin(TAU * c), 0);
				grow = 0.75 + 0.5 * noise(i * 9.1 + 4);
			} else {
				m = mod(i + drift * p, n);
				const pace = ((m - n * 0.57) * step) / 24;
				for (let k = 0; k < 24; k++) {
					const first = (deep * climb(x / unit)) / unit;
					const second =
						(deep * climb((x + (0.5 * pace) / Math.sqrt(1 + first * first)) / unit)) / unit;
					x += pace / Math.sqrt(1 + second * second);
				}
				const held = clamp(x / unit, -2.86, 1.3);
				const sine = 0.676 + 0.146 * held;
				z =
					deep *
					((0.7369 - Math.sqrt(1 - sine * sine)) / 0.146 + (x / unit - held) * climb(held));
				const swing = (TAU * x) / (3.05 * unit);
				const bank = sway * 0.19 * unit;
				y = bank * Math.sin(swing);
				vt.set(1, ((bank * TAU) / (3.05 * unit)) * Math.cos(swing), 0).normalize();
				grow = ease(Math.min(m, n - m) / 0.85);
			}
			const wobble =
				0.72 * Math.sin(TAU * (p - ripple * m)) +
				0.28 * Math.sin(TAU * (2 * p + 2 * ripple * m) + 1.3);
			const turn = rest + Math.PI * (twist * m + spin * p) + rock * wobble;
			vx.crossVectors(vb, vt);
			if (vx.lengthSq() < 1e-8) vx.set(0, 1, 0);
			vx.normalize();
			vb.crossVectors(vt, vx).normalize();
			vb.multiplyScalar(Math.cos(lean)).addScaledVector(vx, Math.sin(lean));
			vx.crossVectors(vb, vt).normalize();
			vy.copy(vb).multiplyScalar(Math.cos(turn)).addScaledVector(vt, Math.sin(turn));
			vz.crossVectors(vx, vy);
			basis.makeBasis(vx, vy, vz);
			qCoin.setFromRotationMatrix(basis).premultiply(qGroup);
			if (extra[i] !== 0) {
				axis.set(axisX[i], axisY[i], 0);
				qCoin.premultiply(qExtra.setFromAxisAngle(axis, extra[i]));
			}
			vp.set(x * fit, y * fit, z * fit).applyQuaternion(qGroup);
			const wx = vp.x + cx;
			const wy = vp.y + cy;
			const wz = Math.min(vp.z, DISTANCE - 0.6);
			const scale = diameter * fit * grow;
			worldPosition[i * 3] = wx;
			worldPosition[i * 3 + 1] = wy;
			worldPosition[i * 3 + 2] = wz;
			worldQuat[i * 4] = qCoin.x;
			worldQuat[i * 4 + 1] = qCoin.y;
			worldQuat[i * 4 + 2] = qCoin.z;
			worldQuat[i * 4 + 3] = qCoin.w;
			worldScale[i] = scale;
			const range = (DISTANCE - wz) * tanHalf;
			screenX[i] = width / 2 + (wx / range) * (height / 2);
			screenY[i] = height / 2 - (wy / range) * (height / 2);
			screenR[i] = ((scale * 0.5) / range) * (height / 2);
		}
		live = n;
		order.length = 0;
		for (let i = 0; i < n; i++) if (worldScale[i] > 0.004) order.push(i);
		order.sort((a, b) => worldPosition[a * 3 + 2] - worldPosition[b * 3 + 2]);
		const offsets = offsetAttribute.array as Float32Array;
		const quats = quatAttribute.array as Float32Array;
		const scales = scaleAttribute.array as Float32Array;
		order.forEach((index, slot) => {
			offsets[slot * 3] = worldPosition[index * 3];
			offsets[slot * 3 + 1] = worldPosition[index * 3 + 1];
			offsets[slot * 3 + 2] = worldPosition[index * 3 + 2];
			quats[slot * 4] = worldQuat[index * 4];
			quats[slot * 4 + 1] = worldQuat[index * 4 + 1];
			quats[slot * 4 + 2] = worldQuat[index * 4 + 2];
			quats[slot * 4 + 3] = worldQuat[index * 4 + 3];
			scales[slot] = worldScale[index];
		});
		offsetAttribute.needsUpdate = true;
		quatAttribute.needsUpdate = true;
		scaleAttribute.needsUpdate = true;
		geometry.instanceCount = order.length;
	};

	const render = () => {
		if (destroyed || lost || !sceneTarget || !downTargets.length) return;
		const settings = settingsRef.current;
		const half = clamp(finite(settings.thickness, 0.22), 0.04, 0.7) / 2;
		const cut = clamp(finite(settings.bevel, 0.16), 0.02, 0.95) * half;
		shape(half, cut);
		light();
		arrange();
		camera.aspect = width / height;
		camera.updateProjectionMatrix();
		camera.updateMatrixWorld();
		coinUniforms.uViewProjection.value.multiplyMatrices(
			camera.projectionMatrix,
			camera.matrixWorldInverse,
		);
		coinUniforms.uShape.value.set(half, cut, cut);
		const ior = clamp(finite(settings.ior, 1.45), 1.05, 2.4);
		coinUniforms.uIor.value = ior;
		coinUniforms.uFrost.value = clamp(finite(settings.frost, 0.2), 0, 1);
		coinUniforms.uSpread.value = Math.min(
			clamp(finite(settings.dispersion, 0.5), 0, 4) * 0.008,
			ior - 1.02,
		);
		renderer.setRenderTarget(sceneTarget);
		renderer.setClearColor(0x000000, 0);
		renderer.clear();
		renderer.render(coinScene, camera);
		let source = sceneTarget;
		downTargets.forEach((item, index) => {
			downUniforms.uSource.value = source.texture;
			downUniforms.uTexel.value.set(1 / source.width, 1 / source.height);
			downUniforms.uFirst.value = index === 0 ? 1 : 0;
			draw(downMaterial, item);
			source = item;
		});
		let accumulated = downTargets[downTargets.length - 1];
		for (let k = downTargets.length - 2; k >= 0; k--) {
			upUniforms.uSource.value = accumulated.texture;
			upUniforms.uBase.value = downTargets[k].texture;
			upUniforms.uTexel.value.set(1 / accumulated.width, 1 / accumulated.height);
			draw(upMaterial, upTargets[k]);
			accumulated = upTargets[k];
		}
		compositeUniforms.uScene.value = sceneTarget.texture;
		compositeUniforms.uBloom.value = accumulated.texture;
		compositeUniforms.uGlow.value = clamp(finite(settings.glow, 1), 0, 3) * 0.55;
		compositeUniforms.uExposure.value = clamp(finite(settings.intensity, 1), 0, 4);
		compositeUniforms.uSeed.value = seed;
		draw(compositeMaterial, null);
	};

	const kick = (index: number, ax: number, ay: number, amount: number) => {
		if (extra[index] === 0 && rate[index] === 0) {
			axisX[index] = ax;
			axisY[index] = ay;
			rate[index] = amount;
		} else {
			const along = ax * axisX[index] + ay * axisY[index];
			rate[index] += amount * (along >= 0 ? 1 : -1) * Math.max(Math.abs(along), 0.4);
		}
		rate[index] = clamp(rate[index], -30, 30);
		rest[index] = NaN;
	};

	const advance = (dt: number) => {
		const settings = settingsRef.current;
		clock += dt;
		phase += (dt * clamp(finite(settings.speed, 1), -8, 8)) / LOOP;
		seed = (seed + 0.618034) % 1;
		const amount = clamp(finite(settings.parallax, 0.5), 0, 2);
		[leanX, leanVX] = springTo(leanX, leanVX, aimX * 0.2 * amount, dt, 0.9, 1);
		[leanY, leanVY] = springTo(leanY, leanVY, aimY * 0.14 * amount, dt, 0.9, 1);
		for (let i = 0; i < MAX_COINS; i++) {
			if (kickAt[i] <= clock) {
				kick(i, kickX[i], kickY[i], kickRate[i]);
				kickAt[i] = Infinity;
			}
			if (extra[i] === 0 && rate[i] === 0) continue;
			if (Math.abs(rate[i]) > 2.6) {
				rate[i] *= Math.exp(-dt * 1.5);
				extra[i] += rate[i] * dt;
				rest[i] = NaN;
				continue;
			}
			if (Number.isNaN(rest[i])) rest[i] = TAU * Math.round((extra[i] + rate[i] * 0.32) / TAU);
			const [angle, velocity] = springTo(extra[i], rate[i], rest[i], dt, 0.75, 1);
			if (Math.abs(angle - rest[i]) < 2e-3 && Math.abs(velocity) < 2e-2) {
				extra[i] = 0;
				rate[i] = 0;
				rest[i] = NaN;
			} else {
				extra[i] = angle;
				rate[i] = velocity;
			}
		}
	};

	function tick(time: number) {
		raf = 0;
		if (destroyed || lost) return;
		const pause = last ? Math.max(0, (time - last) / 1000) : 0;
		const dt = last ? Math.min(0.05, pause) : 1 / 60;
		last = time;
		advance(dt);
		let rescale = false;
		if (warmup > 0) {
			warmup--;
		} else if (pause > 0 && adaptive) {
			counted++;
			spent += pause;
			if (pause > 0.024) slow++;
		}
		if (counted >= 60) {
			const average = spent / counted;
			const heavy = slow > 36;
			counted = 0;
			slow = 0;
			spent = 0;
			if (before > 0 && average > before * 0.9) {
				governor = Math.min(1, governor / 0.8);
				adaptive = false;
				rescale = true;
			} else if (heavy && governor > 0.5) {
				before = average;
				governor = Math.max(0.5, governor * 0.8);
				rescale = true;
			} else {
				before = 0;
			}
		}
		if (rescale) resize();
		else render();
		if (running() && !raf) raf = view.requestAnimationFrame(tick);
	}

	function wake() {
		if (destroyed || lost || raf || !running()) return;
		last = 0;
		raf = view.requestAnimationFrame(tick);
	}

	const resize = () => {
		if (destroyed) return;
		const rect = root.getBoundingClientRect();
		width = Math.max(1, root.clientWidth || rect.width);
		height = Math.max(1, root.clientHeight || rect.height);
		pixelRatio = ratioFor();
		warmup = 24;
		renderer.setPixelRatio(pixelRatio);
		renderer.setSize(width, height, false);
		const w = canvas.width;
		const h = canvas.height;
		release();
		sceneTarget = target(w, h, samples);
		const levels = Math.round(clamp(Math.floor(Math.log2(Math.min(w, h) / 8)), 3, 7));
		for (let k = 1; k <= levels; k++) {
			downTargets.push(target(w >> k, h >> k, 0));
			upTargets.push(target(w >> k, h >> k, 0));
		}
		render();
		wake();
	};

	const local = (clientX: number, clientY: number) => {
		const rect = root.getBoundingClientRect();
		if (rect.width <= 0 || rect.height <= 0) return null;
		return {
			x: (clientX - rect.left) * (width / rect.width),
			y: (clientY - rect.top) * (height / rect.height),
		};
	};

	const brush = (clientX: number, clientY: number) => {
		const settings = settingsRef.current;
		const spot = interactive() ? local(clientX, clientY) : null;
		if (!spot) {
			trail = null;
			return;
		}
		aimX = clamp((spot.x / width) * 2 - 1, -1, 1);
		aimY = clamp((spot.y / height) * 2 - 1, -1, 1);
		const time = now();
		const from = trail;
		trail = { x: spot.x, y: spot.y, t: time };
		const strength = clamp(finite(settings.flick, 1), 0, 3);
		if (!from || strength <= 0) return;
		const dx = spot.x - from.x;
		const dy = spot.y - from.y;
		const move = Math.hypot(dx, dy);
		if (move < 0.5) return;
		const pace = move / Math.max(time - from.t, 0.004) / Math.min(width, height);
		const midX = (spot.x + from.x) / 2;
		const midY = (spot.y + from.y) / 2;
		for (let i = 0; i < live; i++) {
			const radius = screenR[i];
			if (radius < 3) continue;
			const ox = midX - screenX[i];
			const oy = midY - screenY[i];
			if (ox * ox + oy * oy > radius * radius) continue;
			const amount = clamp(pace * 9, 1.5, 24) * strength * Math.min(move / (2 * radius), 1);
			kick(i, dy / move, dx / move, amount);
		}
		wake();
	};

	const pulseAt = (x: number, y: number, amount: number) => {
		if (!interactive() || amount <= 0) return;
		const side = Math.min(width, height);
		for (let i = 0; i < live; i++) {
			const dx = screenX[i] - x;
			const dy = screenY[i] - y;
			const distance = Math.hypot(dx, dy);
			const ux = distance > 1 ? dx / distance : 1;
			const uy = distance > 1 ? dy / distance : 0;
			kickAt[i] = clock + (distance / side) * 0.55;
			kickRate[i] = (amount * 15) / (1 + (distance / side) * 1.6);
			kickX[i] = uy;
			kickY[i] = ux;
		}
		wake();
	};

	const settle = () => {
		aimX = 0;
		aimY = 0;
		trail = null;
	};

	const onPointerMove = (event: PointerEvent) => {
		if (event.pointerType === "touch") return;
		brush(event.clientX, event.clientY);
	};

	const onPointerDown = (event: PointerEvent) => {
		if (event.pointerType === "touch" || event.button !== 0 || isControl(event.target)) return;
		const spot = local(event.clientX, event.clientY);
		if (spot) pulseAt(spot.x, spot.y, clamp(finite(settingsRef.current.pulse, 1), 0, 3));
	};

	const onPointerLeave = (event: PointerEvent) => {
		if (event.pointerType !== "touch") settle();
	};

	const onTouchStart = (event: TouchEvent) => {
		const touch = event.changedTouches[0];
		if (!touch) return;
		press = { id: touch.identifier, x: touch.clientX, y: touch.clientY, t: now() };
		trail = null;
		brush(touch.clientX, touch.clientY);
	};

	const onTouchMove = (event: TouchEvent) => {
		const touch =
			Array.from(event.touches).find((item) => !press || item.identifier === press.id) ??
			event.touches[0];
		if (touch) brush(touch.clientX, touch.clientY);
	};

	const onTouchEnd = (event: TouchEvent) => {
		const tap = press;
		press = null;
		settle();
		if (!tap || isControl(event.target)) return;
		const touch = Array.from(event.changedTouches).find((item) => item.identifier === tap.id);
		if (!touch) return;
		if (Math.hypot(touch.clientX - tap.x, touch.clientY - tap.y) > 10 || now() - tap.t > 0.5)
			return;
		const spot = local(touch.clientX, touch.clientY);
		if (spot) pulseAt(spot.x, spot.y, clamp(finite(settingsRef.current.pulse, 1), 0, 3));
	};

	const onTouchCancel = () => {
		press = null;
		settle();
	};

	const onVisibility = () => {
		last = 0;
		if (!doc.hidden) wake();
	};

	const onLost = (event: Event) => {
		event.preventDefault();
		lost = true;
		view.cancelAnimationFrame(raf);
		raf = 0;
	};

	const onRestored = () => {
		lost = false;
		envTarget = null;
		softTarget = null;
		envKey = "";
		sceneTarget = null;
		downTargets = [];
		upTargets = [];
		resize();
	};

	const onTheme = () => {
		if (destroyed || lost) return;
		if (!raf) render();
	};

	root.addEventListener("pointermove", onPointerMove);
	root.addEventListener("pointerdown", onPointerDown);
	root.addEventListener("pointerleave", onPointerLeave);
	root.addEventListener("touchstart", onTouchStart, { passive: true });
	root.addEventListener("touchmove", onTouchMove, { passive: true });
	root.addEventListener("touchend", onTouchEnd, { passive: true });
	root.addEventListener("touchcancel", onTouchCancel, { passive: true });
	doc.addEventListener("visibilitychange", onVisibility);
	canvas.addEventListener("webglcontextlost", onLost);
	canvas.addEventListener("webglcontextrestored", onRestored);
	const resizeObserver = new ResizeObserver(resize);
	resizeObserver.observe(root);
	const intersection = new IntersectionObserver(
		(entries) => {
			visible = entries.some((entry) => entry.isIntersecting);
			last = 0;
			if (visible) wake();
		},
		{ rootMargin: "80px" },
	);
	intersection.observe(root);
	const themes = new MutationObserver(onTheme);
	themes.observe(doc.documentElement, {
		attributes: true,
		attributeFilter: ["class", "style", "data-theme"],
	});
	resize();

	return {
		sync: () => {
			if (destroyed || lost) return;
			if (Math.abs(ratioFor() - pixelRatio) > 1e-3) {
				resize();
				return;
			}
			if (!raf) render();
			wake();
		},
		pulse: (x = 0.5, y = 0.5) => {
			pulseAt(
				clamp(x, 0, 1) * width,
				clamp(y, 0, 1) * height,
				clamp(finite(settingsRef.current.pulse, 1), 0, 3) || 1,
			);
		},
		destroy: () => {
			destroyed = true;
			view.cancelAnimationFrame(raf);
			raf = 0;
			root.removeEventListener("pointermove", onPointerMove);
			root.removeEventListener("pointerdown", onPointerDown);
			root.removeEventListener("pointerleave", onPointerLeave);
			root.removeEventListener("touchstart", onTouchStart);
			root.removeEventListener("touchmove", onTouchMove);
			root.removeEventListener("touchend", onTouchEnd);
			root.removeEventListener("touchcancel", onTouchCancel);
			doc.removeEventListener("visibilitychange", onVisibility);
			canvas.removeEventListener("webglcontextlost", onLost);
			canvas.removeEventListener("webglcontextrestored", onRestored);
			resizeObserver.disconnect();
			intersection.disconnect();
			themes.disconnect();
			release();
			envTarget?.dispose();
			softTarget?.dispose();
			blank.dispose();
			geometry.dispose();
			plane.dispose();
			[
				coinMaterial,
				envMaterial,
				blurMaterial,
				downMaterial,
				upMaterial,
				compositeMaterial,
			].forEach((item) => item.dispose());
			renderer.dispose();
			renderer.forceContextLoss();
			canvas.remove();
		},
	};
};

const GlassCoins = forwardRef<GlassCoinsHandle, GlassCoinsProps>(function GlassCoins(
	{
		colors = DEFAULT_COLORS,
		backgroundColor = "#0a0a0a",
		pattern = "stream",
		count = 10,
		size = 0.36,
		thickness = 0.22,
		bevel = 0.16,
		spacing = 1,
		speed = 1,
		turn = 90,
		spin = 0,
		twist = 0,
		rock = 42,
		ripple = 0.22,
		drift = 1,
		sway = 1,
		depth = 1,
		tilt = 12,
		angle = 0,
		pitch = 0,
		yaw = 0,
		centerX = 0,
		centerY = 0,
		ior = 1.45,
		dispersion = 0.5,
		density = 0.4,
		frost = 0.2,
		glow = 1,
		intensity = 1,
		lightAngle = 0,
		interactive = true,
		flick = 1,
		pulse = 1,
		parallax = 0.5,
		paused = false,
		quality = 1,
		className,
		style,
		children,
	},
	ref,
) {
	const rootRef = useRef<HTMLDivElement>(null);
	const controllerRef = useRef<Controller | null>(null);
	const reduced = useSyncExternalStore(subscribeToMotion, readMotion, () => false);
	const settings: Settings = {
		colors,
		backgroundColor,
		pattern,
		count,
		size,
		thickness,
		bevel,
		spacing,
		speed,
		turn,
		spin,
		twist,
		rock,
		ripple,
		drift,
		sway,
		depth,
		tilt,
		angle,
		pitch,
		yaw,
		centerX,
		centerY,
		ior,
		dispersion,
		density,
		frost,
		glow,
		intensity,
		lightAngle,
		interactive,
		flick,
		pulse,
		parallax,
		paused,
		quality,
		reduced,
	};
	const settingsRef = useRef(settings);

	useEffect(() => {
		settingsRef.current = settings;
		controllerRef.current?.sync();
	});

	useEffect(() => {
		const root = rootRef.current;
		if (!root) return;
		const controller = createCoins(root, settingsRef);
		controllerRef.current = controller;
		return () => {
			controller?.destroy();
			controllerRef.current = null;
		};
	}, []);

	useImperativeHandle(
		ref,
		() => ({
			pulse: (x?: number, y?: number) => controllerRef.current?.pulse(x, y),
		}),
		[],
	);

	return (
		<div
			ref={rootRef}
			className={cn("relative isolate h-full min-h-[240px] w-full overflow-hidden", className)}
			style={{ backgroundColor, ...style }}
		>
			{children && <div className="relative z-10 h-full w-full">{children}</div>}
		</div>
	);
});

GlassCoins.displayName = "GlassCoins";

export { GlassCoins };
export default GlassCoins;
