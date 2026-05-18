import QRCode from "qrcode";

/**
 * Generate a QR code as a data URL (PNG base64) from a string value.
 */
export async function generateQRCode(value: string): Promise<string> {
    const dataUrl = await QRCode.toDataURL(value, {
        width: 300,
        margin: 2,
        color: {
            dark: "#000000",
            light: "#ffffff",
        },
        errorCorrectionLevel: "H",
    });
    return dataUrl;
}
