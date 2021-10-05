FROM zenika/alpine-chrome:with-puppeteer
LABEL maintainer "<contact@kalisio.xyz>"

EXPOSE 3000

ENV HOME /kapture
RUN mkdir ${HOME}

COPY . ${HOME}

WORKDIR ${HOME}

RUN yarn

CMD npm run start

