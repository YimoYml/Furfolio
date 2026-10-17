"""Furfolio V2: original 120 BPM electronic-pop cue, made without samples.

The 30-second arrangement has an immediate hook, a springy syncopated bass,
short bright chord stabs and a dry kick/clap groove. At 120 BPM every beat is
exactly 0.5 seconds, so the 10-16 second colour sequence has useful edit points.
All oscillators, percussion and effects are synthesized with numpy only.
The first soundtrack and the video composition are intentionally untouched.
"""

from pathlib import Path
import json
import math
import wave

import numpy as np


SR = 48_000
BPM = 120
BEAT = 60 / BPM
DURATION = 30.0
N = int(DURATION * SR)
RNG = np.random.default_rng(57120)
drums = np.zeros((N, 2), dtype=np.float64)
low = np.zeros_like(drums)
chords_bus = np.zeros_like(drums)
lead_bus = np.zeros_like(drums)
fx = np.zeros_like(drums)
kick_times = []


def midi(note):
    return 440 * 2 ** ((note - 69) / 12)


def edge(signal, attack=0.004, release=0.045):
    signal = signal.copy()
    a = min(round(attack * SR), len(signal))
    r = min(round(release * SR), len(signal))
    if a:
        signal[:a] *= np.sin(np.linspace(0, np.pi / 2, a)) ** 2
    if r:
        signal[-r:] *= np.sin(np.linspace(np.pi / 2, 0, r)) ** 2
    return signal


def add(bus, signal, at, amp, pan=0):
    start = round(at * SR)
    if start < 0 or start >= N:
        return
    count = min(len(signal), N - start)
    angle = (np.clip(pan, -1, 1) + 1) * np.pi / 4
    bus[start:start + count, 0] += signal[:count] * amp * np.cos(angle)
    bus[start:start + count, 1] += signal[:count] * amp * np.sin(angle)


def coloured_noise(length, lower, upper):
    """Smooth frequency-domain shaping; no recorded percussion samples."""
    size = round(length * SR)
    noise = RNG.normal(0, 1, size)
    freq = np.fft.rfftfreq(size, 1 / SR)
    lower_shape = 1 / np.sqrt(1 + (lower / np.maximum(freq, 1)) ** 8)
    upper_shape = 1 / np.sqrt(1 + (freq / upper) ** 10)
    shaped = np.fft.irfft(np.fft.rfft(noise) * lower_shape * upper_shape, n=size)
    return shaped / max(np.sqrt(np.mean(shaped ** 2)), 1e-9)


def kick():
    t = np.arange(round(0.34 * SR)) / SR
    phase = 2 * np.pi * (49 * t + 115 * 0.015 * (1 - np.exp(-t / 0.015)))
    body = np.sin(phase) * np.exp(-t / 0.100)
    knock = coloured_noise(0.34, 650, 2500) * np.exp(-t / 0.008) * 0.030
    return edge(body + knock, 0.0013, 0.055)


def clap():
    length = 0.22
    t = np.arange(round(length * SR)) / SR
    noise = coloured_noise(length, 900, 7000)
    env = np.zeros_like(t)
    for offset, gain in ((0, 0.65), (0.011, 0.80), (0.022, 1)):
        age = np.maximum(t - offset, 0)
        env += (t >= offset) * gain * np.exp(-age / 0.015)
    env += (t >= 0.026) * 0.19 * np.exp(-np.maximum(t - 0.026, 0) / 0.050)
    body = np.sin(2 * np.pi * 181 * t) * np.exp(-t / 0.030) * 0.35
    return edge(noise * env * 0.29 + body, 0.001, 0.035)


def hat(open_hat=False):
    length = 0.19 if open_hat else 0.072
    t = np.arange(round(length * SR)) / SR
    noise = coloured_noise(length, 4300, 11000)
    env = np.exp(-t / (0.058 if open_hat else 0.017))
    # A little inharmonic metal, rounded by the noise band and short envelope.
    metal = sum(np.sin(2 * np.pi * f * t) for f in (4750, 6230, 8129)) / 3
    return edge((0.65 * noise + 0.12 * metal) * env, 0.0015, 0.018)


def rim():
    t = np.arange(round(0.095 * SR)) / SR
    signal = (np.sin(2 * np.pi * 690 * t) + 0.35 * np.sin(2 * np.pi * 1541 * t))
    return edge(signal * np.exp(-t / 0.013), 0.001, 0.020)


