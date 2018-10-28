FROM node:8.9.1
ENV workdir /app/workdir
WORKDIR ${workdir}
ADD . ${workdir}
RUN npm install
