#!/bin/bash
source .travis.env.sh

echo Building kapture $TAG

docker login -u="$DOCKER_USER" -p="$DOCKER_PASSWORD"

docker build -t kalisio/kapture:$TAG .

docker push kalisio/kapture:$TAG
