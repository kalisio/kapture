FROM node:16.10-bullseye-slim
LABEL maintainer "<contact@kalisio.xyz>"

# https://github.com/puppeteer/puppeteer/blob/main/docs/troubleshooting.md#running-puppeteer-in-docker

RUN apt-get update \
  && apt-get install -y wget gnupg \
  && wget -q -O - https://dl-ssl.google.com/linux/linux_signing_key.pub | apt-key add - \
  && sh -c 'echo "deb [arch=amd64] http://dl.google.com/linux/chrome/deb/ stable main" >> /etc/apt/sources.list.d/google.list' \
  && apt-get update \
  && apt-get install -y google-chrome-stable fonts-ipafont-gothic fonts-wqy-zenhei fonts-thai-tlwg fonts-kacst fonts-freefont-ttf libxss1 \
    --no-install-recommends \
  && rm -rf /var/lib/apt/lists/*

EXPOSE 3000

ENV HOME /kapture
RUN mkdir ${HOME}

COPY . ${HOME}

WORKDIR ${HOME}

RUN yarn

CMD npm run start

