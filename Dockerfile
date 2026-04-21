FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --omit=dev

COPY server.js .
COPY service-page.html .
COPY gmailDots.js .
COPY email-service.js .
COPY lib ./lib

EXPOSE 8080

CMD ["node", "server.js"]
