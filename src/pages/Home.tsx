import { motion } from "motion/react";
import { ArrowRight, Check, Code2, Layout, Zap, Shield, Smartphone, Globe, Search, Accessibility, Gauge } from "lucide-react";
import { Hero } from "../components/Hero";
import { Marquee } from "../components/Marquee";
import { SEO } from "../components/SEO";
import { useState, useRef, useEffect } from "react";
import { Link } from "react-router-dom";

const logos = [
  "Acme Corp", "GlobalTech", "Nexus", "Quantum", "Starlight", "Vanguard", "Horizon", "Pinnacle"
];

const testimonials = [
  { body: "Future Proof Designers transformed our online presence. Their attention to detail is unmatched.", author: "Sarah Jenkins", role: "CEO, TechFlow" },
  { body: "Working with this agency was a breeze. They understood our vision immediately.", author: "Michael Chen", role: "Founder, StartupX" },
  { body: "The team doesn't just build websites; they build digital experiences.", author: "Emily Rodriguez", role: "Marketing Director, Elevate" },
  { body: "Our conversion rate doubled after the redesign. Absolutely phenomenal work.", author: "David Kim", role: "VP Growth, Nexus" },
  { body: "Fast, reliable, and incredibly talented. Best agency we've ever hired.", author: "Jessica Alba", role: "CMO, Vanguard" },
];

const faqs = [
  { question: "How long does a typical project take?", answer: "Most of our custom web projects take between 4 to 8 weeks from initial strategy to final launch, depending on complexity." },
  { question: "Do you use templates?", answer: "No. Every project is custom-designed and coded from scratch to ensure it perfectly aligns with your brand and goals." },
  { question: "What technologies do you use?", answer: "We specialize in modern stacks like React, Next.js, Tailwind CSS, and Framer Motion to deliver lightning-fast, scalable experiences." },
  { question: "Do you offer ongoing support?", answer: "Yes, we offer maintenance and retainer packages to keep your site updated, secure, and optimized post-launch." },
];

const services = [
  {
    title: "Custom Web Development",
    description: "Bespoke websites and web applications built with modern stacks. Fast, scalable, and tailored to your brand and goals.",
    icon: Code2,
    href: "/contact",
  },
  {
    title: "UI/UX Design",
    description: "Conversion-focused interfaces and seamless user journeys. We design experiences that look great and drive results.",
    icon: Layout,
    href: "/contact",
  },
  {
    title: "Brand & Strategy",
    description: "From positioning to visual identity and content strategy. We align your digital presence with your business vision.",
    icon: Shield,
    href: "/contact",
  },
  {
    title: "Ongoing Support",
    description: "Maintenance, updates, and retainer packages. Keep your site secure, fast, and optimized long after launch.",
    icon: Zap,
    href: "/contact",
  },
  {
    title: "SEO Optimization",
    description: "Get found by the right audience. We optimize structure, content, and technical SEO so your site ranks and converts.",
    icon: Search,
    href: "/contact",
  },
  {
    title: "Accessibility",
    description: "Inclusive experiences for everyone. We build to WCAG standards so your site works for all users and devices.",
    icon: Accessibility,
    href: "/contact",
  },
  {
    title: "Speed",
    description: "Fast load times and smooth performance. We optimize assets, code, and infrastructure so every visit feels instant.",
    icon: Gauge,
    href: "/contact",
  },
];

