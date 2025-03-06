#!/usr/bin/env bash
#set -euo pipefail
# set -x

THIS_FILE=$(readlink -f "${BASH_SOURCE[0]}")
THIS_DIR=$(dirname "$THIS_FILE")
ROOT_DIR=$(dirname "$THIS_DIR")
WORKSPACE_DIR="$(dirname "$ROOT_DIR")"

. "$THIS_DIR/kash/kash.sh"

## Parse options
##

NODE_VER=20
MONGO_VER=""
CI_STEP_NAME="Run tests"
CODE_COVERAGE=false
while getopts "m:n:cr:" option; do
    case $option in
        n) # defines node version
            NODE_VER=$OPTARG
             ;;
        c) # publish code coverage
            CODE_COVERAGE=true
            ;;
        r) # report outcome to slack
            load_env_files "$WORKSPACE_DIR/development/common/SLACK_WEBHOOK_SERVICES.enc.env"
            CI_STEP_NAME=$OPTARG
            trap 'slack_ci_report "$ROOT_DIR" "$CI_STEP_NAME" "$?" "$SLACK_WEBHOOK_SERVICES"' EXIT
            ;;
        *)
            ;;
    esac
done

## Init workspace
##

. "$WORKSPACE_DIR/development/workspaces/services/services.sh" kapture

# Need to switch from default Kano config which is local dev env
export APP_URL=$APP_DEV_URL
export APP_JWT=$APP_DEV_JWT
export APP_NAME=$APP_NAME

## Run tests
##

run_lib_tests "$ROOT_DIR" "$CODE_COVERAGE" "$NODE_VER" "$MONGO_VER"

## Copy to S3
##

echo "Installing rclone..."
sudo apt-get update -y
sudo apt-get install -y rclone
echo "rclone version :"
rclone --version

TIMESTAMP=$(date +%Y%m%d-%H%M)
load_env_files "$WORKSPACE_DIR/development/rclone.enc.conf"
ls "$WORKSPACE_DIR/development"
echo "Copy to S3..."
rclone --config="$WORKSPACE_DIR/development/rclone.dec.conf" copy "./test/run" "ovh:/kapture/$TIMESTAMP" --no-check-certificate