import React from 'react';
import { DisclaimerBlock } from '@/components/DisclaimerBlock';
import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';

const Terms: React.FC = () => {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-3xl mx-auto px-6 py-12">
        <Link
          to="/login"
          className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 mb-8"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to PropPath
        </Link>

        <h1 className="text-3xl font-bold text-gray-900 mb-2">Terms of Use</h1>
        <p className="text-sm text-gray-500 mb-10">
          Last updated: May 2026
        </p>

        <section className="mb-10">
          <h2 className="text-lg font-semibold text-gray-900 mb-3">About PropPath</h2>
          <p className="text-sm text-gray-700 leading-relaxed">
            PropPath is a planning and visualisation tool designed for use by licensed
            Australian buyers' agents. It models property investment scenarios based on
            user-entered inputs and default assumptions. PropPath does not provide
            financial product advice, credit assistance, or any recommendation tailored to
            a specific person's objectives, financial situation, or needs.
          </p>
        </section>

        <section className="mb-10">
          <h2 className="text-lg font-semibold text-gray-900 mb-3">Intended Use</h2>
          <p className="text-sm text-gray-700 leading-relaxed mb-3">
            PropPath is intended for use by holders of a state real estate licence
            (buyers' agents) to model and visualise property investment scenarios for
            their clients. By using PropPath, you confirm that:
          </p>
          <ul className="list-disc pl-5 space-y-2 text-sm text-gray-700 leading-relaxed">
            <li>
              You hold the appropriate state real estate licence for the services you
              provide to your clients.
            </li>
            <li>
              You understand that PropPath does not provide financial product advice or
              credit assistance, and that any advice you provide to your clients is your
              responsibility and must be within the scope of your licence.
            </li>
            <li>
              You will not present PropPath outputs to retail clients without your own
              appropriate disclosures and within the scope of your licence.
            </li>
            <li>
              You will not use PropPath to model or present self-managed superannuation
              fund (SMSF) property strategies, limited recourse borrowing arrangements
              (LRBA), or any superannuation-related investment approach.
            </li>
          </ul>
        </section>

        <DisclaimerBlock variant="A" className="mb-10" />

        <section className="mb-10">
          <h2 className="text-lg font-semibold text-gray-900 mb-3">AI-Generated Content</h2>
          <p className="text-sm text-gray-700 leading-relaxed">
            PropPath uses artificial intelligence to generate plain-language descriptions
            of modelling outputs. AI-generated narratives are factual summaries of the
            engine's calculations and should not be interpreted as financial advice,
            recommendations, or predictions. All AI output is constrained to factual
            modelling language and is subject to the same disclaimers as other PropPath
            outputs.
          </p>
        </section>

        <section className="mb-10">
          <h2 className="text-lg font-semibold text-gray-900 mb-3">Contact</h2>
          <p className="text-sm text-gray-700 leading-relaxed">
            For questions about these terms or PropPath's regulatory positioning, contact
            us at hello@proppath.com.au.
          </p>
        </section>
      </div>
    </div>
  );
};

export default Terms;
