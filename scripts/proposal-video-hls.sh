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
# fMP4 segments (.m4s) rather than MPEG-TS (.ts), so code tools never mistake them for TypeScript.
ffmpeg -hide_banner -loglevel error -i "$src" -c copy -f hls -hls_time 6 -hls_playlist_type vod \
  -hls_segment_type fmp4 -hls_fmp4_init_filename init.mp4 \
  -hls_segment_filename "$out/seg_%03d.m4s" "$out/index.m3u8"
echo "wrote $out/index.m3u8 ($(ls "$out" | grep -c '\.m4s$') segments)"
