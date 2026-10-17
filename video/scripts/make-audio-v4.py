"""Furfolio V4: clean Minimal House with a restrained garage shuffle.

Entirely original code synthesis; no samples, no recycled music. Short warm
chord stabs and an elastic bass carry the cue. A quiet mid-register response
appears only once per four-second phrase, leaving the interface in front.
"""
from pathlib import Path
import math
import wave
import numpy as np

SR = 48_000
DURATION = 30
BPM = 120
BEAT = 0.5
N = DURATION * SR
RNG = np.random.default_rng(412036)
drums = np.zeros((N, 2), dtype=np.float64)
bass_bus = np.zeros_like(drums)
keys = np.zeros_like(drums)
responses = np.zeros_like(drums)
room = np.zeros_like(drums)
kick_times = []


def hz(note):
    return 440.0 * 2 ** ((note - 69) / 12)


def edges(x, attack=0.005, release=0.04):
    x = x.copy()
    a = min(round(attack * SR), len(x))
    r = min(round(release * SR), len(x))
    if a:
        x[:a] *= np.sin(np.linspace(0, np.pi / 2, a)) ** 2
    if r:
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
    t = np.arange(round(0.28 * SR)) / SR
    phase = 2 * np.pi * (48 * t + 51 * 0.018 * (1 - np.exp(-t / 0.018)))
    body = np.sin(phase) * np.exp(-t / 0.075)
    body += 0.075 * np.sin(phase * 2) * np.exp(-t / 0.023)
    return edges(body, 0.0025, 0.055)


def hat(opened=False):
    length = 0.135 if opened else 0.07
    t = np.arange(round(length * SR)) / SR
    decay = 0.043 if opened else 0.017
    x = noise(length, 3500, 7600) * np.exp(-t / decay)
    return edges(x, 0.002, 0.022)


def soft_clap():
    length = 0.18
    t = np.arange(round(length * SR)) / SR
    n = noise(length, 650, 4600)
    # Three very short diffused attacks, then a small room tail.
    env = np.zeros(len(t))
    for at, gain in ((0.0, 0.8), (0.008, 0.6), (0.017, 0.4)):
        age = np.maximum(t - at, 0)
        env += np.where(t >= at, gain * np.exp(-age / 0.007), 0)
    env += np.where(t >= 0.018, 0.25 * np.exp(-np.maximum(t - 0.018, 0) / 0.044), 0)
    x = n * env
    x += 0.26 * np.sin(2 * np.pi * 188 * t) * np.exp(-t / 0.033)
    return edges(x, 0.002, 0.032)


def rim():
    t = np.arange(round(0.075 * SR)) / SR
    x = (np.sin(2 * np.pi * 330 * t)
         + 0.38 * np.sin(2 * np.pi * 528 * t)) * np.exp(-t / 0.012)
    x += 0.065 * noise(0.075, 1200, 4600) * np.exp(-t / 0.009)
    return edges(x, 0.0018, 0.02)


def bass(note, length=0.25, accent=False):
    t = np.arange(round(length * SR)) / SR
    f = hz(note)
    # Audible lower mids add bounce without turning the bass into a lead.
    x = (np.sin(2 * np.pi * f * t)
         + 0.30 * np.sin(2 * np.pi * 2 * f * t + 0.12) * np.exp(-t / 0.15)
         + 0.13 * np.sin(2 * np.pi * 3 * f * t + 0.3) * np.exp(-t / 0.10)
         + 0.045 * np.sin(2 * np.pi * 4 * f * t) * np.exp(-t / 0.075))
    x *= np.exp(-t / (0.31 if accent else 0.23))
    return edges(x, 0.009, 0.055)


def key(note, length=0.67, mellow=False):
    t = np.arange(round(length * SR)) / SR
    f = hz(note)
    decay = 0.31 if mellow else 0.235
    x = np.sin(2 * np.pi * f * t + 0.22) * np.exp(-t / decay)
    x += 0.22 * np.sin(2 * np.pi * 2 * f * t + 0.51) * np.exp(-t / 0.105)
    x += 0.067 * np.sin(2 * np.pi * 3 * f * t + 0.72) * np.exp(-t / 0.055)
    x += 0.10 * np.sin(2 * np.pi * f * 1.0013 * t + 0.68) * np.exp(-t / decay)
    return edges(x, 0.009 if not mellow else 0.019, 0.13)


voicings = [
    [55, 60, 64, 71, 74],  # Cmaj9
    [55, 59, 60, 64, 69],  # Am9
    [57, 60, 64, 67, 72],  # Fmaj9
    [55, 59, 62, 64, 69],  # G6/9
]
roots = [36, 33, 41, 43]
progression = [0, 1, 2, 3, 0, 1, 2, 0]

# The response remains in a comfortable mid register and has no sharp bell
# overtones. Its total level is deliberately small compared with the groove.
motifs = [[67, 64, 62], [64, 62, 60], [69, 67, 64], [59, 62, 64]]
for phrase in range(7):
    base = phrase * 4.0
    for i, note in enumerate(motifs[progression[phrase]]):
        put(responses, key(note, 0.52, mellow=True), base + 1.125 + i * 0.25,
            0.017 if i == 0 else 0.013, (-0.08, 0.08, -0.03)[i])

