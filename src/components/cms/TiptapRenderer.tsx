import { generateHTML } from '@tiptap/html'
import StarterKit from '@tiptap/starter-kit'
import ImageExt from '@tiptap/extension-image'
import LinkExt from '@tiptap/extension-link'
import { JSONContent } from '@tiptap/core'

interface TiptapRendererProps {
  content: JSONContent
}

export default function TiptapRenderer({ content }: TiptapRendererProps) {
  const html = generateHTML(content, [
    StarterKit.configure({ heading: { levels: [2, 3] } }),
    ImageExt,
    LinkExt,
  ])

  return (
    <div
      className="prose prose-zinc max-w-none prose-img:rounded-2xl prose-headings:font-bold prose-a:text-amber-600"
      dangerouslySetInnerHTML={{ __html: html }}
    />
  )
}
