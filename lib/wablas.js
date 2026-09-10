import "server-only";

export async function sendWhatsappMessage({ phone, message }) {
  const wablasToken = process.env.WABLAS_TOKEN?.trim();
  const wablasSecretKey = process.env.WABLAS_SECRET_KEY?.trim();
  const wablasBaseUrl = process.env.WABLAS_BASE_URL?.trim() || "https://tegal.wablas.com";

  if (!wablasToken) {
    throw new Error("WABLAS_TOKEN belum diatur di environment production.");
  }

  const authorizationHeader = wablasSecretKey ? `${wablasToken}.${wablasSecretKey}` : wablasToken;
  const response = await fetch(`${wablasBaseUrl}/api/send-message`, {
    method: "POST",
    headers: {
      Authorization: authorizationHeader,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      phone,
      message,
    }),
  });

  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`Gagal mengirim WhatsApp OTP. ${detail}`);
  }

  return response.json().catch(() => ({ success: true }));
}
