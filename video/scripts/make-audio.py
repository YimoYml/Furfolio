"""Create the original Furfolio 30-second promotional music bed.

No samples or third-party music. All instruments are synthesized here.
Run with Python 3 + numpy. Output: ../public/audio/furfolio-bed.wav.
"""

from pathlib import Path
import json
import math
import wave

import numpy as np


SR = 48_000
DURATION = 30.0
BPM = 96
BEAT = 60.0 / BPM
N = round(SR * DURATION)
RNG = np.random.default_rng(43096)
mix = np.zeros((N, 2), dtype=np.float64)
air_bus = np.zeros((N, 2), dtype=np.float64)


def midi(note):
    return 440 * 2 ** ((note - 69) / 12)


def fade_edges(signal, attack=0.008, release=0.035):
    out = signal.copy()
    a = min(round(attack * SR), len(out))
    r = min(round(release * SR), len(out))
    if a:
        out[:a] *= np.sin(np.linspace(0, np.pi / 2, a)) ** 2
    if r:
        out[-r:] *= np.sin(np.linspace(np.pi / 2, 0, r)) ** 2
    return out


def put(signal, at, amp, pan=0, bus=None):
    target = mix if bus is None else bus
    start = round(at * SR)
    if start < 0 or start >= N:
        return
    size = min(len(signal), N - start)
    # Equal-power panning, with a small stable stereo field.
    angle = (np.clip(pan, -1, 1) + 1) * np.pi / 4
    target[start:start + size, 0] += signal[:size] * amp * np.cos(angle)
    target[start:start + size, 1] += signal[:size] * amp * np.sin(angle)


def pluck(note, length=1.25, soft=False):
    t = np.arange(round(length * SR)) / SR
    f = midi(note)
    # A rounded bell/pluck: warm fundamental, short gently detuned overtone.
    s = np.sin(2 * np.pi * f * t) * np.exp(-t / (0.42 if soft else 0.29))
    s += 0.20 * np.sin(2 * np.pi * (f * 2.002) * t) * np.exp(-t / 0.13)
    s += 0.055 * np.sin(2 * np.pi * f * 3 * t) * np.exp(-t / 0.065)
    return fade_edges(s, 0.016 if soft else 0.006, 0.1)


def pad(note, length=3.5):
    t = np.arange(round(length * SR)) / SR
    f = midi(note)
    s = (np.sin(2 * np.pi * f * t + 0.15)
         + 0.33 * np.sin(2 * np.pi * f * 1.0015 * t + 0.95)
         + 0.10 * np.sin(2 * np.pi * 2 * f * t)) / 1.43
    env = np.sin(np.minimum(t / 0.75, 1) * np.pi / 2) ** 2
    env *= np.clip((length - t) / 1.15, 0, 1) ** 1.4
    return s * env


def bass(note, length=0.55):
    t = np.arange(round(length * SR)) / SR
    f = midi(note)
    env = (1 - np.exp(-t / 0.022)) * np.exp(-t / 0.26)
    s = (np.sin(2 * np.pi * f * t)
         + 0.15 * np.sin(2 * np.pi * 2 * f * t)) * env
    return fade_edges(s, 0.01, 0.1)


def kick():
    t = np.arange(round(0.27 * SR)) / SR
    # Analytic integral for a soft downward pitch bend; no clicky transient.
    phase = 2 * np.pi * (47 * t + 49 * 0.026 * (1 - np.exp(-t / 0.026)))
    return fade_edges(np.sin(phase) * np.exp(-t / 0.083), 0.003, 0.05)


def brushed_tick(length=0.11, seed=None):
    t = np.arange(round(length * SR)) / SR
    noise = RNG.normal(0, 1, len(t))
    # Difference a short smoothing filter: mostly airy, no harsh top end.
    smooth = np.convolve(noise, np.ones(7) / 7, mode="same")
    s = (smooth - np.roll(smooth, 6)) * np.exp(-t / 0.035)
    return fade_edges(s, 0.004, 0.025)


def wood():
    t = np.arange(round(0.22 * SR)) / SR
    s = (np.sin(2 * np.pi * 260 * t) * np.exp(-t / 0.035)
         + 0.2 * np.sin(2 * np.pi * 390 * t) * np.exp(-t / 0.018))
    return fade_edges(s, 0.0015, 0.03)


def swish(length=0.48):
    t = np.arange(round(length * SR)) / SR
    noise = RNG.normal(0, 1, len(t))
    smooth = np.convolve(noise, np.ones(35) / 35, mode="same")
    env = np.sin(np.pi * t / length) ** 2
    return smooth * env


# Dmaj9 -> Bm9 -> Gmaj9 -> A6/9, three 10-second cycles.
chords = [
    [50, 57, 61, 66, 69],
    [47, 54, 57, 61, 62],
    [43, 50, 54, 57, 59],
    [45, 52, 54, 59, 61],
]
roots = [38, 35, 31, 33]

