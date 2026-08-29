"use client";

import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import "@designcodeio/threeui/style.css";

const ANIMATION_DURATION = 15000; // 15 seconds

interface PhoneScreenData {
  id: number;
  enText: { headline: string; subhead: string };
  deText: { headline: string; subhead: string };
  hasOverflow: boolean;
}

const PHONE_DATA: PhoneScreenData[] = [
  {
    id: 1,
    enText: { headline: "Build Better Habits", subhead: "Track your daily progress" },
    deText: { headline: "Erstellen Sie bessere", subhead: "Verfolgen Sie Ihren" },
    hasOverflow: false,
  },
  {
    id: 2,
    enText: { headline: "Stay Consistent", subhead: "Visual streaks motivate" },
    deText: { headline: "Bleiben Sie konsequent", subhead: "Visuelle Streaks motivieren" },
    hasOverflow: true,
  },
  {
    id: 3,
    enText: { headline: "Smart Reminders", subhead: "Never miss a day" },
    deText: { headline: "Intelligente Erinnerungen", subhead: "Verpassen Sie niemals" },
    hasOverflow: false,
  },
  {
    id: 4,
    enText: { headline: "Beautiful Charts", subhead: "See your progress grow" },
    deText: { headline: "Wunderschöne Diagramme", subhead: "Sehen Sie Ihren Fortschritt" },
    hasOverflow: false,
  },
  {
    id: 5,
    enText: { headline: "Achieve Your Goals", subhead: "One day at a time" },
    deText: { headline: "Erreichen Sie Ihre Ziele", subhead: "Einen Tag nach dem anderen" },
    hasOverflow: false,
  },
];

const WEBMCP_TOOLS = [
  "set_locale",
  "check_overflow",
  "export_zip",
  "set_overlay",
  "rewrite_overlay",
  "apply_locale_pass",
  "comment_on_slide",
  "get_page_state",
];

