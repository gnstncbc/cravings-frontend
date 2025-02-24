# 1. Aşama: Build işlemi için Node.js imajını kullanıyoruz
FROM node:18-alpine AS build
WORKDIR /app

# package.json ve package-lock.json dosyalarını kopyalayarak bağımlılıkları kuruyoruz
COPY package*.json ./
RUN npm install

# Proje dosyalarını kopyalıyoruz (bu aşamada .env dosyanız da kopyalanır ve build sırasında okunur)
COPY . .

# Projeyi üretim için derliyoruz
RUN npm run build

# 2. Aşama: Üretilen statik dosyaları Nginx ile servis etmek
FROM nginx:stable-alpine
# Build aşamasında üretilen dosyaları Nginx'in varsayılan dizinine kopyalıyoruz
COPY --from=build /app/build /usr/share/nginx/html

# Varsayılan Nginx portunu açıyoruz
EXPOSE 80

# Nginx'i başlatıyoruz
CMD ["nginx", "-g", "daemon off;"]
