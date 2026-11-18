import { dialog, type BrowserWindow } from "electron";
import { X509Certificate } from "node:crypto";
import { open } from "node:fs/promises";
import path from "node:path";
import { MAX_CERTIFICATE_BYTES, type RedmineCertificate } from "../src/shared/api/desktop";

/** Store public certificates as PEM, independent of the original file's path or encoding. */
export function certificatePem(data: Buffer | string): string {
  if (!data.length || Buffer.byteLength(data) > MAX_CERTIFICATE_BYTES) {
    throw new Error("Размер сертификата должен быть от 1 байта до 1 МБ");
  }
  try {
    const text = data.toString().trim();
    const blocks = text.match(/-----BEGIN CERTIFICATE-----[\s\S]+?-----END CERTIFICATE-----/g);
    if (blocks) {
      if (text.replace(/-----BEGIN CERTIFICATE-----[\s\S]+?-----END CERTIFICATE-----/g, "").trim()) throw new Error();
      const pem = [...new Set(blocks.map((block) => new X509Certificate(block).toString()))].join("\n");
      if (Buffer.byteLength(pem) > MAX_CERTIFICATE_BYTES) throw new Error();
      return pem;
    }
    if (typeof data === "string") throw new Error();
    const certificate = new X509Certificate(data);
    if (!certificate.raw.equals(data)) throw new Error();
    return certificate.toString();
  } catch {
    throw new Error("Не удалось прочитать сертификат. Выберите публичный X.509 сертификат .crt, .cer или .pem (PEM/DER)");
  }
}

export async function chooseCertificate(window: BrowserWindow): Promise<RedmineCertificate | null> {
  const selection = await dialog.showOpenDialog(window, {
    title: "Сертификат Redmine",
    properties: ["openFile"],
    filters: [{ name: "Сертификаты X.509", extensions: ["crt", "cer", "pem"] }],
  });
  if (selection.canceled || !selection.filePaths[0]) return null;
  const filePath = selection.filePaths[0];
  const file = await open(filePath, "r");
  try {
    const info = await file.stat();
    if (!info.isFile() || info.size > MAX_CERTIFICATE_BYTES) throw new Error("Выберите файл сертификата размером не более 1 МБ");
    const buffer = Buffer.alloc(MAX_CERTIFICATE_BYTES + 1);
    let size = 0;
    while (size < buffer.length) {
      const { bytesRead } = await file.read(buffer, size, buffer.length - size, size);
      if (!bytesRead) break;
      size += bytesRead;
    }
    return { name: path.basename(filePath), pem: certificatePem(buffer.subarray(0, size)) };
  } finally { await file.close(); }
}