for bar in range(12):
    at = bar * 4 * BEAT
    ci = bar % 4
    level = 0.020 if bar < 2 else 0.026
    if bar in (6, 7):  # Air around the desktop-to-mobile sequence.
        level *= 0.9
    for ni, note in enumerate(chords[ci]):
        put(pad(note), at, level, (ni - 2) * 0.20, air_bus)
    if bar >= 1:
        for beat in (0, 2.5):
            put(bass(roots[ci]), at + beat * BEAT, 0.115 if bar < 10 else 0.13)

# A simple original motif. Sparse enough for the product to remain central.
motifs = [
    [(0, 69), (1.5, 73), (3, 76)],
    [(0.5, 73), (2, 69), (3.5, 66)],
    [(0, 71), (1.5, 69), (3, 66)],
    [(0.5, 64), (2.5, 66), (3.25, 69)],
]
for bar in range(12):
    at = bar * 4 * BEAT
    motif = motifs[bar % 4]
    for k, (b, note) in enumerate(motif):
        # Intro and mobile scenes use a low-density, softer register.
        if bar in (0, 6, 7) and k == 1:
            continue
        pan = (-0.20, 0.17, 0.04)[k]
        amp = 0.046 if bar < 2 else 0.066
        if bar >= 10:
            amp = 0.056
        put(pluck(note, soft=True), at + b * BEAT, amp, pan, air_bus)

# Restrained groove: organic wood taps and brushed high percussion.
for b in range(48):
    at = b * BEAT
    if at >= 3.75 and at < 27.5:
        if b % 4 in (0, 2):
            put(kick(), at, 0.14 if at < 21 else 0.165)
        if b % 4 == 3:
            put(wood(), at + 0.010, 0.030, 0.15)
        if b % 2 == 1:
            put(brushed_tick(), at + 0.012, 0.040, -0.18)
        # Quiet upbeats add movement, not a busy drum loop.
        if 10 <= at < 16 or 21 <= at < 26:
            put(brushed_tick(0.075), at + BEAT / 2, 0.016, 0.25)

# Chapter changes: a soft swish preceding each cut and a small tonal sparkle.
for at in (4, 10, 16, 21, 26):
    put(swish(), at - 0.42, 0.075, -0.25, air_bus)
    put(pluck(78 if at in (10, 26) else 76, soft=True), at + 0.018,
        0.043, 0.30, air_bus)

# CTA lands with an open D chord and then enough space for the end card.
for i, note in enumerate((50, 57, 66, 73, 76)):
    put(pluck(note, length=2.8, soft=True), 27.5 + i * 0.025,
        0.040, (i - 2) * 0.11, air_bus)

# Two subtle tempo-related echoes and a diffuse stereo room, all deterministic.
mix += air_bus
for delay, wet in ((BEAT * 0.75, 0.18), (BEAT * 1.5, 0.085)):
    n = round(delay * SR)
    mix[n:] += air_bus[:-n, ::-1] * wet
for delay, wet in ((0.083, 0.055), (0.137, 0.042), (0.211, 0.034),
                   (0.307, 0.026), (0.433, 0.018)):
    n = round(delay * SR)
    mix[n:, 0] += air_bus[:-n, 1] * wet
    mix[n:, 1] += air_bus[:-n, 0] * wet * 0.94

# Remove any numerical DC offset, then smooth fade-in/out and keep headroom.
mix -= np.mean(mix, axis=0)
a = round(0.4 * SR)
r = round(1.2 * SR)
mix[:a] *= (np.sin(np.linspace(0, np.pi / 2, a)) ** 2)[:, None]
mix[-r:] *= (np.sin(np.linspace(np.pi / 2, 0, r)) ** 2)[:, None]
peak = np.max(np.abs(mix))
rms = np.sqrt(np.mean(mix ** 2))
target_rms = 10 ** (-20.0 / 20)
ceiling = 10 ** (-3.0 / 20)
mix *= min(target_rms / rms, ceiling / peak)

out = Path(__file__).resolve().parents[1] / "public" / "audio" / "furfolio-bed.wav"
out.parent.mkdir(parents=True, exist_ok=True)
pcm = np.rint(np.clip(mix, -1, 1) * 32767).astype("<i2")
with wave.open(str(out), "wb") as f:
    f.setnchannels(2)
    f.setsampwidth(2)
    f.setframerate(SR)
    f.writeframes(pcm.tobytes())

def db(v):
    return round(20 * math.log10(max(float(v), 1e-12)), 2)

metrics = {
    "file": str(out),
    "duration_seconds": len(pcm) / SR,
    "sample_rate": SR,
    "channels": 2,
    "bit_depth": 16,
    "bpm": BPM,
    "peak_dbfs": db(np.max(np.abs(mix))),
    "rms_dbfs": db(np.sqrt(np.mean(mix ** 2))),
    "clipped_samples": int(np.sum(np.abs(mix) >= 1)),
    "stereo_correlation": round(float(np.corrcoef(mix.T)[0, 1]), 4),
    "first_sample": pcm[0].tolist(),
    "last_sample": pcm[-1].tolist(),
    "section_rms_dbfs": {
        f"{start}-{end}": db(np.sqrt(np.mean(mix[round(start*SR):round(end*SR)] ** 2)))
        for start, end in ((0, 4), (4, 10), (10, 16), (16, 21), (21, 26), (26, 30))
    },
}
print(json.dumps(metrics, ensure_ascii=False, indent=2))
