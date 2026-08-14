import { useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "motion/react";
import { Menu, X } from "lucide-react";
import { cn } from "../lib/utils";

const links = [
  { name: "Home", path: "/" },
  { name: "Portfolio", path: "/portfolio" },
  { name: "Testimonials", path: "/testimonials" },
  { name: "About", path: "/about" },
];

export function Navbar() {
  const location = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  // Handle scroll to change navbar background
  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Close mobile menu on route change
  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [location.pathname]);

  // Prevent scrolling when mobile menu is open
  useEffect(() => {
    if (isMobileMenuOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [isMobileMenuOpen]);

  return (
    <header 
      className={cn(
        "fixed top-0 left-0 right-0 z-50 transition-all duration-300",
        scrolled || isMobileMenuOpen
          ? "border-b border-white/5 bg-slate-950/80 backdrop-blur-xl"
          : "border-transparent bg-transparent"
      )}
    >
      <div className="mx-auto flex h-20 max-w-7xl items-center justify-between gap-6 px-6">
        <div className="hidden md:block md:flex-1" aria-hidden />

        {/* Desktop Navigation */}
        <nav className="hidden md:flex items-center justify-center gap-8 md:flex-1">
          {links.map((link) => {
            const isActive = location.pathname === link.path;
            return (
              <Link
                key={link.path}
                to={link.path}
                className={cn(
                  "relative text-sm font-medium transition-colors hover:text-white",
                  isActive ? "text-white" : "text-slate-400"
                )}
              >
                {link.name}
                {isActive && (
                  <motion.div
                    layoutId="navbar-indicator"
                    className="absolute -bottom-1 left-0 right-0 h-0.5 bg-blue-500"
                    transition={{ type: "spring", stiffness: 300, damping: 30 }}
                  />
                )}
              </Link>
            );
          })}
        </nav>

        {/* Desktop Actions */}
        <div className="hidden md:flex items-center justify-end gap-4 md:flex-1">
          <Link
            to="/contact"
            className="inline-flex h-10 items-center justify-center rounded-full bg-white/10 px-6 text-sm font-medium text-white transition-colors hover:bg-white/20"
          >
            Contact Us
          </Link>
          <Link
            to="/contact"
            className="inline-flex h-10 items-center justify-center rounded-full bg-blue-600 px-6 text-sm font-medium text-white transition-colors hover:bg-blue-500 shadow-[0_0_20px_rgba(37,99,235,0.3)] hover:shadow-[0_0_30px_rgba(37,99,235,0.5)]"
          >
            Book a Call
          </Link>
        </div>

        {/* Mobile Menu Toggle & CTA */}
        <div className="flex items-center gap-3 md:hidden">
          <Link
            to="/contact"
            className="inline-flex h-9 items-center justify-center rounded-full bg-blue-600 px-4 text-xs font-medium text-white transition-colors hover:bg-blue-500 shadow-[0_0_20px_rgba(37,99,235,0.3)]"
          >
            Book Call
          </Link>
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="flex h-10 w-10 items-center justify-center rounded-full bg-white/5 text-white transition-colors hover:bg-white/10"
            aria-label="Toggle menu"
          >
            {isMobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Menu Overlay */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.2 }}
            className="absolute left-0 right-0 top-20 h-[calc(100vh-5rem)] overflow-y-auto border-t border-white/5 bg-slate-950/95 backdrop-blur-xl md:hidden shadow-2xl"
          >
            <div className="flex flex-col px-6 py-8 space-y-8">
              <nav className="flex flex-col space-y-6">
                {links.map((link) => {
                  const isActive = location.pathname === link.path;
                  return (
                    <Link
                      key={link.path}
                      to={link.path}
                      className={cn(
                        "text-2xl font-semibold tracking-tight transition-colors hover:text-white",
                        isActive ? "text-blue-400" : "text-slate-300"
                      )}
                    >
                      {link.name}
                    </Link>
                  );
                })}
              </nav>
              <div className="h-px w-full bg-white/10" />
              <div className="flex flex-col gap-4">
                <Link
                  to="/contact"
                  className="inline-flex h-12 w-full items-center justify-center rounded-full bg-white/10 px-6 text-sm font-medium text-white transition-colors hover:bg-white/20"
                >
                  Contact Us
                </Link>
                <Link
                  to="/contact"
                  className="inline-flex h-12 w-full items-center justify-center rounded-full bg-blue-600 px-6 text-sm font-medium text-white transition-colors hover:bg-blue-500 shadow-[0_0_20px_rgba(37,99,235,0.3)]"
                >
                  Book a Strategy Call
                </Link>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}
