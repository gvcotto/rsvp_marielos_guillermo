export default function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Metodo no permitido" });
  }

  return res.status(501).json({
    error:
      "Generar pases para Apple Wallet o Google Wallet requiere integrar el servicio oficial con credenciales y firma. Configura tu backend y actualiza este endpoint para devolver el archivo correspondiente.",
  });
}
