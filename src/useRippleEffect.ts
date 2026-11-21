import { useEffect } from "react";

import { initRippleEffect } from "./initRippleEffect.js";

export function useRippleEffect() {
  useEffect(() => {
    return initRippleEffect();
  }, []);
}
