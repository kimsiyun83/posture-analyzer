import { FilesetResolver, PoseLandmarker } from "@mediapipe/tasks-vision";

let landmarkerPromise: Promise<PoseLandmarker> | null = null;

export function getPoseLandmarker(): Promise<PoseLandmarker> {
  if (!landmarkerPromise) {
    landmarkerPromise = (async () => {
      const vision = await FilesetResolver.forVisionTasks("/mediapipe/wasm");
      const create = (delegate: "GPU" | "CPU") => PoseLandmarker.createFromOptions(vision, {
        baseOptions: {
          modelAssetPath:
            "https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_full/float16/latest/pose_landmarker_full.task",
          delegate,
        },
        runningMode: "IMAGE",
        numPoses: 2,
      });
      try {
        return await create("GPU");
      } catch {
        // WebGL is unavailable on some mobile browsers; keep image analysis usable.
        return await create("CPU");
      }
    })().catch((error) => { landmarkerPromise = null; throw error; });
  }
  return landmarkerPromise;
}
