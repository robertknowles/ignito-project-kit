import React from 'react';
import { motion } from 'framer-motion';
import { Clock, Sliders, LineChart, ShieldCheck, Download, Layers } from 'lucide-react';

const features = [
  {
    title: "Dynamic 30-year simulation",
    desc: "Period-by-period modelling, not static projections. See the long-term compound effect.",
    icon: Clock
  },
  {
    title: "Lending rule engine",
    desc: "Built-in deposit tests, serviceability checks, and borrowing capacity logic.",
    icon: ShieldCheck
  },
  {
    title: "Equity recycling logic",
    desc: "Automatically models refinance events to accelerate buying timelines.",
    icon: Sliders
  },
  {
    title: "Detailed cashflow engine",
    desc: "Real expenses: land tax, fees, interest, management, and insurance accounted for.",
    icon: LineChart
  },
  {
    title: "Clean, client-ready output",
    desc: "A simple visual timeline clients instantly understand without explanation.",
    icon: Layers
  },
  {
    title: "One-click export",
    desc: "Instantly produce the final roadmap for your client meeting.",
    icon: Download
  }
];

const cardVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: {
      delay: i * 0.1,
      duration: 0.5,
      ease: "easeOut"
    }
  }),
  hover: {
    y: -10,
    transition: {
      duration: 0.2,
      ease: "easeInOut"
    }
  }
};

const FeaturesGrid: React.FC = () => {
  return (
    <section className="py-24 bg-white">
      <div className="max-w-7xl mx-auto px-6">
        <div className="mb-16">
          <span className="text-sm font-semibold uppercase tracking-wider text-gray-400">Features</span>
          <h2 className="font-serif text-4xl mt-3">Built for Clarity & Confidence</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-12">
          {features.map((feature, idx) => (
            <motion.div
              key={idx}
              custom={idx}
              variants={cardVariants}
              initial="hidden"
              whileInView="visible"
              whileHover="hover"
              viewport={{ once: true }}
              className="group p-6 rounded-3xl transition-colors duration-300 hover:bg-gray-50/80 cursor-default"
            >
              <div className="w-12 h-12 rounded-xl bg-gray-50 flex items-center justify-center mb-6 text-gray-700 group-hover:bg-black group-hover:text-white transition-all duration-300 shadow-sm group-hover:shadow-md">
                <feature.icon size={24} strokeWidth={1.5} />
              </div>
              <h3 className="text-xl font-medium mb-3 group-hover:text-black transition-colors">{feature.title}</h3>
              <p className="text-gray-500 leading-relaxed text-sm">{feature.desc}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default FeaturesGrid;

