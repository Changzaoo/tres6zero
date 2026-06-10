#!/usr/bin/env python3
import argparse
import json
import os
import subprocess
import sys


THEME_TONES = {
    "none": None,
    "ambient": 220,
    "party": 440,
    "luxury": 330,
    "wedding": 262,
    "corporate": 196,
    "birthday": 294,
    "viral": 247,
}

AI_EVENT_EFFECT = {
    "wedding": "wedding_soft",
    "corporate": "corporate_sharp",
    "inauguration": "corporate_sharp",
    "store": "corporate_sharp",
    "birthday": "party",
    "club": "neon",
    "graduation": "cinematic",
    "church": "wedding_soft",
}


def chosen_effect(effect, event_type):
    if effect != "ai_auto":
        return effect or "clean"
    return AI_EVENT_EFFECT.get(event_type or "", "cinematic")


def effect_filters(effect):
    effect = effect or "clean"
    filters = {
        "clean": ["eq=contrast=1.05:saturation=1.08:brightness=0.01"],
        "slow_motion": ["setpts=1.35*PTS", "eq=contrast=1.04:saturation=1.08"],
        "speed_ramp": ["setpts=0.82*PTS", "eq=contrast=1.1:saturation=1.18"],
        "cinematic": ["eq=contrast=1.12:saturation=0.95:brightness=-0.02", "unsharp=5:5:0.6"],
        "neon": ["eq=contrast=1.18:saturation=1.55", "hue=s=1.15"],
        "party": ["eq=contrast=1.12:saturation=1.35", "vignette=PI/5"],
        "luxury": ["eq=contrast=1.08:saturation=1.05:gamma=0.95", "unsharp=3:3:0.35"],
        "glitch_flash": ["tblend=all_mode=lighten:all_opacity=0.16", "eq=contrast=1.25:saturation=1.35"],
        "wedding_soft": ["eq=contrast=0.98:saturation=1.05:brightness=0.03", "gblur=sigma=0.25"],
        "corporate_sharp": ["eq=contrast=1.08:saturation=0.92", "unsharp=5:5:0.9"],
    }
    return filters.get(effect, filters["clean"])


def timeline_effect_filters(effect):
    effect = chosen_effect(effect, None)
    filters = {
        "clean": ["eq=contrast=1.05:saturation=1.08:brightness=0.01"],
        "slow_motion": ["eq=contrast=1.04:saturation=1.08"],
        "boomerang": ["eq=contrast=1.08:saturation=1.12"],
        "speed_ramp": ["eq=contrast=1.1:saturation=1.18"],
        "cinematic": ["eq=contrast=1.12:saturation=0.95:brightness=-0.02", "unsharp=5:5:0.6"],
        "neon": ["eq=contrast=1.18:saturation=1.55", "hue=s=1.15"],
        "party": ["eq=contrast=1.12:saturation=1.35", "vignette=PI/5"],
        "luxury": ["eq=contrast=1.08:saturation=1.05:gamma=0.95", "unsharp=3:3:0.35"],
        "glitch_flash": ["eq=contrast=1.25:saturation=1.35"],
        "wedding_soft": ["eq=contrast=0.98:saturation=1.05:brightness=0.03", "gblur=sigma=0.25"],
        "corporate_sharp": ["eq=contrast=1.08:saturation=0.92", "unsharp=5:5:0.9"],
    }
    return filters.get(effect, filters["clean"])


def with_enable(filter_spec, start, end):
    return f"{filter_spec}:enable='between(t,{start:.3f},{end:.3f})'"


def parse_effect_segments(raw, duration_seconds=None):
    if not raw:
        return []

    try:
        payload = json.loads(raw)
    except Exception:
        return []

    max_time = float(duration_seconds or 45)
    segments = []
    for item in payload if isinstance(payload, list) else []:
        try:
            effect = str(item.get("effect") or "clean")
            start = max(0.0, min(float(item.get("start", 0)), max_time))
            end = max(0.0, min(float(item.get("end", max_time)), max_time))
        except Exception:
            continue

        if end - start >= 0.05:
            segments.append({"effect": effect, "start": start, "end": end})

    return segments[:8]


def segment_filters(effect_segments):
    filters = []
    for segment in effect_segments or []:
        filters.extend([
            with_enable(filter_spec, segment["start"], segment["end"])
            for filter_spec in timeline_effect_filters(segment["effect"])
        ])
    return filters


