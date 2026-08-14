import { FileText, Image, File } from 'lucide-react'

export default function FileTypeIcon({ mime }) {
  if (!mime) return <File size={20} className="text-gray-400 shrink-0" />
  if (mime.startsWith('image/'))
    return <Image size={20} className="text-blue-400 shrink-0" />
  if (mime === 'application/pdf')
    return <FileText size={20} className="text-red-400 shrink-0" />
  if (mime.includes('word') || mime.includes('document'))
    return <FileText size={20} className="text-blue-500 shrink-0" />
  if (mime.includes('sheet') || mime.includes('excel') || mime.includes('csv'))
    return <FileText size={20} className="text-green-500 shrink-0" />
  return <File size={20} className="text-gray-400 shrink-0" />
}
