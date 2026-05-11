import { useEffect } from "react";

const PIXEL_ID = "2779861135745859";

declare global {
  interface Window {
    fbq?: any;
    _fbq?: any;
  }
}

const MetaPixel = () => {
  useEffect(() => {
    if (!window.fbq) {
      /* eslint-disable */
      (function (f: any, b: Document, e: string, v: string) {
        if (f.fbq) return;
        const n: any = (f.fbq = function () {
          n.callMethod ? n.callMethod.apply(n, arguments) : n.queue.push(arguments);
        });
        if (!f._fbq) f._fbq = n;
        n.push = n;
        n.loaded = !0;
        n.version = "2.0";
        n.queue = [];
        const t = b.createElement(e) as HTMLScriptElement;
        t.async = !0;
        t.src = v;
        const s = b.getElementsByTagName(e)[0];
        s.parentNode!.insertBefore(t, s);
      })(window, document, "script", "https://connect.facebook.net/en_US/fbevents.js");
      /* eslint-enable */
      window.fbq("init", PIXEL_ID);
    }
    window.fbq("track", "PageView");
  }, []);

  return (
    <noscript>
      <img
        height="1"
        width="1"
        style={{ display: "none" }}
        src={`https://www.facebook.com/tr?id=${PIXEL_ID}&ev=PageView&noscript=1`}
        alt=""
      />
    </noscript>
  );
};

export default MetaPixel;
