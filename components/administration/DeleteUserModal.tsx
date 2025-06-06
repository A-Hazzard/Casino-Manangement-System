import { Button } from "@/components/ui/button";
import type { DeleteUserModalProps } from "@/lib/types/administration";
import { X } from "lucide-react";
import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import gsap from "gsap";

export default function DeleteUserModal({
  open,
  user,
  onClose,
  onDelete,
}: DeleteUserModalProps) {
  const modalRef = useRef<HTMLDivElement>(null);
  const backdropRef = useRef<HTMLDivElement>(null);
  const [isMobile, setIsMobile] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const checkIsMobile = () => setIsMobile(window.innerWidth < 768);
    checkIsMobile();
    window.addEventListener("resize", checkIsMobile);
    return () => window.removeEventListener("resize", checkIsMobile);
  }, []);

  useEffect(() => {
    if (open && modalRef.current && backdropRef.current) {
      gsap.fromTo(
        modalRef.current,
        { y: 100, opacity: 0 },
        { y: 0, opacity: 1, duration: 0.4, ease: "power3.out" }
      );
      gsap.fromTo(
        backdropRef.current,
        { opacity: 0 },
        { opacity: 1, duration: 0.3, ease: "power2.out" }
      );
    }
  }, [open]);

  if (!open || !user) return null;

  // Desktop View
  if (!isMobile) {
    return (
      <div className="fixed inset-0 z-50">
        <div
          ref={backdropRef}
          className="absolute inset-0 bg-black/50"
          onClick={onClose}
        />
        <div className="fixed inset-0 flex items-center justify-center p-4">
          <div
            ref={modalRef}
            className="bg-container rounded-md shadow-lg max-w-md w-full"
            style={{ opacity: 0, transform: "translateY(-20px)" }}
          >
            <div className="p-4 border-b border-border">
              <div className="flex justify-between items-center">
                <h2 className="text-xl font-bold text-buttonActive">
                  Delete User
                </h2>
                <Button
                  variant="ghost"
                  onClick={onClose}
                  className="text-grayHighlight hover:bg-buttonInactive/10"
                >
                  <X className="w-5 h-5" />
                </Button>
              </div>
            </div>
            <div className="p-6">
              <div className="text-center">
                <div className="flex justify-center mb-4">
                  <Image
                    src="/deleteIcon.svg"
                    alt="Delete"
                    width={64}
                    height={64}
                  />
                </div>
                <p className="text-lg font-semibold text-grayHighlight mb-4">
                  Are you sure you want to delete user
                  <span className="font-bold text-buttonActive">
                    {" "}
                    {user.username}{" "}
                  </span>
                  ?
                </p>
                <p className="text-sm text-grayHighlight">
                  This action cannot be undone. The user will be permanently
                  removed from the system.
                </p>
              </div>
            </div>
            <div className="p-4 border-t border-border">
              <div className="flex justify-center space-x-4">
                <Button
                  onClick={() => {
                    setLoading(true);
                    onDelete();
                    setLoading(false);
                  }}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  disabled={loading}
                >
                  {loading ? "Deleting..." : "Delete"}
                </Button>
                <Button
                  onClick={onClose}
                  className="bg-buttonInactive text-primary-foreground hover:bg-buttonInactive/90"
                  disabled={loading}
                >
                  Cancel
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Mobile View
  return (
    <div className="fixed inset-0 z-50">
      <div
        ref={backdropRef}
        className="absolute inset-0 bg-black/50"
        onClick={onClose}
      />
      <div
        ref={modalRef}
        className="fixed bottom-0 left-0 right-0 bg-container rounded-t-2xl shadow-lg"
        style={{ transform: "translateY(100%)" }}
      >
        <div className="p-4 border-b border-border">
          <div className="flex justify-between items-center">
            <h2 className="text-2xl font-bold text-buttonActive">
              Delete User
            </h2>
            <Button
              variant="ghost"
              onClick={onClose}
              className="text-grayHighlight hover:bg-buttonInactive/10"
            >
              <X className="w-5 h-5" />
            </Button>
          </div>
        </div>
        <div className="p-6">
          <div className="flex justify-center mb-6">
            <Image src="/deleteIcon.svg" alt="Delete" width={64} height={64} />
          </div>
          <p className="text-lg text-grayHighlight mb-4">
            Are you sure you want to delete user
            <span className="font-bold text-buttonActive">
              {" "}
              {user.username}{" "}
            </span>
            ?
          </p>
          <p className="text-sm text-grayHighlight mb-6">
            This action cannot be undone. The user will be permanently removed
            from the system.
          </p>
        </div>
        <div className="p-4 border-t border-border">
          <div className="flex justify-end space-x-4">
            <Button
              onClick={() => {
                setLoading(true);
                onDelete();
                setLoading(false);
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={loading}
            >
              {loading ? "Deleting..." : "Delete"}
            </Button>
            <Button
              onClick={onClose}
              className="bg-buttonInactive text-primary-foreground hover:bg-buttonInactive/90"
              disabled={loading}
            >
              Cancel
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
