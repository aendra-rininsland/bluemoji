FROM node:lts

WORKDIR /server

COPY ./package.* /server

RUN npm install

COPY ./lib /server/lib

CMD ["npm", "start"]