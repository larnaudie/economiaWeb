import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootPath = path.resolve(__dirname, "..");
const distPath = path.join(rootPath, "frontend", "dist");
const publicPath = path.join(rootPath, "public");

const copyIfExists = (source, target) => {
  if (!fs.existsSync(source)) {
    return;
  }

  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.cpSync(source, target, { recursive: true, force: true });
};

if (!fs.existsSync(path.join(distPath, "index.html"))) {
  throw new Error("No existe frontend/dist/index.html. Ejecuta primero el build de Vite.");
}

copyIfExists(path.join(distPath, "assets"), path.join(publicPath, "assets"));
copyIfExists(path.join(distPath, "favicon.svg"), path.join(publicPath, "favicon.svg"));
copyIfExists(path.join(distPath, "icons.svg"), path.join(publicPath, "icons.svg"));
