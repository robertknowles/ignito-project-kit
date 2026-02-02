import React from 'react';
import { motion } from 'framer-motion';
import { Clock, Sliders, LineChart, ShieldCheck, Download, Layers } from 'lucide-react';

const features = [
  {
    title: "Visual portfolio roadmap builder",
    desc: "Present a clear, long-term view of a client's property journey and how decisions connect over time.",
    icon: Layers
  },
  {
    title: "Scenario-based strategy planning",
    desc: "Compare and refine different strategy paths to align on the most appropriate long-term direction.",
    icon: Sliders
  },
  {
    title: "Property strategy modelling",
    desc: "Apply consistent property strategy frameworks to clearly show sequencing, progression, and intent.",
    icon: LineChart
  },
  {
    title: "Equity pathway visibility",
    desc: "Show how equity builds and is deployed across the journey to support future purchases and portfolio growth.",
    icon: Clock
  },
  {
    title: "Client-facing portal",
    desc: "Give clients a single place to view and revisit their strategy roadmap as their journey progresses.",
    icon: ShieldCheck
  },
  {
    title: "Client records & purchase alerts",
    desc: "Maintain a living record of each client's strategy with clear milestones that signal when they're approaching their next purchase or review point.",
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
          <h2 className="font-serif text-4xl mt-3">What you can do</h2>
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