def bass(note, length=0.24):
    t = np.arange(round(length * SR)) / SR
    f = midi(note)
    signal = np.sin(2 * np.pi * f * t)
    for harmonic, level in ((2, 0.29), (3, 0.13), (4, 0.055), (5, 0.025)):
        signal += level * np.sin(2 * np.pi * f * harmonic * t + harmonic * 0.12)
    env = (1 - np.exp(-t / 0.006)) * np.exp(-t / 0.33)
    return edge(np.tanh(signal * 1.05) * env, 0.004, min(0.075, length * 0.35))


def keys(note, length=0.42):
    """Short warm digital piano with a softly opening harmonic transient."""
    t = np.arange(round(length * SR)) / SR
    f = midi(note)
    signal = np.zeros_like(t)
    for harmonic, level, decay in ((1, 1, 0.42), (2, 0.29, 0.18),
                                    (3, 0.10, 0.09), (4, 0.050, 0.065)):
        signal += level * np.sin(2 * np.pi * f * harmonic * t + 0.22 * harmonic) * np.exp(-t / decay)
    # A restrained second oscillator gives the chord a stereo-friendly shimmer.
    signal += 0.16 * np.sin(2 * np.pi * f * 1.0011 * t + 0.5) * np.exp(-t / 0.27)
    return edge(signal, 0.004, 0.075)


def lead(note, length=0.29, accent=1):
    """A rounded, slightly animated synth hook, rather than a bell or beep."""
    t = np.arange(round(length * SR)) / SR
    f = midi(note)
    phase = 2 * np.pi * f * t + 0.012 * np.sin(2 * np.pi * 4.5 * t)
    signal = np.sin(phase)
    for harmonic in range(2, 9):
        harmonic_level = 0.40 / harmonic ** 1.20
        # Upper harmonics close quickly, keeping the melody bright but soft.
        harmonic_env = np.exp(-t / (0.08 + 0.36 / harmonic))
        signal += harmonic_level * np.sin(phase * harmonic + 0.21 * harmonic) * harmonic_env
    signal += 0.13 * np.sin(2 * np.pi * f * 1.0025 * t + 0.8)
    amp_env = (1 - np.exp(-t / 0.004)) * np.exp(-t / 0.35)
    return edge(np.tanh(signal * 0.87) * amp_env * accent, 0.003, 0.065)


def transition(length=0.30):
    t = np.arange(round(length * SR)) / SR
    noise = coloured_noise(length, 1700, 7000)
    env = np.sin(np.pi * t / length) ** 2
    return noise * env * 0.20


# Cmaj9 / Em7 / Am9 / Fmaj9, then Fmaj9 / G6 to lift into the final phrase.
# The bass pattern and melody were written for this version, not time-stretched.
voicings = [
    [55, 60, 64, 71, 74],
    [55, 59, 62, 67, 71],
    [57, 60, 64, 67, 71],
    [53, 57, 60, 64, 67],
    [55, 59, 62, 64, 69],
]
roots = [36, 40, 33, 41, 43]
harmonic_map = [0, 1, 2, 3, 4, 0, 1, 2, 3, 4, 0, 1, 2, 3, 0]
motifs = [
    [(0, 72), (0.75, 76), (1.5, 79), (2.0, 76), (2.75, 74), (3.5, 72)],
    [(0, 71), (0.75, 74), (1.5, 76), (2.5, 79), (3.0, 76), (3.5, 74)],
    [(0, 72), (0.75, 76), (1.5, 79), (2.0, 81), (2.75, 79), (3.5, 76)],
    [(0, 77), (0.75, 76), (1.5, 72), (2.0, 69), (2.75, 72), (3.5, 76)],
    [(0, 74), (0.75, 76), (1.5, 79), (2.5, 81), (3.0, 79), (3.5, 74)],
]

