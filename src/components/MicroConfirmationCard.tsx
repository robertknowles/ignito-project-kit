/**
 * MicroConfirmationCard — Step 1.13 of NL-PIVOT-PLAN.csv
 *
 * A small animated card that flashes the critical numbers (income + savings)
 * as the plan starts generating. Not a blocker — just a quick visual receipt
 * of the numbers that matter most. If these are wrong, everything is wrong,
 * so the BA catches it immediately.
 */

import React from 'react'
import { motion } from 'framer-motion'
import type { MicroConfirmationData } from '@/types/nlParse'

interface MicroConfirmationCardProps {
  data: MicroConfirmationData
}

export const MicroConfirmationCard: React.FC<MicroConfirmationCardProps> = ({ data }) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="rounded-lg border border-emerald-200 bg-emerald-50/50 px-3.5 py-2.5"
    >
      <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs">
        {data.members.map((member, i) => (
          <span key={i} className="text-gray-700">
            <span className="font-medium text-gray-900">{member.name}</span>{' '}
            {member.income}
          </span>
        ))}
        <span className="text-gray-700">
          Saving <span className="font-medium text-gray-900">{data.savings}</span>
        </span>
      </div>
    </motion.div>
  )
}
