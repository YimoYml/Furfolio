"""Furfolio V3: original ambient house / minimal electronic, no samples.

120 BPM and 30 seconds. No lead melody or arpeggio: slow warm chords,
round offbeat bass and a small, soft four-on-the-floor rhythm carry the cue.
"""
from pathlib import Path
import math
import wave
import numpy as np

SR = 48_000
BPM = 120
BEAT = 0.5
N = 30 * SR
RNG = np.random.default_rng(38120)
rhythm = np.zeros((N, 2), dtype=np.float64)
low = np.zeros_like(rhythm)
harmony = np.zeros_like(rhythm)
space = np.zeros_like(rhythm)
kick_times = []


def hz(note):
    return 440 * 2 ** ((note - 69) / 12)


def edges(x, attack=0.02, release=0.08):
    x = x.copy()
    a, r = min(round(attack * SR), len(x)), min(round(release * SR), len(x))
    x[:a] *= np.sin(np.linspace(0, np.pi / 2, a)) ** 2
    x[-r:] *= np.sin(np.linspace(np.pi / 2, 0, r)) ** 2
    return x


def put(bus, x, at, amp, pan=0):
    start = round(at * SR)
    count = min(len(x), N - start)
    if count <= 0 or start < 0:
        return
    angle = (pan + 1) * np.pi / 4
    bus[start:start + count, 0] += x[:count] * amp * np.cos(angle)
    bus[start:start + count, 1] += x[:count] * amp * np.sin(angle)


def noise(length, lower, upper):
    n = round(length * SR)
    f = np.fft.rfftfreq(n, 1 / SR)
    shape = (1 / np.sqrt(1 + (lower / np.maximum(f, 1)) ** 8)
             / np.sqrt(1 + (f / upper) ** 12))
    x = np.fft.irfft(np.fft.rfft(RNG.normal(size=n)) * shape, n=n)
    return x / max(np.sqrt(np.mean(x * x)), 1e-9)


def kick():
    t = np.arange(round(0.32 * SR)) / SR
    phase = 2 * np.pi * (48 * t + 42 * 0.026 * (1 - np.exp(-t / 0.026)))
    body = np.sin(phase) * np.exp(-t / 0.083)
    return edges(body, 0.0045, 0.06)


def hat(length=0.095):
    t = np.arange(round(length * SR)) / SR
    # Short, filtered breath rather than a bright metallic cymbal.
    return edges(noise(length, 2500, 5800) * np.exp(-t / 0.024), 0.004, 0.025)


def tick():
    t = np.arange(round(0.105 * SR)) / SR
    x = 0.72 * np.sin(2 * np.pi * 225 * t) * np.exp(-t / 0.017)
    x += 0.11 * noise(0.105, 800, 2700) * np.exp(-t / 0.012)
    return edges(x, 0.003, 0.025)


def bass(note, length=0.34):
    t = np.arange(round(length * SR)) / SR
    f = hz(note)
    x = (np.sin(2 * np.pi * f * t)
         + 0.14 * np.sin(2 * np.pi * f * 2 * t + 0.18)
         + 0.018 * np.sin(2 * np.pi * f * 3 * t))
    return edges(x * np.exp(-t / 0.38), 0.022, 0.10)


def warm_key(note, length=1.65):
    t = np.arange(round(length * SR)) / SR
    f = hz(note)
    x = np.sin(2 * np.pi * f * t + 0.2) * np.exp(-t / 0.72)
    x += 0.14 * np.sin(2 * np.pi * f * 2 * t + 0.5) * np.exp(-t / 0.31)
    x += 0.045 * np.sin(2 * np.pi * f * 3 * t + 0.8) * np.exp(-t / 0.14)
    x += 0.13 * np.sin(2 * np.pi * f * 1.0009 * t + 0.9) * np.exp(-t / 0.63)
    return edges(x, 0.028, 0.25)


def pad(note, length=4.25, phase=0):
    t = np.arange(round(length * SR)) / SR
    f = hz(note)
    x = (np.sin(2 * np.pi * f * t + phase)
         + 0.22 * np.sin(2 * np.pi * f * 1.0007 * t + phase + 1.2)
         + 0.05 * np.sin(2 * np.pi * f * 2 * t + phase + 0.6))
    x *= 0.91 + 0.09 * np.sin(2 * np.pi * 0.24 * t + phase)
    return edges(x, 0.42, 0.65)


