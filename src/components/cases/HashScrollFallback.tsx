"use client";

import { useEffect } from "react";

/**
 * Browsers scroll to a URL's #hash on load, but that native behaviour
 * isn't reliable when the hash arrives via a server-side redirect (the old
 * ?steg=saksbehandler URL redirects to ?steg=saksbilde#saksbehandler) --
 * observed to consistently leave the page at the top instead. This is a
 * one-time correction on mount: a no-op if the browser already scrolled
 * there natively, the actual fix when it didn't. scrollIntoView honors
 * each target's own scroll-margin-top, same offset either way.
 *
 * Deferred two animation frames, not called straight in the effect: doing
 * it synchronously landed before the browser's own layout/paint for the
 * just-hydrated page had settled, and silently had no effect. Waiting for
 * two frames reliably lands after that.
 */
export function HashScrollFallback() {
  useEffect(() => {
    const id = window.location.hash.slice(1);
    if (!id) return;
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        document.getElementById(id)?.scrollIntoView({ block: "start" });
      });
    });
  }, []);

  return null;
}
