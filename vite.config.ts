import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react-swc";
import tailwindcss from "@tailwindcss/vite";
import path from "path";
import fs from "fs";
import type { IncomingMessage, ServerResponse } from "http";

function localUploadPlugin() {
  return {
    name: "local-upload-plugin",
    configureServer(server: any) {
      server.middlewares.use(
        "/api-local/upload-sound",
        (req: IncomingMessage, res: ServerResponse) => {
          if (req.method === "POST") {
            const body: Buffer[] = [];
            req.on("data", (chunk) => body.push(chunk));
            req.on("end", () => {
              const buffer = Buffer.concat(body);
              let filename = req.headers["x-file-name"] as string;
              if (!filename) filename = `sound_${Date.now()}.mp3`;
              
              // Evitar path traversal
              filename = filename.replace(/[^a-zA-Z0-9.\-_]/g, "");

              // Asegurar que exista la carpeta
              const dir = path.resolve(__dirname, "public/mp3");
              if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

              const dest = path.resolve(dir, filename);
              fs.writeFileSync(dest, buffer);

              res.setHeader("Content-Type", "application/json");
              res.end(JSON.stringify({ url: `/mp3/${filename}`, filename }));
            });
          } else {
            res.statusCode = 405;
            res.end();
          }
        },
      );

      server.middlewares.use(
        "/api-local/delete-sound",
        (req: IncomingMessage, res: ServerResponse) => {
          if (req.method === "POST") {
            let body = "";
            req.on("data", (chunk) => (body += chunk.toString()));
            req.on("end", () => {
              try {
                const { filename } = JSON.parse(body);
                if (filename) {
                  const safeName = filename.replace(/[^a-zA-Z0-9.\-_]/g, "");
                  const dest = path.resolve(__dirname, "public/mp3", safeName);
                  if (fs.existsSync(dest)) fs.unlinkSync(dest);
                }
              } catch (e) {
                // Ignore
              }
              res.setHeader("Content-Type", "application/json");
              res.end(JSON.stringify({ success: true }));
            });
          } else {
            res.statusCode = 405;
            res.end();
          }
        },
      );
    },
  };
}

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");

  return {
    plugins: [react(), tailwindcss(), localUploadPlugin()],
    server: {
      port: Number(env.VITE_SERVER_PORT) || 3001,
      host: env.VITE_SERVER_HOST === "true",
      allowedHosts: [
        env.VITE_SERVER_ALLOW_CORS || "dominio_produccion.iotlink.cl",
      ],
      proxy: {
        // Rutas del sistema de monitoreo (nanoradar)
        "/api-system": {
          target: env.VITE_API_SYSTEM_PROXY_TARGET,
          changeOrigin: true,
          secure: false,
        },
        // Rutas del backend principal — regex para NO capturar /api-system
        "^/api(?!-system)": {
          target: env.VITE_API_PROXY_TARGET || "http://10.20.7.98:3005",
          changeOrigin: true,
          secure: false,
        },
      },
    },

    resolve: {
      alias: [
        { find: "@/libs", replacement: path.resolve(__dirname, "./libs") },
        { find: "@/apis", replacement: path.resolve(__dirname, "./src/apis") },
        { find: "@", replacement: path.resolve(__dirname, "./src") },
      ],
    },
  };
});
