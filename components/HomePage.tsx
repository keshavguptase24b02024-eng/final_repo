import React, { useEffect, useRef } from 'react';

// Tell TypeScript about the global variables from the CDN scripts
declare var THREE: any;

interface HomePageProps {
  onUploadClick: () => void;
  onManualClick: () => void;
  onUseSampleData: () => void;
  onViewMaps: () => void;
}

const GlobeDisplay: React.FC = () => {
    const mountRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!mountRef.current || typeof THREE === 'undefined') {
            return;
        }
        const currentMount = mountRef.current;

        // Scene
        const scene = new THREE.Scene();

        // Camera
        const camera = new THREE.PerspectiveCamera(45, currentMount.clientWidth / currentMount.clientHeight, 0.1, 1000);
        camera.position.z = 4;

        // Renderer
        const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
        renderer.setSize(currentMount.clientWidth, currentMount.clientHeight);
        renderer.setPixelRatio(window.devicePixelRatio);
        currentMount.appendChild(renderer.domElement);

        // Lighting
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.3);
        scene.add(ambientLight);
        const directionalLight = new THREE.DirectionalLight(0xffffff, 2);
        directionalLight.position.set(5, 3, 5);
        scene.add(directionalLight);
        
        // Texture Loader
        const textureLoader = new THREE.TextureLoader();

        // Earth Mesh
        const earthGeometry = new THREE.SphereGeometry(1.5, 64, 64);
        const earthMaterial = new THREE.MeshPhongMaterial({
            map: textureLoader.load('https://raw.githubusercontent.com/mrdoob/three.js/master/examples/textures/planets/earth_atmos_2048.jpg'),
            specularMap: textureLoader.load('https://raw.githubusercontent.com/mrdoob/three.js/master/examples/textures/planets/earth_specular_2048.jpg'),
            normalMap: textureLoader.load('https://raw.githubusercontent.com/mrdoob/three.js/master/examples/textures/planets/earth_normal_2048.jpg'),
            shininess: 25,
        });
        const earthMesh = new THREE.Mesh(earthGeometry, earthMaterial);
        scene.add(earthMesh);

        // Cloud Mesh
        const cloudGeometry = new THREE.SphereGeometry(1.515, 64, 64);
        const cloudMaterial = new THREE.MeshPhongMaterial({
            map: textureLoader.load('https://raw.githubusercontent.com/mrdoob/three.js/master/examples/textures/planets/earth_clouds.png'),
            transparent: true,
            opacity: 0.8,
            blending: THREE.AdditiveBlending,
        });
        const cloudMesh = new THREE.Mesh(cloudGeometry, cloudMaterial);
        scene.add(cloudMesh);

        // Atmosphere Glow Mesh
        const atmosphereGeometry = new THREE.SphereGeometry(1.5, 64, 64);
        const atmosphereMaterial = new THREE.ShaderMaterial({
            vertexShader: `
                varying vec3 vNormal;
                void main() {
                    vNormal = normalize( normalMatrix * normal );
                    gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
                }
            `,
            fragmentShader: `
                varying vec3 vNormal;
                void main() {
                    float intensity = pow( 0.6 - dot( vNormal, vec3( 0.0, 0.0, 1.0 ) ), 4.0 ); 
                    gl_FragColor = vec4( 0.4, 0.6, 1.0, 1.0 ) * intensity;
                }
            `,
            blending: THREE.AdditiveBlending,
            side: THREE.BackSide,
            transparent: true,
        });
        const atmosphereMesh = new THREE.Mesh(atmosphereGeometry, atmosphereMaterial);
        atmosphereMesh.scale.set(1.15, 1.15, 1.15);
        scene.add(atmosphereMesh);


        // Mouse interaction for subtle rotation
        const targetRotation = { x: 0, y: 0 };
        const onMouseMove = (event: MouseEvent) => {
             targetRotation.y = (event.clientX - window.innerWidth / 2) * 0.0005;
             targetRotation.x = (event.clientY - window.innerHeight / 2) * 0.0005;
        };
        window.addEventListener('mousemove', onMouseMove);

        // Animation loop
        let animationFrameId: number;
        const clock = new THREE.Clock();
        const animate = () => {
            const elapsedTime = clock.getElapsedTime();
            earthMesh.rotation.y = elapsedTime * 0.1;
            cloudMesh.rotation.y = elapsedTime * 0.12;

            // Smoothly interpolate scene rotation towards target
            scene.rotation.x += (targetRotation.x - scene.rotation.x) * 0.05;
            scene.rotation.y += (targetRotation.y - scene.rotation.y) * 0.05;

            renderer.render(scene, camera);
            animationFrameId = requestAnimationFrame(animate);
        };
        animate();

        // Resize handler
        const handleResize = () => {
            if (currentMount) {
                 camera.aspect = currentMount.clientWidth / currentMount.clientHeight;
                 camera.updateProjectionMatrix();
                 renderer.setSize(currentMount.clientWidth, currentMount.clientHeight);
            }
        };
        window.addEventListener('resize', handleResize);

        // Cleanup
        return () => {
            cancelAnimationFrame(animationFrameId);
            window.removeEventListener('resize', handleResize);
            window.removeEventListener('mousemove', onMouseMove);
            if (currentMount && renderer.domElement) {
                currentMount.removeChild(renderer.domElement);
            }
            // Dispose Three.js objects to prevent memory leaks
            scene.children.forEach(child => {
                if (child.geometry) child.geometry.dispose();
                if (child.material) {
                    if (Array.isArray(child.material)) {
                        child.material.forEach(material => material.dispose());
                    } else {
                        child.material.dispose();
                    }
                }
            });
            renderer.dispose();
        };
    }, []);

    return <div ref={mountRef} className="w-full h-full min-h-[32rem] absolute -right-1/4 top-1/2 -translate-y-1/2 opacity-70 md:opacity-100 md:relative md:right-0 md:top-0 md:translate-y-0" />;
};

