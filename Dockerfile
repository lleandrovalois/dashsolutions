FROM nginx:alpine

# Remove configuração padrão do Nginx
RUN rm -rf /etc/nginx/conf.d/* /usr/share/nginx/html/*

# Copia configuração customizada
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copia arquivos estáticos da aplicação
COPY index.html /usr/share/nginx/html/
COPY style.css /usr/share/nginx/html/
COPY script.js /usr/share/nginx/html/
COPY theme.json /usr/share/nginx/html/
COPY portfolio.json /usr/share/nginx/html/
COPY content.json /usr/share/nginx/html/
COPY assets/ /usr/share/nginx/html/assets/

# Expõe a porta 80
EXPOSE 80

# Inicia o Nginx
CMD ["nginx", "-g", "daemon off;"]
