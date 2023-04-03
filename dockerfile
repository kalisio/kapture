# To be able to use Puppeteer in Docker
# https://github.com/puppeteer/puppeteer/blob/main/docs/troubleshooting.md#running-puppeteer-in-docker
# To enable WebGL support in Docker
# https://github.com/flolu/docker-puppeteer-webgl/blob/master/Dockerfile

FROM node:16.13-bullseye-slim as builder
ENV HOME /kapture
COPY . ${HOME}
WORKDIR ${HOME}
RUN yarn

FROM node:16.13-bullseye-slim
LABEL maintainer "<contact@kalisio.xyz>"

RUN export DEBIAN_FRONTEND=noninteractive \
  && apt-get update \
  && apt-get install -y wget gnupg \
  && wget -q -O - https://dl-ssl.google.com/linux/linux_signing_key.pub | apt-key add - \
  && sh -c 'echo "deb [arch=amd64] http://dl.google.com/linux/chrome/deb/ stable main" >> /etc/apt/sources.list.d/google.list' \
  && apt-get update \
  && apt-get install -y \
    google-chrome-stable \
    fonts-ipafont-gothic \
    fonts-wqy-zenhei \
    fonts-thai-tlwg \
    fonts-kacst \
    fonts-freefont-ttf \
    libxss1  \
    xorg \
    xserver-xorg \
    xvfb \
    libx11-dev \
    libxext-dev \
    --no-install-recommends \
  && rm -rf /var/lib/apt/lists/*

EXPOSE 3000
ENV HOME /kapture
COPY --from=builder --chown=node:node ${HOME} ${HOME}
WORKDIR ${HOME}
CMD npm run start
