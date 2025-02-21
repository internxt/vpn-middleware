FROM node:22.13.1-alpine

WORKDIR /usr/app

COPY package.json ./
COPY yarn.lock ./

# Copy .npmrc file if it exists
RUN [ -f .npmrc ] && cp .npmrc /usr/app/ || echo "npmrc file not found"

RUN yarn
COPY . ./

RUN yarn build

CMD yarn migrate && yarn start:dev
