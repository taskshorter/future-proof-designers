import { motion } from "motion/react";
import { Heart, Trophy, Users, TrendingUp } from "lucide-react";

export interface ProjectCardProps {
  title?: string;
  subtitle?: string;
  description?: string;
  raising?: string;
  users?: string;
  mrr?: string;
  author?: string;
  handle?: string;
  imageSeed?: string;
}

export function ProjectCard({
  title = "GreenLedger",
  subtitle = "Carbon API for E-Com",
  description = "One-line SDK that calculates and offsets carbon per order. Shopify and WooCommerce plugins included.",
  raising = "Raising $18.0K",
  users = "310",
  mrr = "$1.8K",
  author = "Lena Berger",
  handle = "@LenaClimate",
  imageSeed = "nature"
}: ProjectCardProps) {
  const imageSrc = `https://picsum.photos/seed/${imageSeed}/800/600`;

  return (
    <motion.div
      whileHover={{ y: -5 }}
      className="w-full max-w-sm overflow-hidden rounded-2xl border border-white/10 bg-slate-900 shadow-xl will-change-transform"
    >
      {/* Image */}
      <div className="relative aspect-[4/3] w-full overflow-hidden bg-slate-800">
        <img
          src={imageSrc}
          alt={`${title} project`}
          loading="lazy"
          className="h-full w-full object-cover"
          referrerPolicy="no-referrer"
        />

        {/* Overlays */}
        <div className="absolute left-3 top-3 flex items-center gap-1 rounded-full bg-amber-500/90 px-2.5 py-1 text-xs font-bold text-white backdrop-blur-md shadow-sm">
          <Trophy className="h-3 w-3" />
          <span>#2</span>
        </div>
        <div className="absolute right-3 top-3 flex items-center gap-1 rounded-full bg-slate-900/60 px-2.5 py-1 text-xs font-medium text-white backdrop-blur-md border border-white/10">
          <Heart className="h-3.5 w-3.5 fill-pink-500 text-pink-500" />
          <span>18</span>
        </div>
      </div>

      {/* Content */}
      <div className="p-6">
        {/* Top Label */}
        <div className="mb-3 inline-block rounded-full bg-emerald-500/10 px-2.5 py-1 text-[10px] font-bold tracking-wider text-emerald-400 uppercase">
          {raising}
        </div>

        {/* Title & Subtitle */}
        <div className="mb-4">
          <h3 className="text-2xl font-bold text-[#4f46e5] tracking-tight">{title}</h3>
          <p className="mt-1 text-xs font-semibold tracking-widest text-slate-400 uppercase">
            {subtitle}
          </p>
        </div>

        {/* Description */}
        <p className="mb-6 text-sm leading-relaxed text-slate-300">
          {description}
        </p>

        {/* Stats Row */}
        <div className="mb-6 grid grid-cols-2 gap-4 rounded-xl bg-slate-950/50 p-4 border border-white/5">
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-1.5 text-slate-400">
              <Users className="h-4 w-4" />
              <span className="text-xs font-medium">Users</span>
            </div>
            <span className="text-lg font-semibold text-white">{users}</span>
          </div>
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-1.5 text-slate-400">
              <TrendingUp className="h-4 w-4" />
              <span className="text-xs font-medium">MRR</span>
            </div>
            <span className="text-lg font-semibold text-white">{mrr}</span>
          </div>
        </div>

        {/* Footer Profile */}
        <div className="flex items-center gap-3 border-t border-white/10 pt-4">
          <img
            src={`https://picsum.photos/seed/${author.replace(/\s/g, '')}/100/100`}
            alt={author}
            className="h-8 w-8 rounded-full bg-slate-800 object-cover ring-2 ring-slate-950"
            referrerPolicy="no-referrer"
          />
          <div className="flex flex-col">
            <span className="text-sm font-medium text-white">{author}</span>
            <span className="text-xs text-slate-500">{handle}</span>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
