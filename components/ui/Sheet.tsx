"use client";

import type { ReactNode } from "react";
import { Modal } from "@/components/ui/Modal";

export type SheetProps = {
  open: boolean;
  title: string;
  children: ReactNode;
  onOpenChange: (open: boolean) => void;
};

export function Sheet(props: SheetProps) {
  return <Modal {...props} className="fixed bottom-0 right-0 top-0 max-w-md rounded-none border-y-0 border-r-0" />;
}