export function Home() {
  const [openFaq, setOpenFaq] = useState<number | null>(0);
  const scrollRef = useRef<HTMLDivElement>(null);
  const startRef = useRef<HTMLDivElement>(null);

  // Create paired columns for synchronized scrolling
  const pairedTestimonials = testimonials.map((t, i) => ({
    top: t,
    bottom: testimonials[testimonials.length - 1 - i]
  }));

  // Duplicate only 10 times instead of 60 for better performance
  const endlessPairs = Array(10).fill(pairedTestimonials).flat();
  const middleIndex = 5 * pairedTestimonials.length;

  useEffect(() => {
    if (scrollRef.current && startRef.current) {
      const container = scrollRef.current;
      const element = startRef.current;
      
      // Calculate the exact scroll position to center the start element
      const scrollPosition = element.offsetLeft - container.offsetWidth / 2 + element.offsetWidth / 2;
      
      // Jump to the position instantly
      container.scrollTo({ left: scrollPosition, behavior: 'auto' });

      let animationFrameId: number;
      let isPaused = false;

      const handleMouseEnter = () => isPaused = true;
      const handleMouseLeave = () => isPaused = false;
      const handleTouchStart = () => isPaused = true;
      const handleTouchEnd = () => isPaused = false;

      container.addEventListener('mouseenter', handleMouseEnter, { passive: true });
      container.addEventListener('mouseleave', handleMouseLeave, { passive: true });
      container.addEventListener('touchstart', handleTouchStart, { passive: true });
      container.addEventListener('touchend', handleTouchEnd, { passive: true });

      let exactScrollLeft = scrollPosition;

      const scroll = () => {
        if (container && !isPaused) {
          // If the user manually scrolled, sync our exact position
          if (Math.abs(container.scrollLeft - exactScrollLeft) > 1) {
            exactScrollLeft = container.scrollLeft;
          }
          
          exactScrollLeft += 0.5;
          container.scrollLeft = exactScrollLeft;

          // Infinite loop logic
          const maxScroll = container.scrollWidth - container.offsetWidth;
          if (exactScrollLeft >= maxScroll - 100) {
            exactScrollLeft = scrollPosition;
            container.scrollLeft = exactScrollLeft;
          }
        }
        animationFrameId = requestAnimationFrame(scroll);
      };

      animationFrameId = requestAnimationFrame(scroll);

      return () => {
        cancelAnimationFrame(animationFrameId);
        container.removeEventListener('mouseenter', handleMouseEnter);
        container.removeEventListener('mouseleave', handleMouseLeave);
        container.removeEventListener('touchstart', handleTouchStart);
        container.removeEventListener('touchend', handleTouchEnd);
      };
    }
  }, []);

  return (
    <div className="bg-slate-950">
      <SEO />
      <Hero />

      {/* Logo Marquee */}
      <section className="border-y border-white/5 bg-slate-950/50 py-6 sm:py-10">
        <div className="mx-auto max-w-7xl px-6 lg:px-8 mb-4 sm:mb-6 text-center">
          <p className="text-xs sm:text-sm font-medium text-slate-400">Trusted by innovative teams worldwide</p>
        </div>
        <Marquee className="[--duration:30s]" pauseOnHover>
          {logos.map((logo, idx) => (
            <div key={idx} className="mx-4 sm:mx-8 flex items-center justify-center">
              <span className="text-sm sm:text-xl font-bold text-slate-600 uppercase tracking-widest">{logo}</span>
            </div>
          ))}
        </Marquee>
      </section>

      {/* Why a website matters – impact & research */}
      <section className="py-16 sm:py-24 lg:py-32 border-t border-white/5 relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_0%,_rgba(59,130,246,0.08)_0%,_transparent_50%)]" />
        <div className="mx-auto max-w-7xl px-6 lg:px-8 relative z-10">
          <div className="text-center mb-12 sm:mb-16">
            <h2 className="text-sm sm:text-base font-semibold text-blue-400">The impact of a real web presence</h2>
            <p className="mt-2 text-[6vw] sm:text-4xl font-bold tracking-tight text-white leading-tight max-w-3xl mx-auto">
              Why a website isn't optional—it's your growth engine
            </p>
            <p className="mt-4 text-sm sm:text-base text-slate-400 max-w-2xl mx-auto leading-relaxed">
              Research-backed reasons to invest in a professional site—and why the brands that lead don't cut corners.
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 sm:gap-8">
            {[
              { stat: "75%", label: "of users judge credibility by web design", source: "Stanford Research" },
              { stat: "88%", label: "won't return after a bad experience", source: "Forrester" },
              { stat: "1s", label: "delay can drop conversions by 7%", source: "Amazon / Aberdeen" },
              { stat: "3x", label: "more likely to convert with a tailored site", source: "HubSpot" },
            ].map((item, idx) => (
              <motion.div
                key={idx}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: idx * 0.1 }}
                className="rounded-2xl border border-white/10 bg-slate-900/60 p-6 text-center hover:border-blue-500/30 transition-colors"
              >
                <p className="text-3xl sm:text-4xl font-bold text-blue-400">{item.stat}</p>
                <p className="mt-2 text-sm font-medium text-white">{item.label}</p>
                <p className="mt-1 text-xs text-slate-500">{item.source}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Services buckets */}
      <section className="py-16 sm:py-24 lg:py-32 border-t border-white/5">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="mb-10 sm:mb-14 text-center">
            <h2 className="text-sm sm:text-base font-semibold leading-7 text-blue-400">What we offer</h2>
            <p className="mt-2 text-[6vw] sm:text-4xl font-bold tracking-tight text-white leading-tight">
              Services that scale with you
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {services.map((service, idx) => {
              const Icon = service.icon;
              return (
                <motion.div
                  key={service.title}
                  initial={{ opacity: 0, y: 24 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.4, delay: idx * 0.1 }}
                >
                  <Link
                    to={service.href}
                    className="group block h-full rounded-2xl border border-white/10 bg-slate-900/60 p-6 sm:p-8 shadow-xl shadow-black/20 hover:border-white/20 hover:bg-slate-900/80 transition-all duration-300 flex flex-col text-left"
                  >
                    <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-xl bg-white/5 text-blue-400 group-hover:bg-blue-500/10 transition-colors">
                      <Icon className="h-6 w-6" />
                    </div>
                    <h3 className="text-xl font-bold tracking-tight text-white mb-3">
                      {service.title}
                    </h3>
                    <p className="text-slate-400 text-sm sm:text-base leading-relaxed flex-1">
                      {service.description}
                    </p>
                    <div className="mt-6 flex items-center justify-end">
                      <span className="flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-white/5 text-slate-400 group-hover:border-blue-500/50 group-hover:bg-blue-500/10 group-hover:text-blue-400 transition-all">
                        <ArrowRight className="h-5 w-5" />
                      </span>
                    </div>
                  </Link>
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>

      {/* The Future Proof Effect (Horizontal Scroll Testimonials) */}
      <section className="py-12 sm:py-24 lg:py-32 relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,_#4f46e5_0%,_transparent_60%)] opacity-5 mix-blend-screen"></div>
        <div className="mx-auto max-w-7xl px-6 lg:px-8 text-center mb-8 sm:mb-16 relative z-10">
          <h2 className="text-sm sm:text-base font-semibold leading-7 text-blue-400">The Future Proof effect</h2>
          <p className="mt-2 text-[6vw] sm:text-4xl font-bold tracking-tight text-white leading-tight">
            Trusted by the founders who ship
          </p>
        </div>
        
        <div className="relative w-full overflow-hidden">
          {/* Gradient Edges for fade effect */}
          <div className="pointer-events-none absolute inset-y-0 left-0 w-16 sm:w-48 bg-gradient-to-r from-slate-950 to-transparent z-10"></div>
          <div className="pointer-events-none absolute inset-y-0 right-0 w-16 sm:w-48 bg-gradient-to-l from-slate-950 to-transparent z-10"></div>

          <motion.div 
            className="flex gap-6 w-max will-change-transform"
            animate={{ 
              x: [`calc(50vw - 3915px)`, `calc(50vw - 5785px)`] 
            }}
            transition={{ 
              x: {
                repeat: Infinity,
                repeatType: "loop",
                duration: 50,
                ease: "linear",
              }
            }}
          >
            {[...Array(6)].map((_, setIndex) => (
              <div key={setIndex} className="flex gap-6">
                {pairedTestimonials.map((pair, i) => (
                  <div 
                    key={`${setIndex}-${i}`} 
                    className="shrink-0 flex flex-col gap-6 w-[350px]"
                  >
                    {/* Top Testimonial */}
                    <motion.div 
                      whileHover={{ scale: 1.02 }}
                      className="rounded-2xl border border-white/10 bg-slate-900/50 p-6 backdrop-blur-sm transition-colors hover:bg-slate-900 flex flex-col h-full"
                    >
                      <div className="flex gap-1 mb-4 text-blue-400">
                        {[...Array(5)].map((_, i) => <StarIcon key={i} />)}
                      </div>
                      <p className="text-slate-300 mb-6 text-sm leading-relaxed flex-1">"{pair.top.body}"</p>
                      <div className="flex items-center gap-3 mt-auto">
                        <div className="h-10 w-10 rounded-full bg-blue-500/20 flex items-center justify-center text-blue-300 font-bold">
                          {pair.top.author.charAt(0)}
                        </div>
                        <div>
                          <div className="text-sm font-semibold text-white">{pair.top.author}</div>
                          <div className="text-xs text-slate-500">{pair.top.role}</div>
                        </div>
                      </div>
                    </motion.div>

                    {/* Bottom Testimonial */}
                    <motion.div 
                      whileHover={{ scale: 1.02 }}
                      className="rounded-2xl border border-white/10 bg-slate-900/50 p-6 backdrop-blur-sm transition-colors hover:bg-slate-900 flex flex-col h-full"
                    >
                      <div className="flex gap-1 mb-4 text-blue-400">
                        {[...Array(5)].map((_, i) => <StarIcon key={i} />)}
                      </div>
                      <p className="text-slate-300 mb-6 text-sm leading-relaxed flex-1">"{pair.bottom.body}"</p>
                      <div className="flex items-center gap-3 mt-auto">
                        <div className="h-10 w-10 rounded-full bg-blue-500/20 flex items-center justify-center text-blue-300 font-bold">
                          {pair.bottom.author.charAt(0)}
                        </div>
                        <div>
                          <div className="text-sm font-semibold text-white">{pair.bottom.author}</div>
                          <div className="text-xs text-slate-500">{pair.bottom.role}</div>
                        </div>
                      </div>
                    </motion.div>
                  </div>
                ))}
              </div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Case studies / results */}
      <section className="py-16 sm:py-24 lg:py-32 border-t border-white/5 relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_60%_40%_at_80%_60%,_rgba(59,130,246,0.06)_0%,_transparent_50%)]" />
        <div className="mx-auto max-w-7xl px-6 lg:px-8 relative z-10">
          <div className="text-center mb-12 sm:mb-16">
            <h2 className="text-sm sm:text-base font-semibold text-blue-400">Results that speak</h2>
            <p className="mt-2 text-[6vw] sm:text-4xl font-bold tracking-tight text-white leading-tight max-w-3xl mx-auto">
              Real impact for brands we've built
            </p>
            <p className="mt-4 text-sm sm:text-base text-slate-400 max-w-2xl mx-auto">
              Custom sites and apps that drive measurable outcomes—credibility, traffic, and conversions.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-8">
            {[
              { metric: "40%", label: "increase in conversions", context: "Post-redesign for a B2B SaaS client; improved UX and clear CTAs." },
              { metric: "2x", label: "faster load time", context: "Technical overhaul and performance optimization for an e‑commerce brand." },
              { metric: "3x", label: "engagement on key pages", context: "New brand site with focused messaging and conversion-focused design." },
            ].map((item, idx) => (
              <motion.div
                key={idx}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: idx * 0.1 }}
                className="rounded-2xl border border-white/10 bg-slate-900/60 p-6 sm:p-8 hover:border-blue-500/30 transition-colors"
              >
                <p className="text-3xl sm:text-4xl font-bold text-blue-400">{item.metric}</p>
                <p className="mt-2 text-sm font-semibold text-white">{item.label}</p>
                <p className="mt-3 text-xs sm:text-sm text-slate-400 leading-relaxed">{item.context}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* From vision to launched, on autopilot (Features Grid) */}
      <section className="py-12 sm:py-24 lg:py-32 bg-slate-900/20 border-y border-white/5">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="mx-auto max-w-2xl lg:text-center mb-10 sm:mb-16">
            <h2 className="text-sm sm:text-base font-semibold leading-7 text-blue-400">From vision to launched</h2>
            <p className="mt-2 text-[6vw] sm:text-4xl font-bold tracking-tight text-white leading-tight">
              A better way to build digital products
            </p>
            <p className="mt-4 sm:mt-6 text-sm sm:text-lg leading-relaxed sm:leading-8 text-slate-400">
              We handle the heavy lifting so you can focus on your business. Our streamlined process ensures high-quality delivery every time.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-8">
            {[
              { icon: Layout, title: "1. Strategy & Design", desc: "We map out the user journey and create stunning, conversion-optimized interfaces." },
              { icon: Code2, title: "2. Custom Engineering", desc: "Our team builds scalable, high-performance architectures using modern tech stacks." },
              { icon: Zap, title: "3. Launch & Scale", desc: "We deploy with zero downtime and provide ongoing support to help you grow." }
            ].map((step, idx) => (
              <motion.div 
                key={idx}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: idx * 0.2 }}
                className="relative p-6 sm:p-8 rounded-2xl sm:rounded-3xl border border-white/10 bg-slate-900/50 hover:bg-slate-900 transition-colors flex flex-col items-center text-center"
              >
                <div className="h-10 w-10 sm:h-12 sm:w-12 rounded-xl bg-blue-500/20 flex items-center justify-center mb-4 sm:mb-6 border border-blue-500/30">
                  <step.icon className="h-5 w-5 sm:h-6 sm:w-6 text-blue-400" />
                </div>
                <h3 className="text-lg sm:text-xl font-bold text-white mb-2 sm:mb-3">{step.title}</h3>
                <p className="text-xs sm:text-sm lg:text-base text-slate-400 leading-relaxed">{step.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Built for both sides of momentum (Split Layout) */}
      <section className="py-12 sm:py-24 lg:py-32 overflow-hidden">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 sm:gap-16 items-center">
            <motion.div 
              initial={{ opacity: 0, x: -30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              className="lg:pr-12"
            >
              <h2 className="text-[6vw] sm:text-4xl font-bold tracking-tight text-white leading-tight mb-4 sm:mb-6">
                Built for both sides of momentum.
              </h2>
              <p className="text-sm sm:text-lg text-slate-400 mb-6 sm:mb-8 leading-relaxed">
                Whether you need a stunning marketing site to capture leads, or a complex web application to serve thousands of users, we have the expertise to deliver.
              </p>
              
              <div className="space-y-4 sm:space-y-6">
                {[
                  { title: "Pixel-Perfect Design", desc: "Every component is meticulously crafted." },
                  { title: "Lightning Fast", desc: "Optimized for speed and SEO out of the box." },
                  { title: "Secure & Scalable", desc: "Enterprise-grade security and architecture." }
                ].map((item, i) => (
                  <div key={i} className="flex gap-3 sm:gap-4">
                    <div className="mt-1 flex h-5 w-5 sm:h-6 sm:w-6 flex-none items-center justify-center rounded-full bg-blue-500/20">
                      <Check className="h-3 w-3 sm:h-4 sm:w-4 text-blue-400" />
                    </div>
                    <div>
                      <h4 className="text-sm sm:text-base font-semibold text-white">{item.title}</h4>
                      <p className="text-xs sm:text-sm text-slate-400 mt-1">{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
            
            <motion.div 
              initial={{ opacity: 0, x: 30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              className="relative mt-8 lg:mt-0"
            >
              <div className="absolute -inset-4 rounded-3xl bg-gradient-to-tr from-blue-500/20 to-purple-500/20 blur-2xl opacity-50"></div>
              <div className="relative rounded-2xl border border-white/10 bg-slate-900 p-2 shadow-2xl flex items-center justify-center overflow-hidden">
                <img 
                  src="https://picsum.photos/seed/dashboard/800/600" 
                  alt="Dashboard Preview" 
                  className="rounded-xl opacity-80 w-full h-auto object-cover"
                  referrerPolicy="no-referrer"
                />
                <div className="absolute inset-0 rounded-xl ring-1 ring-inset ring-white/10"></div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Stay ahead – why upgrade / push your brand further */}
      <section className="py-16 sm:py-24 lg:py-32 border-t border-white/5 relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_70%_50%_at_50%_100%,_rgba(59,130,246,0.08)_0%,_transparent_50%)]" />
        <div className="mx-auto max-w-7xl px-6 lg:px-8 relative z-10">
          <div className="max-w-3xl mx-auto text-center mb-12 sm:mb-16">
            <h2 className="text-sm sm:text-base font-semibold text-blue-400">Stay ahead of the curve</h2>
            <p className="mt-2 text-[6vw] sm:text-4xl font-bold tracking-tight text-white leading-tight">
              Why leading brands choose us to push further
            </p>
            <p className="mt-4 text-sm sm:text-base text-slate-400 leading-relaxed">
              A generic site keeps you in the pack. A strategy-led, custom-built presence helps you stand out, convert better, and scale with confidence.
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
            {[
              { title: "No templates, no limits", desc: "Every project is built for you—so your brand doesn't look like everyone else's." },
              { title: "Built for growth", desc: "From day one we design for SEO, speed, and accessibility so you're ready to scale." },
              { title: "Long-term partnership", desc: "We don't disappear at launch. Ongoing support keeps your site secure and performing." },
            ].map((item, idx) => (
              <motion.div
                key={idx}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: idx * 0.1 }}
                className="rounded-2xl border border-white/10 bg-slate-900/60 p-6 text-center sm:text-left hover:border-blue-500/30 transition-colors"
              >
                <div className="h-10 w-10 rounded-xl bg-blue-500/20 flex items-center justify-center mx-auto sm:mx-0 mb-4 border border-blue-500/30">
                  <Check className="h-5 w-5 text-blue-400" />
                </div>
                <h3 className="text-base font-semibold text-white">{item.title}</h3>
                <p className="mt-2 text-sm text-slate-400 leading-relaxed">{item.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="py-12 sm:py-24 lg:py-32 bg-slate-900/20 border-t border-white/5">
        <div className="mx-auto max-w-3xl px-6 lg:px-8">
          <div className="text-center mb-10 sm:mb-16">
            <h2 className="text-[6vw] sm:text-4xl font-bold tracking-tight text-white leading-tight">Common questions</h2>
          </div>
          <div className="space-y-3 sm:space-y-4">
            {faqs.map((faq, idx) => (
              <div 
                key={idx} 
                className="rounded-2xl border border-white/10 bg-slate-900/50 overflow-hidden transition-colors hover:bg-slate-900"
              >
                <button 
                  onClick={() => setOpenFaq(openFaq === idx ? null : idx)}
                  className="flex w-full items-center justify-between p-4 sm:p-6 text-left"
                >
                  <span className="text-sm sm:text-base font-semibold text-white">{faq.question}</span>
                  <span className="ml-4 sm:ml-6 flex h-6 w-6 sm:h-7 sm:w-7 shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/5">
                    <motion.span 
                      animate={{ rotate: openFaq === idx ? 45 : 0 }}
                      className="text-slate-400 text-sm sm:text-base"
                    >
                      +
                    </motion.span>
                  </span>
                </button>
                <motion.div 
                  initial={false}
                  animate={{ height: openFaq === idx ? "auto" : 0, opacity: openFaq === idx ? 1 : 0 }}
                  className="overflow-hidden"
                >
                  <p className="px-4 sm:px-6 pb-4 sm:pb-6 text-xs sm:text-sm lg:text-base text-slate-400 leading-relaxed">{faq.answer}</p>
                </motion.div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 sm:py-24 relative overflow-hidden">
        <div className="absolute inset-0 bg-blue-600/10"></div>
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_100%,_#2563eb_0%,_transparent_50%)] opacity-30"></div>
        <div className="mx-auto max-w-4xl px-6 lg:px-8 text-center relative z-10">
          <h2 className="text-[7vw] sm:text-5xl font-bold tracking-tight text-white leading-tight mb-4 sm:mb-6">Ready to future-proof your business?</h2>
          <p className="text-sm sm:text-lg text-slate-300 mb-8 sm:mb-10 max-w-2xl mx-auto leading-relaxed">
            You've seen the impact of a real web presence and the results we drive. Whether you need your first site or a partner to push your brand further—book a free strategy call and we'll make it happen.
          </p>
          <Link to="/contact" className="inline-flex items-center justify-center gap-2 rounded-full bg-blue-600 px-6 py-3 sm:px-8 sm:py-4 text-xs sm:text-sm font-semibold text-white transition-all hover:bg-blue-500 hover:scale-105 hover:shadow-[0_0_40px_8px_rgba(37,99,235,0.4)]">
            Book a Free Strategy Call
            <ArrowRight className="h-3 w-3 sm:h-4 sm:w-4" />
          </Link>
        </div>
      </section>
    </div>
  );
}

function StarIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
      <path fillRule="evenodd" d="M10.788 3.21c.448-1.077 1.976-1.077 2.424 0l2.082 5.006 5.404.434c1.164.093 1.636 1.545.749 2.305l-4.117 3.527 1.257 5.273c.271 1.136-.964 2.033-1.96 1.425L12 18.354 7.373 21.18c-.996.608-2.231-.29-1.96-1.425l1.257-5.273-4.117-3.527c-.887-.76-.415-2.212.749-2.305l5.404-.434 2.082-5.005Z" clipRule="evenodd" />
    </svg>
  );
}