# Two-bar harmonic changes leave space for the website, without a lead hook.
voicings = [
    [55, 60, 64, 67, 71],  # Cmaj7
    [55, 57, 60, 64, 71],  # Am9
    [53, 57, 60, 64, 67],  # Fmaj9
    [55, 59, 62, 64, 69],  # G6/9
]
roots = [36, 33, 41, 43]
progression = [0, 1, 2, 3, 0, 1, 2, 0]

for phrase, chord_index in enumerate(progression):
    at = phrase * 4.0
    if at >= 30:
        break
    duration = 1.8 if at == 28 else 4.25
    for i, note in enumerate(voicings[chord_index]):
        put(harmony, pad(note, duration, i * 0.81), at, 0.019, (i - 2) * 0.27)

for bar in range(15):
    at = bar * 2.0
    chord_index = progression[bar // 2]
    final = bar == 14
    colour = 5 <= bar < 8
    breathe = bar in (4, 8)

    # Soft but steady house pulse, established at the first frame.
    for beat in range(4):
        if final and beat > 1:
            continue
        when = at + beat * BEAT
        put(rhythm, kick(), when, 0.245 if colour else 0.23)
        kick_times.append(when)

    if not final:
        for beat in range(4):
            # Offbeat hats are deliberately quiet and low-pass filtered.
            put(rhythm, hat(), at + beat * BEAT + 0.253,
                0.031 * RNG.uniform(0.91, 1.02), -0.15 if beat % 2 else 0.15)
        for beat in (1, 3):
            put(rhythm, tick(), at + beat * BEAT + 0.006, 0.048, -0.04)
        if colour:
            for sixteenth in (3, 11):
                put(rhythm, hat(0.068), at + sixteenth * 0.125 + 0.008,
                    0.012, 0.23 if sixteenth == 3 else -0.23)

    # Repeating root pattern is a groove, not a second melody or octave run.
    bass_beats = (0.75, 2.75) if breathe else (0.5, 1.5, 2.5, 3.5)
    if final:
        bass_beats = (0.5,)
    for beat in bass_beats:
        put(low, bass(roots[chord_index], 0.65 if final else 0.34),
            at + beat * BEAT, 0.142 if breathe else 0.155)

    # A single mellow chord response per bar; no melodic top line.
    if not breathe or bar % 2 == 0:
        chord_at = at + (0.25 if final else 0.375)
        for i, note in enumerate(voicings[chord_index]):
            put(harmony, warm_key(note, 1.65), chord_at,
                0.038 if final else 0.031, (i - 2) * 0.22)

# A small dark room, with a subtle stereo eighth-note reflection on harmony.
for delay, gain in ((0.061, 0.08), (0.113, 0.05), (0.25, 0.075), (0.50, 0.032)):
    offset = round(delay * SR)
    space[offset:] += harmony[:-offset, ::-1] * gain

duck = np.ones(N)
for when in kick_times:
    start = round(when * SR)
    length = min(round(0.17 * SR), N - start)
    age = np.arange(length) / SR
    duck[start:start + length] = np.minimum(
        duck[start:start + length], 1 - 0.085 * np.exp(-age / 0.08))
mix = rhythm + (low + harmony + space) * duck[:, None]
mix -= np.mean(mix, axis=0)
mix = np.tanh(mix * 1.25) / 1.25
mix[:round(0.018 * SR)] *= np.sin(np.linspace(0, np.pi / 2, round(0.018 * SR)))[:, None] ** 2
mix[-round(0.45 * SR):] *= np.sin(np.linspace(np.pi / 2, 0, round(0.45 * SR)))[:, None] ** 2
mix *= min(10 ** (-17 / 20) / np.sqrt(np.mean(mix ** 2)),
           10 ** (-1.8 / 20) / np.max(np.abs(mix)))

assert np.all(np.isfinite(mix)) and np.max(np.abs(mix)) < 1
output = Path(__file__).resolve().parents[1] / 'public' / 'audio' / 'furfolio-ambient-house-v3.wav'
output.parent.mkdir(parents=True, exist_ok=True)
pcm = np.rint(mix * 32767).astype('<i2')
with wave.open(str(output), 'wb') as stream:
    stream.setnchannels(2)
    stream.setsampwidth(2)
    stream.setframerate(SR)
    stream.writeframes(pcm.tobytes())
db = lambda x: round(20 * math.log10(max(float(x), 1e-12)), 2)
print(f'{output}\n30 s / 120 BPM / stereo 48 kHz; peak {db(np.max(np.abs(mix)))} dBFS; RMS {db(np.sqrt(np.mean(mix ** 2)))} dBFS.')
