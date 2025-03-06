#!/usr/bin/env bash
set -euo pipefail
# set -x

THIS_FILE=$(readlink -f "${BASH_SOURCE[0]}")
THIS_DIR=$(dirname "$THIS_FILE")
ROOT_DIR=$(dirname "$THIS_DIR")
WORKSPACE_DIR="$(dirname "$ROOT_DIR")"

. "$THIS_DIR/kash/kash.sh"

## Copy to S3
##

echo "Installing rclone..."
sudo apt-get update -y
sudo apt-get install -y rclone
echo "rclone version :"
rclone --version

TIMESTAMP=$(date +%Y%m%d-%H%M)
load_env_files "$WORKSPACE_DIR/development/rclone.enc.conf"
ls "$WORKSPACE_DIR"
cat "$WORKSPACE_DIR/development/rclone.dec.conf"
ls "$WORKSPACE_DIR/development"
echo "Copy to S3..."
rclone --config="$WORKSPACE_DIR/development/rclone.dec.conf" copy "./test/run" "ovh:/kapture/$TIMESTAMP" --no-check-certificate