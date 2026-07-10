"use client";

import { useEffect } from "react";
import type { DrawoverInstance } from "drawover";

export function DrawoverBootstrap() {
  useEffect(() => {
    let cancelled = false;
    let instance: DrawoverInstance | undefined;

    if (
      process.env.NODE_ENV !== "production" ||
      process.env.NEXT_PUBLIC_DRAWOVER === "true"
    ) {
      void import("drawover").then(({ init }) => {
        const mounted = init();
        if (cancelled) mounted.destroy();
        else instance = mounted;
      });
    }

    return () => {
      cancelled = true;
      instance?.destroy();
    };
  }, []);

  return null;
}
