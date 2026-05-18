import * as faceapi from "face-api.js";

let modelsLoaded = false;

/**
 * Load face-api.js models from /models directory.
 * Only loads once; subsequent calls are no-ops.
 */
export async function loadModels(): Promise<void> {
    if (modelsLoaded) return;

    const MODEL_URL = "/models";

    await Promise.all([
        faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
        faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
        faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL),
    ]);

    modelsLoaded = true;
}

/**
 * Detect a single face in the given video element and return
 * the 128-dimensional face descriptor as a number array.
 *
 * Returns null if no face is detected.
 */
export async function detectFace(
    video: HTMLVideoElement
): Promise<number[] | null> {
    const detection = await faceapi
        .detectSingleFace(video, new faceapi.TinyFaceDetectorOptions())
        .withFaceLandmarks()
        .withFaceDescriptor();

    if (!detection) return null;

    // Convert Float32Array to plain number[]
    return Array.from(detection.descriptor);
}

export { faceapi };
