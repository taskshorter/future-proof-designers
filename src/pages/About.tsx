import { motion } from "motion/react";

export function About() {
  return (
    <div className="bg-slate-950 py-24 sm:py-32">
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">About Us</h2>
          <p className="mt-6 text-lg leading-8 text-slate-400">
            We are a San Diego–based team of passionate developers, designers, and strategists dedicated to crafting exceptional digital experiences. We believe in the power of custom code and thoughtful design.
          </p>
        </div>
        <div className="mx-auto mt-16 max-w-2xl lg:max-w-none">
          <dl className="mt-16 grid grid-cols-1 gap-8 sm:mt-20 sm:grid-cols-2 lg:grid-cols-4 text-center">
            {[
              { name: "Founded", value: "2018" },
              { name: "Projects Completed", value: "300+" },
              { name: "Team Members", value: "15" },
              { name: "Awards Won", value: "12" },
            ].map((stat, index) => (
              <motion.div
                key={stat.name}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1, duration: 0.5 }}
                className="flex flex-col-reverse"
              >
                <dt className="text-base leading-7 text-slate-400">{stat.name}</dt>
                <dd className="text-2xl font-bold leading-9 tracking-tight text-white">{stat.value}</dd>
              </motion.div>
            ))}
          </dl>
        </div>
      </div>
    </div>
  );
}