for bar in range(15):
    at = bar * 2.0
    chord_index = progression[bar // 2]
    final = bar == 14
    complete = 7 <= bar <= 8  # 14-18 seconds: a clear half-second colour pulse.
    turnaround = bar in (3, 7, 11)
    for beat in range(4):
        if final and beat > 1:
            continue
        when = at + beat * BEAT
        put(drums, kick(), when, 0.255 if complete else 0.244)
        kick_times.append(when)

    if not final:
        for beat in range(4):
            put(drums, hat(opened=beat in (1, 3)), at + beat * BEAT + 0.258,
                0.026 * RNG.uniform(0.93, 1.035), (-1 if beat % 2 else 1) * 0.23)
        for beat in (1, 3):
            put(drums, soft_clap(), at + beat * BEAT + 0.006,
                0.047 if bar > 0 else 0.034, -0.035)
        # A little sixteenth-note shuffle; only two or three ghost attacks.
        ghosts = (3, 9, 15) if complete else ((3, 11) if bar % 2 else (7,))
        for step in ghosts:
            if bar == 0:
                continue
            put(drums, hat(), at + step * 0.125 + 0.015,
                0.0095 * RNG.uniform(0.87, 1.1), 0.27 if step % 3 else -0.27)
        if bar % 2 == 1:
            put(drums, rim(), at + 1.391, 0.035, 0.13)
        if turnaround:
            put(drums, rim(), at + 1.875 + 0.012, 0.021, -0.13)

    # Offbeat low notes are stable; a small pickup shifts every second bar.
    if final:
        bass_pattern = [(0.5, 0, 0.8, 0.48), (1.5, 0, 0.4, 0.28)]
    elif bar % 2:
        bass_pattern = [(0.5, 0, 1.0, 0.24), (1.5, 0, 0.84, 0.22),
                        (2.75, 0, 0.88, 0.22), (3.5, 7, 0.66, 0.19)]
    else:
        bass_pattern = [(0.5, 0, 1.0, 0.26), (1.5, 0, 0.88, 0.24),
                        (2.5, 0, 0.97, 0.25), (3.25, 0, 0.64, 0.17)]
    for beat, offset, gain, length in bass_pattern:
        put(bass_bus, bass(roots[chord_index] + offset, length, beat == 0.5),
            at + beat * BEAT + (0.011 if beat % 1 == 0.75 else 0), 0.175 * gain)

    if final:
        stab_pattern = [(0.04, 1.03, 1.35), (0.75, 0.38, 0.95)]
    elif bar == 0:
        stab_pattern = [(0.02, 0.9, 0.75), (0.765, 0.71, 0.56), (1.51, 0.75, 0.58)]
    elif bar % 2:
        stab_pattern = [(0.258, 0.82, 0.64), (1.015, 0.61, 0.53), (1.515, 0.77, 0.63)]
    else:
        stab_pattern = [(0.258, 0.81, 0.64), (0.765, 0.63, 0.53), (1.51, 0.76, 0.63)]
    for offset, gain, length in stab_pattern:
        for i, note in enumerate(voicings[chord_index]):
            # Spread closed voicings, with top notes quieter than the body.
            weight = 0.72 if i == 4 else (0.9 if i == 3 else 1.0)
            put(keys, key(note, length, mellow=final), at + offset,
                0.040 * gain * weight, (i - 2) * 0.2)

# Tight stereo reflections keep the harmony airy rather than washed out.
ambience = keys + responses
for delay, gain in ((0.041, 0.052), (0.079, 0.04), (0.25, 0.082), (0.50, 0.032)):
    offset = round(delay * SR)
    room[offset:] += ambience[:-offset, ::-1] * gain

duck = np.ones(N)
for when in kick_times:
    start = round(when * SR)
    length = min(round(0.16 * SR), N - start)
    age = np.arange(length) / SR
    duck[start:start + length] = np.minimum(
        duck[start:start + length], 1 - 0.12 * np.exp(-age / 0.058))
mix = drums + bass_bus * duck[:, None] + (keys + responses + room) * duck[:, None]
mix -= np.mean(mix, axis=0)
mix = np.tanh(mix * 1.18) / 1.18
fade_in = round(0.016 * SR)
fade_out = round(0.42 * SR)
mix[:fade_in] *= np.sin(np.linspace(0, np.pi / 2, fade_in))[:, None] ** 2
mix[-fade_out:] *= np.sin(np.linspace(np.pi / 2, 0, fade_out))[:, None] ** 2
mix *= min(10 ** (-16.5 / 20) / np.sqrt(np.mean(mix ** 2)),
           10 ** (-1.6 / 20) / np.max(np.abs(mix)))

# One basic export check only: exact length, finite signal and unclipped PCM.
assert mix.shape == (N, 2) and np.all(np.isfinite(mix)) and np.max(np.abs(mix)) < 1
output = Path(__file__).resolve().parents[1] / 'public' / 'audio' / 'furfolio-minimal-groove-v4.wav'
output.parent.mkdir(parents=True, exist_ok=True)
pcm = np.rint(mix * 32767).astype('<i2')
pcm[0] = 0
pcm[-1] = 0
with wave.open(str(output), 'wb') as stream:
    stream.setnchannels(2)
    stream.setsampwidth(2)
    stream.setframerate(SR)
    stream.writeframes(pcm.tobytes())
db = lambda x: round(20 * math.log10(max(float(x), 1e-12)), 2)
print(f'{output}\n30 s / 120 BPM / stereo 48 kHz 16-bit; '
      f'peak {db(np.max(np.abs(mix)))} dBFS; RMS {db(np.sqrt(np.mean(mix ** 2)))} dBFS.')
