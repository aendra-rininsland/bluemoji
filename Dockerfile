FROM node:lts


WORKDIR /server

COPY ./server/package.* /server

RUN npm install

COPY ./server/lib /server/lib

CMD ["npm", "start"]