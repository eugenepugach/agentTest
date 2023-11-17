#!/bin/bash

set -e

rm -rf build && mkdir build

javascript-obfuscator dist --compact true --self-defending true --target 'node' --simplify true --exclude 'node_modules' --output ./build

rsync -ar dist/package.json build/
rsync -ar dist/package-lock.json build/
rsync -ar dist/public build/

cd build

echo 'Please, enter version:'
read -r VERSION_NUMBER;

echo 'Create Git Version? (y/n):'
read -r IS_CREATE_GIT;

if [ "${IS_CREATE_GIT}" == "y" ]; then
  cp ../heroku/app.json ./
  git init && git remote add origin https://github.com/Flosum-Service/Agent.git
  git add . && git checkout -b "${VERSION_NUMBER}" && git commit -m "${VERSION_NUMBER}" && git push origin -u "${VERSION_NUMBER}" -f
  echo "Created Git version ${VERSION_NUMBER}"
  fi

echo 'Create Docker Version? (y/n):'
read -r IS_CREATE_DOCKER;
if [ "${IS_CREATE_DOCKER}" == "y" ]; then
 rm -f app.json
 cp ../docker/Dockerfile ./
 cp ../docker/docker-entrypoint.sh ./
 cp ~/.npmrc ./
 sudo docker buildx build -t flosumhub/agent:"${VERSION_NUMBER}" --platform linux/amd64,linux/arm64,linux/riscv64,linux/ppc64le,\
linux/386,linux/arm/v7,linux/arm/v6,linux/s390x --push .
  echo "Created Docker version ${VERSION_NUMBER}"
  fi
