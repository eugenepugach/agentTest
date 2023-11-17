FROM --platform=$BUILDPLATFORM node:20.9.0-alpine3.18.4

ENV PYTHONUNBUFFERED=1
RUN apk add --update --no-cache python3 && ln -sf python3 /usr/bin/python
RUN python3 -m ensurepip
RUN pip3 install --no-cache --upgrade pip setuptools
RUN apk add g++ && apk add make

RUN apk add --no-cache bash
RUN apk add --no-cache git

COPY --chown=node:node docker-entrypoint.sh /home/node/docker-entrypoint.sh
RUN chmod u+x /home/node/docker-entrypoint.sh

USER node

ENTRYPOINT ["/home/node/docker-entrypoint.sh"]

WORKDIR /home/node/app

COPY --chown=node:node . .

RUN npm ci --only=production

ENV NODE_ENV=production

EXPOSE 3000
CMD ["npm", "start"]
