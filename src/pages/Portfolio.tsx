import { motion } from "motion/react";

const projects = [
  {
    title: "Fintech Dashboard",
    category: "Web App",
    image: "https://picsum.photos/seed/fintech/800/600",
  },
  {
    title: "E-commerce Platform",
    category: "E-commerce",
    image: "https://picsum.photos/seed/ecommerce/800/600",
  },
  {
    title: "SaaS Landing Page",
    category: "Marketing",
    image: "https://picsum.photos/seed/saas/800/600",
  },
  {
    title: "Healthcare Portal",
    category: "Web App",
    image: "https://picsum.photos/seed/health/800/600",
  },
  {
    title: "Real Estate Directory",
    category: "Directory",
    image: "https://picsum.photos/seed/realestate/800/600",
  },
  {
    title: "AI Writing Assistant",
    category: "AI Integration",
    image: "https://picsum.photos/seed/ai/800/600",
  },
];

export function Portfolio() {
  return (
    <div className="bg-slate-950 py-24 sm:py-32">
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">Our Work</h2>
          <p className="mt-4 text-lg leading-8 text-slate-400">
            A selection of our recent projects. We build scalable, high-performance web applications.
          </p>
        </div>
        <div className="mx-auto mt-16 grid max-w-2xl grid-cols-1 gap-x-8 gap-y-12 sm:mt-20 lg:mx-0 lg:max-w-none lg:grid-cols-3">
          {projects.map((project, index) => (
            <motion.article
              key={project.title}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1, duration: 0.5 }}
              className="flex flex-col items-start justify-between group overflow-hidden rounded-2xl bg-slate-900 ring-1 ring-white/10 transition-all hover:ring-blue-500/50"
            >
              <div className="relative w-full overflow-hidden">
                <img
                  src={project.image}
                  alt={project.title}
                  referrerPolicy="no-referrer"
                  className="aspect-[16/9] w-full bg-slate-800 object-cover sm:aspect-[2/1] lg:aspect-[3/2] transition-transform duration-500 group-hover:scale-105"
                />
                <div className="absolute inset-0 rounded-t-2xl ring-1 ring-inset ring-slate-900/10" />
              </div>
              <div className="max-w-xl p-6">
                <div className="flex items-center gap-x-4 text-xs">
                  <span className="relative z-10 rounded-full bg-blue-500/10 px-3 py-1.5 font-medium text-blue-400">
                    {project.category}
                  </span>
                </div>
                <div className="group relative">
                  <h3 className="mt-3 text-lg font-semibold leading-6 text-white group-hover:text-slate-300">
                    <span className="absolute inset-0" />
                    {project.title}
                  </h3>
                </div>
              </div>
            </motion.article>
          ))}
        </div>
      </div>
    </div>
  );
}