for bar in range(15):
    at = bar * 2.0
    ci = harmonic_map[bar]
    colour_section = 5 <= bar < 8
    stripped = bar == 4
    final_bar = bar == 14

    # Immediate, steady beat. A brief one-bar breath precedes the colour sprint.
    for beat in range(4):
        if final_bar and beat > 1:
            continue
        if stripped and beat in (1, 3):
            continue
        when = at + beat * BEAT
        add(drums, kick(), when, 0.28 if colour_section else 0.255)
        kick_times.append(when)
    if not final_bar:
        for beat in (1, 3):
            add(drums, clap(), at + beat * BEAT + 0.007, 0.115 if stripped else 0.135)

    if not final_bar:
        # Offbeats are clear; quiet swung 16ths add spring without becoming busy.
        for eighth in range(8):
            if stripped and eighth not in (2, 6):
                continue
            velocity = 0.031 if eighth % 2 == 0 else 0.060
            add(drums, hat(open_hat=eighth % 2 == 1 and bar >= 1),
                at + eighth * BEAT / 2 + (0.010 if eighth % 2 else 0),
                velocity * RNG.uniform(0.92, 1.04), -0.19 if eighth % 2 else 0.14)
        if colour_section or 10 <= bar <= 12:
            for sixteenth in (3, 7, 11, 15):
                add(drums, hat(), at + sixteenth * BEAT / 4 + 0.009,
                    0.021, 0.28 if sixteenth % 8 == 3 else -0.27)
        if bar % 2 == 1:
            add(drums, rim(), at + 2.75 * BEAT, 0.035, 0.20)
            add(drums, rim(), at + 3.75 * BEAT, 0.025, -0.18)

    # Offbeat chord stabs alternate width while a quiet downbeat establishes key.
    chord_hits = [(0, 0.38, 0.041), (0.75, 0.28, 0.047),
                  (2, 0.38, 0.041), (2.75, 0.28, 0.050), (3.5, 0.28, 0.037)]
    if stripped:
        chord_hits = [(0, 0.40, 0.042), (2.75, 0.27, 0.046)]
    if final_bar:
        chord_hits = [(0, 0.80, 0.055), (1, 1.0, 0.046)]
    for beat, length, level in chord_hits:
        for i, note in enumerate(voicings[ci]):
            add(chords_bus, keys(note, length), at + beat * BEAT,
                level * (1.08 if colour_section else 1), (i - 2) * 0.19)

    # Root / octave / fifth make a small, funky answer to each melodic phrase.
    bass_hits = [(0, 0, 0.21), (0.75, 12, 0.18), (1.5, 0, 0.24),
                 (2.25, 7, 0.19), (2.75, 12, 0.15), (3.5, 0, 0.21)]
    if stripped:
        bass_hits = [(0, 0, 0.26), (2.75, 7, 0.21), (3.5, 12, 0.19)]
    if final_bar:
        bass_hits = [(0, 0, 0.45), (1, 0, 0.90)]
    for beat, interval, length in bass_hits:
        add(low, bass(roots[ci] + interval, length), at + beat * BEAT,
            0.17 if final_bar else 0.185)

    phrase = motifs[ci]
    if stripped:
        phrase = [phrase[0], phrase[2], phrase[-1]]
    if bar in (8, 9):
        phrase = [phrase[0], phrase[1], phrase[3], phrase[-1]]
    if final_bar:
        phrase = [(0, 76), (0.5, 74), (1, 72)]
    for i, (beat, note) in enumerate(phrase):
        length = 0.80 if final_bar and beat == 1 else 0.28
        add(lead_bus, lead(note, length), at + beat * BEAT,
            0.092 if colour_section or bar in (0, 10, 11) else 0.078,
            (-0.12, 0.12, 0.02)[i % 3])

    # Very short fills announce changes, never a large riser or EDM drop.
    if bar in (3, 4, 7, 9, 12):
        add(fx, transition(0.27), at + 1.72, 0.034, -0.20)
        add(drums, rim(), at + 1.75, 0.040, -0.10)
        add(drums, rim(), at + 1.875, 0.032, 0.10)

# A restrained signature flourish at 10 and 20 seconds ties musical chapters.
for at in (10.0, 20.0):
    for i, note in enumerate((72, 76, 79)):
        add(lead_bus, lead(note, 0.34), at + 0.0625 * i, 0.031, (i - 1) * 0.21)

# A compact eighth-note stereo echo gives the hook presence, without an ambient
# wash. The keys receive a tiny room only; the drums and bass stay focused.
for delay, gain in ((0.25, 0.14), (0.5, 0.050)):
    count = round(delay * SR)
    fx[count:] += lead_bus[:-count, ::-1] * gain
