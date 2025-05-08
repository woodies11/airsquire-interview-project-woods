'use client'

import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts'

const COLORS = ['#004b2d', '#a9ea74']

export default function ClientStatisticChart({
  totalImages,
  totalBookmarks,
}: {
  totalImages: number
  totalBookmarks: number
}) {
  const pieData = [
    { name: 'Bookmarked', value: totalBookmarks },
    { name: 'Unbookmarked', value: totalImages - totalBookmarks },
  ]

  return (
    <div className="w-full h-96 min-h-[50vh]">
      <ResponsiveContainer>
        <PieChart>
          <Pie
            data={pieData}
            dataKey="value"
            nameKey="name"
            cx="50%"
            cy="50%"
            outerRadius={120}
            label
          >
            {pieData.map((_, index) => (
              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
            ))}
          </Pie>
          <Tooltip />
        </PieChart>
      </ResponsiveContainer>
    </div>
  )
}
