FROM node:22.13.1-alpine
LABEL author="internxt"

WORKDIR /usr/app

COPY package.json ./
COPY yarn.lock ./

RUN yarn
COPY . ./

RUN yarn build

CMD yarn start:prod

EXPOSE 8082
EXPOSE 3005
