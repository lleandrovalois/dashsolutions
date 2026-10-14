FROM node:20-alpine

WORKDIR /app

# Copia arquivos da aplicação
COPY package*.json ./
COPY . .

# Define porta padrão para 80 dentro do container
ENV PORT=80
EXPOSE 80

# Inicia o servidor Node.js
CMD ["node", "server.js"]
