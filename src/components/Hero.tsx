import { useState, useEffect } from "react";
import { motion } from "motion/react";
import { ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import { Badge } from "./Badge";
import { ProjectCard } from "./ProjectCard";
import Beams from "./Beams";

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.15,
      delayChildren: 0.2,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 30 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.8,
      ease: [0.16, 1, 0.3, 1],
    },
  },
};

export function Hero() {
  const [activeIndex, setActiveIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);

  useEffect(() => {
    if (isPaused) return;
    const timer = setInterval(() => {
      setActiveIndex((prev) => (prev + 1) % 5);
    }, 3000);
    return () => clearInterval(timer);
  }, [isPaused]);

  const projects = [
    {
      title: "GreenLedger",
      subtitle: "Carbon API for E-Com",
      description: "One-line SDK that calculates and offsets carbon per order. Shopify and WooCommerce plugins included.",
      raising: "Raising $18.0K",
      users: "310",
      mrr: "$1.8K",
      author: "Lena Berger",
      handle: "@LenaClimate",
      imageSeed: "nature"
    },
    {
      title: "NexusPay",
      subtitle: "Global Crypto Payroll",
      description: "Automate global payroll with instant crypto settlements. Compliant in 50+ countries.",
      raising: "Raising $2.5M",
      users: "1.2K",
      mrr: "$45K",
      author: "Marcus Chen",
      handle: "@marcus_dev",
      imageSeed: "tech"
    },
    {
      title: "AuraHealth",
      subtitle: "AI Mental Wellness",
      description: "Personalized meditation and therapy journeys powered by real-time biometric feedback.",
      raising: "Raising $500K",
      users: "8.5K",
      mrr: "$12K",
      author: "Sarah Jenkins",
      handle: "@sarah_aura",
      imageSeed: "wellness"
    },
    {
      title: "Lumina",
      subtitle: "Smart Home Lighting",
      description: "Adaptive lighting systems that sync with your circadian rhythm for better sleep and focus.",
      raising: "Raising $1.2M",
      users: "420",
      mrr: "$8.4K",
      author: "Alex Rivera",
      handle: "@arivera_design",
      imageSeed: "home"
    },
    {
      title: "Velocity",
      subtitle: "DevOps Automation",
      description: "Zero-config CI/CD pipelines for Next.js and React applications. Ship 10x faster.",
      raising: "Raising $3.0M",
      users: "2.1K",
      mrr: "$28K",
      author: "David Kim",
      handle: "@davidk_dev",
      imageSeed: "code"
    }
  ];

  const positions = [
    "z-10 opacity-20 -translate-x-56 translate-y-16 -rotate-12 scale-75 pointer-events-none blur-[2px] will-change-transform", // 0: Far Left
    "z-20 opacity-60 -translate-x-28 translate-y-6 -rotate-6 scale-90 pointer-events-none blur-[1px] will-change-transform", // 1: Mid Left
    "z-30 opacity-100 translate-x-0 translate-y-0 rotate-0 scale-100 shadow-2xl will-change-transform", // 2: Center
    "z-20 opacity-60 translate-x-28 translate-y-6 rotate-6 scale-90 pointer-events-none blur-[1px] will-change-transform", // 3: Mid Right
    "z-10 opacity-20 translate-x-56 translate-y-16 rotate-12 scale-75 pointer-events-none blur-[2px] will-change-transform", // 4: Far Right
  ];

  return (
    <section className="relative min-h-[auto] lg:min-h-screen w-full overflow-hidden bg-slate-950 flex flex-col items-center justify-center px-6 py-12 lg:py-16">
      {/* Beams background */}
      <div className="absolute inset-0 z-0 pointer-events-none" aria-hidden>
        <Beams
          beamWidth={2}
          beamHeight={15}
          beamNumber={12}
          lightColor="#98a7c9"
          speed={2}
          noiseIntensity={1.75}
          scale={0.15}
          rotation={0}
        />
      </div>

      {/* Main Content */}
      <div className="relative z-10 mx-auto max-w-7xl w-full flex flex-row items-center justify-between">
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="flex flex-col items-start text-left z-40 w-[55%] shrink-0"
        >
          <motion.div variants={itemVariants} className="mb-4 sm:mb-6">
            <Badge />
          </motion.div>
          <motion.h1 
            variants={itemVariants}
            className="mb-3 sm:mb-6 text-[5.5vw] sm:text-5xl lg:text-7xl font-bold tracking-tight text-transparent bg-clip-text bg-gradient-to-b from-white to-slate-400 leading-tight"
          >
            We Build Digital Experiences That Build Your Business.
          </motion.h1>

          <motion.p 
            variants={itemVariants}
            className="mb-2 sm:mb-3 max-w-xl text-[2.5vw] sm:text-lg lg:text-xl text-slate-400 leading-relaxed"
          >
            Transforming vision into high-performance, custom-coded websites. We blend world-class design with strategic engineering to drive results.
          </motion.p>
          <motion.p variants={itemVariants} className="mb-6 sm:mb-8 text-sm text-slate-500">
            Based in San Diego.
          </motion.p>

          <motion.div 
            variants={itemVariants}
            className="flex flex-row items-start gap-2 sm:gap-6"
          >
            <Link 
              to="/contact" 
              aria-label="Book a Strategy Call"
              className="group relative inline-flex items-center justify-center gap-1 sm:gap-2 overflow-hidden rounded-full bg-blue-600 px-3 py-2 sm:px-8 sm:py-4 text-[2vw] sm:text-sm font-semibold text-white transition-all duration-300 hover:bg-blue-500 hover:scale-105 hover:shadow-[0_0_40px_8px_rgba(37,99,235,0.3)]"
            >
              <span className="absolute inset-0 rounded-full bg-white/20 opacity-0 transition-opacity group-hover:opacity-100"></span>
              Book a Strategy Call
              <ArrowRight className="h-3 w-3 sm:h-4 sm:w-4 transition-transform duration-300 group-hover:translate-x-1" />
            </Link>

            <Link 
              to="/portfolio" 
              aria-label="View Portfolio"
              className="inline-flex items-center justify-center rounded-full border border-white/10 bg-white/5 px-3 py-2 sm:px-8 sm:py-4 text-[2vw] sm:text-sm font-semibold text-white backdrop-blur-sm transition-all duration-300 hover:bg-white/10 hover:border-white/20"
            >
              View Portfolio
            </Link>
          </motion.div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 1, delay: 0.5, ease: [0.16, 1, 0.3, 1] }}
          className="flex justify-center relative w-[45%] h-[250px] sm:h-[450px] lg:h-[550px] items-center -ml-[10%] sm:-ml-24 lg:-ml-32 mt-10 sm:mt-16 lg:mt-20"
          onMouseEnter={() => setIsPaused(true)}
          onMouseLeave={() => setIsPaused(false)}
        >
          <div className="relative flex items-center justify-center scale-[0.35] sm:scale-[0.65] lg:scale-100 origin-center transition-transform duration-300">
            {projects.map((project, index) => {
              const posIndex = (index - activeIndex + 5) % 5;
              return (
                <div
                  key={project.title}
                  className={`absolute w-[384px] transition-all duration-700 ease-in-out ${positions[posIndex]}`}
                >
                  <ProjectCard {...project} />
                </div>
              );
            })}
          </div>
        </motion.div>
      </div>
    </section>
  );
}