for delay, gain in ((0.041, 0.045), (0.073, 0.038), (0.111, 0.025)):
    count = round(delay * SR)
    fx[count:] += chords_bus[:-count, ::-1] * gain

# A modest kick-linked dip separates the groove rather than audibly pumping.
duck = np.ones(N)
for at in kick_times:
    start = round(at * SR)
    length = min(round(0.19 * SR), N - start)
    t = np.arange(length) / SR
    dip = 1 - 0.22 * np.exp(-t / 0.072)
    duck[start:start + length] = np.minimum(duck[start:start + length], dip)
mix = drums + (low + chords_bus) * duck[:, None] + lead_bus + fx
mix -= np.mean(mix, axis=0)

# Gentle bus saturation lowers crest factor and makes the 120 BPM cue feel
# present at normal listening levels. No hard clipping or brick-wall transients.
mix = np.tanh(mix * 1.45) / 1.45
a = round(0.025 * SR)
r = round(0.32 * SR)
mix[:a] *= (np.sin(np.linspace(0, np.pi / 2, a)) ** 2)[:, None]
mix[-r:] *= (np.sin(np.linspace(np.pi / 2, 0, r)) ** 2)[:, None]
peak = np.max(np.abs(mix))
rms = np.sqrt(np.mean(mix ** 2))
target = 10 ** (-15.0 / 20)
ceiling = 10 ** (-1.1 / 20)
mix *= min(target / rms, ceiling / peak)

project = Path(__file__).resolve().parents[2]
out = project / "video" / "public" / "audio" / "furfolio-upbeat-v2.wav"
out.parent.mkdir(parents=True, exist_ok=True)
pcm = np.rint(mix * 32767).astype("<i2")
with wave.open(str(out), "wb") as stream:
    stream.setnchannels(2)
    stream.setsampwidth(2)
    stream.setframerate(SR)
    stream.writeframes(pcm.tobytes())


def db(value):
    return round(20 * math.log10(max(float(value), 1e-12)), 2)


metrics = {
    "file": str(out),
    "title": "Furfolio / Colour in Motion - V2",
    "original_synthesis": True,
    "samples_or_external_music": False,
    "duration_seconds": len(pcm) / SR,
    "sample_rate": SR,
    "channels": 2,
    "bit_depth": 16,
    "bpm": BPM,
    "seconds_per_beat": BEAT,
    "peak_dbfs": db(np.max(np.abs(mix))),
    "rms_dbfs": db(np.sqrt(np.mean(mix ** 2))),
    "crest_factor_db": round(db(np.max(np.abs(mix))) - db(np.sqrt(np.mean(mix ** 2))), 2),
    "clipped_samples": int(np.sum(np.abs(mix) >= 1)),
    "dc_offset": np.mean(mix, axis=0).round(9).tolist(),
    "stereo_correlation": round(float(np.corrcoef(mix.T)[0, 1]), 4),
    "first_sample": pcm[0].tolist(),
    "last_sample": pcm[-1].tolist(),
    "beat_edit_points_seconds": [round(t * BEAT, 2) for t in range(60)],
    "colour_section_edit_points_seconds": [round(10 + t * BEAT, 2) for t in range(13)],
    "section_rms_dbfs": {
        f"{start}-{end}": db(np.sqrt(np.mean(mix[round(start * SR):round(end * SR)] ** 2)))
        for start, end in ((0, 2), (2, 8), (8, 10), (10, 16), (16, 20), (20, 26), (26, 28), (28, 30))
    },
    "arrangement": [
        {"seconds": [0, 2], "description": "Immediate original melody and beat"},
        {"seconds": [2, 8], "description": "Full springy bass, bright chord stabs and dry clap groove"},
        {"seconds": [8, 10], "description": "One-bar rhythmic breath and short pickup"},
        {"seconds": [10, 16], "description": "Colour sprint with strong half-second edit points"},
        {"seconds": [16, 20], "description": "Slightly more space while preserving the pulse"},
        {"seconds": [20, 28], "description": "Return of full groove and signature hook"},
        {"seconds": [28, 30], "description": "Short resolving cadence and clean tail"},
    ],
}
metrics_path = project / "outputs" / "promo-video" / "music-v2" / "audio-metrics.json"
metrics_path.parent.mkdir(parents=True, exist_ok=True)
metrics_path.write_text(json.dumps(metrics, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
print(json.dumps(metrics, ensure_ascii=False, indent=2))
