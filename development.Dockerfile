FROM node:22.13.1-alpine

WORKDIR /usr/app

COPY package.json ./
COPY yarn.lock ./

RUN yarn
COPY . ./

RUN yarn build

CMD yarn migrate && yarn start:dev

EXPOSE 8082
EXPOSE 3005
