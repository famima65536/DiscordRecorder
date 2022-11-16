FROM node:18.12.1-slim

WORKDIR /usr/src/app
COPY package*.json ./
COPY tsconfig.json ./
COPY src ./
RUN apt update
RUN apt install ffmpeg libopus0 python3 -y
RUN npm install
RUN npm run compile
RUN npm install --omit=dev
ENV OUTDIR="/recordings/"
COPY . .
CMD [ "npm", "run", "start" ]