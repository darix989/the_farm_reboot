import React, { ReactNode, useEffect, useState, useRef } from "react";
import { PHASER_PARENT_ID } from "../utils/constants";

// import { AppState } from "../types";

interface StatsUIProps {
  children: ReactNode | ReactNode[];
//   appState: AppState;
}

export const ReactRoot: React.FC<StatsUIProps> = ({ children }) => {
  const [rootStyle, setRootStyle] = useState({});
  const uiRootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const phaserParent = document.getElementById(PHASER_PARENT_ID);
    const copySize = () => {
      console.log("copySize");
      window.setTimeout(() => {
        if (phaserParent) {
          const phaserCanvas = phaserParent.getElementsByTagName("canvas")[0];
          console.log("phaserCanvas", phaserCanvas);
          if (phaserCanvas && uiRootRef.current) {
            // window.dario = phaserCanvas;
            console.log("copySize", phaserCanvas.style.marginLeft, phaserCanvas.style.marginTop, phaserCanvas.style.height, phaserCanvas.style.width);
            setRootStyle((prev) => ({
              ...prev,
              marginLeft: phaserCanvas.style.marginLeft,
              marginTop: phaserCanvas.style.marginTop,
              height: phaserCanvas.style.height,
              width: phaserCanvas.style.width
            }));
          }
        }
      }, 0);
    };
    window.addEventListener("resize", copySize);
    copySize();
    return () => {
        window.removeEventListener("resize", copySize)
    }
  }, []);

  console.log("rootStyle", rootStyle);

  return <div ref={uiRootRef} className="absolute z-[1]" style={{...rootStyle}}>{children}</div>;
//   return <div ref={uiRootRef} className="absolute z-[1]" style={{...rootStyle, backgroundColor: '#ff69b4'}}>{children}</div>;
};


export default ReactRoot;
