#!/usr/bin/env python3
import argparse
import json
import subprocess
import sys


THEME_TONES = {
    "none": None,
    "ambient": 220,
    "party": 440,
    "luxury": 330,
    "wedding": 262,
    "corporate": 196,
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


def build_graph(effect, has_overlay):
    base_effect = chosen_effect(effect, None)
    base_filters = effect_filters(base_effect)

    if base_effect == "boomerang":
        graph = (
            "[0:v]scale=trunc(iw/2)*2:trunc(ih/2)*2,split[v1][v2];"
            "[v2]reverse[v2r];"
            "[v1][v2r]concat=n=2:v=1:a=0,fps=30,format=yuv420p[base]"
        )
    else:
        graph = f"[0:v]{','.join(base_filters)},scale=trunc(iw/2)*2:trunc(ih/2)*2,fps=30,format=yuv420p[base]"

    if has_overlay:
        graph += ";[1:v][base]scale2ref=w=iw:h=ih[ov][video];[video][ov]overlay=0:0:format=auto[v]"
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
    args = parser.parse_args()

    effect = chosen_effect(args.effect, args.event_type)
    graph = build_graph(effect, bool(args.overlay))
    cmd = [args.ffmpeg, "-y", "-i", args.input]

    if args.overlay:
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

    cmd += ["-c:v", "libx264", "-preset", "veryfast", "-crf", "23", "-movflags", "+faststart", args.output]
    run(cmd)

    print(json.dumps({"effect": effect, "musicTheme": args.music_theme}))


if __name__ == "__main__":
    main()
