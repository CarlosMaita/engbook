# EngBook — PWA de Vocabulario en Inglés

Aplicación Web Progresiva (PWA) fullstack multiusuario para construir el hábito diario de aprender vocabulario en inglés con:

- **Racha diaria y meta configurable** (por defecto 5 acciones/día sumando palabras nuevas y repasos).
- **Flashcards interactivas con Repetición Espaciada (SM-2)**.
- **Estadísticas registradas**: Heatmap estilo GitHub, gráfico de actividad de los últimos 14 días, racha actual, récord histórico y palabras dominadas.
- **Soporte Offline + PWA instalable**: Caché local en IndexedDB y sincronización automática al reconectar.

## Desarrollo Local

Requiere **Node.js 24+** (usa `node:sqlite` integrado sin dependencias nativas).

```bash
# Terminal 1: Backend API (puerto 3001)
cd server
npm install
npm run dev

# Terminal 2: Frontend PWA (puerto 5173 con proxy a /api)
cd client
npm install
npm run dev
```

### Ejecutar pruebas del backend
```bash
cd server
npm test
```

## Despliegue en VPS (`engbook.upsofte.com`)

1. Copia el proyecto a tu VPS y crea el archivo `.env` a partir de `.env.example`:
   ```bash
   cp .env.example .env
   # Edita .env y coloca un JWT_SECRET largo y aleatorio
   ```
2. Levanta el contenedor (compila frontend + backend y persiste SQLite en el volumen `engbook_data`):
   ```bash
   docker compose up -d --build
   ```
3. Configura Nginx y SSL con Certbot usando la plantilla incluida en `deploy/nginx.engbook.upsofte.com.conf`:
   ```bash
   sudo cp deploy/nginx.engbook.upsofte.com.conf /etc/nginx/sites-available/engbook.upsofte.com
   sudo ln -s /etc/nginx/sites-available/engbook.upsofte.com /etc/nginx/sites-enabled/
   sudo nginx -t && sudo systemctl reload nginx
   sudo certbot --nginx -d engbook.upsofte.com
   ```
