import React, { ReactNode, useEffect, useState, useRef } from "react";
import { PHASER_PARENT_ID } from "../utils/constants";

interface StatsUIProps {
  children: ReactNode | ReactNode[];
}

export const ReactRoot: React.FC<StatsUIProps> = ({ children }) => {
  const [rootStyle, setRootStyle] = useState({});
  const uiRootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const phaserParent = document.getElementById(PHASER_PARENT_ID);
    const copySize = () => {
      window.setTimeout(() => {
        if (phaserParent) {
          const phaserCanvas = phaserParent.getElementsByTagName("canvas")[0];
          if (phaserCanvas && uiRootRef.current) {
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

  return <div ref={uiRootRef} className="absolute z-[1]" style={{...rootStyle}}>{children}</div>;
//   return <div ref={uiRootRef} className="absolute z-[1]" style={{...rootStyle, backgroundColor: '#ff69b4'}}>{children}</div>;
};


export default ReactRoot;
