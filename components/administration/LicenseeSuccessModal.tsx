import { useEffect, useRef } from "react";
import { gsap } from "gsap";
import { CheckCircle, Copy } from "lucide-react";

type LicenseeSuccessModalProps = {
  open: boolean;
  onClose: () => void;
  licensee: {
    name: string;
    licenseKey: string;
  } | null;
};

export default function LicenseeSuccessModal({
  open,
  onClose,
  licensee,
}: LicenseeSuccessModalProps) {
  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open && modalRef.current) {
      gsap.fromTo(
        modalRef.current,
        { y: 80, opacity: 0 },
        { y: 0, opacity: 1, duration: 0.35, ease: "power2.out" }
      );
    }
  }, [open]);

  const copyToClipboard = async () => {
    if (licensee?.licenseKey) {
      try {
        await navigator.clipboard.writeText(licensee.licenseKey);
        alert("License key copied to clipboard!");
      } catch (err) {
        // Log error for debugging in development
        if (process.env.NODE_ENV === "development") {
          console.error("Failed to copy:", err);
        }
        alert("Failed to copy license key");
      }
    }
  };

  if (!open || !licensee) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
      <div
        ref={modalRef}
        className="bg-white rounded-lg shadow-lg w-full max-w-md p-6 relative"
      >
        <button
          className="absolute top-3 right-3 text-gray-400 hover:text-gray-700"
          onClick={onClose}
          aria-label="Close"
        >
          ×
        </button>

        <div className="text-center">
          <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold mb-2 text-gray-800">
            Licensee Created Successfully!
          </h2>
          <p className="text-gray-600 mb-6">
            <strong>{licensee.name}</strong> has been created with the following
            license key:
          </p>

          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mb-6">
            <div className="flex items-center justify-between">
              <code className="text-lg font-mono text-gray-800 break-all">
                {licensee.licenseKey}
              </code>
              <button
                onClick={copyToClipboard}
                className="ml-2 p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-200 rounded transition-colors"
                title="Copy to clipboard"
              >
                <Copy className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-6">
            <p className="text-sm text-yellow-800">
              <strong>Important:</strong> Please save this license key securely.
              You will need it for license validation.
            </p>
          </div>

          <button
            onClick={onClose}
            className="w-full bg-green-500 hover:bg-green-600 text-white font-bold py-2 px-4 rounded transition-colors"
          >
            Got it!
          </button>
        </div>
      </div>
    </div>
  );
}
