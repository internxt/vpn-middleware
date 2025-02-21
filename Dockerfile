FROM node:22.13.1-alpine
LABEL author="internxt"

WORKDIR /usr/app

COPY package.json ./
COPY yarn.lock ./

# Copy .npmrc file if it exists
RUN [ -f .npmrc ] && cp .npmrc /usr/app/ || echo "npmrc file not found"

RUN yarn
COPY . ./

RUN yarn build

CMD yarn start:prod