export default function LockhotHero() {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const phoneMeshesRef = useRef<THREE.Mesh[]>([]);
  const isVisibleRef = useRef(true);
  const startTimeRef = useRef(Date.now());
  
  const [currentPhase, setCurrentPhase] = useState<"fanout" | "morph" | "overflow" | "lock">("fanout");
  const [isLocked, setIsLocked] = useState(false);
  const [showHUD, setShowHUD] = useState(false);
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

    // Scene setup
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0a0a0a);
    scene.fog = new THREE.Fog(0x0a0a0a, 10, 30);
    sceneRef.current = scene;

    // Camera setup
    const camera = new THREE.PerspectiveCamera(
      50,
      container.clientWidth / container.clientHeight,
      0.1,
      100
    );
    camera.position.set(0, 0, 12);
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

    // Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.3);
    scene.add(ambientLight);

    const spotLight = new THREE.SpotLight(0xffffff, 1.5);
    spotLight.position.set(0, 5, 10);
    spotLight.angle = Math.PI / 6;
    spotLight.penumbra = 0.5;
    spotLight.castShadow = true;
    scene.add(spotLight);

    const rimLight = new THREE.DirectionalLight(0x6666ff, 0.5);
    rimLight.position.set(-5, 0, -5);
    scene.add(rimLight);

    // Create 5 phone bezels in an arc
    const phones: THREE.Mesh[] = [];
    const arcRadius = 6;
    const arcSpan = Math.PI / 3; // 60 degrees
    const phoneWidth = 1.5;
    const phoneHeight = 3.2;
    const phoneDepth = 0.1;

    for (let i = 0; i < 5; i++) {
      const angle = (i - 2) * (arcSpan / 4);
      
      // Phone bezel (frame)
      const bezelGeometry = new THREE.BoxGeometry(
        phoneWidth + 0.1,
        phoneHeight + 0.1,
        phoneDepth
      );
      const bezelMaterial = new THREE.MeshStandardMaterial({
        color: 0x1a1a1a,
        metalness: 0.8,
        roughness: 0.2,
      });
      const bezel = new THREE.Mesh(bezelGeometry, bezelMaterial);

      // Screen (inside the bezel)
      const screenGeometry = new THREE.BoxGeometry(
        phoneWidth - 0.2,
        phoneHeight - 0.3,
        phoneDepth - 0.05
      );
      const screenMaterial = new THREE.MeshStandardMaterial({
        color: i === 2 ? 0x6666ff : 0x2a2a3a, // Center phone brighter
        emissive: i === 2 ? 0x3333ff : 0x1a1a2a,
        emissiveIntensity: i === 2 ? 0.3 : 0.1,
      });
      const screen = new THREE.Mesh(screenGeometry, screenMaterial);
      screen.position.z = 0.03;
      bezel.add(screen);

      // Position in arc
      const x = Math.sin(angle) * arcRadius;
      const z = -Math.cos(angle) * arcRadius + arcRadius;
      bezel.position.set(x, 0, z);
      bezel.rotation.y = -angle;

      // Center phone comes forward
      if (i === 2) {
        bezel.position.z += 1;
        bezel.scale.set(1.1, 1.1, 1.1);
      }

      scene.add(bezel);
      phones.push(bezel);
    }

    phoneMeshesRef.current = phones;

    // Animation loop
    let lastTime = Date.now();
    const animate = () => {
      if (!isVisibleRef.current) {
        animationFrameRef.current = requestAnimationFrame(animate);
        return;
      }

      const now = Date.now();
      const elapsed = (now - startTimeRef.current) % ANIMATION_DURATION;
      const delta = now - lastTime;
      lastTime = now;

      // Update animation phases
      if (elapsed < 3000) {
        setCurrentPhase("fanout");
        // Phones fanning out (already positioned, just subtle movement)
        phones.forEach((phone, i) => {
          phone.rotation.y += Math.sin(elapsed / 1000 + i) * 0.0005;
        });
      } else if (elapsed < 7000) {
        setCurrentPhase("morph");
      } else if (elapsed < 11000) {
        setCurrentPhase("overflow");
      } else {
        setCurrentPhase("lock");
        setShowHUD(true);
      }

      // Reset HUD at loop start
      if (elapsed < 100) {
        setShowHUD(false);
        setIsLocked(false);
      }

      // Gentle idle motion
      phones.forEach((phone, i) => {
        const offset = i * 0.5;
        phone.position.y = Math.sin(elapsed / 1000 + offset) * 0.05;
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
      observer.disconnect();
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      renderer.dispose();
      scene.clear();
    };
  }, [prefersReducedMotion]);

  const handleLockClick = () => {
    setIsLocked((prev) => !prev);
  };

  const handleContinue = () => {
    const deskElement = document.getElementById("lockshot-desk");
    if (deskElement) {
      deskElement.scrollIntoView({ behavior: "smooth" });
    }
  };

  if (prefersReducedMotion) {
    return (
      <div className="relative w-full h-screen bg-gradient-to-b from-gray-900 to-gray-800 flex items-center justify-center">
        <div className="text-center text-white space-y-6 px-4">
          <h1 className="text-5xl font-bold">Lockshot</h1>
          <p className="text-xl text-gray-300">
            App Store Screenshot Localization with WebMCP
          </p>
          <div className="flex gap-3 flex-wrap justify-center text-sm bg-black/40 p-4 rounded-lg">
            {WEBMCP_TOOLS.map((tool) => (
              <span key={tool} className="px-3 py-1 bg-blue-600/30 rounded-full border border-blue-500/50">
                {tool}
              </span>
            ))}
          </div>
          <button
            onClick={handleContinue}
            className="mt-8 px-6 py-3 bg-blue-600 hover:bg-blue-700 rounded-lg font-medium transition-colors"
          >
            Open Desk →
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="relative w-full h-screen bg-black overflow-hidden" ref={containerRef}>
      <canvas ref={canvasRef} className="w-full h-full" />
      
      {/* Overlay UI */}
      <div className="absolute inset-0 pointer-events-none">
        {/* Text morphing overlay - center phone */}
        {currentPhase === "morph" && (
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-center">
            <div className="text-white text-4xl font-bold mb-2 animate-pulse">
              EN → DE
            </div>
            <div className="text-gray-400 text-lg">
              {PHONE_DATA[2].enText.headline} → {PHONE_DATA[2].deText.headline}
            </div>
          </div>
        )}

        {/* Overflow indicator */}
        {currentPhase === "overflow" && (
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 translate-y-16">
            <div className="bg-red-500 text-white px-6 py-3 rounded-lg font-bold shadow-lg shadow-red-500/50 animate-pulse">
              ⚠️ Slide 2 Overflow Detected
            </div>
          </div>
        )}

        {/* Lock control */}
        {currentPhase === "lock" && (
          <div className="absolute bottom-1/3 left-1/2 -translate-x-1/2 pointer-events-auto">
            <button
              onClick={handleLockClick}
              className={`px-8 py-4 rounded-lg font-bold text-lg transition-all transform hover:scale-105 ${
                isLocked
                  ? "bg-green-600 hover:bg-green-700"
                  : "bg-gray-700 hover:bg-gray-600"
              }`}
            >
              {isLocked ? "🔒 Locked" : "🔓 Click to Lock"}
            </button>
          </div>
        )}

        {/* WebMCP Tools HUD */}
        {showHUD && (
          <div className="absolute top-8 right-8 bg-black/80 backdrop-blur-sm border border-blue-500/30 rounded-lg p-4 text-white text-sm">
            <div className="font-bold mb-2 text-blue-400">WebMCP Tools</div>
            <div className="space-y-1">
              {WEBMCP_TOOLS.map((tool) => (
                <div key={tool} className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full" />
                  <span className="font-mono">{tool}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Continue button */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 pointer-events-auto">
          <button
            onClick={handleContinue}
            className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors shadow-lg"
          >
            Open Localization Desk →
          </button>
        </div>

        {/* Loop indicator */}
        <div className="absolute top-8 left-8 text-gray-500 text-xs font-mono">
          15s loop • {currentPhase}
        </div>
      </div>
    </div>
  );
}
