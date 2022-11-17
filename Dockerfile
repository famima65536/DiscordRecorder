FROM alpine:latest as builder

RUN apk add --no-cache nodejs npm make python3 gcc

WORKDIR /discord-recorder
COPY package*.json ./
COPY tsconfig.json ./
COPY src/ ./src/
RUN npm install
RUN npm run compile
RUN npm install --omit=dev
RUN ls src

FROM alpine:latest as runner
WORKDIR /discord-recorder
ADD package*.json ./
COPY --from=builder /discord-recorder/build/ build/
COPY --from=builder /discord-recorder/node_modules node_modules
RUN apk add --no-cache nodejs
VOLUME ["/recordings"]
CMD [ "node", "build/main.js" ]