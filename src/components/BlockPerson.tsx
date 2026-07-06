import { useSpring, animated } from '@react-spring/three';
import { PoseAngles } from '../types';

import { Key } from 'react';

interface BlockPersonProps {
  key?: Key;
  pose: PoseAngles;
  color: string;
  position?: [number, number, number];
  scale?: number;
}

const Box = ({ size, position, rotation, color }: any) => (
  <mesh position={position} rotation={rotation} castShadow receiveShadow>
    <boxGeometry args={size} />
    <meshStandardMaterial 
      color={color} 
      roughness={0.4} 
      metalness={0.5}
    />
  </mesh>
);

export const BlockPerson = ({ pose, color, position = [0, 0, 0], scale = 1 }: BlockPersonProps) => {
  const config = { mass: 1.5, tension: 70, friction: 26, precision: 0.001 };

  const useAnimatedPose = (angles: [number, number, number] | undefined) => {
    const target = angles || [0, 0, 0];
    const { rotation } = useSpring({
      rotation: target,
      config
    });
    return rotation;
  };

  const headRot = useAnimatedPose(pose.head);
  const torsoURot = useAnimatedPose(pose.torso);
  const armLURot = useAnimatedPose(pose.arm_l_upper);
  const armLLRot = useAnimatedPose(pose.arm_l_lower);
  const armRURot = useAnimatedPose(pose.arm_r_upper);
  const armRLRot = useAnimatedPose(pose.arm_r_lower);
  const legLURot = useAnimatedPose(pose.leg_l_upper);
  const legLLRot = useAnimatedPose(pose.leg_l_lower);
  const legRURot = useAnimatedPose(pose.leg_r_upper);
  const legRLRot = useAnimatedPose(pose.leg_r_lower);

  

  
  const getLegDrop = (upperRot, lowerRot) => {
    const th1 = upperRot ? upperRot[0] : 0;
    const th2 = lowerRot ? lowerRot[0] : 0;
    return 0.4 * Math.cos(th1) + 0.4 * Math.cos(th1 + th2);
  };
  const dropL = getLegDrop(pose.leg_l_upper, pose.leg_l_lower);
  const dropR = getLegDrop(pose.leg_r_upper, pose.leg_r_lower);
  const maxDrop = Math.max(dropL, dropR);
  const targetHipY = Math.max(maxDrop, 0.1);
  
  const { hipAnimY } = useSpring({
    hipAnimY: targetHipY,
    config
  });

  const { posAnim } = useSpring({
    posAnim: position,
    config
  });

  return (
    <animated.group position={posAnim as any} scale={[scale, scale, scale]}>
      {/* Lower Torso (Hips) */}
      <animated.group position-y={hipAnimY as any}>
        <Box size={[0.5, 0.3, 0.25]} position={[0, 0.15, 0]} color={color} />
        
        {/* Upper Torso */}
        <animated.group position={[0, 0.3, 0]} rotation={torsoURot as any}>
          <Box size={[0.6, 0.5, 0.3]} position={[0, 0.25, 0]} color={color} />
          
          {/* Head */}
          <animated.group position={[0, 0.5, 0]} rotation={headRot as any}>
            <Box size={[0.3, 0.3, 0.3]} position={[0, 0.2, 0]} color={color} />
            {/* Eye Visor */}
            <Box size={[0.25, 0.05, 0.31]} position={[0, 0.25, 0]} color="#fff" />
          </animated.group>

          {/* Arms */}
          <animated.group position={[-0.35, 0.4, 0]} rotation={armLURot as any}>
            <Box size={[0.15, 0.4, 0.15]} position={[0, -0.2, 0]} color={color} />
            <animated.group position={[0, -0.4, 0]} rotation={armLLRot as any}>
              <Box size={[0.12, 0.3, 0.12]} position={[0, -0.15, 0]} color={color} />
            </animated.group>
          </animated.group>

          <animated.group position={[0.35, 0.4, 0]} rotation={armRURot as any}>
            <Box size={[0.15, 0.4, 0.15]} position={[0, -0.2, 0]} color={color} />
            <animated.group position={[0, -0.4, 0]} rotation={armRLRot as any}>
              <Box size={[0.12, 0.3, 0.12]} position={[0, -0.15, 0]} color={color} />
            </animated.group>
          </animated.group>
        </animated.group>

        {/* Legs */}
        <animated.group position={[-0.15, 0, 0]} rotation={legLURot as any}>
          <Box size={[0.2, 0.4, 0.2]} position={[0, -0.2, 0]} color={color} />
          <animated.group position={[0, -0.4, 0]} rotation={legLLRot as any}>
            <Box size={[0.18, 0.4, 0.18]} position={[0, -0.2, 0]} color={color} />
          </animated.group>
        </animated.group>

        <animated.group position={[0.15, 0, 0]} rotation={legRURot as any}>
          <Box size={[0.2, 0.4, 0.2]} position={[0, -0.2, 0]} color={color} />
          <animated.group position={[0, -0.4, 0]} rotation={legRLRot as any}>
            <Box size={[0.18, 0.4, 0.18]} position={[0, -0.2, 0]} color={color} />
          </animated.group>
        </animated.group>
      </animated.group>
    </animated.group>
  );
};
