#!/usr/bin/env bash
set -euo pipefail
# set -x

THIS_FILE=$(readlink -f "${BASH_SOURCE[0]}")
THIS_DIR=$(dirname "$THIS_FILE")
ROOT_DIR=$(dirname "$THIS_DIR")
WORKSPACE_DIR="$(dirname "$ROOT_DIR")"

. "$THIS_DIR/kash/kash.sh"

## Parse options
##

begin_group "Setting up workspace ..."

if [ "$CI" != true ]; then
    while getopts "b:t" option; do
        case $option in
            b) # defines branch
                WORKSPACE_BRANCH=$OPTARG;;
            t) # defines tag
                WORKSPACE_TAG=$OPTARG;;
            *)
            ;;
        esac
    done

    shift $((OPTIND-1))
    WORKSPACE_DIR="$1"

    # Clone project in the workspace
    git_shallow_clone "$KALISIO_GITHUB_URL/kalisio/kapture.git" "$WORKSPACE_DIR/kapture" "${WORKSPACE_TAG:-${WORKSPACE_BRANCH:-}}"
fi

setup_workspace "$WORKSPACE_DIR" "$KALISIO_GITHUB_URL/kalisio/development.git"
load_env_files "$WORKSPACE_DIR/development/rclone.enc.conf"
end_group "Setting up workspace ..."
