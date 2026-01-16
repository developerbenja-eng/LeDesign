/* eslint-disable @typescript-eslint/no-explicit-any */
import '@react-three/fiber';

declare global {
  namespace JSX {
    interface IntrinsicElements {
      primitive: any;
      mesh: any;
      bufferGeometry: any;
      bufferAttribute: any;
      meshStandardMaterial: any;
      meshBasicMaterial: any;
      lineBasicMaterial: any;
      group: any;
      ambientLight: any;
      directionalLight: any;
      axesHelper: any;
      gridHelper: any;
      line: any;
      planeGeometry: any;
      extrudeGeometry: any;
      shapeGeometry: any;
    }
  }
}

export {};