def build_graph(effect, has_overlay, animated_overlay=False, effect_segments=None, duration_seconds=None):
    base_effect = chosen_effect(effect, None)
    base_filters = effect_filters(base_effect)
    timed_filters = segment_filters(effect_segments)

    if base_effect == "boomerang":
        # Com duração alvo conhecida, a ida usa metade dela: ida + volta preenchem o
        # tempo exato e o clipe termina de volta no primeiro frame, sem corte brusco
        # (sem o trim, o "-t" final decepava a volta no meio).
        head = "[0:v]scale=trunc(iw/2)*2:trunc(ih/2)*2"
        if duration_seconds:
            head += f",trim=duration={duration_seconds / 2:.3f},setpts=PTS-STARTPTS"
        graph = (
            f"{head},split[v1][v2];"
            "[v2]reverse[v2r];"
            f"[v1][v2r]concat=n=2:v=1:a=0,fps=30,{','.join(timed_filters + ['format=yuv420p'])}[base]"
        )
    else:
        graph = f"[0:v]{','.join(base_filters + timed_filters)},scale=trunc(iw/2)*2:trunc(ih/2)*2,fps=30,format=yuv420p[base]"

    if has_overlay:
        overlay_options = "format=auto:eof_action=repeat"
        if animated_overlay:
            overlay_options += ":shortest=1"
        graph += (
            ";[1:v]format=rgba[overlay_src];"
            "[overlay_src][base]scale2ref=w=main_w:h=main_h:flags=lanczos[ov][video];"
            f"[video][ov]overlay=0:0:{overlay_options}[v]"
        )
    else:
        graph += ";[base]null[v]"

    return graph


def run(cmd):
    proc = subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
    if proc.returncode != 0:
        print(proc.stderr, file=sys.stderr)
        raise SystemExit(proc.returncode)
    return proc


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--input", required=True)
    parser.add_argument("--output", required=True)
    parser.add_argument("--effect", default="clean")
    parser.add_argument("--overlay")
    parser.add_argument("--music-theme", default="none")
    parser.add_argument("--music-file")
    parser.add_argument("--event-type", default="")
    parser.add_argument("--ffmpeg", default="ffmpeg")
    parser.add_argument("--duration-seconds", type=float, default=0)
    parser.add_argument("--effect-segments", default="")
    args = parser.parse_args()

    effect = chosen_effect(args.effect, args.event_type)
    duration_seconds = args.duration_seconds if args.duration_seconds and args.duration_seconds > 0 else None
    effect_segments = parse_effect_segments(args.effect_segments, duration_seconds)
    overlay_ext = os.path.splitext(args.overlay.lower())[1] if args.overlay else ""
    animated_overlay = overlay_ext in [".webm", ".mp4", ".mov", ".gif"]
    graph = build_graph(effect, bool(args.overlay), animated_overlay, effect_segments, duration_seconds)
    cmd = [args.ffmpeg, "-y", "-i", args.input]

    if args.overlay:
        if animated_overlay:
            cmd += ["-stream_loop", "-1"]
        if overlay_ext == ".webm":
            cmd += ["-c:v", "libvpx-vp9"]
        cmd += ["-i", args.overlay]

    audio_index = None
    if args.music_file:
        audio_index = 2 if args.overlay else 1
        cmd += ["-stream_loop", "-1", "-i", args.music_file]
    else:
        tone = THEME_TONES.get(args.music_theme, THEME_TONES["ambient"])
        if tone:
            audio_index = 2 if args.overlay else 1
            cmd += ["-f", "lavfi", "-i", f"sine=frequency={tone}:sample_rate=44100"]

    cmd += ["-filter_complex", graph, "-map", "[v]"]

    if audio_index is not None:
        cmd += ["-map", f"{audio_index}:a", "-shortest", "-c:a", "aac", "-b:a", "128k"]
    else:
        cmd += ["-an"]

    if duration_seconds:
        cmd += ["-t", f"{duration_seconds:.3f}"]

    cmd += ["-c:v", "libx264", "-preset", "veryfast", "-crf", "23", "-movflags", "+faststart", args.output]
    run(cmd)

    print(json.dumps({"effect": effect, "musicTheme": args.music_theme, "effectSegments": effect_segments}))


if __name__ == "__main__":
    main()
