import { useEffect } from "react";

import { initRippleEffect } from "./initRippleEffect";

export function useRippleEffect() {
  useEffect(() => {
    return initRippleEffect();
  }, []);
}
