import React, { useRef, useEffect, Suspense } from 'react';


export default function ThreeDBusGarage({ doorOpen = false, busShake = false, onDoorOpen = () => {} }) {
const doorRef = useRef();
const busRef = useRef();


// door vertical position spring
const { y } = useSpring({ y: doorOpen ? 2.4 : 0, config: { mass: 1, tension: 160, friction: 20 } });


// shake spring (micro-scale jitter)
const { s } = useSpring({ s: busShake ? 1.04 : 1.0, config: { mass: 1, tension: 450, friction: 18 } });


useEffect(() => {
if (doorOpen) {
const id = setTimeout(() => onDoorOpen(), 900);
return () => clearTimeout(id);
}
}, [doorOpen, onDoorOpen]);


const MODEL_URL = '/models/bus.glb'; // ensure public/models/bus.glb exists


return (
<div style={{ width: '100%', height: 360, borderRadius: 12, overflow: 'hidden' }}>
<Canvas camera={{ position: [0, 2.6, 6], fov: 40 }} shadows>
<ambientLight intensity={0.6} />
<directionalLight castShadow position={[5, 10, 5]} intensity={1} shadow-mapSize-width={1024} shadow-mapSize-height={1024} />
<pointLight position={[-10, 6, -10]} intensity={0.4} />


{/* floor */}
<mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.02, 0]} receiveShadow>
<planeGeometry args={[30, 18]} />
<meshStandardMaterial color={'#0b0b0d'} metalness={0.1} roughness={0.85} />
</mesh>


{/* rear wall + neon */}
<mesh position={[0, 1.5, -5]}>
<boxGeometry args={[20, 8, 0.2]} />
<meshStandardMaterial color={'#050507'} />
</mesh>
<mesh position={[0, 1.3, -4.84]}>
<planeGeometry args={[12, 0.28]} />
<meshBasicMaterial color={'#ff0f2b'} toneMapped={false} />
</mesh>


{/* bus (suspended spring scale) */}
<a.group ref={busRef} scale={s} position={[0, 0, 0]} castShadow>
<Suspense fallback={null}>
<BusModel url={MODEL_URL} scale={0.95} shake={busShake} />
</Suspense>
</a.group>


{/* garage door (animated up/down on Z axis) */}
<a.group ref={doorRef} position-z={-5} position-y={y}>
<mesh castShadow>
<boxGeometry args={[16, 5, 0.18]} />
<meshStandardMaterial color={'#0d0d0f'} roughness={0.38} metalness={0.2} />
</mesh>
<mesh position={[0, 0, 0.09]}>
<planeGeometry args={[15.6, 0.2]} />
<meshBasicMaterial color={'#ff2b2b'} toneMapped={false} />
</mesh>
</a.group>


<ContactShadows position={[0, -0.02, 0]} opacity={0.7} width={8} blur={2.4} far={6} />


<Environment preset="night" />


<OrbitControls enablePan={false} enableZoom={false} maxPolarAngle={Math.PI / 2.4} />
</Canvas>
</div>
);
}