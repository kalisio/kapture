#!/bin/bash

helm lint chart
helm dep update chart
helm package chart

mkdir -p $HOME/.config/rclone
envsubst < rclone.conf.tpl > $HOME/.config/rclone/rclone.conf

NAME=`yq e '.name' chart/Chart.yaml`
VERSION=`yq e '.version' chart/Chart.yaml`

rclone copy --progress $NAME-$VERSION.tgz artifacts-host:/kalisio-artifacts/charts
