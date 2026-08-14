import { useEffect, useRef } from "react";
import * as THREE from "three";

export function HeroThreeBackground() {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const width = container.clientWidth;
    const height = container.clientHeight;

    const scene = new THREE.Scene();

    const camera = new THREE.PerspectiveCamera(60, width / height, 0.1, 1000);
    camera.position.z = 8;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setClearColor(0x020617, 0); // slate-950, full transparency for overlay
    container.appendChild(renderer.domElement);

    // Soft gradient-like mesh: flattened torus with subtle blue
    const geometry = new THREE.TorusKnotGeometry(2.2, 0.4, 128, 16);
    const material = new THREE.MeshBasicMaterial({
      color: 0x2563eb,
      transparent: true,
      opacity: 0.08,
      wireframe: true,
    });
    const mesh = new THREE.Mesh(geometry, material);
    mesh.rotation.x = Math.PI * 0.25;
    scene.add(mesh);

    // Second, smaller knot for depth
    const geometry2 = new THREE.TorusGeometry(1.5, 0.25, 32, 64);
    const mesh2 = new THREE.Mesh(
      geometry2,
      new THREE.MeshBasicMaterial({
        color: 0x3b82f6,
        transparent: true,
        opacity: 0.05,
        wireframe: true,
      })
    );
    mesh2.rotation.x = Math.PI * 0.5;
    scene.add(mesh2);

    let animationId: number;

    const animate = () => {
      animationId = requestAnimationFrame(animate);
      const t = performance.now() * 0.0003;
      mesh.rotation.y = t * 0.4;
      mesh.rotation.x = Math.PI * 0.25 + Math.sin(t * 0.5) * 0.1;
      mesh2.rotation.y = t * 0.25;
      mesh2.rotation.z = t * 0.15;
      renderer.render(scene, camera);
    };
    animate();

    const handleResize = () => {
      if (!container) return;
      const w = container.clientWidth;
      const h = container.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
      cancelAnimationFrame(animationId);
      renderer.dispose();
      geometry.dispose();
      geometry2.dispose();
      material.dispose();
      if (container && renderer.domElement.parentNode === container) {
        container.removeChild(renderer.domElement);
      }
    };
  }, []);

  return (
    <div
      ref={containerRef}
      className="absolute inset-0 z-0 pointer-events-none"
      aria-hidden
    />
  );
}
