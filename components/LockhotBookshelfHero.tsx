"use client";

import { useEffect, useRef, useState } from "react";
import * as THREE from "three";

const TEMPLATE_NAMES = [
  "Full Bleed",
  "Caption Top", 
  "Framed",
  "Gradient",
];

export default function LockhotBookshelfHero() {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const isVisibleRef = useRef(true);
  const mouseRef = useRef({ x: 0, y: 0 });
  
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  // Check for reduced motion preference
  useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    setPrefersReducedMotion(mediaQuery.matches);

    const handler = (e: MediaQueryListEvent) => setPrefersReducedMotion(e.matches);
    mediaQuery.addEventListener("change", handler);
    return () => mediaQuery.removeEventListener("change", handler);
  }, []);

  // Initialize Three.js scene
  useEffect(() => {
    if (!canvasRef.current || !containerRef.current || prefersReducedMotion) return;

    const container = containerRef.current;
    const canvas = canvasRef.current;

    // Scene setup with Working Volumes paper color
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x171a24); // --paper from complete-shelf
    scene.fog = new THREE.Fog(0x171a24, 15, 35);
    sceneRef.current = scene;

    // Camera setup
    const camera = new THREE.PerspectiveCamera(
      45,
      container.clientWidth / container.clientHeight,
      0.1,
      100
    );
    camera.position.set(0, 3, 15);
    camera.lookAt(0, 1, 0);
    cameraRef.current = camera;

    // Renderer setup
    const renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      alpha: false,
      powerPreference: "high-performance",
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    rendererRef.current = renderer;

    // Lighting - warm library ambience
    const ambientLight = new THREE.AmbientLight(0xf4eee6, 0.4);
    scene.add(ambientLight);

    // Key light from above
    const spotLight = new THREE.SpotLight(0xf4eee6, 1.2);
    spotLight.position.set(0, 8, 8);
    spotLight.angle = Math.PI / 4;
    spotLight.penumbra = 0.6;
    spotLight.castShadow = true;
    spotLight.shadow.mapSize.width = 1024;
    spotLight.shadow.mapSize.height = 1024;
    scene.add(spotLight);

    // Accent rim light (walnut/copper tone)
    const rimLight = new THREE.DirectionalLight(0xc87046, 0.6);
    rimLight.position.set(-5, 2, -5);
    scene.add(rimLight);

    // Create wooden bookshelf structure
    const shelfGroup = new THREE.Group();
    
    // Shelf material - dark walnut
    const shelfMaterial = new THREE.MeshStandardMaterial({
      color: 0x3a2118, // --walnut
      roughness: 0.8,
      metalness: 0.1,
    });

    // Back panel
    const backPanel = new THREE.Mesh(
      new THREE.BoxGeometry(12, 6, 0.3),
      shelfMaterial
    );
    backPanel.position.set(0, 2, -2);
    backPanel.receiveShadow = true;
    shelfGroup.add(backPanel);

    // Three horizontal shelves
    for (let i = 0; i < 3; i++) {
      const shelf = new THREE.Mesh(
        new THREE.BoxGeometry(12, 0.3, 2.5),
        shelfMaterial
      );
      shelf.position.set(0, i * 2, -1);
      shelf.receiveShadow = true;
      shelf.castShadow = true;
      shelfGroup.add(shelf);
    }

    // Side supports
    for (let side of [-1, 1]) {
      const support = new THREE.Mesh(
        new THREE.BoxGeometry(0.4, 6, 2.5),
        shelfMaterial
      );
      support.position.set(side * 5.8, 2, -1);
      support.castShadow = true;
      shelfGroup.add(support);
    }

    scene.add(shelfGroup);

    // Create phone-shaped "book" volumes on the shelves
    const volumes: THREE.Group[] = [];
    const phoneWidth = 1.2;
    const phoneHeight = 2.4;
    const phoneDepth = 0.15;

    // Template colors (matching the templates)
    const templateColors = [
      0x4a5568, // blue-gray for full bleed
      0x6366f1, // indigo for caption top
      0x8b5cf6, // purple for framed
      0xec4899, // pink for gradient
    ];

    // Position 4 phone volumes on the middle shelf
    const shelfY = 2; // middle shelf
    const spacing = 2.8;
    const startX = -4.2;

    for (let i = 0; i < 4; i++) {
      const volumeGroup = new THREE.Group();
      
      // Phone bezel (represents the device frame)
      const bezelGeometry = new THREE.BoxGeometry(
        phoneWidth,
        phoneHeight,
        phoneDepth
      );
      const bezelMaterial = new THREE.MeshStandardMaterial({
        color: 0x1a1a1a,
        metalness: 0.7,
        roughness: 0.3,
      });
      const bezel = new THREE.Mesh(bezelGeometry, bezelMaterial);
      bezel.castShadow = true;
      bezel.receiveShadow = true;

      // Screen area (the template showcase)
      const screenGeometry = new THREE.BoxGeometry(
        phoneWidth - 0.15,
        phoneHeight - 0.15,
        phoneDepth - 0.05
      );
      const screenMaterial = new THREE.MeshStandardMaterial({
        color: templateColors[i],
        emissive: templateColors[i],
        emissiveIntensity: 0.3,
        roughness: 0.4,
        metalness: 0.1,
      });
      const screen = new THREE.Mesh(screenGeometry, screenMaterial);
      screen.position.z = 0.05;
      bezel.add(screen);

      // Subtle glow for each volume
      const glowGeometry = new THREE.BoxGeometry(
        phoneWidth + 0.2,
        phoneHeight + 0.2,
        phoneDepth + 0.1
      );
      const glowMaterial = new THREE.MeshBasicMaterial({
        color: templateColors[i],
        transparent: true,
        opacity: 0.1,
      });
      const glow = new THREE.Mesh(glowGeometry, glowMaterial);
      bezel.add(glow);

      volumeGroup.add(bezel);

      // Position on shelf (standing upright like books)
      volumeGroup.position.set(
        startX + i * spacing,
        shelfY + phoneHeight / 2 + 0.2,
        -0.5
      );
      
      // Slight rotation for visual interest
      volumeGroup.rotation.y = (Math.random() - 0.5) * 0.1;

      scene.add(volumeGroup);
      volumes.push(volumeGroup);
    }

    // Mouse tracking for parallax
    const handleMouseMove = (e: MouseEvent) => {
      mouseRef.current.x = (e.clientX / window.innerWidth) * 2 - 1;
      mouseRef.current.y = -(e.clientY / window.innerHeight) * 2 + 1;
    };
    window.addEventListener("mousemove", handleMouseMove);

    // Animation loop
    let lastTime = Date.now();
    const animate = () => {
      if (!isVisibleRef.current) {
        animationFrameRef.current = requestAnimationFrame(animate);
        return;
      }

      const now = Date.now();
      const elapsed = now / 1000;
      lastTime = now;

      // Subtle camera parallax based on mouse
      camera.position.x += (mouseRef.current.x * 2 - camera.position.x) * 0.02;
      camera.position.y += (mouseRef.current.y * 1 + 3 - camera.position.y) * 0.02;
      camera.lookAt(0, 2, 0);

      // Gentle idle animation for volumes
      volumes.forEach((volume, i) => {
        const offset = i * 0.5;
        volume.position.y += Math.sin(elapsed + offset) * 0.0003;
        volume.rotation.y += Math.sin(elapsed * 0.5 + offset) * 0.0001;
      });

      renderer.render(scene, camera);
      animationFrameRef.current = requestAnimationFrame(animate);
    };

    animate();

    // Handle resize
    const handleResize = () => {
      if (!container || !camera || !renderer) return;
      const width = container.clientWidth;
      const height = container.clientHeight;
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height);
    };

    window.addEventListener("resize", handleResize);

    // Intersection Observer for visibility
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          isVisibleRef.current = entry.isIntersecting;
        });
      },
      { threshold: 0.1 }
    );

    observer.observe(container);

    return () => {
      window.removeEventListener("resize", handleResize);
      window.removeEventListener("mousemove", handleMouseMove);
      observer.disconnect();
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      renderer.dispose();
      scene.traverse((object) => {
        if (object instanceof THREE.Mesh) {
          object.geometry.dispose();
          if (Array.isArray(object.material)) {
            object.material.forEach(mat => mat.dispose());
          } else {
            object.material.dispose();
          }
        }
      });
      scene.clear();
    };
  }, [prefersReducedMotion]);

  const handleContinue = () => {
    const deskElement = document.getElementById("lockshot-desk");
    if (deskElement) {
      deskElement.scrollIntoView({ behavior: "smooth" });
    }
  };

  if (prefersReducedMotion) {
    return (
      <div className="relative w-full h-screen bg-[#171a24] flex items-center justify-center">
        <div className="text-center text-[#f4eee6] space-y-6 px-4 max-w-3xl">
          <h1 className="text-6xl font-bold tracking-tight">Lockshot</h1>
          <p className="text-xl text-[#b9b4ae] leading-relaxed">
            App Store Screenshot Localization Desk
          </p>
          <div className="flex gap-3 flex-wrap justify-center text-sm mt-8">
            {TEMPLATE_NAMES.map((name) => (
              <div
                key={name}
                className="px-4 py-2 bg-[#3a2118] rounded-lg border border-[#c87046]/30 text-[#f4eee6]"
              >
                {name}
              </div>
            ))}
          </div>
          <button
            onClick={handleContinue}
            className="mt-12 px-8 py-4 bg-[#c87046] hover:bg-[#d88056] text-white rounded-lg font-medium transition-colors shadow-lg"
          >
            Open Desk →
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="relative w-full h-screen bg-[#171a24] overflow-hidden" ref={containerRef}>
      <canvas ref={canvasRef} className="w-full h-full" />
      
      {/* Overlay UI */}
      <div className="absolute inset-0 pointer-events-none">
        {/* Title */}
        <div className="absolute top-12 left-12">
          <h1 className="text-[#f4eee6] text-4xl font-bold tracking-tight">
            Lockshot
          </h1>
          <p className="text-[#b9b4ae] text-sm mt-2 tracking-widest uppercase font-mono">
            Screenshot Templates
          </p>
        </div>

        {/* Template labels */}
        <div className="absolute bottom-32 left-1/2 -translate-x-1/2 flex gap-8">
          {TEMPLATE_NAMES.map((name, i) => (
            <div
              key={name}
              className="text-center"
              style={{ 
                animation: `fadeIn 0.6s ease-out ${i * 0.15}s both` 
              }}
            >
              <div className="w-2 h-2 rounded-full bg-[#c87046] mx-auto mb-2" />
              <div className="text-[#f4eee6] text-sm font-medium">{name}</div>
            </div>
          ))}
        </div>

        {/* Continue button */}
        <div className="absolute bottom-12 left-1/2 -translate-x-1/2 pointer-events-auto">
          <button
            onClick={handleContinue}
            className="px-8 py-4 bg-[#c87046] hover:bg-[#d88056] text-white rounded-lg font-medium transition-colors shadow-lg"
          >
            Open Localization Desk →
          </button>
        </div>

        {/* Pointer hint */}
        <div className="absolute top-12 right-12 text-[#b9b4ae] text-xs font-mono tracking-wider">
          Move cursor to explore
        </div>
      </div>
    </div>
  );
}
