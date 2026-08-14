import { Link } from "react-router-dom";

export function Footer() {
  return (
    <footer className="border-t border-white/5 bg-slate-950 py-12">
      <div className="mx-auto max-w-7xl px-6 flex flex-col md:flex-row justify-between items-center gap-6">
        <div className="flex flex-col gap-0.5">
          <div className="flex items-center gap-2">
            <div className="flex h-6 w-6 items-center justify-center rounded bg-blue-600 text-[10px] text-white font-bold">
              FPD
            </div>
            <span className="text-lg font-bold tracking-tight text-white">
              Future Proof Designers
            </span>
          </div>
          <span className="text-xs text-slate-500">San Diego based</span>
        </div>
        
        <div className="flex gap-6 text-sm text-slate-400">
          <Link to="/portfolio" className="hover:text-white transition-colors">Portfolio</Link>
          <Link to="/testimonials" className="hover:text-white transition-colors">Testimonials</Link>
          <Link to="/about" className="hover:text-white transition-colors">About</Link>
          <Link to="/contact" className="hover:text-white transition-colors">Contact</Link>
        </div>

        <div className="text-sm text-slate-500">
          &copy; {new Date().getFullYear()} Future Proof Designers. All rights reserved.
        </div>
      </div>
    </footer>
  );
}