const HomePage: React.FC<HomePageProps> = ({ onUploadClick, onManualClick, onUseSampleData, onViewMaps }) => {
  return (
    <div className="relative min-h-screen w-full flex items-center justify-center overflow-hidden bg-white">
        <div aria-hidden="true" className="absolute inset-0 z-0">
            <div className="absolute top-0 -left-1/4 w-96 h-96 bg-purple-200 rounded-full mix-blend-multiply filter blur-xl opacity-50 animate-blob"></div>
            <div className="absolute top-0 -right-1/4 w-96 h-96 bg-yellow-200 rounded-full mix-blend-multiply filter blur-xl opacity-50 animate-blob animation-delay-2000"></div>
            <div className="absolute -bottom-1/4 left-1/3 w-96 h-96 bg-pink-200 rounded-full mix-blend-multiply filter blur-xl opacity-50 animate-blob animation-delay-4000"></div>
        </div>
        
        <main className="relative z-10 w-full max-w-screen-xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid lg:grid-cols-2 gap-16 items-center">
                <div className="relative z-20">
                    <h1 className="text-5xl tracking-tight font-extrabold text-slate-900 sm:text-6xl md:text-7xl">
                    Assess Groundwater Quality Instantly
                    </h1>
                    <p className="mt-6 text-xl text-slate-600 max-w-lg">
                    Upload your sample data, select a standard, and get instant heavy metal pollution indices (HPI, HEI, HCI) with AI-driven insights and visualizations.
                    </p>
                    <div className="mt-10">
                        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                            <button
                                onClick={onUploadClick}
                                className="inline-flex items-center justify-center px-6 py-3.5 border border-transparent text-base font-semibold rounded-lg text-white bg-purple-600 hover:bg-purple-700 shadow-lg shadow-purple-500/30 transition-transform transform hover:scale-105"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-3" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM6.293 6.707a1 1 0 010-1.414l3-3a1 1 0 011.414 0l3 3a1 1 0 01-1.414 1.414L11 5.414V13a1 1 0 11-2 0V5.414L7.707 6.707a1 1 0 01-1.414 0z" clipRule="evenodd" /></svg>
                                Upload CSV
                            </button>
                            <button
                                onClick={onManualClick}
                                className="inline-flex items-center justify-center px-6 py-3.5 border border-slate-300 text-base font-semibold rounded-lg text-slate-700 bg-white/70 backdrop-blur-sm hover:bg-white shadow-md transition-transform transform hover:scale-105"
                            >
                               <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-3" viewBox="0 0 20 20" fill="currentColor"><path d="M5.5 13a3.5 3.5 0 01-.369-6.98 4 4 0 117.753-1.977A4.5 4.5 0 1113.5 13H11V9.414l-1.293 1.293a1 1 0 01-1.414-1.414l3-3a1 1 0 011.414 0l3 3a1 1 0 01-1.414 1.414L13 9.414V13h-1.5a1 1 0 01-1-1V9a1 1 0 011-1h.5a1 1 0 100-2h-5a1 1 0 000 2h.5a1 1 0 011 1v3a1 1 0 01-1 1H5.5z" clipRule="evenodd" /></svg>
                                Enter Manually
                            </button>
                            <button
                                onClick={onViewMaps}
                                className="inline-flex items-center justify-center px-6 py-3.5 border border-slate-300 text-base font-semibold rounded-lg text-slate-700 bg-white/70 backdrop-blur-sm hover:bg-white shadow-md transition-transform transform hover:scale-105"
                            >
                               <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-3" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" clipRule="evenodd" /><path fillRule="evenodd" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" clipRule="evenodd" /></svg>
                                View Maps
                            </button>
                        </div>
                        <p className="mt-6 text-sm text-slate-500">
                            Or{' '}
                            <button onClick={onUseSampleData} className="font-semibold text-purple-600 hover:text-purple-500 transition-colors">
                            start with our sample dataset
                            </button>{' '}
                            to see how it works.
                        </p>
                    </div>
                </div>
                <div className="hidden lg:flex lg:items-center h-full">
                    <GlobeDisplay />
                </div>
            </div>
        </main>
      
        <style>{`
            .animation-delay-2000 {
            animation-delay: -2s;
            }
            .animation-delay-4000 {
            animation-delay: -4s;
            }
            @keyframes blob {
            0% {
                transform: translate(0px, 0px) scale(1);
            }
            33% {
                transform: translate(100px, -80px) scale(1.1);
            }
            66% {
                transform: translate(-80px, 50px) scale(0.9);
            }
            100% {
                transform: translate(0px, 0px) scale(1);
            }
            }
            .animate-blob {
            animation: blob 10s infinite cubic-bezier(0.6, -0.28, 0.735, 0.045);
            }
        `}</style>
    </div>
  );
};

export default HomePage;
