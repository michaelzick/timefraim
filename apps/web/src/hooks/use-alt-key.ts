import { useEffect, useRef, useState } from "react";

export function useAltKey() {
  const [isAltPressed, setIsAltPressed] = useState(false);
  const isAltPressedRef = useRef(false);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.altKey && !isAltPressedRef.current) {
        isAltPressedRef.current = true;
        setIsAltPressed(true);
      }
    };
    const handleKeyUp = (event: KeyboardEvent) => {
      if (!event.altKey && isAltPressedRef.current) {
        isAltPressedRef.current = false;
        setIsAltPressed(false);
      }
    };
    const handleBlur = () => {
      if (isAltPressedRef.current) {
        isAltPressedRef.current = false;
        setIsAltPressed(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    window.addEventListener("blur", handleBlur);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
      window.removeEventListener("blur", handleBlur);
    };
  }, []);

  return { isAltPressed, isAltPressedRef };
}
