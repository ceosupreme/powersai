#!/usr/bin/env bash
# Make the HLS copy of a proposal video so it plays in Safari and on iPhones.
# The site host answers byte-range requests with the whole file, and Safari will not
# play an .mp4 served that way. HLS splits the video into small whole files instead.
#
# Usage: scripts/proposal-video-hls.sh public/proposal-media/<slug>.mp4
# Writes public/proposal-media/<slug>/index.m3u8 plus its segments. The proposal pages
# offer that playlist first and fall back to the .mp4 in browsers without HLS.
set -euo pipefail
src="$1"
out="${src%.mp4}"
rm -rf "$out" && mkdir -p "$out"
ffmpeg -hide_banner -loglevel error -i "$src" -c copy -f hls -hls_time 6 -hls_playlist_type vod \
  -hls_segment_filename "$out/seg_%03d.ts" "$out/index.m3u8"
echo "wrote $out/index.m3u8 ($(ls "$out" | grep -c '\.ts$') segments)"
