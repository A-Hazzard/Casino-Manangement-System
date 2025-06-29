import React from "react";
import { Button } from "@/components/ui/button";
import { ArrowLeftIcon } from "@radix-ui/react-icons";
import { useRouter } from "next/navigation";
import type { BackButtonHomeProps } from "@/lib/types/components";

const BackButtonHome: React.FC<BackButtonHomeProps> = () => {
  const router = useRouter();

  const buttonContent = (
    <Button
      variant="outline"
      className="bg-button text-white hover:bg-buttonActive"
      onClick={() => router.push("/")}
    >
      <ArrowLeftIcon className="mr-2 h-4 w-4" /> Back to Home
    </Button>
  );

  return <div className="mt-4 mb-2">{buttonContent}</div>;
};

export default BackButtonHome;
