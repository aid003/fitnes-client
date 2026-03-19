import { BrowserMultiFormatReader } from "@zxing/browser";
import {
  BarcodeFormat,
  ChecksumException,
  DecodeHintType,
  FormatException,
  NotFoundException,
} from "@zxing/library";

type BarcodeDetectorLike = {
  detect(source: ImageBitmapSource): Promise<Array<{ rawValue?: string }>>;
};

type BarcodeDetectorCtor = {
  new (options: { formats: string[] }): BarcodeDetectorLike;
  getSupportedFormats?: () => Promise<string[]>;
};

declare global {
  interface Window {
    BarcodeDetector?: BarcodeDetectorCtor;
  }
}

export type QrScannerFailureKind =
  | "permission_blocked"
  | "unsupported_camera"
  | "decode_error";

export type QrScannerSession = {
  engine: "barcode-detector" | "zxing";
  stop: () => void;
};

type StartQrScannerOptions = {
  videoElement: HTMLVideoElement;
  onDecode: (content: string) => void;
  onFailure: (kind: QrScannerFailureKind, message: string) => void;
};

const QR_CAMERA_CONSTRAINTS: MediaStreamConstraints = {
  video: {
    facingMode: { ideal: "environment" },
  },
  audio: false,
};

export async function startQrScanner({
  videoElement,
  onDecode,
  onFailure,
}: StartQrScannerOptions): Promise<QrScannerSession> {
  if (!navigator.mediaDevices?.getUserMedia) {
    throw createScannerError(
      "unsupported_camera",
      "Браузер не поддерживает доступ к камере. Откройте админку в Safari или Chrome по HTTPS.",
    );
  }

  let stream: MediaStream | null = null;
  let controlsStop: (() => void) | null = null;
  let frameId: number | null = null;
  let stopped = false;
  let didDecode = false;
  const stop = () => {
    if (stopped) {
      return;
    }

    stopped = true;

    if (frameId !== null) {
      window.cancelAnimationFrame(frameId);
      frameId = null;
    }

    try {
      controlsStop?.();
    } catch {
      // Ignore cleanup failures from external scanner controls.
    }

    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
      stream = null;
    }

    videoElement.srcObject = null;
  };

  const handleDecode = (content: string) => {
    const normalizedContent = content.trim();

    if (!normalizedContent || stopped || didDecode) {
      return;
    }

    didDecode = true;
    stop();
    onDecode(normalizedContent);
  };

  try {
    stream = await navigator.mediaDevices.getUserMedia(QR_CAMERA_CONSTRAINTS);
    videoElement.srcObject = stream;
    await videoElement.play();

    if (await canUseBarcodeDetectorFastPath()) {
      const detector = new window.BarcodeDetector({ formats: ["qr_code"] });

      const scanFrame = async () => {
        if (stopped || didDecode) {
          return;
        }

        if (videoElement.readyState < HTMLMediaElement.HAVE_CURRENT_DATA) {
          frameId = window.requestAnimationFrame(() => {
            void scanFrame();
          });
          return;
        }

        try {
          const codes = await detector.detect(videoElement);
          const rawValue = codes[0]?.rawValue;

          if (rawValue) {
            handleDecode(rawValue);
            return;
          }
        } catch (error) {
          stop();
          onFailure(
            "decode_error",
            getReadableScannerError(error, "Не удалось распознать QR-код с камеры."),
          );
          return;
        }

        frameId = window.requestAnimationFrame(() => {
          void scanFrame();
        });
      };

      frameId = window.requestAnimationFrame(() => {
        void scanFrame();
      });

      return {
        engine: "barcode-detector",
        stop,
      };
    }

    const reader = new BrowserMultiFormatReader(
      new Map([[DecodeHintType.POSSIBLE_FORMATS, [BarcodeFormat.QR_CODE]]]),
    );

    const controls = await reader.decodeFromStream(stream, videoElement, (result, error) => {
      if (result) {
        handleDecode(result.getText());
        return;
      }

      if (!error || isExpectedDecodeMiss(error) || stopped) {
        return;
      }

      stop();
      onFailure(
        "decode_error",
        getReadableScannerError(error, "Не удалось распознать QR-код с камеры."),
      );
    });

    controlsStop = controls.stop;

    return {
      engine: "zxing",
      stop,
    };
  } catch (error) {
    stop();

    if (isScannerError(error)) {
      throw error;
    }

    throw createScannerError(
      getFailureKindFromMediaError(error),
      getReadableScannerError(error, "Не удалось запустить камеру."),
    );
  }
}

async function canUseBarcodeDetectorFastPath() {
  if (!window.BarcodeDetector || isLikelySafari()) {
    return false;
  }

  const supportedFormats = await window.BarcodeDetector.getSupportedFormats?.();

  return !supportedFormats || supportedFormats.includes("qr_code");
}

function isLikelySafari() {
  const userAgent = navigator.userAgent;

  return /Safari/i.test(userAgent) && !/Chrome|CriOS|Edg|OPR|FxiOS|SamsungBrowser/i.test(userAgent);
}

function isExpectedDecodeMiss(error: unknown) {
  return (
    error instanceof NotFoundException ||
    error instanceof ChecksumException ||
    error instanceof FormatException
  );
}

function getFailureKindFromMediaError(error: unknown): QrScannerFailureKind {
  if (!(error instanceof DOMException)) {
    return "decode_error";
  }

  if (
    error.name === "NotAllowedError" ||
    error.name === "PermissionDeniedError" ||
    error.name === "SecurityError"
  ) {
    return "permission_blocked";
  }

  if (
    error.name === "NotFoundError" ||
    error.name === "DevicesNotFoundError" ||
    error.name === "OverconstrainedError" ||
    error.name === "NotSupportedError"
  ) {
    return "unsupported_camera";
  }

  return "decode_error";
}

function getReadableScannerError(error: unknown, fallbackMessage: string) {
  if (error instanceof Error && error.message) {
    return error.message;
  }

  return fallbackMessage;
}

function createScannerError(kind: QrScannerFailureKind, message: string) {
  return Object.assign(new Error(message), { kind });
}

function isScannerError(error: unknown): error is Error & { kind: QrScannerFailureKind } {
  return error instanceof Error && "kind" in error;
}
