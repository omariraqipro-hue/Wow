FROM node:22-slim
RUN apt-get update \
 && apt-get install -y --no-install-recommends ffmpeg espeak-ng python3-pip fonts-dejavu-core \
 && pip3 install --no-cache-dir --break-system-packages edge-tts \
 && rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY . .
CMD ["node", "server.js"]
