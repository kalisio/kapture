#!/bin/bash

NAME=`yq e '.name' chart/Chart.yaml`
VERSION=`yq e '.version' chart/Chart.yaml`

cp -R chart $NAME

helm lint $NAME
helm dep update $NAME
helm package $NAME

mkdir -p $HOME/.config/rclone
envsubst < rclone.conf.tpl > $HOME/.config/rclone/rclone.conf



rclone copy --progress $NAME-$VERSION.tgz artifacts-host:/kalisio-artifacts/charts
