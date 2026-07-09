"use client";

import { useEffect } from "react";
import type { DrawoverInstance } from "drawover";

export function DrawoverBootstrap() {
  useEffect(() => {
    let instance: DrawoverInstance | undefined;

    if (
      process.env.NODE_ENV !== "production" ||
      process.env.NEXT_PUBLIC_DRAWOVER === "true"
    ) {
      void import("drawover").then(({ init }) => {
        instance = init();
      });
    }

    return () => instance?.destroy();
  }, []);

  return null;
}
