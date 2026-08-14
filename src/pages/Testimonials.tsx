import { motion } from "motion/react";

const testimonials = [
  {
    body: "Future Proof Designers transformed our online presence. Their attention to detail and technical expertise is unmatched. We saw a 40% increase in conversions within the first month.",
    author: {
      name: "Sarah Jenkins",
      handle: "CEO, TechFlow",
      imageUrl: "https://picsum.photos/seed/sarah/100/100",
    },
  },
  {
    body: "Working with this agency was a breeze. They understood our vision immediately and delivered a product that exceeded our expectations. Highly recommended.",
    author: {
      name: "Michael Chen",
      handle: "Founder, StartupX",
      imageUrl: "https://picsum.photos/seed/michael/100/100",
    },
  },
  {
    body: "The team at Future Proof Designers doesn't just build websites; they build digital experiences. The animations and performance optimizations are incredible.",
    author: {
      name: "Emily Rodriguez",
      handle: "Marketing Director, Elevate",
      imageUrl: "https://picsum.photos/seed/emily/100/100",
    },
  },
];

export function Testimonials() {
  return (
    <div className="bg-slate-950 py-24 sm:py-32">
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        <div className="mx-auto max-w-xl text-center">
          <h2 className="text-lg font-semibold leading-8 tracking-tight text-blue-400">Testimonials</h2>
          <p className="mt-2 text-3xl font-bold tracking-tight text-white sm:text-4xl">
            We have worked with thousands of amazing people
          </p>
        </div>
        <div className="mx-auto mt-16 flow-root max-w-2xl sm:mt-20 lg:mx-0 lg:max-w-none">
          <div className="-mt-8 sm:-mx-4 sm:columns-2 sm:text-[0] lg:columns-3">
            {testimonials.map((testimonial, index) => (
              <motion.div
                key={testimonial.author.name}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: index * 0.15, duration: 0.5 }}
                className="pt-8 sm:inline-block sm:w-full sm:px-4"
              >
                <figure className="rounded-2xl bg-slate-900 p-8 text-sm leading-6 ring-1 ring-white/10">
                  <blockquote className="text-slate-300">
                    <p>{`"${testimonial.body}"`}</p>
                  </blockquote>
                  <figcaption className="mt-6 flex items-center gap-x-4">
                    <img className="h-10 w-10 rounded-full bg-slate-800" src={testimonial.author.imageUrl} alt="" referrerPolicy="no-referrer" />
                    <div>
                      <div className="font-semibold text-white">{testimonial.author.name}</div>
                      <div className="text-slate-500">{testimonial.author.handle}</div>
                    </div>
                  </figcaption>
                </figure>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
