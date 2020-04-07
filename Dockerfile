FROM node:10.19-buster

ARG VERSION
ENV NODE_ENV production
ENV PORT 3000
ENV VERSION=$VERSION

RUN apt-get update && apt-get install -y ffmpeg

COPY --chown=node:node "." "/home/node/server"

USER node
WORKDIR /home/node/server

RUN touch .env && \
    npm i

ENTRYPOINT [ "node", "./run.js" ]

CMD [ "server" ]
