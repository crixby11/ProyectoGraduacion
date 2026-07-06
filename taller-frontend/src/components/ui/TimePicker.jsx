import { Controller } from 'react-hook-form'
import { MINUTES } from '../../utils/time'

const HOURS = Array.from({ length: 12 }, (_, i) => String(i + 1).padStart(2, '0'))

export default function TimePicker({ control, prefix }) {
  return (
    <div className="flex gap-1.5 items-center">
      <Controller
        name={`${prefix}_hour`}
        control={control}
        defaultValue="09"
        render={({ field }) => (
          <select {...field} className="input w-[4.5rem]">
            {HOURS.map((h) => <option key={h} value={h}>{h}</option>)}
          </select>
        )}
      />
      <span className="text-gray-400 font-medium select-none">:</span>
      <Controller
        name={`${prefix}_min`}
        control={control}
        defaultValue="00"
        render={({ field }) => (
          <select {...field} className="input w-[4.5rem]">
            {MINUTES.map((m) => <option key={m} value={m}>{m}</option>)}
          </select>
        )}
      />
      <Controller
        name={`${prefix}_ampm`}
        control={control}
        defaultValue="AM"
        render={({ field }) => (
          <select {...field} className="input w-[4.5rem]">
            <option value="AM">AM</option>
            <option value="PM">PM</option>
          </select>
        )}
      />
    </div>
  )
}
